import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EQUIPMENT_SYSTEMS } from '../data/curriculum';
import { AIRPORT_ZONES, ZONE_MAP } from '../data/zones';
import {
  HoverTelemetryData,
  LightCircuitId,
  LightCircuitState,
  SubsystemLayer,
  SystemId,
  TimeOfDayMode,
  ZoneId,
} from '../types/elban';
import {
  buildEquipmentBySystem,
  buildTocEvaluationDesk,
  buildWalkInEntranceGate,
  BuiltEquipmentUnit,
  createCeilingSpeakerUnit,
  createColumnSpeakerUnit,
  createHikvisionFisheyeCamera,
  createHornSpeakerUnit,
  createSonyFixedBulletCamera,
  PasSpeakerHandle,
  WalkInEntranceGateHandle,
} from './proceduralModels';
import {
  createApronAsphaltTexture,
  createBidsTexture,
  createCeilingSpeakerGrilleTexture,
  createColumnSpeakerGrilleTexture,
  createFacadeLouverTexture,
  createFacadeStoneTexture,
  createHikvisionFisheyeBandTexture,
  createHikvisionNvrFrontTexture,
  createSonyIpelaFrontFaceTexture,
  createSonyIpelaSideTexture,
  createTerrazzoFloorTexture,
  createTorajaWoodPilasterTexture,
  createVideotronTexture,
  createZoneSignTexture,
} from './proceduralTextures';
import { PasBroadcastMode } from '../utils/audioSynth';
import { createAfterDraw, detectSoftwareGl, disposeObject3D } from './webglUtils';

export interface AirportSceneCallbacks {
  onZoneChange: (zoneId: ZoneId) => void;
  onIntroStateChange: (playing: boolean) => void;
  onHoverTelemetry: (data: HoverTelemetryData | null) => void;
  onSelectSystem: (systemId: SystemId, componentId?: string) => void;
  onOpenTocModal: () => void;
  onToggleLightCircuit?: (circuitId: LightCircuitId) => void;
  onContextLost?: () => void;
}

interface CollisionBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Pre-allocated vectors for zero-GC animation loop
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();
const _lookDir = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _pointerNdc = new THREE.Vector2();
const _up = new THREE.Vector3(0, 1, 0);

export class AirportSceneController {
  private container: HTMLElement;
  private callbacks: AirportSceneCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private afterDraw: (cb: () => void) => void;
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;

  // Navigation & camera state
  private yaw = 0;
  private pitch = 0;
  private keys = new Set<string>();
  private isDragging = false;
  private dragMoved = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Smooth camera transition (teleport or floor walk)
  private transitionActive = false;
  private transitionGoalPos = new THREE.Vector3();
  private transitionGoalYaw = 0;
  private transitionGoalPitch = 0;
  private transitionWithLook = false;

  // Cinematic Intro spline
  private introPlaying = true;
  private introProgress = 0;
  private introDuration = 16; // seconds
  private introPosCurve: THREE.CatmullRomCurve3;
  private introLookCurve: THREE.CatmullRomCurve3;

  // Scene objects & interactivity
  private floorMesh!: THREE.Mesh;
  private floorReticle!: THREE.Mesh;
  private equipmentUnits = new Map<SystemId, BuiltEquipmentUnit>();
  private interactiveRoots: THREE.Object3D[] = [];
  private collisionBoxes: CollisionBox[] = [];
  private baggageCarouselBags: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();
  private lastRaycastMs = 0;
  private activeZoneId: ZoneId = 'lobby';
  private activeLayerFilter: SubsystemLayer | 'ALL' = 'ALL';
  private lastClockTickSec = -1;

  // Public Address System (PAS / AAS) distributed zone speaker registry
  private pasZoneSpeakers = new Map<ZoneId, PasSpeakerHandle[]>();
  private pasActiveZones = new Set<ZoneId>();
  private pasBroadcastMode: PasBroadcastMode | 'idle' = 'idle';
  private entranceGate: WalkInEntranceGateHandle | null = null;

  // Day/Night & Room Lighting Switchboard state
  private hemiLight!: THREE.HemisphereLight;
  private keyLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private nightSkyGroup: THREE.Group | null = null;
  private exteriorCoveLedMat: THREE.MeshStandardMaterial | null = null;
  private timeOfDay: TimeOfDayMode = 'day';
  private lightCircuits: LightCircuitState = {
    lobby_concourse: true,
    scp_baggage: true,
    restricted_server: true,
    toc: true,
    exterior: true,
  };
  private circuitLights = new Map<LightCircuitId, THREE.PointLight[]>();
  private circuitPanelMats = new Map<LightCircuitId, THREE.MeshStandardMaterial[]>();
  private wallSwitchRockers = new Map<
    LightCircuitId,
    Array<{ rocker: THREE.Mesh; ledMat: THREE.MeshStandardMaterial }>
  >();

  // Bound event listeners for clean removal
  private onResizeBound: () => void;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;
  private onWheelBound: (e: WheelEvent) => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onContextLostBound: (e: Event) => void;

  constructor(container: HTMLElement, callbacks: AirportSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareGl();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcbd9e8);
    this.scene.fog = new THREE.FogExp2(0xcbd9e8, 0.011);

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.12, 160);
    this.camera.rotation.order = 'YXZ';

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Studio RoomEnvironment reflection map on every device
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.afterDraw = createAfterDraw(this.renderer, (id) => {
      this.frameId = id;
    }, 80);

    // Setup Lighting Rig (warm key + cool hemisphere fill + rim)
    this.setupLighting();

    // Build Virtual Airport Terminal Architecture + Airside Apron + 6 ElBan Systems + TOC
    this.buildAirportEnvironment();

    // Intro fly-through spline: Outdoor Exterior Facade -> through Walk-In ElBan Gate -> SCP -> Concourse -> Server Room -> Outdoor Gate Overview
    this.introPosCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 2.55, 28.2),
      new THREE.Vector3(0, 2.25, 19.6),
      new THREE.Vector3(-4.5, 2.4, 11.5),
      new THREE.Vector3(-5.2, 2.3, 4.2),
      new THREE.Vector3(0.5, 2.8, 2.5),
      new THREE.Vector3(9.5, 2.2, -1.8),
      new THREE.Vector3(3.8, 2.2, 12.2),
      new THREE.Vector3(0, 1.9, 26.8),
    ]);
    this.introLookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 3.2, 16.5),
      new THREE.Vector3(0, 2.5, 9.5),
      new THREE.Vector3(-10.5, 1.3, 6.0),
      new THREE.Vector3(-8.5, 1.3, 4.5),
      new THREE.Vector3(0, 2.4, -3.5),
      new THREE.Vector3(14.2, 1.5, -7.2),
      new THREE.Vector3(0, 2.4, 17.6),
      new THREE.Vector3(0, 3.05, 16.8),
    ]);

    // Pre-warm shaders on GPU devices
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind listeners
    this.onResizeBound = this.handleResize.bind(this);
    this.onPointerDownBound = this.handlePointerDown.bind(this);
    this.onPointerMoveBound = this.handlePointerMove.bind(this);
    this.onPointerUpBound = this.handlePointerUp.bind(this);
    this.onWheelBound = this.handleWheel.bind(this);
    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onKeyUpBound = this.handleKeyUp.bind(this);
    this.onContextLostBound = (e: Event) => {
      e.preventDefault();
      this.callbacks.onContextLost?.();
    };

    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDownBound);
    window.addEventListener('pointermove', this.onPointerMoveBound);
    window.addEventListener('pointerup', this.onPointerUpBound);
    el.addEventListener('wheel', this.onWheelBound, { passive: false });
    el.addEventListener('webglcontextlost', this.onContextLostBound);

    this.callbacks.onIntroStateChange(true);
    this.tick();
  }

  private setupLighting(): void {
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x94a3b8, 0.9);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff7ed, 1.45);
    this.keyLight.position.set(16, 26, 18);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.camera.left = -28;
      this.keyLight.shadow.camera.right = 28;
      this.keyLight.shadow.camera.top = 26;
      this.keyLight.shadow.camera.bottom = -26;
      this.keyLight.shadow.camera.near = 2;
      this.keyLight.shadow.camera.far = 70;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xbfdbfe, 0.55);
    this.fillLight.position.set(-18, 14, -14);
    this.scene.add(this.fillLight);

    // Procedural Night Sky Starfield & Moon (toggled visible in Night Mode)
    const skyGroup = new THREE.Group();
    const starCount = 480;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      // Deterministic pseudo-random distribution across upper sky hemisphere
      const u = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
      const v = Math.abs((Math.sin(i * 78.233) * 19341.1234) % 1);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(0.14 + v * 0.86); // strictly above horizon
      const r = 112;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xe2e8f0,
      size: 0.72,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      fog: false,
    });
    const stars = new THREE.Points(starGeo, starMat);

    // Soft glowing Moon positioned over the northern Makassar sky behind the Entrance Gate
    const moonDisc = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 32),
      new THREE.MeshBasicMaterial({ color: 0xfef9c3, fog: false })
    );
    moonDisc.position.set(22, 34, -76);
    const moonHalo = new THREE.Mesh(
      new THREE.CircleGeometry(6.8, 32),
      new THREE.MeshBasicMaterial({
        color: 0x93c5fd,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        fog: false,
      })
    );
    moonHalo.position.set(22, 34, -76.2);

    skyGroup.add(stars, moonHalo, moonDisc);
    skyGroup.visible = false;
    this.nightSkyGroup = skyGroup;
    this.scene.add(skyGroup);
  }

  private buildAirportEnvironment(): void {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // 1. Main Terminal & Exterior Entry Plaza White & White-Grey Checkerboard Ceramic Tile Floor (z = -17.5..30.5)
    const ceramicFloorTex = createTerrazzoFloorTexture(maxAniso);
    ceramicFloorTex.repeat.set(38, 40); // True ~60x60cm square tiles across 46m x 48m walkable floor
    const floorMat = new THREE.MeshPhysicalMaterial({
      map: ceramicFloorTex,
      roughness: 0.18,
      metalness: 0.05,
      clearcoat: 0.55,
      clearcoatRoughness: 0.14,
      envMapIntensity: 0.85,
    });
    this.floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(46, 48), floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.set(0, 0, 6.5);
    this.floorMesh.receiveShadow = true;
    this.floorMesh.userData.isWalkableFloor = true;
    this.scene.add(this.floorMesh);

    // Wayfinding guiding stripes on floor (offset +0.02m to prevent Z-fighting)
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.4,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const centralPath = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 30), pathMat);
    centralPath.rotation.x = -Math.PI / 2;
    centralPath.position.set(0, 0.015, 2.5);
    const crossPath = new THREE.Mesh(new THREE.PlaneGeometry(24, 0.36), pathMat);
    crossPath.rotation.x = -Math.PI / 2;
    crossPath.position.set(0, 0.015, 6.0);
    const northPath = new THREE.Mesh(new THREE.PlaneGeometry(30, 0.36), pathMat);
    northPath.rotation.x = -Math.PI / 2;
    northPath.position.set(-1, 0.015, -7.2);
    this.scene.add(centralPath, crossPath, northPath);

    // Click-to-teleport floor reticle
    this.floorReticle = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.36, 28),
      new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    this.floorReticle.rotation.x = -Math.PI / 2;
    this.floorReticle.position.y = 0.03;
    this.floorReticle.visible = false;
    this.scene.add(this.floorReticle);

    // 2. Outdoor Airside Apron & Horizon Terrain extending far beyond terminal (natural perimeter)
    const apronTex = createApronAsphaltTexture(maxAniso);
    const apronMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 110),
      new THREE.MeshStandardMaterial({ map: apronTex, roughness: 0.88, metalness: 0.05 })
    );
    apronMesh.rotation.x = -Math.PI / 2;
    apronMesh.position.set(0, -0.04, -62);
    apronMesh.receiveShadow = true;
    this.scene.add(apronMesh);

    // Distant Airside Runway & Grass Berm extending horizon naturally
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x647a67, roughness: 0.95 });
    const leftGrass = new THREE.Mesh(new THREE.PlaneGeometry(180, 120), grassMat);
    leftGrass.rotation.x = -Math.PI / 2;
    leftGrass.position.set(0, -0.06, -110);
    this.scene.add(leftGrass);

    // Airside Perimeter Security Fence stretching across north apron
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });
    const fenceWireMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.6, wireframe: true });
    for (let x = -28; x <= 28; x += 4) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 8), fenceMat);
      post.position.set(x, 1.4, -19.2);
      this.scene.add(post);
    }
    const fenceMesh = new THREE.Mesh(new THREE.PlaneGeometry(56, 2.5, 28, 4), fenceWireMat);
    fenceMesh.position.set(0, 1.35, -19.2);
    this.scene.add(fenceMesh);

    // 3. Terminal Architecture: Structural Columns, Soaring Steel Roof Trusses & North Glazing
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6, metalness: 0.08 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.36, metalness: 0.75 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      roughness: 0.12,
      metalness: 0.1,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });

    // Side architectural walls terminating cleanly at the exterior front facade line (z = 17.36)
    // Area z > 17.36 is true open-sky outdoor exterior arrival plaza!
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.2, 33.0), wallMat);
    westWall.position.set(-22.8, 3.6, 0.86);
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.2, 33.0), wallMat);
    eastWall.position.set(22.8, 3.6, 0.86);
    this.scene.add(westWall, eastWall);

    // North Airside Curtain Glazing (full height up to Plafon underside y = 7.16)
    const northGlassL = new THREE.Mesh(new THREE.BoxGeometry(16, 7.16, 0.12), glassMat);
    northGlassL.position.set(-14.5, 3.58, -11.5);
    const northGlassR = new THREE.Mesh(new THREE.BoxGeometry(16, 7.16, 0.12), glassMat);
    northGlassR.position.set(14.5, 3.58, -11.5);
    const northHeaderBeam = new THREE.Mesh(new THREE.BoxGeometry(46, 0.24, 0.28), steelMat);
    northHeaderBeam.position.set(0, 7.04, -11.5);
    this.scene.add(northGlassL, northGlassR, northHeaderBeam);

    // Solid Acoustic Terminal Plafon (Indoor Hall Only: z = -11.7..15.8 at y = 7.16, stepping cleanly down to z = 17.36 exterior parapet)
    const plafonMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.78,
      metalness: 0.04,
    });
    const plafonSlab = new THREE.Mesh(new THREE.BoxGeometry(46.0, 0.16, 27.5), plafonMat);
    plafonSlab.position.set(0, 7.24, 2.05);
    plafonSlab.receiveShadow = true;
    this.scene.add(plafonSlab);

    // Subtle sloped front soffit closing the indoor roof cleanly to the exterior louver parapet (z = 15.75..17.42)
    const frontRoofSlope = new THREE.Mesh(new THREE.BoxGeometry(46.0, 0.14, 1.78), plafonMat);
    frontRoofSlope.position.set(0, 7.05, 16.58);
    frontRoofSlope.rotation.x = 0.22;
    this.scene.add(frontRoofSlope);

    // Structural columns, flush ceiling trusses & recessed Plafon LED light strips (strictly indoor hall)
    const indoorTrussZs = [-11.5, -1.5, 8.5, 15.5];
    for (const z of indoorTrussZs) {
      const truss = new THREE.Mesh(new THREE.BoxGeometry(45.5, 0.22, 0.28), steelMat);
      truss.position.set(0, 7.05, z);
      this.scene.add(truss);

      [-22.2, 22.2].forEach((x) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 7.16, 16), steelMat);
        col.position.set(x, 3.58, z);
        this.scene.add(col);
      });
    }
    // Controllable Multi-Zone Recessed Plafon LED Luminaires & Real-Time Overhead Room Lights
    const addRoomFixture = (
      circuitId: LightCircuitId,
      x: number,
      z: number,
      w: number,
      d: number,
      emissiveHex: number,
      withPointLight: boolean,
      lightColor: number,
      lightDist: number
    ) => {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: emissiveHex,
        emissiveIntensity: 0.72,
        roughness: 0.25,
      });
      const panel = new THREE.Mesh(new THREE.BoxGeometry(w, 0.032, d), mat);
      panel.position.set(x, 7.148, z);
      this.scene.add(panel);
      const mats = this.circuitPanelMats.get(circuitId) ?? [];
      mats.push(mat);
      this.circuitPanelMats.set(circuitId, mats);

      if (withPointLight) {
        const pt = new THREE.PointLight(lightColor, 0, lightDist, 1.45);
        pt.position.set(x, 6.45, z);
        this.scene.add(pt);
        const lights = this.circuitLights.get(circuitId) ?? [];
        lights.push(pt);
        this.circuitLights.set(circuitId, lights);
      }
    };

    // Circuit 1: Lobby & Central Concourse
    addRoomFixture('lobby_concourse', 0, 12.0, 14, 1.35, 0xe0f2fe, true, 0xf0f9ff, 26);
    addRoomFixture('lobby_concourse', 0, 3.5, 14, 1.35, 0xe0f2fe, false, 0xf0f9ff, 26);
    addRoomFixture('lobby_concourse', 0, -6.5, 14, 1.35, 0xe0f2fe, true, 0xf0f9ff, 26);

    // Circuit 2: SCP & Baggage Claim (West Wing)
    addRoomFixture('scp_baggage', -13.2, 5.2, 7.2, 1.2, 0xf8fafc, true, 0xf8fafc, 22);
    addRoomFixture('scp_baggage', -13.2, -6.5, 7.2, 1.2, 0xf8fafc, true, 0xf8fafc, 22);

    // Circuit 3: Area Terbatas & Server Room (East Wing)
    addRoomFixture('restricted_server', 13.2, 5.2, 7.2, 1.2, 0xe0f2fe, true, 0xe0f2fe, 22);
    addRoomFixture('restricted_server', 14.2, -6.8, 6.8, 1.2, 0xe0f2fe, true, 0xe0f2fe, 22);

    // Circuit 4: Ruang TOC (South-East Evaluation Room)
    addRoomFixture('toc', 14.5, 13.8, 5.8, 1.15, 0xfef3c7, true, 0xfef3c7, 18);

    // 3b. Grand Walk-In ElBan Entrance Gate (Bandara Internasional Sultan Hasanuddin Makassar) integrated into front exterior facade
    this.entranceGate = buildWalkInEntranceGate(maxAniso);
    this.entranceGate.group.position.set(0, 0, 17.6);
    this.scene.add(this.entranceGate.group);

    // 3c. Exterior Front Building Facade (Travertine + Carved Toraja Wood Pilasters + Golden Cove LED + Dark Louver Fascia) & Sunlit Outdoor Arrival Plaza
    this.buildExteriorFacadeAndPlaza(maxAniso);

    // 3d. Physical Clickable 3D Wall Light Switch Panels inside the Terminal Hall
    this.buildWallLightSwitchPanels(maxAniso);

    // Apply initial Day lighting & active room circuit intensities
    this.applyLightingState();

    // 4. Lobby Videotron & Overview Board (Zone 1)
    const videoGroup = new THREE.Group();
    const videoFrame = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.4, 0.24), steelMat);
    videoFrame.position.set(0, 3.3, 10.6);
    const videoTex = createVideotronTexture(maxAniso);
    const videoFace = new THREE.Mesh(
      new THREE.PlaneGeometry(6.9, 3.1),
      new THREE.MeshStandardMaterial({ map: videoTex, emissiveMap: videoTex, emissive: 0xffffff, emissiveIntensity: 0.52, roughness: 0.2 })
    );
    videoFace.position.set(0, 3.3, 10.74);
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.7, 12), steelMat);
    legL.position.set(-2.6, 0.85, 10.6);
    const legR = legL.clone();
    legR.position.set(2.6, 0.85, 10.6);
    videoGroup.add(videoFrame, videoFace, legL, legR);
    videoGroup.traverse((o) => {
      o.userData.systemId = 'sys-fids-pas';
      o.userData.componentId = 'comp-fids-displays';
    });
    this.scene.add(videoGroup);
    this.interactiveRoots.push(videoGroup);
    this.collisionBoxes.push({ minX: -3.6, maxX: 3.6, minZ: 10.1, maxZ: 11.1 });

    // 5. Place All 6 Hero ElBan Equipment Systems
    for (const sys of EQUIPMENT_SYSTEMS) {
      const built = buildEquipmentBySystem(sys.id, maxAniso);
      built.root.position.set(sys.worldPosition.x, sys.worldPosition.y, sys.worldPosition.z);
      // Orient units nicely toward central concourse/walkways
      if (sys.id === 'sys-xray') built.root.rotation.y = 0.85;
      if (sys.id === 'sys-wtmd') built.root.rotation.y = 0.85 - Math.PI / 2;
      if (sys.id === 'sys-access-fire') built.root.rotation.y = -0.38;
      if (sys.id === 'sys-radio-igcs') built.root.rotation.y = 0.55;

      this.scene.add(built.root);
      this.equipmentUnits.set(sys.id, built);
      this.interactiveRoots.push(built.root);

      this.collisionBoxes.push({
        minX: sys.worldPosition.x - 1.5,
        maxX: sys.worldPosition.x + 1.5,
        minZ: sys.worldPosition.z - 1.3,
        maxZ: sys.worldPosition.z + 1.3,
      });
    }

    // 6. Baggage Claim Carousel + BIDS + 360° Fisheye Camera (Zone 6)
    this.buildBaggageClaimHall(maxAniso);

    // 7. Server Room Raised Floor & 3x 42U ElBan Racks (Zone 7)
    this.buildServerRoom(maxAniso);

    // 8. TOC Evaluation Console Desk (Zone 9)
    const tocDesk = buildTocEvaluationDesk(maxAniso);
    tocDesk.position.set(14.5, 0, 14.2);
    tocDesk.rotation.y = -0.82;
    this.scene.add(tocDesk);
    this.interactiveRoots.push(tocDesk);
    this.collisionBoxes.push({ minX: 12.6, maxX: 16.4, minZ: 12.8, maxZ: 15.6 });

    // 8b. Distributed Terminal Surveillance Grid: Sony IPELA Fixed Bullet & Hikvision Fisheye in Every Corner
    this.buildDistributedCctvNetwork(maxAniso);

    // 8c. Distributed 100V Public Address System (PAS / AAS) Speakers Across All 9 Terminal Zones
    this.buildDistributedPasSpeakers(maxAniso);

    // 9. Overhead Zone Wayfinding Signage for All Key Zones
    const signs: Array<{ title: string; sub: string; pos: [number, number, number]; rotY: number; color: string }> = [
      { title: 'SECURITY CHECKPOINT (SCP)', sub: 'WTMD · HHMD · X-RAY', pos: [-12.5, 3.85, 5.5], rotY: 0.85 - Math.PI / 2, color: '#0284c7' },
      { title: 'AREA TERBATAS & SAFETY', sub: 'ACCESS CONTROL · MCFA FIRE', pos: [12.0, 3.8, 5.5], rotY: -0.38, color: '#dc2626' },
      { title: 'CONCOURSE · GATE A1–B5', sub: 'FIDS · MASTER CLOCK · PAS', pos: [0, 4.3, -3.2], rotY: 0, color: '#4f46e5' },
      { title: 'BAGGAGE CLAIM HALL', sub: 'BIDS BELT 03 · FISHEYE CCTV', pos: [-12.8, 3.8, -7.5], rotY: 0.35, color: '#f59e0b' },
      { title: 'RUANG SERVER ELBAN', sub: 'NVR · FIBER · PAS/AAS · PABX', pos: [14.5, 3.8, -7.5], rotY: -0.45, color: '#0d9488' },
      { title: 'PERIMETER AIRSIDE (PIDS)', sub: 'RADAR SCANNING · PTZ CCTV', pos: [0, 4.2, -16.2], rotY: 0, color: '#0d9488' },
      { title: 'POS RADIO & CRASH CAR', sub: 'HT · MOBILE RIG · IGCS', pos: [-17.2, 3.8, -14.2], rotY: 0.55, color: '#059669' },
      { title: 'RUANG TOC · EVALUASI', sub: 'LOGBOOK & UJI KOMPETENSI', pos: [14.2, 3.6, 14.2], rotY: -0.82, color: '#0284c7' },
    ];
    for (const s of signs) {
      const signTex = createZoneSignTexture(s.title, s.sub, s.color, maxAniso);
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 0.96, 0.12),
        [
          steelMat, steelMat, steelMat, steelMat,
          new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.3 }),
          new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.3 }),
        ]
      );
      board.position.set(s.pos[0], s.pos[1], s.pos[2]);
      board.rotation.y = s.rotY;
      this.scene.add(board);
    }
  }

  private buildExteriorFacadeAndPlaza(maxAniso: number): void {
    const extGroup = new THREE.Group();

    const stoneTex = createFacadeStoneTexture(maxAniso);
    stoneTex.repeat.set(3.2, 1);
    const pilasterTex = createTorajaWoodPilasterTexture(maxAniso);
    const louverTex = createFacadeLouverTexture(maxAniso);
    louverTex.repeat.set(3.4, 1);

    const matStoneExt = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.72,
      metalness: 0.06,
    });
    const matInteriorDrywall = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.65,
      metalness: 0.05,
    });
    const matPilasterFace = new THREE.MeshStandardMaterial({
      map: pilasterTex,
      roughness: 0.56,
      metalness: 0.14,
    });
    const matDarkTeak = new THREE.MeshStandardMaterial({
      color: 0x3b2416,
      roughness: 0.62,
      metalness: 0.12,
    });
    const matLouverFace = new THREE.MeshStandardMaterial({
      map: louverTex,
      roughness: 0.42,
      metalness: 0.52,
    });
    const matCharcoalMetal = new THREE.MeshStandardMaterial({
      color: 0x1e242c,
      roughness: 0.38,
      metalness: 0.68,
    });
    const matBronzeTrim = new THREE.MeshStandardMaterial({
      color: 0x5c4632,
      roughness: 0.44,
      metalness: 0.58,
    });
    const matWarmCoveLed = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.55,
      roughness: 0.2,
    });
    this.exteriorCoveLedMat = matWarmCoveLed;

    // Warm Exterior Arrival Plaza Architectural Lighting (controlled by 'exterior' circuit, dramatic at Night!)
    [-8.5, 8.5].forEach((ex) => {
      const extLight = new THREE.PointLight(0xfde68a, 0, 26, 1.45);
      extLight.position.set(ex, 5.1, 21.8);
      this.scene.add(extLight);
      const list = this.circuitLights.get('exterior') ?? [];
      list.push(extLight);
      this.circuitLights.set('exterior', list);
    });
    const matTransomGlass = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });

    const FACADE_Z = 17.36;
    const WALL_THICK = 0.46;
    const LOWER_H = 5.26;

    // 1. Left & Right Flanking Lower Exterior Facade Walls (Warm Travertine Sandstone + Interior Backing)
    // Spans x = -23.0..-3.72 and x = +3.72..+23.0 (tucks seamlessly behind the glowing arch shoulders, portal stays 100% open)
    const wingWidth = 19.28;
    const wingCenterOffset = 3.72 + wingWidth / 2; // 13.36
    const wingMaterials = [
      matStoneExt,        // +X
      matStoneExt,        // -X
      matBronzeTrim,      // +Y
      matBronzeTrim,      // -Y
      matStoneExt,        // +Z (Exterior face)
      matInteriorDrywall, // -Z (Indoor terminal wall)
    ];

    [-1, 1].forEach((side) => {
      const cx = side * wingCenterOffset;
      const lowerWall = new THREE.Mesh(new THREE.BoxGeometry(wingWidth, LOWER_H, WALL_THICK), wingMaterials);
      lowerWall.position.set(cx, LOWER_H / 2, FACADE_Z);
      lowerWall.castShadow = true;
      lowerWall.receiveShadow = true;
      extGroup.add(lowerWall);

      // Continuous Warm Golden-Amber Architectural Cove Lighting along top cornice & bottom base plinth
      const topCove = new THREE.Mesh(new THREE.BoxGeometry(wingWidth - 0.1, 0.085, 0.08), matWarmCoveLed);
      topCove.position.set(cx, LOWER_H - 0.02, FACADE_Z + WALL_THICK / 2 + 0.04);
      const baseCove = new THREE.Mesh(new THREE.BoxGeometry(wingWidth - 0.1, 0.075, 0.08), matWarmCoveLed);
      baseCove.position.set(cx, 0.06, FACADE_Z + WALL_THICK / 2 + 0.045);

      // Dark bronze architectural plinth curb & overhanging cornice drip ledge
      const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(wingWidth, 0.12, WALL_THICK + 0.16), matBronzeTrim);
      basePlinth.position.set(cx, 0.06, FACADE_Z + 0.04);
      const corniceLedge = new THREE.Mesh(new THREE.BoxGeometry(wingWidth + 0.06, 0.12, WALL_THICK + 0.24), matBronzeTrim);
      corniceLedge.position.set(cx, LOWER_H + 0.07, FACADE_Z + 0.08);
      extGroup.add(topCove, baseCove, basePlinth, corniceLedge);

      // 4 Symmetrical Carved Toraja Wood Architectural Pilasters per side (matching reference facade rhythm)
      const pilasterOffsets = [6.75, 11.0, 15.25, 19.5];
      const pilasterMats = [
        matDarkTeak,
        matDarkTeak,
        matDarkTeak,
        matDarkTeak,
        matPilasterFace,
        matDarkTeak,
      ];
      for (const px of pilasterOffsets) {
        const pilaster = new THREE.Mesh(new THREE.BoxGeometry(1.36, LOWER_H - 0.2, 0.11), pilasterMats);
        pilaster.position.set(side * px, LOWER_H / 2, FACADE_Z + WALL_THICK / 2 + 0.055);
        pilaster.castShadow = true;
        pilaster.receiveShadow = true;
        extGroup.add(pilaster);
      }

      // Upper Dark Charcoal Horizontal Louver Fascia Band (y = 5.38..6.86)
      // Extends neatly inward to x = ±3.35 right beside the circular ATNOS & AIRPORT TECHNOLOGY shoulder emblems
      const louverW = 19.75; // 3.35 .. 23.10
      const louverH = 1.48;
      const louverCx = side * (3.35 + louverW / 2);
      const louverMats = [
        matCharcoalMetal,
        matCharcoalMetal,
        matCharcoalMetal,
        matCharcoalMetal,
        matLouverFace,
        matInteriorDrywall,
      ];
      const louverBand = new THREE.Mesh(new THREE.BoxGeometry(louverW, louverH, WALL_THICK + 0.12), louverMats);
      louverBand.position.set(louverCx, LOWER_H + 0.13 + louverH / 2, FACADE_Z + 0.04);
      louverBand.castShadow = true;
      louverBand.receiveShadow = true;

      // Crisp Dark Steel Roof Parapet Coping Cap crowning each wing
      const parapetCap = new THREE.Mesh(new THREE.BoxGeometry(louverW + 0.1, 0.14, WALL_THICK + 0.34), matCharcoalMetal);
      parapetCap.position.set(louverCx, LOWER_H + 0.13 + louverH + 0.07, FACADE_Z + 0.08);
      extGroup.add(louverBand, parapetCap);

      // Exterior side-corner architectural return cladding (wraps outer west/east corners nicely for oblique angles)
      const sideReturnLower = new THREE.Mesh(new THREE.BoxGeometry(0.16, LOWER_H, 12.0), matStoneExt);
      sideReturnLower.position.set(side * 23.06, LOWER_H / 2, FACADE_Z - 5.9);
      const sideReturnUpper = new THREE.Mesh(new THREE.BoxGeometry(0.2, louverH + 0.2, 12.2), matCharcoalMetal);
      sideReturnUpper.position.set(side * 23.08, LOWER_H + 0.13 + louverH / 2, FACADE_Z - 5.9);
      extGroup.add(sideReturnLower, sideReturnUpper);
    });

    // Central sealing spandrel directly behind the Walk-In ElBan Marquee & subtle sky-tinted clerestory glass behind the Crown
    const centerSpandrel = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.24, 0.28), matCharcoalMetal);
    centerSpandrel.position.set(0, 4.86, FACADE_Z - 0.06);
    const centerTransom = new THREE.Mesh(new THREE.BoxGeometry(6.72, 1.46, 0.1), matTransomGlass);
    centerTransom.position.set(0, 6.14, FACADE_Z - 0.18);
    const centerParapet = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.14, 0.42), matCharcoalMetal);
    centerParapet.position.set(0, 6.94, FACADE_Z - 0.06);
    extGroup.add(centerSpandrel, centerTransom, centerParapet);

    // Solid wing collision boxes across the full left & right facade walls so entry goes exclusively through the central gate portal
    this.collisionBoxes.push(
      { minX: -23.2, maxX: -3.55, minZ: 16.65, maxZ: 18.45 },
      { minX: 3.55, maxX: 23.2, minZ: 16.65, maxZ: 18.45 }
    );

    // 2. Outdoor Arrival Forecourt Granite Apron, Drop-Off Kerbside Roadway & Distant Landscaped Horizon (No Void)
    const forecourtMat = new THREE.MeshStandardMaterial({ color: 0xd4d9e0, roughness: 0.78, metalness: 0.04 });
    const forecourtApron = new THREE.Mesh(new THREE.PlaneGeometry(180, 18), forecourtMat);
    forecourtApron.rotation.x = -Math.PI / 2;
    forecourtApron.position.set(0, -0.02, 26.5);
    forecourtApron.receiveShadow = true;
    extGroup.add(forecourtApron);

    // Tactile raised kerbstone edging between pedestrian entry plaza and drop-off roadway
    const kerbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7, metalness: 0.08 });
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(180, 0.16, 0.45), kerbMat);
    kerb.position.set(0, 0.04, 31.35);
    kerb.receiveShadow = true;
    extGroup.add(kerb);

    // Airport Drop-Off Asphalt Roadway + White Dashed Lane Markings + Central Pedestrian Zebra Crossing
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.88, metalness: 0.06 });
    const dropOffRoad = new THREE.Mesh(new THREE.PlaneGeometry(180, 12.5), roadMat);
    dropOffRoad.rotation.x = -Math.PI / 2;
    dropOffRoad.position.set(0, -0.032, 37.8);
    dropOffRoad.receiveShadow = true;
    extGroup.add(dropOffRoad);

    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });
    for (let sx = -44; sx <= 44; sx += 5.5) {
      if (Math.abs(sx) < 4.5) continue; // keep center clean for zebra crosswalk
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.18), stripeMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(sx, -0.015, 37.8);
      extGroup.add(dash);
    }
    // Pedestrian Zebra Crosswalk aligned directly with the Walk-In ElBan Entrance Gate
    for (let zx = -2.4; zx <= 2.41; zx += 0.8) {
      const zebra = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 6.2), stripeMat);
      zebra.rotation.x = -Math.PI / 2;
      zebra.position.set(zx, -0.012, 36.2);
      extGroup.add(zebra);
    }

    // Distant South Landscaped Tropical Lawn extending cleanly to horizon fog
    const southGrassMat = new THREE.MeshStandardMaterial({ color: 0x647a67, roughness: 0.95 });
    const southGrass = new THREE.Mesh(new THREE.PlaneGeometry(180, 110), southGrassMat);
    southGrass.rotation.x = -Math.PI / 2;
    southGrass.position.set(0, -0.055, 99);
    extGroup.add(southGrass);

    // 3. Composite Tropical Airport Palm Planter Islands (4x flanking exterior plaza, leaving central sightline open)
    const matPlanterStone = new THREE.MeshStandardMaterial({ color: 0xc2b29b, roughness: 0.72, metalness: 0.05 });
    const matSoil = new THREE.MeshStandardMaterial({ color: 0x3b2f26, roughness: 0.96 });
    const matTrunk = new THREE.MeshStandardMaterial({ color: 0x6b5344, roughness: 0.88 });
    const matFrond = new THREE.MeshStandardMaterial({ color: 0x3f7d47, roughness: 0.65, side: THREE.DoubleSide });
    const matShrub = new THREE.MeshStandardMaterial({ color: 0x4d8b55, roughness: 0.78 });

    const palmCoords: Array<[number, number, number]> = [
      [-12.6, 23.8, 0.4],
      [12.6, 23.8, -0.5],
      [-19.2, 26.2, 1.1],
      [19.2, 26.2, -1.2],
    ];

    for (const [px, pz, rotSeed] of palmCoords) {
      const planterGroup = new THREE.Group();
      planterGroup.position.set(px, 0, pz);

      const planterBox = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.56, 2.35), matPlanterStone);
      planterBox.position.y = 0.28;
      planterBox.castShadow = true;
      planterBox.receiveShadow = true;
      const planterRim = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 2.5), matBronzeTrim);
      planterRim.position.y = 0.58;
      const soilPad = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.06, 2.12), matSoil);
      soilPad.position.y = 0.56;
      planterGroup.add(planterBox, planterRim, soilPad);

      // Low ornamental tropical shrubs clustered around trunk base
      for (let s = 0; s < 4; s++) {
        const sa = (s / 4) * Math.PI * 2 + rotSeed;
        const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 1), matShrub);
        bush.scale.set(1.15, 0.72, 1.15);
        bush.position.set(Math.cos(sa) * 0.58, 0.72, Math.sin(sa) * 0.58);
        planterGroup.add(bush);
      }

      // Multi-segment gently tapering tropical palm trunk
      const segHeights = [0.85, 0.9, 0.9, 0.85, 0.8];
      let curY = 0.58;
      segHeights.forEach((sh, idx) => {
        const rBot = 0.18 - idx * 0.018;
        const rTop = 0.16 - idx * 0.018;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, sh, 10), matTrunk);
        seg.position.set(Math.sin(rotSeed) * idx * 0.03, curY + sh / 2, Math.cos(rotSeed) * idx * 0.03);
        seg.castShadow = true;
        planterGroup.add(seg);
        curY += sh - 0.02;
      });

      // Crown & 9 arching procedural palm fronds
      const crownX = Math.sin(rotSeed) * 0.12;
      const crownZ = Math.cos(rotSeed) * 0.12;
      for (let f = 0; f < 9; f++) {
        const fa = (f / 9) * Math.PI * 2 + rotSeed;
        const frondPivot = new THREE.Group();
        frondPivot.position.set(crownX, curY + 0.05, crownZ);
        frondPivot.rotation.y = fa;

        const innerBlade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 1.25), matFrond);
        innerBlade.position.set(0, 0.22, 0.62);
        innerBlade.rotation.x = -0.34;
        const outerBlade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 1.15), matFrond);
        outerBlade.position.set(0, 0.12, 1.66);
        outerBlade.rotation.x = 0.42;
        frondPivot.add(innerBlade, outerBlade);
        planterGroup.add(frondPivot);
      }

      extGroup.add(planterGroup);
      this.collisionBoxes.push({
        minX: px - 1.38,
        maxX: px + 1.38,
        minZ: pz - 1.38,
        maxZ: pz + 1.38,
      });
    }

    // 4. Sleek Architectural Pathway Bollard Lights lining the exterior arrival plaza approach
    const bollardZs = [21.2, 24.8, 28.4];
    [-7.6, 7.6].forEach((bx) => {
      for (const bz of bollardZs) {
        const bBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.06, 14), matCharcoalMetal);
        bBase.position.set(bx, 0.03, bz);
        const bBody = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.72, 14), matCharcoalMetal);
        bBody.position.set(bx, 0.42, bz);
        bBody.castShadow = true;
        const bGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.14, 14), matWarmCoveLed);
        bGlow.position.set(bx, 0.84, bz);
        const bCap = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.05, 14), matCharcoalMetal);
        bCap.position.set(bx, 0.935, bz);
        extGroup.add(bBase, bBody, bGlow, bCap);
      }
    });

    // 5. Twin Brushed-Steel Airport Arrival Flagpoles flanking outer forecourt
    const matPole = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.84 });
    const matFlagBlue = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.55, side: THREE.DoubleSide });
    const matFlagGold = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55, side: THREE.DoubleSide });
    [-16.2, 16.2].forEach((fx, i) => {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.35, 16), matPlanterStone);
      ped.position.set(fx, 0.175, 29.5);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.085, 8.6, 14), matPole);
      mast.position.set(fx, 4.6, 29.5);
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), matBronzeTrim);
      finial.position.set(fx, 8.95, 29.5);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.95), i === 0 ? matFlagBlue : matFlagGold);
      flag.position.set(fx + 0.85, 8.2, 29.5);
      extGroup.add(ped, mast, finial, flag);
    });

    this.scene.add(extGroup);
  }

  private buildBaggageClaimHall(maxAniso: number): void {
    const group = new THREE.Group();
    group.position.set(-12.8, 0, -7.5);

    const matSteel = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.8 });
    const matRubber = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.1 });

    // Oval Carousel Base & Moving Belt
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.45, 0.52, 28), matSteel);
    base.position.y = 0.26;
    const beltRing = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.32, 12, 36), matRubber);
    beltRing.rotation.x = Math.PI / 2;
    beltRing.scale.set(1, 1, 0.22);
    beltRing.position.y = 0.56;

    // Overhead BIDS Display Monitor
    const bidsTex = createBidsTexture(maxAniso);
    const bidsPole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.35, 14), matSteel);
    bidsPole.position.y = 1.4;
    const bidsFrame = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.18, 0.18), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }));
    bidsFrame.position.y = 2.55;
    const bidsFace = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.04),
      new THREE.MeshStandardMaterial({ map: bidsTex, emissiveMap: bidsTex, emissive: 0xffffff, emissiveIntensity: 0.5 })
    );
    bidsFace.position.set(0, 2.55, 0.095);
    const bidsBack = bidsFace.clone();
    bidsBack.rotation.y = Math.PI;
    bidsBack.position.z = -0.095;

    // Ceiling Hikvision Vandal Fisheye 360° Camera mounted FLUSH directly onto Plafon (y = 7.16)
    const fisheyeMount = new THREE.Group();
    fisheyeMount.position.set(0, 7.16, 0.55);
    const fisheyeDome = createHikvisionFisheyeCamera(maxAniso, 0.45);
    fisheyeDome.scale.setScalar(1.65);
    fisheyeDome.rotation.y = 0.42;
    fisheyeMount.add(fisheyeDome);
    fisheyeMount.traverse((o) => {
      o.userData.systemId = 'sys-cctv-pids';
      o.userData.componentId = 'comp-cctv-cameras';
    });

    // Moving luggage items orbiting the carousel
    const bagColors = [0x1d4ed8, 0xb91c1c, 0x0f766e, 0xd97706];
    for (let i = 0; i < 4; i++) {
      const bag = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.34, 0.4),
        new THREE.MeshStandardMaterial({ color: bagColors[i], roughness: 0.55 })
      );
      bag.userData.angleOffset = (i / 4) * Math.PI * 2;
      bag.position.y = 0.78;
      this.baggageCarouselBags.push(bag);
      group.add(bag);
    }

    group.add(base, beltRing, bidsPole, bidsFrame, bidsFace, bidsBack, fisheyeMount);
    group.traverse((o) => {
      if (!o.userData.systemId) {
        o.userData.systemId = 'sys-fids-pas';
        o.userData.componentId = 'comp-fids-displays';
      }
    });
    this.scene.add(group);
    this.interactiveRoots.push(group);
    this.collisionBoxes.push({ minX: -15.3, maxX: -10.3, minZ: -10.0, maxZ: -5.0 });
  }

  private buildServerRoom(maxAniso: number): void {
    const group = new THREE.Group();
    group.position.set(14.8, 0, -7.6);
    group.rotation.y = -0.45;

    // Raised anti-static server room platform
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.14, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.3 })
    );
    platform.position.y = 0.07;
    group.add(platform);

    const rackSpecs: Array<{
      x: number;
      sysId: SystemId;
      compId: string;
      accent: number;
    }> = [
      { x: -1.6, sysId: 'sys-cctv-pids', compId: 'comp-cctv-nvr', accent: 0x0d9488 },
      { x: 0, sysId: 'sys-fids-pas', compId: 'comp-pas-aas', accent: 0x4f46e5 },
      { x: 1.6, sysId: 'sys-radio-igcs', compId: 'comp-igcs-pabx', accent: 0x059669 },
    ];

    const rackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.65 });
    const nvrFaceTex = createHikvisionNvrFrontTexture(maxAniso);
    const nvrFaceMat = new THREE.MeshStandardMaterial({
      map: nvrFaceTex,
      emissiveMap: nvrFaceTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.16,
      roughness: 0.2,
      metalness: 0.35,
    });

    for (const r of rackSpecs) {
      const rack = new THREE.Group();
      rack.position.set(r.x, 1.24, 0);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.92), rackMat);
      rack.add(body);

      for (let u = 0; u < 6; u++) {
        if (r.compId === 'comp-cctv-nvr') {
          const nvrBlade = new THREE.Mesh(
            new THREE.BoxGeometry(0.96, 0.21, 0.06),
            [rackMat, rackMat, rackMat, rackMat, nvrFaceMat, rackMat]
          );
          nvrBlade.position.set(0, 0.75 - u * 0.3, 0.45);
          rack.add(nvrBlade);
        } else {
          const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.94, 0.22, 0.06),
            new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7 })
          );
          blade.position.set(0, 0.75 - u * 0.3, 0.45);
          const ledBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.03, 0.08),
            new THREE.MeshStandardMaterial({ color: r.accent, emissive: r.accent, emissiveIntensity: 0.85 })
          );
          ledBar.position.set(-0.26, 0.75 - u * 0.3, 0.46);
          rack.add(blade, ledBar);
        }
      }

      rack.traverse((c) => {
        c.userData.systemId = r.sysId;
        c.userData.componentId = r.compId;
      });
      group.add(rack);
    }

    this.scene.add(group);
    this.interactiveRoots.push(group);
    this.collisionBoxes.push({ minX: 11.8, maxX: 17.8, minZ: -9.8, maxZ: -5.4 });
  }

  private buildDistributedCctvNetwork(maxAniso: number): void {
    const netGroup = new THREE.Group();
    const matBracket = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.38, metalness: 0.72 });

    // Create shared procedural textures once for this WebGL context (8x lower VRAM & faster startup)
    const sharedSonyTextures = {
      right: createSonyIpelaSideTexture(maxAniso, 'right'),
      left: createSonyIpelaSideTexture(maxAniso, 'left'),
      front: createSonyIpelaFrontFaceTexture(maxAniso),
    };
    const sharedFisheyeBand = createHikvisionFisheyeBandTexture(maxAniso);

    const CEILING_Y = 7.16;

    // 1. 8x SONY IPELA Fixed Bullet Cameras mounted tight at the upper wall-to-Plafon junction (touching Plafon y = 7.16)
    const fixedPlacements: Array<{
      pos: [number, number, number];
      rotY: number;
      pitchX: number;
      label: string;
    }> = [
      // South-West Lobby Entrance Corner (inside hall behind exterior facade) -> aimed NE across Lobby & Videotron
      { pos: [-22.45, CEILING_Y - 0.19, 15.2], rotY: 2.38, pitchX: 0.4, label: 'SW Lobby' },
      // South-East Lobby / TOC Corner (inside hall behind exterior facade) -> aimed NW across TOC & Lobby
      { pos: [22.45, CEILING_Y - 0.19, 15.2], rotY: -2.35, pitchX: 0.42, label: 'SE TOC' },
      // West Wall SCP Overlook -> aimed ENE directly over CEIA WTMD + Rapiscan X-Ray
      { pos: [-22.45, CEILING_Y - 0.19, 7.6], rotY: 1.42, pitchX: 0.44, label: 'West SCP' },
      // East Wall Restricted Area Overlook -> aimed WNW over Access Control & MCFA
      { pos: [22.45, CEILING_Y - 0.19, 7.8], rotY: -1.38, pitchX: 0.42, label: 'East Access' },
      // West-North Baggage Claim Corner -> aimed NE across Baggage Carousel Belt 03
      { pos: [-22.45, CEILING_Y - 0.19, -4.2], rotY: 1.18, pitchX: 0.4, label: 'WNW Baggage' },
      // East-North Server Room Corner -> aimed NW across 42U ElBan Server Racks
      { pos: [22.45, CEILING_Y - 0.19, -4.4], rotY: -1.2, pitchX: 0.42, label: 'ENE Server' },
      // North-West Airside Glazing Corner -> aimed NNE across Pos Radio & Crash Car
      { pos: [-22.0, CEILING_Y - 0.19, -11.2], rotY: 2.72, pitchX: 0.36, label: 'NW Apron' },
      // North-East Airside Glazing Corner -> aimed NNW across Perimeter Fence & Apron
      { pos: [22.0, CEILING_Y - 0.19, -11.2], rotY: -2.68, pitchX: 0.36, label: 'NE Airside' },
    ];

    fixedPlacements.forEach((cfg) => {
      const mount = new THREE.Group();
      mount.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);

      // Upper wall/ceiling L-bracket pad anchored flush up to the Plafon underside (y = 7.16)
      const wallPad = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.34, 0.05), matBracket);
      wallPad.position.y = 0.02;
      wallPad.rotation.y = cfg.rotY;
      const ceilingPlate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.22), matBracket);
      ceilingPlate.position.y = 0.178;
      mount.add(wallPad, ceilingPlate);

      const cam = createSonyFixedBulletCamera(maxAniso, sharedSonyTextures);
      cam.scale.setScalar(1.45);
      cam.rotation.order = 'YXZ';
      cam.rotation.y = cfg.rotY;
      cam.rotation.x = cfg.pitchX;
      mount.add(cam);
      netGroup.add(mount);
    });

    // 2. 6x HIKVISION Vandal Fisheye Dome Cameras mounted FLUSH directly against the Plafon (y = 7.16)
    // (In addition to the Baggage Claim flush ceiling Fisheye & Perimeter mast Fisheye)
    const fisheyePlacements: Array<{
      pos: [number, number, number];
      rotY: number;
      lensTiltX: number;
    }> = [
      // Security Checkpoint (SCP) overhead wide view watching WTMD + X-Ray queue
      { pos: [-12.4, CEILING_Y, 5.5], rotY: -0.72, lensTiltX: 0.62 },
      // Departure Lobby overhead 360° crowd monitoring above Videotron approach
      { pos: [0, CEILING_Y, 14.5], rotY: Math.PI, lensTiltX: 0.48 },
      // Central Concourse & Boarding Gate FIDS hub overhead
      { pos: [0, CEILING_Y, -1.2], rotY: 0.25, lensTiltX: 0.42 },
      // Restricted Area / Access Control & MCFA corner ceiling
      { pos: [12.2, CEILING_Y, 5.5], rotY: -0.38, lensTiltX: 0.65 },
      // Server Room overhead monitoring 3x 42U ElBan Racks
      { pos: [14.8, CEILING_Y, -7.6], rotY: -0.5, lensTiltX: 0.55 },
      // TOC Room evaluation corner ceiling
      { pos: [14.5, CEILING_Y, 14.2], rotY: -0.82, lensTiltX: 0.6 },
    ];

    fisheyePlacements.forEach((cfg) => {
      const fish = createHikvisionFisheyeCamera(maxAniso, cfg.lensTiltX, sharedFisheyeBand);
      fish.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      fish.scale.setScalar(1.65);
      fish.rotation.y = cfg.rotY;
      netGroup.add(fish);
    });

    netGroup.traverse((o) => {
      o.userData.systemId = 'sys-cctv-pids';
      o.userData.componentId = 'comp-cctv-cameras';
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    this.scene.add(netGroup);
    this.interactiveRoots.push(netGroup);
  }

  private buildDistributedPasSpeakers(maxAniso: number): void {
    const pasNetGroup = new THREE.Group();
    const matConduit = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.72 });
    const matMast = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.36, metalness: 0.78 });

    // Create shared procedural textures once for this WebGL context
    const sharedCeilingTex = createCeilingSpeakerGrilleTexture(maxAniso);
    const sharedColumnTex = createColumnSpeakerGrilleTexture(maxAniso);

    const registerSpeaker = (zoneId: ZoneId, handle: PasSpeakerHandle) => {
      const list = this.pasZoneSpeakers.get(zoneId) ?? [];
      list.push(handle);
      this.pasZoneSpeakers.set(zoneId, list);
    };

    const CEILING_Y = 7.16;
    const CEILING_SPK_SCALE = 1.68;

    // 1. Flush-Mount 100V Ceiling Speakers recessed cleanly into the Plafon (white bezel flush at y = 7.16)
    const ceilingPlacements: Array<{ zone: ZoneId; pos: [number, number] }> = [
      // Lobby (2x)
      { zone: 'lobby', pos: [-5.5, 13.8] },
      { zone: 'lobby', pos: [5.5, 13.8] },
      // SCP (1x overhead queue)
      { zone: 'scp', pos: [-11.6, 3.6] },
      // Concourse (4x distributed along departure hall & boarding gates)
      { zone: 'concourse', pos: [-6.4, 1.4] },
      { zone: 'concourse', pos: [6.4, 1.4] },
      { zone: 'concourse', pos: [-5.8, -6.2] },
      { zone: 'concourse', pos: [5.8, -6.2] },
      // Baggage Claim (2x overhead carousel & arrival approach)
      { zone: 'baggage', pos: [-12.8, -4.6] },
      { zone: 'baggage', pos: [-15.4, -9.2] },
      // Restricted Area (1x)
      { zone: 'restricted', pos: [11.6, 3.4] },
      // Server Room (2x)
      { zone: 'server', pos: [13.2, -7.2] },
      { zone: 'server', pos: [16.8, -7.2] },
      // TOC Room (1x)
      { zone: 'toc', pos: [14.5, 11.4] },
    ];

    ceilingPlacements.forEach((cfg) => {
      const spk = createCeilingSpeakerUnit(maxAniso, sharedCeilingTex);
      spk.group.scale.setScalar(CEILING_SPK_SCALE);
      // Back-can sits recessed in ceiling plenum so bezel trim ring touches Plafon flush at y = 7.16
      spk.group.position.set(cfg.pos[0], CEILING_Y + 0.09 * CEILING_SPK_SCALE, cfg.pos[1]);
      pasNetGroup.add(spk.group);
      registerSpeaker(cfg.zone, spk);
    });

    // 2. Brushed-Aluminum 100V Wall Column Line-Array Speakers (Indoor Only — tight to top of walls touching Plafon y = 7.16)
    const COLUMN_SPK_SCALE = 1.38;
    const COLUMN_TOP_Y = CEILING_Y - 0.396 * COLUMN_SPK_SCALE; // 6.61m -> top cap touches Plafon at 7.16m
    const columnPlacements: Array<{
      zone: ZoneId;
      pos: [number, number, number];
      rotY: number;
      pitchX: number;
    }> = [
      // Lobby flanking walls aimed down across departure hall (2x)
      { zone: 'lobby', pos: [-22.65, COLUMN_TOP_Y, 14.5], rotY: Math.PI / 2 - 0.16, pitchX: 0.24 },
      { zone: 'lobby', pos: [22.65, COLUMN_TOP_Y, 14.5], rotY: -Math.PI / 2 + 0.16, pitchX: 0.24 },
      // SCP Security Checkpoint walls aimed down over WTMD & X-Ray lanes (2x)
      { zone: 'scp', pos: [-22.65, COLUMN_TOP_Y, 5.2], rotY: Math.PI / 2, pitchX: 0.26 },
      { zone: 'scp', pos: [-22.65, COLUMN_TOP_Y, 1.0], rotY: Math.PI / 2 + 0.12, pitchX: 0.26 },
      // Concourse North Airside Glazing columns aimed south across Boarding Gates (2x)
      { zone: 'concourse', pos: [-3.4, COLUMN_TOP_Y, -11.35], rotY: 0.16, pitchX: 0.24 },
      { zone: 'concourse', pos: [3.4, COLUMN_TOP_Y, -11.35], rotY: -0.16, pitchX: 0.24 },
      // Baggage Claim west wall aimed across Carousel Belt 03 (1x)
      { zone: 'baggage', pos: [-22.65, COLUMN_TOP_Y, -7.8], rotY: Math.PI / 2 - 0.12, pitchX: 0.26 },
      // Restricted Area east wall aimed down across Access Control & MCFA (1x)
      { zone: 'restricted', pos: [22.65, COLUMN_TOP_Y, 5.2], rotY: -Math.PI / 2, pitchX: 0.26 },
      // TOC Room east wall overlooking evaluation console (inside hall cleanly under flat Plafon) (1x)
      { zone: 'toc', pos: [22.65, COLUMN_TOP_Y, 15.2], rotY: -Math.PI / 2 - 0.22, pitchX: 0.24 },
    ];

    columnPlacements.forEach((cfg) => {
      const spk = createColumnSpeakerUnit(maxAniso, sharedColumnTex);
      spk.group.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      spk.group.scale.setScalar(COLUMN_SPK_SCALE);
      spk.group.rotation.order = 'YXZ';
      spk.group.rotation.y = cfg.rotY;
      spk.group.rotation.x = cfg.pitchX;
      pasNetGroup.add(spk.group);
      registerSpeaker(cfg.zone, spk);
    });

    // 3. Weatherproof IP65 Re-Entrant Horn Trumpet Speakers (OUTDOOR Airside Apron Zones Only)
    const hornPlacements: Array<{
      zone: ZoneId;
      pos: [number, number, number];
      rotY: number;
      pitchX: number;
      mastHeight: number;
    }> = [
      // Airside Perimeter Security Fence Masts (2x outdoor)
      { zone: 'perimeter', pos: [-6.5, 4.1, -17.3], rotY: 0.38, pitchX: 0.22, mastHeight: 4.2 },
      { zone: 'perimeter', pos: [6.5, 4.1, -17.3], rotY: -0.38, pitchX: 0.22, mastHeight: 4.2 },
      // Pos Radio & Crash Car Apron Bay Masts (2x outdoor)
      { zone: 'comms', pos: [-21.4, 4.0, -14.8], rotY: 1.05, pitchX: 0.22, mastHeight: 4.1 },
      { zone: 'comms', pos: [-13.2, 4.0, -17.2], rotY: -0.58, pitchX: 0.22, mastHeight: 4.1 },
    ];

    hornPlacements.forEach((cfg) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, cfg.mastHeight, 12), matMast);
      pole.position.set(cfg.pos[0], cfg.mastHeight / 2, cfg.pos[2]);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.14, 14), matConduit);
      base.position.set(cfg.pos[0], 0.07, cfg.pos[2]);
      pasNetGroup.add(pole, base);

      const spk = createHornSpeakerUnit();
      spk.group.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      spk.group.scale.setScalar(1.45);
      spk.group.rotation.order = 'YXZ';
      spk.group.rotation.y = cfg.rotY;
      spk.group.rotation.x = cfg.pitchX;
      pasNetGroup.add(spk.group);
      registerSpeaker(cfg.zone, spk);
    });

    pasNetGroup.traverse((o) => {
      if (o.userData.isWaveEffect) return;
      o.userData.systemId = 'sys-fids-pas';
      o.userData.componentId = 'comp-pas-aas';
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    this.scene.add(pasNetGroup);
    this.interactiveRoots.push(pasNetGroup);
  }

  private buildWallLightSwitchPanels(maxAniso: number): void {
    const circuits: Array<{ id: LightCircuitId; shortLabel: string }> = [
      { id: 'lobby_concourse', shortLabel: 'LOBBY' },
      { id: 'scp_baggage', shortLabel: 'SCP' },
      { id: 'restricted_server', shortLabel: 'SERVER' },
      { id: 'toc', shortLabel: 'TOC' },
      { id: 'exterior', shortLabel: 'LUAR' },
    ];

    // Procedural brushed faceplate header graphic
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 128;
    const ctx = labelCanvas.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, 512, 10);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 32px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAKLAR LAMPU RUANGAN', 256, 62);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 20px "IBM Plex Mono", monospace';
    ctx.fillText('ELBAN LIGHTING CONTROL · 220V AC', 256, 102);
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    labelTex.colorSpace = THREE.SRGBColorSpace;
    labelTex.anisotropy = Math.min(8, maxAniso);

    const matPlate = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.32 });
    const matBezel = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.55 });
    const matRocker = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.1 });
    const matHeader = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.35, metalness: 0.15 });

    const createPanelInstance = (pos: [number, number, number], rotY: number) => {
      const panelGroup = new THREE.Group();
      panelGroup.position.set(pos[0], pos[1], pos[2]);
      panelGroup.rotation.y = rotY;

      const backBox = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.56, 0.055), matBezel);
      const facePlate = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.5, 0.025), matPlate);
      facePlate.position.z = 0.032;
      const headerBadge = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.16), matHeader);
      headerBadge.position.set(0, 0.15, 0.047);
      panelGroup.add(backBox, facePlate, headerBadge);

      circuits.forEach((c, idx) => {
        const sx = -0.3 + idx * 0.15;
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.21, 0.02), matBezel);
        slot.position.set(sx, -0.08, 0.044);

        const rocker = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.17, 0.032), matRocker);
        rocker.position.set(sx, -0.08, 0.056);
        rocker.rotation.x = -0.24; // ON position tilted upward

        const ledMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x10b981,
          emissiveIntensity: 1.4,
          roughness: 0.2,
        });
        const pilotLed = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.016, 0.012), ledMat);
        pilotLed.position.set(sx, 0.042, 0.052);

        [slot, rocker, pilotLed].forEach((m) => {
          m.userData.lightSwitchCircuitId = c.id;
        });

        const reg = this.wallSwitchRockers.get(c.id) ?? [];
        reg.push({ rocker, ledMat });
        this.wallSwitchRockers.set(c.id, reg);

        panelGroup.add(slot, rocker, pilotLed);
      });

      // Tag housing itself to default to lobby_concourse if user clicks panel frame
      backBox.userData.lightSwitchCircuitId = 'lobby_concourse';
      facePlate.userData.lightSwitchCircuitId = 'lobby_concourse';
      headerBadge.userData.lightSwitchCircuitId = 'lobby_concourse';

      this.scene.add(panelGroup);
      this.interactiveRoots.push(panelGroup);
    };

    // Mount 3 accessible physical 3D Light Switch Panels inside the terminal hall:
    // 1. Inside Main Entrance Gate Right Wall (immediately accessible on entering hall)
    createPanelInstance([5.8, 1.45, 17.1], Math.PI);
    // 2. Inside Main Entrance Gate Left Wall (symmetrical twin switchboard)
    createPanelInstance([-5.8, 1.45, 17.1], Math.PI);
    // 3. TOC Room East Wall beside Evaluation Console
    createPanelInstance([22.56, 1.45, 12.6], -Math.PI / 2);
  }

  private applyLightingState(): void {
    const isNight = this.timeOfDay === 'night';
    const indoorCircuits: LightCircuitId[] = ['lobby_concourse', 'scp_baggage', 'restricted_server', 'toc'];
    const activeIndoorCount = indoorCircuits.filter((id) => this.lightCircuits[id]).length;
    const indoorRatio = activeIndoorCount / indoorCircuits.length;

    // 1. Sky, Horizon Fog & Night Starfield/Moon
    const skyHex = isNight ? 0x060d1c : 0xcbd9e8;
    (this.scene.background as THREE.Color).setHex(skyHex);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(skyHex);
      this.scene.fog.density = isNight ? 0.013 : 0.011;
    }
    if (this.nightSkyGroup) {
      this.nightSkyGroup.visible = isNight;
    }

    // 2. Main Global Sky & Sun/Moon Rig + Environment IBL Intensity
    if (isNight) {
      this.hemiLight.color.setHex(0x1e3a5f);
      this.hemiLight.groundColor.setHex(0x0b1220);
      this.hemiLight.intensity = 0.24 + indoorRatio * 0.22;

      this.keyLight.color.setHex(0x93c5fd);
      this.keyLight.intensity = 0.36;

      this.fillLight.color.setHex(0x1e293b);
      this.fillLight.intensity = 0.16;

      this.renderer.toneMappingExposure = 0.96;
      this.scene.environmentIntensity = 0.16 + indoorRatio * 0.34;
    } else {
      this.hemiLight.color.setHex(0xdbeafe);
      this.hemiLight.groundColor.setHex(0x94a3b8);
      this.hemiLight.intensity = 0.72 + indoorRatio * 0.22;

      this.keyLight.color.setHex(0xfff7ed);
      this.keyLight.intensity = 1.45;

      this.fillLight.color.setHex(0xbfdbfe);
      this.fillLight.intensity = 0.55;

      this.renderer.toneMappingExposure = 1.08;
      this.scene.environmentIntensity = 0.76 + indoorRatio * 0.24;
    }

    // 3. Per-Circuit Indoor Luminaires & PointLights
    (Object.keys(this.lightCircuits) as LightCircuitId[]).forEach((circuitId) => {
      const isOn = this.lightCircuits[circuitId];
      const mats = this.circuitPanelMats.get(circuitId);
      if (mats) {
        mats.forEach((m) => {
          m.emissiveIntensity = isOn ? (isNight ? 1.45 : 0.72) : 0.02;
          m.color.setHex(isOn ? 0xffffff : 0x64748b);
        });
      }

      const lights = this.circuitLights.get(circuitId);
      if (lights) {
        const targetIntensity = !isOn
          ? 0
          : circuitId === 'exterior'
            ? isNight
              ? 28
              : 5
            : isNight
              ? 36
              : 9;
        lights.forEach((l) => {
          l.intensity = targetIntensity;
        });
      }

      // Sync physical 3D wall switch rockers & pilot LEDs
      const rockers = this.wallSwitchRockers.get(circuitId);
      if (rockers) {
        rockers.forEach(({ rocker, ledMat }) => {
          rocker.rotation.x = isOn ? -0.24 : 0.24;
          ledMat.color.setHex(isOn ? 0x10b981 : 0xf97316);
          ledMat.emissive.setHex(isOn ? 0x10b981 : 0xf97316);
          ledMat.emissiveIntensity = isNight ? 1.85 : 1.15;
        });
      }
    });

    // 4. Exterior Golden LED Coves & Bollards
    if (this.exteriorCoveLedMat) {
      const extOn = this.lightCircuits.exterior;
      this.exteriorCoveLedMat.emissiveIntensity = extOn ? (isNight ? 2.45 : 1.55) : 0.05;
      this.exteriorCoveLedMat.color.setHex(extOn ? 0xfef3c7 : 0x475569);
    }
  }

  // ==================== PUBLIC CONTROLS ====================

  public setTimeOfDay(mode: TimeOfDayMode): void {
    this.timeOfDay = mode;
    this.applyLightingState();
  }

  public setLightCircuits(state: LightCircuitState): void {
    this.lightCircuits = { ...state };
    this.applyLightingState();
  }

  public setPasBroadcastState(activeZones: ZoneId[], mode: PasBroadcastMode | 'idle'): void {
    this.pasActiveZones = new Set(mode === 'idle' ? [] : activeZones);
    this.pasBroadcastMode = mode;

    const isEmergency = mode === 'emergency';
    const activeColorHex = isEmergency ? 0xef4444 : 0x38bdf8;

    this.pasZoneSpeakers.forEach((handles, zoneId) => {
      const isZoneActive = this.pasActiveZones.has(zoneId);
      handles.forEach((spk) => {
        if (!isZoneActive) {
          spk.waveRing.visible = false;
          spk.waveRing.scale.setScalar(1);
          spk.statusLedMat.color.setHex(0x10b981);
          spk.statusLedMat.emissive.setHex(0x10b981);
          spk.statusLedMat.emissiveIntensity = 0.35;
        } else {
          spk.waveRing.visible = true;
          const waveMat = spk.waveRing.material as THREE.MeshBasicMaterial;
          waveMat.color.setHex(activeColorHex);
          spk.statusLedMat.color.setHex(activeColorHex);
          spk.statusLedMat.emissive.setHex(activeColorHex);
          spk.statusLedMat.emissiveIntensity = 1.65;
        }
      });
    });
  }

  public skipIntro(): void {
    if (!this.introPlaying) return;
    this.introPlaying = false;
    this.callbacks.onIntroStateChange(false);
    this.teleportToZone('lobby');
  }

  public teleportToZone(zoneId: ZoneId): void {
    const zone = ZONE_MAP[zoneId];
    if (!zone) return;
    if (this.introPlaying) {
      this.introPlaying = false;
      this.callbacks.onIntroStateChange(false);
    }
    this.startCameraTransition(zone.cameraPosition, zone.cameraTarget);
    if (this.activeZoneId !== zoneId) {
      this.activeZoneId = zoneId;
      this.callbacks.onZoneChange(zoneId);
    }
  }

  public focusEquipmentSystem(systemId: SystemId): void {
    const sys = EQUIPMENT_SYSTEMS.find((s) => s.id === systemId);
    if (!sys) return;
    if (this.introPlaying) {
      this.introPlaying = false;
      this.callbacks.onIntroStateChange(false);
    }
    this.startCameraTransition(sys.inspectFocusPosition, sys.inspectFocusTarget);
    if (this.activeZoneId !== sys.zoneId) {
      this.activeZoneId = sys.zoneId;
      this.callbacks.onZoneChange(sys.zoneId);
    }
  }

  public setSubsystemLayerFilter(layer: SubsystemLayer | 'ALL'): void {
    this.activeLayerFilter = layer;
    this.equipmentUnits.forEach((unit) => {
      // Dim outer shells slightly when filtering internal subsystems
      unit.outerShellMeshes.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (layer === 'ALL') {
          mat.transparent = false;
          mat.opacity = 1;
        } else {
          mat.transparent = true;
          mat.opacity = 0.22;
        }
        mat.needsUpdate = true;
      });

      unit.subComponents.forEach((sub) => {
        const matches = layer === 'ALL' || sub.subsystemLayer === layer;
        sub.group.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            const std = m as THREE.MeshStandardMaterial;
            if (!std || typeof std.opacity !== 'number') return;
            if (layer === 'ALL') {
              std.transparent = false;
              std.opacity = 1;
              if (std.emissive && !std.emissiveMap && mesh.userData.origEmissiveHex !== undefined) {
                std.emissive.setHex(mesh.userData.origEmissiveHex);
                std.emissiveIntensity = mesh.userData.origEmissiveIntensity ?? 0;
              }
            } else if (matches) {
              std.transparent = false;
              std.opacity = 1;
              if (std.emissive && !std.emissiveMap) {
                if (mesh.userData.origEmissiveHex === undefined) {
                  mesh.userData.origEmissiveHex = std.emissive.getHex();
                  mesh.userData.origEmissiveIntensity = std.emissiveIntensity;
                }
                std.emissive.setHex(0x0284c7);
                std.emissiveIntensity = 0.55;
              }
            } else {
              std.transparent = true;
              std.opacity = 0.16;
              if (std.emissive && !std.emissiveMap && mesh.userData.origEmissiveHex !== undefined) {
                std.emissive.setHex(mesh.userData.origEmissiveHex);
                std.emissiveIntensity = mesh.userData.origEmissiveIntensity ?? 0;
              }
            }
            std.needsUpdate = true;
          });
        });
      });
    });
  }

  private startCameraTransition(pos: { x: number; y: number; z: number }, lookAt?: { x: number; y: number; z: number }): void {
    this.transitionGoalPos.set(pos.x, pos.y, pos.z);
    if (lookAt) {
      const dx = lookAt.x - pos.x;
      const dy = lookAt.y - pos.y;
      const dz = lookAt.z - pos.z;
      const horiz = Math.sqrt(dx * dx + dz * dz);
      this.transitionGoalYaw = Math.atan2(-dx, -dz);
      this.transitionGoalPitch = THREE.MathUtils.clamp(Math.atan2(dy, horiz), -0.65, 0.55);
      this.transitionWithLook = true;
    } else {
      this.transitionWithLook = false;
    }
    this.transitionActive = true;
  }

  // ==================== INPUT & RAYCASTING ====================

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    if (this.introPlaying) return;
    this.isDragging = true;
    this.dragMoved = false;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.transitionActive = false;
  }

  private handlePointerMove(e: PointerEvent): void {
    if (this.disposed) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const insideCanvas =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;

    if (this.isDragging) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.dragMoved = true;
      this.yaw -= dx * 0.0042;
      this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0036, -0.72, 1.15);
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.callbacks.onHoverTelemetry(null);
      return;
    }

    if (!insideCanvas || this.introPlaying) {
      this.floorReticle.visible = false;
      return;
    }

    const now = performance.now();
    if (now - this.lastRaycastMs < 48) return;
    this.lastRaycastMs = now;

    _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(_pointerNdc, this.camera);

    const equipHits = this.raycaster.intersectObjects(this.interactiveRoots, true);
    if (equipHits.length > 0 && equipHits[0].distance < 32) {
      const hitObj = equipHits[0].object;
      this.floorReticle.visible = false;
      this.renderer.domElement.style.cursor = 'pointer';
      if (hitObj.userData.lightSwitchCircuitId) {
        this.callbacks.onHoverTelemetry({
          systemId: 'sys-fids-pas',
          lightSwitchCircuitId: hitObj.userData.lightSwitchCircuitId as LightCircuitId,
          screenX: e.clientX,
          screenY: e.clientY,
        });
        return;
      }
      if (hitObj.userData.isTocConsole) {
        this.callbacks.onHoverTelemetry({
          systemId: 'sys-fids-pas',
          zoneId: 'toc',
          isTocConsole: true,
          screenX: e.clientX,
          screenY: e.clientY,
        });
        return;
      }
      if (hitObj.userData.systemId) {
        this.callbacks.onHoverTelemetry({
          systemId: hitObj.userData.systemId,
          componentId: hitObj.userData.componentId,
          screenX: e.clientX,
          screenY: e.clientY,
        });
        return;
      }
    }

    this.callbacks.onHoverTelemetry(null);

    // Check walkable floor hover for click-to-teleport reticle
    const floorHits = this.raycaster.intersectObject(this.floorMesh, false);
    if (floorHits.length > 0 && floorHits[0].distance < 24) {
      const pt = floorHits[0].point;
      if (this.isWalkablePoint(pt.x, pt.z)) {
        this.floorReticle.position.set(pt.x, 0.03, pt.z);
        this.floorReticle.visible = true;
        this.renderer.domElement.style.cursor = 'pointer';
        return;
      }
    }
    this.floorReticle.visible = false;
    this.renderer.domElement.style.cursor = 'grab';
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    if (this.dragMoved || this.introPlaying) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(_pointerNdc, this.camera);

    // 1. Click 3D wall light switch, equipment unit, or TOC evaluation desk
    const equipHits = this.raycaster.intersectObjects(this.interactiveRoots, true);
    if (equipHits.length > 0 && equipHits[0].distance < 32) {
      const hitObj = equipHits[0].object;
      if (hitObj.userData.lightSwitchCircuitId) {
        this.callbacks.onToggleLightCircuit?.(hitObj.userData.lightSwitchCircuitId as LightCircuitId);
        return;
      }
      if (hitObj.userData.isTocConsole) {
        this.callbacks.onOpenTocModal();
        return;
      }
      if (hitObj.userData.systemId) {
        this.callbacks.onSelectSystem(hitObj.userData.systemId, hitObj.userData.componentId);
        return;
      }
    }

    // 2. Click walkable floor to glide-teleport
    const floorHits = this.raycaster.intersectObject(this.floorMesh, false);
    if (floorHits.length > 0 && floorHits[0].distance < 26) {
      const pt = floorHits[0].point;
      if (this.isWalkablePoint(pt.x, pt.z)) {
        this.startCameraTransition({ x: pt.x, y: 1.75, z: pt.z });
      }
    }
  }

  private handleWheel(e: WheelEvent): void {
    if (this.introPlaying) return;
    e.preventDefault();
    this.transitionActive = false;
    const step = -Math.sign(e.deltaY) * 1.15;
    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const nx = this.camera.position.x + _forward.x * step;
    const nz = this.camera.position.z + _forward.z * step;
    if (this.isWalkablePoint(nx, nz)) {
      this.camera.position.x = nx;
      this.camera.position.z = nz;
      this.detectNearestZone();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    this.keys.add(e.code);
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      this.transitionActive = false;
      if (this.introPlaying) this.skipIntro();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private isWalkablePoint(x: number, z: number): boolean {
    if (x < -21.2 || x > 21.2 || z < -16.8 || z > 30.0) return false;
    for (const box of this.collisionBoxes) {
      if (x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ) {
        return false;
      }
    }
    return true;
  }

  private detectNearestZone(): void {
    let bestZone: ZoneId = this.activeZoneId;
    let bestDistSq = Infinity;
    const px = this.camera.position.x;
    const pz = this.camera.position.z;
    for (const z of AIRPORT_ZONES) {
      const dx = px - z.anchorPosition.x;
      const dz = pz - z.anchorPosition.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        bestZone = z.id;
      }
    }
    if (bestZone !== this.activeZoneId) {
      this.activeZoneId = bestZone;
      this.callbacks.onZoneChange(bestZone);
    }
  }

  // ==================== ANIMATION LOOP ====================

  private tick = (): void => {
    if (this.disposed) return;
    const delta = Math.min(this.clock.getDelta(), 0.08);
    const elapsed = this.clock.getElapsedTime();

    // 1. Update Cinematic Intro or Free-Walk / Smooth Teleport
    if (this.introPlaying) {
      this.introProgress += delta / this.introDuration;
      if (this.introProgress >= 1) {
        this.introPlaying = false;
        this.callbacks.onIntroStateChange(false);
        this.teleportToZone('lobby');
      } else {
        const eased = THREE.MathUtils.smoothstep(this.introProgress, 0, 1);
        this.introPosCurve.getPointAt(eased, _targetPos);
        this.introLookCurve.getPointAt(eased, _targetLook);
        this.camera.position.copy(_targetPos);
        this.camera.lookAt(_targetLook);
        // Sync yaw/pitch so skipping intro is seamless
        this.camera.getWorldDirection(_lookDir);
        this.yaw = Math.atan2(-_lookDir.x, -_lookDir.z);
        this.pitch = Math.asin(THREE.MathUtils.clamp(_lookDir.y, -0.9, 0.9));
      }
    } else {
      if (this.transitionActive) {
        const posLambda = 5.5;
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.transitionGoalPos.x, posLambda, delta);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.transitionGoalPos.y, posLambda, delta);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.transitionGoalPos.z, posLambda, delta);

        if (this.transitionWithLook) {
          // Shortest angular delta for yaw
          let yawDiff = this.transitionGoalYaw - this.yaw;
          while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
          this.yaw += yawDiff * (1 - Math.exp(-posLambda * delta));
          this.pitch = THREE.MathUtils.damp(this.pitch, this.transitionGoalPitch, posLambda, delta);
        }

        if (this.camera.position.distanceToSquared(this.transitionGoalPos) < 0.0025) {
          this.transitionActive = false;
        }
      } else {
        // WASD / Arrow free-walk movement
        const fwd = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
          (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
        const strafe = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
          (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);

        if (fwd !== 0 || strafe !== 0) {
          _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
          _right.crossVectors(_forward, _up).normalize();
          _move.set(0, 0, 0).addScaledVector(_forward, fwd).addScaledVector(_right, strafe);
          if (_move.lengthSq() > 0.001) {
            _move.normalize().multiplyScalar(6.4 * delta);
            const nx = this.camera.position.x + _move.x;
            const nz = this.camera.position.z + _move.z;
            if (this.isWalkablePoint(nx, this.camera.position.z)) this.camera.position.x = nx;
            if (this.isWalkablePoint(this.camera.position.x, nz)) this.camera.position.z = nz;
            this.detectNearestZone();
          }
        }
      }

      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
    }

    // 2. Live Equipment Animations in the Airport
    const xray = this.equipmentUnits.get('sys-xray');
    if (xray?.animatedParts.conveyorBags) {
      for (const bag of xray.animatedParts.conveyorBags) {
        bag.position.x += delta * 0.45;
        if (bag.position.x > 2.2) bag.position.x = -2.45;
      }
    }
    const pids = this.equipmentUnits.get('sys-cctv-pids');
    if (pids?.animatedParts.radarDish) {
      pids.animatedParts.radarDish.rotation.y = elapsed * 1.4;
    }
    if (pids?.animatedParts.ptzHead) {
      pids.animatedParts.ptzHead.rotation.y = Math.sin(elapsed * 0.7) * 0.85;
    }

    // Baggage claim carousel bags orbiting
    for (const bag of this.baggageCarouselBags) {
      const a = (bag.userData.angleOffset || 0) + elapsed * 0.35;
      bag.position.x = Math.cos(a) * 2.02;
      bag.position.z = Math.sin(a) * 2.02;
      bag.rotation.y = -a;
    }

    // Update live Master Clock & FIDS once per second
    const nowSec = Math.floor(elapsed);
    if (nowSec !== this.lastClockTickSec) {
      this.lastClockTickSec = nowSec;
      const d = new Date();
      const fidsUnit = this.equipmentUnits.get('sys-fids-pas');
      fidsUnit?.animatedParts.fidsUpdater?.(d);
      fidsUnit?.animatedParts.clockUpdater?.(d);
    }

    // Animate live 3D PAS acoustic soundwave rings for actively broadcasting terminal zones
    if (this.pasBroadcastMode !== 'idle' && this.pasActiveZones.size > 0) {
      const speed = this.pasBroadcastMode === 'emergency' ? 2.15 : 1.35;
      this.pasActiveZones.forEach((zoneId) => {
        const speakers = this.pasZoneSpeakers.get(zoneId);
        if (!speakers) return;
        for (const spk of speakers) {
          const cycle = (elapsed * speed + spk.phaseOffset) % 1;
          const scale = 1.0 + cycle * 2.15;
          spk.waveRing.scale.setScalar(scale);
          if (spk.direction === 'down') {
            spk.waveRing.position.y = -0.145 - cycle * 0.65;
          } else {
            const baseZ = spk.speakerType === 'horn' ? 0.42 : 0.22;
            spk.waveRing.position.z = baseZ + cycle * 0.72;
          }
          const waveMat = spk.waveRing.material as THREE.MeshBasicMaterial;
          waveMat.opacity = (1 - cycle) * 0.72;
          spk.statusLedMat.emissiveIntensity = 1.15 + Math.sin(elapsed * 9 + spk.phaseOffset) * 0.55;
        }
      });
    }

    // Subtle architectural neon breathing shimmer on the Walk-In ElBan Entrance Gate
    if (this.entranceGate) {
      this.entranceGate.cyanNeonMat.emissiveIntensity = 1.45 + Math.sin(elapsed * 2.2) * 0.22;
      this.entranceGate.amberNeonMat.emissiveIntensity = 1.32 + Math.cos(elapsed * 2.2) * 0.2;
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('pointerup', this.onPointerUpBound);

    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDownBound);
    el.removeEventListener('wheel', this.onWheelBound);
    el.removeEventListener('webglcontextlost', this.onContextLostBound);

    disposeObject3D(this.scene);
    this.renderer.dispose();
    if (el.parentNode) el.parentNode.removeChild(el);
  }
}

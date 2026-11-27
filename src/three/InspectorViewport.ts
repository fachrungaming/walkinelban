import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { InspectViewMode, SystemId } from '../types/elban';
import { buildEquipmentBySystem, BuiltEquipmentUnit, PasInteractiveRig } from './proceduralModels';
import { createAfterDraw, detectSoftwareGl, disposeObject3D } from './webglUtils';

export type PasInteractiveAction =
  | 'ptt'
  | 'ptt-emergency'
  | 'cycle-zone'
  | 'test-column'
  | 'test-ceiling'
  | 'test-horn';

export interface PasInspectorSignalState {
  active: boolean;
  emergency: boolean;
  activeSpeakers: Array<'column' | 'ceiling' | 'horn'>;
  fromPaging: boolean;
}

const _targetVec = new THREE.Vector3();
const _pointer = new THREE.Vector2();
const _dayBgColor = new THREE.Color(0xf1f5f9);
const _nightBgColor = new THREE.Color(0x070d1a);
const _dayGroundColor = new THREE.Color(0xe2e8f0);
const _nightGroundColor = new THREE.Color(0x0f172a);
const _dayHemiSky = new THREE.Color(0xf0f9ff);
const _nightHemiSky = new THREE.Color(0x1e3a5f);
const _dayHemiGround = new THREE.Color(0x94a3b8);
const _nightHemiGround = new THREE.Color(0x020617);

export class InspectorViewportController {
  private container: HTMLElement;
  private onSelectComponent: (componentId: string) => void;
  private onPasAction?: (action: PasInteractiveAction) => void;
  private onOpenDeviceDissection?: (componentId: string) => void;
  private onHoverComponent?: (componentId: string | null, pasAction?: PasInteractiveAction) => void;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private isSoftwareGl: boolean;
  private afterDraw: (cb: () => void) => void;
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;

  private unit!: BuiltEquipmentUnit;
  private leaderLinesGroup = new THREE.Group();
  private leaderLines = new Map<string, THREE.Line>();
  private viewMode: InspectViewMode = 'normal';
  private selectedComponentId: string | null = null;
  private pasSignalState: PasInspectorSignalState = {
    active: false,
    emergency: false,
    activeSpeakers: [],
    fromPaging: false,
  };
  private raycaster = new THREE.Raycaster();
  private pointerDownPos = { x: 0, y: 0 };
  private lastHoverRaycastMs = 0;
  private lastClockTickSec = -1;

  // Day/Night & Interactive Studio Lamp State
  private nightMode = false;
  private lampOn = true;
  private nightBlend = 0;
  private lampBlend = 1;
  private hemiLight!: THREE.HemisphereLight;
  private keyLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private lampSpotLight!: THREE.SpotLight;
  private lampFillPoint!: THREE.PointLight;
  private lampBulbMat!: THREE.MeshStandardMaterial;
  private lampBeamMat!: THREE.MeshBasicMaterial;
  private lampBeamMesh!: THREE.Mesh;
  private groundMat!: THREE.MeshStandardMaterial;
  private dayGrid!: THREE.GridHelper;
  private nightGrid!: THREE.GridHelper;
  private envTexture: THREE.Texture | null = null;

  private onResizeBound: () => void;
  private resizeObserver: ResizeObserver | null = null;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;

  constructor(
    container: HTMLElement,
    systemId: SystemId,
    initialComponentId: string | null,
    onSelectComponent: (componentId: string) => void,
    onPasAction?: (action: PasInteractiveAction) => void,
    onOpenDeviceDissection?: (componentId: string) => void,
    onHoverComponent?: (componentId: string | null, pasAction?: PasInteractiveAction) => void
  ) {
    this.container = container;
    this.onSelectComponent = onSelectComponent;
    this.onPasAction = onPasAction;
    this.onOpenDeviceDissection = onOpenDeviceDissection;
    this.onHoverComponent = onHoverComponent;
    this.selectedComponentId = initialComponentId;
    this.isSoftwareGl = detectSoftwareGl();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9);

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 60);
    this.camera.position.set(3.4, 2.35, 3.8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    container.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    pmrem.dispose();

    this.afterDraw = createAfterDraw(this.renderer, (id) => {
      this.frameId = id;
    }, 80);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 9.5;
    this.controls.maxPolarAngle = Math.PI * 0.52;
    this.controls.target.set(0, 1.15, 0);

    // Three-point studio lighting (dynamically blended between Day & Night)
    this.hemiLight = new THREE.HemisphereLight(0xf0f9ff, 0x94a3b8, 0.95);
    this.scene.add(this.hemiLight);
    this.keyLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
    this.keyLight.position.set(5, 8, 6);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.bias = -0.0005;
    }
    this.scene.add(this.keyLight);
    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    this.rimLight.position.set(-6, 5, -5);
    this.scene.add(this.rimLight);

    // Physical 3D Overhead Inspection Lamp Fixture + Switchable SpotLight & Beam Cone
    const lampGroup = new THREE.Group();
    lampGroup.position.set(0, 3.45, 0.25);
    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.82 });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 12), fixtureMat);
    rod.position.y = 0.52;
    lampGroup.add(rod);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.34, 0.22, 28, 1, false), fixtureMat);
    shade.position.y = 0.02;
    lampGroup.add(shade);
    this.lampBulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff8dc,
      emissive: 0xffdf8e,
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.05,
    });
    const bulbDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 28), this.lampBulbMat);
    bulbDisc.position.y = -0.085;
    lampGroup.add(bulbDisc);

    this.lampBeamMat = new THREE.MeshBasicMaterial({
      color: 0xffe8a3,
      transparent: true,
      opacity: 0.02,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.lampBeamMesh = new THREE.Mesh(new THREE.ConeGeometry(1.85, 3.2, 28, 1, true), this.lampBeamMat);
    this.lampBeamMesh.position.y = -1.72;
    this.lampBeamMesh.userData.isWaveEffect = true;
    lampGroup.add(this.lampBeamMesh);
    this.scene.add(lampGroup);

    this.lampSpotLight = new THREE.SpotLight(0xfff1c9, 2.0, 14, Math.PI / 2.7, 0.72, 1.35);
    this.lampSpotLight.position.set(0, 3.35, 0.25);
    this.lampSpotLight.target.position.set(0, 0.9, 0);
    if (!this.isSoftwareGl) {
      this.lampSpotLight.castShadow = true;
      this.lampSpotLight.shadow.mapSize.set(1024, 1024);
      this.lampSpotLight.shadow.bias = -0.0005;
    }
    this.scene.add(this.lampSpotLight);
    this.scene.add(this.lampSpotLight.target);

    this.lampFillPoint = new THREE.PointLight(0xffeec2, 0.9, 9.5, 1.5);
    this.lampFillPoint.position.set(0, 2.75, 0.85);
    this.scene.add(this.lampFillPoint);

    // Subtle engineering studio turntable grid + contact grounding plane
    this.groundMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.74, metalness: 0.08 });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(4.6, 48), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.dayGrid = new THREE.GridHelper(7.5, 15, 0x94a3b8, 0xcbd5e1);
    this.dayGrid.position.y = 0.008;
    this.scene.add(this.dayGrid);

    this.nightGrid = new THREE.GridHelper(7.5, 15, 0x38bdf8, 0x1e293b);
    this.nightGrid.position.y = 0.008;
    this.nightGrid.visible = false;
    this.scene.add(this.nightGrid);

    // Build centered standalone hero equipment model for this system
    this.unit = buildEquipmentBySystem(systemId, this.renderer.capabilities.getMaxAnisotropy());
    this.scene.add(this.unit.root);

    // Build dynamic 3D leader lines for Exploded View
    this.scene.add(this.leaderLinesGroup);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.7 });
    for (const sub of this.unit.subComponents) {
      const geo = new THREE.BufferGeometry().setFromPoints([sub.basePos.clone(), sub.basePos.clone()]);
      const line = new THREE.Line(geo, lineMat);
      this.leaderLines.set(sub.componentId, line);
      this.leaderLinesGroup.add(line);
    }

    // Center orbit target cleanly from the standalone unit's bounding box
    const box = new THREE.Box3().setFromObject(this.unit.root);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1.8);
    if (systemId === 'sys-bids') {
      this.controls.target.set(0, 1.4, 0);
      this.camera.position.set(0.75, 1.62, 2.25);
    } else if (systemId === 'sys-fids-pas') {
      this.controls.target.set(0, 1.25, 0);
      this.camera.position.set(1.1, 1.65, 2.65);
    } else if (systemId === 'sys-pas') {
      // Wide-angle hero view framing Horn, BOSCH 42U Rack + Column, Paging Call Station PTT & Ceiling Speaker + all cables
      this.controls.target.set(0, 1.18, 0);
      this.camera.position.set(0.55, 1.88, 3.85);
    } else {
      this.controls.target.set(center.x, Math.max(0.95, center.y), center.z);
      this.camera.position.set(center.x + maxDim * 1.15, center.y + maxDim * 0.55, center.z + maxDim * 1.25);
    }
    this.controls.update();

    this.applyVisualState();

    this.onResizeBound = this.handleResize.bind(this);
    this.onPointerDownBound = (e: PointerEvent) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    };
    this.onPointerMoveBound = this.handlePointerMove.bind(this);
    this.onPointerUpBound = this.handlePointerUp.bind(this);

    window.addEventListener('resize', this.onResizeBound);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    }
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDownBound);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMoveBound);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUpBound);

    this.tick();
  }

  public setViewMode(mode: InspectViewMode): void {
    this.viewMode = mode;
    this.applyVisualState();
  }

  public setSelectedComponent(componentId: string | null): void {
    this.selectedComponentId = componentId;
    this.applyVisualState();
  }

  public setPasSignalState(state: PasInspectorSignalState): void {
    this.pasSignalState = state;
  }

  public setLightingState(nightMode: boolean, lampOn: boolean): void {
    this.nightMode = nightMode;
    this.lampOn = lampOn;
    this.dayGrid.visible = !nightMode;
    this.nightGrid.visible = nightMode;
  }

  private applyVisualState(): void {
    const isXRay = this.viewMode === 'xray';
    const isExploded = this.viewMode === 'exploded';

    // Outer casing translucency in X-Ray mode or subtle fade in Exploded mode
    for (const mesh of this.unit.outerShellMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (isXRay) {
        mat.transparent = true;
        mat.opacity = 0.2;
        mat.depthWrite = false;
      } else if (isExploded) {
        mat.transparent = true;
        mat.opacity = 0.48;
        mat.depthWrite = true;
      } else {
        mat.transparent = false;
        mat.opacity = 1;
        mat.depthWrite = true;
      }
      mat.needsUpdate = true;
    }

    // Highlight selected sub-component cleanly
    for (const sub of this.unit.subComponents) {
      const isSelected = sub.componentId === this.selectedComponentId;
      sub.group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh || mesh.userData.isWaveEffect) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          const std = m as THREE.MeshStandardMaterial;
          if (!std || !std.emissive || std.emissiveMap) return;
          if (mesh.userData.origEmissive === undefined) {
            mesh.userData.origEmissive = std.emissive.getHex();
            mesh.userData.origEmissiveIntensity = std.emissiveIntensity;
          }
          if (isSelected) {
            std.emissive.setHex(0x0284c7);
            std.emissiveIntensity = 0.45;
          } else {
            std.emissive.setHex(mesh.userData.origEmissive);
            std.emissiveIntensity = mesh.userData.origEmissiveIntensity;
          }
        });
      });
    }

    this.leaderLinesGroup.visible = isExploded;
  }

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private handlePointerMove(e: PointerEvent): void {
    const now = performance.now();
    if (now - this.lastHoverRaycastMs < 45) return;
    this.lastHoverRaycastMs = now;

    const rect = this.renderer.domElement.getBoundingClientRect();
    _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(_pointer, this.camera);
    const hits = this.raycaster.intersectObjects(
      this.unit.subComponents.map((s) => s.group),
      true
    );
    const hit = hits.find((h) => !h.object.userData.isWaveEffect);
    if (!hit) {
      this.renderer.domElement.style.cursor = 'grab';
      this.onHoverComponent?.(null, undefined);
      return;
    }

    let compId: string | undefined;
    let pasAction: PasInteractiveAction | undefined;
    let cur: THREE.Object3D | null = hit.object;
    while (cur) {
      if (!pasAction && cur.userData.pasInteractiveAction) {
        pasAction = cur.userData.pasInteractiveAction as PasInteractiveAction;
      }
      if (!compId && cur.userData.componentId) {
        compId = cur.userData.componentId as string;
      }
      cur = cur.parent;
    }

    const interactive = Boolean(compId || pasAction);
    this.renderer.domElement.style.cursor = interactive ? 'pointer' : 'grab';
    this.onHoverComponent?.(compId ?? null, pasAction);
  }

  private handlePointerUp(e: PointerEvent): void {
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (dist > 6) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(_pointer, this.camera);
    const hits = this.raycaster.intersectObjects(
      this.unit.subComponents.map((s) => s.group),
      true
    );
    const hit = hits.find((h) => !h.object.userData.isWaveEffect);
    if (!hit) return;

    // Walk up object hierarchy to read componentId & pasInteractiveAction
    let compId: string | undefined;
    let pasAction: PasInteractiveAction | undefined;
    let cur: THREE.Object3D | null = hit.object;
    while (cur) {
      if (!pasAction && cur.userData.pasInteractiveAction) {
        pasAction = cur.userData.pasInteractiveAction as PasInteractiveAction;
      }
      if (!compId && cur.userData.componentId) {
        compId = cur.userData.componentId as string;
      }
      cur = cur.parent;
    }

    if (compId) {
      this.onSelectComponent(compId);
    }

    // Direct Paging PTT / Emergency / Zone keypad presses stay on the live PAS stage
    if (pasAction === 'ptt' || pasAction === 'ptt-emergency' || pasAction === 'cycle-zone') {
      this.onPasAction?.(pasAction);
      return;
    }

    // Clicking any 3D device opens its dedicated Component Dissection Digital Twin
    if (pasAction) {
      this.onPasAction?.(pasAction);
    }
    if (compId) {
      this.onOpenDeviceDissection?.(compId);
    }
  }

  private animatePasRig(rig: PasInteractiveRig, elapsed: number, delta: number): void {
    const { active, emergency, activeSpeakers, fromPaging } = this.pasSignalState;
    const activeSet = new Set(activeSpeakers);

    // 1. Physical 3D PTT Button Depression + Glow Ring + Gooseneck Mic On-Air Collar LED
    const pttPressed = active && fromPaging;
    const targetPttZ = pttPressed ? rig.pttRestZ - 0.0045 : rig.pttRestZ;
    rig.pttCap.position.z = THREE.MathUtils.damp(rig.pttCap.position.z, targetPttZ, 16, delta);

    if (pttPressed) {
      const pulse = 1.15 + Math.sin(elapsed * 10) * 0.45;
      const glowHex = emergency ? 0xef4444 : 0x10b981;
      rig.pttGlowRingMat.color.setHex(glowHex);
      rig.pttGlowRingMat.emissive.setHex(glowHex);
      rig.pttGlowRingMat.emissiveIntensity = pulse;
      rig.micActiveLedMat.color.setHex(glowHex);
      rig.micActiveLedMat.emissive.setHex(glowHex);
      rig.micActiveLedMat.emissiveIntensity = pulse * 1.15;
    } else {
      const idlePulse = 0.42 + Math.sin(elapsed * 2.8) * 0.2;
      rig.pttGlowRingMat.color.setHex(0x38bdf8);
      rig.pttGlowRingMat.emissive.setHex(0x0284c7);
      rig.pttGlowRingMat.emissiveIntensity = idlePulse;
      rig.micActiveLedMat.color.setHex(0x38bdf8);
      rig.micActiveLedMat.emissive.setHex(0x0284c7);
      rig.micActiveLedMat.emissiveIntensity = 0.22;
    }

    // 2. BOSCH 42U Rack Internal Module Cascade (Controller -> OMNEO Switch -> 11x Power Amps)
    rig.rackPulseMats.forEach((mat, idx) => {
      if (active) {
        const wave = 0.55 + 0.45 * Math.sin(elapsed * 9.5 - idx * 0.85);
        const col = emergency ? 0xef4444 : idx < 2 ? 0x38bdf8 : 0x34d399;
        mat.color.setHex(col);
        mat.emissive.setHex(col);
        mat.emissiveIntensity = 0.45 + wave * 1.25;
      } else {
        const col = idx < 2 ? 0x38bdf8 : 0x34d399;
        mat.color.setHex(col);
        mat.emissive.setHex(col);
        mat.emissiveIntensity = 0.2;
      }
    });

    // 3. Visible Animated Data-Flow Orbs Traveling Along Every Cable (Paging -> Rack -> Column/Ceiling/Horn)
    for (const stream of rig.streams) {
      let streamActive = false;
      if (active) {
        if (stream.stage === 'omneo') streamActive = fromPaging;
        else if (stream.stage === 'rack') streamActive = true;
        else streamActive = activeSet.has(stream.stage);
      }

      const speed = streamActive ? (emergency ? 0.88 : 0.62) : 0.14;
      const packetColor = streamActive ? (emergency ? 0xef4444 : stream.activeColor) : stream.baseColor;
      stream.cableMat.emissive.setHex(streamActive ? packetColor : stream.baseColor);
      stream.cableMat.emissiveIntensity = streamActive ? 0.82 : 0.16;

      const count = stream.packets.length;
      for (let i = 0; i < count; i++) {
        const orb = stream.packets[i];
        const t = (elapsed * speed + i / count) % 1;
        orb.position.copy(stream.curve.getPoint(t));
        const orbScale = streamActive ? 1.15 + Math.sin(elapsed * 12 + i) * 0.2 : 0.58;
        orb.scale.setScalar(orbScale);
        const pMat = orb.material as THREE.MeshBasicMaterial;
        pMat.color.setHex(packetColor);
        pMat.opacity = streamActive ? 0.98 : 0.42;
      }
    }

    // 4. Multi-Ring 3D Acoustic Soundwaves Radiating From Active Speakers (Column, Ceiling, Horn)
    for (const spkSet of rig.speakers) {
      const isSpkActive = active && activeSet.has(spkSet.id);
      const allRings = [spkSet.handle.waveRing, ...spkSet.extraWaveRings];
      const waveHex = emergency ? 0xef4444 : spkSet.id === 'horn' ? 0xf59e0b : 0x38bdf8;

      if (isSpkActive) {
        spkSet.handle.statusLedMat.color.setHex(waveHex);
        spkSet.handle.statusLedMat.emissive.setHex(waveHex);
        spkSet.handle.statusLedMat.emissiveIntensity = 1.65;

        const waveSpeed = emergency ? 2.15 : 1.35;
        allRings.forEach((ring, idx) => {
          ring.visible = true;
          const cycle = (elapsed * waveSpeed + idx / allRings.length) % 1;
          ring.scale.setScalar(0.85 + cycle * 2.55);
          if (spkSet.handle.direction === 'down') {
            ring.position.y = -0.14 - cycle * 0.88;
          } else {
            const baseZ = spkSet.handle.speakerType === 'horn' ? 0.42 : 0.22;
            ring.position.z = baseZ + cycle * 0.85;
          }
          const rMat = ring.material as THREE.MeshBasicMaterial;
          rMat.color.setHex(waveHex);
          rMat.opacity = (1 - cycle) * 0.82;
        });
      } else {
        spkSet.handle.statusLedMat.color.setHex(0x10b981);
        spkSet.handle.statusLedMat.emissive.setHex(0x10b981);
        spkSet.handle.statusLedMat.emissiveIntensity = 0.35;
        allRings.forEach((ring) => {
          ring.visible = false;
        });
      }
    }
  }

  private tick = (): void => {
    if (this.disposed) return;
    const delta = Math.min(this.clock.getDelta(), 0.08);
    const elapsed = this.clock.getElapsedTime();

    const explodeFactor = this.viewMode === 'exploded' ? 1 : 0;

    // Smooth exponential damping for exploded-view part separation
    for (const sub of this.unit.subComponents) {
      _targetVec.copy(sub.basePos).addScaledVector(sub.explodedOffset, explodeFactor);
      sub.group.position.x = THREE.MathUtils.damp(sub.group.position.x, _targetVec.x, 7, delta);
      sub.group.position.y = THREE.MathUtils.damp(sub.group.position.y, _targetVec.y, 7, delta);
      sub.group.position.z = THREE.MathUtils.damp(sub.group.position.z, _targetVec.z, 7, delta);

      if (this.leaderLinesGroup.visible) {
        const line = this.leaderLines.get(sub.componentId);
        if (line) {
          const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
          posAttr.setXYZ(0, sub.basePos.x, sub.basePos.y, sub.basePos.z);
          posAttr.setXYZ(1, sub.group.position.x, sub.group.position.y, sub.group.position.z);
          posAttr.needsUpdate = true;
        }
      }
    }

    // Subtle live animations inside inspector
    if (this.unit.animatedParts.radarDish) {
      this.unit.animatedParts.radarDish.rotation.y = elapsed * 1.4;
    }
    if (this.unit.animatedParts.ptzHead) {
      this.unit.animatedParts.ptzHead.rotation.y = Math.sin(elapsed * 0.9) * 0.6;
    }
    if (this.unit.animatedParts.conveyorBags) {
      for (const bag of this.unit.animatedParts.conveyorBags) {
        bag.position.x = Math.sin(elapsed * 0.65) * 0.95;
      }
    }
    if (this.unit.animatedParts.pasRig) {
      this.animatePasRig(this.unit.animatedParts.pasRig, elapsed, delta);
    }

    // Update live FIDS / Master Clock / BIDS textures once per second inside Inspector
    const nowSec = Math.floor(elapsed);
    if (nowSec !== this.lastClockTickSec) {
      this.lastClockTickSec = nowSec;
      const d = new Date();
      this.unit.animatedParts.fidsUpdater?.(d);
      this.unit.animatedParts.clockUpdater?.(d);
      this.unit.animatedParts.bidsUpdater?.(d);
    }

    // Smooth Day/Night & Studio Lamp Switch Transitions
    this.nightBlend = THREE.MathUtils.damp(this.nightBlend, this.nightMode ? 1 : 0, 7.5, delta);
    this.lampBlend = THREE.MathUtils.damp(this.lampBlend, this.lampOn ? 1 : 0, 12, delta);

    const bg = this.scene.background as THREE.Color;
    bg.lerpColors(_dayBgColor, _nightBgColor, this.nightBlend);
    this.groundMat.color.lerpColors(_dayGroundColor, _nightGroundColor, this.nightBlend);
    this.hemiLight.color.lerpColors(_dayHemiSky, _nightHemiSky, this.nightBlend);
    this.hemiLight.groundColor.lerpColors(_dayHemiGround, _nightHemiGround, this.nightBlend);

    const dayFactor = 1 - this.nightBlend;
    this.hemiLight.intensity = 0.14 + dayFactor * 0.8 + this.lampBlend * (0.14 + this.nightBlend * 0.08);
    this.keyLight.intensity = 0.1 + dayFactor * 1.25;
    this.rimLight.intensity = 0.34 + dayFactor * 0.25;
    this.scene.environmentIntensity = 0.14 + dayFactor * 0.86 + this.lampBlend * this.nightBlend * 0.22;

    this.lampSpotLight.intensity = this.lampBlend * (2.0 + this.nightBlend * 5.2);
    this.lampFillPoint.intensity = this.lampBlend * (0.85 + this.nightBlend * 2.2);
    this.lampBulbMat.emissiveIntensity = this.lampBlend * (2.2 + this.nightBlend * 0.9);
    this.lampBulbMat.color.setHex(this.lampBlend > 0.15 ? 0xfff8dc : 0x475569);
    const beamOpacity = this.lampBlend * (0.015 + this.nightBlend * 0.095);
    this.lampBeamMat.opacity = beamOpacity;
    this.lampBeamMesh.visible = beamOpacity > 0.004;

    this.controls.update();
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
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDownBound);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMoveBound);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUpBound);
    this.controls.dispose();
    this.envTexture?.dispose();
    disposeObject3D(this.scene);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

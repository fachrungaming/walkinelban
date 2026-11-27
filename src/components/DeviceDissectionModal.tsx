import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Eye,
  HelpCircle,
  Layers,
  Lightbulb,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sliders,
  Sun,
  Thermometer,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { COMPONENT_MAP } from '../data/curriculum';
import {
  computeDeviceDissectionTelemetry,
  DEFAULT_DISSECTION_SIM_PARAMS,
  DissectionCameraPresetId,
  DissectionSimParams,
  DissectionVisualMode,
  getDeviceDissectionBlueprint,
} from '../data/deviceDissectionData';
import {
  applyDissectionRuntimeVisuals,
  BuiltDissectionModel,
  createDissectionSceneModel,
} from '../three/deviceDissection3D';
import { createAfterDraw, detectSoftwareGl } from '../three/webglUtils';
import { Language } from '../types/elban';
import { playSpeakerTestTone, playTone } from '../utils/audioSynth';

interface DeviceDissectionModalProps {
  componentId: string;
  lang: Language;
  loggedComponentIds: string[];
  onLogComponent: (componentId: string) => void;
  onClose: () => void;
  initialNightMode?: boolean;
  initialLampOn?: boolean;
}

type DissectionRightTab = 'inspector' | 'quiz' | 'schema';

const _dissectDayBg = new THREE.Color(0xeef2f6);
const _dissectNightBg = new THREE.Color(0x060b16);
const _dissectDayFloor = new THREE.Color(0xdbe4ef);
const _dissectNightFloor = new THREE.Color(0x0d1526);
const _dissectDaySky = new THREE.Color(0xf0f9ff);
const _dissectNightSky = new THREE.Color(0x1e3a5f);
const _dissectDayGround = new THREE.Color(0x94a3b8);
const _dissectNightGround = new THREE.Color(0x020617);

export const DeviceDissectionModal: React.FC<DeviceDissectionModalProps> = ({
  componentId,
  lang,
  loggedComponentIds,
  onLogComponent,
  onClose,
  initialNightMode = true,
  initialLampOn = true,
}) => {
  const blueprint = useMemo(() => getDeviceDissectionBlueprint(componentId), [componentId]);
  const curriculumComp = COMPONENT_MAP[componentId];
  const isLogged = loggedComponentIds.includes(componentId);

  const initialSimParams = useMemo<DissectionSimParams>(
    () => ({
      ...DEFAULT_DISSECTION_SIM_PARAMS,
      explodedFactor:
        blueprint.modelKind === 'pas_ceiling'
          ? 0.65
          : blueprint.modelKind === 'pas_column'
            ? 0
            : DEFAULT_DISSECTION_SIM_PARAMS.explodedFactor,
    }),
    [blueprint.modelKind]
  );

  const [activeTab, setActiveTab] = useState<DissectionRightTab>('inspector');
  const [selectedPartId, setSelectedPartId] = useState<string>(blueprint.parts[0].id);
  const [highlightedPartId, setHighlightedPartId] = useState<string | null>(null);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [simParams, setSimParams] = useState<DissectionSimParams>(initialSimParams);
  const [activeFaultIds, setActiveFaultIds] = useState<string[]>([]);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [nightMode, setNightMode] = useState(initialNightMode);
  const [lampOn, setLampOn] = useState(initialLampOn);
  const [activeCameraPreset, setActiveCameraPreset] = useState<DissectionCameraPresetId>('isometric');
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [minimizedSections, setMinimizedSections] = useState<Record<string, boolean>>({
    telemetryBar: true,
  });

  const toggleSection = useCallback((sectionKey: string) => {
    setMinimizedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  }, []);

  const isSectionMinimized = useCallback(
    (sectionKey: string) => Boolean(minimizedSections[sectionKey]),
    [minimizedSections]
  );

  // Reset local state when switching componentId
  useEffect(() => {
    setSelectedPartId(blueprint.parts[0].id);
    setHighlightedPartId(null);
    setSimParams(initialSimParams);
    setActiveFaultIds([]);
    setActiveCameraPreset('isometric');
    setQuizAnswers({});
    setToolbarOpen(false);
    setRightPanelOpen(false);
    setMinimizedSections({ telemetryBar: true });
  }, [blueprint, initialSimParams]);

  const telemetryMap = useMemo(
    () => computeDeviceDissectionTelemetry(blueprint, simParams, activeFaultIds),
    [blueprint, simParams, activeFaultIds]
  );

  const signalBlocked = useMemo(
    () => blueprint.faults.some((f) => activeFaultIds.includes(f.id) && f.signalBlocked),
    [blueprint, activeFaultIds]
  );

  const selectedTelemetry = telemetryMap[selectedPartId] ?? telemetryMap[blueprint.parts[0].id];
  const selectedPart = selectedTelemetry.part;
  const activeFaultCount = activeFaultIds.length;

  // Refs for WebGL loop
  const viewportRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<BuiltDissectionModel | null>(null);
  const dayGridRef = useRef<THREE.GridHelper | null>(null);
  const nightGridRef = useRef<THREE.GridHelper | null>(null);
  const simParamsRef = useRef(simParams);
  const telemetryMapRef = useRef(telemetryMap);
  const selectedPartIdRef = useRef(selectedPartId);
  const highlightedPartIdRef = useRef<string | null>(highlightedPartId);
  const hoveredPartIdRef = useRef(hoveredPartId);
  const signalBlockedRef = useRef(signalBlocked);
  const nightModeRef = useRef(nightMode);
  const lampOnRef = useRef(lampOn);
  const audioBoostUntilRef = useRef<number>(0);
  const audioBoostLevelRef = useRef<number>(0);
  const camTransitionRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: false,
    pos: new THREE.Vector3(...blueprint.cameraPresets.isometric.pos),
    target: new THREE.Vector3(...blueprint.cameraPresets.isometric.target),
  });

  simParamsRef.current = simParams;
  telemetryMapRef.current = telemetryMap;
  selectedPartIdRef.current = selectedPartId;
  highlightedPartIdRef.current = highlightedPartId;
  hoveredPartIdRef.current = hoveredPartId;
  signalBlockedRef.current = signalBlocked;
  nightModeRef.current = nightMode;
  lampOnRef.current = lampOn;

  // Timelapse Assembly ticker
  useEffect(() => {
    if (!simParams.isAssembling) return;
    const id = window.setInterval(() => {
      setSimParams((prev) => {
        if (!prev.isAssembling) return prev;
        const next = Math.min(1, prev.assemblyProgress + 0.015);
        return {
          ...prev,
          assemblyProgress: next,
          isAssembling: next < 1,
        };
      });
    }, 30);
    return () => window.clearInterval(id);
  }, [simParams.isAssembling]);

  // Toggle grid visibility (matching Day / Night)
  useEffect(() => {
    if (dayGridRef.current) {
      dayGridRef.current.visible = showGrid && !nightMode;
    }
    if (nightGridRef.current) {
      nightGridRef.current.visible = showGrid && nightMode;
    }
  }, [showGrid, nightMode]);

  const handleCameraPreset = useCallback(
    (presetId: DissectionCameraPresetId) => {
      const p = blueprint.cameraPresets[presetId];
      if (!p) return;
      setActiveCameraPreset(presetId);
      camTransitionRef.current = {
        active: true,
        pos: new THREE.Vector3(...p.pos),
        target: new THREE.Vector3(...p.target),
      };
    },
    [blueprint]
  );

  const handleSelectPart = useCallback(
    (partId: string, focusCam = true) => {
      const part = blueprint.parts.find((p) => p.id === partId);
      if (!part) return;
      setSelectedPartId(partId);
      setHighlightedPartId(partId);
      playTone(680, 0.045, 'sine', 0.035);
      if (focusCam) {
        const exp = simParamsRef.current.explodedFactor;
        camTransitionRef.current = {
          active: true,
          pos: new THREE.Vector3(
            part.focusCamera[0] + part.explodeOffset[0] * exp * 0.55,
            part.focusCamera[1] + part.explodeOffset[1] * exp * 0.55,
            part.focusCamera[2] + part.explodeOffset[2] * exp * 0.55
          ),
          target: new THREE.Vector3(
            part.focusTarget[0] + part.explodeOffset[0] * exp * 0.75,
            part.focusTarget[1] + part.explodeOffset[1] * exp * 0.75,
            part.focusTarget[2] + part.explodeOffset[2] * exp * 0.75
          ),
        };
      }
    },
    [blueprint]
  );

  const handleToggleFault = useCallback(
    (faultId: string, firstAffectedPartId?: string) => {
      setActiveFaultIds((prev) => {
        const exists = prev.includes(faultId);
        const next = exists ? prev.filter((id) => id !== faultId) : [...prev, faultId];
        playTone(exists ? 620 : 280, 0.08, exists ? 'sine' : 'sawtooth', 0.05);
        return next;
      });
      if (firstAffectedPartId) {
        handleSelectPart(firstAffectedPartId, true);
      }
    },
    [handleSelectPart]
  );

  const handleResetSimulation = useCallback(() => {
    setSimParams(initialSimParams);
    setActiveFaultIds([]);
    setSelectedPartId(blueprint.parts[0].id);
    setHighlightedPartId(null);
    setMinimizedSections({ telemetryBar: true });
    setRightPanelOpen(false);
    setToolbarOpen(false);
    handleCameraPreset('isometric');
    playTone(540, 0.06, 'sine', 0.04);
  }, [blueprint, handleCameraPreset, initialSimParams]);

  // Keyboard shortcuts 1..6 + Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < blueprint.parts.length) {
        handleSelectPart(blueprint.parts[idx].id, true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [blueprint, handleSelectPart, onClose]);

  // Mount dedicated 3D Dissection WebGL Viewport
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    const scene = new THREE.Scene();
    const bgCol = new THREE.Color(nightModeRef.current ? 0x060b16 : 0xeef2f6);
    scene.background = bgCol;
    const fog = new THREE.FogExp2(bgCol.getHex(), 0.055);
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 50);
    camera.position.set(...blueprint.cameraPresets.isometric.pos);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 0.75;
    controls.maxDistance = 6.5;
    controls.target.set(...blueprint.cameraPresets.isometric.target);
    controls.update();

    const cancelTransition = () => {
      camTransitionRef.current.active = false;
    };
    controls.addEventListener('start', cancelTransition);

    // Three-point engineering studio lighting (blends smoothly between Day & Night)
    const hemi = new THREE.HemisphereLight(0xf0f9ff, 0x94a3b8, 0.95);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
    keyLight.position.set(4.5, 7, 5);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xf8fafc, 0.52);
    rimLight.position.set(-5, 4, -4.5);
    scene.add(rimLight);

    // Physical 3D Overhead Inspection Lamp Fixture + Switchable SpotLight & Beam Cone
    const lampGroup = new THREE.Group();
    lampGroup.position.set(0, 2.68, 0.12);
    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.82 });
    const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.75, 12);
    const rod = new THREE.Mesh(rodGeo, fixtureMat);
    rod.position.y = 0.44;
    lampGroup.add(rod);
    const shadeGeo = new THREE.CylinderGeometry(0.09, 0.28, 0.18, 28);
    const shade = new THREE.Mesh(shadeGeo, fixtureMat);
    shade.position.y = 0.02;
    lampGroup.add(shade);
    const lampBulbGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.025, 28);
    const lampBulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff8dc,
      emissive: 0xffdf8e,
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.05,
    });
    const bulbDisc = new THREE.Mesh(lampBulbGeo, lampBulbMat);
    bulbDisc.position.y = -0.07;
    lampGroup.add(bulbDisc);

    const lampBeamGeo = new THREE.ConeGeometry(1.45, 2.45, 28, 1, true);
    const lampBeamMat = new THREE.MeshBasicMaterial({
      color: 0xffe8a3,
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const lampBeamMesh = new THREE.Mesh(lampBeamGeo, lampBeamMat);
    lampBeamMesh.position.y = -1.3;
    lampBeamMesh.userData.isSignalEffect = true;
    lampGroup.add(lampBeamMesh);
    scene.add(lampGroup);

    const lampSpot = new THREE.SpotLight(0xfff1c9, 2.2, 12, Math.PI / 2.6, 0.7, 1.35);
    lampSpot.position.set(0, 2.6, 0.12);
    lampSpot.target.position.set(0, 0.65, 0);
    if (!isSoftwareGl) {
      lampSpot.castShadow = true;
      lampSpot.shadow.mapSize.set(1024, 1024);
      lampSpot.shadow.bias = -0.0005;
    }
    scene.add(lampSpot);
    scene.add(lampSpot.target);

    const lampFill = new THREE.PointLight(0xffeec2, 1.0, 8, 1.5);
    lampFill.position.set(0, 2.15, 0.65);
    scene.add(lampFill);

    // Studio grounding platform + Day/Night engineering grids
    const floorGeo = new THREE.CircleGeometry(4.2, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: nightModeRef.current ? 0x0d1526 : 0xdbe4ef,
      roughness: 0.78,
      metalness: 0.14,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    const dayGrid = new THREE.GridHelper(6, 24, 0x94a3b8, 0xcbd5e1);
    dayGrid.position.y = 0.001;
    dayGrid.visible = showGrid && !nightModeRef.current;
    scene.add(dayGrid);
    dayGridRef.current = dayGrid;

    const nightGrid = new THREE.GridHelper(6, 24, 0x38bdf8, 0x1e293b);
    nightGrid.position.y = 0.001;
    nightGrid.visible = showGrid && nightModeRef.current;
    scene.add(nightGrid);
    nightGridRef.current = nightGrid;

    // Build bespoke 3D dissection model
    const model = createDissectionSceneModel(blueprint, renderer.capabilities.getMaxAnisotropy());
    scene.add(model.root);
    modelRef.current = model;

    // Raycasting for click & hover on internal parts
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverCheck = 0;

    const pickPart = (clientX: number, clientY: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(model.root.children, true);
      for (const hit of hits) {
        if (hit.object.userData.isSignalEffect) continue;
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (obj.userData.dissectionPartId) {
            return obj.userData.dissectionPartId as string;
          }
          obj = obj.parent;
        }
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 45) return;
      lastHoverCheck = now;
      const pid = pickPart(e.clientX, e.clientY);
      setHoveredPartId(pid);
      renderer.domElement.style.cursor = pid ? 'pointer' : 'grab';
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moved > 6) return;
      const pid = pickPart(e.clientX, e.clientY);
      if (pid) {
        handleSelectPart(pid, true);
      } else {
        setHighlightedPartId(null);
      }
    };

    const onPointerLeave = () => {
      setHoveredPartId(null);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    const afterDraw = createAfterDraw(renderer, (id) => {
      frameId = id;
    }, 80);

    let nightBlend = nightModeRef.current ? 1 : 0;
    let lampBlend = lampOnRef.current ? 1 : 0;

    const animate = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      if (camTransitionRef.current.active) {
        const lambda = 7.5;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, camTransitionRef.current.pos.x, lambda, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, camTransitionRef.current.pos.y, lambda, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, camTransitionRef.current.pos.z, lambda, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, camTransitionRef.current.target.x, lambda, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, camTransitionRef.current.target.y, lambda, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, camTransitionRef.current.target.z, lambda, delta);
        if (
          camera.position.distanceToSquared(camTransitionRef.current.pos) < 0.0008 &&
          controls.target.distanceToSquared(camTransitionRef.current.target) < 0.0008
        ) {
          camTransitionRef.current.active = false;
        }
      }

      // Smooth Day/Night & Studio Lamp Switch Transitions
      nightBlend = THREE.MathUtils.damp(nightBlend, nightModeRef.current ? 1 : 0, 7.5, delta);
      lampBlend = THREE.MathUtils.damp(lampBlend, lampOnRef.current ? 1 : 0, 12, delta);
      const dayFactor = 1 - nightBlend;

      bgCol.lerpColors(_dissectDayBg, _dissectNightBg, nightBlend);
      fog.color.copy(bgCol);
      floorMat.color.lerpColors(_dissectDayFloor, _dissectNightFloor, nightBlend);
      hemi.color.lerpColors(_dissectDaySky, _dissectNightSky, nightBlend);
      hemi.groundColor.lerpColors(_dissectDayGround, _dissectNightGround, nightBlend);

      hemi.intensity = 0.14 + dayFactor * 0.8 + lampBlend * (0.14 + nightBlend * 0.1);
      keyLight.intensity = 0.1 + dayFactor * 1.25;
      rimLight.intensity = 0.36 + dayFactor * 0.25;
      scene.environmentIntensity = 0.14 + dayFactor * 0.86 + lampBlend * nightBlend * 0.22;

      lampSpot.intensity = lampBlend * (2.0 + nightBlend * 5.2);
      lampFill.intensity = lampBlend * (0.9 + nightBlend * 2.3);
      lampBulbMat.emissiveIntensity = lampBlend * (2.2 + nightBlend * 0.9);
      lampBulbMat.color.setHex(lampBlend > 0.15 ? 0xfff8dc : 0x475569);
      const beamOpacity = lampBlend * (0.015 + nightBlend * 0.095);
      lampBeamMat.opacity = beamOpacity;
      lampBeamMesh.visible = beamOpacity > 0.004;

      controls.update();

      const boostTarget = performance.now() < audioBoostUntilRef.current ? 1 : 0;
      audioBoostLevelRef.current = THREE.MathUtils.damp(audioBoostLevelRef.current, boostTarget, 6, delta);

      applyDissectionRuntimeVisuals(
        model,
        simParamsRef.current,
        telemetryMapRef.current,
        highlightedPartIdRef.current,
        hoveredPartIdRef.current,
        signalBlockedRef.current,
        delta,
        elapsed,
        audioBoostLevelRef.current
      );

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        frameId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', cancelTransition);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      controls.dispose();
      model.dispose();
      envTex.dispose();
      rodGeo.dispose();
      shadeGeo.dispose();
      lampBulbGeo.dispose();
      lampBeamGeo.dispose();
      fixtureMat.dispose();
      lampBulbMat.dispose();
      lampBeamMat.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      dayGrid.geometry.dispose();
      (dayGrid.material as THREE.Material).dispose();
      nightGrid.geometry.dispose();
      (nightGrid.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      modelRef.current = null;
      dayGridRef.current = null;
      nightGridRef.current = null;
    };
    // Rebuild WebGL scene when switching dissected device
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprint]);

  const statusBadgeClass = (status: 'NOMINAL' | 'WARNING' | 'FAULT') => {
    if (status === 'FAULT') return 'bg-rose-600 text-white';
    if (status === 'WARNING') return 'bg-amber-500 text-slate-950';
    return 'bg-emerald-600 text-white';
  };

  const canTestAudio =
    componentId === 'comp-pas-ceiling' ||
    componentId === 'comp-pas-column' ||
    componentId === 'comp-pas-horn' ||
    componentId === 'comp-pas-aas' ||
    componentId === 'comp-pas-paging';

  const handleTestDeviceAudio = () => {
    audioBoostUntilRef.current = performance.now() + 2400;
    if (componentId === 'comp-pas-ceiling') playSpeakerTestTone('ceiling');
    else if (componentId === 'comp-pas-horn') playSpeakerTestTone('horn');
    else playSpeakerTestTone('column');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#242424] text-[#F5F3EE]"
      role="dialog"
      aria-modal="true"
      aria-label={`Bedah Komponen ${blueprint.deviceName}`}
    >
      {/* ==================== TOP FLOATING PILL NAVBAR (Strictly 1 Row) ==================== */}
      <header
        className={`absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100vw-1.5rem)] rounded-full border px-2.5 sm:px-3 py-1.5 flex flex-nowrap items-center justify-between gap-2 whitespace-nowrap shadow-[0_14px_38px_rgba(0,0,0,0.52)] transition-colors ${
          nightMode
            ? 'bg-[#242424]/96 border-[#FFDB00]/45 ring-1 ring-[#FFDB00]/15'
            : 'bg-[#323232]/96 border-[#525252] ring-1 ring-white/10'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 pl-0.5 shrink">
          <div className="w-8 h-8 rounded-full bg-[#FFDB00] text-[#242424] flex items-center justify-center shrink-0 font-mono-tech text-[11px] font-bold shadow-xs">
            {blueprint.deviceCode}
          </div>
          <div className="min-w-0 max-w-[115px] sm:max-w-[175px] xl:max-w-[240px]">
            <h2
              title={lang === 'id' ? `Bedah · ${blueprint.deviceName}` : `Dissect · ${blueprint.deviceName}`}
              className="font-charm text-sm sm:text-base font-bold text-[#FFDB00] truncate leading-tight"
            >
              {lang === 'id' ? `Bedah · ${blueprint.deviceName}` : `Dissect · ${blueprint.deviceName}`}
            </h2>
          </div>
        </div>

        <span className="hidden lg:inline-block h-5 w-px bg-[#4E4E4E] shrink-0" aria-hidden="true" />

        {/* 3 Navigation Tabs (Inner Pill Switcher) */}
        <div className="hidden lg:flex flex-nowrap items-center gap-1 bg-[#242424] p-0.5 rounded-full border border-[#454545] shrink-0">
          {(
            [
              { id: 'inspector', label: lang === 'id' ? 'Bedah & Telemetri' : 'Dissect & Telemetry', icon: Cpu },
              { id: 'quiz', label: lang === 'id' ? 'Kuis Diagnostik' : 'Diagnostic Quiz', icon: HelpCircle },
              { id: 'schema', label: lang === 'id' ? 'Alur & Komponen' : 'Flow & Parts', icon: BookOpen },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id);
                  setRightPanelOpen(true);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#FFDB00] text-[#242424] font-bold'
                    : 'text-[#D6D3CB] hover:text-white hover:bg-[#3D3D3D]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <span className="hidden md:inline-block h-5 w-px bg-[#4E4E4E] shrink-0" aria-hidden="true" />

        {/* Right Header Actions (Mode Siang/Malam + Saklar Lampu + Reset + Panel + Kembali) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setNightMode((v) => !v);
              playTone(nightMode ? 640 : 420, 0.05, 'sine', 0.04);
            }}
            className={`h-8 px-2.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              nightMode
                ? 'bg-[#FFDB00] hover:bg-[#E6C500] border-[#FFDB00] text-[#242424] font-bold'
                : 'bg-[#262626] hover:bg-[#3D3D3D] border-[#4A4A4A] text-[#F5F3EE]'
            }`}
            title={nightMode ? 'Beralih ke Mode Siang' : 'Beralih ke Mode Malam'}
          >
            {nightMode ? <Moon className="w-3.5 h-3.5 text-[#242424]" /> : <Sun className="w-3.5 h-3.5 text-[#FFDB00]" />}
            <span className="hidden md:inline">{nightMode ? 'Malam' : 'Siang'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLampOn((v) => !v);
              playTone(lampOn ? 320 : 820, 0.045, 'triangle', 0.05);
            }}
            className={`h-8 px-2.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              lampOn
                ? 'bg-[#FFDB00] hover:bg-[#E6C500] border-[#FFDB00] text-[#242424] font-bold'
                : 'bg-[#262626] hover:bg-[#3D3D3D] border-[#4A4A4A] text-[#BDBAB2]'
            }`}
            title={lampOn ? 'Matikan Lampu Studio' : 'Nyalakan Lampu Studio'}
          >
            <Lightbulb className={`w-3.5 h-3.5 ${lampOn ? 'fill-[#242424]' : ''}`} />
            <span className="hidden sm:inline">Lampu</span>
            <span
              className={`font-mono-tech text-[10px] font-bold px-1.5 rounded-full ${
                lampOn ? 'bg-[#242424]/15 text-[#242424]' : 'bg-[#1D1D1D] text-[#9A978F]'
              }`}
            >
              {lampOn ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleResetSimulation}
            className="h-8 px-2.5 rounded-full bg-[#262626] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-xs font-semibold text-[#F5F3EE] flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Reset Bedah 3D"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#FFDB00]" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            type="button"
            onClick={() => setRightPanelOpen((v) => !v)}
            className="h-8 px-2.5 rounded-full bg-[#262626] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-xs font-semibold text-[#F5F3EE] flex items-center gap-1 cursor-pointer transition-colors"
          >
            {rightPanelOpen ? <ChevronRight className="w-3.5 h-3.5 text-[#FFDB00]" /> : <ChevronLeft className="w-3.5 h-3.5 text-[#FFDB00]" />}
            <span className="hidden 2xl:inline">{rightPanelOpen ? 'Sembunyikan Panel' : 'Panel Bedah'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-full bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>{lang === 'id' ? 'Kembali' : 'Back'}</span>
          </button>
        </div>
      </header>

      {/* ==================== MAIN SPLIT WORKSPACE ==================== */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row relative overflow-hidden">
        {/* LEFT: DEDICATED 3D DISSECTION VIEWPORT */}
        <div className="relative flex-1 min-h-[340px] bg-[#1E1E1E] overflow-hidden">
          <div ref={viewportRef} className="w-full h-full" />

          {/* Top-Center Live Telemetry Strip (Aligned Below Floating Pill Navbar) */}
          <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-10 max-w-[56%] sm:max-w-[60%] pointer-events-none flex justify-center">
            {isSectionMinimized('telemetryBar') ? (
              <button
                type="button"
                onClick={() => toggleSection('telemetryBar')}
                className="pointer-events-auto bg-[#323232]/95 hover:bg-[#3D3D3D] border border-[#4A4A4A] rounded-lg px-3 py-1.5 shadow-md flex items-center gap-1.5 text-xs font-semibold text-[#F5F3EE] cursor-pointer transition-colors"
                title="Tampilkan Telemetri"
              >
                <span className="font-mono-tech text-[10px] font-bold text-[#FFDB00]">#{selectedPart.numberBadge}</span>
                <span>Telemetri</span>
                <Plus className="w-3.5 h-3.5 text-[#FFDB00]" />
              </button>
            ) : (
              <div className="pointer-events-auto bg-[#323232]/95 border border-[#4A4A4A] rounded-lg px-3 py-1.5 shadow-md flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono-tech text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FFDB00] text-[#242424]">
                    #{selectedPart.numberBadge}
                  </span>
                  <span className="font-bold text-[#F5F3EE] truncate max-w-[160px] sm:max-w-[220px]">
                    {selectedPart.shortTitle}
                  </span>
                </div>
                <div className="font-mono-tech text-[11px] text-[#D6D3CB]">
                  Beban <strong className="text-[#FFDB00]">{selectedTelemetry.loadPercent}%</strong>
                </div>
                <div className="font-mono-tech text-[11px] text-[#D6D3CB]">
                  Suhu <strong className="text-[#FFDB00]">{selectedTelemetry.tempC}°C</strong>
                </div>
                <span
                  className={`font-mono-tech text-[10px] font-bold px-2 py-0.5 rounded ${
                    activeFaultCount > 0 ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {activeFaultCount > 0 ? `${activeFaultCount} GANGGUAN AKTIF` : 'NOMINAL'}
                </span>
                <button
                  type="button"
                  onClick={() => toggleSection('telemetryBar')}
                  className="p-0.5 rounded hover:bg-[#3D3D3D] text-[#BDBAB2] hover:text-white cursor-pointer"
                  title="Perkecil Telemetri"
                  aria-label="Perkecil Telemetri"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Floating Restore Button when Right Panel is Minimized (Aligned at Top-Right) */}
          {!rightPanelOpen && (
            <button
              type="button"
              onClick={() => setRightPanelOpen(true)}
              className="absolute top-[72px] right-3 z-10 px-3 py-1.5 rounded-full bg-[#FFDB00] hover:bg-[#E6C500] border border-[#FFDB00] text-xs font-bold text-[#242424] shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Tampilkan Panel Bedah"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[#242424]" />
              <span>Panel Bedah</span>
              <Plus className="w-3.5 h-3.5 text-[#242424]" />
            </button>
          )}

          {/* Collapsible Left Toolbar Bedah 3D (Aligned Below Floating Pill Navbar) */}
          <div className="absolute top-[72px] left-3 bottom-3 z-10 flex flex-col pointer-events-none max-w-[258px]">
            <button
              type="button"
              onClick={() => setToolbarOpen((v) => !v)}
              className="pointer-events-auto self-start mb-1.5 px-3 py-1.5 rounded-lg bg-[#323232]/95 hover:bg-[#3D3D3D] border border-[#4A4A4A] text-xs font-semibold text-[#F5F3EE] shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
              title={toolbarOpen ? 'Perkecil Toolbar Bedah 3D' : 'Tampilkan Toolbar Bedah 3D'}
            >
              <Sliders className="w-3.5 h-3.5 text-[#FFDB00]" />
              <span>Toolbar Bedah 3D</span>
              {toolbarOpen ? (
                <Minus className="w-3.5 h-3.5 text-[#BDBAB2]" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-[#FFDB00]" />
              )}
            </button>

            {toolbarOpen && (
              <div className="pointer-events-auto flex-1 overflow-y-auto elban-scroll bg-[#323232]/96 text-[#F5F3EE] border border-[#4A4A4A] rounded-xl shadow-xl p-3 space-y-2.5 w-[252px]">
                {/* 1. Timelapse Perakitan */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#FFDB00] uppercase tracking-wide">
                    <span>Timelapse Perakitan</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-tech text-[#F5F3EE]">{Math.round(simParams.assemblyProgress * 100)}%</span>
                      <button
                        type="button"
                        onClick={() => toggleSection('tb_assembly')}
                        className="w-5 h-5 rounded bg-[#262626] hover:bg-[#3D3D3D] border border-[#454545] text-[#D6D3CB] flex items-center justify-center cursor-pointer"
                        title={isSectionMinimized('tb_assembly') ? 'Tampilkan' : 'Perkecil'}
                      >
                        {isSectionMinimized('tb_assembly') ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  {!isSectionMinimized('tb_assembly') && (
                    <div className="mt-1.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSimParams((prev) => ({
                              ...prev,
                              assemblyProgress: prev.assemblyProgress >= 0.99 ? 0 : prev.assemblyProgress,
                              isAssembling: !prev.isAssembling,
                            }))
                          }
                          className="flex-1 py-1.5 px-2 rounded-md bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424] text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          {simParams.isAssembling ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          <span>{simParams.isAssembling ? 'Jeda' : 'Mulai'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSimParams((prev) => ({ ...prev, assemblyProgress: 1, isAssembling: false }))
                          }
                          className="py-1.5 px-2.5 rounded-md bg-[#262626] hover:bg-[#3D3D3D] border border-[#454545] text-[#F5F3EE] text-[11px] font-semibold cursor-pointer"
                        >
                          100%
                        </button>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(simParams.assemblyProgress * 100)}
                        onChange={(e) =>
                          setSimParams((prev) => ({
                            ...prev,
                            assemblyProgress: Number(e.target.value) / 100,
                            isAssembling: false,
                          }))
                        }
                        className="w-full accent-[#FFDB00] cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* 2. Sudut Kamera */}
                <div className="border-t border-[#454545] pt-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#FFDB00] uppercase tracking-wide">
                    <div className="flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-[#FFDB00]" />
                      <span>Sudut Kamera</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSection('tb_camera')}
                      className="w-5 h-5 rounded bg-[#262626] hover:bg-[#3D3D3D] border border-[#454545] text-[#D6D3CB] flex items-center justify-center cursor-pointer"
                      title={isSectionMinimized('tb_camera') ? 'Tampilkan' : 'Perkecil'}
                    >
                      {isSectionMinimized('tb_camera') ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    </button>
                  </div>
                  {!isSectionMinimized('tb_camera') && (
                    <div className="grid grid-cols-3 gap-1 mt-1.5">
                      {(Object.keys(blueprint.cameraPresets) as DissectionCameraPresetId[]).map((pid) => (
                        <button
                          key={pid}
                          type="button"
                          onClick={() => handleCameraPreset(pid)}
                          className={`py-1 px-1 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                            activeCameraPreset === pid
                              ? 'bg-[#FFDB00] text-[#242424] font-bold'
                              : 'bg-[#262626] hover:bg-[#3D3D3D] text-[#D6D3CB]'
                          }`}
                        >
                          {blueprint.cameraPresets[pid].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Mode Rendering */}
                <div className="border-t border-[#454545] pt-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#FFDB00] uppercase tracking-wide">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-[#FFDB00]" />
                      <span>Mode Rendering</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSection('tb_render')}
                      className="w-5 h-5 rounded bg-[#262626] hover:bg-[#3D3D3D] border border-[#454545] text-[#D6D3CB] flex items-center justify-center cursor-pointer"
                      title={isSectionMinimized('tb_render') ? 'Tampilkan' : 'Perkecil'}
                    >
                      {isSectionMinimized('tb_render') ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    </button>
                  </div>
                  {!isSectionMinimized('tb_render') && (
                    <div className="grid grid-cols-3 gap-1 mt-1.5">
                      {(
                        [
                          { id: 'solid', label: 'Solid' },
                          { id: 'xray', label: 'X-Ray' },
                          { id: 'wireframe', label: 'Wire' },
                        ] as Array<{ id: DissectionVisualMode; label: string }>
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSimParams((prev) => ({ ...prev, visualMode: m.id }))}
                          className={`py-1.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                            simParams.visualMode === m.id
                              ? 'bg-[#FFDB00] text-[#242424] font-bold'
                              : 'bg-[#262626] hover:bg-[#3D3D3D] text-[#D6D3CB]'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Komponen & Casing Toggles */}
                <div className="border-t border-[#454545] pt-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#FFDB00] uppercase tracking-wide">
                    <div className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#FFDB00]" />
                      <span>Casing & Sinyal</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSection('tb_toggles')}
                      className="w-5 h-5 rounded bg-[#262626] hover:bg-[#3D3D3D] border border-[#454545] text-[#D6D3CB] flex items-center justify-center cursor-pointer"
                      title={isSectionMinimized('tb_toggles') ? 'Tampilkan' : 'Perkecil'}
                    >
                      {isSectionMinimized('tb_toggles') ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    </button>
                  </div>
                  {!isSectionMinimized('tb_toggles') && (
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                      {(
                        [
                          { key: 'casingDetached', label: 'Lepas Casing' },
                          { key: 'showInternalWires', label: 'Kabel Internal' },
                          { key: 'showSignalFlow', label: 'Aliran Sinyal' },
                        ] as const
                      ).map((item) => {
                        const active = simParams[item.key];
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() =>
                              setSimParams((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                            }
                            className={`py-1.5 px-2 rounded-md text-[10px] font-semibold text-left border cursor-pointer transition-colors ${
                              active
                                ? 'bg-[#3D3A28] border-[#FFDB00]/65 text-[#FFDB00]'
                                : 'bg-[#262626] border-[#454545] text-[#BDBAB2] hover:bg-[#3D3D3D]'
                            }`}
                          >
                            {item.label}: <strong>{active ? 'ON' : 'OFF'}</strong>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setShowGrid((g) => !g)}
                        className={`py-1.5 px-2 rounded-md text-[10px] font-semibold text-left border cursor-pointer transition-colors ${
                          showGrid
                            ? 'bg-[#3D3A28] border-[#FFDB00]/65 text-[#FFDB00]'
                            : 'bg-[#262626] border-[#454545] text-[#BDBAB2] hover:bg-[#3D3D3D]'
                        }`}
                      >
                        Grid 3D: <strong>{showGrid ? 'ON' : 'OFF'}</strong>
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. Parameter Sliders */}
                <div className="border-t border-[#454545] pt-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#FFDB00] uppercase tracking-wide">
                    <span>Parameter Bedah</span>
                    <button
                      type="button"
                      onClick={() => toggleSection('tb_sliders')}
                      className="w-5 h-5 rounded bg-[#262626] hover:bg-[#3D3D3D] border border-[#454545] text-[#D6D3CB] flex items-center justify-center cursor-pointer"
                      title={isSectionMinimized('tb_sliders') ? 'Tampilkan' : 'Perkecil'}
                    >
                      {isSectionMinimized('tb_sliders') ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    </button>
                  </div>
                  {!isSectionMinimized('tb_sliders') && (
                    <div className="space-y-2.5 mt-1.5">
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-[#D6D3CB]">
                          <span>Exploded View (Bedah)</span>
                          <span className="font-mono-tech text-[#FFDB00]">{Math.round(simParams.explodedFactor * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round(simParams.explodedFactor * 100)}
                          onChange={(e) =>
                            setSimParams((prev) => ({ ...prev, explodedFactor: Number(e.target.value) / 100 }))
                          }
                          className="w-full accent-[#FFDB00] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-[#D6D3CB]">
                          <span>Beban Operasional</span>
                          <span className="font-mono-tech text-[#FFDB00]">{simParams.workloadPercent}%</span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          value={simParams.workloadPercent}
                          onChange={(e) =>
                            setSimParams((prev) => ({ ...prev, workloadPercent: Number(e.target.value) }))
                          }
                          className="w-full accent-[#FFDB00] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-[#D6D3CB]">
                          <span>Suhu Lingkungan</span>
                          <span className="font-mono-tech text-[#FFDB00]">{simParams.ambientTempC}°C</span>
                        </div>
                        <input
                          type="range"
                          min={16}
                          max={38}
                          value={simParams.ambientTempC}
                          onChange={(e) =>
                            setSimParams((prev) => ({ ...prev, ambientTempC: Number(e.target.value) }))
                          }
                          className="w-full accent-[#FFDB00] cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom-Center Viewport Controls Hint (Minimizable) */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden sm:block">
            {isSectionMinimized('controlsHint') ? (
              <button
                type="button"
                onClick={() => toggleSection('controlsHint')}
                className="pointer-events-auto bg-[#323232]/95 hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[#D6D3CB] text-[10px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                title="Tampilkan Petunjuk Kontrol 3D"
              >
                <span>Kontrol 3D</span>
                <Plus className="w-3 h-3 text-[#FFDB00]" />
              </button>
            ) : (
              <div className="pointer-events-auto bg-[#323232]/95 border border-[#4A4A4A] text-[#D6D3CB] text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-2">
                <span>
                  Drag orbit 360° · Scroll zoom · Klik komponen internal 3D untuk fokus · Tombol 1–{blueprint.parts.length} pintasan cepat
                </span>
                <button
                  type="button"
                  onClick={() => toggleSection('controlsHint')}
                  className="p-0.5 rounded hover:bg-[#3D3D3D] text-[#BDBAB2] hover:text-white cursor-pointer"
                  title="Perkecil Petunjuk"
                  aria-label="Perkecil Petunjuk"
                >
                  <Minus className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ==================== RIGHT COLLAPSIBLE LEARNING & DIAGNOSTIC PANEL ==================== */}
        {rightPanelOpen && (
          <aside className="w-full lg:w-[410px] xl:w-[435px] shrink-0 bg-[#323232] text-[#F5F3EE] border-t lg:border-t-0 lg:border-l border-[#4A4A4A] flex flex-col max-h-[48vh] lg:max-h-none lg:pt-[68px]">
            {/* Mobile Tab Switcher + Quick Minimize Controls Bar */}
            <div className="border-b border-[#4A4A4A] bg-[#262626] px-3 py-2 flex items-center justify-between gap-2 shrink-0">
              <div className="flex lg:hidden gap-1 overflow-x-auto">
                {(
                  [
                    { id: 'inspector', label: 'Bedah' },
                    { id: 'quiz', label: 'Kuis' },
                    { id: 'schema', label: 'Alur Sinyal' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      activeTab === t.id
                        ? 'bg-[#FFDB00] text-[#242424] font-bold'
                        : 'bg-[#323232] text-[#D6D3CB] border border-[#4A4A4A]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-[#FFDB00] uppercase tracking-wide">
                <span>Panel Materi</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const asideKeys = [
                      'sec_parts_grid',
                      'sec_active_detail',
                      'sec_telemetry_kpis',
                      'sec_specs_table',
                      'sec_faults',
                      'sec_logbook',
                      'sec_quiz_intro',
                      ...blueprint.quiz.map((q) => `sec_quiz_q_${q.id}`),
                      'sec_signal_flow',
                      'sec_anatomy_list',
                    ];
                    const anyOpen = asideKeys.some((k) => !minimizedSections[k]);
                    setMinimizedSections((prev) => {
                      const next = { ...prev };
                      asideKeys.forEach((k) => {
                        next[k] = anyOpen;
                      });
                      return next;
                    });
                  }}
                  className="px-2 py-1 rounded-md bg-[#323232] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[10px] font-semibold text-[#D6D3CB] hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                  title="Perkecil atau buka semua bagian di panel ini"
                >
                  <Minus className="w-3 h-3 text-[#FFDB00]" />
                  <span>Perkecil / Buka Semua</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelOpen(false)}
                  className="w-6 h-6 rounded-md bg-[#323232] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[#D6D3CB] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                  title="Perkecil Panel Kanan"
                  aria-label="Perkecil Panel Kanan"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto elban-scroll p-3.5 space-y-3">
              {/* -------------------- TAB 1: BEDAH & TELEMETRI -------------------- */}
              {activeTab === 'inspector' && (
                <>
                  {/* 1. Quick Internal Component Grid */}
                  <div className="rounded-xl border border-[#454545] bg-[#262626] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold text-[#FFDB00] uppercase tracking-wider truncate">
                        {blueprint.parts.length} Komponen Internal (1–{blueprint.parts.length})
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {canTestAudio && (
                          <button
                            type="button"
                            onClick={handleTestDeviceAudio}
                            className="px-2 py-1 rounded bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424] text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Uji Suara</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleSection('sec_parts_grid')}
                          className="w-6 h-6 rounded-md bg-[#323232] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[#D6D3CB] flex items-center justify-center cursor-pointer"
                          title={isSectionMinimized('sec_parts_grid') ? 'Tampilkan Daftar Komponen' : 'Perkecil Daftar Komponen'}
                        >
                          {isSectionMinimized('sec_parts_grid') ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    {!isSectionMinimized('sec_parts_grid') && (
                      <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                        {blueprint.parts.map((p) => {
                          const tel = telemetryMap[p.id];
                          const active = p.id === selectedPart.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectPart(p.id, true)}
                              className={`p-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                                active
                                  ? 'bg-[#FFDB00] border-[#FFDB00] text-[#242424]'
                                  : 'bg-[#323232] hover:bg-[#3D3D3D] border-[#4A4A4A] text-[#F5F3EE]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`font-mono-tech text-[10px] font-bold ${
                                    active ? 'text-[#242424]' : 'text-[#FFDB00]'
                                  }`}
                                >
                                  #{p.numberBadge}
                                </span>
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    tel.status === 'FAULT'
                                      ? 'bg-rose-500'
                                      : tel.status === 'WARNING'
                                        ? 'bg-amber-400'
                                        : 'bg-emerald-500'
                                  }`}
                                />
                              </div>
                              <div className={`text-[11px] truncate mt-0.5 ${active ? 'font-bold' : 'font-semibold'}`}>{p.shortTitle}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 2. Active Internal Component Card + Telemetry */}
                  <div className="rounded-xl border border-[#454545] bg-[#262626] p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono-tech text-[11px] font-semibold text-[#FFDB00]">
                          BAGIAN #{selectedPart.numberBadge} · {selectedPart.layerTag}
                        </div>
                        <h3 className="font-charm text-lg font-bold text-[#F5F3EE] leading-snug mt-0.5">
                          {selectedPart.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`font-mono-tech text-[10px] font-bold px-2 py-0.5 rounded ${statusBadgeClass(
                            selectedTelemetry.status
                          )}`}
                        >
                          {selectedTelemetry.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleSection('sec_active_detail')}
                          className="w-6 h-6 rounded-md bg-[#323232] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[#D6D3CB] flex items-center justify-center cursor-pointer"
                          title={isSectionMinimized('sec_active_detail') ? 'Tampilkan Detail Bagian' : 'Perkecil Detail Bagian'}
                        >
                          {isSectionMinimized('sec_active_detail') ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {!isSectionMinimized('sec_active_detail') && (
                      <>
                        <p className="text-xs text-[#D6D3CB] leading-relaxed">{selectedPart.functionSummary}</p>

                        {/* 2a. 4 Live Telemetry KPI Cards (Minimizable) */}
                        <div className="rounded-lg border border-[#454545] bg-[#1E1E1E] p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#FFDB00] uppercase tracking-wider">
                              Telemetri Real-Time
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleSection('sec_telemetry_kpis')}
                              className="w-5 h-5 rounded bg-[#323232] hover:bg-[#3D3D3D] text-[#D6D3CB] flex items-center justify-center cursor-pointer"
                              title={isSectionMinimized('sec_telemetry_kpis') ? 'Tampilkan Telemetri' : 'Perkecil Telemetri'}
                            >
                              {isSectionMinimized('sec_telemetry_kpis') ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            </button>
                          </div>
                          {!isSectionMinimized('sec_telemetry_kpis') && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div className="bg-[#262626] rounded-lg border border-[#454545] p-2.5">
                                <div className="flex items-center gap-1 text-[10px] font-semibold text-[#BDBAB2] uppercase">
                                  <Activity className="w-3 h-3 text-[#FFDB00]" />
                                  <span>Beban Kerja</span>
                                </div>
                                <div className="font-mono-tech text-base font-bold text-[#F5F3EE] mt-0.5">
                                  {selectedTelemetry.loadPercent}%
                                </div>
                              </div>
                              <div className="bg-[#262626] rounded-lg border border-[#454545] p-2.5">
                                <div className="flex items-center gap-1 text-[10px] font-semibold text-[#BDBAB2] uppercase">
                                  <Thermometer className="w-3 h-3 text-[#FFDB00]" />
                                  <span>Suhu Kerja</span>
                                </div>
                                <div className="font-mono-tech text-base font-bold text-[#F5F3EE] mt-0.5">
                                  {selectedTelemetry.tempC}°C
                                </div>
                              </div>
                              <div className="bg-[#262626] rounded-lg border border-[#454545] p-2.5">
                                <div className="flex items-center gap-1 text-[10px] font-semibold text-[#BDBAB2] uppercase">
                                  <Zap className="w-3 h-3 text-[#FFDB00]" />
                                  <span>{selectedPart.metric3Label}</span>
                                </div>
                                <div className="font-mono-tech text-sm font-bold text-[#F5F3EE] mt-0.5 truncate">
                                  {selectedTelemetry.metric3Value}
                                </div>
                              </div>
                              <div className="bg-[#262626] rounded-lg border border-[#454545] p-2.5">
                                <div className="flex items-center gap-1 text-[10px] font-semibold text-[#BDBAB2] uppercase">
                                  <Cpu className="w-3 h-3 text-[#FFDB00]" />
                                  <span>{selectedPart.metric4Label}</span>
                                </div>
                                <div className="font-mono-tech text-sm font-bold text-[#F5F3EE] mt-0.5 truncate">
                                  {selectedTelemetry.metric4Value}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 2b. Technical Specifications (Minimizable) */}
                        <div className="bg-[#1E1E1E] rounded-lg border border-[#454545] overflow-hidden">
                          <div className="px-2.5 py-1.5 bg-[#262626] border-b border-[#454545] flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#FFDB00] uppercase tracking-wider">
                              Spesifikasi Teknis
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleSection('sec_specs_table')}
                              className="w-5 h-5 rounded bg-[#323232] hover:bg-[#3D3D3D] text-[#D6D3CB] flex items-center justify-center cursor-pointer"
                              title={isSectionMinimized('sec_specs_table') ? 'Tampilkan Spesifikasi' : 'Perkecil Spesifikasi'}
                            >
                              {isSectionMinimized('sec_specs_table') ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            </button>
                          </div>
                          {!isSectionMinimized('sec_specs_table') && (
                            <div className="divide-y divide-[#383838]">
                              {selectedPart.specs.map((sp) => (
                                <div key={sp.label} className="px-2.5 py-1.5 flex items-start justify-between gap-3 text-[11px]">
                                  <span className="text-[#BDBAB2] font-medium shrink-0">{sp.label}</span>
                                  <span className="text-[#F5F3EE] font-semibold text-right">{sp.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* 3. Fault Injection Simulator (Minimizable) */}
                  <div className="rounded-xl border border-[#454545] bg-[#262626] p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#F5F3EE]">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Injeksi Gangguan (Troubleshooting)</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {activeFaultCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveFaultIds([])}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                          >
                            Pulihkan
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleSection('sec_faults')}
                          className="w-6 h-6 rounded-md bg-[#323232] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[#D6D3CB] flex items-center justify-center cursor-pointer"
                          title={isSectionMinimized('sec_faults') ? 'Tampilkan Injeksi Gangguan' : 'Perkecil Injeksi Gangguan'}
                        >
                          {isSectionMinimized('sec_faults') ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    {!isSectionMinimized('sec_faults') && (
                      <div className="space-y-1.5">
                        {blueprint.faults.map((f) => {
                          const active = activeFaultIds.includes(f.id);
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => handleToggleFault(f.id, f.affectedPartIds[0])}
                              className={`w-full text-left p-2 rounded-lg border transition-colors cursor-pointer ${
                                active
                                  ? 'bg-rose-950/60 border-rose-500/70 text-rose-100'
                                  : 'bg-[#1E1E1E] hover:bg-[#3D3D3D] border-[#454545] text-[#F5F3EE]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold">{f.label}</span>
                                <span
                                  className={`font-mono-tech text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    active ? 'bg-rose-600 text-white' : 'bg-[#323232] text-[#FFDB00]'
                                  }`}
                                >
                                  {active ? 'AKTIF' : 'PICU'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#BDBAB2] mt-0.5 leading-snug">{f.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 4. Walk-In ElBan Logbook Sync (Minimizable) */}
                  {curriculumComp && (
                    <div className="rounded-xl border border-[#FFDB00]/45 bg-[#3D3A28] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold text-[#FFDB00] truncate">
                          Logbook Praktikum · {curriculumComp.code}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSection('sec_logbook')}
                          className="w-6 h-6 rounded-md bg-[#262626] hover:bg-[#3D3D3D] border border-[#FFDB00]/40 text-[#FFDB00] flex items-center justify-center shrink-0 cursor-pointer"
                          title={isSectionMinimized('sec_logbook') ? 'Tampilkan Logbook' : 'Perkecil Logbook'}
                        >
                          {isSectionMinimized('sec_logbook') ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {!isSectionMinimized('sec_logbook') && (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="text-[11px] text-[#F5F3EE]">
                            {isLogged ? 'Sudah tercatat di Logbook ElBan' : `Catat hasil bedah (+${curriculumComp.xpReward} XP)`}
                          </div>
                          <button
                            type="button"
                            onClick={() => onLogComponent(componentId)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
                              isLogged
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424]'
                            }`}
                          >
                            {isLogged ? <BookmarkCheck className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5 text-[#242424]" />}
                            <span>{isLogged ? 'Tercatat' : 'Simpan'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* -------------------- TAB 2: KUIS DIAGNOSTIK -------------------- */}
              {activeTab === 'quiz' && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-[#3D3A28] border border-[#FFDB00]/45 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-charm text-base font-bold text-[#FFDB00]">Kuis Bedah Komponen {blueprint.deviceCode}</div>
                      <button
                        type="button"
                        onClick={() => toggleSection('sec_quiz_intro')}
                        className="w-6 h-6 rounded-md bg-[#262626] hover:bg-[#3D3D3D] border border-[#FFDB00]/40 text-[#FFDB00] flex items-center justify-center shrink-0 cursor-pointer"
                        title={isSectionMinimized('sec_quiz_intro') ? 'Tampilkan' : 'Perkecil'}
                      >
                        {isSectionMinimized('sec_quiz_intro') ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {!isSectionMinimized('sec_quiz_intro') && (
                      <p className="text-[11px] text-[#F5F3EE] mt-1">
                        Uji pemahaman fungsi bagian internal dan diagnosa gangguan pada {blueprint.deviceName}.
                      </p>
                    )}
                  </div>

                  {blueprint.quiz.map((q, qIdx) => {
                    const picked = quizAnswers[q.id];
                    const answered = picked !== undefined;
                    const qKey = `sec_quiz_q_${q.id}`;
                    const qMin = isSectionMinimized(qKey);
                    return (
                      <div key={q.id} className="rounded-xl border border-[#454545] bg-[#262626] p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-bold text-[#F5F3EE]">
                            {qIdx + 1}. {q.question}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleSection(qKey)}
                            className="w-6 h-6 rounded-md bg-[#323232] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[#D6D3CB] flex items-center justify-center shrink-0 cursor-pointer"
                            title={qMin ? 'Tampilkan Soal' : 'Perkecil Soal'}
                          >
                            {qMin ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {!qMin && (
                          <>
                            <div className="space-y-1.5">
                              {q.options.map((opt, optIdx) => {
                                const isPicked = picked === optIdx;
                                const isCorrect = optIdx === q.correctIndex;
                                let btnCls = 'bg-[#1E1E1E] hover:bg-[#3D3D3D] border-[#454545] text-[#F5F3EE]';
                                if (answered) {
                                  if (isCorrect) btnCls = 'bg-emerald-950/65 border-emerald-500 text-emerald-200 font-semibold';
                                  else if (isPicked) btnCls = 'bg-rose-950/65 border-rose-500 text-rose-200';
                                  else btnCls = 'bg-[#1E1E1E] border-[#383838] text-[#9A978F]';
                                }
                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    onClick={() => {
                                      setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                                      playTone(optIdx === q.correctIndex ? 760 : 280, 0.08, 'sine', 0.05);
                                    }}
                                    className={`w-full text-left px-2.5 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${btnCls}`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                            {answered && (
                              <div className="p-2.5 rounded-lg bg-[#1E1E1E] border border-[#454545] text-[11px] text-[#D6D3CB] flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-[#FFDB00] shrink-0 mt-0.5" />
                                <span>{q.explanation}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* -------------------- TAB 3: SKEMA ALUR & DAFTAR KOMPONEN -------------------- */}
              {activeTab === 'schema' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-[#454545] bg-[#262626] p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold text-[#FFDB00] uppercase tracking-wider">
                        Alur Kerja & Sinyal Internal
                      </h3>
                      <button
                        type="button"
                        onClick={() => toggleSection('sec_signal_flow')}
                        className="w-6 h-6 rounded-md bg-[#323232] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[#D6D3CB] flex items-center justify-center shrink-0 cursor-pointer"
                        title={isSectionMinimized('sec_signal_flow') ? 'Tampilkan Alur Sinyal' : 'Perkecil Alur Sinyal'}
                      >
                        {isSectionMinimized('sec_signal_flow') ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {!isSectionMinimized('sec_signal_flow') && (
                      <div className="space-y-1.5">
                        {blueprint.signalFlowSteps.map((step, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-5 h-5 rounded-md bg-[#FFDB00] text-[#242424] font-mono-tech text-[10px] font-bold flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <span className="font-medium text-[#F5F3EE]">{step}</span>
                            {i < blueprint.signalFlowSteps.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-[#FFDB00] ml-auto shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#454545] bg-[#262626] p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold text-[#FFDB00] uppercase tracking-wider">
                        Anatomi Komponen (Klik untuk Fokus 3D)
                      </h3>
                      <button
                        type="button"
                        onClick={() => toggleSection('sec_anatomy_list')}
                        className="w-6 h-6 rounded-md bg-[#323232] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[#D6D3CB] flex items-center justify-center shrink-0 cursor-pointer"
                        title={isSectionMinimized('sec_anatomy_list') ? 'Tampilkan Anatomi' : 'Perkecil Anatomi'}
                      >
                        {isSectionMinimized('sec_anatomy_list') ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {!isSectionMinimized('sec_anatomy_list') && (
                      <div className="space-y-2">
                        {blueprint.parts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              handleSelectPart(p.id, true);
                              setActiveTab('inspector');
                            }}
                            className="w-full text-left p-3 rounded-xl border border-[#454545] bg-[#1E1E1E] hover:bg-[#3D3D3D] hover:border-[#FFDB00]/60 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono-tech text-[11px] font-bold text-[#FFDB00]">
                                #{p.numberBadge} · {p.layerTag}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-[#F5F3EE] mt-0.5">{p.name}</div>
                            <p className="text-[11px] text-[#BDBAB2] mt-1 leading-snug">{p.functionSummary}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

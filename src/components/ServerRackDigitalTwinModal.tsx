import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Eye,
  HelpCircle,
  Layers,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Server,
  Sliders,
  Thermometer,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { COMPONENT_MAP } from '../data/curriculum';
import {
  computeRackTelemetry,
  DEFAULT_RACK_FAULT_STATE,
  DEFAULT_RACK_SIM_PARAMS,
  KvmTargetId,
  RACK_DIAGNOSTIC_QUIZ,
  RACK_UNIT_ORDER,
  RackCameraPresetId,
  RackFaultState,
  RackSimulationParams,
  RackUnitId,
  RackVisualMode,
} from '../data/serverRackData';
import {
  applyRackRuntimeVisuals,
  Built42UNetworkRack,
  create42UNetworkRack,
} from '../three/serverRack42U';
import { createAfterDraw, detectSoftwareGl } from '../three/webglUtils';
import { Language, SystemId } from '../types/elban';

interface ServerRackDigitalTwinModalProps {
  lang: Language;
  isNightMode: boolean;
  loggedComponentIds: string[];
  onLogComponent: (componentId: string) => void;
  onOpenLegacyEquipment: (systemId: SystemId, componentId?: string) => void;
  onClose: () => void;
}

type RightTabId = 'inspector' | 'quiz' | 'reference';

const CAMERA_PRESETS: Record<
  RackCameraPresetId,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  isometric: { label: 'Iso', pos: [1.95, 1.85, 2.35], target: [0, 1.12, 0] },
  front: { label: 'Depan', pos: [0, 1.18, 2.75], target: [0, 1.12, 0] },
  rear: { label: 'Belakang', pos: [0, 1.18, -2.75], target: [0, 1.12, 0] },
  top: { label: 'Atas', pos: [0.05, 3.6, 0.95], target: [0, 1.25, 0] },
  side: { label: 'Samping', pos: [2.75, 1.22, 0.2], target: [0, 1.12, 0] },
  focus_upper: { label: 'Router', pos: [0.85, 1.66, 1.48], target: [0, 1.54, 0.2] },
  focus_lower: { label: 'PDU/UPS', pos: [0.88, 0.56, 1.42], target: [0, 0.4, 0.16] },
  server_interior: { label: 'Server', pos: [0.78, 0.92, 1.48], target: [0, 0.84, 0.2] },
};

const FAULT_ITEMS: Array<{
  key: keyof RackFaultState;
  label: string;
  desc: string;
  focusUnit: RackUnitId;
}> = [
  {
    key: 'pduBreakerTrip',
    label: 'PDU Breaker Trip',
    desc: 'Sakelar merah PDU 02U terputus (OFF) -> UPS alih ON-BATTERY',
    focusUnit: 'unit_07',
  },
  {
    key: 'upsGridLoss',
    label: 'UPS Grid Loss (PLN Padam)',
    desc: 'Suplai PLN hilang -> APC Smart-UPS C 3000VA suplai baterai 230V',
    focusUnit: 'unit_06',
  },
  {
    key: 'uplinkPortDown',
    label: 'Uplink SFP+ / Patch Down',
    desc: 'Kabel uplink oranye 10G putus -> Packet Loss naik & link merah',
    focusUnit: 'unit_03',
  },
  {
    key: 'firewallTrafficSurge',
    label: 'Firewall Traffic Surge',
    desc: 'Lonjakan serangan trafik pada CCR2004 -> CPU & suhu melonjak',
    focusUnit: 'unit_05',
  },
  {
    key: 'switchFanFailure',
    label: 'Switch Thermal / Fan Fault',
    desc: 'Gangguan aliran pendinginan rak -> suhu CRS326 meningkat drastis',
    focusUnit: 'unit_03',
  },
];

const SERVER_ROOM_ELBAN_COMPONENTS: Array<{
  componentId: string;
  systemId: SystemId;
  shortLabel: string;
}> = [
  { componentId: 'comp-cctv-nvr', systemId: 'sys-cctv-pids', shortLabel: 'NVR Storage' },
  { componentId: 'comp-cctv-fiber', systemId: 'sys-cctv-pids', shortLabel: 'Fiber Ring' },
  { componentId: 'comp-pas-aas', systemId: 'sys-pas', shortLabel: 'PAS / AAS Rack' },
  { componentId: 'comp-igcs-pabx', systemId: 'sys-radio-igcs', shortLabel: 'IP-PABX / IGCS' },
];

export function ServerRackDigitalTwinModal({
  lang,
  isNightMode,
  loggedComponentIds,
  onLogComponent,
  onOpenLegacyEquipment,
  onClose,
}: ServerRackDigitalTwinModalProps) {
  const [activeTab, setActiveTab] = useState<RightTabId>('inspector');
  const [selectedUnitId, setSelectedUnitId] = useState<RackUnitId>('unit_05');
  const [hoveredUnitId, setHoveredUnitId] = useState<RackUnitId | null>(null);
  const [simParams, setSimParams] = useState<RackSimulationParams>(DEFAULT_RACK_SIM_PARAMS);
  const [faults, setFaults] = useState<RackFaultState>(DEFAULT_RACK_FAULT_STATE);
  const [kvmTarget, setKvmTarget] = useState<KvmTargetId>('r360');
  const [telemetryTick, setTelemetryTick] = useState(0);
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [activeCameraPreset, setActiveCameraPreset] = useState<RackCameraPresetId>('isometric');

  // Diagnostic quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  // Three.js viewport refs
  const viewportRef = useRef<HTMLDivElement>(null);
  const rackRef = useRef<Built42UNetworkRack | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const camTransitionRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: false,
    pos: new THREE.Vector3(...CAMERA_PRESETS.isometric.pos),
    target: new THREE.Vector3(...CAMERA_PRESETS.isometric.target),
  });

  // Live synced refs for animation loop (prevents recreating WebGL context)
  const simParamsRef = useRef(simParams);
  simParamsRef.current = simParams;
  const faultsRef = useRef(faults);
  faultsRef.current = faults;
  const selectedUnitRef = useRef(selectedUnitId);
  selectedUnitRef.current = selectedUnitId;
  const hoveredUnitRef = useRef(hoveredUnitId);
  hoveredUnitRef.current = hoveredUnitId;

  // Periodic telemetry ticker (1 Hz)
  useEffect(() => {
    const id = window.setInterval(() => setTelemetryTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Assembly timelapse playback timer
  useEffect(() => {
    if (!simParams.isAssembling) return;
    const id = window.setInterval(() => {
      setSimParams((prev) => {
        if (!prev.isAssembling) return prev;
        const next = prev.assemblyProgress + 0.015;
        if (next >= 1) {
          return { ...prev, assemblyProgress: 1, isAssembling: false };
        }
        return { ...prev, assemblyProgress: next };
      });
    }, 50);
    return () => window.clearInterval(id);
  }, [simParams.isAssembling]);

  const telemetryMap = useMemo(
    () => computeRackTelemetry(simParams, faults, telemetryTick),
    [simParams, faults, telemetryTick]
  );

  const selectedUnit = telemetryMap[selectedUnitId];
  const upsUnit = telemetryMap.unit_06;
  const activeFaultCount = useMemo(
    () => Object.values(faults).filter(Boolean).length,
    [faults]
  );

  // Sync procedural dynamic textures (UPS LCD, KVM OSD, visual mode, assembly)
  useEffect(() => {
    const rack = rackRef.current;
    if (!rack) return;
    const onBatt = faults.pduBreakerTrip || faults.upsGridLoss;
    rack.updateUpsLcd(
      upsUnit.metrics.voltageV ?? 230,
      upsUnit.metrics.batteryPercent ?? 100,
      upsUnit.metrics.loadPercent,
      onBatt
    );
  }, [
    upsUnit.metrics.voltageV,
    upsUnit.metrics.batteryPercent,
    upsUnit.metrics.loadPercent,
    faults.pduBreakerTrip,
    faults.upsGridLoss,
  ]);

  useEffect(() => {
    const rack = rackRef.current;
    if (!rack) return;
    rack.updateKvmScreen(kvmTarget, activeFaultCount > 0);
  }, [kvmTarget, activeFaultCount]);

  useEffect(() => {
    rackRef.current?.updateVisualMode(simParams.visualMode);
  }, [simParams.visualMode]);

  useEffect(() => {
    rackRef.current?.updateAssembly(simParams.assemblyProgress);
  }, [simParams.assemblyProgress]);

  useEffect(() => {
    if (gridRef.current) gridRef.current.visible = showGrid;
  }, [showGrid]);

  const moveCameraTo = useCallback((pos: [number, number, number], target: [number, number, number]) => {
    camTransitionRef.current.pos.set(pos[0], pos[1], pos[2]);
    camTransitionRef.current.target.set(target[0], target[1], target[2]);
    camTransitionRef.current.active = true;
  }, []);

  const handleCameraPreset = useCallback(
    (presetId: RackCameraPresetId) => {
      setActiveCameraPreset(presetId);
      const p = CAMERA_PRESETS[presetId];
      moveCameraTo(p.pos, p.target);
    },
    [moveCameraTo]
  );

  const handleSelectUnit = useCallback(
    (unitId: RackUnitId, focusCam = true) => {
      setSelectedUnitId(unitId);
      if (focusCam) {
        const y = telemetryMap[unitId].focusY;
        moveCameraTo([0.78, Math.max(0.45, y + 0.08), 1.48], [0, y, 0.14]);
      }
    },
    [moveCameraTo, telemetryMap]
  );

  const handleToggleFault = useCallback(
    (key: keyof RackFaultState, focusUnit: RackUnitId) => {
      setFaults((prev) => ({ ...prev, [key]: !prev[key] }));
      handleSelectUnit(focusUnit, true);
    },
    [handleSelectUnit]
  );

  const handleClearAllFaults = useCallback(() => {
    setFaults(DEFAULT_RACK_FAULT_STATE);
  }, []);

  const handleResetSimulation = useCallback(() => {
    setSimParams(DEFAULT_RACK_SIM_PARAMS);
    setFaults(DEFAULT_RACK_FAULT_STATE);
    setKvmTarget('r360');
    setSelectedUnitId('unit_05');
    handleCameraPreset('isometric');
  }, [handleCameraPreset]);

  // Keyboard shortcuts: 1-9 focus units, Escape closes modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      const num = Number(e.key);
      if (num >= 1 && num <= 9) {
        const unitId = RACK_UNIT_ORDER[num - 1];
        if (unitId) handleSelectUnit(unitId, true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSelectUnit, onClose]);

  // Mount dedicated Three.js 42U Rack Digital Twin scene
  useEffect(() => {
    const host = viewportRef.current;
    if (!host) return;

    const isSoftwareGl = detectSoftwareGl();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isNightMode ? 0x0b1220 : 0xe9eff6);

    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.08, 45);
    camera.position.set(...CAMERA_PRESETS.isometric.pos);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Calibrated 3-point studio lighting
    const hemi = new THREE.HemisphereLight(0xf1f5f9, 0x334155, isNightMode ? 0.72 : 1.05);
    const key = new THREE.DirectionalLight(0xfff8ed, isNightMode ? 1.55 : 1.85);
    key.position.set(3.2, 4.8, 3.6);
    if (!isSoftwareGl) {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.near = 0.5;
      key.shadow.camera.far = 14;
      key.shadow.bias = -0.0005;
    }
    const rim = new THREE.DirectionalLight(0x93c5fd, 0.65);
    rim.position.set(-3.4, 2.4, -2.8);
    scene.add(hemi, key, rim);

    // Ground platform & subtle floor grid
    const floorGeo = new THREE.CircleGeometry(4.2, 48);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: isNightMode ? 0x111827 : 0xdbe4ef,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(
      6,
      24,
      isNightMode ? 0x334155 : 0x94a3b8,
      isNightMode ? 0x1e293b : 0xcbd5e1
    );
    grid.position.y = 0.003;
    grid.visible = showGrid;
    gridRef.current = grid;
    scene.add(grid);

    // Build full 9-unit 42U Network Rack
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const rack = create42UNetworkRack(maxAniso, { compactMode: false });
    rackRef.current = rack;
    scene.add(rack.rootGroup);

    // OrbitControls (damping disabled on software GL)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.isometric.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.95;
    controls.maxDistance = 6.5;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();

    const cancelTransition = () => {
      camTransitionRef.current.active = false;
    };
    controls.addEventListener('start', cancelTransition);

    // Raycasting for hover & click selection on any of the 9 rack units
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverMs = 0;

    const getUnitFromPointer = (clientX: number, clientY: number): RackUnitId | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(rack.raycastTargets, false);
      if (hits.length > 0) {
        const uid = hits[0].object.userData.rackUnitId as RackUnitId | undefined;
        return uid ?? null;
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverMs < 48) return;
      lastHoverMs = now;
      const uid = getUnitFromPointer(e.clientX, e.clientY);
      renderer.domElement.style.cursor = uid ? 'pointer' : 'grab';
      setHoveredUnitId((prev) => (prev === uid ? prev : uid));
    };
    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return;
      const uid = getUnitFromPointer(e.clientX, e.clientY);
      if (uid) {
        setSelectedUnitId(uid);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ResizeObserver so toggling toolbar/right panel resizes viewport cleanly
    const resizeObserver = new ResizeObserver(() => {
      if (!host) return;
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(host);

    const clock = new THREE.Clock();
    const kvmOpenRef = { value: 0 };
    let frameId = 0;
    let disposed = false;

    const afterDraw = createAfterDraw(
      renderer,
      (id) => {
        frameId = id;
      },
      75
    );

    const animate = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();

      if (camTransitionRef.current.active) {
        const lambda = 6.5;
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

      controls.update();

      applyRackRuntimeVisuals(
        rack,
        simParamsRef.current,
        faultsRef.current,
        selectedUnitRef.current,
        hoveredUnitRef.current,
        delta,
        elapsed,
        kvmOpenRef
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
      controls.dispose();
      rack.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      rackRef.current = null;
      gridRef.current = null;
    };
  }, [isNightMode]); // intentionally rebuild only if theme changes

  const statusBadgeClass = (status: 'NOMINAL' | 'WARNING' | 'FAULT') => {
    if (status === 'FAULT') return 'bg-rose-600 text-white';
    if (status === 'WARNING') return 'bg-[#FFDB00] text-[#242424]';
    return 'bg-emerald-600 text-white';
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#242424] text-[#F5F3EE]">
      {/* ==================== TOP DIGITAL TWIN HEADER ==================== */}
      <header className="h-14 shrink-0 bg-[#323232] border-b border-[#4A4A4A] px-3 sm:px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FFDB00] text-[#242424] flex items-center justify-center shrink-0">
            <Server className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-charm text-lg sm:text-xl font-bold text-[#FFDB00] truncate leading-tight">
                42U Network Rack Digital Twin
              </h2>
            </div>
          </div>
        </div>

        {/* 3 Navigation Tabs */}
        <div className="hidden lg:flex items-center gap-1 bg-[#242424] p-1 rounded-lg border border-[#454545]">
          {(
            [
              { id: 'inspector', label: 'Inspector & Telemetri', icon: Cpu },
              { id: 'quiz', label: 'Kuis Diagnostik', icon: HelpCircle },
              { id: 'reference', label: 'Referensi 42U', icon: BookOpen },
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
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
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

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetSimulation}
            className="px-2.5 py-1.5 rounded-lg bg-[#262626] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-xs font-semibold text-[#F5F3EE] flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Reset Simulasi"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#FFDB00]" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            type="button"
            onClick={() => setRightPanelOpen((v) => !v)}
            className="px-2.5 py-1.5 rounded-lg bg-[#262626] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-xs font-semibold text-[#F5F3EE] flex items-center gap-1 cursor-pointer transition-colors"
          >
            {rightPanelOpen ? <ChevronRight className="w-3.5 h-3.5 text-[#FFDB00]" /> : <ChevronLeft className="w-3.5 h-3.5 text-[#FFDB00]" />}
            <span className="hidden xl:inline">{rightPanelOpen ? 'Sembunyikan Panel' : 'Panel Inspeksi'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>{lang === 'id' ? 'Kembali 3D' : 'Exit'}</span>
          </button>
        </div>
      </header>

      {/* ==================== MAIN SPLIT WORKSPACE ==================== */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row relative overflow-hidden">
        {/* LEFT: DEDICATED 3D DIGITAL TWIN VIEWPORT */}
        <div className="relative flex-1 min-h-[340px] bg-[#1E1E1E] overflow-hidden">
          <div ref={viewportRef} className="w-full h-full" />

          {/* Top-Center Live Telemetry Strip (No backdrop-blur over WebGL) */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 max-w-[94%] pointer-events-none">
            <div className="bg-[#323232]/95 border border-[#4A4A4A] rounded-xl px-3.5 py-2 shadow-lg flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-mono-tech text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FFDB00] text-[#242424]">
                  #{selectedUnit.numberBadge}
                </span>
                <span className="font-bold text-[#F5F3EE] truncate max-w-[180px] sm:max-w-[240px]">
                  {selectedUnit.shortTitle}
                </span>
              </div>
              <div className="font-mono-tech text-[11px] text-[#D6D3CB]">
                Trafik <strong className="text-[#FFDB00]">{simParams.trafficLoadPercent}%</strong>
              </div>
              <div className="font-mono-tech text-[11px] text-[#D6D3CB]">
                UPS{' '}
                <strong className={faults.pduBreakerTrip || faults.upsGridLoss ? 'text-[#FFDB00]' : 'text-emerald-400'}>
                  {upsUnit.metrics.voltageV}V ({upsUnit.metrics.batteryPercent}%)
                </strong>
              </div>
              <span
                className={`font-mono-tech text-[10px] font-bold px-2 py-0.5 rounded ${
                  activeFaultCount > 0 ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {activeFaultCount > 0 ? `${activeFaultCount} GANGGUAN AKTIF` : 'NOMINAL'}
              </span>
            </div>
          </div>

          {/* Collapsible Left Toolbar Rak 3D (matches serverku-nine.vercel.app) */}
          <div className="absolute top-16 left-3 bottom-3 z-10 flex flex-col pointer-events-none max-w-[258px]">
            <button
              type="button"
              onClick={() => setToolbarOpen((v) => !v)}
              className="pointer-events-auto self-start mb-1.5 px-3 py-1.5 rounded-lg bg-[#323232]/95 hover:bg-[#3D3D3D] border border-[#4A4A4A] text-xs font-semibold text-[#F5F3EE] shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-[#FFDB00]" />
              <span>Toolbar Rak 3D</span>
              {toolbarOpen ? <ChevronLeft className="w-3.5 h-3.5 text-[#BDBAB2]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#FFDB00]" />}
            </button>

            {toolbarOpen && (
              <div className="pointer-events-auto flex-1 overflow-y-auto elban-scroll bg-[#323232]/96 text-[#F5F3EE] border border-[#4A4A4A] rounded-xl shadow-xl p-3 space-y-3.5 w-[252px]">
                {/* 1. Timelapse Perakitan & Kabel */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#FFDB00] uppercase tracking-wide mb-1.5">
                    <span>Timelapse Perakitan</span>
                    <span className="font-mono-tech text-[#F5F3EE]">{Math.round(simParams.assemblyProgress * 100)}%</span>
                  </div>
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

                {/* 2. Sudut Kamera */}
                <div className="border-t border-[#454545] pt-2.5">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#FFDB00] uppercase tracking-wide mb-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#FFDB00]" />
                    <span>Sudut Kamera</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(Object.keys(CAMERA_PRESETS) as RackCameraPresetId[]).map((pid) => (
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
                        {CAMERA_PRESETS[pid].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Mode Rendering */}
                <div className="border-t border-[#454545] pt-2.5">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#FFDB00] uppercase tracking-wide mb-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#FFDB00]" />
                    <span>Mode Rendering</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'solid', label: 'Solid' },
                        { id: 'xray', label: 'X-Ray' },
                        { id: 'wireframe', label: 'Wire' },
                      ] as Array<{ id: RackVisualMode; label: string }>
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
                </div>

                {/* 4. Komponen & Casing Toggles */}
                <div className="border-t border-[#454545] pt-2.5">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#FFDB00] uppercase tracking-wide mb-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#FFDB00]" />
                    <span>Komponen & Casing</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { key: 'frontDoorOpen', label: 'Pintu Depan' },
                        { key: 'rearDoorOpen', label: 'Pintu Belakang' },
                        { key: 'sidePanelsDetached', label: 'Panel Samping' },
                        { key: 'kvmConsoleOpen', label: 'Laci LCD KVM' },
                        { key: 'showCables', label: 'Kabel Data' },
                        { key: 'showEnclosure', label: 'Casing Rak' },
                      ] as const
                    ).map((item) => {
                      const active = simParams[item.key];
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() =>
                            setSimParams((prev) => {
                              const nextVal = !prev[item.key];
                              // Auto-open front door if KVM drawer is opened
                              if (item.key === 'kvmConsoleOpen' && nextVal) {
                                return { ...prev, kvmConsoleOpen: true, frontDoorOpen: true };
                              }
                              return { ...prev, [item.key]: nextVal };
                            })
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
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGrid((g) => !g)}
                    className="mt-1.5 w-full py-1 px-2 rounded-md bg-[#262626] hover:bg-[#3D3D3D] border border-[#454545] text-[10px] font-semibold text-[#D6D3CB] cursor-pointer transition-colors"
                  >
                    Grid Lantai 3D: {showGrid ? 'Aktif' : 'Sembunyi'}
                  </button>
                </div>

                {/* 5. Parameter Simulasi Sliders */}
                <div className="border-t border-[#454545] pt-2.5 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-[#D6D3CB]">
                      <span>Exploded View</span>
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
                      <span>Beban Trafik Jaringan</span>
                      <span className="font-mono-tech text-[#FFDB00]">{simParams.trafficLoadPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={simParams.trafficLoadPercent}
                      onChange={(e) =>
                        setSimParams((prev) => ({ ...prev, trafficLoadPercent: Number(e.target.value) }))
                      }
                      className="w-full accent-[#FFDB00] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-[#D6D3CB]">
                      <span>Beban Daya PoE</span>
                      <span className="font-mono-tech text-[#FFDB00]">{simParams.poeDeviceLoadWatts} W</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={350}
                      value={simParams.poeDeviceLoadWatts}
                      onChange={(e) =>
                        setSimParams((prev) => ({ ...prev, poeDeviceLoadWatts: Number(e.target.value) }))
                      }
                      className="w-full accent-[#FFDB00] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-[#D6D3CB]">
                      <span>Suhu Ruang Server</span>
                      <span className="font-mono-tech text-[#FFDB00]">{simParams.ambientTempC}°C</span>
                    </div>
                    <input
                      type="range"
                      min={16}
                      max={35}
                      value={simParams.ambientTempC}
                      onChange={(e) =>
                        setSimParams((prev) => ({ ...prev, ambientTempC: Number(e.target.value) }))
                      }
                      className="w-full accent-[#FFDB00] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom-Center Viewport Controls Hint */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden sm:block">
            <div className="bg-[#323232]/95 border border-[#4A4A4A] text-[#D6D3CB] text-[11px] px-3.5 py-1.5 rounded-lg">
              Drag orbit 360° · Scroll zoom · Klik unit 1–9 untuk fokus & inspeksi · Tombol 1–9 pintasan cepat
            </div>
          </div>
        </div>

        {/* ==================== RIGHT 4-TAB LEARNING & DIAGNOSTIC PANEL ==================== */}
        {rightPanelOpen && (
          <aside className="w-full lg:w-[410px] xl:w-[435px] shrink-0 bg-[#323232] text-[#F5F3EE] border-t lg:border-t-0 lg:border-l border-[#4A4A4A] flex flex-col max-h-[48vh] lg:max-h-none">
            {/* Mobile / Tablet Tab Switcher */}
            <div className="flex lg:hidden border-b border-[#4A4A4A] bg-[#262626] p-1.5 gap-1 overflow-x-auto shrink-0">
              {(
                [
                  { id: 'inspector', label: 'Inspector' },
                  { id: 'quiz', label: 'Kuis' },
                  { id: 'reference', label: 'Ref 42U' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-[#FFDB00] text-[#242424] font-bold'
                      : 'bg-[#323232] text-[#D6D3CB] border border-[#4A4A4A]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto elban-scroll p-4 space-y-4">
              {/* -------------------- TAB 1: INSPECTOR & TELEMETRI -------------------- */}
              {activeTab === 'inspector' && (
                <>
                  {/* 9-Unit Quick Selector Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-[#FFDB00] uppercase tracking-wider">
                        9 Unit Perangkat Rak 42U (Shortcut 1–9)
                      </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {RACK_UNIT_ORDER.map((uid) => {
                        const u = telemetryMap[uid];
                        const active = uid === selectedUnitId;
                        return (
                          <button
                            key={uid}
                            type="button"
                            onClick={() => handleSelectUnit(uid, true)}
                            className={`p-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#FFDB00] border-[#FFDB00] text-[#242424]'
                                : 'bg-[#262626] hover:bg-[#3D3D3D] border-[#454545] text-[#F5F3EE]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`font-mono-tech text-[10px] font-bold ${
                                  active ? 'text-[#242424]' : 'text-[#FFDB00]'
                                }`}
                              >
                                #{u.numberBadge}
                              </span>
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  u.status === 'FAULT'
                                    ? 'bg-rose-500'
                                    : u.status === 'WARNING'
                                      ? 'bg-amber-400'
                                      : 'bg-emerald-500'
                                }`}
                              />
                            </div>
                            <div className={`text-[11px] truncate mt-0.5 ${active ? 'font-bold' : 'font-semibold'}`}>{u.shortTitle}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Unit Header & Telemetry Readouts */}
                  <div className="rounded-xl border border-[#454545] bg-[#262626] p-3.5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono-tech text-[11px] font-semibold text-[#FFDB00]">
                          UNIT #{selectedUnit.numberBadge} · {selectedUnit.rackUnitPosition}
                        </div>
                        <h3 className="font-charm text-lg font-bold text-[#F5F3EE] leading-snug mt-0.5">
                          {selectedUnit.name}
                        </h3>
                      </div>
                      <span
                        className={`font-mono-tech text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${statusBadgeClass(
                          selectedUnit.status
                        )}`}
                      >
                        {selectedUnit.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#D6D3CB] leading-relaxed">{selectedUnit.functionSummary}</p>

                    {/* 4 Live Telemetry KPI Cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#1E1E1E] rounded-lg border border-[#454545] p-2.5">
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-[#BDBAB2] uppercase">
                          <Activity className="w-3 h-3 text-[#FFDB00]" />
                          <span>Beban Kerja</span>
                        </div>
                        <div className="font-mono-tech text-base font-bold text-[#F5F3EE] mt-0.5">
                          {selectedUnit.metrics.loadPercent}%
                        </div>
                      </div>
                      <div className="bg-[#1E1E1E] rounded-lg border border-[#454545] p-2.5">
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-[#BDBAB2] uppercase">
                          <Thermometer className="w-3 h-3 text-[#FFDB00]" />
                          <span>Suhu Kerja</span>
                        </div>
                        <div className="font-mono-tech text-base font-bold text-[#F5F3EE] mt-0.5">
                          {selectedUnit.metrics.temperatureC}°C
                        </div>
                      </div>
                      <div className="bg-[#1E1E1E] rounded-lg border border-[#454545] p-2.5">
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-[#BDBAB2] uppercase">
                          <Zap className="w-3 h-3 text-[#FFDB00]" />
                          <span>
                            {selectedUnit.metrics.voltageV !== undefined
                              ? 'Tegangan AC'
                              : selectedUnit.metrics.throughputGbps !== undefined
                                ? 'Throughput'
                                : 'Port Aktif'}
                          </span>
                        </div>
                        <div className="font-mono-tech text-base font-bold text-[#F5F3EE] mt-0.5">
                          {selectedUnit.metrics.voltageV !== undefined
                            ? `${selectedUnit.metrics.voltageV} V`
                            : selectedUnit.metrics.throughputGbps !== undefined
                              ? `${selectedUnit.metrics.throughputGbps} Gbps`
                              : `${selectedUnit.metrics.activePorts ?? 0}/${selectedUnit.metrics.totalPorts ?? 0}`}
                        </div>
                      </div>
                      <div className="bg-[#1E1E1E] rounded-lg border border-[#454545] p-2.5">
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-[#BDBAB2] uppercase">
                          <Cpu className="w-3 h-3 text-[#FFDB00]" />
                          <span>
                            {selectedUnit.metrics.batteryPercent !== undefined
                              ? 'Baterai UPS'
                              : selectedUnit.metrics.poeWatts !== undefined
                                ? 'Konsumsi Daya'
                                : 'Packet Loss'}
                          </span>
                        </div>
                        <div className="font-mono-tech text-base font-bold text-[#F5F3EE] mt-0.5">
                          {selectedUnit.metrics.batteryPercent !== undefined
                            ? `${selectedUnit.metrics.batteryPercent}%`
                            : selectedUnit.metrics.poeWatts !== undefined
                              ? `${selectedUnit.metrics.poeWatts} W`
                              : `${selectedUnit.metrics.packetLossPercent ?? 0}%`}
                        </div>
                      </div>
                    </div>

                    {/* Technical Specifications */}
                    <div className="bg-[#1E1E1E] rounded-lg border border-[#454545] divide-y divide-[#383838]">
                      {selectedUnit.specs.map((sp) => (
                        <div key={sp.label} className="px-2.5 py-1.5 flex items-start justify-between gap-3 text-[11px]">
                          <span className="text-[#BDBAB2] font-medium shrink-0">{sp.label}</span>
                          <span className="text-[#F5F3EE] font-semibold text-right">{sp.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* KVM 18.5" OSD Multi-Target Switcher */}
                  <div className="rounded-xl border border-[#454545] bg-[#262626] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#F5F3EE]">
                        <Monitor className="w-4 h-4 text-[#FFDB00]" />
                        <span>Kontrol Layar KVM Console 18.5&quot;</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSimParams((prev) => ({
                            ...prev,
                            frontDoorOpen: true,
                            kvmConsoleOpen: !prev.kvmConsoleOpen,
                          }));
                          handleSelectUnit('unit_09', true);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                          simParams.kvmConsoleOpen
                            ? 'bg-[#FFDB00] text-[#242424]'
                            : 'bg-[#323232] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[#F5F3EE]'
                        }`}
                      >
                        {simParams.kvmConsoleOpen ? 'Tutup Laci KVM' : 'Tarik Laci KVM'}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'r360', label: 'CH01: Dell R360' },
                          { id: 'ccr2004', label: 'CH02: CCR2004' },
                          { id: 'crs326', label: 'CH03: CRS326' },
                        ] as Array<{ id: KvmTargetId; label: string }>
                      ).map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            setKvmTarget(ch.id);
                            setSimParams((prev) => ({ ...prev, frontDoorOpen: true, kvmConsoleOpen: true }));
                            handleSelectUnit('unit_09', true);
                          }}
                          className={`py-1.5 px-1.5 rounded-md text-[10px] font-bold cursor-pointer border transition-colors ${
                            kvmTarget === ch.id
                              ? 'bg-[#FFDB00] text-[#242424] border-[#FFDB00]'
                              : 'bg-[#1E1E1E] text-[#D6D3CB] border-[#454545] hover:bg-[#3D3D3D]'
                          }`}
                        >
                          {ch.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fault Injection Controls */}
                  <div className="rounded-xl border border-[#454545] bg-[#262626] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#F5F3EE]">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Injeksi Gangguan (Fault Injection)</span>
                      </div>
                      {activeFaultCount > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllFaults}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Pulihkan Semua
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {FAULT_ITEMS.map((fi) => {
                        const active = faults[fi.key];
                        return (
                          <button
                            key={fi.key}
                            type="button"
                            onClick={() => handleToggleFault(fi.key, fi.focusUnit)}
                            className={`w-full text-left p-2 rounded-lg border transition-colors cursor-pointer ${
                              active
                                ? 'bg-rose-950/60 border-rose-500/70 text-rose-100'
                                : 'bg-[#1E1E1E] hover:bg-[#3D3D3D] border-[#454545] text-[#F5F3EE]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold">{fi.label}</span>
                              <span
                                className={`font-mono-tech text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  active ? 'bg-rose-600 text-white' : 'bg-[#323232] text-[#FFDB00]'
                                }`}
                              >
                                {active ? 'AKTIF' : 'PICU'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#BDBAB2] mt-0.5 leading-snug">{fi.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Walk-In ElBan Logbook Sync Strip (Preserves Curriculum Progress) */}
                  <div className="rounded-xl border border-[#FFDB00]/45 bg-[#3D3A28] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#FFDB00]">
                        Logbook Praktikum Ruang Server ElBan
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenLegacyEquipment('sys-cctv-pids', 'comp-cctv-nvr');
                        }}
                        className="text-[11px] font-semibold text-[#FFDB00] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>Bedah NVR</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {SERVER_ROOM_ELBAN_COMPONENTS.map((item) => {
                        const logged = loggedComponentIds.includes(item.componentId);
                        const comp = COMPONENT_MAP[item.componentId];
                        return (
                          <button
                            key={item.componentId}
                            type="button"
                            onClick={() => onLogComponent(item.componentId)}
                            className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-between gap-1 cursor-pointer transition-colors ${
                              logged
                                ? 'bg-emerald-950/65 border-emerald-500/70 text-emerald-200'
                                : 'bg-[#262626] hover:bg-[#323232] border-[#FFDB00]/35 text-[#F5F3EE]'
                            }`}
                          >
                            <span className="truncate">{item.shortLabel}</span>
                            {logged ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <span className="font-mono-tech text-[10px] text-[#FFDB00] shrink-0">
                                +{comp?.xpReward ?? 10}XP
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* -------------------- TAB 2: KUIS DIAGNOSTIK -------------------- */}
              {activeTab === 'quiz' && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-[#262626] border border-[#FFDB00]/45 text-[#F5F3EE] p-3.5 flex items-center justify-between">
                    <div>
                      <div className="font-mono-tech text-[10px] text-[#FFDB00] font-semibold">
                        EVALUASI BERBASIS SKENARIO 3D
                      </div>
                      <h3 className="font-charm text-lg font-bold text-[#F5F3EE] mt-0.5">Kuis Diagnostik 42U Network Rack</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuizAnswers({})}
                      className="px-2.5 py-1 rounded-md bg-[#323232] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[11px] font-semibold text-[#F5F3EE] cursor-pointer"
                    >
                      Ulangi
                    </button>
                  </div>

                  {RACK_DIAGNOSTIC_QUIZ.map((q) => {
                    const selected = quizAnswers[q.id];
                    const isCorrect = selected === q.correctOptionId;
                    return (
                      <div key={q.id} className="rounded-xl border border-[#454545] bg-[#262626] p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-[#F5F3EE]">{q.title}</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setFaults(q.presetFaultToApply);
                              handleSelectUnit(q.requiredComponentFocus, true);
                            }}
                            className="px-2.5 py-1 rounded-md bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424] text-[10px] font-bold shrink-0 cursor-pointer transition-colors"
                          >
                            Terapkan ke 3D
                          </button>
                        </div>

                        <p className="text-[11px] text-[#D6D3CB] bg-[#1E1E1E] border border-[#454545] rounded-lg p-2">
                          {q.scenarioDescription}
                        </p>
                        <p className="text-xs font-semibold text-[#F5F3EE] leading-snug">{q.questionText}</p>

                        <div className="space-y-1.5">
                          {q.options.map((opt) => {
                            const picked = selected === opt.id;
                            const correctChoice = opt.id === q.correctOptionId;
                            let cls = 'bg-[#1E1E1E] hover:bg-[#3D3D3D] border-[#454545] text-[#F5F3EE]';
                            if (selected) {
                              if (correctChoice) cls = 'bg-emerald-950/65 border-emerald-500 text-emerald-200 font-semibold';
                              else if (picked) cls = 'bg-rose-950/65 border-rose-500 text-rose-200';
                            }
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                                className={`w-full text-left p-2 rounded-lg border text-[11px] leading-snug cursor-pointer transition-colors ${cls}`}
                              >
                                <span className="font-mono-tech font-bold uppercase mr-1.5 text-[#FFDB00]">{opt.id}.</span>
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {selected && (
                          <div
                            className={`rounded-lg p-2.5 text-[11px] leading-relaxed border ${
                              isCorrect
                                ? 'bg-emerald-950/55 border-emerald-500/60 text-emerald-200'
                                : 'bg-[#3D3A28] border-[#FFDB00]/50 text-[#F5F3EE]'
                            }`}
                          >
                            <strong className="text-[#FFDB00]">{isCorrect ? 'Jawaban Tepat:' : 'Pembahasan:'}</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* -------------------- TAB 4: REFERENSI 42U -------------------- */}
              {activeTab === 'reference' && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-[#262626] border border-[#FFDB00]/45 text-[#F5F3EE] p-3.5">
                    <div className="font-mono-tech text-[10px] text-[#FFDB00] font-semibold">
                      STANDAR EIA-310 & TIA-569
                    </div>
                    <h3 className="font-charm text-lg font-bold text-[#F5F3EE] mt-0.5">Referensi Arsitektur Rak Server 42U</h3>
                  </div>

                  <div className="rounded-xl border border-[#454545] bg-[#262626] p-3 space-y-2 text-xs text-[#D6D3CB] leading-relaxed">
                    <p>
                      <strong className="text-[#FFDB00]">1. Standar Dimensi 42U (EIA-310):</strong> 1U = 44,45 mm (1,75&quot;), lebar rel pemasangan
                      standar 19 inci (482,6 mm). Perangkat berat seperti APC Smart-UPS C 3000VA (41 kg) ditempatkan di
                      dasar rak (06U–07U) untuk menjaga stabilitas pusat gravitasi.
                    </p>
                    <p>
                      <strong className="text-[#FFDB00]">2. Cold-Aisle / Hot-Aisle & 4-Fan Roof Exhaust:</strong> Udara dingin masuk melalui sisi
                      depan dan pintu berlubang, mendinginkan sasis MikroTik & Dell PowerEdge R360, lalu udara panas
                      dibuang ke belakang dan ke atas oleh 4 kipas aktif pada atap kabinet.
                    </p>
                    <p>
                      <strong className="text-[#FFDB00]">3. Manajemen Kabel TIA-569 & Grounding:</strong> Kanal 1U horizontal (36U–37U & 28U–29U)
                      menjaga bend radius Cat6A ≥ 4× diameter kabel serta memisahkan jalur data dari jalur AC 230V.
                      Busbar tembaga vertikal membumikan seluruh sasis rak untuk proteksi ESD & petir.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#454545] bg-[#262626] overflow-hidden">
                    <div className="bg-[#1E1E1E] px-3 py-2 text-[11px] font-bold text-[#FFDB00] uppercase border-b border-[#454545]">
                      Peta Topologi 9 Unit Rak 42U (Atas → Bawah)
                    </div>
                    <div className="divide-y divide-[#383838]">
                      {RACK_UNIT_ORDER.map((uid) => {
                        const u = telemetryMap[uid];
                        return (
                          <button
                            key={uid}
                            type="button"
                            onClick={() => {
                              setActiveTab('inspector');
                              handleSelectUnit(uid, true);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-[#3D3D3D] flex items-center justify-between gap-2 cursor-pointer transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#F5F3EE] truncate">
                                #{u.numberBadge} {u.shortTitle}
                              </div>
                              <div className="text-[10px] text-[#BDBAB2] font-mono-tech">{u.rackUnitPosition}</div>
                            </div>
                            <span className="text-[10px] font-bold text-[#FFDB00] shrink-0">Inspeksi →</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

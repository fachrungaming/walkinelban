import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FastForward,
  Layers,
  MousePointerClick,
  Server,
} from 'lucide-react';
import { DirectoryView } from './components/DirectoryView';
import { EquipmentInspectorModal } from './components/EquipmentInspectorModal';
import { PasControllerPanel } from './components/PasControllerPanel';
import { ServerRackDigitalTwinModal } from './components/ServerRackDigitalTwinModal';
import { TOCEvaluationModal } from './components/TOCEvaluationModal';
import { LIGHT_CIRCUIT_META, TopHeader } from './components/TopHeader';
import {
  COMPONENT_MAP,
  SUBSYSTEM_LAYER_LABELS,
  SUBSYSTEM_LAYERS,
  SYSTEM_MAP,
} from './data/curriculum';
import { ZONE_MAP } from './data/zones';
import { AirportSceneController } from './three/AirportScene';
import {
  AssessmentAttempt,
  ElectronicComponent,
  HoverTelemetryData,
  Language,
  LearningProgressState,
  LightCircuitId,
  LightCircuitState,
  SubsystemLayer,
  SystemId,
  TimeOfDayMode,
  ZoneId,
} from './types/elban';
import {
  PasBroadcastMode,
  playLogbookConfirm,
  playSwitchClick,
  stopPasBroadcast,
} from './utils/audioSynth';

const STORAGE_KEY = 'walkin_elban_progress_v1';

const DEFAULT_PROGRESS: LearningProgressState = {
  loggedComponentIds: [],
  completedSimulations: [],
  totalXp: 0,
  lastVisitedZoneId: 'lobby',
};

function loadSavedProgress(): LearningProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<LearningProgressState>;
    return {
      loggedComponentIds: Array.isArray(parsed.loggedComponentIds) ? parsed.loggedComponentIds : [],
      completedSimulations: Array.isArray(parsed.completedSimulations) ? parsed.completedSimulations : [],
      totalXp: typeof parsed.totalXp === 'number' ? parsed.totalXp : 0,
      lastVisitedZoneId: parsed.lastVisitedZoneId ?? 'lobby',
      lastAssessment: parsed.lastAssessment,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export default function App() {
  const [lang, setLang] = useState<Language>('id');
  const [viewMode, setViewMode] = useState<'3d' | 'directory'>('3d');
  const [currentZoneId, setCurrentZoneId] = useState<ZoneId>('lobby');
  const [introPlaying, setIntroPlaying] = useState(true);
  const [introTourZoneId, setIntroTourZoneId] = useState<ZoneId>('lobby');
  const [progress, setProgress] = useState<LearningProgressState>(loadSavedProgress);
  const [hoverTelemetry, setHoverTelemetry] = useState<HoverTelemetryData | null>(null);
  const [activeLayerFilter, setActiveLayerFilter] = useState<SubsystemLayer | 'ALL'>('ALL');
  const [dockExpanded, setDockExpanded] = useState(true);
  const [zoneToast, setZoneToast] = useState<string | null>(null);
  const [webglFallback, setWebglFallback] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayMode>('day');
  const [lightCircuits, setLightCircuits] = useState<LightCircuitState>({
    lobby_concourse: true,
    scp_baggage: true,
    restricted_server: true,
    toc: true,
    exterior: true,
  });

  // Active modals
  const [inspectedTarget, setInspectedTarget] = useState<{
    systemId: SystemId;
    componentId?: string;
  } | null>(null);
  const [tocModalOpen, setTocModalOpen] = useState(false);
  const [serverRackModalOpen, setServerRackModalOpen] = useState(false);

  const canvasHostRef = useRef<HTMLDivElement>(null);
  const sceneCtrlRef = useRef<AirportSceneController | null>(null);
  const langRef = useRef<Language>(lang);
  langRef.current = lang;
  const toastTimerRef = useRef<number | null>(null);

  // Persist progress to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota errors
    }
  }, [progress]);

  const showZoneToast = useCallback((zoneId: ZoneId) => {
    const zone = ZONE_MAP[zoneId];
    if (!zone) return;
    setZoneToast(langRef.current === 'id' ? zone.toastMessage_id : zone.toastMessage_en);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setZoneToast(null), 5000);
  }, []);

  // Mount persistent 3D Airport Scene once
  useEffect(() => {
    if (!canvasHostRef.current) return;
    try {
      const ctrl = new AirportSceneController(canvasHostRef.current, {
        onZoneChange: (zoneId) => {
          setCurrentZoneId(zoneId);
          setProgress((prev) => ({ ...prev, lastVisitedZoneId: zoneId }));
          showZoneToast(zoneId);
        },
        onIntroStateChange: (playing) => {
          setIntroPlaying(playing);
        },
        onIntroZoneChange: (zoneId) => {
          setIntroTourZoneId(zoneId);
        },
        onHoverTelemetry: (data) => {
          setHoverTelemetry(data);
        },
        onSelectSystem: (systemId, componentId) => {
          setHoverTelemetry(null);
          setInspectedTarget({ systemId, componentId });
        },
        onOpenTocModal: () => {
          setHoverTelemetry(null);
          setTocModalOpen(true);
        },
        onOpenServerRackTwin: () => {
          setHoverTelemetry(null);
          setServerRackModalOpen(true);
        },
        onToggleLightCircuit: (circuitId) => {
          setLightCircuits((prev) => {
            const nextVal = !prev[circuitId];
            playSwitchClick(nextVal);
            return { ...prev, [circuitId]: nextVal };
          });
        },
        onContextLost: () => {
          setWebglFallback(true);
        },
      });
      sceneCtrlRef.current = ctrl;
      return () => {
        stopPasBroadcast();
        ctrl.dispose();
        sceneCtrlRef.current = null;
      };
    } catch {
      setWebglFallback(true);
    }
  }, [showZoneToast]);

  // Sync subsystem 3D layer filter
  useEffect(() => {
    sceneCtrlRef.current?.setSubsystemLayerFilter(activeLayerFilter);
  }, [activeLayerFilter]);

  // Sync Day / Night Mode to 3D Scene
  useEffect(() => {
    sceneCtrlRef.current?.setTimeOfDay(timeOfDay);
  }, [timeOfDay]);

  // Sync 5-Circuit Room Light Switches to 3D Scene
  useEffect(() => {
    sceneCtrlRef.current?.setLightCircuits(lightCircuits);
  }, [lightCircuits]);

  const handleToggleTimeOfDay = useCallback(() => {
    setTimeOfDay((prev) => {
      const next: TimeOfDayMode = prev === 'day' ? 'night' : 'day';
      playSwitchClick(next === 'night');
      return next;
    });
  }, []);

  const handleToggleLightCircuit = useCallback((circuitId: LightCircuitId) => {
    setLightCircuits((prev) => {
      const nextVal = !prev[circuitId];
      playSwitchClick(nextVal);
      return { ...prev, [circuitId]: nextVal };
    });
  }, []);

  const handleSetAllLights = useCallback((on: boolean) => {
    playSwitchClick(on);
    setLightCircuits({
      lobby_concourse: on,
      scp_baggage: on,
      restricted_server: on,
      toc: on,
      exterior: on,
    });
  }, []);

  // Keyboard shortcuts: 'H' toggle bottom dock, 'N' toggle Day/Night Mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (e.key === 'h' || e.key === 'H') {
        setDockExpanded((v) => !v);
      } else if (e.key === 'n' || e.key === 'N') {
        handleToggleTimeOfDay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleToggleTimeOfDay]);

  const handleSelectZone = useCallback(
    (zoneId: ZoneId) => {
      setViewMode('3d');
      setInspectedTarget(null);
      setCurrentZoneId(zoneId);
      sceneCtrlRef.current?.teleportToZone(zoneId);
      showZoneToast(zoneId);
      if (zoneId === 'toc') {
        window.setTimeout(() => setTocModalOpen(true), 650);
      }
    },
    [showZoneToast]
  );

  const handleLogComponent = useCallback((componentId: string) => {
    const comp = COMPONENT_MAP[componentId];
    if (!comp) return;
    playLogbookConfirm();
    setProgress((prev) => {
      if (prev.loggedComponentIds.includes(componentId)) return prev;
      return {
        ...prev,
        loggedComponentIds: [...prev.loggedComponentIds, componentId],
        totalXp: prev.totalXp + comp.xpReward,
      };
    });
  }, []);

  const handleSimulationCompleted = useCallback((systemId: SystemId) => {
    setProgress((prev) => {
      if (prev.completedSimulations.includes(systemId)) return prev;
      return {
        ...prev,
        completedSimulations: [...prev.completedSimulations, systemId],
        totalXp: prev.totalXp + 15,
      };
    });
  }, []);

  const handlePasBroadcastStateChange = useCallback(
    (activeZones: ZoneId[], mode: PasBroadcastMode | 'idle') => {
      sceneCtrlRef.current?.setPasBroadcastState(activeZones, mode);
    },
    []
  );

  const handleLocateComponentIn3D = useCallback(
    (component: ElectronicComponent) => {
      setViewMode('3d');
      setTocModalOpen(false);
      setInspectedTarget(null);
      setActiveLayerFilter(component.subsystemLayer);
      if (component.zoneId === 'server' || component.zoneId === 'baggage') {
        sceneCtrlRef.current?.teleportToZone(component.zoneId);
        setCurrentZoneId(component.zoneId);
        showZoneToast(component.zoneId);
      } else {
        sceneCtrlRef.current?.focusEquipmentSystem(component.systemId);
        setCurrentZoneId(component.zoneId);
        showZoneToast(component.zoneId);
      }
    },
    [showZoneToast]
  );

  const handleAssessmentComplete = useCallback((attempt: AssessmentAttempt) => {
    setProgress((prev) => ({
      ...prev,
      totalXp: prev.totalXp + attempt.earnedXp,
      lastAssessment: attempt,
    }));
  }, []);

  const handleResetProgress = useCallback(() => {
    setProgress(DEFAULT_PROGRESS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const hoverSystem = hoverTelemetry ? SYSTEM_MAP[hoverTelemetry.systemId] : null;
  const hoverComponent =
    hoverTelemetry?.componentId ? COMPONENT_MAP[hoverTelemetry.componentId] : null;
  const hoverIsLogged = hoverComponent
    ? progress.loggedComponentIds.includes(hoverComponent.id)
    : false;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#323232] text-[#F5F3EE] select-none font-seasons">
      {/* Persistent Top Header */}
      <TopHeader
        lang={lang}
        onToggleLang={setLang}
        viewMode={viewMode}
        onSetViewMode={(mode) => {
          setViewMode(mode);
          setHoverTelemetry(null);
        }}
        currentZoneId={currentZoneId}
        onSelectZone={handleSelectZone}
        timeOfDay={timeOfDay}
        onToggleTimeOfDay={handleToggleTimeOfDay}
        lightCircuits={lightCircuits}
        onToggleLightCircuit={handleToggleLightCircuit}
        onSetAllLights={handleSetAllLights}
      />

      {/* Dedicated WebGL 3D Airport Viewport Container */}
      <div
        ref={canvasHostRef}
        className={`fixed inset-0 z-0 ${viewMode === 'directory' ? 'invisible pointer-events-none' : 'visible'}`}
      />

      {/* WebGL Context Lost / Unavailable Graceful Fallback */}
      {webglFallback && viewMode === '3d' && (
        <div className="fixed inset-0 z-10 bg-[#323232] text-[#F5F3EE] flex flex-col items-center justify-center p-6 text-center">
          <h2 className="font-charm text-2xl sm:text-3xl font-bold text-[#F5F3EE]">
            <span className="marker-highlight-full">
              {lang === 'id' ? 'Mode Direktori 2D Tersedia' : '2D Directory Fallback Available'}
            </span>
          </h2>
          <p className="text-sm text-[#D6D3CB] mt-2 max-w-md">
            {lang === 'id'
              ? 'Konteks WebGL 3D sedang tidak aktif pada perangkat ini. Anda tetap dapat mempelajari seluruh 26 komponen ElBan dan mengikuti evaluasi TOC melalui Mode Direktori.'
              : 'WebGL 3D context is unavailable on this device. You can still study all 26 ElBan components and complete the TOC assessment via Directory Mode.'}
          </p>
          <button
            type="button"
            onClick={() => setViewMode('directory')}
            className="mt-5 px-5 py-2.5 rounded-lg bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424] text-sm font-bold cursor-pointer transition-colors"
          >
            {lang === 'id' ? 'Buka Mode Direktori 2D' : 'Open 2D Directory Mode'}
          </button>
        </div>
      )}

      {/* ==================== 3D MODE HUD OVERLAYS ==================== */}
      {viewMode === '3d' && !webglFallback && (
        <>
          {/* Contextual Zone Toast (Top-Center below Header) */}
          {zoneToast && !introPlaying && !inspectedTarget && !tocModalOpen && !serverRackModalOpen && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 max-w-[92vw] pointer-events-none">
              <div className="bg-[#323232]/96 text-[#F5F3EE] text-xs sm:text-sm font-medium px-4 py-2 rounded-lg border border-[#FFDB00]/45 shadow-lg text-center">
                <span key={zoneToast} className="marker-highlight-multiline">
                  {zoneToast}
                </span>
              </div>
            </div>
          )}

          {/* Contextual Server Room Quick-Launch Button for 42U Digital Twin */}
          {currentZoneId === 'server' && !introPlaying && !inspectedTarget && !tocModalOpen && !serverRackModalOpen && (
            <div className="fixed top-20 right-4 z-20">
              <button
                type="button"
                onClick={() => setServerRackModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424] text-xs sm:text-sm font-bold shadow-lg border border-[#FFDB00] flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Server className="w-4 h-4" />
                <span>
                  {lang === 'id'
                    ? 'Buka 42U Rak Server Digital Twin'
                    : 'Open 42U Server Rack Digital Twin'}
                </span>
              </button>
            </div>
          )}

          {/* Cinematic Intro Overlay with Skip Button */}
          {introPlaying && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 px-4 text-center">
              <div className="bg-[#323232]/95 text-[#F5F3EE] px-6 py-4 rounded-xl border border-[#FFDB00]/45 shadow-2xl max-w-xl w-full">
                <div className="font-mono-tech text-[11px] text-[#FFDB00] tracking-wider">
                  <span className="marker-highlight-underline">
                    Walk-In ElBan · Virtual Airport Site Visit
                  </span>
                </div>
                <div className="font-charm text-xl sm:text-2xl font-bold text-white mt-1.5 leading-snug">
                  <span className="marker-highlight-multiline marker-delay-1">
                    {lang === 'id'
                      ? 'Jelajahi 9 Zona Terminal & Bedah 6 Sistem Elektronika Bandara'
                      : 'Explore 9 Terminal Zones & Dissect 6 Airport Electronics Systems'}
                  </span>
                </div>
                <div className="text-sm text-[#D6D3CB] mt-2">
                  <span>{lang === 'id' ? 'Menjelajahi: ' : 'Exploring: '}</span>
                  <span
                    key={introTourZoneId}
                    className="marker-highlight font-bold"
                  >
                    {lang === 'id'
                      ? ZONE_MAP[introTourZoneId]?.name_id
                      : ZONE_MAP[introTourZoneId]?.name_en}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => sceneCtrlRef.current?.skipIntro()}
                className="px-5 py-2.5 rounded-lg bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424] text-sm font-bold shadow-lg border border-[#FFDB00] flex items-center gap-2 cursor-pointer transition-colors"
              >
                <FastForward className="w-4 h-4 text-[#242424]" />
                <span>{lang === 'id' ? 'Lewati intro' : 'Skip intro'}</span>
              </button>
            </div>
          )}

          {/* Hover Technical Telemetry Tooltip */}
          {hoverTelemetry && !inspectedTarget && !tocModalOpen && !serverRackModalOpen && !introPlaying && (
            <div
              className="fixed z-30 pointer-events-none bg-[#323232]/96 border border-[#FFDB00]/45 rounded-xl shadow-2xl px-3.5 py-2.5 w-64 text-[#F5F3EE]"
              style={{
                left: Math.min(hoverTelemetry.screenX + 16, window.innerWidth - 280),
                top: Math.min(hoverTelemetry.screenY + 16, window.innerHeight - 140),
              }}
            >
              {hoverTelemetry.lightSwitchCircuitId ? (
                (() => {
                  const meta = LIGHT_CIRCUIT_META.find((m) => m.id === hoverTelemetry.lightSwitchCircuitId);
                  const isOn = lightCircuits[hoverTelemetry.lightSwitchCircuitId];
                  return (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono-tech font-semibold text-[#FFDB00]">
                          {lang === 'id' ? 'Saklar Lampu 3D' : '3D Light Switch'}
                        </span>
                        <span
                          className={`font-mono-tech font-bold ${
                            isOn ? 'text-[#FFDB00]' : 'text-[#A8A59E]'
                          }`}
                        >
                          {isOn ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <div className="font-charm text-base font-bold text-white mt-0.5">
                        <span key={hoverTelemetry.lightSwitchCircuitId} className="marker-highlight-multiline">
                          {meta ? (lang === 'id' ? meta.name_id : meta.name_en) : ''}
                        </span>
                      </div>
                      <div className="text-xs text-[#D6D3CB] mt-1 flex items-center gap-1">
                        <MousePointerClick className="w-3.5 h-3.5 text-[#FFDB00]" />
                        <span>
                          {lang === 'id'
                            ? isOn
                              ? 'Klik untuk mematikan lampu ruangan'
                              : 'Klik untuk menyalakan lampu ruangan'
                            : isOn
                              ? 'Click to switch room light OFF'
                              : 'Click to switch room light ON'}
                        </span>
                      </div>
                    </>
                  );
                })()
              ) : hoverTelemetry.isServerRackTwin ? (
                <>
                  <div className="font-mono-tech text-[11px] font-semibold text-[#FFDB00]">
                    Zona 07 · Rak Server 42U
                  </div>
                  <div className="font-charm text-base font-bold text-white mt-0.5">
                    <span key="rack-twin-hover" className="marker-highlight-multiline">
                      42U Network Rack Digital Twin
                    </span>
                  </div>
                  <div className="text-xs text-[#D6D3CB] mt-0.5">
                    MikroTik CRS326 · CCR2004 · KVM 18.5&quot; · Dell R360 · APC 3000VA · PDU
                  </div>
                  <div className="text-xs text-[#FFDB00] font-semibold mt-1.5 flex items-center gap-1">
                    <MousePointerClick className="w-3.5 h-3.5 text-[#FFDB00]" />
                    <span>
                      {lang === 'id'
                        ? 'Klik untuk membuka 42U Digital Twin'
                        : 'Click to open 42U Digital Twin'}
                    </span>
                  </div>
                </>
              ) : hoverTelemetry.isTocConsole ? (
                <>
                  <div className="font-mono-tech text-[11px] font-semibold text-[#FFDB00]">
                    Zona 09 · Ruang TOC
                  </div>
                  <div className="font-charm text-base font-bold text-white mt-0.5">
                    <span key="toc-console-hover" className="marker-highlight-multiline">
                      {lang === 'id' ? 'Meja Evaluasi & Logbook TOC' : 'TOC Evaluation & Logbook Desk'}
                    </span>
                  </div>
                  <div className="text-xs text-[#D6D3CB] mt-1 flex items-center gap-1">
                    <MousePointerClick className="w-3.5 h-3.5 text-[#FFDB00]" />
                    <span>{lang === 'id' ? 'Klik untuk membuka Uji Kompetensi' : 'Click to open Competency Test'}</span>
                  </div>
                </>
              ) : (
                hoverSystem && (
                  <>
                    <div className="flex items-center justify-between text-[11px] text-[#B8B5AE]">
                      <span className="font-mono-tech font-semibold text-[#FFDB00]">
                        {hoverSystem.code} · {hoverSystem.shortLabel}
                      </span>
                      {hoverComponent && (
                        <span className={hoverIsLogged ? 'text-emerald-400 font-semibold' : 'text-[#FFDB00] font-medium'}>
                          {hoverIsLogged
                            ? lang === 'id' ? 'Di Logbook' : 'Logged'
                            : lang === 'id' ? 'Belum dipelajari' : 'Not logged'}
                        </span>
                      )}
                    </div>
                    <div className="font-charm text-base font-bold text-white mt-0.5 leading-snug">
                      <span
                        key={hoverComponent ? hoverComponent.id : hoverSystem.id}
                        className="marker-highlight-multiline"
                      >
                        {hoverComponent
                          ? lang === 'id' ? hoverComponent.name_id : hoverComponent.name_en
                          : lang === 'id' ? hoverSystem.name_id : hoverSystem.name_en}
                      </span>
                    </div>
                    {hoverComponent && (
                      <div className="text-xs text-[#D6D3CB] mt-0.5">
                        {lang === 'id'
                          ? SUBSYSTEM_LAYER_LABELS[hoverComponent.subsystemLayer].id
                          : SUBSYSTEM_LAYER_LABELS[hoverComponent.subsystemLayer].en}
                      </div>
                    )}
                    <div className="text-xs text-[#FFDB00] font-semibold mt-1.5 flex items-center gap-1">
                      <MousePointerClick className="w-3.5 h-3.5" />
                      <span>{lang === 'id' ? 'Klik untuk inspeksi 3D & simulasi' : 'Click for 3D dissection & simulation'}</span>
                    </div>
                  </>
                )
              )}
            </div>
          )}

          {/* Unified Collapsible Bottom Control Dock (Subsystem Filter + Walk Controls Hint) */}
          {!introPlaying && !inspectedTarget && !tocModalOpen && !serverRackModalOpen && (
            <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-[min(860px,92vw)]">
              <button
                type="button"
                onClick={() => setDockExpanded((v) => !v)}
                className="mb-1.5 px-3 py-1 rounded-md bg-[#323232]/95 hover:bg-[#3D3D3D] border border-[#4A4A4A] text-xs font-semibold text-[#F5F3EE] shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {dockExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#FFDB00]" /> : <ChevronUp className="w-3.5 h-3.5 text-[#FFDB00]" />}
                <span>
                  {dockExpanded
                    ? lang === 'id' ? 'Sembunyikan Kontrol (H)' : 'Hide Controls (H)'
                    : lang === 'id' ? 'Tampilkan Filter Subsistem (H)' : 'Show Subsystem Filter (H)'}
                </span>
              </button>

              {dockExpanded && (
                <div className="bg-[#323232]/96 border border-[#4A4A4A] rounded-xl shadow-2xl px-3.5 py-2.5 flex flex-col gap-2 w-full">
                  {/* Subsystem Layer Filter Bar */}
                  <div className="flex items-center gap-1.5 overflow-x-auto elban-scroll">
                    <span className="text-xs font-semibold text-[#D6D3CB] flex items-center gap-1 mr-1 whitespace-nowrap shrink-0">
                      <Layers className="w-3.5 h-3.5 text-[#FFDB00]" />
                      <span>{lang === 'id' ? 'Lapisan 3D:' : '3D Layer:'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveLayerFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        activeLayerFilter === 'ALL'
                          ? 'bg-[#FFDB00] text-[#242424] font-bold'
                          : 'bg-[#262626] text-[#E6E3DC] hover:bg-[#3D3D3D]'
                      }`}
                    >
                      {lang === 'id' ? 'Semua' : 'All'}
                    </button>
                    {SUBSYSTEM_LAYERS.map((layer) => {
                      const active = activeLayerFilter === layer;
                      return (
                        <button
                          key={layer}
                          type="button"
                          onClick={() => setActiveLayerFilter(layer)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                            active
                              ? 'bg-[#FFDB00] text-[#242424] font-bold'
                              : 'bg-[#262626] text-[#E6E3DC] hover:bg-[#3D3D3D]'
                          }`}
                        >
                          {lang === 'id' ? SUBSYSTEM_LAYER_LABELS[layer].id : SUBSYSTEM_LAYER_LABELS[layer].en}
                        </button>
                      );
                    })}
                  </div>

                  {/* First-Person Navigation Hint */}
                  <div className="text-xs text-[#C4C1B9] text-center border-t border-[#454545] pt-1.5 truncate">
                    {lang === 'id'
                      ? 'Geser untuk menoleh · W A S D atau scroll untuk jalan · Klik lantai untuk pindah · Klik peralatan untuk bedah 3D'
                      : 'Drag to look around · W A S D or scroll to walk · Click floor to move · Click equipment for 3D dissection'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom-Left Collapsible PAS Zone Audio Matrix Controller */}
          {!introPlaying && !inspectedTarget && !tocModalOpen && !serverRackModalOpen && (
            <PasControllerPanel
              lang={lang}
              currentZoneId={currentZoneId}
              onTeleportZone={handleSelectZone}
              onBroadcastStateChange={handlePasBroadcastStateChange}
              onSimulationCompleted={() => handleSimulationCompleted('sys-pas')}
            />
          )}

        </>
      )}

      {/* ==================== 2D TECHNICAL DIRECTORY VIEW ==================== */}
      {viewMode === 'directory' && (
        <DirectoryView
          lang={lang}
          loggedComponentIds={progress.loggedComponentIds}
          onBackTo3D={() => setViewMode('3d')}
          onInspectComponent={(systemId, componentId) =>
            setInspectedTarget({ systemId, componentId })
          }
          onLocateIn3D={handleLocateComponentIn3D}
          onQuickLogComponent={handleLogComponent}
        />
      )}

      {/* ==================== 3D EQUIPMENT INSPECTOR MODAL ==================== */}
      {inspectedTarget && (
        <EquipmentInspectorModal
          systemId={inspectedTarget.systemId}
          initialComponentId={inspectedTarget.componentId}
          lang={lang}
          loggedComponentIds={progress.loggedComponentIds}
          onLogComponent={handleLogComponent}
          onSimulationCompleted={handleSimulationCompleted}
          onClose={() => setInspectedTarget(null)}
        />
      )}

      {/* ==================== 42U SERVER RACK DIGITAL TWIN MODAL ==================== */}
      {serverRackModalOpen && (
        <ServerRackDigitalTwinModal
          lang={lang}
          isNightMode={timeOfDay === 'night'}
          loggedComponentIds={progress.loggedComponentIds}
          onLogComponent={handleLogComponent}
          onOpenLegacyEquipment={(systemId, componentId) =>
            setInspectedTarget({ systemId, componentId })
          }
          onClose={() => setServerRackModalOpen(false)}
        />
      )}

      {/* ==================== TOC 3-STEP EVALUATION MODAL ==================== */}
      {tocModalOpen && (
        <TOCEvaluationModal
          lang={lang}
          loggedComponentIds={progress.loggedComponentIds}
          totalXp={progress.totalXp}
          onJumpToComponentIn3D={handleLocateComponentIn3D}
          onAssessmentComplete={handleAssessmentComplete}
          onResetProgress={handleResetProgress}
          onClose={() => setTocModalOpen(false)}
        />
      )}
    </div>
  );
}

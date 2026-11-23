import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FastForward,
  Layers,
  MousePointerClick,
} from 'lucide-react';
import { DirectoryView } from './components/DirectoryView';
import { EquipmentInspectorModal } from './components/EquipmentInspectorModal';
import { LogbookTrackerHUD } from './components/LogbookTrackerHUD';
import { PasControllerPanel } from './components/PasControllerPanel';
import { TOCEvaluationModal } from './components/TOCEvaluationModal';
import { TopHeader } from './components/TopHeader';
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
  SubsystemLayer,
  SystemId,
  ZoneId,
} from './types/elban';
import { PasBroadcastMode, playLogbookConfirm, stopPasBroadcast } from './utils/audioSynth';

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
  const [progress, setProgress] = useState<LearningProgressState>(loadSavedProgress);
  const [hoverTelemetry, setHoverTelemetry] = useState<HoverTelemetryData | null>(null);
  const [activeLayerFilter, setActiveLayerFilter] = useState<SubsystemLayer | 'ALL'>('ALL');
  const [dockExpanded, setDockExpanded] = useState(true);
  const [zoneToast, setZoneToast] = useState<string | null>(null);
  const [recentLogFlash, setRecentLogFlash] = useState<string | null>(null);
  const [webglFallback, setWebglFallback] = useState(false);

  // Active modals
  const [inspectedTarget, setInspectedTarget] = useState<{
    systemId: SystemId;
    componentId?: string;
  } | null>(null);
  const [tocModalOpen, setTocModalOpen] = useState(false);

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

  // Keyboard shortcut 'H' to toggle bottom dock Zen mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (e.key === 'h' || e.key === 'H') {
        setDockExpanded((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  const handleOpenTocLogbook = useCallback(() => {
    setViewMode('3d');
    setInspectedTarget(null);
    setCurrentZoneId('toc');
    sceneCtrlRef.current?.teleportToZone('toc');
    setTocModalOpen(true);
  }, []);

  const handleLogComponent = useCallback(
    (componentId: string) => {
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
      setRecentLogFlash(
        lang === 'id'
          ? `+${comp.xpReward} XP · ${comp.code} disimpan ke Logbook`
          : `+${comp.xpReward} XP · ${comp.code} saved to Logbook`
      );
      window.setTimeout(() => setRecentLogFlash(null), 2600);
    },
    [lang]
  );

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
    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
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
        loggedCount={progress.loggedComponentIds.length}
        totalXp={progress.totalXp}
        onOpenTocLogbook={handleOpenTocLogbook}
      />

      {/* Dedicated WebGL 3D Airport Viewport Container */}
      <div
        ref={canvasHostRef}
        className={`fixed inset-0 top-16 z-0 ${viewMode === 'directory' ? 'invisible pointer-events-none' : 'visible'}`}
      />

      {/* WebGL Context Lost / Unavailable Graceful Fallback */}
      {webglFallback && viewMode === '3d' && (
        <div className="fixed inset-0 top-16 z-10 bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold">
            {lang === 'id' ? 'Mode Direktori 2D Tersedia' : '2D Directory Fallback Available'}
          </h2>
          <p className="text-sm text-slate-300 mt-2 max-w-md">
            {lang === 'id'
              ? 'Konteks WebGL 3D sedang tidak aktif pada perangkat ini. Anda tetap dapat mempelajari seluruh 26 komponen ElBan dan mengikuti evaluasi TOC melalui Mode Direktori.'
              : 'WebGL 3D context is unavailable on this device. You can still study all 26 ElBan components and complete the TOC assessment via Directory Mode.'}
          </p>
          <button
            type="button"
            onClick={() => setViewMode('directory')}
            className="mt-5 px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-sm font-semibold cursor-pointer"
          >
            {lang === 'id' ? 'Buka Mode Direktori 2D' : 'Open 2D Directory Mode'}
          </button>
        </div>
      )}

      {/* ==================== 3D MODE HUD OVERLAYS ==================== */}
      {viewMode === '3d' && !webglFallback && (
        <>
          {/* Contextual Zone Toast (Top-Center below Header) */}
          {zoneToast && !introPlaying && !inspectedTarget && !tocModalOpen && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 max-w-[92vw] pointer-events-none">
              <div className="bg-[#0B192C]/95 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-lg border border-slate-700 shadow-lg text-center">
                {zoneToast}
              </div>
            </div>
          )}

          {/* Cinematic Intro Overlay with Skip Button */}
          {introPlaying && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 px-4 text-center">
              <div className="bg-[#0B192C]/92 text-white px-5 py-3 rounded-xl border border-slate-700 shadow-xl max-w-lg">
                <div className="font-mono-tech text-[11px] text-sky-400">
                  WALK-IN ELBAN · VIRTUAL AIRPORT SITE VISIT
                </div>
                <div className="text-sm sm:text-base font-bold mt-0.5">
                  {lang === 'id'
                    ? 'Jelajahi 9 Zona Terminal & Bedah 6 Sistem Elektronika Bandara'
                    : 'Explore 9 Terminal Zones & Dissect 6 Airport Electronics Systems'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => sceneCtrlRef.current?.skipIntro()}
                className="px-5 py-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold shadow-lg border border-slate-200 flex items-center gap-2 cursor-pointer"
              >
                <FastForward className="w-4 h-4 text-sky-600" />
                <span>{lang === 'id' ? 'Lewati intro' : 'Skip intro'}</span>
              </button>
            </div>
          )}

          {/* Hover Technical Telemetry Tooltip */}
          {hoverTelemetry && !inspectedTarget && !tocModalOpen && !introPlaying && (
            <div
              className="fixed z-30 pointer-events-none bg-white/96 border border-slate-200 rounded-xl shadow-xl px-3.5 py-2.5 w-64"
              style={{
                left: Math.min(hoverTelemetry.screenX + 16, window.innerWidth - 280),
                top: Math.min(hoverTelemetry.screenY + 16, window.innerHeight - 140),
              }}
            >
              {hoverTelemetry.isTocConsole ? (
                <>
                  <div className="font-mono-tech text-[11px] font-semibold text-sky-700">
                    ZONA 09 · RUANG TOC
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {lang === 'id' ? 'Meja Evaluasi & Logbook TOC' : 'TOC Evaluation & Logbook Desk'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MousePointerClick className="w-3.5 h-3.5 text-sky-600" />
                    <span>{lang === 'id' ? 'Klik untuk membuka Uji Kompetensi' : 'Click to open Competency Test'}</span>
                  </div>
                </>
              ) : (
                hoverSystem && (
                  <>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono-tech font-semibold text-sky-700">
                        {hoverSystem.code} · {hoverSystem.shortLabel}
                      </span>
                      {hoverComponent && (
                        <span className={hoverIsLogged ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-medium'}>
                          {hoverIsLogged
                            ? lang === 'id' ? 'Di Logbook' : 'Logged'
                            : lang === 'id' ? 'Belum dipelajari' : 'Not logged'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                      {hoverComponent
                        ? lang === 'id' ? hoverComponent.name_id : hoverComponent.name_en
                        : lang === 'id' ? hoverSystem.name_id : hoverSystem.name_en}
                    </div>
                    {hoverComponent && (
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        {lang === 'id'
                          ? SUBSYSTEM_LAYER_LABELS[hoverComponent.subsystemLayer].id
                          : SUBSYSTEM_LAYER_LABELS[hoverComponent.subsystemLayer].en}
                      </div>
                    )}
                    <div className="text-[11px] text-sky-700 font-medium mt-1.5 flex items-center gap-1">
                      <MousePointerClick className="w-3.5 h-3.5" />
                      <span>{lang === 'id' ? 'Klik untuk inspeksi 3D & simulasi' : 'Click for 3D dissection & simulation'}</span>
                    </div>
                  </>
                )
              )}
            </div>
          )}

          {/* Unified Collapsible Bottom Control Dock (Subsystem Filter + Walk Controls Hint) */}
          {!introPlaying && !inspectedTarget && !tocModalOpen && (
            <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-[min(860px,92vw)]">
              <button
                type="button"
                onClick={() => setDockExpanded((v) => !v)}
                className="mb-1.5 px-3 py-1 rounded-md bg-white/95 hover:bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {dockExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                <span>
                  {dockExpanded
                    ? lang === 'id' ? 'Sembunyikan Kontrol (H)' : 'Hide Controls (H)'
                    : lang === 'id' ? 'Tampilkan Filter Subsistem (H)' : 'Show Subsystem Filter (H)'}
                </span>
              </button>

              {dockExpanded && (
                <div className="bg-white/95 border border-slate-200 rounded-xl shadow-lg px-3.5 py-2.5 flex flex-col gap-2 w-full">
                  {/* Subsystem Layer Filter Bar */}
                  <div className="flex items-center gap-1.5 overflow-x-auto elban-scroll">
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mr-1 whitespace-nowrap shrink-0">
                      <Layers className="w-3.5 h-3.5 text-sky-600" />
                      <span>{lang === 'id' ? 'Lapisan 3D:' : '3D Layer:'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveLayerFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        activeLayerFilter === 'ALL'
                          ? 'bg-[#0B192C] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {lang === 'id' ? SUBSYSTEM_LAYER_LABELS[layer].id : SUBSYSTEM_LAYER_LABELS[layer].en}
                        </button>
                      );
                    })}
                  </div>

                  {/* First-Person Navigation Hint */}
                  <div className="text-[11px] text-slate-500 text-center border-t border-slate-100 pt-1.5 truncate">
                    {lang === 'id'
                      ? 'Geser untuk menoleh · W A S D atau scroll untuk jalan · Klik lantai untuk pindah · Klik peralatan untuk bedah 3D'
                      : 'Drag to look around · W A S D or scroll to walk · Click floor to move · Click equipment for 3D dissection'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom-Left Collapsible PAS Zone Audio Matrix Controller */}
          {!introPlaying && !inspectedTarget && !tocModalOpen && (
            <PasControllerPanel
              lang={lang}
              currentZoneId={currentZoneId}
              onTeleportZone={handleSelectZone}
              onBroadcastStateChange={handlePasBroadcastStateChange}
              onSimulationCompleted={() => handleSimulationCompleted('sys-fids-pas')}
            />
          )}

          {/* Bottom-Right Digital ElBan Logbook HUD */}
          {!introPlaying && !inspectedTarget && !tocModalOpen && (
            <LogbookTrackerHUD
              lang={lang}
              loggedComponentIds={progress.loggedComponentIds}
              totalXp={progress.totalXp}
              recentLogFlash={recentLogFlash}
              onOpenToc={handleOpenTocLogbook}
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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  Box,
  ChevronDown,
  ChevronUp,
  Cpu,
  Eye,
  Layers,
  Lightbulb,
  Maximize2,
  Mic,
  Minimize2,
  Moon,
  Square,
  Sun,
  Volume2,
  X,
} from 'lucide-react';
import {
  COMPONENT_MAP,
  getComponentsBySystem,
  SYSTEM_MAP,
} from '../data/curriculum';
import {
  InspectorViewportController,
  PasInspectorSignalState,
  PasInteractiveAction,
} from '../three/InspectorViewport';
import { InspectViewMode, Language, SystemId } from '../types/elban';
import {
  PasBroadcastMode,
  playPttClick,
  playSpeakerTestTone,
  playTone,
  stopPasBroadcast,
  triggerPasBroadcast,
} from '../utils/audioSynth';
import { DeviceDissectionModal } from './DeviceDissectionModal';
import { PasInspectorZoneId, WorkingPrincipleSim } from './WorkingPrincipleSim';

interface EquipmentInspectorModalProps {
  systemId: SystemId;
  initialComponentId?: string;
  lang: Language;
  loggedComponentIds: string[];
  onLogComponent: (componentId: string) => void;
  onSimulationCompleted: (systemId: SystemId) => void;
  onClose: () => void;
}

const ZONE_TO_SPEAKERS: Record<PasInspectorZoneId, Array<'column' | 'ceiling' | 'horn'>> = {
  indoor: ['ceiling'],
  concourse: ['column', 'ceiling'],
  outdoor: ['horn'],
  all: ['column', 'ceiling', 'horn'],
};

const ZONE_TO_MODE: Record<PasInspectorZoneId, PasBroadcastMode> = {
  indoor: 'baggage',
  concourse: 'boarding',
  outdoor: 'security',
  all: 'emergency',
};

export const EquipmentInspectorModal: React.FC<EquipmentInspectorModalProps> = ({
  systemId,
  initialComponentId,
  lang,
  loggedComponentIds,
  onLogComponent,
  onSimulationCompleted,
  onClose,
}) => {
  const system = SYSTEM_MAP[systemId];
  const components = getComponentsBySystem(systemId);
  const defaultCompId =
    initialComponentId && COMPONENT_MAP[initialComponentId]?.systemId === systemId
      ? initialComponentId
      : components[0]?.id;

  const [selectedCompId, setSelectedCompId] = useState<string>(defaultCompId);
  // Start PAS in Normal mode so cables between Paging -> 42U Rack -> Column/Ceiling/Horn Speakers align directly into ports
  const [inspectMode, setInspectMode] = useState<InspectViewMode>(
    systemId === 'sys-pas' ? 'normal' : 'exploded'
  );
  const [pasControlsMinimized, setPasControlsMinimized] = useState(true);
  const [detailsMinimized, setDetailsMinimized] = useState(true);
  const [nightMode, setNightMode] = useState(false);
  const [lampOn, setLampOn] = useState(true);
  const [dissectingCompId, setDissectingCompId] = useState<string | null>(null);

  useEffect(() => {
    setPasControlsMinimized(true);
    setDetailsMinimized(true);
  }, [systemId]);
  const [hoveredTarget, setHoveredTarget] = useState<{
    compId: string | null;
    pasAction?: PasInteractiveAction;
  }>({ compId: null });

  // Interactive PAS 3D Signal-Flow & PTT Broadcast State
  const [pasZone, setPasZone] = useState<PasInspectorZoneId>('concourse');
  const [pasSignalState, setPasSignalState] = useState<PasInspectorSignalState>({
    active: false,
    emergency: false,
    activeSpeakers: [],
    fromPaging: false,
  });

  const viewportRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<InspectorViewportController | null>(null);
  const pasTestTimerRef = useRef<number | null>(null);
  const pasZoneRef = useRef<PasInspectorZoneId>(pasZone);
  const pasSignalRef = useRef<PasInspectorSignalState>(pasSignalState);

  useEffect(() => {
    pasZoneRef.current = pasZone;
  }, [pasZone]);

  useEffect(() => {
    pasSignalRef.current = pasSignalState;
    controllerRef.current?.setPasSignalState(pasSignalState);
  }, [pasSignalState]);

  const stopAllPasAudio = useCallback(() => {
    if (pasTestTimerRef.current !== null) {
      window.clearTimeout(pasTestTimerRef.current);
      pasTestTimerRef.current = null;
    }
    stopPasBroadcast();
    setPasSignalState({
      active: false,
      emergency: false,
      activeSpeakers: [],
      fromPaging: false,
    });
  }, []);

  const triggerPttBroadcast = useCallback(
    (forceEmergency = false) => {
      if (pasTestTimerRef.current !== null) {
        window.clearTimeout(pasTestTimerRef.current);
        pasTestTimerRef.current = null;
      }

      if (pasSignalRef.current.active && pasSignalRef.current.fromPaging && !forceEmergency) {
        playPttClick(false);
        stopAllPasAudio();
        return;
      }

      const targetZone: PasInspectorZoneId = forceEmergency ? 'all' : pasZoneRef.current;
      if (forceEmergency) setPasZone('all');
      const isEmergency = forceEmergency || targetZone === 'all';
      const speakers = ZONE_TO_SPEAKERS[targetZone];
      const mode: PasBroadcastMode = isEmergency ? 'emergency' : ZONE_TO_MODE[targetZone];

      playPttClick(true);
      onSimulationCompleted('sys-pas');
      setPasSignalState({
        active: true,
        emergency: isEmergency,
        activeSpeakers: speakers,
        fromPaging: true,
      });

      triggerPasBroadcast({
        mode,
        lang,
        volume: 0.82,
        useVoice: true,
        onEnded: () => {
          setPasSignalState({
            active: false,
            emergency: false,
            activeSpeakers: [],
            fromPaging: false,
          });
        },
      });
    },
    [lang, onSimulationCompleted, stopAllPasAudio]
  );

  const triggerSpeakerTest = useCallback(
    (speaker: 'column' | 'ceiling' | 'horn') => {
      if (pasTestTimerRef.current !== null) {
        window.clearTimeout(pasTestTimerRef.current);
        pasTestTimerRef.current = null;
      }
      stopPasBroadcast();
      playSpeakerTestTone(speaker);
      onSimulationCompleted('sys-pas');
      setPasSignalState({
        active: true,
        emergency: false,
        activeSpeakers: [speaker],
        fromPaging: false,
      });
      pasTestTimerRef.current = window.setTimeout(() => {
        pasTestTimerRef.current = null;
        setPasSignalState({
          active: false,
          emergency: false,
          activeSpeakers: [],
          fromPaging: false,
        });
      }, 2400);
    },
    [onSimulationCompleted]
  );

  const handlePas3DAction = useCallback(
    (action: PasInteractiveAction) => {
      if (action === 'ptt') {
        triggerPttBroadcast(false);
      } else if (action === 'ptt-emergency') {
        triggerPttBroadcast(true);
      } else if (action === 'cycle-zone') {
        const order: PasInspectorZoneId[] = ['concourse', 'indoor', 'outdoor', 'all'];
        const next = order[(order.indexOf(pasZoneRef.current) + 1) % order.length];
        setPasZone(next);
        playTone(720, 0.06, 'sine', 0.05);
      } else if (action === 'test-column') {
        triggerSpeakerTest('column');
      } else if (action === 'test-ceiling') {
        triggerSpeakerTest('ceiling');
      } else if (action === 'test-horn') {
        triggerSpeakerTest('horn');
      }
    },
    [triggerPttBroadcast, triggerSpeakerTest]
  );

  const pasActionCallbackRef = useRef(handlePas3DAction);
  useEffect(() => {
    pasActionCallbackRef.current = handlePas3DAction;
  }, [handlePas3DAction]);

  useEffect(() => {
    setSelectedCompId(defaultCompId);
  }, [defaultCompId]);

  useEffect(() => {
    if (!viewportRef.current) return;
    const ctrl = new InspectorViewportController(
      viewportRef.current,
      systemId,
      selectedCompId,
      (compId) => setSelectedCompId(compId),
      (action) => pasActionCallbackRef.current(action),
      (compId) => {
        setSelectedCompId(compId);
        setDissectingCompId(compId);
      },
      (compId, pasAction) => setHoveredTarget({ compId, pasAction })
    );
    controllerRef.current = ctrl;
    ctrl.setViewMode(inspectMode);
    ctrl.setPasSignalState(pasSignalRef.current);
    return () => {
      stopAllPasAudio();
      ctrl.dispose();
      controllerRef.current = null;
    };
    // Mount inspector 3D viewport once per inspected system
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemId]);

  useEffect(() => {
    controllerRef.current?.setViewMode(inspectMode);
  }, [inspectMode]);

  useEffect(() => {
    controllerRef.current?.setSelectedComponent(selectedCompId);
  }, [selectedCompId]);

  useEffect(() => {
    controllerRef.current?.setLightingState(nightMode, lampOn);
  }, [nightMode, lampOn, systemId]);

  const activeComp = COMPONENT_MAP[selectedCompId] ?? components[0];
  const isLogged = loggedComponentIds.includes(activeComp.id);

  return (
    <div
      className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'id' ? system.name_id : system.name_en}
    >
      <div className="w-full max-w-[1280px] h-[90vh] bg-[#323232] text-[#F5F3EE] rounded-2xl shadow-2xl border border-[#4A4A4A] overflow-hidden flex flex-col lg:flex-row">
        {/* LEFT STAGE: 3D Equipment Inspector Viewport */}
        <div
          className={`relative flex flex-col transition-colors ${
            nightMode ? 'bg-[#1A1A1A]' : 'bg-[#262626]'
          } ${
            detailsMinimized
              ? 'w-full h-full'
              : 'lg:w-[56%] h-[42vh] lg:h-full border-b lg:border-b-0 lg:border-r border-[#4A4A4A]'
          }`}
        >
          {/* Top-Left Title */}
          <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div className="bg-[#323232]/95 border border-[#4A4A4A] rounded-lg px-3.5 py-1.5 shadow-md pointer-events-auto">
              <div className="font-charm text-lg font-bold text-[#FFDB00] leading-tight">
                {lang === 'id' ? system.name_id : system.name_en}
              </div>
            </div>

            {/* View Mode Segmented Switcher + Night Mode & Lamp Switch + Restore Panel Actions */}
            <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
              {/* Mode Siang/Malam & Saklar Lampu */}
              <div className="flex items-center gap-1 p-1 bg-[#323232]/95 border border-[#4A4A4A] rounded-lg shadow-md">
                <button
                  type="button"
                  onClick={() => {
                    setNightMode((v) => !v);
                    playTone(nightMode ? 640 : 420, 0.05, 'sine', 0.04);
                  }}
                  title={nightMode ? 'Beralih ke Mode Siang' : 'Beralih ke Mode Malam'}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    nightMode
                      ? 'bg-[#FFDB00] text-[#242424] font-bold'
                      : 'text-[#D6D3CB] hover:bg-[#3D3D3D] hover:text-white'
                  }`}
                >
                  {nightMode ? <Moon className="w-3.5 h-3.5 text-[#242424]" /> : <Sun className="w-3.5 h-3.5 text-[#FFDB00]" />}
                  <span className="hidden sm:inline">{nightMode ? 'Malam' : 'Siang'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLampOn((v) => !v);
                    playTone(lampOn ? 320 : 820, 0.045, 'triangle', 0.05);
                  }}
                  title={lampOn ? 'Matikan Lampu Studio' : 'Nyalakan Lampu Studio'}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    lampOn
                      ? 'bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424] font-bold'
                      : 'bg-[#262626] hover:bg-[#3D3D3D] text-[#BDBAB2]'
                  }`}
                >
                  <Lightbulb className={`w-3.5 h-3.5 ${lampOn ? 'fill-[#242424]' : ''}`} />
                  <span className="hidden sm:inline">Lampu</span>
                  <span
                    className={`font-mono-tech text-[10px] font-bold px-1 py-0.2 rounded ${
                      lampOn
                        ? 'bg-[#242424]/15 text-[#242424]'
                        : 'bg-[#1E1E1E] text-[#9A978F]'
                    }`}
                  >
                    {lampOn ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#323232]/95 border border-[#4A4A4A] rounded-lg shadow-md">
                <button
                  type="button"
                  onClick={() => setInspectMode('normal')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    inspectMode === 'normal'
                      ? 'bg-[#FFDB00] text-[#242424] font-bold'
                      : 'text-[#D6D3CB] hover:text-white hover:bg-[#3D3D3D]'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Normal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectMode('xray')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    inspectMode === 'xray'
                      ? 'bg-[#FFDB00] text-[#242424] font-bold'
                      : 'text-[#D6D3CB] hover:text-white hover:bg-[#3D3D3D]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{lang === 'id' ? 'Transparan' : 'X-Ray Casing'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectMode('exploded')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    inspectMode === 'exploded'
                      ? 'bg-[#FFDB00] text-[#242424] font-bold'
                      : 'text-[#D6D3CB] hover:text-white hover:bg-[#3D3D3D]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Exploded View</span>
                </button>
              </div>

              {detailsMinimized && (
                <>
                  <button
                    type="button"
                    onClick={() => setDetailsMinimized(false)}
                    className="px-3 py-2 rounded-lg bg-[#FFDB00] hover:bg-[#E6C500] border border-[#FFDB00] text-[#242424] text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-[#242424]" />
                    <span>{lang === 'id' ? 'Tampilkan Detail' : 'Show Details'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={lang === 'id' ? 'Kembali ke area' : 'Back to zone'}
                    className="w-8 h-8 rounded-lg bg-[#323232]/95 hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[#F5F3EE] shadow-md flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Dedicated WebGL Container */}
          <div ref={viewportRef} className="w-full h-full" />

          {/* Hover Cue: Click 3D Device to Dissect Internal Components */}
          {hoveredTarget.compId && !dissectingCompId && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 pointer-events-none max-w-[90%]">
              <div className="bg-[#262626]/95 text-[#F5F3EE] border border-[#FFDB00]/45 rounded-lg px-3 py-1.5 shadow-lg text-xs font-medium flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[#FFDB00] shrink-0" />
                <span className="truncate">
                  {hoveredTarget.pasAction === 'ptt'
                    ? lang === 'id'
                      ? 'Klik tombol PTT untuk siaran langsung'
                      : 'Click PTT button for live broadcast'
                    : hoveredTarget.pasAction === 'ptt-emergency'
                      ? lang === 'id'
                        ? 'Klik tombol merah untuk Siaran Darurat'
                        : 'Click red key for Emergency Broadcast'
                      : hoveredTarget.pasAction === 'cycle-zone'
                        ? lang === 'id'
                          ? 'Klik keypad untuk ganti zona speaker'
                          : 'Click keypad to cycle speaker zone'
                        : `${lang === 'id' ? 'Klik untuk bedah komponen' : 'Click to dissect components'}: ${
                            COMPONENT_MAP[hoveredTarget.compId]
                              ? lang === 'id'
                                ? COMPONENT_MAP[hoveredTarget.compId].name_id
                                : COMPONENT_MAP[hoveredTarget.compId].name_en
                              : ''
                          }`}
                </span>
              </div>
            </div>
          )}

          {/* Interactive 3D PAS Live PTT, Speaker Test & Cable Data-Flow Bar */}
          {systemId === 'sys-pas' ? (
            <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col items-center gap-1.5 pointer-events-none">
              {pasControlsMinimized ? (
                <button
                  type="button"
                  onClick={() => setPasControlsMinimized(false)}
                  className="pointer-events-auto bg-[#323232]/95 hover:bg-[#3D3D3D] border border-[#4A4A4A] rounded-lg px-3 py-1.5 shadow-md text-xs font-semibold text-[#F5F3EE] flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-[#FFDB00]" />
                  <span>{lang === 'id' ? 'Tampilkan Kontrol PAS' : 'Show PAS Controls'}</span>
                </button>
              ) : (
                <>
                  <div className="pointer-events-auto bg-[#323232]/95 border border-[#4A4A4A] rounded-xl px-2.5 py-2 shadow-lg flex flex-wrap items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => triggerPttBroadcast(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        pasSignalState.active && pasSignalState.fromPaging
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424]'
                      }`}
                    >
                      {pasSignalState.active && pasSignalState.fromPaging ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>{lang === 'id' ? 'Stop PTT' : 'Stop PTT'}</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-[#242424]" />
                          <span>{lang === 'id' ? 'Tekan PTT Paging' : 'Press Paging PTT'}</span>
                        </>
                      )}
                    </button>

                    <span className="h-5 w-px bg-[#4A4A4A] hidden sm:inline-block" />

                    {(
                      [
                        { id: 'column', compId: 'comp-pas-aas', label: 'Column 20W' },
                        { id: 'ceiling', compId: 'comp-pas-ceiling', label: 'Ceiling 6W' },
                        { id: 'horn', compId: 'comp-pas-horn', label: 'Horn 30W' },
                      ] as const
                    ).map((spk) => {
                      const active = pasSignalState.active && pasSignalState.activeSpeakers.includes(spk.id);
                      return (
                        <button
                          key={spk.id}
                          type="button"
                          onClick={() => {
                            setSelectedCompId(spk.compId);
                            triggerSpeakerTest(spk.id);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer border transition-colors ${
                            active
                              ? 'bg-[#FFDB00] text-[#242424] border-[#FFDB00] font-bold'
                              : 'bg-[#262626] text-[#D6D3CB] border-[#4A4A4A] hover:bg-[#3D3D3D] hover:text-white'
                          }`}
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>{spk.label}</span>
                        </button>
                      );
                    })}

                    <span className="h-5 w-px bg-[#4A4A4A] hidden sm:inline-block" />

                    <button
                      type="button"
                      onClick={() => setPasControlsMinimized(true)}
                      title={lang === 'id' ? 'Minimize kontrol PAS' : 'Minimize PAS controls'}
                      aria-label={lang === 'id' ? 'Minimize kontrol PAS' : 'Minimize PAS controls'}
                      className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-[#D6D3CB] hover:text-white bg-[#262626] hover:bg-[#3D3D3D] border border-[#454545] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{lang === 'id' ? 'Minimize' : 'Minimize'}</span>
                    </button>
                  </div>

                  <div className="bg-[#242424]/95 border border-[#454545] text-[#D6D3CB] rounded-lg px-3 py-1 text-[10px] font-mono-tech flex flex-wrap items-center justify-center gap-2.5">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
                      <span>{lang === 'id' ? 'Kabel OMNEO (Paging→Rak)' : 'OMNEO Cable (Paging→Rack)'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                      <span>{lang === 'id' ? 'Modul Rak (Switch→Amp)' : 'Rack Bus (Switch→Amp)'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#FFDB00] inline-block" />
                      <span>{lang === 'id' ? 'Kabel 100V (Rak→Speaker)' : '100V Line (Rack→Speakers)'}</span>
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Bottom Orbit Hint */
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-[#323232]/95 border border-[#4A4A4A] rounded-lg px-3 py-1 text-[11px] font-medium text-[#D6D3CB] whitespace-nowrap pointer-events-none">
              {lang === 'id'
                ? 'Geser untuk putar 360° · Scroll untuk zoom · Klik perangkat 3D untuk membedah komponen'
                : 'Drag to orbit 360° · Scroll to zoom · Click 3D device to dissect components'}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Technical Details & Working Principle Simulation */}
        {!detailsMinimized && (
        <div className="lg:w-[44%] flex-1 flex flex-col min-h-0 bg-[#323232] text-[#F5F3EE]">
          {/* Sub-Component Selector Tabs + Minimize Button */}
          <div className="px-4 py-2.5 bg-[#262626] border-b border-[#4A4A4A] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto elban-scroll min-w-0">
              {components.map((c) => {
                const selected = c.id === activeComp.id;
                const done = loggedComponentIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCompId(c.id)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer border transition-colors ${
                      selected
                        ? 'bg-[#FFDB00] text-[#242424] border-[#FFDB00] font-bold'
                        : done
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60'
                          : 'bg-[#323232] text-[#D6D3CB] border-[#4A4A4A] hover:bg-[#3D3D3D] hover:text-white'
                    }`}
                  >
                    <span className="font-mono-tech mr-1">{c.code}</span>
                    <span>{(lang === 'id' ? c.name_id : c.name_en).split('(')[0].trim()}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setDetailsMinimized(true)}
              title={lang === 'id' ? 'Minimize panel detail' : 'Minimize details panel'}
              aria-label={lang === 'id' ? 'Minimize panel detail' : 'Minimize details panel'}
              className="px-2.5 py-1.5 rounded-md bg-[#323232] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[#D6D3CB] hover:text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5 text-[#FFDB00]" />
              <span className="hidden sm:inline">Minimize</span>
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto elban-scroll px-5 py-4 space-y-5">
            {/* Function & Working Principle */}
            <div>
              <h3 className="text-xs font-bold text-[#FFDB00] uppercase tracking-wider mb-1.5">
                {lang === 'id' ? 'Fungsi Utama & Prinsip Kerja' : 'Primary Function & Working Principle'}
              </h3>
              <p className="text-sm text-[#D6D3CB] leading-relaxed">
                {lang === 'id' ? activeComp.description_id : activeComp.description_en}
              </p>

              {/* Sub-Elements List */}
              <ul className="mt-3 space-y-1.5">
                {(lang === 'id' ? activeComp.subElements_id : activeComp.subElements_en).map((el, i) => (
                  <li key={i} className="text-xs text-[#D6D3CB] flex items-start gap-2">
                    <span className="font-mono-tech text-[#FFDB00] font-semibold">0{i + 1}.</span>
                    <span>{el}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Technical Specs & Safety Note */}
            <div className="pt-4 border-t border-[#454545] grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-[#262626] border border-[#454545]">
                <div className="text-[11px] font-semibold text-[#BDBAB2]">
                  {lang === 'id' ? 'Tegangan / Daya' : 'Voltage / Power'}
                </div>
                <div className="font-mono-tech text-xs font-semibold text-[#F5F3EE] mt-0.5">
                  {activeComp.technicalSpecs.voltageOrPower}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#262626] border border-[#454545]">
                <div className="text-[11px] font-semibold text-[#BDBAB2]">
                  {lang === 'id' ? 'Jenis Sinyal' : 'Signal Type'}
                </div>
                <div className="font-mono-tech text-xs font-semibold text-[#F5F3EE] mt-0.5">
                  {activeComp.technicalSpecs.signalType}
                </div>
              </div>
            </div>

            {(lang === 'id'
              ? activeComp.technicalSpecs.criticalSafetyNote_id
              : activeComp.technicalSpecs.criticalSafetyNote_en) && (
              <div className="p-3 rounded-lg bg-[#3D3A28] border border-[#FFDB00]/50 text-xs text-[#F5F3EE] flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#FFDB00] shrink-0 mt-0.5" />
                <span>
                  {lang === 'id'
                    ? activeComp.technicalSpecs.criticalSafetyNote_id
                    : activeComp.technicalSpecs.criticalSafetyNote_en}
                </span>
              </div>
            )}

            {/* Signal Flow Chain */}
            <div className="pt-4 border-t border-[#454545]">
              <h3 className="text-xs font-bold text-[#FFDB00] uppercase tracking-wider mb-2">
                {lang === 'id' ? 'Alur Sinyal Elektronika' : 'Electronic Signal Flow Chain'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-stretch">
                <div className="p-2.5 rounded-lg bg-[#262626] border border-[#454545]">
                  <div className="font-mono-tech text-[10px] font-semibold text-[#BDBAB2]">INPUT</div>
                  <div className="text-xs font-medium text-[#F5F3EE] mt-0.5">
                    {lang === 'id' ? activeComp.signalFlowChain.inputFrom_id : activeComp.signalFlowChain.inputFrom_en}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#3D3A28] border border-[#FFDB00]/60">
                  <div className="font-mono-tech text-[10px] font-semibold text-[#FFDB00] flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    <span>{lang === 'id' ? 'PROSES' : 'PROCESS'}</span>
                  </div>
                  <div className="text-xs font-medium text-[#F5F3EE] mt-0.5">
                    {lang === 'id' ? activeComp.signalFlowChain.process_id : activeComp.signalFlowChain.process_en}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#262626] border border-[#454545]">
                  <div className="font-mono-tech text-[10px] font-semibold text-[#BDBAB2] flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    <span>OUTPUT</span>
                  </div>
                  <div className="text-xs font-medium text-[#F5F3EE] mt-0.5">
                    {lang === 'id' ? activeComp.signalFlowChain.outputTo_id : activeComp.signalFlowChain.outputTo_en}
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Simulation Block */}
            <div className="pt-4 border-t border-[#454545]">
              <h3 className="text-xs font-bold text-[#FFDB00] uppercase tracking-wider mb-2.5">
                {lang === 'id' ? 'Simulasi Cara Kerja' : 'Working Principle Simulation'}
              </h3>
              <WorkingPrincipleSim
                simulationType={system.simulationType}
                lang={lang}
                onSimulationRun={() => onSimulationCompleted(system.id)}
                pasBridge={
                  systemId === 'sys-pas'
                    ? {
                        zone: pasZone,
                        active: pasSignalState.active,
                        emergency: pasSignalState.emergency,
                        activeSpeakers: pasSignalState.activeSpeakers,
                        fromPaging: pasSignalState.fromPaging,
                        onSelectZone: (z) => {
                          setPasZone(z);
                          if (pasSignalState.active) stopAllPasAudio();
                        },
                        onTogglePtt: (em) => triggerPttBroadcast(Boolean(em)),
                        onTestSpeaker: (spk) => triggerSpeakerTest(spk),
                      }
                    : undefined
                }
              />
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className="px-4 py-3 border-t border-[#4A4A4A] bg-[#262626] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-[#323232] border border-[#4A4A4A] hover:bg-[#3D3D3D] text-[#F5F3EE] text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors"
            >
              {lang === 'id' ? 'Kembali ke area' : 'Back to zone'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDissectingCompId(activeComp.id)}
                className="px-3.5 py-2 rounded-lg bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424] text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>{lang === 'id' ? 'Bedah Komponen' : 'Dissect Parts'}</span>
              </button>

              <button
                type="button"
                onClick={() => onLogComponent(activeComp.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                  isLogged
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-[#323232] hover:bg-[#3D3D3D] border border-[#FFDB00]/60 text-[#FFDB00]'
                }`}
              >
                {isLogged ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>{lang === 'id' ? 'Tercatat' : 'Saved'}</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-3.5 h-3.5 text-[#FFDB00]" />
                    <span>
                      {lang === 'id'
                        ? `Simpan (+${activeComp.xpReward} XP)`
                        : `Save (+${activeComp.xpReward} XP)`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Dedicated Full-Screen 3D Component Dissection Studio (Server Rack Digital Twin Reference) */}
      {dissectingCompId && (
        <DeviceDissectionModal
          componentId={dissectingCompId}
          lang={lang}
          loggedComponentIds={loggedComponentIds}
          onLogComponent={onLogComponent}
          onClose={() => setDissectingCompId(null)}
          initialNightMode={nightMode}
          initialLampOn={lampOn}
        />
      )}
    </div>
  );
};

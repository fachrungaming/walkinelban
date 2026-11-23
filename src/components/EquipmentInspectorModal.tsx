import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  Box,
  Eye,
  Layers,
  X,
} from 'lucide-react';
import {
  COMPONENT_MAP,
  getComponentsBySystem,
  SUBSYSTEM_LAYER_LABELS,
  SYSTEM_MAP,
} from '../data/curriculum';
import { InspectorViewportController } from '../three/InspectorViewport';
import { InspectViewMode, Language, SystemId } from '../types/elban';
import { WorkingPrincipleSim } from './WorkingPrincipleSim';

interface EquipmentInspectorModalProps {
  systemId: SystemId;
  initialComponentId?: string;
  lang: Language;
  loggedComponentIds: string[];
  onLogComponent: (componentId: string) => void;
  onSimulationCompleted: (systemId: SystemId) => void;
  onClose: () => void;
}

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
  const [inspectMode, setInspectMode] = useState<InspectViewMode>('exploded');

  const viewportRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<InspectorViewportController | null>(null);

  useEffect(() => {
    setSelectedCompId(defaultCompId);
  }, [defaultCompId]);

  useEffect(() => {
    if (!viewportRef.current) return;
    const ctrl = new InspectorViewportController(
      viewportRef.current,
      systemId,
      selectedCompId,
      (compId) => setSelectedCompId(compId)
    );
    controllerRef.current = ctrl;
    ctrl.setViewMode(inspectMode);
    return () => {
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

  const activeComp = COMPONENT_MAP[selectedCompId] ?? components[0];
  const isLogged = loggedComponentIds.includes(activeComp.id);
  const layerMeta = SUBSYSTEM_LAYER_LABELS[activeComp.subsystemLayer];

  return (
    <div
      className="fixed inset-0 z-40 bg-slate-950/75 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'id' ? system.name_id : system.name_en}
    >
      <div className="w-full max-w-[1280px] h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col lg:flex-row">
        {/* LEFT STAGE: 3D Equipment Inspector Viewport */}
        <div className="relative lg:w-[56%] h-[42vh] lg:h-full bg-slate-100 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
          {/* Top-Left Title */}
          <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div className="bg-white/95 border border-slate-200 rounded-lg px-3 py-1.5 shadow-xs pointer-events-auto">
              <div className="font-mono-tech text-[11px] font-semibold text-sky-700">
                {system.code} · {lang === 'id' ? 'Inspeksi 3D' : '3D Dissection'}
              </div>
              <div className="text-sm font-bold text-slate-900">
                {lang === 'id' ? system.name_id : system.name_en}
              </div>
            </div>

            {/* View Mode Segmented Switcher */}
            <div className="pointer-events-auto flex items-center gap-1 p-1 bg-white/95 border border-slate-200 rounded-lg shadow-xs">
              <button
                type="button"
                onClick={() => setInspectMode('normal')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  inspectMode === 'normal'
                    ? 'bg-[#0B192C] text-white'
                    : 'text-slate-600 hover:text-slate-900'
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
                    ? 'bg-[#0B192C] text-white'
                    : 'text-slate-600 hover:text-slate-900'
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
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Exploded View</span>
              </button>
            </div>
          </div>

          {/* Dedicated WebGL Container */}
          <div ref={viewportRef} className="w-full h-full" />

          {/* Bottom Orbit Hint */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-white/90 border border-slate-200 rounded-lg px-3 py-1 text-[11px] font-medium text-slate-600 whitespace-nowrap pointer-events-none">
            {lang === 'id'
              ? 'Geser untuk memutar 360° · Scroll untuk perbesar · Klik modul 3D untuk memilih'
              : 'Drag to orbit 360° · Scroll to zoom · Click 3D modules to select'}
          </div>
        </div>

        {/* RIGHT PANEL: Technical Details & Working Principle Simulation */}
        <div className="lg:w-[44%] flex-1 flex flex-col min-h-0 bg-white">
          {/* Header with Component Code & Close */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-mono-tech font-semibold text-slate-800">{activeComp.code}</span>
                <span aria-hidden="true">·</span>
                <span style={{ color: layerMeta.color }} className="font-semibold">
                  {lang === 'id' ? layerMeta.id : layerMeta.en}
                </span>
                {activeComp.priorityTag && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className={activeComp.priorityTag === 'Kritis/Tegangan Tinggi' ? 'text-red-600 font-semibold' : 'text-sky-700 font-semibold'}>
                      {activeComp.priorityTag}
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
                {lang === 'id' ? activeComp.name_id : activeComp.name_en}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'id' ? 'Tutup panel inspeksi' : 'Close inspection panel'}
              className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-Component Selector Tabs */}
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto elban-scroll shrink-0">
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
                      ? 'bg-[#0B192C] text-white border-[#0B192C]'
                      : done
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-mono-tech mr-1">{c.code}</span>
                  <span>{(lang === 'id' ? c.name_id : c.name_en).split('(')[0].trim()}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto elban-scroll px-5 py-4 space-y-5">
            {/* Function & Working Principle */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {lang === 'id' ? 'Fungsi Utama & Prinsip Kerja' : 'Primary Function & Working Principle'}
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {lang === 'id' ? activeComp.description_id : activeComp.description_en}
              </p>

              {/* Sub-Elements List */}
              <ul className="mt-3 space-y-1.5">
                {(lang === 'id' ? activeComp.subElements_id : activeComp.subElements_en).map((el, i) => (
                  <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                    <span className="font-mono-tech text-sky-600 font-semibold">0{i + 1}.</span>
                    <span>{el}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Technical Specs & Safety Note */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-semibold text-slate-500">
                  {lang === 'id' ? 'Tegangan / Daya' : 'Voltage / Power'}
                </div>
                <div className="font-mono-tech text-xs font-semibold text-slate-900 mt-0.5">
                  {activeComp.technicalSpecs.voltageOrPower}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">
                  {lang === 'id' ? 'Jenis Sinyal' : 'Signal Type'}
                </div>
                <div className="font-mono-tech text-xs font-semibold text-slate-900 mt-0.5">
                  {activeComp.technicalSpecs.signalType}
                </div>
              </div>
            </div>

            {(lang === 'id'
              ? activeComp.technicalSpecs.criticalSafetyNote_id
              : activeComp.technicalSpecs.criticalSafetyNote_en) && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {lang === 'id'
                    ? activeComp.technicalSpecs.criticalSafetyNote_id
                    : activeComp.technicalSpecs.criticalSafetyNote_en}
                </span>
              </div>
            )}

            {/* Signal Flow Chain */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {lang === 'id' ? 'Alur Sinyal Elektronika' : 'Electronic Signal Flow Chain'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-stretch">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-mono-tech text-[10px] font-semibold text-slate-500">INPUT</div>
                  <div className="text-xs font-medium text-slate-900 mt-0.5">
                    {lang === 'id' ? activeComp.signalFlowChain.inputFrom_id : activeComp.signalFlowChain.inputFrom_en}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200">
                  <div className="font-mono-tech text-[10px] font-semibold text-sky-700 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    <span>{lang === 'id' ? 'PROSES' : 'PROCESS'}</span>
                  </div>
                  <div className="text-xs font-medium text-slate-900 mt-0.5">
                    {lang === 'id' ? activeComp.signalFlowChain.process_id : activeComp.signalFlowChain.process_en}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-mono-tech text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    <span>OUTPUT</span>
                  </div>
                  <div className="text-xs font-medium text-slate-900 mt-0.5">
                    {lang === 'id' ? activeComp.signalFlowChain.outputTo_id : activeComp.signalFlowChain.outputTo_en}
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Simulation Block */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                {lang === 'id' ? 'Simulasi Cara Kerja' : 'Working Principle Simulation'}
              </h3>
              <WorkingPrincipleSim
                simulationType={system.simulationType}
                lang={lang}
                onSimulationRun={() => onSimulationCompleted(system.id)}
              />
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap"
            >
              {lang === 'id' ? 'Kembali ke area' : 'Back to zone'}
            </button>

            <button
              type="button"
              onClick={() => onLogComponent(activeComp.id)}
              className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
                isLogged
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-[#0B192C] hover:bg-[#152d4d] text-white'
              }`}
            >
              {isLogged ? (
                <>
                  <BookmarkCheck className="w-4 h-4" />
                  <span>{lang === 'id' ? 'Tercatat di Logbook' : 'Saved in Logbook'}</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4 text-sky-400" />
                  <span>
                    {lang === 'id'
                      ? `Simpan ke Logbook (+${activeComp.xpReward} XP)`
                      : `Save to Logbook (+${activeComp.xpReward} XP)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

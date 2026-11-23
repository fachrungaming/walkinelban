import React, { useState } from 'react';
import { ChevronUp, ClipboardList, Minus } from 'lucide-react';
import { ELECTRONIC_COMPONENTS, EQUIPMENT_SYSTEMS, getComponentsBySystem } from '../data/curriculum';
import { Language } from '../types/elban';

interface LogbookTrackerHUDProps {
  lang: Language;
  loggedComponentIds: string[];
  totalXp: number;
  recentLogFlash: string | null;
  onOpenToc: () => void;
}

export const LogbookTrackerHUD: React.FC<LogbookTrackerHUDProps> = ({
  lang,
  loggedComponentIds,
  totalXp,
  recentLogFlash,
  onOpenToc,
}) => {
  const [minimized, setMinimized] = useState(false);
  const totalCount = ELECTRONIC_COMPONENTS.length;
  const loggedSet = new Set(loggedComponentIds);

  // Build 6 SVG arc segments representing the 6 ElBan systems
  const size = 60;
  const center = size / 2;
  const radius = 23;
  const circumference = 2 * Math.PI * radius;
  const gap = 3.5;
  const segArc = circumference / 6 - gap;

  return (
    <div className="fixed bottom-5 right-5 z-20 flex flex-col items-end gap-2 pointer-events-none">
      {recentLogFlash && (
        <div className="bg-[#0B192C] text-white text-xs font-medium px-3.5 py-2 rounded-lg shadow-lg border border-sky-500/40 pointer-events-auto">
          {recentLogFlash}
        </div>
      )}

      {minimized ? (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          title={lang === 'id' ? 'Tampilkan Logbook ElBan' : 'Expand ElBan Logbook'}
          className="pointer-events-auto bg-white/96 hover:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-lg flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer transition-colors"
        >
          <ClipboardList className="w-4 h-4 text-sky-600 shrink-0" />
          <span className="font-mono-tech font-bold text-slate-900">
            {loggedComponentIds.length}/{totalCount}
          </span>
          <span className="text-slate-400">·</span>
          <span className="font-mono-tech text-[11px] font-semibold text-sky-700">{totalXp} XP</span>
          <ChevronUp className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
        </button>
      ) : (
        <div className="relative pointer-events-auto bg-white/95 hover:bg-white border border-slate-200 rounded-xl shadow-lg transition-transform duration-200 hover:-translate-y-0.5">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            title={lang === 'id' ? 'Perkecil Logbook' : 'Minimize Logbook'}
            aria-label={lang === 'id' ? 'Perkecil Logbook' : 'Minimize Logbook'}
            className="absolute top-1.5 right-1.5 z-10 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onOpenToc}
            title={lang === 'id' ? 'Buka Logbook & Evaluasi TOC' : 'Open Logbook & TOC Assessment'}
            className="group p-3 pr-7 flex items-center gap-3.5 cursor-pointer text-left"
          >
            {/* 6-System Circular Ring Progress */}
            <div className="relative w-[60px] h-[60px] shrink-0 flex items-center justify-center">
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                {EQUIPMENT_SYSTEMS.map((sys, idx) => {
                  const comps = getComponentsBySystem(sys.id);
                  const done = comps.filter((c) => loggedSet.has(c.id)).length;
                  const ratio = comps.length > 0 ? done / comps.length : 0;
                  const offset = -(idx * (circumference / 6));
                  return (
                    <g key={sys.id}>
                      {/* Track */}
                      <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="5"
                        strokeDasharray={`${segArc} ${circumference - segArc}`}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                      />
                      {/* Filled progress */}
                      {ratio > 0 && (
                        <circle
                          cx={center}
                          cy={center}
                          r={radius}
                          fill="none"
                          stroke={sys.accentColor}
                          strokeWidth="5"
                          strokeDasharray={`${segArc * ratio} ${circumference - segArc * ratio}`}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono-tech text-xs font-bold text-slate-900 leading-none">
                  {loggedComponentIds.length}
                </span>
                <span className="font-mono-tech text-[10px] text-slate-400 leading-none mt-0.5">
                  /{totalCount}
                </span>
              </div>
            </div>

            <div className="pr-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <ClipboardList className="w-3.5 h-3.5 text-sky-600" />
                <span>{lang === 'id' ? 'Logbook ElBan' : 'ElBan Logbook'}</span>
              </div>
              <div className="font-mono-tech text-sm font-bold text-slate-900 mt-0.5">
                {totalXp} XP
              </div>
              <div className="text-[11px] font-medium text-sky-700 group-hover:underline mt-0.5">
                {lang === 'id' ? 'Uji di Ruang TOC' : 'Evaluate at TOC'}
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

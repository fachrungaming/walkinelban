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
        <div className="bg-[#323232] text-[#FFDB00] text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xl border border-[#FFDB00]/50 pointer-events-auto">
          {recentLogFlash}
        </div>
      )}

      {minimized ? (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          title={lang === 'id' ? 'Tampilkan Logbook ElBan' : 'Expand ElBan Logbook'}
          className="pointer-events-auto bg-[#323232]/96 hover:bg-[#3D3D3D] border border-[#4A4A4A] rounded-xl px-3.5 py-2.5 shadow-xl flex items-center gap-2 text-xs font-semibold text-[#F5F3EE] cursor-pointer transition-colors"
        >
          <ClipboardList className="w-4 h-4 text-[#FFDB00] shrink-0" />
          <span className="font-mono-tech font-bold text-[#F5F3EE]">
            {loggedComponentIds.length}/{totalCount}
          </span>
          <span className="text-[#8C8982]">·</span>
          <span className="font-mono-tech text-[11px] font-semibold text-[#FFDB00]">{totalXp} XP</span>
          <ChevronUp className="w-3.5 h-3.5 text-[#BDBAB2] ml-0.5" />
        </button>
      ) : (
        <div className="relative pointer-events-auto bg-[#323232]/96 hover:bg-[#383838] border border-[#4A4A4A] rounded-xl shadow-2xl transition-transform duration-200 hover:-translate-y-0.5">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            title={lang === 'id' ? 'Perkecil Logbook' : 'Minimize Logbook'}
            aria-label={lang === 'id' ? 'Perkecil Logbook' : 'Minimize Logbook'}
            className="absolute top-1.5 right-1.5 z-10 p-1 rounded-md text-[#BDBAB2] hover:text-[#FFDB00] hover:bg-[#262626] cursor-pointer transition-colors"
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
                        stroke="#4A4A4A"
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
                          stroke="#FFDB00"
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
                <span className="font-mono-tech text-xs font-bold text-[#FFDB00] leading-none">
                  {loggedComponentIds.length}
                </span>
                <span className="font-mono-tech text-[10px] text-[#BDBAB2] leading-none mt-0.5">
                  /{totalCount}
                </span>
              </div>
            </div>

            <div className="pr-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D6D3CB]">
                <ClipboardList className="w-3.5 h-3.5 text-[#FFDB00]" />
                <span>{lang === 'id' ? 'Logbook ElBan' : 'ElBan Logbook'}</span>
              </div>
              <div className="font-mono-tech text-sm font-bold text-[#F5F3EE] mt-0.5">
                {totalXp} XP
              </div>
              <div className="text-xs font-semibold text-[#FFDB00] group-hover:underline mt-0.5">
                {lang === 'id' ? 'Uji di Ruang TOC' : 'Evaluate at TOC'}
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

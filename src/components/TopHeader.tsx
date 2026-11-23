import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ClipboardCheck,
  Compass,
  Grid2X2,
  MapPin,
  Radar,
} from 'lucide-react';
import { ELECTRONIC_COMPONENTS } from '../data/curriculum';
import { AIRPORT_ZONES, ZONE_MAP } from '../data/zones';
import { Language, ZoneId } from '../types/elban';

interface TopHeaderProps {
  lang: Language;
  onToggleLang: (lang: Language) => void;
  viewMode: '3d' | 'directory';
  onSetViewMode: (mode: '3d' | 'directory') => void;
  currentZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  loggedCount: number;
  totalXp: number;
  onOpenTocLogbook: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  lang,
  onToggleLang,
  viewMode,
  onSetViewMode,
  currentZoneId,
  onSelectZone,
  loggedCount,
  totalXp,
  onOpenTocLogbook,
}) => {
  const [zoneMenuOpen, setZoneMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setZoneMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const currentZone = ZONE_MAP[currentZoneId];
  const totalComponents = ELECTRONIC_COMPONENTS.length;

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-16 bg-white/95 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shadow-sm">
      {/* Brand Zone */}
      <button
        type="button"
        onClick={() => onSetViewMode('3d')}
        className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded-md"
      >
        <span className="w-8 h-8 rounded-lg bg-[#0B192C] text-sky-400 flex items-center justify-center shrink-0">
          <Radar className="w-4 h-4" />
        </span>
        <span className="text-base font-bold tracking-tight text-slate-900">
          Walk-In ElBan
        </span>
        <span className="hidden lg:inline text-xs font-medium text-slate-400">
          · Airport Tech Lab
        </span>
      </button>

      {/* Navigation & Primary Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Direktori Toggle */}
        <button
          type="button"
          onClick={() => onSetViewMode(viewMode === 'directory' ? '3d' : 'directory')}
          className={`h-10 px-3.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            viewMode === 'directory'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
          }`}
        >
          {viewMode === 'directory' ? (
            <>
              <Compass className="w-4 h-4" />
              <span>{lang === 'id' ? 'Bandara 3D' : '3D Airport'}</span>
            </>
          ) : (
            <>
              <Grid2X2 className="w-4 h-4" />
              <span>{lang === 'id' ? 'Direktori' : 'Directory'}</span>
            </>
          )}
        </button>

        {/* Zona Dropdown (9 operational zones) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setZoneMenuOpen((v) => !v)}
            className="h-10 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="hidden sm:inline max-w-[155px] truncate">
              {lang === 'id' ? currentZone.shortName_id : currentZone.shortName_en}
            </span>
            <span className="sm:hidden">{lang === 'id' ? 'Zona' : 'Zones'}</span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${zoneMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {zoneMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 max-h-[75vh] overflow-y-auto elban-scroll bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {lang === 'id' ? 'Teleportasi 9 Zona Bandara' : '9 Airport Operational Zones'}
                </span>
                <span className="font-mono-tech text-xs text-slate-400">3D</span>
              </div>
              {AIRPORT_ZONES.map((zone) => {
                const isActive = zone.id === currentZoneId;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => {
                      setZoneMenuOpen(false);
                      onSelectZone(zone.id);
                    }}
                    className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      isActive ? 'bg-sky-50 text-sky-950' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span
                      className={`font-mono-tech text-xs font-semibold w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                        isActive ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {zone.order}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {lang === 'id' ? zone.name_id : zone.name_en}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {lang === 'id' ? zone.summary_id : zone.summary_en}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Language Selector (ID / EN) */}
        <div
          className="hidden md:flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 shrink-0"
          role="group"
          aria-label="Language switcher"
        >
          <button
            type="button"
            onClick={() => onToggleLang('id')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              lang === 'id' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ID
          </button>
          <button
            type="button"
            onClick={() => onToggleLang('en')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              lang === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            EN
          </button>
        </div>

        {/* Logbook Action Button (Dark Navy) */}
        <button
          type="button"
          onClick={onOpenTocLogbook}
          className="h-10 px-3.5 sm:px-4 rounded-lg bg-[#0B192C] hover:bg-[#142a47] text-white text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ClipboardCheck className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="font-mono-tech tabular-nums text-xs sm:text-sm">
            {loggedCount}/{totalComponents}
          </span>
          <span aria-hidden="true" className="text-slate-500 hidden sm:inline">·</span>
          <span className="font-mono-tech tabular-nums text-xs sm:text-sm text-sky-300 hidden sm:inline">
            {totalXp} XP
          </span>
        </button>
      </div>
    </header>
  );
};

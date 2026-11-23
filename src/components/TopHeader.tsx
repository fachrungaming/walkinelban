import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ClipboardCheck,
  Compass,
  Grid2X2,
  Lightbulb,
  MapPin,
  Moon,
  Power,
  Radar,
  Sun,
} from 'lucide-react';
import { ELECTRONIC_COMPONENTS } from '../data/curriculum';
import { AIRPORT_ZONES, ZONE_MAP } from '../data/zones';
import { Language, LightCircuitId, LightCircuitState, TimeOfDayMode, ZoneId } from '../types/elban';

export const LIGHT_CIRCUIT_META: Array<{
  id: LightCircuitId;
  name_id: string;
  name_en: string;
  sub_id: string;
  sub_en: string;
}> = [
  {
    id: 'lobby_concourse',
    name_id: 'Lobby & Concourse',
    name_en: 'Lobby & Concourse',
    sub_id: '3 Lampu Plafon Utama',
    sub_en: '3 Main Ceiling LEDs',
  },
  {
    id: 'scp_baggage',
    name_id: 'SCP & Baggage Claim',
    name_en: 'SCP & Baggage Claim',
    sub_id: 'Lampu Sayap Barat',
    sub_en: 'West Wing Luminaires',
  },
  {
    id: 'restricted_server',
    name_id: 'Area Terbatas & Server',
    name_en: 'Restricted & Server Room',
    sub_id: 'Lampu Sayap Timur',
    sub_en: 'East Wing Luminaires',
  },
  {
    id: 'toc',
    name_id: 'Ruang TOC (Evaluasi)',
    name_en: 'TOC Evaluation Room',
    sub_id: 'Lampu Kerja Warm LED',
    sub_en: 'Warm Task LED Panel',
  },
  {
    id: 'exterior',
    name_id: 'Fasad & Plaza Luar',
    name_en: 'Exterior Facade & Plaza',
    sub_id: 'LED Cove & Bollard Luar',
    sub_en: 'Golden Coves & Bollards',
  },
];

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
  timeOfDay: TimeOfDayMode;
  onToggleTimeOfDay: () => void;
  lightCircuits: LightCircuitState;
  onToggleLightCircuit: (circuitId: LightCircuitId) => void;
  onSetAllLights: (on: boolean) => void;
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
  timeOfDay,
  onToggleTimeOfDay,
  lightCircuits,
  onToggleLightCircuit,
  onSetAllLights,
}) => {
  const [zoneMenuOpen, setZoneMenuOpen] = useState(false);
  const [lightMenuOpen, setLightMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lightDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setZoneMenuOpen(false);
      }
      if (lightDropdownRef.current && !lightDropdownRef.current.contains(e.target as Node)) {
        setLightMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const currentZone = ZONE_MAP[currentZoneId];
  const totalComponents = ELECTRONIC_COMPONENTS.length;
  const activeLightCount = Object.values(lightCircuits).filter(Boolean).length;
  const totalLightCount = LIGHT_CIRCUIT_META.length;
  const isNight = timeOfDay === 'night';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-30 h-16 border-b px-3 sm:px-6 flex items-center justify-between gap-3 shadow-sm transition-colors ${
        isNight
          ? 'bg-[#0B1526]/95 border-slate-800 text-slate-100'
          : 'bg-white/95 border-slate-200 text-slate-900'
      }`}
    >
      {/* Brand Zone */}
      <button
        type="button"
        onClick={() => onSetViewMode('3d')}
        className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded-md cursor-pointer"
      >
        <span className="w-8 h-8 rounded-lg bg-[#0B192C] border border-slate-700 text-sky-400 flex items-center justify-center shrink-0">
          <Radar className="w-4 h-4" />
        </span>
        <span className={`text-base font-bold tracking-tight ${isNight ? 'text-white' : 'text-slate-900'}`}>
          Walk-In ElBan
        </span>
        <span className={`hidden xl:inline text-xs font-medium ${isNight ? 'text-slate-400' : 'text-slate-400'}`}>
          · Airport Tech Lab
        </span>
      </button>

      {/* Navigation & Primary Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Day / Night Mode Toggle */}
        <button
          type="button"
          onClick={onToggleTimeOfDay}
          title={
            lang === 'id'
              ? isNight
                ? 'Beralih ke Mode Siang (N)'
                : 'Beralih ke Mode Malam (N)'
              : isNight
                ? 'Switch to Day Mode (N)'
                : 'Switch to Night Mode (N)'
          }
          className={`h-10 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isNight
              ? 'bg-indigo-950 hover:bg-indigo-900 text-amber-300 border border-indigo-700'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
          }`}
        >
          {isNight ? (
            <>
              <Moon className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="hidden md:inline">{lang === 'id' ? 'Malam' : 'Night'}</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="hidden md:inline">{lang === 'id' ? 'Siang' : 'Day'}</span>
            </>
          )}
        </button>

        {/* Room Light Switchboard Popover */}
        <div className="relative" ref={lightDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setLightMenuOpen((v) => !v);
              setZoneMenuOpen(false);
            }}
            className={`h-10 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isNight
                ? activeLightCount > 0
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                : activeLightCount > 0
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <Lightbulb
              className={`w-4 h-4 shrink-0 ${
                activeLightCount > 0 ? 'text-amber-500 fill-amber-400/40' : 'text-slate-400'
              }`}
            />
            <span className="hidden sm:inline">{lang === 'id' ? 'Saklar' : 'Lights'}</span>
            <span className="font-mono-tech text-[11px] tabular-nums opacity-85">
              {activeLightCount}/{totalLightCount}
            </span>
          </button>

          {lightMenuOpen && (
            <div
              className={`absolute right-0 mt-2 w-80 rounded-xl shadow-2xl border overflow-hidden z-50 ${
                isNight
                  ? 'bg-[#0F1B2E] border-slate-700 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div
                className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${
                  isNight ? 'border-slate-800 bg-[#0B1526]' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold tracking-wide uppercase">
                    {lang === 'id' ? 'Saklar Lampu Ruangan' : 'Room Light Switches'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSetAllLights(true)}
                    className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                      isNight
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {lang === 'id' ? 'Semua ON' : 'All ON'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetAllLights(false)}
                    className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                      isNight
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'bg-slate-200/80 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {lang === 'id' ? 'OFF' : 'OFF'}
                  </button>
                </div>
              </div>

              <div className="p-2 flex flex-col gap-1.5">
                {LIGHT_CIRCUIT_META.map((item) => {
                  const isOn = lightCircuits[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onToggleLightCircuit(item.id)}
                      className={`w-full px-3 py-2.5 rounded-lg border flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                        isNight
                          ? isOn
                            ? 'bg-slate-800/80 border-amber-500/35 hover:bg-slate-800'
                            : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/60'
                          : isOn
                            ? 'bg-amber-50/60 border-amber-200 hover:bg-amber-50'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">
                          {lang === 'id' ? item.name_id : item.name_en}
                        </div>
                        <div
                          className={`text-[11px] truncate mt-0.5 ${
                            isNight ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {lang === 'id' ? item.sub_id : item.sub_en}
                        </div>
                      </div>

                      {/* Tactile Rocker Switch Indicator */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono-tech text-[10px] font-bold ${
                            isOn
                              ? isNight
                                ? 'text-amber-300'
                                : 'text-amber-700'
                              : isNight
                                ? 'text-slate-500'
                                : 'text-slate-400'
                          }`}
                        >
                          {isOn ? 'ON' : 'OFF'}
                        </span>
                        <span
                          className={`w-10 h-5 rounded-md p-0.5 flex items-center transition-colors ${
                            isOn
                              ? 'bg-amber-500 justify-end'
                              : isNight
                                ? 'bg-slate-700 justify-start'
                                : 'bg-slate-300 justify-start'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-sm bg-white shadow-xs flex items-center justify-center">
                            <Power
                              className={`w-2.5 h-2.5 ${isOn ? 'text-amber-600' : 'text-slate-400'}`}
                            />
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div
                className={`px-3.5 py-2 text-[11px] border-t ${
                  isNight
                    ? 'border-slate-800 bg-[#0B1526] text-slate-400'
                    : 'border-slate-100 bg-slate-50 text-slate-500'
                }`}
              >
                {lang === 'id'
                  ? 'Tip: Anda juga bisa langsung menekan panel saklar 3D di dinding pintu masuk & ruang TOC.'
                  : 'Tip: You can also click the physical 3D wall switch panels by the entrance & TOC room.'}
              </div>
            </div>
          )}
        </div>

        {/* Direktori Toggle */}
        <button
          type="button"
          onClick={() => onSetViewMode(viewMode === 'directory' ? '3d' : 'directory')}
          className={`h-10 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            viewMode === 'directory'
              ? 'bg-sky-600 text-white'
              : isNight
                ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
          }`}
        >
          {viewMode === 'directory' ? (
            <>
              <Compass className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === 'id' ? 'Bandara 3D' : '3D Airport'}</span>
            </>
          ) : (
            <>
              <Grid2X2 className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === 'id' ? 'Direktori' : 'Directory'}</span>
            </>
          )}
        </button>

        {/* Zona Dropdown (9 operational zones) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              setZoneMenuOpen((v) => !v);
              setLightMenuOpen(false);
            }}
            className={`h-10 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isNight
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4 text-sky-500 shrink-0" />
            <span className="hidden lg:inline max-w-[140px] truncate">
              {lang === 'id' ? currentZone.shortName_id : currentZone.shortName_en}
            </span>
            <span className="lg:hidden">{lang === 'id' ? 'Zona' : 'Zones'}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${zoneMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {zoneMenuOpen && (
            <div
              className={`absolute right-0 mt-2 w-80 max-h-[75vh] overflow-y-auto elban-scroll border rounded-xl shadow-xl py-2 z-50 ${
                isNight
                  ? 'bg-[#0F1B2E] border-slate-700 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div
                className={`px-4 py-2 border-b flex items-center justify-between ${
                  isNight ? 'border-slate-800' : 'border-slate-100'
                }`}
              >
                <span className={`text-xs font-semibold ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
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
                      isActive
                        ? isNight
                          ? 'bg-sky-900/40 text-sky-100'
                          : 'bg-sky-50 text-sky-950'
                        : isNight
                          ? 'hover:bg-slate-800/70 text-slate-200'
                          : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span
                      className={`font-mono-tech text-xs font-semibold w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-sky-600 text-white'
                          : isNight
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {zone.order}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {lang === 'id' ? zone.name_id : zone.name_en}
                      </div>
                      <div className={`text-xs line-clamp-1 mt-0.5 ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
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
          className={`hidden xl:flex items-center p-0.5 rounded-lg border shrink-0 ${
            isNight ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}
          role="group"
          aria-label="Language switcher"
        >
          <button
            type="button"
            onClick={() => onToggleLang('id')}
            className={`px-2 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              lang === 'id'
                ? isNight
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-white text-slate-900 shadow-xs'
                : isNight
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ID
          </button>
          <button
            type="button"
            onClick={() => onToggleLang('en')}
            className={`px-2 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              lang === 'en'
                ? isNight
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-white text-slate-900 shadow-xs'
                : isNight
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            EN
          </button>
        </div>

        {/* Logbook Action Button (Dark Navy) */}
        <button
          type="button"
          onClick={onOpenTocLogbook}
          className="h-10 px-3 sm:px-3.5 rounded-lg bg-[#0B192C] hover:bg-[#142a47] border border-slate-700/80 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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

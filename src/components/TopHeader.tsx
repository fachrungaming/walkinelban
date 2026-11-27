import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Compass,
  Grid2X2,
  Lightbulb,
  MapPin,
  Moon,
  Power,
  Radar,
  Sun,
} from 'lucide-react';
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
  const activeLightCount = Object.values(lightCircuits).filter(Boolean).length;
  const totalLightCount = LIGHT_CIRCUIT_META.length;
  const isNight = timeOfDay === 'night';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-30 h-16 border-b px-3 sm:px-6 flex items-center justify-between gap-3 shadow-md transition-colors ${
        isNight
          ? 'bg-[#262626]/98 border-[#FFDB00]/30 text-[#F5F3EE]'
          : 'bg-[#323232]/98 border-[#4A4A4A] text-[#F5F3EE]'
      }`}
    >
      {/* Brand Zone */}
      <button
        type="button"
        onClick={() => onSetViewMode('3d')}
        className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 rounded-md cursor-pointer"
      >
        <span className="w-8 h-8 rounded-lg bg-[#FFDB00] text-[#242424] flex items-center justify-center shrink-0 shadow-xs">
          <Radar className="w-4 h-4" />
        </span>
        <span className="font-charm text-xl sm:text-2xl font-bold text-[#FFDB00] leading-none">
          Walk-In ElBan
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
          className={`h-10 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
            isNight
              ? 'bg-[#FFDB00]/15 hover:bg-[#FFDB00]/25 text-[#FFDB00] border-[#FFDB00]/50'
              : 'bg-[#262626] hover:bg-[#3D3D3D] text-[#F5F3EE] border-[#4A4A4A]'
          }`}
        >
          {isNight ? (
            <>
              <Moon className="w-4 h-4 text-[#FFDB00] shrink-0" />
              <span className="hidden md:inline">{lang === 'id' ? 'Malam' : 'Night'}</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-[#FFDB00] shrink-0" />
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
            className={`h-10 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
              activeLightCount > 0
                ? 'bg-[#FFDB00]/15 hover:bg-[#FFDB00]/25 text-[#FFDB00] border-[#FFDB00]/45'
                : 'bg-[#262626] hover:bg-[#3D3D3D] text-[#C4C1B9] border-[#4A4A4A]'
            }`}
          >
            <Lightbulb
              className={`w-4 h-4 shrink-0 ${
                activeLightCount > 0 ? 'text-[#FFDB00] fill-[#FFDB00]/35' : 'text-[#8C8982]'
              }`}
            />
            <span className="hidden sm:inline">{lang === 'id' ? 'Saklar' : 'Lights'}</span>
            <span className="font-mono-tech text-[11px] tabular-nums opacity-90">
              {activeLightCount}/{totalLightCount}
            </span>
          </button>

          {lightMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-2xl border border-[#4A4A4A] bg-[#323232] text-[#F5F3EE] overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-[#454545] bg-[#262626] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#FFDB00]" />
                  <span className="text-sm font-bold text-[#F5F3EE]">
                    {lang === 'id' ? 'Saklar Lampu Ruangan' : 'Room Light Switches'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSetAllLights(true)}
                    className="px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424]"
                  >
                    {lang === 'id' ? 'Semua ON' : 'All ON'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetAllLights(false)}
                    className="px-2 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors bg-[#3D3D3D] hover:bg-[#4A4A4A] text-[#E6E3DC]"
                  >
                    OFF
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
                        isOn
                          ? 'bg-[#3B392C] border-[#FFDB00]/45 hover:bg-[#444130]'
                          : 'bg-[#282828] border-[#454545] hover:bg-[#383838]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate text-[#F5F3EE]">
                          {lang === 'id' ? item.name_id : item.name_en}
                        </div>
                        <div className="text-xs truncate mt-0.5 text-[#BDBAB2]">
                          {lang === 'id' ? item.sub_id : item.sub_en}
                        </div>
                      </div>

                      {/* Tactile Rocker Switch Indicator */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono-tech text-[10px] font-bold ${
                            isOn ? 'text-[#FFDB00]' : 'text-[#8C8982]'
                          }`}
                        >
                          {isOn ? 'ON' : 'OFF'}
                        </span>
                        <span
                          className={`w-10 h-5 rounded-md p-0.5 flex items-center transition-colors ${
                            isOn ? 'bg-[#FFDB00] justify-end' : 'bg-[#4A4A4A] justify-start'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-sm bg-[#242424] shadow-xs flex items-center justify-center">
                            <Power
                              className={`w-2.5 h-2.5 ${isOn ? 'text-[#FFDB00]' : 'text-[#9A978F]'}`}
                            />
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="px-3.5 py-2 text-xs border-t border-[#454545] bg-[#262626] text-[#BDBAB2]">
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
          className={`h-10 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
            viewMode === 'directory'
              ? 'bg-[#FFDB00] text-[#242424] border-[#FFDB00] font-bold'
              : 'bg-[#262626] text-[#F5F3EE] border-[#4A4A4A] hover:bg-[#3D3D3D]'
          }`}
        >
          {viewMode === 'directory' ? (
            <>
              <Compass className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === 'id' ? 'Bandara 3D' : '3D Airport'}</span>
            </>
          ) : (
            <>
              <Grid2X2 className="w-4 h-4 text-[#FFDB00]" />
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
            className="h-10 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer bg-[#262626] hover:bg-[#3D3D3D] text-[#F5F3EE] border border-[#4A4A4A]"
          >
            <MapPin className="w-4 h-4 text-[#FFDB00] shrink-0" />
            <span className="hidden lg:inline max-w-[140px] truncate">
              {lang === 'id' ? currentZone.shortName_id : currentZone.shortName_en}
            </span>
            <span className="lg:hidden">{lang === 'id' ? 'Zona' : 'Zones'}</span>
            <ChevronDown className={`w-4 h-4 text-[#BDBAB2] transition-transform ${zoneMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {zoneMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 max-h-[75vh] overflow-y-auto elban-scroll border border-[#4A4A4A] bg-[#323232] text-[#F5F3EE] rounded-xl shadow-2xl py-2 z-50">
              <div className="px-4 py-2 border-b border-[#454545] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#D6D3CB]">
                  {lang === 'id' ? 'Teleportasi 9 Zona Bandara' : '9 Airport Operational Zones'}
                </span>
                <span className="font-mono-tech text-xs text-[#FFDB00]">3D</span>
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
                        ? 'bg-[#FFDB00]/15 text-[#FFDB00]'
                        : 'hover:bg-[#3D3D3D] text-[#F5F3EE]'
                    }`}
                  >
                    <span
                      className={`font-mono-tech text-xs font-bold w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-[#FFDB00] text-[#242424]'
                          : 'bg-[#262626] text-[#BDBAB2]'
                      }`}
                    >
                      {zone.order}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {lang === 'id' ? zone.name_id : zone.name_en}
                      </div>
                      <div className="text-xs line-clamp-1 mt-0.5 text-[#BDBAB2]">
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
          className="hidden xl:flex items-center p-0.5 rounded-lg border border-[#4A4A4A] bg-[#262626] shrink-0"
          role="group"
          aria-label="Language switcher"
        >
          <button
            type="button"
            onClick={() => onToggleLang('id')}
            className={`px-2 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              lang === 'id'
                ? 'bg-[#FFDB00] text-[#242424] shadow-xs'
                : 'text-[#BDBAB2] hover:text-white'
            }`}
          >
            ID
          </button>
          <button
            type="button"
            onClick={() => onToggleLang('en')}
            className={`px-2 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              lang === 'en'
                ? 'bg-[#FFDB00] text-[#242424] shadow-xs'
                : 'text-[#BDBAB2] hover:text-white'
            }`}
          >
            EN
          </button>
        </div>

      </div>
    </header>
  );
};

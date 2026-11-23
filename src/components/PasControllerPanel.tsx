import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  MapPin,
  Mic,
  MicOff,
  Radio,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AIRPORT_ZONES } from '../data/zones';
import { Language, ZoneId } from '../types/elban';
import {
  PAS_BROADCAST_PRESETS,
  PasBroadcastMode,
  stopPasBroadcast,
  triggerPasBroadcast,
} from '../utils/audioSynth';

interface PasZoneHardwareSpec {
  ceiling: number;
  column: number;
  horn: number;
  watts: number;
  short_id: string;
  short_en: string;
}

const PAS_ZONE_SPECS: Record<ZoneId, PasZoneHardwareSpec> = {
  lobby: { ceiling: 2, column: 2, horn: 0, watts: 52, short_id: 'Lobby', short_en: 'Lobby' },
  scp: { ceiling: 1, column: 2, horn: 0, watts: 46, short_id: 'SCP', short_en: 'SCP' },
  concourse: { ceiling: 4, column: 2, horn: 0, watts: 64, short_id: 'Concourse', short_en: 'Concourse' },
  baggage: { ceiling: 2, column: 1, horn: 0, watts: 32, short_id: 'Bagasi', short_en: 'Baggage' },
  restricted: { ceiling: 1, column: 1, horn: 0, watts: 26, short_id: 'Terbatas', short_en: 'Restricted' },
  server: { ceiling: 2, column: 0, horn: 0, watts: 12, short_id: 'Server', short_en: 'Server' },
  perimeter: { ceiling: 0, column: 0, horn: 2, watts: 60, short_id: 'Perimeter', short_en: 'Perimeter' },
  comms: { ceiling: 0, column: 0, horn: 2, watts: 60, short_id: 'Pos Radio', short_en: 'Radio Bay' },
  toc: { ceiling: 1, column: 1, horn: 0, watts: 26, short_id: 'TOC', short_en: 'TOC' },
};

const ALL_ZONE_IDS: ZoneId[] = AIRPORT_ZONES.map((z) => z.id);

const PRESET_DEFAULT_ZONES: Record<PasBroadcastMode, ZoneId[]> = {
  boarding: ['concourse', 'lobby'],
  security: ['scp', 'lobby'],
  baggage: ['baggage', 'concourse'],
  emergency: ALL_ZONE_IDS,
};

const PRESET_ORDER: PasBroadcastMode[] = ['boarding', 'security', 'baggage', 'emergency'];

interface PasControllerPanelProps {
  lang: Language;
  currentZoneId: ZoneId;
  onTeleportZone: (zoneId: ZoneId) => void;
  onBroadcastStateChange: (activeZones: ZoneId[], mode: PasBroadcastMode | 'idle') => void;
  onSimulationCompleted: () => void;
}

export const PasControllerPanel: React.FC<PasControllerPanelProps> = ({
  lang,
  currentZoneId,
  onTeleportZone,
  onBroadcastStateChange,
  onSimulationCompleted,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedZones, setSelectedZones] = useState<ZoneId[]>(['concourse', 'lobby']);
  const [mode, setMode] = useState<PasBroadcastMode>('boarding');
  const [volume, setVolume] = useState(0.8);
  const [useVoice, setUseVoice] = useState(true);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [vuLevel, setVuLevel] = useState(0);

  // Animate 100V amplifier VU output meter while actively broadcasting
  useEffect(() => {
    if (!isBroadcasting) {
      setVuLevel(0);
      return;
    }
    const timer = window.setInterval(() => {
      const base = mode === 'emergency' ? 0.72 : 0.48;
      const jitter = Math.random() * 0.42;
      setVuLevel(Math.min(1, (base + jitter) * Math.max(0.25, volume)));
    }, 110);
    return () => window.clearInterval(timer);
  }, [isBroadcasting, mode, volume]);

  // Keep 3D airport speakers synchronized whenever broadcast status, mode, or routed zones change
  useEffect(() => {
    if (isBroadcasting && selectedZones.length > 0) {
      onBroadcastStateChange(selectedZones, mode);
    } else {
      onBroadcastStateChange([], 'idle');
    }
  }, [isBroadcasting, selectedZones, mode, onBroadcastStateChange]);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      stopPasBroadcast();
    };
  }, []);

  const loadStats = useMemo(() => {
    let speakers = 0;
    let watts = 0;
    selectedZones.forEach((z) => {
      const s = PAS_ZONE_SPECS[z];
      speakers += s.ceiling + s.column + s.horn;
      watts += s.watts;
    });
    return { speakers, watts };
  }, [selectedZones]);

  const toggleZone = (zoneId: ZoneId) => {
    setSelectedZones((prev) => {
      const exists = prev.includes(zoneId);
      const next = exists ? prev.filter((id) => id !== zoneId) : [...prev, zoneId];
      if (next.length === 0 && isBroadcasting) {
        stopPasBroadcast();
        setIsBroadcasting(false);
      }
      return next;
    });
  };

  const handleSelectPreset = (nextMode: PasBroadcastMode) => {
    setMode(nextMode);
    setSelectedZones(PRESET_DEFAULT_ZONES[nextMode]);
    if (isBroadcasting) {
      stopPasBroadcast();
      setIsBroadcasting(false);
    }
  };

  const handleStartBroadcast = () => {
    const targetZones = mode === 'emergency' ? ALL_ZONE_IDS : selectedZones;
    if (targetZones.length === 0) return;
    if (mode === 'emergency' && selectedZones.length !== ALL_ZONE_IDS.length) {
      setSelectedZones(ALL_ZONE_IDS);
    }

    setIsBroadcasting(true);
    onSimulationCompleted();
    triggerPasBroadcast({
      mode,
      lang,
      volume,
      useVoice,
      onEnded: () => {
        setIsBroadcasting(false);
      },
    });
  };

  const handleStopBroadcast = () => {
    stopPasBroadcast();
    setIsBroadcasting(false);
  };

  const activePreset = PAS_BROADCAST_PRESETS[mode];
  const isEmergency = mode === 'emergency';

  const formatSpeakerCode = (spec: PasZoneHardwareSpec) => {
    const parts: string[] = [];
    if (spec.ceiling > 0) parts.push(`${spec.ceiling}C`);
    if (spec.column > 0) parts.push(`${spec.column}L`);
    if (spec.horn > 0) parts.push(`${spec.horn}H`);
    return parts.join('+');
  };

  // ==================== COLLAPSED COMPACT TRIGGER ====================
  if (!expanded) {
    return (
      <div className="fixed bottom-5 left-4 z-20 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={`px-3.5 py-2.5 rounded-xl border shadow-lg flex items-center gap-2.5 text-xs font-semibold cursor-pointer transition-colors ${
            isBroadcasting
              ? isEmergency
                ? 'bg-red-700 hover:bg-red-800 text-white border-red-500'
                : 'bg-[#0B192C] hover:bg-slate-800 text-white border-sky-500'
              : 'bg-white/96 hover:bg-white text-slate-800 border-slate-200'
          }`}
        >
          <Volume2
            className={`w-4 h-4 shrink-0 ${
              isBroadcasting
                ? isEmergency
                  ? 'text-red-200'
                  : 'text-sky-400'
                : 'text-sky-600'
            }`}
          />
          <div className="text-left leading-tight">
            <div className="font-mono-tech text-[10px] opacity-75">
              {isBroadcasting
                ? lang === 'id'
                  ? `SIARAN AKTIF · ${selectedZones.length} ZONA`
                  : `ON AIR · ${selectedZones.length} ZONES`
                : 'PAS / AAS · 100V LINE'}
            </div>
            <div className="text-xs font-bold">
              {lang === 'id' ? 'Kontrol Audio Zona' : 'Zone Audio Matrix'}
            </div>
          </div>
        </button>

        {isBroadcasting && (
          <button
            type="button"
            onClick={handleStopBroadcast}
            title={lang === 'id' ? 'Hentikan Siaran PAS' : 'Stop PAS Broadcast'}
            className="p-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white border border-red-500 shadow-lg cursor-pointer"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        )}
      </div>
    );
  }

  // ==================== EXPANDED PAS ZONE CONSOLE ====================
  return (
    <div className="fixed bottom-5 left-4 z-20 w-[352px] max-w-[calc(100vw-2rem)] bg-white/96 border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-6rem)]">
      {/* Header Bar */}
      <div className="bg-[#0B192C] text-white px-3.5 py-2.5 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className={`w-4 h-4 shrink-0 ${isBroadcasting ? (isEmergency ? 'text-red-400' : 'text-sky-400') : 'text-sky-400'}`} />
          <div className="min-w-0">
            <div className="font-mono-tech text-[10px] text-sky-400 tracking-wide truncate">
              PAS / AAS · 100V ZONE MATRIX
            </div>
            <div className="text-xs font-bold truncate">
              {lang === 'id' ? 'Kontroler Audio Publik Terminal' : 'Terminal Public Address Controller'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer shrink-0"
          title={lang === 'id' ? 'Tutup Panel' : 'Collapse Panel'}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="p-3 space-y-3 overflow-y-auto elban-scroll">
        {/* 1. Broadcast Announcement Presets */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-600">
              {lang === 'id' ? 'Preset Pengumuman (AAS)' : 'Announcement Preset (AAS)'}
            </span>
            <span className="font-mono-tech text-[10px] text-slate-500">{activePreset.tag}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESET_ORDER.map((presetKey) => {
              const p = PAS_BROADCAST_PRESETS[presetKey];
              const active = mode === presetKey;
              return (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => handleSelectPreset(presetKey)}
                  className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                    active
                      ? p.isEmergency
                        ? 'bg-red-600 text-white border-red-700'
                        : 'bg-[#0B192C] text-white border-[#0B192C]'
                      : p.isEmergency
                        ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.isEmergency && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate">{lang === 'id' ? p.label_id : p.label_en}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 9-Zone Speaker Routing Matrix */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-600">
              {lang === 'id'
                ? `Routing Zona (${selectedZones.length}/9)`
                : `Zone Routing (${selectedZones.length}/9)`}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedZones([currentZoneId])}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 cursor-pointer"
              >
                {lang === 'id' ? 'Zona Ini' : 'Current'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedZones(ALL_ZONE_IDS)}
                className="px-1.5 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-[10px] font-semibold text-sky-700 cursor-pointer"
              >
                {lang === 'id' ? 'Semua' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedZones([]);
                  if (isBroadcasting) handleStopBroadcast();
                }}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-600 cursor-pointer"
              >
                {lang === 'id' ? 'Kosong' : 'Clear'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {ALL_ZONE_IDS.map((zId) => {
              const spec = PAS_ZONE_SPECS[zId];
              const isSelected = selectedZones.includes(zId);
              const isCurrent = currentZoneId === zId;
              const isZoneLive = isBroadcasting && isSelected;
              return (
                <div
                  key={zId}
                  className={`rounded-lg border transition-colors flex flex-col justify-between p-1.5 ${
                    isZoneLive
                      ? isEmergency
                        ? 'bg-red-600 text-white border-red-700'
                        : 'bg-sky-600 text-white border-sky-700'
                      : isSelected
                        ? 'bg-sky-50 text-slate-900 border-sky-400'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  } ${isCurrent && !isZoneLive ? 'ring-1 ring-[#0B192C]/40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => toggleZone(zId)}
                      className="text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="text-[11px] font-bold leading-tight truncate">
                        {lang === 'id' ? spec.short_id : spec.short_en}
                      </div>
                      <div
                        className={`font-mono-tech text-[9px] mt-0.5 ${
                          isZoneLive ? 'text-white/85' : 'text-slate-500'
                        }`}
                      >
                        {formatSpeakerCode(spec)} · {spec.watts}W
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onTeleportZone(zId)}
                      title={
                        lang === 'id'
                          ? `Pindah kamera ke ${spec.short_id}`
                          : `Move camera to ${spec.short_en}`
                      }
                      className={`p-0.5 rounded cursor-pointer shrink-0 ${
                        isZoneLive
                          ? 'hover:bg-white/20 text-white'
                          : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <MapPin className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-slate-400 font-mono-tech mt-1 flex items-center justify-between">
            <span>C=Ceiling · L=Column (Indoor) · H=Horn (Outdoor)</span>
          </div>
        </div>

        {/* 3. Amplifier Telemetry & Audio Gain Controls */}
        <div className="rounded-lg bg-slate-950 text-white p-2.5 space-y-2 border border-slate-800">
          <div className="flex items-center justify-between text-[10px] font-mono-tech">
            <span className="text-slate-400">
              100V LINE LOAD: <strong className="text-sky-400">{loadStats.speakers} SPK</strong> ·{' '}
              <strong className="text-emerald-400">{loadStats.watts}W</strong>
            </span>
            <span className={isBroadcasting ? (isEmergency ? 'text-red-400 font-bold' : 'text-sky-400 font-bold') : 'text-slate-500'}>
              {isBroadcasting ? (isEmergency ? 'MCFA OVERRIDE' : 'TX ACTIVE') : 'STANDBY'}
            </span>
          </div>

          {/* 12-Segment Audio Output VU Meter */}
          <div className="grid grid-cols-12 gap-1 h-2">
            {Array.from({ length: 12 }).map((_, idx) => {
              const threshold = (idx + 1) / 12;
              const lit = isBroadcasting && vuLevel >= threshold - 0.06;
              const colorClass =
                idx >= 10
                  ? 'bg-red-500'
                  : idx >= 7
                    ? 'bg-amber-400'
                    : isEmergency
                      ? 'bg-red-400'
                      : 'bg-sky-400';
              return (
                <div
                  key={idx}
                  className={`rounded-xs transition-colors duration-75 ${lit ? colorClass : 'bg-slate-800'}`}
                />
              );
            })}
          </div>

          {/* Master Volume + Voice Toggle */}
          <div className="flex items-center gap-2 pt-0.5">
            {volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            )}
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              aria-label={lang === 'id' ? 'Volume Master PAS' : 'PAS Master Volume'}
              className="flex-1 accent-sky-500 h-1.5 cursor-pointer"
            />
            <span className="font-mono-tech text-[10px] w-8 text-right text-slate-300">
              {Math.round(volume * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setUseVoice((v) => !v)}
              className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 ${
                useVoice ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
              title={
                lang === 'id'
                  ? 'Aktifkan/nonaktifkan pengumuman suara TTS'
                  : 'Toggle spoken voice announcement'
              }
            >
              {useVoice ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
              <span>{useVoice ? (lang === 'id' ? 'Suara' : 'Voice') : 'Chime'}</span>
            </button>
          </div>
        </div>

        {/* 4. Announcement Transcript Preview */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-2 text-[11px] text-slate-700 leading-relaxed">
          <span className="font-mono-tech text-[10px] font-bold text-slate-500 mr-1.5">
            {lang === 'id' ? 'TEKS AAS:' : 'AAS SCRIPT:'}
          </span>
          {lang === 'id' ? activePreset.script_id : activePreset.script_en}
        </div>

        {/* 5. Primary Broadcast / Stop Button */}
        {isBroadcasting ? (
          <button
            type="button"
            onClick={handleStopBroadcast}
            className="w-full py-2.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>{lang === 'id' ? 'Hentikan Siaran PAS' : 'Stop PAS Broadcast'}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={selectedZones.length === 0}
            onClick={handleStartBroadcast}
            className={`w-full py-2.5 px-3 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${
              isEmergency
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#0B192C] hover:bg-slate-800'
            }`}
          >
            <Volume2 className="w-4 h-4 text-sky-400" />
            <span>
              {lang === 'id'
                ? `Siarkan ke ${selectedZones.length} Zona (${loadStats.speakers} Speaker)`
                : `Broadcast to ${selectedZones.length} Zone${selectedZones.length === 1 ? '' : 's'} (${loadStats.speakers} Speakers)`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

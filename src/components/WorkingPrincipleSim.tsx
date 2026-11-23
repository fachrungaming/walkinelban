import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Camera,
  CheckCircle2,
  Lock,
  Radio,
  ScanLine,
  ShieldAlert,
  Square,
  Unlock,
  Volume2,
  XCircle,
} from 'lucide-react';
import { Language, SimulationType } from '../types/elban';
import {
  PasBroadcastMode,
  playAccessDenied,
  playAccessGranted,
  playFireAlarmPulse,
  playMetalAlarm,
  playRadioSquelch,
  playTone,
  stopPasBroadcast,
  triggerPasBroadcast,
} from '../utils/audioSynth';

interface WorkingPrincipleSimProps {
  simulationType: SimulationType;
  lang: Language;
  onSimulationRun: () => void;
}

export const WorkingPrincipleSim: React.FC<WorkingPrincipleSimProps> = ({
  simulationType,
  lang,
  onSimulationRun,
}) => {
  // 1. X-Ray State
  const [xrayMaterial, setXrayMaterial] = useState<'organic' | 'mixed' | 'inorganic'>('organic');
  const [xrayScanning, setXrayScanning] = useState(false);
  const [xrayEstop, setXrayEstop] = useState(false);

  // 2. WTMD State
  const [metalSize, setMetalSize] = useState(65);
  const [metalZone, setMetalZone] = useState(3); // 0=Foot .. 5=Head

  // 3. CCTV / PIDS State
  const [camView, setCamView] = useState<'fixed' | 'ptz' | 'fisheye'>('ptz');
  const [pidsIntrusion, setPidsIntrusion] = useState(false);

  // 4. Access & Fire State
  const [accessStatus, setAccessStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [fireAlarmActive, setFireAlarmActive] = useState(false);

  // 5. FIDS & PAS State
  const [flightStatus, setFlightStatus] = useState<'ON TIME' | 'BOARDING' | 'FINAL CALL'>('BOARDING');
  const [pasTargetZone, setPasTargetZone] = useState<'concourse' | 'lobby' | 'baggage' | 'all'>('concourse');
  const [aasPlaying, setAasPlaying] = useState(false);
  const [liveClock, setLiveClock] = useState(() => new Date().toLocaleTimeString('en-GB'));

  // 6. Radio PTT State
  const [radioDevice, setRadioDevice] = useState<'ht' | 'rig'>('ht');
  const [radioFreq, setRadioFreq] = useState<'UHF 452.400 MHz' | 'VHF 156.800 MHz'>('UHF 452.400 MHz');
  const [pttActive, setPttActive] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString('en-GB'));
    }, 1000);
    return () => {
      clearInterval(id);
      stopPasBroadcast();
    };
  }, []);

  // ==================== 1. X-RAY DUAL ENERGY SIMULATOR ====================
  if (simulationType === 'xray_dual_energy') {
    const triggerScan = (mat: 'organic' | 'mixed' | 'inorganic') => {
      if (xrayEstop) {
        playAccessDenied();
        return;
      }
      setXrayMaterial(mat);
      setXrayScanning(true);
      playTone(620, 0.12, 'sine', 0.05);
      onSimulationRun();
      window.setTimeout(() => setXrayScanning(false), 1100);
    };

    const colorMap = {
      organic: { fill: '#f97316', label_id: 'Organik (Oranye · Z < 10)', label_en: 'Organic (Orange · Z < 10)', desc_id: 'Plastik, makanan, cairan, bahan peledak organik.', desc_en: 'Plastics, food, liquids, organic explosives.' },
      mixed: { fill: '#22c55e', label_id: 'Campuran (Hijau · 10 ≤ Z ≤ 18)', label_en: 'Mixed (Green · 10 ≤ Z ≤ 18)', desc_id: 'Aluminium tipis, kaca, papan sirkuit elektronik.', desc_en: 'Thin aluminum, glass, electronic circuit boards.' },
      inorganic: { fill: '#1d4ed8', label_id: 'Anorganik / Logam (Biru · Z > 18)', label_en: 'Inorganic / Metal (Blue · Z > 18)', desc_id: 'Besi, baja, tembaga, senjata logam padat.', desc_en: 'Iron, steel, copper, dense metallic items.' },
    }[xrayMaterial];

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-700">
            {lang === 'id' ? 'Uji Pemindaian Dual-Energy (160 kV)' : 'Dual-Energy Scan Test (160 kV)'}
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !xrayEstop;
              setXrayEstop(next);
              if (next) playAccessDenied();
              else playAccessGranted();
              onSimulationRun();
            }}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              xrayEstop
                ? 'bg-red-600 text-white'
                : 'bg-slate-200 text-slate-800 hover:bg-red-100 hover:text-red-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{xrayEstop ? 'E-STOP / INTERLOCK OPEN' : 'Emergency Stop'}</span>
          </button>
        </div>

        {/* Simulated Operator Monitor */}
        <div className="rounded-lg border border-slate-300 bg-slate-50 overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-900 text-white flex items-center justify-between text-[11px] font-mono-tech">
            <span>{xrayEstop ? 'INTERLOCK CUTOUT · 0 kV' : xrayScanning ? 'PHOTOCELL TRIGGERED · X-RAY ON' : 'STANDBY · LIGHT BARRIER READY'}</span>
            <span>{xrayEstop ? 'OFF' : '160 kV'}</span>
          </div>
          <div className="relative h-28 flex items-center justify-center bg-white px-4">
            {xrayEstop ? (
              <div className="text-center text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  {lang === 'id'
                    ? 'Tegangan HV Monoblock & VFD diputus oleh Emergency Stop / Interlock.'
                    : 'Monoblock HV & VFD Conveyor cut off by Emergency Stop / Interlock.'}
                </span>
              </div>
            ) : (
              <svg viewBox="0 0 320 90" className="w-full h-24">
                {/* Luggage outline */}
                <rect x="35" y="14" width="250" height="62" rx="8" fill="#f8fafc" stroke="#64748b" strokeWidth="2" />
                {/* Material signature */}
                <rect x="55" y="24" width="76" height="42" rx="4" fill={colorMap.fill} opacity="0.82" />
                <circle cx="176" cy="45" r="21" fill={colorMap.fill} opacity="0.65" />
                <path d="M222 28 L266 28 L266 60 L222 60 Z" fill={colorMap.fill} opacity="0.92" />
                {xrayScanning && (
                  <line x1="160" y1="6" x2="160" y2="84" stroke="#0284c7" strokeWidth="3" strokeDasharray="4 2" />
                )}
              </svg>
            )}
          </div>
          <div className="px-3 py-2 bg-slate-100 border-t border-slate-200 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">{lang === 'id' ? colorMap.label_id : colorMap.label_en}</span>
            <span className="text-slate-400"> · </span>
            <span>{lang === 'id' ? colorMap.desc_id : colorMap.desc_en}</span>
          </div>
        </div>

        {/* Material Trigger Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => triggerScan('organic')}
            className={`py-2 px-2 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
              xrayMaterial === 'organic' && !xrayEstop
                ? 'bg-orange-500 text-white border-orange-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-orange-50'
            }`}
          >
            {lang === 'id' ? 'Organik (Oranye)' : 'Organic (Orange)'}
          </button>
          <button
            type="button"
            onClick={() => triggerScan('mixed')}
            className={`py-2 px-2 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
              xrayMaterial === 'mixed' && !xrayEstop
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
            }`}
          >
            {lang === 'id' ? 'Campuran (Hijau)' : 'Mixed (Green)'}
          </button>
          <button
            type="button"
            onClick={() => triggerScan('inorganic')}
            className={`py-2 px-2 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
              xrayMaterial === 'inorganic' && !xrayEstop
                ? 'bg-blue-700 text-white border-blue-800'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50'
            }`}
          >
            {lang === 'id' ? 'Logam (Biru)' : 'Metal (Blue)'}
          </button>
        </div>
      </div>
    );
  }

  // ==================== 2. WTMD & HHMD EDDY CURRENT SIMULATOR ====================
  if (simulationType === 'eddy_current_zone') {
    const zoneNames = lang === 'id'
      ? ['Zona 1 (Sepatu)', 'Zona 2 (Lutut)', 'Zona 3 (Saku)', 'Zona 4 (Pinggang)', 'Zona 5 (Dada)', 'Zona 6 (Kepala)']
      : ['Zone 1 (Ankle)', 'Zone 2 (Knee)', 'Zone 3 (Pocket)', 'Zone 4 (Waist)', 'Zone 5 (Chest)', 'Zone 6 (Head)'];
    const alarmTriggered = metalSize >= 45;

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">{lang === 'id' ? 'Massa Logam' : 'Metal Mass'}</span>
              <span className="font-mono-tech font-semibold text-slate-900">{metalSize} g</span>
            </div>
            <input
              type="range"
              min={10}
              max={120}
              value={metalSize}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMetalSize(val);
                onSimulationRun();
                if (val >= 45 && metalSize < 45) playMetalAlarm();
              }}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">{lang === 'id' ? 'Ketinggian Objek' : 'Object Height'}</span>
              <span className="font-mono-tech font-semibold text-slate-900">{zoneNames[metalZone]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={metalZone}
              onChange={(e) => {
                setMetalZone(Number(e.target.value));
                onSimulationRun();
                if (metalSize >= 45) playMetalAlarm();
              }}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-950 p-3 flex items-center gap-4">
          {/* WTMD Arch LED Zone Bar */}
          <div className="flex flex-col-reverse gap-1 w-9 shrink-0 p-1.5 bg-slate-900 rounded border border-slate-700">
            {[0, 1, 2, 3, 4, 5].map((z) => {
              const active = alarmTriggered && z === metalZone;
              return (
                <div
                  key={z}
                  className={`h-3 rounded-xs transition-colors ${
                    active ? 'bg-red-500' : 'bg-emerald-900/50'
                  }`}
                />
              );
            })}
          </div>

          {/* Eddy Current Flux Waveform */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[11px] font-mono-tech mb-1">
              <span className="text-slate-400">EDDY CURRENT FLUX SHIFT</span>
              <span className={alarmTriggered ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                {alarmTriggered ? 'ALARM · METAL DETECTED' : 'CLEAR · BELOW THRESHOLD'}
              </span>
            </div>
            <svg viewBox="0 0 220 48" className="w-full h-12">
              <path
                d={`M0 24 Q 30 ${24 - metalSize * 0.18}, 55 24 T 110 24 T 165 ${24 + metalSize * 0.18} T 220 24`}
                fill="none"
                stroke={alarmTriggered ? '#ef4444' : '#22c55e'}
                strokeWidth="2.5"
              />
              <line x1="0" y1="24" x2="220" y2="24" stroke="#334155" strokeDasharray="3 3" />
            </svg>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-slate-300">
                {alarmTriggered
                  ? `${zoneNames[metalZone]} — ${lang === 'id' ? 'Periksa lanjut dgn HHMD' : 'Secondary check with HHMD'}`
                  : lang === 'id'
                    ? 'Geser massa ≥ 45 g untuk memicu alarm.'
                    : 'Increase mass ≥ 45 g to trigger alarm.'}
              </span>
              <button
                type="button"
                onClick={() => {
                  playMetalAlarm();
                  onSimulationRun();
                }}
                className="text-[11px] font-semibold text-amber-400 hover:underline cursor-pointer shrink-0 ml-2"
              >
                {lang === 'id' ? 'Tes Buzzer' : 'Test Buzzer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 3. CCTV & PIDS INTRUSION SIMULATOR ====================
  if (simulationType === 'pids_cctv_intrusion') {
    const viewLabel = {
      fixed: 'FIXED CAM 04 · AIRSIDE GATE (FOV 72°)',
      ptz: pidsIntrusion ? 'PTZ AUTO-SLEW · TRACKING FENCE SECTOR 2' : 'PTZ DOME 01 · PAN-TILT-ZOOM 30x',
      fisheye: 'FISHEYE 360° · BAGGAGE CLAIM HALL',
    }[camView];

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['fixed', 'ptz', 'fisheye'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setCamView(v);
                  onSimulationRun();
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md uppercase cursor-pointer transition-colors ${
                  camView === v ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !pidsIntrusion;
              setPidsIntrusion(next);
              if (next) {
                setCamView('ptz');
                playFireAlarmPulse();
              } else {
                playAccessGranted();
              }
              onSimulationRun();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              pidsIntrusion
                ? 'bg-red-600 text-white'
                : 'bg-teal-700 hover:bg-teal-800 text-white'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span>
              {pidsIntrusion
                ? lang === 'id' ? 'Reset Alarm PIDS' : 'Reset PIDS Alert'
                : lang === 'id' ? 'Simulasi Intrusi Pagar' : 'Simulate Fence Intrusion'}
            </span>
          </button>
        </div>

        <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-white">
          <div className="flex items-center justify-between text-[11px] font-mono-tech text-teal-300 mb-2">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              {viewLabel}
            </span>
            <span>{liveClock}</span>
          </div>
          <div className={`h-24 rounded border flex flex-col items-center justify-center px-3 text-center ${
            pidsIntrusion ? 'border-red-500 bg-red-950/40' : 'border-slate-700 bg-slate-900'
          }`}>
            <div className="font-mono-tech text-xs font-semibold">
              {pidsIntrusion
                ? 'ALERT: RADAR SCANNING + FENCE VIBRATION DETECTED'
                : camView === 'fisheye'
                  ? '360° PANORAMIC DE-WARPED COVERAGE · NOMINAL'
                  : 'OPTICAL FIBER LINK 10 Gbps -> NVR RAID RECORDING'}
            </div>
            <div className="text-[11px] text-slate-300 mt-1.5 font-mono-tech">
              {pidsIntrusion
                ? 'PIDS Sensor -> Media Converter SFP -> Optical Fiber -> NVR & TOC Alarm'
                : 'Camera CMOS -> SFP Transceiver -> Single-Mode Fiber -> NVR HDD'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 4. ACCESS CONTROL & FIRE ALARM SIMULATOR ====================
  if (simulationType === 'access_fire_trigger') {
    const unlocked = accessStatus === 'granted' || fireAlarmActive;

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setAccessStatus('granted');
              playAccessGranted();
              onSimulationRun();
            }}
            className="py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
          >
            {lang === 'id' ? 'Tempel RFID / Sidik Jari Valid' : 'Tap Valid RFID / Biometric'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAccessStatus('denied');
              playAccessDenied();
              onSimulationRun();
            }}
            className="py-2 px-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 text-xs font-semibold cursor-pointer"
          >
            {lang === 'id' ? 'Kartu Tidak Terdaftar' : 'Unregistered Card'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            const next = !fireAlarmActive;
            setFireAlarmActive(next);
            if (next) playFireAlarmPulse();
            else playAccessGranted();
            onSimulationRun();
          }}
          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
            fireAlarmActive
              ? 'bg-red-700 text-white'
              : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
          }`}
        >
          <BellRing className="w-3.5 h-3.5" />
          <span>
            {fireAlarmActive
              ? lang === 'id' ? 'Reset Panel MCFA & Sirine/Strobe' : 'Reset MCFA Panel & Siren/Strobe'
              : lang === 'id' ? 'Simulasi Asap/Panas & Manual Call Point (MCFA)' : 'Simulate Smoke/Heat & Manual Call Point (MCFA)'}
          </span>
        </button>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Magnetic Lock & Flap Barrier</span>
            <span className={`font-mono-tech font-semibold flex items-center gap-1 ${unlocked ? 'text-emerald-700' : 'text-slate-800'}`}>
              {unlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {fireAlarmActive
                ? 'FAIL-SAFE UNLOCKED (MCFA)'
                : accessStatus === 'granted'
                  ? 'GRANTED · BARRIER OPEN'
                  : accessStatus === 'denied'
                    ? 'DENIED · LOCKED'
                    : 'LOCKED (12V ENERGIZED)'}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="text-slate-600 font-medium">Panel MCFA Fire Loop</span>
            <span className={`font-mono-tech font-semibold flex items-center gap-1 ${fireAlarmActive ? 'text-red-600' : 'text-emerald-700'}`}>
              {fireAlarmActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {fireAlarmActive ? 'ZONE 02 ALARM · SIREN/STROBE ON' : 'NORMAL · 24V LOOP OK'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 5. FIDS, BIDS, MASTER CLOCK & PAS/AAS SIMULATOR ====================
  if (simulationType === 'fids_pas_sync') {
    const zoneOptions: Array<{
      id: 'concourse' | 'lobby' | 'baggage' | 'all';
      label_id: string;
      label_en: string;
      mode: PasBroadcastMode;
      load: string;
    }> = [
      { id: 'concourse', label_id: 'Concourse (6 SPK)', label_en: 'Concourse (6 SPK)', mode: 'boarding', load: '64W' },
      { id: 'lobby', label_id: 'Lobby (4 SPK)', label_en: 'Lobby (4 SPK)', mode: 'security', load: '52W' },
      { id: 'baggage', label_id: 'Bagasi (3 SPK)', label_en: 'Baggage (3 SPK)', mode: 'baggage', load: '32W' },
      { id: 'all', label_id: 'All-Zone (26 SPK)', label_en: 'All-Zone (26 SPK)', mode: 'emergency', load: '378W' },
    ];
    const activeZoneSpec = zoneOptions.find((z) => z.id === pasTargetZone) ?? zoneOptions[0];

    const toggleAasBroadcast = () => {
      if (aasPlaying) {
        stopPasBroadcast();
        setAasPlaying(false);
        return;
      }
      setAasPlaying(true);
      onSimulationRun();
      triggerPasBroadcast({
        mode: activeZoneSpec.mode,
        lang,
        volume: 0.78,
        useVoice: true,
        onEnded: () => setAasPlaying(false),
      });
    };

    return (
      <div className="space-y-3">
        {/* Mini FIDS + Master Clock Display */}
        <div className="rounded-lg bg-[#071324] text-white p-3 border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
            <span className="font-mono-tech text-[11px] text-sky-400">MASTER CLOCK GPS/NTP SYNC</span>
            <span className="font-mono-tech text-xs font-bold text-red-400">{liveClock}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono-tech">
            <span className="text-amber-300 font-bold">GA 402 · DPS</span>
            <span className="text-sky-300">GATE A04</span>
            <span className={flightStatus === 'FINAL CALL' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
              {flightStatus}
            </span>
          </div>
        </div>

        {/* Target PAS Speaker Zone Selector */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="font-medium text-slate-600">
              {lang === 'id' ? 'Zona Routing Speaker 100V:' : '100V Speaker Routing Zone:'}
            </span>
            <span className="font-mono-tech font-semibold text-indigo-700">
              100V LINE · {activeZoneSpec.load}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {zoneOptions.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => {
                  setPasTargetZone(z.id);
                  if (aasPlaying) {
                    stopPasBroadcast();
                    setAasPlaying(false);
                  }
                }}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                  pasTargetZone === z.id
                    ? z.id === 'all'
                      ? 'bg-red-600 text-white border-red-700'
                      : 'bg-sky-600 text-white border-sky-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {lang === 'id' ? z.label_id : z.label_en}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['ON TIME', 'BOARDING', 'FINAL CALL'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setFlightStatus(st);
                playTone(740, 0.08, 'sine', 0.05);
                onSimulationRun();
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                flightStatus === st
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
          <button
            type="button"
            onClick={toggleAasBroadcast}
            className={`ml-auto px-3 py-1.5 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              aasPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0B192C] hover:bg-slate-800'
            }`}
          >
            {aasPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{lang === 'id' ? 'Stop PAS' : 'Stop PAS'}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'id' ? 'Siarkan PAS/AAS' : 'Broadcast PAS/AAS'}</span>
              </>
            )}
          </button>
        </div>

        {/* Signal Flow Activation Strip */}
        <div className="grid grid-cols-4 gap-1.5 text-center font-mono-tech text-[10px]">
          {['AAS Player', 'Zone Matrix', '100V Amp', 'Zone Speakers'].map((node) => (
            <div
              key={node}
              className={`py-1.5 px-1 rounded border transition-colors ${
                aasPlaying
                  ? activeZoneSpec.id === 'all'
                    ? 'bg-red-600 text-white border-red-700 font-semibold'
                    : 'bg-indigo-600 text-white border-indigo-700 font-semibold'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {node}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==================== 6. GROUND COMMUNICATIONS RADIO PTT SIMULATOR ====================
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setRadioDevice('ht')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
              radioDevice === 'ht' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Handy Talky (5W)
          </button>
          <button
            type="button"
            onClick={() => setRadioDevice('rig')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
              radioDevice === 'rig' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Crash Car RIG (45W)
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            setRadioFreq((f) => (f === 'UHF 452.400 MHz' ? 'VHF 156.800 MHz' : 'UHF 452.400 MHz'))
          }
          className="font-mono-tech text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
        >
          {radioFreq}
        </button>
      </div>

      <button
        type="button"
        onMouseDown={() => {
          setPttActive(true);
          playRadioSquelch(true);
          onSimulationRun();
        }}
        onMouseUp={() => {
          setPttActive(false);
          playRadioSquelch(false);
        }}
        onMouseLeave={() => {
          if (pttActive) {
            setPttActive(false);
            playRadioSquelch(false);
          }
        }}
        onClick={() => {
          if (!pttActive) {
            setPttActive(true);
            playRadioSquelch(true);
            onSimulationRun();
            window.setTimeout(() => {
              setPttActive(false);
              playRadioSquelch(false);
            }, 1200);
          }
        }}
        className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
          pttActive
            ? 'bg-emerald-600 text-white'
            : 'bg-[#0B192C] hover:bg-slate-800 text-white'
        }`}
      >
        <Radio className="w-4 h-4 text-emerald-400" />
        <span>
          {pttActive
            ? `TX ACTIVE · ${radioDevice === 'ht' ? 'HT' : 'RIG'} -> IGCS BASE STATION`
            : lang === 'id' ? 'Tekan Push-to-Talk (PTT)' : 'Press Push-to-Talk (PTT)'}
        </span>
      </button>

      <div className="rounded-lg bg-slate-950 p-3 text-white">
        <div className="flex justify-between font-mono-tech text-[11px] text-emerald-400 mb-1.5">
          <span>{pttActive ? 'MODULATING FM/DMR CARRIER' : 'RX SQUELCH STANDBY'}</span>
          <span>VSWR 1.1:1</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center font-mono-tech text-[10px]">
          {[radioDevice === 'ht' ? 'HT Mic/PTT' : 'RIG Mic/PTT', 'RF Filter/PA', 'IGCS Repeater', 'PABX / TOC'].map((step) => (
            <div
              key={step}
              className={`py-1.5 px-1 rounded border ${
                pttActive
                  ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 font-semibold'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

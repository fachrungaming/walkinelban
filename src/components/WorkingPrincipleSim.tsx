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

export type PasInspectorZoneId = 'indoor' | 'concourse' | 'outdoor' | 'all';

export interface PasInspectorBridge {
  zone: PasInspectorZoneId;
  active: boolean;
  emergency: boolean;
  activeSpeakers: Array<'column' | 'ceiling' | 'horn'>;
  fromPaging: boolean;
  onSelectZone: (zone: PasInspectorZoneId) => void;
  onTogglePtt: (emergency?: boolean) => void;
  onTestSpeaker: (speaker: 'column' | 'ceiling' | 'horn') => void;
}

interface WorkingPrincipleSimProps {
  simulationType: SimulationType;
  lang: Language;
  onSimulationRun: () => void;
  pasBridge?: PasInspectorBridge;
}

export const WorkingPrincipleSim: React.FC<WorkingPrincipleSimProps> = ({
  simulationType,
  lang,
  onSimulationRun,
  pasBridge,
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

  // 5. FIDS, BIDS & PAS State
  const [flightStatus, setFlightStatus] = useState<'ON TIME' | 'BOARDING' | 'FINAL CALL'>('BOARDING');
  const [bidsStatus, setBidsStatus] = useState<'FIRST BAG' | 'DELIVERING' | 'LAST BAG'>('DELIVERING');
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
          <div className="text-xs font-semibold text-[#D6D3CB]">
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
                : 'bg-[#262626] text-[#F5F3EE] border border-[#4A4A4A] hover:bg-red-950/60 hover:text-red-300 hover:border-red-700/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{xrayEstop ? 'E-STOP / INTERLOCK OPEN' : 'Emergency Stop'}</span>
          </button>
        </div>

        {/* Simulated Operator Monitor */}
        <div className="rounded-lg border border-[#4A4A4A] bg-[#242424] overflow-hidden">
          <div className="px-3 py-1.5 bg-[#1D1D1D] text-[#FFDB00] flex items-center justify-between text-[11px] font-mono-tech border-b border-[#454545]">
            <span>{xrayEstop ? 'INTERLOCK CUTOUT · 0 kV' : xrayScanning ? 'PHOTOCELL TRIGGERED · X-RAY ON' : 'STANDBY · LIGHT BARRIER READY'}</span>
            <span>{xrayEstop ? 'OFF' : '160 kV'}</span>
          </div>
          <div className="relative h-28 flex items-center justify-center bg-[#2B2B2B] px-4">
            {xrayEstop ? (
              <div className="text-center text-red-400 text-xs font-semibold flex items-center gap-2">
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
                <rect x="35" y="14" width="250" height="62" rx="8" fill="#1F1F1F" stroke="#7A776F" strokeWidth="2" />
                {/* Material signature */}
                <rect x="55" y="24" width="76" height="42" rx="4" fill={colorMap.fill} opacity="0.86" />
                <circle cx="176" cy="45" r="21" fill={colorMap.fill} opacity="0.72" />
                <path d="M222 28 L266 28 L266 60 L222 60 Z" fill={colorMap.fill} opacity="0.95" />
                {xrayScanning && (
                  <line x1="160" y1="6" x2="160" y2="84" stroke="#FFDB00" strokeWidth="3" strokeDasharray="4 2" />
                )}
              </svg>
            )}
          </div>
          <div className="px-3 py-2 bg-[#262626] border-t border-[#454545] text-xs text-[#D6D3CB]">
            <span className="font-semibold text-[#F5F3EE]">{lang === 'id' ? colorMap.label_id : colorMap.label_en}</span>
            <span className="text-[#9A978F]"> · </span>
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
                ? 'bg-orange-500 text-white border-orange-400'
                : 'bg-[#262626] text-[#D6D3CB] border-[#4A4A4A] hover:bg-[#3D3D3D]'
            }`}
          >
            {lang === 'id' ? 'Organik (Oranye)' : 'Organic (Orange)'}
          </button>
          <button
            type="button"
            onClick={() => triggerScan('mixed')}
            className={`py-2 px-2 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
              xrayMaterial === 'mixed' && !xrayEstop
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-[#262626] text-[#D6D3CB] border-[#4A4A4A] hover:bg-[#3D3D3D]'
            }`}
          >
            {lang === 'id' ? 'Campuran (Hijau)' : 'Mixed (Green)'}
          </button>
          <button
            type="button"
            onClick={() => triggerScan('inorganic')}
            className={`py-2 px-2 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
              xrayMaterial === 'inorganic' && !xrayEstop
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-[#262626] text-[#D6D3CB] border-[#4A4A4A] hover:bg-[#3D3D3D]'
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
              <span className="font-medium text-[#D6D3CB]">{lang === 'id' ? 'Massa Logam' : 'Metal Mass'}</span>
              <span className="font-mono-tech font-semibold text-[#FFDB00]">{metalSize} g</span>
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
              className="w-full accent-[#FFDB00] cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[#D6D3CB]">{lang === 'id' ? 'Ketinggian Objek' : 'Object Height'}</span>
              <span className="font-mono-tech font-semibold text-[#FFDB00]">{zoneNames[metalZone]}</span>
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
              className="w-full accent-[#FFDB00] cursor-pointer"
            />
          </div>
        </div>

        <div className="rounded-lg border border-[#4A4A4A] bg-[#242424] p-3 flex items-center gap-4">
          {/* WTMD Arch LED Zone Bar */}
          <div className="flex flex-col-reverse gap-1 w-9 shrink-0 p-1.5 bg-[#1C1C1C] rounded border border-[#454545]">
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
              <span className="text-[#BDBAB2]">EDDY CURRENT FLUX SHIFT</span>
              <span className={alarmTriggered ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                {alarmTriggered ? 'ALARM · METAL DETECTED' : 'CLEAR · BELOW THRESHOLD'}
              </span>
            </div>
            <svg viewBox="0 0 220 48" className="w-full h-12">
              <path
                d={`M0 24 Q 30 ${24 - metalSize * 0.18}, 55 24 T 110 24 T 165 ${24 + metalSize * 0.18} T 220 24`}
                fill="none"
                stroke={alarmTriggered ? '#ef4444' : '#FFDB00'}
                strokeWidth="2.5"
              />
              <line x1="0" y1="24" x2="220" y2="24" stroke="#4A4A4A" strokeDasharray="3 3" />
            </svg>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-[#D6D3CB]">
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
                className="text-[11px] font-semibold text-[#FFDB00] hover:underline cursor-pointer shrink-0 ml-2"
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
          <div className="flex items-center gap-1 p-1 bg-[#262626] border border-[#454545] rounded-lg">
            {(['fixed', 'ptz', 'fisheye'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setCamView(v);
                  onSimulationRun();
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md uppercase cursor-pointer transition-colors ${
                  camView === v
                    ? 'bg-[#FFDB00] text-[#242424] font-bold'
                    : 'text-[#D6D3CB] hover:text-white hover:bg-[#3D3D3D]'
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              pidsIntrusion
                ? 'bg-red-600 text-white'
                : 'bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424]'
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

        <div className="rounded-lg bg-[#242424] border border-[#4A4A4A] p-3 text-[#F5F3EE]">
          <div className="flex items-center justify-between text-[11px] font-mono-tech text-[#FFDB00] mb-2">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              {viewLabel}
            </span>
            <span>{liveClock}</span>
          </div>
          <div className={`h-24 rounded border flex flex-col items-center justify-center px-3 text-center ${
            pidsIntrusion ? 'border-red-500 bg-red-950/45' : 'border-[#454545] bg-[#1C1C1C]'
          }`}>
            <div className="font-mono-tech text-xs font-semibold text-[#F5F3EE]">
              {pidsIntrusion
                ? 'ALERT: RADAR SCANNING + FENCE VIBRATION DETECTED'
                : camView === 'fisheye'
                  ? '360° PANORAMIC DE-WARPED COVERAGE · NOMINAL'
                  : 'OPTICAL FIBER LINK 10 Gbps -> NVR RAID RECORDING'}
            </div>
            <div className="text-[11px] text-[#BDBAB2] mt-1.5 font-mono-tech">
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
            className="py-2 px-2.5 rounded-lg bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424] text-xs font-bold cursor-pointer transition-colors"
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
            className="py-2 px-2.5 rounded-lg bg-[#262626] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[#F5F3EE] text-xs font-semibold cursor-pointer transition-colors"
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
              : 'bg-red-950/40 text-red-300 border border-red-700/60 hover:bg-red-900/50'
          }`}
        >
          <BellRing className="w-3.5 h-3.5" />
          <span>
            {fireAlarmActive
              ? lang === 'id' ? 'Reset Panel MCFA & Sirine/Strobe' : 'Reset MCFA Panel & Siren/Strobe'
              : lang === 'id' ? 'Simulasi Asap/Panas & Manual Call Point (MCFA)' : 'Simulate Smoke/Heat & Manual Call Point (MCFA)'}
          </span>
        </button>

        <div className="rounded-lg border border-[#454545] bg-[#262626] p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#BDBAB2] font-medium">Magnetic Lock & Flap Barrier</span>
            <span className={`font-mono-tech font-semibold flex items-center gap-1 ${unlocked ? 'text-[#FFDB00]' : 'text-[#F5F3EE]'}`}>
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
          <div className="flex items-center justify-between pt-2 border-t border-[#454545]">
            <span className="text-[#BDBAB2] font-medium">Panel MCFA Fire Loop</span>
            <span className={`font-mono-tech font-semibold flex items-center gap-1 ${fireAlarmActive ? 'text-red-400' : 'text-emerald-400'}`}>
              {fireAlarmActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {fireAlarmActive ? 'ZONE 02 ALARM · SIREN/STROBE ON' : 'NORMAL · 24V LOOP OK'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 5. FIDS & MASTER CLOCK SIMULATOR ====================
  if (simulationType === 'fids_sync') {
    return (
      <div className="space-y-3">
        {/* Mini FIDS + Master Clock Display */}
        <div className="rounded-lg bg-[#242424] text-[#F5F3EE] p-3 border border-[#4A4A4A]">
          <div className="flex items-center justify-between border-b border-[#454545] pb-1.5 mb-2">
            <span className="font-mono-tech text-[11px] text-[#FFDB00]">MASTER CLOCK GPS/NTP SYNC</span>
            <span className="font-mono-tech text-xs font-bold text-red-400">{liveClock}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono-tech">
            <span className="text-[#FFDB00] font-bold">GA 402 · DPS</span>
            <span className="text-[#D6D3CB]">GATE A04</span>
            <span className={flightStatus === 'FINAL CALL' ? 'text-[#FFDB00] font-bold' : 'text-emerald-400 font-bold'}>
              {flightStatus}
            </span>
          </div>
        </div>

        {/* FIDS Status Selector */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="font-medium text-[#D6D3CB]">
              {lang === 'id' ? 'Update Status Jadwal FIDS (via Switch LAN Internal):' : 'Update FIDS Flight Remark (via Internal LAN Switch):'}
            </span>
            <span className="font-mono-tech font-semibold text-[#FFDB00]">CAT6 GbE · NTP LOCK</span>
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                  flightStatus === st
                    ? 'bg-[#FFDB00] text-[#242424] border-[#FFDB00] font-bold'
                    : 'bg-[#262626] text-[#D6D3CB] border-[#4A4A4A] hover:bg-[#3D3D3D]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Internal Switch LAN Distribution Strip */}
        <div className="grid grid-cols-4 gap-1.5 text-center font-mono-tech text-[10px]">
          {['AODB / NTP', 'Switch 8P', 'Monitor FIDS', 'Master Clock'].map((node) => (
            <div
              key={node}
              className="py-1.5 px-1 rounded border bg-[#3D3A28] text-[#FFDB00] border-[#FFDB00]/45 font-semibold"
            >
              {node}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==================== 6. BIDS — BAGGAGE INFORMATION DISPLAY SIMULATOR ====================
  if (simulationType === 'bids_sync') {
    return (
      <div className="space-y-3">
        {/* Mini BIDS Belt 7 Display */}
        <div className="rounded-lg bg-[#242424] text-[#F5F3EE] p-3 border border-[#4A4A4A]">
          <div className="flex items-center justify-between border-b border-[#454545] pb-1.5 mb-2">
            <span className="font-mono-tech text-[11px] text-[#FFDB00] font-bold">INJOURNEY · BIDS BELT 7</span>
            <span className="font-mono-tech text-xs font-bold text-[#D6D3CB]">{liveClock}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono-tech">
            <span className="text-white font-bold">JT-897 · JAKARTA (CGK)</span>
            <span
              className={
                bidsStatus === 'LAST BAG'
                  ? 'text-[#FFDB00] font-bold'
                  : bidsStatus === 'FIRST BAG'
                    ? 'text-sky-300 font-bold'
                    : 'text-emerald-400 font-bold'
              }
            >
              {bidsStatus}
            </span>
          </div>
        </div>

        {/* Baggage Belt Status Selector */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="font-medium text-[#D6D3CB]">
              {lang === 'id' ? 'Simulasi Status Conveyor Bagasi (BHS → BIDS):' : 'Simulate Baggage Belt Status (BHS → BIDS):'}
            </span>
            <span className="font-mono-tech font-semibold text-[#FFDB00]">BELT 7 · RJ45 LAN</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['FIRST BAG', 'DELIVERING', 'LAST BAG'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setBidsStatus(st);
                  playTone(660, 0.08, 'sine', 0.05);
                  onSimulationRun();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                  bidsStatus === st
                    ? 'bg-[#FFDB00] text-[#242424] border-[#FFDB00] font-bold'
                    : 'bg-[#262626] text-[#D6D3CB] border-[#4A4A4A] hover:bg-[#3D3D3D]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* BIDS Signal Flow Strip */}
        <div className="grid grid-cols-4 gap-1.5 text-center font-mono-tech text-[10px]">
          {['AODB / BHS', 'LAN RJ45', 'Media Player', 'BIDS Belt 7'].map((node) => (
            <div
              key={node}
              className="py-1.5 px-1 rounded border bg-[#3D3A28] text-[#FFDB00] border-[#FFDB00]/45 font-semibold"
            >
              {node}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==================== 7. PAS & AAS — BOSCH PUBLIC ADDRESS SIMULATOR ====================
  if (simulationType === 'pas_broadcast') {
    const zoneOptions: Array<{
      id: PasInspectorZoneId;
      label_id: string;
      label_en: string;
      speakersText: string;
      mode: PasBroadcastMode;
      load: string;
    }> = [
      { id: 'indoor', label_id: 'Ceiling (6W)', label_en: 'Ceiling (6W)', speakersText: 'Ceiling Speaker', mode: 'baggage', load: '6W' },
      { id: 'concourse', label_id: 'Column + Ceiling', label_en: 'Column + Ceiling', speakersText: 'Column + Ceiling', mode: 'boarding', load: '26W' },
      { id: 'outdoor', label_id: 'Horn IP65 (30W)', label_en: 'Horn IP65 (30W)', speakersText: 'Horn Outdoor', mode: 'security', load: '30W' },
      { id: 'all', label_id: 'All-Zone (Darurat)', label_en: 'All-Zone (Emergency)', speakersText: 'Column + Ceiling + Horn', mode: 'emergency', load: '56W' },
    ];

    const currentZone: PasInspectorZoneId = pasBridge
      ? pasBridge.zone
      : pasTargetZone === 'lobby'
        ? 'indoor'
        : pasTargetZone === 'baggage'
          ? 'outdoor'
          : pasTargetZone === 'concourse'
            ? 'concourse'
            : 'all';
    const isLive = pasBridge ? pasBridge.active : aasPlaying;
    const isEmergency = pasBridge ? pasBridge.emergency : currentZone === 'all';
    const activeZoneSpec = zoneOptions.find((z) => z.id === currentZone) ?? zoneOptions[1];

    const handleSelectZone = (zoneId: PasInspectorZoneId) => {
      if (pasBridge) {
        pasBridge.onSelectZone(zoneId);
        return;
      }
      setPasTargetZone(zoneId === 'indoor' ? 'lobby' : zoneId === 'outdoor' ? 'baggage' : zoneId === 'concourse' ? 'concourse' : 'all');
      if (aasPlaying) {
        stopPasBroadcast();
        setAasPlaying(false);
      }
    };

    const toggleAasBroadcast = () => {
      if (pasBridge) {
        pasBridge.onTogglePtt(currentZone === 'all');
        return;
      }
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
        {/* BOSCH Call Station + OMNEO Rack Telemetry Header */}
        <div className="rounded-lg bg-[#242424] text-[#F5F3EE] p-3 border border-[#4A4A4A]">
          <div className="flex items-center justify-between border-b border-[#454545] pb-1.5 mb-2">
            <span className="font-mono-tech text-[11px] text-[#FFDB00]">BOSCH PRAESENSA · OMNEO MATRIX</span>
            <span className={`font-mono-tech text-xs font-bold ${isLive ? (isEmergency ? 'text-red-400' : 'text-emerald-400') : 'text-[#9A978F]'}`}>
              {isLive ? (isEmergency ? 'EMERGENCY ON AIR' : 'PTT LIVE ON AIR') : 'STANDBY'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono-tech">
            <span className="text-[#D6D3CB]">{activeZoneSpec.speakersText}</span>
            <span className="text-[#FFDB00] font-bold">100V LINE · {activeZoneSpec.load}</span>
          </div>
        </div>

        {/* Target PAS Speaker Zone Selector */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="font-medium text-[#D6D3CB]">
              {lang === 'id' ? 'Keypad Ekspansi Zona Speaker 100V:' : '100V Speaker Zone Extension Keypad:'}
            </span>
            <span className="font-mono-tech font-semibold text-[#FFDB00]">11× POWER AMP</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {zoneOptions.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => handleSelectZone(z.id)}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                  currentZone === z.id
                    ? z.id === 'all'
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-[#FFDB00] text-[#242424] border-[#FFDB00] font-bold'
                    : 'bg-[#262626] text-[#D6D3CB] border-[#4A4A4A] hover:bg-[#3D3D3D]'
                }`}
              >
                {lang === 'id' ? z.label_id : z.label_en}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#BDBAB2]">
            {lang === 'id'
              ? 'Klik PTT di model 3D Paging atau tombol ini untuk siaran & aliran data kabel.'
              : 'Click the 3D Paging PTT button or here to broadcast & trace cable signal flow.'}
          </span>
          <button
            type="button"
            onClick={toggleAasBroadcast}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
              isLive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424]'
            }`}
          >
            {isLive ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{lang === 'id' ? 'Stop PTT' : 'Stop PTT'}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#242424]" />
                <span>{lang === 'id' ? 'Tekan PTT / Siarkan' : 'Press PTT / Broadcast'}</span>
              </>
            )}
          </button>
        </div>

        {/* Signal Flow Activation Strip */}
        <div className="grid grid-cols-4 gap-1.5 text-center font-mono-tech text-[10px]">
          {[
            { label: 'Paging PTT', active: isLive && (pasBridge ? pasBridge.fromPaging : true) },
            { label: 'Kabel OMNEO', active: isLive && (pasBridge ? pasBridge.fromPaging : true) },
            { label: 'Modul Rak 42U', active: isLive },
            { label: 'Kabel 100V → SPK', active: isLive },
          ].map((node) => (
            <div
              key={node.label}
              className={`py-1.5 px-1 rounded border transition-colors ${
                node.active
                  ? isEmergency
                    ? 'bg-red-600 text-white border-red-500 font-semibold'
                    : 'bg-[#FFDB00] text-[#242424] border-[#FFDB00] font-bold'
                  : 'bg-[#262626] text-[#BDBAB2] border-[#454545]'
              }`}
            >
              {node.label}
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
        <div className="flex items-center gap-1 p-1 bg-[#262626] border border-[#454545] rounded-lg">
          <button
            type="button"
            onClick={() => setRadioDevice('ht')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
              radioDevice === 'ht' ? 'bg-[#FFDB00] text-[#242424] font-bold' : 'text-[#D6D3CB] hover:text-white'
            }`}
          >
            Handy Talky (5W)
          </button>
          <button
            type="button"
            onClick={() => setRadioDevice('rig')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
              radioDevice === 'rig' ? 'bg-[#FFDB00] text-[#242424] font-bold' : 'text-[#D6D3CB] hover:text-white'
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
          className="font-mono-tech text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#262626] hover:bg-[#3D3D3D] border border-[#4A4A4A] text-[#FFDB00] cursor-pointer transition-colors"
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
        className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
          pttActive
            ? 'bg-emerald-600 text-white'
            : 'bg-[#FFDB00] hover:bg-[#E6C500] text-[#242424]'
        }`}
      >
        <Radio className={`w-4 h-4 ${pttActive ? 'text-white' : 'text-[#242424]'}`} />
        <span>
          {pttActive
            ? `TX ACTIVE · ${radioDevice === 'ht' ? 'HT' : 'RIG'} -> IGCS BASE STATION`
            : lang === 'id' ? 'Tekan Push-to-Talk (PTT)' : 'Press Push-to-Talk (PTT)'}
        </span>
      </button>

      <div className="rounded-lg bg-[#242424] border border-[#4A4A4A] p-3 text-[#F5F3EE]">
        <div className="flex justify-between font-mono-tech text-[11px] text-[#FFDB00] mb-1.5">
          <span>{pttActive ? 'MODULATING FM/DMR CARRIER' : 'RX SQUELCH STANDBY'}</span>
          <span>VSWR 1.1:1</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center font-mono-tech text-[10px]">
          {[radioDevice === 'ht' ? 'HT Mic/PTT' : 'RIG Mic/PTT', 'RF Filter/PA', 'IGCS Repeater', 'PABX / TOC'].map((step) => (
            <div
              key={step}
              className={`py-1.5 px-1 rounded border ${
                pttActive
                  ? 'bg-[#FFDB00] border-[#FFDB00] text-[#242424] font-bold'
                  : 'bg-[#1C1C1C] border-[#454545] text-[#BDBAB2]'
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

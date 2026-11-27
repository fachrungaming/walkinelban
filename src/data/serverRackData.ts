export type RackUnitId =
  | 'unit_01'
  | 'unit_02'
  | 'unit_03'
  | 'unit_04'
  | 'unit_05'
  | 'unit_09'
  | 'unit_08'
  | 'unit_06'
  | 'unit_07';

export type RackVisualMode = 'solid' | 'xray' | 'wireframe';

export type RackCameraPresetId =
  | 'isometric'
  | 'front'
  | 'rear'
  | 'top'
  | 'side'
  | 'focus_upper'
  | 'focus_lower'
  | 'server_interior';

export type KvmTargetId = 'r360' | 'ccr2004' | 'crs326';

export type RackUnitStatus = 'NOMINAL' | 'WARNING' | 'FAULT';

export interface RackUnitSpec {
  label: string;
  value: string;
}

export interface RackUnitMetrics {
  loadPercent: number;
  temperatureC: number;
  rpmOrRate: number;
  throughputGbps?: number;
  voltageV?: number;
  batteryPercent?: number;
  poeWatts?: number;
  activePorts?: number;
  totalPorts?: number;
  packetLossPercent?: number;
}

export interface RackUnitDefinition {
  componentId: RackUnitId;
  numberBadge: number;
  name: string;
  shortTitle: string;
  category: 'termination' | 'organizer' | 'switching' | 'security' | 'compute' | 'power';
  status: RackUnitStatus;
  functionSummary: string;
  technicalDescription: string;
  specs: RackUnitSpec[];
  metrics: RackUnitMetrics;
  rackUnitPosition: string;
  accentHex: string;
  focusY: number;
}

export interface RackSimulationParams {
  trafficLoadPercent: number;
  poeDeviceLoadWatts: number;
  ambientTempC: number;
  explodedFactor: number;
  packetSpeedMultiplier: number;
  showCables: boolean;
  showEnclosure: boolean;
  frontDoorOpen: boolean;
  kvmConsoleOpen: boolean;
  rearDoorOpen: boolean;
  sidePanelsDetached: boolean;
  visualMode: RackVisualMode;
  assemblyProgress: number;
  isAssembling: boolean;
}

export interface RackFaultState {
  pduBreakerTrip: boolean;
  upsGridLoss: boolean;
  uplinkPortDown: boolean;
  firewallTrafficSurge: boolean;
  switchFanFailure: boolean;
}

export interface DrUcokStage {
  code: 'D' | 'R' | 'U' | 'C' | 'O' | 'K';
  title: string;
  indonesianTitle: string;
  objective: string;
  socraticQuestion: string;
  actionInstruction: string;
  verificationHint: string;
}

export interface RackDiagnosticQuizQuestion {
  id: string;
  title: string;
  scenarioDescription: string;
  requiredComponentFocus: RackUnitId;
  presetFaultToApply: RackFaultState;
  questionText: string;
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
  explanation: string;
}

export const RACK_UNIT_ORDER: RackUnitId[] = [
  'unit_01',
  'unit_02',
  'unit_03',
  'unit_04',
  'unit_05',
  'unit_09',
  'unit_08',
  'unit_06',
  'unit_07',
];

export const DEFAULT_RACK_SIM_PARAMS: RackSimulationParams = {
  trafficLoadPercent: 45,
  poeDeviceLoadWatts: 140,
  ambientTempC: 22,
  explodedFactor: 0,
  packetSpeedMultiplier: 1,
  showCables: true,
  showEnclosure: true,
  frontDoorOpen: true,
  kvmConsoleOpen: false,
  rearDoorOpen: true,
  sidePanelsDetached: false,
  visualMode: 'solid',
  assemblyProgress: 1,
  isAssembling: false,
};

export const DEFAULT_RACK_FAULT_STATE: RackFaultState = {
  pduBreakerTrip: false,
  upsGridLoss: false,
  uplinkPortDown: false,
  firewallTrafficSurge: false,
  switchFanFailure: false,
};

export const BASE_RACK_UNITS: Record<RackUnitId, RackUnitDefinition> = {
  unit_01: {
    componentId: 'unit_01',
    numberBadge: 1,
    name: '24-Port Cat6A Shielded Patch Panel',
    shortTitle: 'Patch Panel 24P',
    category: 'termination',
    status: 'NOMINAL',
    functionSummary:
      'Titik terminasi kabel jaringan horizontal gedung (CCTV, FIDS, Access Control & PABX) sebelum dihubungkan via patch cord ke switch.',
    technicalDescription:
      'Patch Panel 1U 24-Port Cat6A Shielded (40U) menerima terminasi permanen kabel UTP/STP dari seluruh zona terminal bandara. Memudahkan penataan, pelabelan, pengujian kontinuitas, serta penggantian patch cord pendek di sisi depan tanpa mengganggu kabel instalasi permanen di dinding/plafon.',
    specs: [
      { label: 'Posisi Rak', value: '40U (1U Standard 19")' },
      { label: 'Kapasitas & Standar', value: '24x RJ45 Cat6A Shielded · 10GBASE-T (500 MHz)' },
      { label: 'Terminasi Belakang', value: 'IDC 110/Krone Punch-Down · T568B' },
      { label: 'Grounding', value: 'Bonded ke Busbar Tembaga Rak 42U' },
    ],
    metrics: {
      loadPercent: 45,
      temperatureC: 24.1,
      rpmOrRate: 1000,
      throughputGbps: 4.3,
      activePorts: 24,
      totalPorts: 24,
      packetLossPercent: 0.01,
    },
    rackUnitPosition: '40U (1U Patch Panel)',
    accentHex: '#0284c7',
    focusY: 2.02,
  },
  unit_02: {
    componentId: 'unit_02',
    numberBadge: 2,
    name: 'Upper 1U Horizontal Cable Management Duct',
    shortTitle: 'Cable Management Atas',
    category: 'organizer',
    status: 'NOMINAL',
    functionSummary:
      'Kanal manajemen kabel 1U jari-jari (finger duct) yang menjaga radius tekuk (bend radius) dan kerapian jalur patch cord antara Patch Panel & Switch.',
    technicalDescription:
      'Dipasang pada posisi 36U–37U tepat di antara Patch Panel 24-Port dan Switch MikroTik CRS326-24G-2S+RM. Mencegah beban tarik pada konektor RJ45, memisahkan bundel kabel data (biru/hijau/abu-abu) dari uplink SFP+ oranye, serta memperlancar aliran udara dingin depan-ke-belakang.',
    specs: [
      { label: 'Posisi Rak', value: '36U – 37U (1U Finger Duct + Cover)' },
      { label: 'Standar Bend Radius', value: '≥ 4x Diameter Kabel Cat6A (TIA-568)' },
      { label: 'Rasio Pengisian', value: '62% (Batas Maksimum TIA-569: 70%)' },
      { label: 'Pengikat Bundel', value: 'Velcro Hook & Loop Tie (Bebas Tekanan)' },
    ],
    metrics: {
      loadPercent: 62,
      temperatureC: 23.8,
      rpmOrRate: 0,
      activePorts: 12,
      totalPorts: 24,
    },
    rackUnitPosition: '36U–37U (1U Duct)',
    accentHex: '#7c3aed',
    focusY: 1.84,
  },
  unit_03: {
    componentId: 'unit_03',
    numberBadge: 3,
    name: 'MikroTik CRS326-24G-2S+RM (24G + 2x SFP+ Dual-Boot 1U)',
    shortTitle: 'CRS326-24G-2S+RM Switch',
    category: 'switching',
    status: 'NOMINAL',
    functionSummary:
      'Switch distribusi rackmount 1U 24 port Gigabit Ethernet dengan 2 cage SFP+ 10Gbps dan fitur Dual-Boot (RouterOS L5 atau SwitchOS).',
    technicalDescription:
      'MikroTik Cloud Router Switch CRS326-24G-2S+RM (32U–33U) ditenagai chip Marvell Prestera 98DX3236A1 (ARM 32-bit 800 MHz, RAM 512 MB, Flash 16 MB) dalam sasis 1U fanless (pendinginan pasif senyap). Memiliki 24 port RJ45 Gigabit (Ether1 mendukung Passive PoE-in 10–30V), 2 slot cage SFP+ 10Gbps untuk uplink fiber optik ke Router & NVR, 1 port Serial Console RJ45, serta DC Jack belakang (maks 24 W).',
    specs: [
      { label: 'Model & Sasis', value: 'CRS326-24G-2S+RM · 1U (443×144×44 mm)' },
      { label: 'CPU & Memori', value: 'Marvell 98DX3236A1 800 MHz · 512 MB RAM' },
      { label: 'Sistem Operasi', value: 'Dual Boot: RouterOS L5 / SwitchOS (SwOS)' },
      { label: 'Antarmuka Port', value: '24x 1G RJ45 + 2x 10G SFP+ + 1x Console' },
      { label: 'Suplai Daya', value: 'DC Jack Belakang & PoE-in Ether1 (10–30V, 24W)' },
    ],
    metrics: {
      loadPercent: 45,
      temperatureC: 36.2,
      rpmOrRate: 800,
      throughputGbps: 18.4,
      poeWatts: 19,
      activePorts: 24,
      totalPorts: 26,
      packetLossPercent: 0.01,
    },
    rackUnitPosition: '32U–33U (1U Switch)',
    accentHex: '#ea580c',
    focusY: 1.66,
  },
  unit_04: {
    componentId: 'unit_04',
    numberBadge: 4,
    name: 'Lower 1U Horizontal Cable Management Duct',
    shortTitle: 'Cable Management Tengah',
    category: 'organizer',
    status: 'NOMINAL',
    functionSummary:
      'Kanal manajemen kabel 1U tunggal yang merapikan jalur trunk antara Switch CRS326-24G-2S+RM dan Cloud Core Router CCR2004-16G-2S+.',
    technicalDescription:
      'Kanal manajemen kabel 1U (28U–29U) memisahkan jalur kabel data akses dan uplink trunk menuju Router CCR2004 sekaligus menghemat ruang vertikal rak agar tersedia ruang bukaan penuh bagi monitor LCD 18.5" Widescreen 16:9 pada KVM Console di bawah Router.',
    specs: [
      { label: 'Posisi Rak', value: '28U – 29U (Single 1U Horizontal Duct)' },
      { label: 'Pemisahan Jalur', value: '3 Bundel Paralel Comb-Dressed + Velcro Tie' },
      { label: 'Rasio Pengisian', value: '48% (Batas Maksimum TIA-569: 70%)' },
      { label: 'Proteksi EMI', value: 'Jarak Aman > 15 cm dari Jalur Daya AC' },
    ],
    metrics: {
      loadPercent: 48,
      temperatureC: 25.0,
      rpmOrRate: 0,
      activePorts: 12,
      totalPorts: 24,
    },
    rackUnitPosition: '28U–29U (1U Duct)',
    accentHex: '#9333ea',
    focusY: 1.48,
  },
  unit_05: {
    componentId: 'unit_05',
    numberBadge: 5,
    name: 'MikroTik Cloud Core Router CCR2004-16G-2S+ (1U Rackmount)',
    shortTitle: 'CCR2004-16G-2S+ Router',
    category: 'security',
    status: 'NOMINAL',
    functionSummary:
      'Cloud Core Router 1U dengan CPU 4-Core ARM 64-bit 1.7 GHz, RAM 4GB DDR4, 16x Gigabit RJ45, 2x 10G SFP+, Firewall, VLAN, dan Dual Redundant AC PSU.',
    technicalDescription:
      'MikroTik Cloud Core Router CCR2004-16G-2S+ (24U–25U) menggunakan prosesor Annapurna Labs Alpine v2 AL32400 (4-Core ARMv8-A Cortex-A57 @ 1.7 GHz), RAM 4 GB DDR4, dan RouterOS v7 Level 6. Menjadi gateway routing, NAT, DHCP, dan Firewall seluruh subsistem Elektronika Bandara dengan 2 catu daya AC redundan (Dual PSU 100–240V, 48W) serta 2 kipas aktif PWM.',
    specs: [
      { label: 'Model & Sasis', value: 'CCR2004-16G-2S+ · 1U (443×210×44 mm)' },
      { label: 'CPU & Memori', value: 'AL32400 4-Core 1.7 GHz ARM64 · 4 GB DDR4' },
      { label: 'Sistem Operasi', value: 'MikroTik RouterOS v7 (License Level 6)' },
      { label: 'Antarmuka Port', value: '16x 1G RJ45 + 2x 10G SFP+ + Console + USB 3.0' },
      { label: 'Catu Daya & Pendingin', value: 'Dual Redundant AC PSU (100–240V, 48W) · 2x Fan' },
    ],
    metrics: {
      loadPercent: 34,
      temperatureC: 41.2,
      rpmOrRate: 3400,
      throughputGbps: 14.8,
      poeWatts: 35,
      activePorts: 16,
      totalPorts: 18,
      packetLossPercent: 0.01,
    },
    rackUnitPosition: '24U–25U (1U Core Router)',
    accentHex: '#0284c7',
    focusY: 1.30,
  },
  unit_09: {
    componentId: 'unit_09',
    numberBadge: 6,
    name: '1U 18.5" Rackmount Clamshell LCD KVM Console & 8-Port KVM Switch',
    shortTitle: '1U LCD KVM Console',
    category: 'compute',
    status: 'NOMINAL',
    functionSummary:
      'Konsol manajemen lokal 1U model clamshell tarik dengan monitor LCD 18.5" FHD 16:9, keyboard 104-tombol + touchpad, dan 8-Port Multi-Target KVM Switch.',
    technicalDescription:
      'Dipasang pada rel 15U–16U (bentang layar clamshell 95° hingga 22U) di antara Router CCR2004 dan Server Dell PowerEdge R360. Memungkinkan teknisi ElBan memantau konsol lokal CH01 (Dell PowerEdge R360 iDRAC9/Ubuntu), CH02 (MikroTik CCR2004 CLI), dan CH03 (MikroTik CRS326 SwitchOS) langsung di depan rak.',
    specs: [
      { label: 'Model & Form Factor', value: '1U Dual-Rail Clamshell KVM Drawer (15U–22U)' },
      { label: 'Layar & Proporsi', value: '18.5" FHD 16:9 Widescreen TFT-LCD (1920×1080)' },
      { label: 'Kapasitas KVM Switch', value: '8-Port Combo VGA/HDMI + USB/Serial (OSD)' },
      { label: 'Target Terhubung', value: 'CH01: Dell R360 · CH02: CCR2004 · CH03: CRS326' },
      { label: 'Input & Catu Daya', value: 'Keyboard 104-Key + Touchpad · AC 100–240V (22W)' },
    ],
    metrics: {
      loadPercent: 18,
      temperatureC: 32.4,
      rpmOrRate: 60,
      poeWatts: 22,
      activePorts: 3,
      totalPorts: 8,
    },
    rackUnitPosition: '15U–22U (1U Clamshell LCD)',
    accentHex: '#10b981',
    focusY: 0.96,
  },
  unit_08: {
    componentId: 'unit_08',
    numberBadge: 7,
    name: 'Dell PowerEdge R360 1U Rack Server (Xeon 6 6315P · 32GB DDR5 · 2x 2TB)',
    shortTitle: 'Dell PowerEdge R360',
    category: 'compute',
    status: 'NOMINAL',
    functionSummary:
      'Server 1U enterprise dengan Intel Xeon 6 6315P (2.8GHz 4C/4T), RAM 32GB DDR5 ECC, 2x 2TB SATA RAID-1 (PERC H755), Dual 1GbE Broadcom 5720, iDRAC9 & 600W PSU.',
    technicalDescription:
      'Dell PowerEdge R360 (12U–13U) menjadi server utama sistem FIDS/PAS/NVR/Access Control ElBan. Mengusung prosesor Intel Xeon 6 Performance 6315P (55W TDP), memori 32GB DDR5-5600 ECC UDIMM, RAID-1 hardware PERC H755/H355 pada 2× 2TB SATA hot-plug bay, Dual-Port 1GbE Broadcom 5720 LOM, manajemen jarak jauh iDRAC9 Basic 16G, dan 600W Platinum Hot-Plug PSU.',
    specs: [
      { label: 'Model & P/N', value: 'Dell PowerEdge R360 (1U) · 16th Gen' },
      { label: 'Prosesor (CPU)', value: 'Intel Xeon 6 Performance 6315P (2.8G, 4C/4T, 55W)' },
      { label: 'Memori (RAM)', value: '32GB 5600MT/s DDR5 ECC UDIMM (Max 128GB)' },
      { label: 'Penyimpanan & RAID', value: '2x 2TB SATA HDD · PERC H755/H355 (RAID 1)' },
      { label: 'Jaringan, iDRAC & PSU', value: 'Broadcom 5720 Dual 1GbE · iDRAC9 16G · 600W PSU' },
    ],
    metrics: {
      loadPercent: 38,
      temperatureC: 43.5,
      rpmOrRate: 4800,
      throughputGbps: 1.85,
      poeWatts: 165,
      activePorts: 3,
      totalPorts: 3,
      packetLossPercent: 0,
    },
    rackUnitPosition: '12U–13U (1U Rack Server)',
    accentHex: '#0ea5e9',
    focusY: 0.72,
  },
  unit_06: {
    componentId: 'unit_06',
    numberBadge: 8,
    name: 'APC Smart-UPS C 3000VA Rackmount LCD 230V (SMC3000RMI2U)',
    shortTitle: 'APC Smart-UPS C 3000VA',
    category: 'power',
    status: 'NOMINAL',
    functionSummary:
      'UPS rackmount 2U (3000 VA / 2100 W, 230V) gelombang sinus murni dengan baterai Lead-Acid internal, panel LCD biru real-time, 8x IEC C13 + 1x IEC C19.',
    technicalDescription:
      'APC Smart-UPS C 3000VA 2U (06U–07U) melindungi seluruh perangkat jaringan dan server ElBan dari pemadaman PLN atau trip PDU. Dilengkapi layar LCD grafis biru yang menampilkan tegangan output 230V, persentase baterai, beban daya, dan status ON-BATTERY secara langsung di panel depan.',
    specs: [
      { label: 'Model & Ukuran Rak', value: 'SMC3000RMI2U · 2U (48×67×8.9 cm, 41 kg)' },
      { label: 'Kapasitas Daya', value: '2100 Watt / 3000 VA (Pure Sine Wave)' },
      { label: 'Tegangan In / Out', value: 'AC 230 V ± 5% (50/60 Hz)' },
      { label: 'Konektor Daya', value: 'In: 1x IEC C20 · Out: 8x IEC C13 + 1x IEC C19' },
      { label: 'Baterai & Manajemen', value: 'Internal Lead-Acid · USB & Serial RJ45' },
    ],
    metrics: {
      loadPercent: 32,
      temperatureC: 34.5,
      rpmOrRate: 2200,
      voltageV: 230,
      batteryPercent: 100,
      poeWatts: 520,
      activePorts: 9,
      totalPorts: 9,
    },
    rackUnitPosition: '06U–07U (2U Smart-UPS)',
    accentHex: '#d97706',
    focusY: 0.44,
  },
  unit_07: {
    componentId: 'unit_07',
    numberBadge: 9,
    name: '1U 19" 6-Way Schuko Rackmount PDU (CEE 7/3 · 16A 250V~)',
    shortTitle: 'PDU 1U 6-Way Schuko',
    category: 'power',
    status: 'NOMINAL',
    functionSummary:
      'Unit distribusi daya rackmount 1U dengan 6 soket Schuko CEE 7/3 diagonal 45° berklip arde ganda dan sakelar rocker utama I/O beriluminasi merah.',
    technicalDescription:
      'Power Distribution Unit 1U (02U) berbahan aluminium ekstrusi anodized hitam berkapasitas 16A / 250V~ (3680W). Sisi kiri memuat sakelar utama rocker merah (I/O) dengan pelindung bezel yang terputus secara fisik saat terjadi arus lebih (PDU Breaker Trip), sementara 6 soket Schuko menyuplai daya AC ke UPS dan perangkat bantu.',
    specs: [
      { label: 'Model & Sasis', value: '19" 1U Aluminum Profile · 3-Slot Rack Ears' },
      { label: 'Konfigurasi Soket', value: '6x Schuko CEE 7/3 (Type F) Diagonal 45°' },
      { label: 'Kapasitas Daya', value: '16 A Maksimum @ 230–250 V~ (3680 W)' },
      { label: 'Sakelar & Kabel', value: 'Red Illuminated I/O Rocker · H05VV-F 3G1.5mm²' },
    ],
    metrics: {
      loadPercent: 44,
      temperatureC: 31.0,
      rpmOrRate: 50,
      voltageV: 230,
      poeWatts: 545,
      activePorts: 6,
      totalPorts: 6,
    },
    rackUnitPosition: '02U (1U Horizontal PDU)',
    accentHex: '#9333ea',
    focusY: 0.22,
  },
};

export function computeRackTelemetry(
  params: RackSimulationParams,
  faults: RackFaultState,
  tick: number
): Record<RackUnitId, RackUnitDefinition> {
  const result = {} as Record<RackUnitId, RackUnitDefinition>;
  const wave = Math.sin(tick * 0.7) * 0.4;
  const pduActive = !faults.pduBreakerTrip;
  const upsOnBattery = !pduActive || faults.upsGridLoss;
  const serverWatts = Math.min(
    600,
    Math.round(115 + params.trafficLoadPercent * 1.45 + (faults.firewallTrafficSurge ? 65 : 0))
  );
  const totalRackWatts =
    180 +
    serverWatts +
    Math.round(params.trafficLoadPercent * 1.9) +
    params.poeDeviceLoadWatts +
    (faults.firewallTrafficSurge ? 95 : 0);

  for (const id of RACK_UNIT_ORDER) {
    const base = BASE_RACK_UNITS[id];
    const unit: RackUnitDefinition = {
      ...base,
      metrics: { ...base.metrics },
    };

    if (id === 'unit_01') {
      unit.status = faults.uplinkPortDown ? 'WARNING' : 'NOMINAL';
      unit.metrics.activePorts = faults.uplinkPortDown ? 23 : 24;
      unit.metrics.loadPercent = params.trafficLoadPercent;
      unit.metrics.throughputGbps = Math.max(
        0.1,
        Number(((params.trafficLoadPercent / 100) * (faults.uplinkPortDown ? 5.2 : 9.6) + wave * 0.1).toFixed(2))
      );
      unit.metrics.temperatureC = Number((params.ambientTempC + 2.1).toFixed(1));
      unit.metrics.packetLossPercent = faults.uplinkPortDown ? 4.8 : 0.01;
    } else if (id === 'unit_02') {
      unit.status = faults.uplinkPortDown ? 'WARNING' : 'NOMINAL';
      unit.metrics.loadPercent = 62;
      unit.metrics.temperatureC = Number((params.ambientTempC + 1.8).toFixed(1));
    } else if (id === 'unit_03') {
      const fanFail = faults.switchFanFailure;
      const load = Math.min(100, Math.round(params.trafficLoadPercent * 0.75 + (fanFail ? 22 : 0)));
      const watts = Math.min(24, Math.round(11 + (params.trafficLoadPercent / 100) * 13));
      const temp = Number((params.ambientTempC + 12 + load * 0.16 + (fanFail ? 24 : 0) + wave).toFixed(1));
      unit.status = fanFail ? 'FAULT' : faults.uplinkPortDown ? 'WARNING' : 'NOMINAL';
      unit.metrics.loadPercent = load;
      unit.metrics.temperatureC = temp;
      unit.metrics.poeWatts = watts;
      unit.metrics.rpmOrRate = fanFail ? 0 : 800;
      unit.metrics.throughputGbps = Number(
        ((params.trafficLoadPercent / 100) * (faults.uplinkPortDown ? 8.2 : 24.6) + wave * 0.15).toFixed(2)
      );
      unit.metrics.activePorts = faults.uplinkPortDown ? 24 : 26;
      unit.metrics.packetLossPercent = faults.uplinkPortDown ? 6.4 : fanFail ? 1.2 : 0.01;
    } else if (id === 'unit_04') {
      unit.status = 'NOMINAL';
      unit.metrics.temperatureC = Number((params.ambientTempC + 2.4).toFixed(1));
    } else if (id === 'unit_05') {
      const surge = faults.firewallTrafficSurge;
      const load = Math.min(99, Math.round(params.trafficLoadPercent * 0.65 + (surge ? 48 : 8)));
      const temp = Number((params.ambientTempC + 16 + load * 0.22 + (surge ? 12 : 0) + wave).toFixed(1));
      unit.status = surge ? 'FAULT' : faults.uplinkPortDown ? 'WARNING' : 'NOMINAL';
      unit.metrics.loadPercent = load;
      unit.metrics.temperatureC = temp;
      unit.metrics.rpmOrRate = Math.round(2800 + load * 34);
      unit.metrics.throughputGbps = Number(
        ((params.trafficLoadPercent / 100) * 18.5 + (surge ? 12.4 : 0) + wave * 0.2).toFixed(2)
      );
      unit.metrics.poeWatts = Math.min(48, Math.round(24 + load * 0.24));
      unit.metrics.activePorts = faults.uplinkPortDown ? 16 : 18;
      unit.metrics.packetLossPercent = faults.uplinkPortDown ? 7.2 : surge ? 2.4 : 0.01;
    } else if (id === 'unit_09') {
      unit.status = faults.uplinkPortDown || faults.firewallTrafficSurge ? 'WARNING' : 'NOMINAL';
      unit.metrics.temperatureC = Number((params.ambientTempC + 9.8 + wave * 0.3).toFixed(1));
      unit.metrics.loadPercent = params.kvmConsoleOpen ? 32 : 12;
    } else if (id === 'unit_08') {
      const surge = faults.firewallTrafficSurge;
      const load = Math.min(96, Math.round(params.trafficLoadPercent * 0.72 + (surge ? 34 : 6)));
      const temp = Number((params.ambientTempC + 18 + load * 0.25 + wave).toFixed(1));
      unit.status = faults.uplinkPortDown ? 'WARNING' : surge ? 'WARNING' : 'NOMINAL';
      unit.metrics.loadPercent = load;
      unit.metrics.temperatureC = temp;
      unit.metrics.poeWatts = serverWatts;
      unit.metrics.rpmOrRate = Math.round(4200 + load * 42);
      unit.metrics.throughputGbps = Number(
        ((params.trafficLoadPercent / 100) * 1.95 + (surge ? 0.6 : 0)).toFixed(2)
      );
      unit.metrics.packetLossPercent = faults.uplinkPortDown ? 3.5 : 0;
    } else if (id === 'unit_06') {
      const loadPct = Math.min(98, Math.round((totalRackWatts / 2100) * 100));
      const battPct = upsOnBattery ? Math.max(18, 92 - (tick % 35) * 2) : 100;
      unit.status = upsOnBattery ? 'WARNING' : 'NOMINAL';
      unit.metrics.loadPercent = loadPct;
      unit.metrics.poeWatts = totalRackWatts;
      unit.metrics.voltageV = upsOnBattery ? 228 : 231;
      unit.metrics.batteryPercent = battPct;
      unit.metrics.temperatureC = Number((params.ambientTempC + 10.5 + (upsOnBattery ? 6.5 : 0) + wave).toFixed(1));
      unit.metrics.rpmOrRate = upsOnBattery ? 3600 : 2100;
    } else if (id === 'unit_07') {
      unit.status = faults.pduBreakerTrip ? 'FAULT' : 'NOMINAL';
      unit.metrics.voltageV = faults.pduBreakerTrip ? 0 : 231;
      unit.metrics.poeWatts = faults.pduBreakerTrip ? 0 : totalRackWatts + 25;
      unit.metrics.loadPercent = faults.pduBreakerTrip ? 0 : Math.min(95, Math.round(((totalRackWatts + 25) / 3680) * 100));
      unit.metrics.activePorts = faults.pduBreakerTrip ? 0 : 6;
      unit.metrics.temperatureC = Number((params.ambientTempC + (faults.pduBreakerTrip ? 1.5 : 7.8)).toFixed(1));
    }

    result[id] = unit;
  }

  return result;
}

export const DR_UCOK_STAGES: DrUcokStage[] = [
  {
    code: 'D',
    title: 'Discover',
    indonesianTitle: '1. Discover — Eksplorasi Topologi 9 Unit Rak 42U',
    objective:
      'Mengenali tata letak vertikal 42U mulai dari lapisan terminasi (Patch Panel), distribusi (CRS326), core routing (CCR2004), KVM, Server R360, hingga lapisan daya (UPS & PDU).',
    socraticQuestion:
      'Mengapa unit daya berat seperti APC Smart-UPS 3000VA (41 kg) dan PDU ditempatkan di bagian paling bawah rak (02U–07U)?',
    actionInstruction:
      'Klik dan inspeksi minimal 3 unit berbeda pada model 3D Rak 42U atau melalui daftar unit di tab Inspector.',
    verificationHint: 'Terpenuhi otomatis saat Anda menginspeksi ≥ 3 unit perangkat rak.',
  },
  {
    code: 'R',
    title: 'Reveal',
    indonesianTitle: '2. Reveal — Bedah Struktur Internal (Exploded / X-Ray)',
    objective:
      'Mengungkap struktur fisik internal perangkat, panel belakang (iDRAC9, Dual PSU, IEC C13/C19, DC Jack & Grounding) serta penataan kabel.',
    socraticQuestion:
      'Perbedaan kritis apa yang Anda lihat pada panel belakang MikroTik CCR2004-16G-2S+ dibanding CRS326-24G-2S+RM dalam hal redundansi daya?',
    actionInstruction:
      'Geser slider Exploded View (> 20%) atau ubah Mode Rendering ke X-Ray / Wireframe pada Toolbar Rak 3D.',
    verificationHint: 'Terpenuhi saat Exploded View > 20% atau Mode Rendering X-Ray/Wireframe diaktifkan.',
  },
  {
    code: 'U',
    title: 'Utilize',
    indonesianTitle: '3. Utilize — Uji Throughput 24G + 2x SFP+ & Beban Daya',
    objective:
      'Mengoperasikan parameter kerja jaringan dan mengamati respons telemetri real-time pada throughput non-blocking CRS326, suhu perangkat, serta beban UPS 230V.',
    socraticQuestion:
      'Ketika beban trafik > 80% dan beban PoE meningkat, bagaimana pengaruhnya terhadap konsumsi Watt di Dell R360 dan kapasitas beban UPS 3000VA?',
    actionInstruction:
      'Ubah slider Beban Trafik Jaringan atau Beban Daya PoE pada Toolbar Rak 3D untuk mengamati perubahan telemetri dan kecepatan paket 3D.',
    verificationHint: 'Terpenuhi saat Anda mengubah slider beban trafik atau daya PoE.',
  },
  {
    code: 'C',
    title: 'Construct',
    indonesianTitle: '4. Construct — Simulasi Skenario & Injeksi Gangguan',
    objective:
      'Mengonstruksi skenario kegagalan operasional (Fault Injection) untuk memahami propagasi gangguan dari lapisan daya (PDU/UPS) maupun uplink SFP+/RJ45.',
    socraticQuestion:
      'Saat PDU Breaker Trip diaktifkan, bagaimana APC Smart-UPS C 3000VA menjaga operasional Server R360 dan Router CCR2004 tetap menyala?',
    actionInstruction:
      'Aktifkan minimal satu skenario Injeksi Gangguan pada tab Inspector (misalnya PDU Breaker Trip atau Uplink Port Down).',
    verificationHint: 'Terpenuhi saat salah satu tombol Injeksi Gangguan diaktifkan.',
  },
  {
    code: 'O',
    title: 'Optimize',
    indonesianTitle: '5. Optimize — Pemulihan Sistem & Mitigasi Termal',
    objective:
      'Menormalkan kembali kondisi gangguan, memulihkan konektivitas uplink, dan memastikan suhu kerja seluruh perangkat kembali pada rentang aman.',
    socraticQuestion:
      'Bagaimana penataan 1U Horizontal Cable Management (Unit 2 & 4) membantu sirkulasi udara Cold-Aisle ke Hot-Aisle bagi switch fanless CRS326?',
    actionInstruction:
      'Setelah memicu gangguan pada tahap Construct, pulihkan seluruh gangguan hingga seluruh 9 unit kembali berstatus NOMINAL.',
    verificationHint: 'Terpenuhi saat seluruh gangguan dipulihkan kembali ke status NOMINAL.',
  },
  {
    code: 'K',
    title: 'Keynote',
    indonesianTitle: '6. Keynote — Evaluasi Diagnostik & Kesimpulan Vokasi',
    objective:
      'Memvalidasi pemahaman praktikum Digital Twin 42U Network Rack melalui Kuis Diagnostik berbasis kondisi 3D interaktif.',
    socraticQuestion:
      'Bagaimana keterkaitan antara integritas terminasi Patch Panel, proteksi daya UPS, dan monitoring KVM lokal terhadap keandalan operasional Elektronika Bandara?',
    actionInstruction:
      'Buka tab Kuis Diagnostik dan jawab minimal 2 skenario studi kasus diagnostik 42U Network Rack.',
    verificationHint: 'Terpenuhi saat Anda menjawab minimal 2 soal pada tab Kuis Diagnostik.',
  },
];

export const RACK_DIAGNOSTIC_QUIZ: RackDiagnosticQuizQuestion[] = [
  {
    id: 'q1_power_cascade',
    title: 'Kasus 1: Proteksi Daya UPS & PDU',
    scenarioDescription:
      'Sakelar merah pada PDU (Unit 9 / 02U) di bagian dasar rak tiba-tiba terputus (OFF) akibat arus lebih.',
    requiredComponentFocus: 'unit_06',
    presetFaultToApply: {
      pduBreakerTrip: true,
      upsGridLoss: false,
      uplinkPortDown: false,
      firewallTrafficSurge: false,
      switchFanFailure: false,
    },
    questionText:
      'Amati layar LCD pada APC Smart-UPS C 3000VA (Unit 8) dan status perangkat jaringan saat suplai dari PDU mengalami trip. Apa yang terjadi pada sistem rak 42U?',
    options: [
      { id: 'a', label: 'Seluruh perangkat di dalam rak langsung mati total seketika.' },
      {
        id: 'b',
        label:
          'APC Smart-UPS C 3000VA langsung menyuplai daya baterai Lead-Acid internal (~230V ± 5%, hingga 2100W/3000VA) melalui 8 port IEC C13 & 1 port C19 sehingga perangkat tetap aktif.',
      },
      { id: 'c', label: 'Hanya Patch Panel (Unit 1) yang mati karena kehilangan suplai AC.' },
      { id: 'd', label: 'Tegangan keluaran UPS naik menjadi 400V untuk mengkompensasi PDU.' },
    ],
    correctOptionId: 'b',
    explanation:
      'Benar! APC Smart-UPS C 3000VA 2U beralih seketika ke mode ON-BATTERY menggunakan baterai Lead-Acid internal dan menjaga keluaran AC sinus murni ~230V melalui output 8x IEC C13 & 1x IEC C19.',
  },
  {
    id: 'q2_physical_layer',
    title: 'Kasus 2: Terminasi & Patch Cord ke CRS326-24G-2S+RM',
    scenarioDescription:
      'Salah satu jalur patch cord uplink utama antara Patch Panel (Unit 1) dan Switch CRS326-24G-2S+RM (Unit 3) mengalami putus koneksi.',
    requiredComponentFocus: 'unit_01',
    presetFaultToApply: {
      pduBreakerTrip: false,
      upsGridLoss: false,
      uplinkPortDown: true,
      firewallTrafficSurge: false,
      switchFanFailure: false,
    },
    questionText:
      'Berdasarkan topologi fisik 42U Network Rack, apa peran utama Patch Panel (Unit 1) bersama Cable Management (Unit 2) saat teknisi harus mengganti patch cord menuju CRS326?',
    options: [
      {
        id: 'a',
        label:
          'Memungkinkan penggantian patch cord pendek di sisi depan tanpa harus membongkar kabel instalasi permanen di dalam dinding/plafon.',
      },
      { id: 'b', label: 'Melakukan enkripsi paket data sebelum dikirimkan ke CRS326-24G-2S+RM.' },
      { id: 'c', label: 'Mengubah tegangan listrik 230V dari UPS menjadi sinyal optik SFP+.' },
      { id: 'd', label: 'Menjalankan protokol routing BGP pengganti secara otomatis.' },
    ],
    correctOptionId: 'a',
    explanation:
      'Tepat! Patch Panel berfungsi sebagai titik terminasi tetap bagi kabel horizontal gedung sehingga perawatan koneksi cukup dilakukan lewat patch cord pendek di sisi depan melalui kanal Cable Management.',
  },
  {
    id: 'q3_security_gateway',
    title: 'Kasus 3: Perutean Core & Firewall MikroTik CCR2004-16G-2S+',
    scenarioDescription:
      'Terjadi lonjakan trafik mencurigakan dari jaringan eksternal yang memicu beban tinggi pada prosesor Annapurna Labs Alpine v2 1.7 GHz di Unit 5.',
    requiredComponentFocus: 'unit_05',
    presetFaultToApply: {
      pduBreakerTrip: false,
      upsGridLoss: false,
      uplinkPortDown: false,
      firewallTrafficSurge: true,
      switchFanFailure: false,
    },
    questionText:
      'Spesifikasi dan fungsi manakah yang secara tepat mendeskripsikan Unit 5 (MikroTik Cloud Core Router CCR2004-16G-2S+) di dalam arsitektur rak 42U ini?',
    options: [
      { id: 'a', label: 'Kanal manajemen kabel pasif tanpa prosesor.' },
      { id: 'b', label: 'Panel terminasi kabel horizontal Cat6A 24 port.' },
      {
        id: 'c',
        label:
          'MikroTik CCR2004-16G-2S+ (CPU 4-Core ARM64 1.7 GHz, 4GB DDR4, RouterOS v7 L6, 16x 1G RJ45 + 2x 10G SFP+, Dual Redundant AC PSU) untuk routing, NAT, DHCP, dan Firewall.',
      },
      { id: 'd', label: 'PDU 1U 6-Way Schuko pembagi arus listrik AC.' },
    ],
    correctOptionId: 'c',
    explanation:
      'Benar! MikroTik CCR2004-16G-2S+ ditenagai CPU Annapurna Labs Alpine v2 4-Core 1.7 GHz, RAM 4GB DDR4, RouterOS v7 L6, 16x 1G RJ45, 2x 10G SFP+, dan Dual Redundant AC PSU.',
  },
  {
    id: 'q4_switch_poe_thermal',
    title: 'Kasus 4: Spesifikasi & Arsitektur MikroTik CRS326-24G-2S+RM',
    scenarioDescription:
      'Anda menginspeksi panel depan dan belakang Unit 3 (MikroTik Cloud Router Switch CRS326-24G-2S+RM) untuk konfigurasi uplink 10Gbps dan sistem operasi.',
    requiredComponentFocus: 'unit_03',
    presetFaultToApply: {
      pduBreakerTrip: false,
      upsGridLoss: false,
      uplinkPortDown: false,
      firewallTrafficSurge: false,
      switchFanFailure: false,
    },
    questionText:
      'Kombinasi spesifikasi manakah yang secara akurat mendeskripsikan perangkat keras dan sistem operasi pada MikroTik CRS326-24G-2S+RM (Unit 3)?',
    options: [
      {
        id: 'a',
        label:
          '24 port Gigabit RJ45 + 2 cage SFP+ 10G dalam sasis 1U fanless, mendukung Dual Boot (RouterOS L5 / SwitchOS) serta input daya DC Jack & Passive PoE-in (Ether1).',
      },
      { id: 'b', label: '48 port Fast Ethernet 100Mbps tanpa slot SFP+ dalam sasis 4U dengan baterai internal.' },
      { id: 'c', label: 'Hanya memiliki 8 port koaksial analog tanpa manajemen VLAN maupun Console.' },
      { id: 'd', label: 'Perangkat pemutus arus listrik AC utama seluruh rak melalui sakelar rocker merah.' },
    ],
    correctOptionId: 'a',
    explanation:
      'Tepat sekali! MikroTik CRS326-24G-2S+RM menyediakan 24 port Gigabit RJ45 (Ether1 Passive PoE-in 10–30V), 2 cage SFP+ 10Gbps, Serial Console RJ45, dan fitur Dual Boot RouterOS L5 / SwitchOS.',
  },
];

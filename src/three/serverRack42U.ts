import * as THREE from 'three';
import {
  KvmTargetId,
  RACK_UNIT_ORDER,
  RackFaultState,
  RackSimulationParams,
  RackUnitId,
} from '../data/serverRackData';

export interface RackUnitMeshHandle {
  unitId: RackUnitId;
  group: THREE.Group;
  baseZ: number;
  baseY: number;
  explodeZ: number;
  statusLedMat: THREE.MeshStandardMaterial;
  highlightMesh: THREE.Mesh;
}

export interface RackPacketRunner {
  mesh: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  offset: number;
  speed: number;
  isUplink: boolean;
}

export interface Built42UNetworkRack {
  rootGroup: THREE.Group;
  enclosureGroup: THREE.Group;
  frontDoorPivot: THREE.Group;
  rearLeftDoorPivot: THREE.Group;
  rearRightDoorPivot: THREE.Group;
  leftSidePanel: THREE.Group;
  rightSidePanel: THREE.Group;
  roofFanImpellers: THREE.Object3D[];
  cablesGroup: THREE.Group;
  unitHandles: Map<RackUnitId, RackUnitMeshHandle>;
  raycastTargets: THREE.Object3D[];
  packetRunners: RackPacketRunner[];
  uplinkCableMat: THREE.MeshStandardMaterial;
  pduSwitchMesh: THREE.Mesh;
  pduSwitchMat: THREE.MeshStandardMaterial;
  allStandardMaterials: THREE.MeshStandardMaterial[];
  updateUpsLcd: (voltageV: number, batteryPct: number, loadPct: number, onBattery: boolean) => void;
  updateKvmScreen: (target: KvmTargetId, alertActive: boolean) => void;
  updateKvmPose: (openFactor: number) => void;
  updateVisualMode: (mode: 'solid' | 'xray' | 'wireframe') => void;
  updateAssembly: (progress: number) => void;
  dispose: () => void;
}

// ==================== PROCEDURAL HIGH-RES RACK TEXTURES ====================

function finalizeTex(canvas: HTMLCanvasElement, maxAniso: number): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAniso);
  tex.needsUpdate = true;
  return tex;
}

function createPatchPanelTex(maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 1024, 128);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 1020, 124);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 18px "IBM Plex Mono", monospace';
  ctx.fillText('CAT6A SHIELDED · 24P', 18, 30);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 14px "IBM Plex Mono", monospace';
  ctx.fillText('U40 · ELBAN PATCH PANEL', 775, 30);

  // 4 groups of 6 RJ45 shielded keystone jacks
  for (let g = 0; g < 4; g++) {
    const gx = 36 + g * 242;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(gx - 6, 42, 224, 72);
    for (let p = 0; p < 6; p++) {
      const px = gx + p * 36;
      const num = g * 6 + p + 1;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '700 12px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(num).padStart(2, '0'), px + 14, 57);
      ctx.fillStyle = '#020617';
      ctx.fillRect(px + 2, 64, 24, 34);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 2, 64, 24, 34);
      // Gold RJ45 pins
      ctx.fillStyle = '#f59e0b';
      for (let pin = 0; pin < 4; pin++) {
        ctx.fillRect(px + 6 + pin * 4, 68, 2, 7);
      }
    }
    ctx.textAlign = 'left';
  }
  return finalizeTex(c, maxAniso);
}

function createMikrotikSwitchTex(maxAniso: number, model: 'crs326' | 'ccr2004'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  // Classic crisp MikroTik white-silver front aluminum faceplate
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#f1f5f9');
  grad.addColorStop(0.5, '#e2e8f0');
  grad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 128);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 1020, 124);

  // Left brand header
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('MikroTik', 20, 44);
  ctx.fillStyle = model === 'crs326' ? '#ea580c' : '#0284c7';
  ctx.font = '800 15px "IBM Plex Mono", monospace';
  ctx.fillText(model === 'crs326' ? 'CRS326-24G-2S+RM' : 'CCR2004-16G-2S+', 20, 68);
  ctx.fillStyle = '#475569';
  ctx.font = '600 12px "IBM Plex Mono", monospace';
  ctx.fillText(model === 'crs326' ? 'DUAL BOOT · FANLESS' : '4-CORE 1.7GHz · DUAL PSU', 20, 92);

  // Console RJ45 port
  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(216, 48, 30, 38);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(220, 54, 22, 26);
  ctx.font = '700 11px "IBM Plex Mono", monospace';
  ctx.fillText('CON', 218, 42);

  // Main RJ45 Ethernet ports
  const portCount = model === 'crs326' ? 24 : 16;
  const startX = 272;
  const portW = model === 'crs326' ? 22 : 30;
  const stepX = model === 'crs326' ? 25 : 35;

  for (let i = 0; i < portCount; i++) {
    const px = startX + i * stepX + Math.floor(i / 8) * 10;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px, 46, portW, 42);
    ctx.fillStyle = '#020617';
    ctx.fillRect(px + 3, 52, portW - 6, 30);
    // Green/amber link LEDs
    ctx.fillStyle = i % 3 === 0 ? '#22c55e' : '#38bdf8';
    ctx.fillRect(px + 3, 40, 6, 4);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(px + portW - 9, 40, 6, 4);
    ctx.fillStyle = '#334155';
    ctx.font = '700 10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), px + portW / 2, 102);
  }
  ctx.textAlign = 'left';

  // 2x 10G SFP+ fiber cages on right
  const sfpX = 905;
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 12px "IBM Plex Mono", monospace';
  ctx.fillText('10G SFP+', sfpX + 6, 36);
  for (let s = 0; s < 2; s++) {
    const x = sfpX + s * 52;
    ctx.fillStyle = '#334155';
    ctx.fillRect(x, 46, 44, 42);
    ctx.fillStyle = '#020617';
    ctx.fillRect(x + 5, 52, 34, 30);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(x + 8, 56, 28, 6);
  }

  return finalizeTex(c, maxAniso);
}

function createDellR360FrontTex(maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0b1018';
  ctx.fillRect(0, 0, 1024, 128);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 1020, 124);

  // Left ear + status LEDs
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(10, 10, 62, 108);
  ctx.fillStyle = '#00a8e8';
  ctx.fillRect(22, 26, 38, 12);
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(41, 66, 7, 0, Math.PI * 2);
  ctx.fill();

  // 4x 3.5" SATA Hot-Plug Drive Caddies (2x active 2TB SATA + 2x ventilated blanks)
  for (let i = 0; i < 4; i++) {
    const dx = 86 + i * 204;
    ctx.fillStyle = '#151b26';
    ctx.fillRect(dx, 14, 194, 100);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(dx, 14, 194, 100);

    // Release latch
    ctx.fillStyle = i < 2 ? '#f97316' : '#475569';
    ctx.fillRect(dx + 12, 34, 20, 56);

    // Honeycomb mesh perforations
    ctx.fillStyle = '#05080f';
    for (let r = 0; r < 3; r++) {
      for (let col = 0; col < 5; col++) {
        ctx.fillRect(dx + 44 + col * 18, 28 + r * 24, 12, 16);
      }
    }

    // Drive label
    ctx.fillStyle = i < 2 ? '#e2e8f0' : '#64748b';
    ctx.font = '800 13px "IBM Plex Mono", monospace';
    ctx.fillText(i < 2 ? '2TB' : 'BAY', dx + 140, 54);
    ctx.font = '700 11px "IBM Plex Mono", monospace';
    ctx.fillStyle = i < 2 ? '#38bdf8' : '#475569';
    ctx.fillText(i < 2 ? 'SATA' : `0${i}`, dx + 140, 74);

    if (i < 2) {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(dx + 22, 24, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Right Dell R360 badge + Power button
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(906, 12, 106, 104);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('DELL', 922, 40);
  ctx.fillStyle = '#00a8e8';
  ctx.font = '800 15px "IBM Plex Mono", monospace';
  ctx.fillText('R360', 922, 62);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(956, 92, 11, 0, Math.PI * 2);
  ctx.stroke();

  return finalizeTex(c, maxAniso);
}

function createDellR360RearTex(maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#b8c0cc';
  ctx.fillRect(0, 0, 1024, 128);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 1020, 124);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 14px "IBM Plex Mono", monospace';
  ctx.fillText('iDRAC9 16G', 24, 30);
  ctx.fillText('BROADCOM 5720 DUAL 1GbE', 145, 30);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(24, 48, 84, 52);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(126, 48, 84, 52);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 13px "IBM Plex Mono", monospace';
  ctx.fillText('iDRAC', 44, 79);
  ctx.fillText('VGA', 152, 79);

  // PCIe Riser Slots
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(380, 18, 280, 92);
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 13px "IBM Plex Mono", monospace';
  ctx.fillText('PCIe Gen4 · PERC H755 RAID', 400, 38);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(398, 48, 244, 22);
  ctx.fillRect(398, 78, 244, 22);

  // 600W Platinum PSU Bay
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(686, 16, 165, 96);
  ctx.fillStyle = '#22c55e';
  ctx.font = '800 13px "IBM Plex Mono", monospace';
  ctx.fillText('PSU1 · 600W', 702, 38);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(822, 24, 18, 42);
  ctx.fillStyle = '#090d16';
  ctx.fillRect(702, 52, 108, 48);

  // PSU 2 Blank
  ctx.fillStyle = '#64748b';
  ctx.fillRect(862, 16, 146, 96);
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 12px "IBM Plex Mono", monospace';
  ctx.fillText('PSU 2 (1+0)', 888, 68);

  return finalizeTex(c, maxAniso);
}

function createUpsLcdTex(
  voltageV: number,
  batteryPct: number,
  loadPct: number,
  onBattery: boolean,
  maxAniso: number
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = onBattery ? '#7c2d12' : '#0c4a6e';
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = onBattery ? '#fb923c' : '#38bdf8';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 184);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 22px "IBM Plex Mono", monospace';
  ctx.fillText('APC Smart-UPS C 3000', 20, 38);

  ctx.fillStyle = onBattery ? '#fde047' : '#34d399';
  ctx.font = '900 22px "IBM Plex Mono", monospace';
  ctx.fillText(onBattery ? 'ON BATTERY' : 'ONLINE AC', 330, 38);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 54px "IBM Plex Mono", monospace';
  ctx.fillText(`${Math.round(voltageV)}V`, 24, 118);

  ctx.fillStyle = '#bae6fd';
  ctx.font = '800 24px "IBM Plex Mono", monospace';
  ctx.fillText(`BATT ${Math.round(batteryPct)}%`, 200, 96);
  ctx.fillText(`LOAD ${Math.round(loadPct)}%`, 200, 134);

  // Battery bar
  ctx.strokeStyle = '#e0f2fe';
  ctx.lineWidth = 3;
  ctx.strokeRect(365, 76, 120, 32);
  ctx.fillStyle = onBattery ? '#facc15' : '#22c55e';
  ctx.fillRect(370, 81, Math.max(8, Math.round((batteryPct / 100) * 110)), 22);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 16px "IBM Plex Mono", monospace';
  ctx.fillText('OUT: 8x IEC C13 · 1x IEC C19 · 50Hz', 22, 170);

  return finalizeTex(c, maxAniso);
}

function createKvmScreenTex(
  target: KvmTargetId,
  alertActive: boolean,
  maxAniso: number
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 640;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, 640);
  bg.addColorStop(0, '#050b16');
  bg.addColorStop(1, '#0b1526');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 640);

  ctx.strokeStyle = alertActive ? '#ef4444' : '#1e293b';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 1018, 634);

  // Top KVM OSD Header Bar
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(6, 6, 1012, 58);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 18px "IBM Plex Mono", monospace';
  ctx.fillText('KVM-08P 18.5" FHD OSD', 22, 40);

  const tabs: Array<{ id: KvmTargetId; label: string; x: number; w: number }> = [
    { id: 'r360', label: 'CH01: DELL R360', x: 290, w: 226 },
    { id: 'ccr2004', label: 'CH02: CCR2004', x: 528, w: 226 },
    { id: 'crs326', label: 'CH03: CRS326', x: 766, w: 226 },
  ];
  tabs.forEach((t) => {
    const active = t.id === target;
    ctx.fillStyle = active ? (alertActive ? '#991b1b' : '#0284c7') : '#1e293b';
    ctx.fillRect(t.x, 14, t.w, 38);
    ctx.strokeStyle = active ? '#7dd3fc' : '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(t.x, 14, t.w, 38);
    ctx.fillStyle = active ? '#ffffff' : '#94a3b8';
    ctx.font = '800 14px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t.label, t.x + t.w / 2, 38);
  });
  ctx.textAlign = 'left';

  if (target === 'r360') {
    ctx.fillStyle = '#071a30';
    ctx.fillRect(20, 80, 984, 68);
    ctx.strokeStyle = '#0284c7';
    ctx.strokeRect(20, 80, 984, 68);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('DELL PowerEdge R360 · iDRAC9 16G Virtual Console', 36, 110);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 14px "IBM Plex Mono", monospace';
    ctx.fillText('Host: srv-elban-r360.upg.local (10.20.10.2) · Intel Xeon 6 6315P · 32GB DDR5', 36, 134);

    const cards = [
      { t: 'CPU 1', v: 'Intel Xeon 6 6315P', s: '2.8GHz · 4C/4T · 55W TDP', c: '#38bdf8' },
      { t: 'MEMORY', v: '32 GB DDR5-5600 ECC', s: '0 ECC Errors · Used 11.4 GB', c: '#34d399' },
      { t: 'STORAGE RAID-1', v: 'PERC H755 · 2x 2TB SATA', s: 'VD0 OPTIMAL · Bay 0 & 1 Online', c: '#fbbf24' },
      { t: 'NETWORK & PSU', v: 'Broadcom 5720 Dual 1GbE', s: alertActive ? 'ALERT: Uplink / Power Warning' : 'Gb1/Gb2 UP · 600W PSU OK', c: alertActive ? '#f87171' : '#a78bfa' },
    ];
    cards.forEach((k, idx) => {
      const cx = 20 + (idx % 2) * 498;
      const cy = 166 + Math.floor(idx / 2) * 116;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx, cy, 486, 102);
      ctx.fillStyle = k.c;
      ctx.fillRect(cx, cy, 6, 102);
      ctx.font = '800 13px "IBM Plex Mono", monospace';
      ctx.fillText(k.t, cx + 18, cy + 26);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(k.v, cx + 18, cy + 56);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 14px "IBM Plex Mono", monospace';
      ctx.fillText(k.s, cx + 18, cy + 84);
    });

    ctx.fillStyle = '#020617';
    ctx.fillRect(20, 408, 984, 210);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(20, 408, 984, 210);
    const lines = [
      'Ubuntu 24.04.1 LTS srv-elban-r360 tty1 · Airport ElBan Telemetry Node',
      'root@srv-elban-r360:~# ip -br addr && megacli -LDInfo -Lall',
      'eno1 (Gb1 -> CCR2004 Port 15)    UP    10.20.10.2/24   VLAN10-ELBAN-CORE',
      'eno2 (Gb2 -> CCR2004 Port 16)    UP    10.20.20.2/24   VLAN20-CCTV-NVR',
      'idrac (iDRAC9 Dedicated)         UP    192.168.88.250/24 (IPMI / Redfish)',
      alertActive
        ? '[WARN] Upstream Gateway 10.20.10.1 alert detected! Inspect SFP+ / PDU feed.'
        : '[ OK ] RAID-1 Virtual Drive Optimal · APC Smart-UPS 3000VA Linked',
    ];
    ctx.font = '600 14px "IBM Plex Mono", monospace';
    lines.forEach((ln, idx) => {
      ctx.fillStyle = idx === 5 ? (alertActive ? '#f87171' : '#34d399') : '#cbd5e1';
      ctx.fillText(ln, 36, 442 + idx * 28);
    });
  } else if (target === 'ccr2004') {
    ctx.fillStyle = '#020617';
    ctx.fillRect(20, 84, 984, 534);
    ctx.strokeStyle = '#0284c7';
    ctx.strokeRect(20, 84, 984, 534);
    const lines = [
      'MikroTik RouterOS 7.16 (ARM64) — CCR2004-16G-2S+ (UPG-ELBAN-CORE-RTR)',
      '------------------------------------------------------------------------',
      '[admin@UPG-CCR2004] > /system resource print',
      '  uptime: 48d 14h 22m   cpu: AL32400 4-Core @ 1700MHz   ram: 4096 MiB',
      '  dual-psu: PSU1=OK (230V) · PSU2=OK (230V) · Fans: 3400 RPM',
      '',
      '[admin@UPG-CCR2004] > /interface ethernet monitor sfp-sfpplus1,sfp-sfpplus2',
      alertActive
        ? '  sfp-sfpplus1 (UPLINK -> CRS326):   STATUS=LINK-DOWN / HIGH-LOAD ALERT'
        : '  sfp-sfpplus1 (UPLINK -> CRS326):   STATUS=LINK-OK · 10Gbps-Full',
      '  sfp-sfpplus2 (FIBER -> TOC/FIDS):  STATUS=LINK-OK · 10Gbps-Full',
      '  ether15      (Dell R360 Gb1):      STATUS=LINK-OK · 1Gbps-Full',
      '  ether16      (Dell R360 Gb2):      STATUS=LINK-OK · 1Gbps-Full',
      '',
      '[admin@UPG-CCR2004] > /ip firewall filter print stats',
      '  0  chain=forward action=accept vlan=ELBAN-SCP/CCTV   packets=4,918,220',
      '  1  chain=input   action=drop   invalid-src           packets=12,041',
      '[admin@UPG-CCR2004] > _',
    ];
    ctx.font = '600 15px "IBM Plex Mono", monospace';
    lines.forEach((ln, idx) => {
      ctx.fillStyle =
        idx === 0
          ? '#38bdf8'
          : ln.includes('ALERT')
            ? '#f87171'
            : ln.includes('LINK-OK')
              ? '#34d399'
              : '#e2e8f0';
      ctx.fillText(ln, 38, 120 + idx * 30);
    });
  } else {
    ctx.fillStyle = '#020617';
    ctx.fillRect(20, 84, 984, 534);
    ctx.strokeStyle = '#ea580c';
    ctx.strokeRect(20, 84, 984, 534);
    const lines = [
      'MikroTik SwitchOS / RouterOS L5 — CRS326-24G-2S+RM (UPG-ACCESS-SW01)',
      '------------------------------------------------------------------------',
      'Chip: Marvell Prestera 98DX3236A1 · Cooling: Fanless Passive Heatsink',
      'Power: DC Jack 24V (Primary) + Ether1 Passive PoE-in (10-30V Redundant)',
      '',
      'PORT MATRIX (24x 1GbE RJ45 + 2x 10G SFP+):',
      '  ether1..ether8   : VLAN 10 (CCTV Fixed/Fisheye + NVR)       [UP 1Gbps]',
      '  ether9..ether16  : VLAN 20 (FIDS + BIDS + Master Clock)     [UP 1Gbps]',
      '  ether17..ether24 : VLAN 30 (Access Control + MCFA + PAS)    [UP 1Gbps]',
      alertActive
        ? '  sfp-sfpplus1     : TRUNK -> CCR2004                         [WARN / FAULT]'
        : '  sfp-sfpplus1     : TRUNK -> CCR2004                         [UP 10Gbps]',
      '  sfp-sfpplus2     : SPARE FIBER RING                         [UP 10Gbps]',
      '',
      'THERMAL & HEALTH TELEMETRY:',
      alertActive
        ? '  [ALERT] High temperature or uplink packet drop detected on CRS326!'
        : '  [ OK ] Non-blocking wire-speed switching active · 0% CRC Errors',
    ];
    ctx.font = '600 15px "IBM Plex Mono", monospace';
    lines.forEach((ln, idx) => {
      ctx.fillStyle =
        idx === 0
          ? '#fb923c'
          : ln.includes('WARN') || ln.includes('ALERT')
            ? '#f87171'
            : ln.includes('[UP') || ln.includes('[ OK ]')
              ? '#34d399'
              : '#e2e8f0';
      ctx.fillText(ln, 38, 120 + idx * 32);
    });
  }

  return finalizeTex(c, maxAniso);
}

// ==================== 42U NETWORK RACK 3D BUILDER ====================

export function create42UNetworkRack(
  maxAnisotropy: number,
  options?: { compactMode?: boolean }
): Built42UNetworkRack {
  const compact = Boolean(options?.compactMode);
  const rootGroup = new THREE.Group();
  const enclosureGroup = new THREE.Group();
  const cablesGroup = new THREE.Group();
  const raycastTargets: THREE.Object3D[] = [];
  const roofFanImpellers: THREE.Object3D[] = [];
  const unitHandles = new Map<RackUnitId, RackUnitMeshHandle>();
  const packetRunners: RackPacketRunner[] = [];
  const allStandardMaterials: THREE.MeshStandardMaterial[] = [];
  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];
  const disposableTexs: THREE.Texture[] = [];

  const regGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const regMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    if (m instanceof THREE.MeshStandardMaterial) {
      allStandardMaterials.push(m);
    }
    return m;
  };
  const regTex = (t: THREE.Texture): THREE.Texture => {
    disposableTexs.push(t);
    return t;
  };

  // Calibrated PBR Materials (matte dark charcoal cabinet, brushed aluminum, silver rails, copper busbar)
  const matCabinet = regMat(new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.48, metalness: 0.62 }));
  const matFrameDark = regMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.7 }));
  const matRailSilver = regMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.28, metalness: 0.84 }));
  const matChassisDark = regMat(new THREE.MeshStandardMaterial({ color: 0x182130, roughness: 0.4, metalness: 0.62 }));
  const matChassisWhite = regMat(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.34, metalness: 0.26 }));
  const matCopper = regMat(new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.88 }));
  const matGlass = regMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      roughness: 0.08,
      metalness: 0.12,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    })
  );
  const matMeshDoor = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.55,
      transparent: true,
      opacity: 0.72,
    })
  );

  // Dimensions (real 42U proportions: ~0.80m wide x 2.18m tall x 0.96m deep)
  const RACK_W = 0.82;
  const RACK_H = 2.16;
  const RACK_D = 0.92;
  const INNER_W = 0.68;

  // 1. Base Plinth + 4 Heavy-Duty Caster Wheels & Leveling Feet
  const basePlate = new THREE.Mesh(regGeo(new THREE.BoxGeometry(RACK_W, 0.06, RACK_D)), matCabinet);
  basePlate.position.y = 0.07;
  basePlate.castShadow = true;
  basePlate.receiveShadow = true;
  rootGroup.add(basePlate);

  const wheelGeo = regGeo(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12));
  wheelGeo.rotateZ(Math.PI / 2);
  [
    [-0.33, -0.36],
    [0.33, -0.36],
    [-0.33, 0.36],
    [0.33, 0.36],
  ].forEach(([wx, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, matFrameDark);
    wheel.position.set(wx, 0.035, wz);
    rootGroup.add(wheel);
  });

  // 2. 4 Structural Vertical Corner Posts + 4 Perforated 19" Mounting Rails (with U markings)
  const postGeo = regGeo(new THREE.BoxGeometry(0.055, RACK_H, 0.055));
  const railGeo = regGeo(new THREE.BoxGeometry(0.024, RACK_H - 0.08, 0.024));
  [
    [-RACK_W / 2 + 0.028, -RACK_D / 2 + 0.028],
    [RACK_W / 2 - 0.028, -RACK_D / 2 + 0.028],
    [-RACK_W / 2 + 0.028, RACK_D / 2 - 0.028],
    [RACK_W / 2 - 0.028, RACK_D / 2 - 0.028],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, matCabinet);
    post.position.set(px, 0.1 + RACK_H / 2, pz);
    post.castShadow = true;
    rootGroup.add(post);
  });

  [
    [-INNER_W / 2 - 0.012, 0.36],
    [INNER_W / 2 + 0.012, 0.36],
    [-INNER_W / 2 - 0.012, -0.36],
    [INNER_W / 2 + 0.012, -0.36],
  ].forEach(([rx, rz]) => {
    const rail = new THREE.Mesh(railGeo, matRailSilver);
    rail.position.set(rx, 0.1 + RACK_H / 2, rz);
    rootGroup.add(rail);
  });

  // Vertical Copper Grounding Busbar along rear-right post
  const groundBusbar = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.016, RACK_H - 0.24, 0.028)), matCopper);
  groundBusbar.position.set(RACK_W / 2 - 0.075, 0.1 + RACK_H / 2, -RACK_D / 2 + 0.075);
  rootGroup.add(groundBusbar);

  // 3. Top Roof Canopy + 4-Fan Active Exhaust Cooling Tray
  const roofDeck = new THREE.Mesh(regGeo(new THREE.BoxGeometry(RACK_W, 0.075, RACK_D)), matCabinet);
  roofDeck.position.y = 0.1 + RACK_H + 0.037;
  roofDeck.castShadow = true;
  rootGroup.add(roofDeck);

  // Blue accent top brand strip on front bezel
  const topAccent = new THREE.Mesh(
    regGeo(new THREE.BoxGeometry(RACK_W - 0.08, 0.016, 0.015)),
    regMat(new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.9 }))
  );
  topAccent.position.set(0, 0.1 + RACK_H + 0.04, RACK_D / 2 + 0.004);
  rootGroup.add(topAccent);

  const fanRingGeo = regGeo(new THREE.TorusGeometry(0.11, 0.012, 8, 20));
  fanRingGeo.rotateX(Math.PI / 2);
  const fanBladeGeo = regGeo(new THREE.BoxGeometry(0.18, 0.01, 0.035));
  [
    [-0.18, -0.18],
    [0.18, -0.18],
    [-0.18, 0.18],
    [0.18, 0.18],
  ].forEach(([fx, fz]) => {
    const ring = new THREE.Mesh(fanRingGeo, matFrameDark);
    ring.position.set(fx, 0.1 + RACK_H + 0.078, fz);
    rootGroup.add(ring);

    const impeller = new THREE.Group();
    impeller.position.set(fx, 0.1 + RACK_H + 0.078, fz);
    const b1 = new THREE.Mesh(fanBladeGeo, matRailSilver);
    const b2 = new THREE.Mesh(fanBladeGeo, matRailSilver);
    b2.rotation.y = Math.PI / 2;
    const hub = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12)), matFrameDark);
    impeller.add(b1, b2, hub);
    rootGroup.add(impeller);
    roofFanImpellers.push(impeller);
  });

  // 4. Enclosure Doors & Detachable Side Panels
  // Front Swinging Tempered-Glass Door (hinged on left edge)
  const frontDoorPivot = new THREE.Group();
  frontDoorPivot.position.set(-RACK_W / 2 + 0.015, 0.1 + RACK_H / 2, RACK_D / 2 + 0.015);
  const fFrameTop = new THREE.Mesh(regGeo(new THREE.BoxGeometry(RACK_W, 0.055, 0.028)), matCabinet);
  fFrameTop.position.set(RACK_W / 2 - 0.015, RACK_H / 2 - 0.028, 0);
  const fFrameBot = fFrameTop.clone();
  fFrameBot.position.y = -RACK_H / 2 + 0.028;
  const fFrameL = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.055, RACK_H, 0.028)), matCabinet);
  fFrameL.position.set(0.012, 0, 0);
  const fFrameR = fFrameL.clone();
  fFrameR.position.set(RACK_W - 0.042, 0, 0);
  const fGlass = new THREE.Mesh(regGeo(new THREE.PlaneGeometry(RACK_W - 0.11, RACK_H - 0.11)), matGlass);
  fGlass.position.set(RACK_W / 2 - 0.015, 0, 0.002);
  const fHandle = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.026, 0.18, 0.034)), matRailSilver);
  fHandle.position.set(RACK_W - 0.046, 0, 0.022);
  frontDoorPivot.add(fFrameTop, fFrameBot, fFrameL, fFrameR, fGlass, fHandle);
  enclosureGroup.add(frontDoorPivot);

  // Split Dual Rear Perforated Doors
  const rearLeftDoorPivot = new THREE.Group();
  rearLeftDoorPivot.position.set(-RACK_W / 2 + 0.015, 0.1 + RACK_H / 2, -RACK_D / 2 - 0.015);
  const rDoorL = new THREE.Mesh(regGeo(new THREE.BoxGeometry(RACK_W / 2 - 0.02, RACK_H - 0.04, 0.022)), matMeshDoor);
  rDoorL.position.set(RACK_W / 4 - 0.01, 0, 0);
  rearLeftDoorPivot.add(rDoorL);
  enclosureGroup.add(rearLeftDoorPivot);

  const rearRightDoorPivot = new THREE.Group();
  rearRightDoorPivot.position.set(RACK_W / 2 - 0.015, 0.1 + RACK_H / 2, -RACK_D / 2 - 0.015);
  const rDoorR = new THREE.Mesh(regGeo(new THREE.BoxGeometry(RACK_W / 2 - 0.02, RACK_H - 0.04, 0.022)), matMeshDoor);
  rDoorR.position.set(-(RACK_W / 4 - 0.01), 0, 0);
  rearRightDoorPivot.add(rDoorR);
  enclosureGroup.add(rearRightDoorPivot);

  // Left & Right Detachable Steel Side Panels
  const leftSidePanel = new THREE.Group();
  const sideGeo = regGeo(new THREE.BoxGeometry(0.02, RACK_H - 0.08, RACK_D - 0.08));
  const lPanelMesh = new THREE.Mesh(sideGeo, matFrameDark);
  lPanelMesh.position.set(-RACK_W / 2 - 0.005, 0.1 + RACK_H / 2, 0);
  leftSidePanel.add(lPanelMesh);
  enclosureGroup.add(leftSidePanel);

  const rightSidePanel = new THREE.Group();
  const rPanelMesh = new THREE.Mesh(sideGeo, matFrameDark);
  rPanelMesh.position.set(RACK_W / 2 + 0.005, 0.1 + RACK_H / 2, 0);
  rightSidePanel.add(rPanelMesh);
  enclosureGroup.add(rightSidePanel);

  rootGroup.add(enclosureGroup);

  // Helper to register each of the 9 interactive rack units
  const createUnitSlot = (
    unitId: RackUnitId,
    yPos: number,
    height: number,
    depth: number,
    explodeZ: number,
    accentHex: string
  ) => {
    const group = new THREE.Group();
    const baseZ = 0.36 - depth / 2;
    group.position.set(0, yPos, baseZ);

    const statusLedMat = regMat(
      new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x22c55e,
        emissiveIntensity: 1.4,
        roughness: 0.2,
      })
    );
    const led = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.016, 0.016, 0.016)), statusLedMat);
    led.position.set(-INNER_W / 2 + 0.024, height * 0.26, depth / 2 + 0.012);
    group.add(led);

    // Subtle selection highlight outline ring
    const highlightMat = regMat(
      new THREE.MeshBasicMaterial({
        color: accentHex,
        transparent: true,
        opacity: 0.0,
        wireframe: true,
      })
    );
    const highlightMesh = new THREE.Mesh(
      regGeo(new THREE.BoxGeometry(INNER_W + 0.032, height + 0.024, depth + 0.032)),
      highlightMat
    );
    group.add(highlightMesh);

    const handle: RackUnitMeshHandle = {
      unitId,
      group,
      baseZ,
      baseY: yPos,
      explodeZ,
      statusLedMat,
      highlightMesh,
    };
    unitHandles.set(unitId, handle);
    rootGroup.add(group);
    return { group, depth };
  };

  // ==================== BUILD ALL 9 AUTHENTIC 42U UNITS ====================

  // UNIT 1 (40U): 24-Port Cat6A Shielded Patch Panel
  {
    const { group, depth } = createUnitSlot('unit_01', 2.02, 0.09, 0.22, 0.56, '#0284c7');
    const tex = regTex(createPatchPanelTex(maxAnisotropy));
    const faceMat = regMat(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0.35 }));
    const body = new THREE.Mesh(regGeo(new THREE.BoxGeometry(INNER_W, 0.088, depth)), [
      matChassisDark,
      matChassisDark,
      matChassisDark,
      matChassisDark,
      faceMat,
      matChassisDark,
    ]);
    body.castShadow = true;
    group.add(body);
  }

  // UNIT 2 (36U–37U): Upper 1U Horizontal Cable Management Duct
  {
    const { group, depth } = createUnitSlot('unit_02', 1.84, 0.09, 0.16, 0.42, '#7c3aed');
    const bar = new THREE.Mesh(regGeo(new THREE.BoxGeometry(INNER_W, 0.082, depth)), matChassisDark);
    group.add(bar);
    // 10 comb-dressed cable duct fingers
    const fingerGeo = regGeo(new THREE.BoxGeometry(0.014, 0.068, 0.055));
    for (let i = 0; i < 10; i++) {
      const f = new THREE.Mesh(fingerGeo, matFrameDark);
      f.position.set(-0.29 + i * 0.064, 0, depth / 2 + 0.024);
      group.add(f);
    }
  }

  // UNIT 3 (32U–33U): MikroTik CRS326-24G-2S+RM Switch
  {
    const { group, depth } = createUnitSlot('unit_03', 1.66, 0.09, 0.36, 0.62, '#ea580c');
    const tex = regTex(createMikrotikSwitchTex(maxAnisotropy, 'crs326'));
    const faceMat = regMat(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, metalness: 0.25 }));
    const body = new THREE.Mesh(regGeo(new THREE.BoxGeometry(INNER_W, 0.088, depth)), [
      matChassisWhite,
      matChassisWhite,
      matChassisWhite,
      matChassisWhite,
      faceMat,
      matChassisDark,
    ]);
    body.castShadow = true;
    group.add(body);
  }

  // UNIT 4 (28U–29U): Lower 1U Horizontal Cable Management Duct
  {
    const { group, depth } = createUnitSlot('unit_04', 1.48, 0.09, 0.16, 0.42, '#9333ea');
    const bar = new THREE.Mesh(regGeo(new THREE.BoxGeometry(INNER_W, 0.082, depth)), matChassisDark);
    group.add(bar);
    const fingerGeo = regGeo(new THREE.BoxGeometry(0.014, 0.068, 0.055));
    for (let i = 0; i < 10; i++) {
      const f = new THREE.Mesh(fingerGeo, matFrameDark);
      f.position.set(-0.29 + i * 0.064, 0, depth / 2 + 0.024);
      group.add(f);
    }
  }

  // UNIT 5 (24U–25U): MikroTik Cloud Core Router CCR2004-16G-2S+
  {
    const { group, depth } = createUnitSlot('unit_05', 1.30, 0.095, 0.46, 0.68, '#0284c7');
    const tex = regTex(createMikrotikSwitchTex(maxAnisotropy, 'ccr2004'));
    const faceMat = regMat(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.28, metalness: 0.28 }));
    const body = new THREE.Mesh(regGeo(new THREE.BoxGeometry(INNER_W, 0.092, depth)), [
      matChassisWhite,
      matChassisWhite,
      matChassisWhite,
      matChassisWhite,
      faceMat,
      matChassisDark,
    ]);
    body.castShadow = true;
    group.add(body);
  }

  // UNIT 6 / unit_09 (15U–22U): 1U 18.5" Rackmount Clamshell LCD KVM Console
  let kvmDrawerGroup: THREE.Group;
  let kvmScreenPivot: THREE.Group;
  let currentKvmTex = createKvmScreenTex('r360', false, maxAnisotropy);
  const kvmScreenMat = regMat(
    new THREE.MeshStandardMaterial({
      map: currentKvmTex,
      emissiveMap: currentKvmTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.72,
      roughness: 0.22,
    })
  );
  {
    const { group, depth } = createUnitSlot('unit_09', 0.96, 0.095, 0.62, 0.48, '#10b981');
    const railShell = new THREE.Mesh(regGeo(new THREE.BoxGeometry(INNER_W, 0.088, depth)), matChassisDark);
    group.add(railShell);

    // Sliding keyboard & clamshell LCD tray
    kvmDrawerGroup = new THREE.Group();
    const trayDeck = new THREE.Mesh(regGeo(new THREE.BoxGeometry(INNER_W - 0.04, 0.028, 0.48)), matFrameDark);
    trayDeck.position.set(0, -0.022, 0.08);
    // Keyboard + Touchpad accent
    const kbPad = new THREE.Mesh(
      regGeo(new THREE.BoxGeometry(0.46, 0.01, 0.18)),
      regMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }))
    );
    kbPad.position.set(0, -0.005, 0.12);
    const touchPad = new THREE.Mesh(
      regGeo(new THREE.BoxGeometry(0.11, 0.01, 0.075)),
      regMat(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35 }))
    );
    touchPad.position.set(0, -0.005, 0.255);
    const pullHandle = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.18, 0.024, 0.028)), matRailSilver);
    pullHandle.position.set(0, -0.018, 0.335);
    kvmDrawerGroup.add(trayDeck, kbPad, touchPad, pullHandle);

    // 18.5" 16:9 Widescreen Hinged Clamshell LCD Monitor
    kvmScreenPivot = new THREE.Group();
    kvmScreenPivot.position.set(0, 0.005, -0.14);
    const lidBezel = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.56, 0.34, 0.022)), matChassisDark);
    lidBezel.position.set(0, 0.17, 0);
    const lcdFace = new THREE.Mesh(regGeo(new THREE.PlaneGeometry(0.51, 0.30)), kvmScreenMat);
    lcdFace.position.set(0, 0.17, 0.013);
    kvmScreenPivot.add(lidBezel, lcdFace);
    kvmScreenPivot.rotation.x = Math.PI / 2; // closed flat by default

    kvmDrawerGroup.add(kvmScreenPivot);
    group.add(kvmDrawerGroup);
  }

  // UNIT 7 / unit_08 (12U–13U): Dell PowerEdge R360 1U Rack Server
  {
    const { group, depth } = createUnitSlot('unit_08', 0.72, 0.105, 0.68, 0.74, '#0ea5e9');
    const frontTex = regTex(createDellR360FrontTex(maxAnisotropy));
    const rearTex = regTex(createDellR360RearTex(maxAnisotropy));
    const frontMat = regMat(new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.35, metalness: 0.4 }));
    const rearMat = regMat(new THREE.MeshStandardMaterial({ map: rearTex, roughness: 0.35, metalness: 0.5 }));
    const body = new THREE.Mesh(regGeo(new THREE.BoxGeometry(INNER_W, 0.1, depth)), [
      matRailSilver,
      matRailSilver,
      matRailSilver,
      matChassisDark,
      frontMat,
      rearMat,
    ]);
    body.castShadow = true;
    group.add(body);
  }

  // UNIT 8 / unit_06 (06U–07U): APC Smart-UPS C 3000VA 2U Rackmount LCD
  let currentUpsTex = createUpsLcdTex(231, 100, 32, false, maxAnisotropy);
  const upsLcdMat = regMat(
    new THREE.MeshStandardMaterial({
      map: currentUpsTex,
      emissiveMap: currentUpsTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.75,
      roughness: 0.25,
    })
  );
  {
    const { group, depth } = createUnitSlot('unit_06', 0.44, 0.19, 0.66, 0.52, '#d97706');
    const body = new THREE.Mesh(regGeo(new THREE.BoxGeometry(INNER_W, 0.185, depth)), matCabinet);
    body.castShadow = true;
    const frontBezel = new THREE.Mesh(regGeo(new THREE.BoxGeometry(INNER_W - 0.02, 0.165, 0.025)), matFrameDark);
    frontBezel.position.set(0, 0, depth / 2 + 0.01);
    const lcdPanel = new THREE.Mesh(regGeo(new THREE.PlaneGeometry(0.24, 0.095)), upsLcdMat);
    lcdPanel.position.set(0.08, 0, depth / 2 + 0.025);
    // Ventilated louver bars on left half of APC bezel
    for (let v = 0; v < 5; v++) {
      const slat = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.26, 0.012, 0.01)), matCabinet);
      slat.position.set(-0.17, 0.056 - v * 0.028, depth / 2 + 0.023);
      group.add(slat);
    }
    group.add(body, frontBezel, lcdPanel);
  }

  // UNIT 9 / unit_07 (02U): 1U 19" 6-Way Schuko Rackmount PDU
  const pduSwitchMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.25,
      roughness: 0.2,
    })
  );
  let pduSwitchMesh: THREE.Mesh;
  {
    const { group, depth } = createUnitSlot('unit_07', 0.22, 0.09, 0.18, 0.38, '#9333ea');
    const bar = new THREE.Mesh(regGeo(new THREE.BoxGeometry(INNER_W, 0.086, depth)), matCabinet);
    bar.castShadow = true;
    group.add(bar);

    // Illuminated Red I/O Rocker Switch on left side
    const switchBezel = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.075, 0.056, 0.018)), matFrameDark);
    switchBezel.position.set(-0.24, 0, depth / 2 + 0.008);
    pduSwitchMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.055, 0.036, 0.024)), pduSwitchMat);
    pduSwitchMesh.position.set(-0.24, 0, depth / 2 + 0.014);
    pduSwitchMesh.rotation.y = 0.22;
    group.add(switchBezel, pduSwitchMesh);

    // 6x Diagonal 45° Schuko CEE 7/3 Sockets
    const sockGeo = regGeo(new THREE.CylinderGeometry(0.028, 0.028, 0.016, 16));
    sockGeo.rotateX(Math.PI / 2);
    for (let s = 0; s < 6; s++) {
      const sock = new THREE.Mesh(sockGeo, matFrameDark);
      sock.position.set(-0.11 + s * 0.078, 0, depth / 2 + 0.008);
      const hole = new THREE.Mesh(
        regGeo(new THREE.CylinderGeometry(0.021, 0.021, 0.018, 14)).rotateX(Math.PI / 2),
        matCabinet
      );
      hole.position.copy(sock.position);
      hole.position.z += 0.002;
      group.add(sock, hole);
    }
  }

  // ==================== STRUCTURED PATCH CORDS & REAR POWER CABLES ====================
  const matCableBlue = regMat(new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.45 }));
  const matCableGreen = regMat(new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.45 }));
  const matCableGrey = regMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.45 }));
  const uplinkCableMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xf97316,
      emissiveIntensity: 0.35,
      roughness: 0.35,
    })
  );
  const matPowerBlack = regMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.65 }));

  const addCable = (
    points: THREE.Vector3[],
    mat: THREE.Material,
    radius: number,
    withPacket = false,
    isUplink = false
  ) => {
    const curve = new THREE.CatmullRomCurve3(points);
    const tube = new THREE.Mesh(regGeo(new THREE.TubeGeometry(curve, compact ? 16 : 32, radius, 6, false)), mat);
    cablesGroup.add(tube);

    if (withPacket && !compact) {
      const pktMat = regMat(
        new THREE.MeshBasicMaterial({ color: isUplink ? 0xfef08a : 0x7dd3fc })
      );
      const pkt = new THREE.Mesh(regGeo(new THREE.SphereGeometry(0.011, 8, 8)), pktMat);
      cablesGroup.add(pkt);
      packetRunners.push({
        mesh: pkt,
        curve,
        offset: packetRunners.length * 0.17,
        speed: isUplink ? 0.55 : 0.38,
        isUplink,
      });
    }
  };

  // Front Structured Cat6A Patch Cords: Patch Panel (2.02) -> Duct (1.84) -> CRS326 Switch (1.66)
  const frontCablesCount = compact ? 6 : 10;
  for (let i = 0; i < frontCablesCount; i++) {
    const x0 = -0.26 + (i / (frontCablesCount - 1)) * 0.52;
    const isUplink = i === frontCablesCount - 1;
    const mat = isUplink ? uplinkCableMat : i % 3 === 0 ? matCableGreen : i % 3 === 1 ? matCableBlue : matCableGrey;
    const zMid = 0.42 + (i % 2) * 0.014;
    addCable(
      [
        new THREE.Vector3(x0, 2.01, 0.365),
        new THREE.Vector3(x0, 1.98, 0.43),
        new THREE.Vector3(x0 * 0.92, 1.84, zMid),
        new THREE.Vector3(x0, 1.71, 0.43),
        new THREE.Vector3(x0, 1.66, 0.365),
      ],
      mat,
      0.0065,
      i % 2 === 0 || isUplink,
      isUplink
    );
  }

  // Trunk Patch Cords: CRS326 Switch (1.66) -> Lower Duct (1.48) -> CCR2004 Router (1.30)
  for (let i = 0; i < (compact ? 4 : 6); i++) {
    const x0 = -0.22 + (i / ((compact ? 4 : 6) - 1)) * 0.44;
    const isUplink = i >= (compact ? 3 : 4);
    const mat = isUplink ? uplinkCableMat : i % 2 === 0 ? matCableBlue : matCableGreen;
    addCable(
      [
        new THREE.Vector3(x0, 1.65, 0.365),
        new THREE.Vector3(x0, 1.61, 0.425),
        new THREE.Vector3(x0 * 0.9, 1.48, 0.42),
        new THREE.Vector3(x0, 1.35, 0.425),
        new THREE.Vector3(x0, 1.30, 0.365),
      ],
      mat,
      0.007,
      true,
      isUplink
    );
  }

  // Rear IEC Power Distribution Harness (UPS -> Dell R360 / CCR2004 / CRS326 / PDU)
  if (!compact) {
    [
      [0.44, 0.72, -0.26],
      [0.44, 1.30, -0.31],
      [0.44, 1.66, -0.22],
      [0.22, 0.44, -0.28],
    ].forEach(([yA, yB, xSide]) => {
      addCable(
        [
          new THREE.Vector3(xSide, yA, -0.31),
          new THREE.Vector3(xSide - 0.07, (yA + yB) / 2, -0.39),
          new THREE.Vector3(xSide, yB, -0.31),
        ],
        matPowerBlack,
        0.0085,
        false,
        false
      );
    });
  }

  rootGroup.add(cablesGroup);

  // Tag all meshes inside each unit group for click/hover raycasting
  unitHandles.forEach((handle, unitId) => {
    handle.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj !== handle.highlightMesh) {
        obj.userData.rackUnitId = unitId;
        raycastTargets.push(obj);
      }
    });
  });

  // Dynamic updaters
  let lastUpsKey = '';
  const updateUpsLcd = (voltageV: number, batteryPct: number, loadPct: number, onBattery: boolean) => {
    const key = `${Math.round(voltageV)}-${Math.round(batteryPct)}-${Math.round(loadPct)}-${onBattery}`;
    if (key === lastUpsKey) return;
    lastUpsKey = key;
    const nextTex = createUpsLcdTex(voltageV, batteryPct, loadPct, onBattery, maxAnisotropy);
    upsLcdMat.map = nextTex;
    upsLcdMat.emissiveMap = nextTex;
    upsLcdMat.needsUpdate = true;
    currentUpsTex.dispose();
    currentUpsTex = nextTex;
  };

  let lastKvmKey = '';
  const updateKvmScreen = (target: KvmTargetId, alertActive: boolean) => {
    const key = `${target}-${alertActive}`;
    if (key === lastKvmKey) return;
    lastKvmKey = key;
    const nextTex = createKvmScreenTex(target, alertActive, maxAnisotropy);
    kvmScreenMat.map = nextTex;
    kvmScreenMat.emissiveMap = nextTex;
    kvmScreenMat.needsUpdate = true;
    currentKvmTex.dispose();
    currentKvmTex = nextTex;
  };

  const updateKvmPose = (openFactor: number) => {
    const t = THREE.MathUtils.clamp(openFactor, 0, 1);
    // Slide keyboard drawer forward along +Z and tilt 18.5" clamshell monitor upright (-0.12 rad)
    kvmDrawerGroup.position.z = THREE.MathUtils.lerp(0, 0.42, t);
    kvmScreenPivot.rotation.x = THREE.MathUtils.lerp(Math.PI / 2, -0.1, t);
  };

  const updateVisualMode = (mode: 'solid' | 'xray' | 'wireframe') => {
    allStandardMaterials.forEach((m) => {
      if (m === matGlass) return;
      if (mode === 'solid') {
        m.wireframe = false;
        m.transparent = m === matMeshDoor;
        m.opacity = m === matMeshDoor ? 0.72 : 1;
      } else if (mode === 'xray') {
        m.wireframe = false;
        m.transparent = true;
        m.opacity = 0.28;
      } else {
        m.wireframe = true;
        m.transparent = false;
        m.opacity = 1;
      }
      m.needsUpdate = true;
    });
  };

  const updateAssembly = (progress: number) => {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    const totalUnits = RACK_UNIT_ORDER.length;
    RACK_UNIT_ORDER.forEach((id, idx) => {
      const h = unitHandles.get(id);
      if (!h) return;
      // Units slide in bottom-to-top between progress 0.05..0.82
      const revIdx = totalUnits - 1 - idx;
      const start = 0.05 + (revIdx / totalUnits) * 0.68;
      const local = THREE.MathUtils.clamp((p - start) / 0.14, 0, 1);
      const eased = 1 - Math.pow(1 - local, 3);
      h.group.visible = local > 0.01;
      h.group.position.y = h.baseY;
      h.group.userData.assemblyZOffset = (1 - eased) * 0.95;
    });
    cablesGroup.visible = p >= 0.84;
  };

  // Initial pose
  updateKvmPose(0);
  updateAssembly(1);

  return {
    rootGroup,
    enclosureGroup,
    frontDoorPivot,
    rearLeftDoorPivot,
    rearRightDoorPivot,
    leftSidePanel,
    rightSidePanel,
    roofFanImpellers,
    cablesGroup,
    unitHandles,
    raycastTargets,
    packetRunners,
    uplinkCableMat,
    pduSwitchMesh,
    pduSwitchMat,
    allStandardMaterials,
    updateUpsLcd,
    updateKvmScreen,
    updateKvmPose,
    updateVisualMode,
    updateAssembly,
    dispose: () => {
      currentUpsTex.dispose();
      currentKvmTex.dispose();
      disposableTexs.forEach((t) => t.dispose());
      disposableGeos.forEach((g) => g.dispose());
      disposableMats.forEach((m) => m.dispose());
    },
  };
}

export function applyRackRuntimeVisuals(
  rack: Built42UNetworkRack,
  params: RackSimulationParams,
  faults: RackFaultState,
  selectedUnitId: RackUnitId | null,
  hoveredUnitId: RackUnitId | null,
  delta: number,
  elapsed: number,
  kvmOpenCurrentRef: { value: number }
): void {
  const lambda = 7.5;

  // Enclosure & Doors smooth kinematics
  rack.enclosureGroup.visible = params.showEnclosure;
  const targetFrontAngle = params.frontDoorOpen ? -Math.PI * 0.68 : 0;
  rack.frontDoorPivot.rotation.y = THREE.MathUtils.damp(
    rack.frontDoorPivot.rotation.y,
    targetFrontAngle,
    lambda,
    delta
  );

  const targetRearL = params.rearDoorOpen ? Math.PI * 0.62 : 0;
  const targetRearR = params.rearDoorOpen ? -Math.PI * 0.62 : 0;
  rack.rearLeftDoorPivot.rotation.y = THREE.MathUtils.damp(
    rack.rearLeftDoorPivot.rotation.y,
    targetRearL,
    lambda,
    delta
  );
  rack.rearRightDoorPivot.rotation.y = THREE.MathUtils.damp(
    rack.rearRightDoorPivot.rotation.y,
    targetRearR,
    lambda,
    delta
  );

  const sideOffset = params.sidePanelsDetached ? 0.52 : 0;
  rack.leftSidePanel.position.x = THREE.MathUtils.damp(rack.leftSidePanel.position.x, -sideOffset, lambda, delta);
  rack.rightSidePanel.position.x = THREE.MathUtils.damp(rack.rightSidePanel.position.x, sideOffset, lambda, delta);

  // KVM Clamshell Drawer smooth slide & screen lift
  const targetKvm = params.kvmConsoleOpen && params.frontDoorOpen ? 1 : 0;
  kvmOpenCurrentRef.value = THREE.MathUtils.damp(kvmOpenCurrentRef.value, targetKvm, lambda, delta);
  rack.updateKvmPose(kvmOpenCurrentRef.value);

  // Per-unit exploded view + assembly offset + LED / selection highlight
  rack.unitHandles.forEach((h, unitId) => {
    const assemblyOffset = (h.group.userData.assemblyZOffset as number) || 0;
    const targetZ = h.baseZ + params.explodedFactor * h.explodeZ + assemblyOffset;
    h.group.position.z = THREE.MathUtils.damp(h.group.position.z, targetZ, lambda, delta);

    const isSelected = unitId === selectedUnitId;
    const isHovered = unitId === hoveredUnitId;
    const hlMat = h.highlightMesh.material as THREE.MeshBasicMaterial;
    hlMat.opacity = isSelected ? 0.65 : isHovered ? 0.35 : 0;

    // LED status tinting based on faults
    let ledHex = 0x22c55e;
    if (
      (unitId === 'unit_07' && faults.pduBreakerTrip) ||
      (unitId === 'unit_03' && faults.switchFanFailure) ||
      (unitId === 'unit_05' && faults.firewallTrafficSurge)
    ) {
      ledHex = 0xef4444;
    } else if (
      (unitId === 'unit_06' && (faults.pduBreakerTrip || faults.upsGridLoss)) ||
      ((unitId === 'unit_01' || unitId === 'unit_03' || unitId === 'unit_05' || unitId === 'unit_08') &&
        faults.uplinkPortDown)
    ) {
      ledHex = 0xf59e0b;
    }
    h.statusLedMat.color.setHex(ledHex);
    h.statusLedMat.emissive.setHex(ledHex);
    h.statusLedMat.emissiveIntensity =
      ledHex === 0xef4444 ? 1.1 + Math.sin(elapsed * 9) * 0.7 : 1.35;
  });

  // Cables visibility & uplink alert glow
  rack.cablesGroup.visible = params.showCables && params.assemblyProgress >= 0.84;
  if (faults.uplinkPortDown) {
    rack.uplinkCableMat.color.setHex(0xef4444);
    rack.uplinkCableMat.emissive.setHex(0xef4444);
    rack.uplinkCableMat.emissiveIntensity = 0.85 + Math.sin(elapsed * 8) * 0.35;
  } else {
    rack.uplinkCableMat.color.setHex(0xf97316);
    rack.uplinkCableMat.emissive.setHex(0xf97316);
    rack.uplinkCableMat.emissiveIntensity = 0.35;
  }

  // PDU Red Rocker Switch physical toggle
  const targetSwitchRot = faults.pduBreakerTrip ? -0.24 : 0.24;
  rack.pduSwitchMesh.rotation.y = THREE.MathUtils.damp(
    rack.pduSwitchMesh.rotation.y,
    targetSwitchRot,
    12,
    delta
  );
  rack.pduSwitchMat.emissiveIntensity = faults.pduBreakerTrip ? 0.08 : 1.35;

  // Spinning 4-Fan Roof Exhaust Impellers
  const fanSpeed = faults.switchFanFailure ? 2.4 : 7.5 + (params.trafficLoadPercent / 100) * 6;
  rack.roofFanImpellers.forEach((imp) => {
    imp.rotation.y += delta * fanSpeed;
  });

  // Animated 3D Data Packet Pulses along Patch Cords
  const speedScale = (0.35 + (params.trafficLoadPercent / 100) * 1.45) * params.packetSpeedMultiplier;
  rack.packetRunners.forEach((p) => {
    if (p.isUplink && faults.uplinkPortDown) {
      p.mesh.visible = false;
      return;
    }
    p.mesh.visible = rack.cablesGroup.visible && params.trafficLoadPercent > 0;
    const t = (elapsed * p.speed * speedScale + p.offset) % 1;
    p.curve.getPointAt(t, p.mesh.position);
  });
}

import * as THREE from 'three';

function finalizeTexture(canvas: HTMLCanvasElement, maxAnisotropy: number, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createTerrazzoFloorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Grout base color (nat keramik abu-abu lembut)
  ctx.fillStyle = '#b4bfcc';
  ctx.fillRect(0, 0, 512, 512);

  const tileSize = 256;
  const grout = 3; // crisp recessed ceramic grout seam

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const isWhite = (row + col) % 2 === 0;
      const x = col * tileSize + grout;
      const y = row * tileSize + grout;
      const w = tileSize - grout * 2;
      const h = tileSize - grout * 2;

      // Subtle diagonal porcelain ceramic glaze gradient
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      if (isWhite) {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.55, '#f8fafc');
        grad.addColorStop(1, '#f1f5f9');
      } else {
        grad.addColorStop(0, '#dfe5ec');
        grad.addColorStop(0.55, '#d4dce5');
        grad.addColorStop(1, '#cbd4df');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);

      // Delicate porcelain micro-veining / sheen texture inside each tile
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.strokeStyle = isWhite ? 'rgba(203, 213, 225, 0.22)' : 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1.5;
      for (let v = 0; v < 3; v++) {
        ctx.beginPath();
        const startY = y + 40 + v * 72 + (row * 19 + col * 13);
        ctx.moveTo(x - 10, startY);
        ctx.bezierCurveTo(
          x + w * 0.35,
          startY - 18 + v * 8,
          x + w * 0.65,
          startY + 22 - v * 6,
          x + w + 10,
          startY - 10
        );
        ctx.stroke();
      }
      ctx.restore();

      // Subtle glazed edge bevel highlight (top & left edge) + soft shadow (bottom & right edge)
      ctx.strokeStyle = isWhite ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.48)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 1, y + h - 1);
      ctx.lineTo(x + 1, y + 1);
      ctx.lineTo(x + w - 1, y + 1);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
      ctx.beginPath();
      ctx.moveTo(x + w - 1, y + 1);
      ctx.lineTo(x + w - 1, y + h - 1);
      ctx.lineTo(x + 1, y + h - 1);
      ctx.stroke();
    }
  }

  // 38x32 repeats over 46m x 38m floor => crisp ~60cm x 60cm square ceramic checkerboard tiles
  return finalizeTexture(canvas, maxAnisotropy, 38, 32);
}

export function createApronAsphaltTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 900; i++) {
    const px = Math.abs((Math.sin(i * 31.7) * 9871.3) % 1) * 512;
    const py = Math.abs((Math.sin(i * 91.3) * 4321.7) % 1) * 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(30,41,59,0.28)' : 'rgba(148,163,184,0.16)';
    ctx.fillRect(px, py, 3, 3);
  }

  // Taxiway lead-in yellow stripe
  ctx.fillStyle = '#eab308';
  ctx.fillRect(244, 0, 24, 512);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(240, 0, 4, 512);
  ctx.fillRect(268, 0, 4, 512);

  return finalizeTexture(canvas, maxAnisotropy, 8, 4);
}

export function createVideotronTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 1024, 512);
  grad.addColorStop(0, '#091526');
  grad.addColorStop(1, '#122644');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle architectural header strip
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 1024, 12);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 44px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('WALK-IN ELBAN · AIRPORT TECH LAB', 48, 86);

  ctx.fillStyle = '#93c5fd';
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('6 SISTEM UTAMA ELEKTRONIKA BANDARA & 9 ZONA OPERASIONAL', 48, 126);

  const items = [
    { code: 'ELB-01', title: 'X-RAY INSPECTION', zone: 'Security Checkpoint (SCP)', color: '#38bdf8' },
    { code: 'ELB-02', title: 'WTMD & HHMD', zone: 'Security Checkpoint (SCP)', color: '#fbbf24' },
    { code: 'ELB-03', title: 'CCTV & PIDS RADAR', zone: 'Perimeter & Server Room', color: '#2dd4bf' },
    { code: 'ELB-04', title: 'ACCESS & MCFA FIRE', zone: 'Restricted Area & Server', color: '#f87171' },
    { code: 'ELB-05', title: 'FIDS · BIDS · PAS/AAS', zone: 'Concourse & Baggage Claim', color: '#818cf8' },
    { code: 'ELB-06', title: 'RADIO · IGCS · PABX', zone: 'Comms Post & Crash Car', color: '#34d399' },
  ];

  items.forEach((it, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = 48 + col * 316;
    const y = 166 + row * 150;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(x, y, 296, 126);
    ctx.fillStyle = it.color;
    ctx.fillRect(x, y, 296, 5);

    ctx.fillStyle = it.color;
    ctx.font = '600 18px "IBM Plex Mono", monospace';
    ctx.fillText(it.code, x + 18, y + 36);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(it.title, x + 18, y + 72);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(it.zone, x + 18, y + 104);
  });

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createFidsCanvasTexture(maxAnisotropy: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const tex = finalizeTexture(canvas, maxAnisotropy);

  const flights = [
    { time: '10:15', flight: 'GA 402', dest: 'DENPASAR (DPS)', gate: 'A04', status: 'BOARDING', color: '#4ade80' },
    { time: '10:30', flight: 'ID 6512', dest: 'SURABAYA (SUB)', gate: 'A07', status: 'FINAL CALL', color: '#fbbf24' },
    { time: '10:50', flight: 'SQ 957', dest: 'SINGAPORE (SIN)', gate: 'B02', status: 'ON TIME', color: '#38bdf8' },
    { time: '11:15', flight: 'QG 714', dest: 'MAKASSAR (UPG)', gate: 'A09', status: 'CHECK-IN', color: '#e2e8f0' },
    { time: '11:40', flight: 'GA 866', dest: 'TOKYO (HND)', gate: 'B05', status: 'ON TIME', color: '#38bdf8' },
    { time: '12:05', flight: 'JT 610', dest: 'MEDAN (KNO)', gate: 'A02', status: 'SCHEDULED', color: '#cbd5e1' },
  ];

  const redraw = (now: Date) => {
    ctx.fillStyle = '#071324';
    ctx.fillRect(0, 0, 1024, 512);

    ctx.fillStyle = '#0f294a';
    ctx.fillRect(0, 0, 1024, 76);

    ctx.fillStyle = '#facc15';
    ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('DEPARTURES · FIDS CONCOURSE', 32, 50);

    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 32px "IBM Plex Mono", monospace';
    ctx.fillText(`${hh}:${mm}:${ss} WIB`, 738, 50);

    // Column headers
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 18px "IBM Plex Mono", monospace';
    ctx.fillText('TIME', 32, 114);
    ctx.fillText('FLIGHT', 150, 114);
    ctx.fillText('DESTINATION', 310, 114);
    ctx.fillText('GATE', 660, 114);
    ctx.fillText('STATUS', 790, 114);

    flights.forEach((f, idx) => {
      const y = 136 + idx * 58;
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)';
      ctx.fillRect(20, y, 984, 48);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 24px "IBM Plex Mono", monospace';
      ctx.fillText(f.time, 32, y + 32);

      ctx.fillStyle = '#facc15';
      ctx.fillText(f.flight, 150, y + 32);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 23px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(f.dest, 310, y + 32);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 24px "IBM Plex Mono", monospace';
      ctx.fillText(f.gate, 660, y + 32);

      ctx.fillStyle = f.color;
      ctx.font = '700 21px "IBM Plex Mono", monospace';
      ctx.fillText(f.status, 790, y + 32);
    });

    tex.needsUpdate = true;
  };

  redraw(new Date());
  return { texture: tex, redraw };
}

export function createMasterClockTexture(maxAnisotropy: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  const tex = finalizeTexture(canvas, maxAnisotropy);

  const redraw = (now: Date) => {
    ctx.fillStyle = '#060c18';
    ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 184);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 18px "IBM Plex Mono", monospace';
    ctx.fillText('MASTER CLOCK UNIT · GPS / NTP SYNC', 28, 42);

    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    ctx.fillStyle = '#ef4444';
    ctx.font = '700 84px "IBM Plex Mono", monospace';
    ctx.fillText(`${hh}:${mm}:${ss}`, 44, 146);

    tex.needsUpdate = true;
  };

  redraw(new Date());
  return { texture: tex, redraw };
}

export function createBidsTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#091628';
  ctx.fillRect(0, 0, 768, 384);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 768, 72);

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('BAGGAGE CLAIM · BELT 03 (BIDS)', 28, 48);

  const rows = [
    ['GA 401', 'DENPASAR', 'DELIVERING'],
    ['SQ 956', 'SINGAPORE', 'FIRST BAG ON BELT'],
    ['ID 6511', 'SURABAYA', 'NEXT FLIGHT'],
  ];

  rows.forEach((r, idx) => {
    const y = 112 + idx * 80;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(24, y, 720, 64);
    ctx.fillStyle = '#facc15';
    ctx.font = '700 28px "IBM Plex Mono", monospace';
    ctx.fillText(r[0], 40, y + 42);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(r[1], 210, y + 42);
    ctx.fillStyle = idx === 0 ? '#4ade80' : '#38bdf8';
    ctx.font = '600 22px "IBM Plex Mono", monospace';
    ctx.fillText(r[2], 470, y + 42);
  });

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createXRayMonitorTexture(maxAnisotropy: number, viewLabel = 'VIEW 1 · VERTICAL'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 320);

  // Header bar
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 34);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '600 13px "IBM Plex Mono", monospace';
  ctx.fillText(`RAPISCAN 620DV · ${viewLabel} · 160 kV`, 14, 22);

  // Luggage silhouette
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.strokeRect(76, 66, 360, 206);

  // Organic (Orange)
  ctx.fillStyle = 'rgba(249, 115, 22, 0.74)';
  ctx.fillRect(98, 88, 128, 158);

  // Mixed (Green)
  ctx.fillStyle = 'rgba(34, 197, 94, 0.76)';
  ctx.fillRect(238, 94, 96, 102);

  // Inorganic Metal (Blue)
  ctx.fillStyle = 'rgba(29, 78, 216, 0.86)';
  ctx.fillRect(346, 104, 68, 136);
  ctx.fillRect(250, 210, 146, 36);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createRapiscanFrontBadgeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(0, 0, 512, 112);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 506, 106);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'italic 700 54px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Rapiscan 620DV', 34, 74);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createRapiscanSideLogoTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 144;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 384, 144);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 378, 138);

  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'italic 700 62px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Rapiscan', 46, 82);

  ctx.fillStyle = '#334155';
  ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Systems', 196, 118);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createXRayCautionTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 500, 148);

  // Warning triangle + trefoil radiation symbol on left
  ctx.beginPath();
  ctx.moveTo(78, 28);
  ctx.lineTo(132, 128);
  ctx.lineTo(24, 128);
  ctx.closePath();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 7;
  ctx.stroke();

  // Trefoil blades
  ctx.fillStyle = '#0f172a';
  const cx = 78;
  const cy = 94;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const start = -Math.PI / 2 + i * ((Math.PI * 2) / 3) - 0.35;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 24, start, start + 0.7);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('CAUTION X-RAY HAZARD', 152, 68);
  ctx.font = '600 18px "IBM Plex Mono", monospace';
  ctx.fillText('HIGH VOLTAGE 160 kV · DO NOT INSERT', 152, 104);
  ctx.fillText('HANDS INTO TUNNEL WHILE OPERATING', 152, 130);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createShroudPerforationTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3b4046';
  ctx.fillRect(0, 0, 512, 256);

  // Subtle metallic panel border
  ctx.strokeStyle = '#272b30';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 506, 250);

  // Square perforation ventilation grids matching Rapiscan side shrouds
  ctx.fillStyle = '#111827';
  const clusters = [36, 178, 320];
  for (const cx of clusters) {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 4; c++) {
        ctx.fillRect(cx + c * 22, 34 + r * 24, 13, 14);
      }
    }
  }

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createFanGrilleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#243242';
  ctx.fillRect(0, 0, 256, 256);

  // Circular fan cutout
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(128, 128, 92, 0, Math.PI * 2);
  ctx.fill();

  // Concentric wire grille rings
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;
  [24, 46, 68, 88].forEach((r) => {
    ctx.beginPath();
    ctx.arc(128, 128, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  // Cross bars
  ctx.beginPath();
  ctx.moveTo(36, 128);
  ctx.lineTo(220, 128);
  ctx.moveTo(128, 36);
  ctx.lineTo(128, 220);
  ctx.stroke();

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createCeiaWtmdControlTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  // Smooth silver-grey CEIA control faceplate
  ctx.fillStyle = '#c5c9cc';
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = '#8b929a';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 184);

  // Dark recessed faceplate panel
  ctx.fillStyle = '#3c424a';
  ctx.fillRect(18, 16, 476, 160);
  ctx.fillStyle = '#b9bfc4';
  ctx.fillRect(24, 22, 464, 148);

  // Left monochrome green-grey LCD window
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(36, 32, 226, 86);
  ctx.fillStyle = '#9aa88a';
  ctx.fillRect(42, 38, 214, 74);

  ctx.fillStyle = '#1f291c';
  ctx.font = '700 18px "IBM Plex Mono", monospace';
  ctx.fillText('CEIA HI-PE Plus', 52, 62);
  ctx.font = '600 14px "IBM Plex Mono", monospace';
  ctx.fillText('PROG: 04  SENS: 72', 52, 84);
  ctx.fillText('READY · 60 ZONES', 52, 102);

  // 4 oval function soft-keys beneath LCD
  ctx.fillStyle = '#475569';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.roundRect(42 + i * 54, 130, 42, 22, 10);
    ctx.fill();
  }

  // Center-right status LED bar
  const leds = ['#22c55e', '#22c55e', '#eab308', '#ef4444'];
  leds.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(294 + i * 24, 46, 5.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Circular 4-way navigation keypad
  ctx.fillStyle = '#4b5563';
  ctx.beginPath();
  ctx.arc(332, 114, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(332, 114, 17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#e5e7eb';
  ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('OK', 324, 118);

  // Far-right metallic key/lock switch
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.arc(438, 112, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9ca3af';
  ctx.beginPath();
  ctx.arc(438, 112, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.fillRect(435, 100, 6, 24);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createCeiaLogoTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c5c9cc';
  ctx.fillRect(0, 0, 256, 128);

  // Circular CEIA sunburst mark
  const cx = 54;
  const cy = 64;
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8);
    ctx.lineTo(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24);
    ctx.stroke();
  }
  ctx.fillStyle = '#1e3a5f';
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();

  // Geometric lowercase ceia wordmark
  ctx.fillStyle = '#1e3a5f';
  ctx.font = '700 54px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ceia', 96, 82);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createCeiaSpecStickerTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 124);

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ceia  CE', 16, 30);
  ctx.font = '500 13px "IBM Plex Mono", monospace';
  ctx.fillText('MODEL: HI-PE Plus', 16, 52);
  ctx.fillText('100-240V~ 50/60Hz', 16, 70);

  // Barcode stripes
  for (let i = 0; i < 36; i++) {
    const w = i % 3 === 0 ? 4 : 2;
    ctx.fillRect(16 + i * 6, 82, w, 30);
  }

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createCeiaHhmdFrontTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Smooth warm light-grey CEIA PD140N polymer body
  ctx.fillStyle = '#c9ccc6';
  ctx.fillRect(0, 0, 256, 512);

  // Top detection blade CEIA sunburst + wordmark + URL
  const cx = 128;
  const cy = 62;
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6);
    ctx.lineTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
    ctx.stroke();
  }
  ctx.fillStyle = '#1e3a5f';
  ctx.font = '700 42px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ceia', 128, 128);
  ctx.font = '600 16px "IBM Plex Mono", monospace';
  ctx.fillText('www.ceia.net', 128, 152);

  // Acoustic buzzer/speaker dot matrix grille
  ctx.fillStyle = '#272c33';
  for (let row = 0; row < 5; row++) {
    const cols = row === 0 || row === 4 ? 5 : 7;
    const startX = 128 - ((cols - 1) * 14) / 2;
    for (let col = 0; col < cols; col++) {
      ctx.beginPath();
      ctx.arc(startX + col * 14, 198 + row * 13, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Shield-shaped optical/tactile keypad area
  ctx.fillStyle = '#b4b8b2';
  ctx.strokeStyle = '#525860';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(70, 278, 116, 134, 24);
  ctx.fill();
  ctx.stroke();

  // Status LED arc above OK button
  const ledCols = ['#22c55e', '#facc15', '#ef4444'];
  ledCols.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(102 + i * 26, 298, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Central OK button
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(128, 336, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('OK', 128, 342);

  // Side mode tactile buttons
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(92, 336, 9, 0, Math.PI * 2);
  ctx.arc(164, 336, 9, 0, Math.PI * 2);
  ctx.fill();

  // Bottom Power button
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(128, 386, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(128, 386, 7, -Math.PI * 0.25, Math.PI * 1.25);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(128, 376);
  ctx.lineTo(128, 384);
  ctx.stroke();

  ctx.textAlign = 'left';
  return finalizeTexture(canvas, maxAnisotropy);
}

export function createCeiaHhmdBackTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c9ccc6';
  ctx.fillRect(0, 0, 256, 512);

  // Subtle recessed ring where rear circular coil disc mounts
  ctx.strokeStyle = '#9ca19b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(128, 108, 62, 0, Math.PI * 2);
  ctx.stroke();

  // White compliance & barcode label at neck
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(76, 212, 104, 62);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(76, 212, 104, 62);
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ceia PD140N', 84, 230);
  for (let i = 0; i < 20; i++) {
    ctx.fillRect(84 + i * 4.4, 240, i % 2 === 0 ? 2.5 : 1.5, 24);
  }

  // Ribbed battery cover door on lower handle
  ctx.fillStyle = '#b9bdb7';
  ctx.strokeStyle = '#737873';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(84, 304, 88, 142, 10);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#8b908a';
  ctx.lineWidth = 2;
  for (let y = 324; y <= 420; y += 14) {
    ctx.beginPath();
    ctx.moveTo(96, y);
    ctx.lineTo(160, y);
    ctx.stroke();
  }

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createHikvisionDomeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Smooth matte off-white outdoor dome powder-coat finish
  ctx.fillStyle = '#eef1f4';
  ctx.fillRect(0, 0, 1024, 256);

  // Subtle horizontal seam line near upper shoulder
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 34);
  ctx.lineTo(1024, 34);
  ctx.stroke();

  // Crisp dark-charcoal italic HIKVISION wordmark on lower front face (u = 0.5 faces +Z with rotation offset)
  ctx.fillStyle = '#3f444c';
  ctx.font = 'italic 800 44px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HIKVISION', 512, 224);
  ctx.textAlign = 'left';

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createSonyIpelaSideTexture(maxAnisotropy: number, side: 'right' | 'left' = 'right'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e6e9ed';
  ctx.fillRect(0, 0, 512, 192);

  // Subtle metallic lower body highlight line
  ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.fillRect(0, 12, 512, 4);

  const hdX = side === 'right' ? 34 : 350;
  const sonyX = side === 'right' ? 316 : 36;

  // Front mark: HD / FOR L20
  ctx.fillStyle = '#5c636c';
  ctx.font = 'italic 800 40px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('HD', hdX, 82);
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('FOR L20', hdX, 110);

  // Rear mark: SONY & IPELA
  ctx.fillStyle = '#525861';
  ctx.font = '700 40px Georgia, serif';
  ctx.fillText('SONY', sonyX, 76);
  ctx.fillStyle = '#68707a';
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('IPELA', sonyX + 8, 148);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createSonyIpelaFrontFaceTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const cx = 256;
  const cy = 256;

  // Matte black inner bezel background
  ctx.fillStyle = '#12151a';
  ctx.fillRect(0, 0, 512, 512);

  // Crisp outer white camera nose ring
  ctx.strokeStyle = '#eef1f4';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(cx, cy, 240, 0, Math.PI * 2);
  ctx.stroke();

  // Dark metallic IR reflector ring channel
  ctx.fillStyle = '#242931';
  ctx.beginPath();
  ctx.arc(cx, cy, 224, 0, Math.PI * 2);
  ctx.fill();

  // 28 gleaming IR LED diodes arranged around perimeter ring
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    const lx = cx + Math.cos(angle) * 194;
    const ly = cy + Math.sin(angle) * 194;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(lx, ly, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(lx, ly, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Iconic Sony IPELA rounded-square dark central lens housing mask
  ctx.fillStyle = '#171a20';
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(108, 118, 296, 276, 30);
  ctx.fill();
  ctx.stroke();

  // Deep multi-coated vari-focal circular lens inside square window
  ctx.fillStyle = '#090c12';
  ctx.beginPath();
  ctx.arc(cx, cy, 102, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 6;
  [96, 76, 56].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Subtle emerald/magenta anti-reflective optical lens sheen
  const lensGrad = ctx.createRadialGradient(cx - 18, cy - 18, 8, cx, cy, 62);
  lensGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
  lensGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.28)');
  lensGrad.addColorStop(0.85, 'rgba(139, 92, 246, 0.22)');
  lensGrad.addColorStop(1, 'rgba(9, 12, 18, 0.95)');
  ctx.fillStyle = lensGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 62, 0, Math.PI * 2);
  ctx.fill();

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createHikvisionNvrFrontTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 224;
  const ctx = canvas.getContext('2d')!;

  // Brushed metallic silver-aluminum outer bezel frame
  const bezelGrad = ctx.createLinearGradient(0, 0, 0, 224);
  bezelGrad.addColorStop(0, '#dde1e6');
  bezelGrad.addColorStop(0.5, '#c7ccd2');
  bezelGrad.addColorStop(1, '#b6bcc4');
  ctx.fillStyle = bezelGrad;
  ctx.fillRect(0, 0, 1024, 224);

  // Glossy piano-black acrylic center panel with Hikvision's signature stepped lower center chin
  ctx.fillStyle = '#0c0f14';
  ctx.beginPath();
  ctx.moveTo(16, 20);
  ctx.lineTo(1008, 20);
  ctx.lineTo(1008, 206);
  ctx.lineTo(862, 206);
  ctx.lineTo(840, 184);
  ctx.lineTo(184, 184);
  ctx.lineTo(162, 206);
  ctx.lineTo(16, 206);
  ctx.closePath();
  ctx.fill();

  // Subtle dark border trim inside silver bezel
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Top-left crisp italic silver-white HIKVISION logo
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'italic 800 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('HIKVISION', 42, 62);

  // Bottom-left dual recessed USB 2.0 ports + USB trident symbol
  const drawUsb = (x: number) => {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.fillRect(x, 166, 30, 16);
    ctx.strokeRect(x, 166, 30, 16);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(x + 4, 171, 22, 6);
  };
  drawUsb(46);
  drawUsb(102);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 13px "IBM Plex Mono", monospace';
  ctx.fillText('USB', 78, 179);

  // Center-right tactile circular white-ringed control buttons (matching nvr_front.jpg)
  const drawRoundBtn = (cx: number, cy: number, r: number, glyph?: 'up' | 'down' | 'left' | 'right' | 'dot') => {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    if (glyph === 'dot') {
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (glyph) {
      ctx.beginPath();
      if (glyph === 'up') {
        ctx.moveTo(cx, cy - 6);
        ctx.lineTo(cx - 5, cy + 4);
        ctx.lineTo(cx + 5, cy + 4);
      } else if (glyph === 'down') {
        ctx.moveTo(cx, cy + 6);
        ctx.lineTo(cx - 5, cy - 4);
        ctx.lineTo(cx + 5, cy - 4);
      } else if (glyph === 'left') {
        ctx.moveTo(cx - 6, cy);
        ctx.lineTo(cx + 4, cy - 5);
        ctx.lineTo(cx + 4, cy + 5);
      } else if (glyph === 'right') {
        ctx.moveTo(cx + 6, cy);
        ctx.lineTo(cx - 4, cy - 5);
        ctx.lineTo(cx - 4, cy + 5);
      }
      ctx.closePath();
      ctx.fill();
    }
  };

  // Two left function buttons
  drawRoundBtn(578, 110, 17, 'dot');
  drawRoundBtn(656, 110, 17, 'dot');
  // 4-way navigation diamond
  drawRoundBtn(768, 58, 17, 'up');
  drawRoundBtn(768, 154, 17, 'down');
  drawRoundBtn(724, 108, 17, 'left');
  drawRoundBtn(812, 108, 17, 'right');
  // Right confirm/PTZ button
  drawRoundBtn(884, 110, 17, 'dot');

  // Top-right glowing soft pink/red square Power button
  ctx.fillStyle = '#e57389';
  ctx.beginPath();
  ctx.roundRect(956, 36, 34, 34, 6);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(973, 55, 8, -Math.PI * 0.25, Math.PI * 1.25);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(973, 44);
  ctx.lineTo(973, 53);
  ctx.stroke();

  // 3 vertical status indicators underneath power button (Power, HDD, Network)
  const ledColors = ['#22c55e', '#38bdf8', '#fbbf24'];
  ledColors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(973, 104 + i * 32, 4.5, 0, Math.PI * 2);
    ctx.fill();
  });

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createHikvisionNvrSideTexture(maxAnisotropy: number, frontOnLeft = true): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 224;
  const ctx = canvas.getContext('2d')!;

  // Matte black steel chassis side cover
  ctx.fillStyle = '#1b1e24';
  ctx.fillRect(0, 0, 1024, 224);

  // Top lid lip crease line
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(1024, 22);
  ctx.stroke();

  // Brushed silver beveled front trim edge strip
  const silverX = frontOnLeft ? 0 : 964;
  ctx.fillStyle = '#c8cdd4';
  ctx.fillRect(silverX, 0, 60, 224);

  // 5x18 circular perforation cooling vent grid on forward half (matching nvr_side.jpg)
  const ventStartX = frontOnLeft ? 168 : 496;
  ctx.fillStyle = '#07090d';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 18; col++) {
      ctx.beginPath();
      ctx.arc(ventStartX + col * 18, 66 + row * 19, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3 recessed Phillips cover screws (front, bottom-center, rear)
  const screws = frontOnLeft
    ? [[98, 114], [520, 178], [986, 114]]
    : [[926, 114], [504, 178], [38, 114]];
  screws.forEach(([sx, sy]) => {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(sx, sy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx - 5, sy);
    ctx.lineTo(sx + 5, sy);
    ctx.moveTo(sx, sy - 5);
    ctx.lineTo(sx, sy + 5);
    ctx.stroke();
  });

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createHikvisionNvrBackTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 224;
  const ctx = canvas.getContext('2d')!;

  // Galvanized light-grey steel rear I/O plate (matching nvr_back.jpg)
  ctx.fillStyle = '#c6cbd1';
  ctx.fillRect(0, 0, 1024, 224);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 10;
  ctx.strokeRect(4, 4, 1016, 216);

  // --- TOP ROW: eSATA, Blue RS-232, Blue VGA, 5x Bright-Green Euroblock ALARM IN/OUT ---
  // eSATA port
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(72, 24, 42, 20);
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 11px "IBM Plex Mono", monospace';
  ctx.fillText('eSATA', 74, 58);

  // Blue RS-232 DB9 & Blue VGA ports
  const drawBluePort = (x: number, label: string) => {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x, 20, 56, 28);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(x + 8, 24, 40, 20);
    ctx.fillStyle = '#0f172a';
    ctx.fillText(label, x + 12, 60);
  };
  drawBluePort(156, 'RS-232');
  drawBluePort(244, 'VGA');

  // 5 Bright-Green Euroblock Alarm In / Alarm Out Terminal Blocks
  for (let b = 0; b < 5; b++) {
    const bx = 358 + b * 62;
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(bx, 22, 54, 26);
    ctx.fillStyle = '#052e16';
    for (let p = 0; p < 5; p++) {
      ctx.fillRect(bx + 5 + p * 9.5, 28, 6, 12);
    }
  }
  ctx.fillStyle = '#0f172a';
  ctx.fillText('ALARM IN', 392, 62);
  ctx.fillText('ALARM OUT', 520, 62);

  // --- BOTTOM LEFT: 16-PORT PoE RJ-45 ETHERNET SWITCH BANK (2 rows x 8 ports) ---
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 82, 470, 122);
  for (let col = 0; col < 10; col++) {
    if (col === 4 || col === 5) {
      // Visual grouping gap matching 4+4+4 blocks in nvr_back.jpg
    }
  }
  const drawRj45Block = (startX: number, cols: number) => {
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < 2; r++) {
        const px = startX + c * 36;
        const py = 90 + r * 52;
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(px, py, 33, 46);
        ctx.fillStyle = '#111827';
        ctx.fillRect(px + 4, py + 7, 25, 32);
        // Tiny green/amber PoE link LEDs
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(px + 5, py + 41, 6, 4);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(px + 22, py + 41, 6, 4);
      }
    }
  };
  drawRj45Block(28, 4);
  drawRj45Block(182, 4);
  drawRj45Block(336, 4);
  ctx.fillStyle = '#0f172a';
  ctx.fillText('PoE 1–16', 228, 215);

  // --- BOTTOM CENTER: LAN + USB 3.0, Dual HDMI, Audio RCA (Red/White), Coax BNC ---
  // LAN + USB 3.0 stack
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(508, 94, 44, 96);
  ctx.fillStyle = '#111827';
  ctx.fillRect(514, 102, 32, 34);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(514, 152, 32, 18);
  ctx.fillStyle = '#0f172a';
  ctx.fillText('LAN/USB', 506, 206);

  // Dual HDMI stack
  ctx.fillStyle = '#334155';
  ctx.fillRect(566, 114, 36, 18);
  ctx.fillRect(566, 152, 36, 18);
  ctx.fillStyle = '#0f172a';
  ctx.fillText('HDMI', 568, 206);

  // Red & White Audio RCA jacks
  const drawRca = (cy: number, ringColor: string) => {
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(632, cy, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ringColor;
    ctx.beginPath();
    ctx.arc(632, cy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(632, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  };
  drawRca(114, '#dc2626');
  drawRca(162, '#f8fafc');
  ctx.fillStyle = '#0f172a';
  ctx.fillText('AUDIO', 614, 206);

  // Silver BNC / CVBS coax jack
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(678, 116, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.stroke();

  // --- RIGHT: HEXAGONAL HONEYCOMB COOLING FAN GRILLE + QC STICKER ---
  const fanCx = 812;
  const fanCy = 112;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(732, 24, 160, 174);
  // Honeycomb hexagonal perforation pattern
  ctx.fillStyle = '#c6cbd1';
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const hx = 740 + col * 16 + (row % 2) * 8;
      const hy = 32 + row * 17;
      ctx.strokeStyle = '#c6cbd1';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(hx, hy, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // Central silver-white fan hub QC sticker
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(fanCx, fanCy, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#15803d';
  ctx.font = '700 10px "IBM Plex Mono", monospace';
  ctx.fillText('QC OK', fanCx - 16, fanCy + 4);

  // --- FAR RIGHT: IEC C14 AC POWER INLET + BLACK ROCKER SWITCH ---
  ctx.fillStyle = '#111827';
  ctx.fillRect(914, 34, 62, 86);
  ctx.fillStyle = '#334155';
  ctx.fillRect(924, 46, 42, 62);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(942, 56, 6, 16);
  ctx.fillRect(930, 82, 6, 16);
  ctx.fillRect(954, 82, 6, 16);

  // Black AC Rocker Power Switch underneath
  ctx.fillStyle = '#111827';
  ctx.fillRect(924, 134, 52, 46);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.strokeRect(932, 142, 36, 30);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 13px "IBM Plex Mono", monospace';
  ctx.fillText('I  O', 936, 162);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createHikvisionFisheyeBandTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Smooth matte off-white die-cast aluminum housing
  ctx.fillStyle = '#f0f2f5';
  ctx.fillRect(0, 0, 1024, 256);

  // Clean horizontal dark gasket seam line near upper baseplate edge
  ctx.fillStyle = '#525b66';
  ctx.fillRect(0, 48, 1024, 5);

  // Subtle lower bevel shading band
  const botGrad = ctx.createLinearGradient(0, 195, 0, 256);
  botGrad.addColorStop(0, 'rgba(148, 163, 184, 0)');
  botGrad.addColorStop(1, 'rgba(148, 163, 184, 0.32)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, 195, 1024, 61);

  // FRONT (center u = 0.5 -> x = 512): Crisp dark-grey italic HIKVISION logo
  ctx.fillStyle = '#474d56';
  ctx.font = 'italic 800 44px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HIKVISION', 512, 146);
  ctx.textAlign = 'left';

  // SIDE recess panel & Phillips screw slot (x ≈ 240 & 784)
  [248, 776].forEach((sx) => {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(sx - 56, 86, 112, 104, 16);
    ctx.stroke();

    // Vertical screw slot + Phillips screw head
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(sx - 24, 112, 18, 52, 8);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(sx - 15, 124, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 19, 124);
    ctx.lineTo(sx - 11, 124);
    ctx.moveTo(sx - 15, 120);
    ctx.lineTo(sx - 15, 128);
    ctx.stroke();

    // Second vent/cable slot
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(sx + 18, 118, 14, 46, 7);
    ctx.fill();
  });

  // BACK (seam at u = 0 / 1 -> x = 0..140 & x = 884..1024): Slotted conduit knockout + CE/barcode sticker
  // White HIKVISION CE & barcode specification sticker (right side of back view -> x = 84..210)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(68, 92, 116, 74);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(68, 92, 116, 74);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'italic 700 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('HIKVISION', 76, 110);
  for (let i = 0; i < 20; i++) {
    ctx.fillRect(76 + i * 4.5, 116, i % 3 === 0 ? 3 : 1.5, 18);
  }
  ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('CE', 76, 156);

  // Slotted circular conduit knockout centered at seam (x = 0 and x = 1024)
  [0, 1024].forEach((kx) => {
    ctx.fillStyle = '#d4d9e0';
    ctx.beginPath();
    ctx.arc(kx, 126, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(kx - 4, 108, 8, 36);
  });

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createCeilingSpeakerGrilleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const cx = 256;
  const cy = 256;

  // Matte off-white outer trim ring
  ctx.fillStyle = '#eef1f5';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle recessed metallic acoustic grille disc
  const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 212);
  grad.addColorStop(0, '#cfd6df');
  grad.addColorStop(0.75, '#e2e7ee');
  grad.addColorStop(1, '#bcc5d0');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 212, 0, Math.PI * 2);
  ctx.fill();

  // Concentric circular acoustic micro-perforation holes
  ctx.fillStyle = '#334155';
  for (let r = 24; r <= 194; r += 16) {
    const count = Math.max(8, Math.round((2 * Math.PI * r) / 16));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Center acoustic dust-cap emblem
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.stroke();

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createColumnSpeakerGrilleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  // Brushed silver-grey outer frame
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 256, 768);

  // Dark anodized perforated acoustic front mesh
  ctx.fillStyle = '#27303f';
  ctx.fillRect(18, 22, 220, 684);

  // Fine staggered acoustic mesh dots
  ctx.fillStyle = '#0f172a';
  for (let y = 36; y <= 692; y += 14) {
    const offset = ((y / 14) % 2) * 7;
    for (let x = 28 + offset; x <= 228; x += 14) {
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Bottom brushed metal nameplate strip
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(18, 712, 220, 36);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 18px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAS · 100V LINE', 128, 736);
  ctx.textAlign = 'left';

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createTocMonitorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#081221';
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = '#0f294a';
  ctx.fillRect(0, 0, 1024, 62);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('TERMINAL OPERATION CENTER (TOC) · EVALUASI ELBAN', 28, 42);

  const panels = [
    { title: 'SCP X-RAY & WTMD', status: 'ACTIVE · 160 kV', color: '#38bdf8' },
    { title: 'AIRSIDE PIDS & PTZ', status: 'PERIMETER CLEAR', color: '#2dd4bf' },
    { title: 'MCFA FIRE & ACCESS', status: 'LOOP NORMAL · 24V', color: '#f87171' },
    { title: 'FIDS / PAS / RADIO', status: 'GPS SYNC LOCKED', color: '#a78bfa' },
  ];

  panels.forEach((p, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 32 + col * 490;
    const y = 92 + row * 195;

    ctx.fillStyle = '#0f1f36';
    ctx.fillRect(x, y, 466, 172);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, 466, 172);

    ctx.fillStyle = p.color;
    ctx.font = '700 20px "IBM Plex Mono", monospace';
    ctx.fillText(p.title, x + 22, y + 40);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 18px "IBM Plex Mono", monospace';
    ctx.fillText(p.status, x + 22, y + 74);

    // Simple waveform / bar chart visual
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x + 22, y + 96, 422, 54);
    ctx.fillStyle = p.color;
    for (let b = 0; b < 14; b++) {
      const h = 14 + ((b * 17 + idx * 9) % 34);
      ctx.fillRect(x + 32 + b * 29, y + 146 - h, 18, h);
    }
  });

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createZoneSignTexture(title: string, subtitle: string, accentHex: string, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0b192c';
  ctx.fillRect(0, 0, 512, 140);
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, 18, 140);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(title, 36, 66);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 20px "IBM Plex Mono", monospace';
  ctx.fillText(subtitle, 36, 106);

  return finalizeTexture(canvas, maxAnisotropy);
}

// =========================================================================
// WALK-IN ELBAN ENTRANCE GATE (BANDARA INTERNASIONAL SULTAN HASANUDDIN UPG)
// =========================================================================

export function createGateCrownSignTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep matte navy-charcoal architectural signboard backdrop for maximum daylight legibility
  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#071122');
  bg.addColorStop(0.5, '#0d1b33');
  bg.addColorStop(1, '#060e1c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1536, 512);

  // Subtle metallic bevel border & golden-amber architectural framing rules
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, 1508, 484);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, 1480, 456);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const drawSharpTitle = (
    text: string,
    y: number,
    font: string,
    fillTop: string,
    fillBot: string,
    glowColor: string,
    depthPx: number
  ) => {
    ctx.save();
    ctx.font = font;
    // Deep warm bronze 3D drop-extrusion for crisp separation
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;
    for (let d = depthPx; d >= 1; d--) {
      ctx.fillStyle = d > depthPx * 0.5 ? '#7c2d12' : '#b45309';
      ctx.fillText(text, 768 + d * 0.45, y + d * 0.75);
    }

    // Crisp luminous gradient face
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    const grad = ctx.createLinearGradient(0, y - 92, 0, y + 12);
    grad.addColorStop(0, fillTop);
    grad.addColorStop(1, fillBot);
    ctx.fillStyle = grad;
    ctx.fillText(text, 768, y);

    // Subtle crisp outline so every letter edge stays razor sharp at distance
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 251, 235, 0.5)';
    ctx.lineWidth = 1.6;
    ctx.strokeText(text, 768, y);
    ctx.restore();
  };

  // Line 1: BANDARA INTERNASIONAL
  drawSharpTitle(
    'BANDARA INTERNASIONAL',
    136,
    '800 84px "Plus Jakarta Sans", sans-serif',
    '#ffffff',
    '#fef3c7',
    'rgba(251, 191, 36, 0.45)',
    5
  );

  // Line 2: SULTAN HASANUDDIN
  drawSharpTitle(
    'SULTAN HASANUDDIN',
    264,
    '900 108px "Plus Jakarta Sans", sans-serif',
    '#fffbeb',
    '#fde047',
    'rgba(245, 158, 11, 0.6)',
    6
  );

  // Architectural accent rules flanking MAKASSAR
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(96, 386);
  ctx.lineTo(355, 386);
  ctx.moveTo(1181, 386);
  ctx.lineTo(1440, 386);
  ctx.stroke();

  // Line 3: MAKASSAR
  drawSharpTitle(
    'MAKASSAR',
    422,
    '900 116px "Plus Jakarta Sans", sans-serif',
    '#fef08a',
    '#f59e0b',
    'rgba(245, 158, 11, 0.65)',
    7
  );

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createGateMarqueeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;

  // Dark anodized slate panel with subtle metallic sheen
  const bg = ctx.createLinearGradient(0, 0, 0, 300);
  bg.addColorStop(0, '#09111f');
  bg.addColorStop(0.5, '#0f1b2e');
  bg.addColorStop(1, '#070e1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1280, 300);

  // Subtle horizontal tech scanlines
  ctx.fillStyle = 'rgba(56, 189, 248, 0.04)';
  for (let y = 0; y < 300; y += 8) {
    ctx.fillRect(0, y, 1280, 2);
  }

  // Glowing top cyan bar & bottom amber accent bar
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(28, 14, 1224, 6);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(28, 280, 1224, 6);

  // Decorative side circuit brackets
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 1240, 260);

  ctx.textAlign = 'center';

  // Primary Title: ELEKTRONIKA BANDARA (ELBAN)
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#fffbeb';
  ctx.font = '800 66px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ELEKTRONIKA BANDARA (ELBAN)', 640, 134);

  // Divider accent lines flanking AIRPORT TECHNOLOGY
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(90, 224);
  ctx.lineTo(290, 224);
  ctx.moveTo(990, 224);
  ctx.lineTo(1190, 224);
  ctx.stroke();

  // Secondary Title: AIRPORT TECHNOLOGY
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#bae6fd';
  ctx.font = '800 56px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('AIRPORT TECHNOLOGY', 640, 242);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createGateEmblemTexture(
  variant: 'atnos' | 'airport_tech',
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);

  // Outer glowing circular badge disc
  const rad = ctx.createRadialGradient(256, 256, 40, 256, 256, 246);
  rad.addColorStop(0, '#0f2942');
  rad.addColorStop(0.78, '#071426');
  rad.addColorStop(1, '#040a14');
  ctx.fillStyle = rad;
  ctx.beginPath();
  ctx.arc(256, 256, 242, 0, Math.PI * 2);
  ctx.fill();

  // Luminous cyan outer ring
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 256, 232, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(186, 230, 253, 0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(256, 256, 212, 0, Math.PI * 2);
  ctx.stroke();

  if (variant === 'atnos') {
    // Shield emblem inspired by ATNOS badge
    ctx.fillStyle = '#10b981';
    ctx.strokeStyle = '#ecfeff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(256, 84);
    ctx.lineTo(368, 124);
    ctx.lineTo(354, 272);
    ctx.quadraticCurveTo(334, 344, 256, 396);
    ctx.quadraticCurveTo(178, 344, 158, 272);
    ctx.lineTo(144, 124);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner bright shield field
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(256, 112);
    ctx.lineTo(340, 144);
    ctx.lineTo(330, 258);
    ctx.quadraticCurveTo(312, 316, 256, 356);
    ctx.quadraticCurveTo(200, 316, 182, 258);
    ctx.lineTo(172, 144);
    ctx.closePath();
    ctx.fill();

    // Stylized security camera / radar icon inside shield
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(206, 174, 88, 42);
    ctx.beginPath();
    ctx.arc(294, 195, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(294, 195, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(230, 216);
    ctx.lineTo(230, 248);
    ctx.lineTo(278, 248);
    ctx.stroke();

    // Green ATNOS ribbon across lower shield
    ctx.fillStyle = '#059669';
    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 5;
    ctx.fillRect(118, 286, 276, 62);
    ctx.strokeRect(118, 286, 276, 62);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ATNOS', 256, 331);
  } else {
    // AIRPORT TECHNOLOGY circuit + airplane icon
    const colors = ['#38bdf8', '#a3e635', '#f59e0b'];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r1 = 104;
      const r2 = 166;
      ctx.strokeStyle = colors[i % colors.length];
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(256 + Math.cos(a) * r1, 212 + Math.sin(a) * r1);
      ctx.lineTo(256 + Math.cos(a) * r2, 212 + Math.sin(a) * r2);
      ctx.stroke();

      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(256 + Math.cos(a) * r2, 212 + Math.sin(a) * r2, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center airplane silhouette
    ctx.save();
    ctx.translate(256, 212);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.moveTo(0, -68);
    ctx.lineTo(14, -22);
    ctx.lineTo(74, 8);
    ctx.lineTo(74, 24);
    ctx.lineTo(14, 12);
    ctx.lineTo(10, 48);
    ctx.lineTo(30, 62);
    ctx.lineTo(30, 72);
    ctx.lineTo(0, 62);
    ctx.lineTo(-30, 72);
    ctx.lineTo(-30, 62);
    ctx.lineTo(-10, 48);
    ctx.lineTo(-14, 12);
    ctx.lineTo(-74, 24);
    ctx.lineTo(-74, 8);
    ctx.lineTo(-14, -22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e0f2fe';
    ctx.font = '800 34px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('AIRPORT', 256, 374);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('TECHNOLOGY', 256, 412);
  }

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createTorajaCarvingTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Rich backlit deep burgundy / Toraja red-mahogany background
  const bg = ctx.createLinearGradient(0, 0, 0, 1024);
  bg.addColorStop(0, '#581111');
  bg.addColorStop(0.5, '#7c1812');
  bg.addColorStop(1, '#450a0a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 1024);

  // Glowing golden-amber carving frame
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, 472, 984);
  ctx.strokeStyle = 'rgba(254, 243, 199, 0.72)';
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 36, 440, 952);

  // Upper & lower geometric Toraja Pa'barre Allo / Pa'tangke Lumu ornaments
  const drawOrnamentBand = (cy: number, h: number) => {
    ctx.save();
    ctx.strokeStyle = '#fde68a';
    ctx.fillStyle = '#f59e0b';
    ctx.lineWidth = 4;

    // Horizontal borders
    ctx.beginPath();
    ctx.moveTo(48, cy - h / 2);
    ctx.lineTo(464, cy - h / 2);
    ctx.moveTo(48, cy + h / 2);
    ctx.lineTo(464, cy + h / 2);
    ctx.stroke();

    // Diamond lattice & spirals
    for (let x = 84; x <= 428; x += 68) {
      ctx.beginPath();
      ctx.moveTo(x, cy - h * 0.36);
      ctx.lineTo(x + 28, cy);
      ctx.lineTo(x, cy + h * 0.36);
      ctx.lineTo(x - 28, cy);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, cy, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  drawOrnamentBand(130, 120);
  drawOrnamentBand(890, 120);

  // Central iconic Sunburst / Tongkonan symmetrical carved medallion (Pa'barre Allo)
  const cx = 256;
  const cy = 510;
  ctx.save();
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = 5;

  // Outer carved diamond crest
  ctx.beginPath();
  ctx.moveTo(cx, cy - 260);
  ctx.quadraticCurveTo(cx + 185, cy - 140, cx + 190, cy);
  ctx.quadraticCurveTo(cx + 185, cy + 140, cx, cy + 260);
  ctx.quadraticCurveTo(cx - 185, cy + 140, cx - 190, cy);
  ctx.quadraticCurveTo(cx - 185, cy - 140, cx, cy - 260);
  ctx.closePath();
  ctx.stroke();

  // Inner concentric sun rays (Pa'barre Allo)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44);
    ctx.lineTo(cx + Math.cos(a) * 145, cy + Math.sin(a) * 145);
    ctx.stroke();
  }

  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.arc(cx, cy, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fill();

  // Symmetrical S-scroll carvings above & below center
  [-175, 175].forEach((dy) => {
    ctx.beginPath();
    ctx.arc(cx - 56, cy + dy, 34, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 56, cy + dy, 34, Math.PI * 0.5, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createGateCircuitTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#080f1d';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle dark PCB grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Luminous cyan & warm-amber circuit bus traces
  const traces = [
    { color: '#38bdf8', pts: [[32, 0], [32, 160], [96, 224], [96, 512]] },
    { color: '#38bdf8', pts: [[64, 0], [64, 128], [144, 208], [144, 384], [208, 448], [208, 512]] },
    { color: '#f97316', pts: [[192, 0], [192, 192], [256, 256], [256, 512]] },
    { color: '#38bdf8', pts: [[304, 0], [304, 144], [368, 208], [368, 512]] },
    { color: '#f59e0b', pts: [[416, 0], [416, 256], [352, 320], [352, 512]] },
    { color: '#38bdf8', pts: [[464, 0], [464, 192], [432, 224], [432, 512]] },
  ];

  traces.forEach((tr) => {
    ctx.strokeStyle = tr.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    tr.pts.forEach(([x, y], idx) => {
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    tr.pts.forEach(([x, y]) => {
      ctx.fillStyle = tr.color;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // Mini dark IC microchip modules
  const chips: Array<[number, number, number, number]> = [
    [120, 64, 52, 52],
    [264, 296, 60, 44],
    [376, 88, 56, 56],
    [84, 376, 64, 48],
  ];
  chips.forEach(([x, y, w, h]) => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  });

  return finalizeTexture(canvas, maxAnisotropy, 3, 2);
}

export function createRunwayPracticumTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;

  // Deep runway navy-charcoal deck
  const bg = ctx.createLinearGradient(0, 0, 1024, 0);
  bg.addColorStop(0, '#091426');
  bg.addColorStop(0.5, '#0f213d');
  bg.addColorStop(1, '#091426');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 2048);

  // Outer yellow/amber hazard dashed taxiway strips along left & right edges
  ctx.fillStyle = '#facc15';
  for (let y = 36; y < 2012; y += 72) {
    ctx.fillRect(28, y, 52, 36);
    ctx.fillRect(944, y, 52, 36);
  }

  // Luminous electric-cyan runway edge rails
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(108, 0, 14, 2048);
  ctx.fillRect(902, 0, 14, 2048);

  // Upper runway centerline dashes leading into Walk-In ElBan hall (top = North / inside terminal)
  ctx.fillStyle = '#7dd3fc';
  for (let y = 60; y < 1040; y += 130) {
    ctx.fillRect(500, y, 24, 72);
  }

  // Runway threshold piano keys (mid-section)
  ctx.fillStyle = 'rgba(125, 211, 252, 0.55)';
  for (let x = 220; x <= 780; x += 92) {
    ctx.fillRect(x, 1110, 44, 105);
  }

  // START PRACTICUM illuminated floor sign
  ctx.textAlign = 'center';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#fde047';
  ctx.font = '900 104px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('START', 512, 1365);

  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#7dd3fc';
  ctx.font = '800 84px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('PRACTICUM', 512, 1470);

  // Stylized glowing shoe footprints (left cyan, right amber)
  const drawFootprint = (cx: number, cy: number, color: string) => {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    // Forefoot sole
    ctx.beginPath();
    ctx.ellipse(cx, cy - 42, 46, 72, 0, 0, Math.PI * 2);
    ctx.fill();
    // Heel pad
    ctx.beginPath();
    ctx.ellipse(cx, cy + 72, 34, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    // Horizontal shoe tread grooves
    ctx.fillStyle = '#0c1b33';
    for (let gy = cy - 92; gy <= cy + 96; gy += 22) {
      ctx.fillRect(cx - 56, gy, 112, 7);
    }
    ctx.restore();
  };

  drawFootprint(384, 1650, '#38bdf8');
  drawFootprint(640, 1650, '#facc15');

  // STOP sign at the bottom entry threshold
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#fde047';
  ctx.font = '900 132px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('STOP', 512, 1930);

  return finalizeTexture(canvas, maxAnisotropy);
}

// =========================================================================
// WALK-IN ELBAN EXTERIOR FACADE TEXTURES (STONE, TORAJA WOOD PILASTER, LOUVER)
// =========================================================================

export function createFacadeStoneTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm Makassar travertine sandstone cladding base
  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#c2b09a');
  bg.addColorStop(0.5, '#b4a18a');
  bg.addColorStop(1, '#a6937c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle architectural stone surface mottling & travertine grain
  for (let i = 0; i < 950; i++) {
    const px = Math.abs((Math.sin(i * 19.13) * 43758.54) % 1) * 512;
    const py = Math.abs((Math.sin(i * 93.71) * 19384.21) % 1) * 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 248, 236, 0.14)' : 'rgba(92, 72, 52, 0.12)';
    ctx.fillRect(px, py, 6 + (i % 12), 2 + (i % 3));
  }

  // Crisp architectural stone cladding panel joints (2x4 ashlar panels)
  ctx.strokeStyle = 'rgba(72, 56, 40, 0.34)';
  ctx.lineWidth = 3;
  for (let y = 0; y <= 512; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  for (let x = 0; x <= 512; x += 256) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  // Warm golden top cove wash glow spilling down from upper LED strip
  const coveWash = ctx.createLinearGradient(0, 0, 0, 140);
  coveWash.addColorStop(0, 'rgba(251, 191, 36, 0.34)');
  coveWash.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = coveWash;
  ctx.fillRect(0, 0, 512, 140);

  return finalizeTexture(canvas, maxAnisotropy, 3, 1);
}

export function createTorajaWoodPilasterTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Carved warm teak/walnut wood base matching the exterior facade pilasters
  const bg = ctx.createLinearGradient(0, 0, 256, 0);
  bg.addColorStop(0, '#4a2f1a');
  bg.addColorStop(0.5, '#6b4728');
  bg.addColorStop(1, '#4a2f1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 1024);

  // Recessed outer carved wooden border
  ctx.strokeStyle = '#d4a36a';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, 232, 1000);
  ctx.strokeStyle = '#2d1a0d';
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, 212, 980);

  // 4 stacked traditional Toraja geometric carved wooden relief medallions
  for (let idx = 0; idx < 4; idx++) {
    const topY = 38 + idx * 240;
    const cy = topY + 112;
    const cx = 128;

    // Panel divider recess
    ctx.fillStyle = '#3b2413';
    ctx.fillRect(30, topY, 196, 224);
    ctx.strokeStyle = '#c89558';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, topY, 196, 224);

    // Carved diamond outer crest with dark relief shadow + warm wood highlight
    const drawDiamond = (ox: number, oy: number, color: string, lw: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(cx + ox, topY + 20 + oy);
      ctx.lineTo(cx + 76 + ox, cy + oy);
      ctx.lineTo(cx + ox, topY + 204 + oy);
      ctx.lineTo(cx - 76 + ox, cy + oy);
      ctx.closePath();
      ctx.stroke();
    };
    drawDiamond(2, 3, '#1f1208', 6);
    drawDiamond(0, 0, '#d9ab73', 4);

    // Inner Pa'barre Allo carved sunburst + corner S-scroll motifs
    ctx.strokeStyle = '#d9ab73';
    ctx.lineWidth = 3;
    for (let r = 0; r < 12; r++) {
      const a = (r / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16);
      ctx.lineTo(cx + Math.cos(a) * 48, cy + Math.sin(a) * 48);
      ctx.stroke();
    }
    ctx.fillStyle = '#53351d';
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Corner spiral accents
    [
      [48, topY + 26],
      [208, topY + 26],
      [48, topY + 198],
      [208, topY + 198],
    ].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 12, 0, Math.PI * 1.65);
      ctx.stroke();
    });
  }

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createFacadeLouverTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Dark anodized steel louver housing
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 256);

  // Horizontal brushed charcoal architectural louver blades
  for (let y = 14; y < 244; y += 22) {
    const slatGrad = ctx.createLinearGradient(0, y, 0, y + 14);
    slatGrad.addColorStop(0, '#475569');
    slatGrad.addColorStop(0.35, '#334155');
    slatGrad.addColorStop(1, '#0b1220');
    ctx.fillStyle = slatGrad;
    ctx.fillRect(10, y, 492, 14);
  }

  // Heavy anodized structural bay frame & vertical mullions
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 502, 246);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(248, 0, 16, 256);
  ctx.fillStyle = '#475569';
  ctx.fillRect(253, 0, 6, 256);

  return finalizeTexture(canvas, maxAnisotropy, 3, 1);
}



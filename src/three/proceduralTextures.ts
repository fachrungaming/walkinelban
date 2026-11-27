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
  canvas.width = 768;
  canvas.height = 1152;
  const ctx = canvas.getContext('2d')!;
  const tex = finalizeTexture(canvas, maxAnisotropy);

  type AirlineKey = 'batik' | 'lion' | 'citilink' | 'sriwijaya' | 'nam' | 'garuda' | 'pelita' | 'superair';
  interface FidsRow {
    airline: AirlineKey;
    flight: string;
    time: string;
    dest: string;
    gate: string;
    remarks: string;
    remarkColor: string;
    hasPlaneIcon?: boolean;
  }

  const topFlights: FidsRow[] = [
    { airline: 'batik', flight: 'ID 6281', time: '20:40', dest: 'Jakarta', gate: '8', remarks: 'Gate Closed', remarkColor: '#fb7185', hasPlaneIcon: true },
    { airline: 'lion', flight: 'JT 791', time: '20:45', dest: 'Surabaya', gate: '5', remarks: 'Gate Closed', remarkColor: '#fb7185', hasPlaneIcon: true },
    { airline: 'nam', flight: 'IN 602', time: '21:00', dest: 'Denpasar', gate: '7', remarks: 'To Waiting Room', remarkColor: '#7dd3fc', hasPlaneIcon: true },
    { airline: 'citilink', flight: 'QG 351', time: '21:15', dest: 'Jakarta', gate: '8', remarks: 'Check in Open', remarkColor: '#5eead4', hasPlaneIcon: true },
    { airline: 'sriwijaya', flight: 'SJ 589', time: '21:30', dest: 'Jakarta', gate: '9', remarks: 'Check in Open', remarkColor: '#5eead4', hasPlaneIcon: true },
    { airline: 'lion', flight: 'JT 715', time: '21:45', dest: 'Balikpapan', gate: '9', remarks: 'Check in Open', remarkColor: '#5eead4', hasPlaneIcon: true },
  ];

  const scheduledFlights: FidsRow[] = [
    { airline: 'citilink', flight: 'QG 332', time: '00:10', dest: 'Jakarta', gate: '5', remarks: 'Scheduled', remarkColor: '#f1f5f9', hasPlaneIcon: true },
    { airline: 'garuda', flight: 'GA 615', time: '00:25', dest: 'Jakarta', gate: '3', remarks: 'Scheduled', remarkColor: '#f1f5f9', hasPlaneIcon: true },
    { airline: 'lion', flight: 'JT 786', time: '05:10', dest: 'Jayapura', gate: '', remarks: 'Scheduled', remarkColor: '#f1f5f9', hasPlaneIcon: true },
    { airline: 'lion', flight: 'JT 744', time: '05:30', dest: 'Manado', gate: '', remarks: 'Scheduled', remarkColor: '#f1f5f9' },
    { airline: 'citilink', flight: 'QG 430', time: '05:45', dest: 'Surabaya', gate: '1', remarks: 'Scheduled', remarkColor: '#f1f5f9', hasPlaneIcon: true },
    { airline: 'lion', flight: 'JT 796', time: '06:00', dest: 'Sorong', gate: '', remarks: 'Scheduled', remarkColor: '#f1f5f9', hasPlaneIcon: true },
    { airline: 'lion', flight: 'JT 880', time: '06:15', dest: 'Kendari', gate: '', remarks: 'Scheduled', remarkColor: '#f1f5f9' },
    { airline: 'superair', flight: 'IU 524', time: '06:30', dest: 'Balikpapan', gate: '', remarks: 'Scheduled', remarkColor: '#f1f5f9', hasPlaneIcon: true },
    { airline: 'pelita', flight: 'IP 310', time: '07:00', dest: 'Jakarta', gate: '4', remarks: 'Check in Open', remarkColor: '#5eead4' },
    { airline: 'batik', flight: 'ID 6181', time: '07:20', dest: 'Ambon', gate: '', remarks: 'Scheduled', remarkColor: '#f1f5f9', hasPlaneIcon: true },
    { airline: 'batik', flight: 'ID 6291', time: '07:45', dest: 'Jayapura', gate: '', remarks: 'Scheduled', remarkColor: '#f1f5f9', hasPlaneIcon: true },
    { airline: 'garuda', flight: 'GA 643', time: '08:15', dest: 'Denpasar', gate: '2', remarks: 'Scheduled', remarkColor: '#f1f5f9', hasPlaneIcon: true },
  ];

  const drawAirlinePill = (airline: AirlineKey, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x, y, w, h);

    if (airline === 'batik') {
      ctx.fillStyle = '#9d174d';
      ctx.fillRect(x, y, 6, h);
      ctx.fillStyle = '#6b21a8';
      ctx.font = 'italic 800 17px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Batik', x + 12, y + 21);
      ctx.fillStyle = '#db2777';
      ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('air', x + 64, y + 21);
    } else if (airline === 'lion') {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x, y, 6, h);
      ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Lion', x + 11, y + 21);
      ctx.fillStyle = '#ef4444';
      ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('air', x + 54, y + 21);
    } else if (airline === 'citilink') {
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(x, y, 6, h);
      ctx.fillStyle = '#15803d';
      ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Citilink', x + 12, y + 21);
    } else if (airline === 'sriwijaya') {
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(x, y, 6, h);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x + 6, y + h - 5, w - 6, 5);
      ctx.fillStyle = '#1e3a8a';
      ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Sriwijaya', x + 11, y + 19);
    } else if (airline === 'nam') {
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(x, y, 6, h);
      ctx.fillStyle = '#1e40af';
      ctx.font = '900 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('NAM AIR', x + 12, y + 20);
    } else if (airline === 'garuda') {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(x, y, 6, h);
      ctx.fillStyle = '#0369a1';
      ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Garuda', x + 12, y + 21);
    } else if (airline === 'pelita') {
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(x, y, 6, h);
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('PELITA AIR', x + 10, y + 20);
    } else {
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('SUPER AIR', x + 10, y + 20);
    }
  };

  const drawMiniPlaneIcon = (x: number, y: number) => {
    ctx.save();
    ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x + 14, y - 3);
    ctx.lineTo(x + 16, y - 1);
    ctx.lineTo(x + 5, y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x + 18, y + 1, 9, 2);
    ctx.restore();
  };

  const redraw = (now: Date) => {
    // Authentic Sultan Hasanuddin deep aviation navy gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1152);
    bgGrad.addColorStop(0, '#143252');
    bgGrad.addColorStop(0.5, '#1b4772');
    bgGrad.addColorStop(1, '#122f4d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 768, 1152);

    // Top Header Band
    ctx.fillStyle = '#183f67';
    ctx.fillRect(0, 0, 768, 112);

    // Left Departure Airplane Icon Badge
    ctx.fillStyle = '#dbeafe';
    ctx.beginPath();
    ctx.roundRect(24, 24, 62, 62, 10);
    ctx.fill();
    ctx.fillStyle = '#16385c';
    ctx.beginPath();
    ctx.moveTo(35, 62);
    ctx.lineTo(72, 42);
    ctx.lineTo(76, 48);
    ctx.lineTo(57, 61);
    ctx.lineTo(63, 73);
    ctx.lineTo(56, 75);
    ctx.lineTo(48, 63);
    ctx.lineTo(39, 67);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(36, 74, 38, 4);

    // Bilingual Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Informasi Keberangkatan', 102, 53);
    ctx.fillStyle = '#bfdbfe';
    ctx.font = '500 19px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Departure Information', 102, 80);

    // Right Airport Branding
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Sultan Hasanuddin', 744, 52);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('International Airport', 744, 78);
    ctx.textAlign = 'left';

    // Subtle Gate Column Highlight Band (matching the reference layout)
    ctx.fillStyle = 'rgba(147, 197, 253, 0.13)';
    ctx.fillRect(528, 152, 54, 944);

    // Table Column Header Bar
    ctx.fillStyle = '#12304f';
    ctx.fillRect(0, 112, 768, 40);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('FLIGHT', 92, 138);
    ctx.fillText('TIME', 238, 138);
    ctx.fillText('DESTINATION', 324, 138);
    ctx.textAlign = 'center';
    ctx.fillText('GATE', 555, 138);
    ctx.fillText('REMARKS', 674, 138);
    ctx.textAlign = 'left';

    const drawRow = (row: FidsRow, y: number, idx: number) => {
      const rowH = 44;
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(15, 39, 68, 0.24)';
      ctx.fillRect(0, y, 768, rowH);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, y + rowH - 1, 768, 1);

      drawAirlinePill(row.airline, 14, y + 6, 98, 32);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 18px "IBM Plex Mono", monospace';
      ctx.fillText(row.flight, 124, y + 29);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 18px "IBM Plex Mono", monospace';
      ctx.fillText(row.time, 232, y + 29);

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 19px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(row.dest, 316, y + 29);

      if (row.hasPlaneIcon) {
        drawMiniPlaneIcon(478, y + 23);
      }

      if (row.gate) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 19px "IBM Plex Mono", monospace';
        ctx.fillText(row.gate, 555, y + 29);
        ctx.textAlign = 'left';
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = row.remarkColor;
      ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(row.remarks, 674, y + 29);
      ctx.textAlign = 'left';
    };

    // Active / Immediate Flights (rows 0..5)
    topFlights.forEach((f, idx) => drawRow(f, 154 + idx * 46, idx));

    // Mid-Table Divider Strip (matches reference)
    const divY = 154 + topFlights.length * 46 + 4;
    ctx.fillStyle = '#112a47';
    ctx.fillRect(0, divY, 768, 30);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 14px "IBM Plex Mono", monospace';
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    ctx.fillText(`JADWAL KEBERANGKATAN BERIKUTNYA · UPG MAKASSAR · ${hh}:${mm}:${ss} WITA`, 384, divY + 20);
    ctx.textAlign = 'left';

    // Scheduled Flights below divider
    const schedStartY = divY + 34;
    scheduledFlights.forEach((f, idx) => drawRow(f, schedStartY + idx * 46, idx));

    // Bottom Airport Footer Bar
    ctx.fillStyle = '#255282';
    ctx.fillRect(0, 1096, 768, 56);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('FIDS · Sultan Hasanuddin International Airport Makassar (UPG)', 24, 1130);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#bae6fd';
    ctx.font = '600 14px "IBM Plex Mono", monospace';
    ctx.fillText('INJOURNEY AIRPORTS · LIVE SYNC', 744, 1130);
    ctx.textAlign = 'left';

    tex.needsUpdate = true;
  };

  redraw(new Date());
  return { texture: tex, redraw };
}

export function createMasterClockTexture(maxAnisotropy: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 148;
  const ctx = canvas.getContext('2d')!;
  const tex = finalizeTexture(canvas, maxAnisotropy);

  // Authentic 7-segment LED dot-matrix digit bitmasks: [top, topR, botR, bot, botL, topL, mid]
  const SEGMENTS: Record<string, number[]> = {
    '0': [1, 1, 1, 1, 1, 1, 0],
    '1': [0, 1, 1, 0, 0, 0, 0],
    '2': [1, 1, 0, 1, 1, 0, 1],
    '3': [1, 1, 1, 1, 0, 0, 1],
    '4': [0, 1, 1, 0, 0, 1, 1],
    '5': [1, 0, 1, 1, 0, 1, 1],
    '6': [1, 0, 1, 1, 1, 1, 1],
    '7': [1, 1, 1, 0, 0, 0, 0],
    '8': [1, 1, 1, 1, 1, 1, 1],
    '9': [1, 1, 1, 1, 0, 1, 1],
  };

  const drawDotSegment = (x1: number, y1: number, x2: number, y2: number, lit: boolean, r: number) => {
    const dots = 4;
    for (let i = 0; i < dots; i++) {
      const t = (i + 0.5) / dots;
      const dx = x1 + (x2 - x1) * t;
      const dy = y1 + (y2 - y1) * t;
      if (lit) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.beginPath();
        ctx.arc(dx, dy, r * 1.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff3b30';
        ctx.beginPath();
        ctx.arc(dx, dy, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#1b0d10';
        ctx.beginPath();
        ctx.arc(dx, dy, r * 0.72, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const drawDigit = (ch: string, x: number, y: number, w: number, h: number, dotR: number) => {
    const mask = SEGMENTS[ch] ?? SEGMENTS['0'];
    const half = h / 2;
    const pad = dotR * 1.4;
    drawDotSegment(x + pad, y, x + w - pad, y, mask[0] === 1, dotR); // top
    drawDotSegment(x + w, y + pad, x + w, y + half - pad, mask[1] === 1, dotR); // topR
    drawDotSegment(x + w, y + half + pad, x + w, y + h - pad, mask[2] === 1, dotR); // botR
    drawDotSegment(x + pad, y + h, x + w - pad, y + h, mask[3] === 1, dotR); // bot
    drawDotSegment(x, y + half + pad, x, y + h - pad, mask[4] === 1, dotR); // botL
    drawDotSegment(x, y + pad, x, y + half - pad, mask[5] === 1, dotR); // topL
    drawDotSegment(x + pad, y + half, x + w - pad, y + half, mask[6] === 1, dotR); // mid
  };

  const redraw = (now: Date) => {
    ctx.fillStyle = '#07090e';
    ctx.fillRect(0, 0, 512, 148);

    // Subtle dark glass perimeter trim
    ctx.strokeStyle = '#181c24';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 506, 142);

    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    // Slight forward slant matching real LED digital slave clocks in airport FIDS kiosks
    ctx.save();
    ctx.transform(1, 0, -0.14, 1, 22, 0);

    // Hours HH
    drawDigit(hh[0], 26, 28, 52, 90, 4.1);
    drawDigit(hh[1], 100, 28, 52, 90, 4.1);

    // Colon :
    const colonLit = now.getSeconds() % 2 === 0;
    [54, 92].forEach((cy) => {
      ctx.fillStyle = colonLit ? 'rgba(239, 68, 68, 0.35)' : 'transparent';
      ctx.beginPath();
      ctx.arc(174, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colonLit ? '#ff3b30' : '#4a1216';
      ctx.beginPath();
      ctx.arc(174, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Minutes MM
    drawDigit(mm[0], 198, 28, 52, 90, 4.1);
    drawDigit(mm[1], 272, 28, 52, 90, 4.1);

    // Smaller Seconds SS on the right (matching 20:30 29 in reference)
    drawDigit(ss[0], 362, 46, 38, 68, 3.2);
    drawDigit(ss[1], 418, 46, 38, 68, 3.2);

    ctx.restore();
    tex.needsUpdate = true;
  };

  redraw(new Date());
  return { texture: tex, redraw };
}

export function createFidsRearPanelTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d')!;

  // Matte dark charcoal powder-coated steel back panel
  const grad = ctx.createLinearGradient(0, 0, 768, 1536);
  grad.addColorStop(0, '#272c34');
  grad.addColorStop(0.5, '#1e232a');
  grad.addColorStop(1, '#171b21');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 768, 1536);

  // Upper Rear Plate Seam & Perimeter Screws
  ctx.strokeStyle = '#0d1015';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, 720, 724);

  const screws: Array<[number, number]> = [
    [195, 38], [573, 38],
    [40, 210], [728, 210],
    [40, 480], [728, 480],
    [40, 728], [384, 734], [728, 728],
  ];
  screws.forEach(([sx, sy]) => {
    ctx.fillStyle = '#0b0e12';
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy);
    ctx.lineTo(sx + 3, sy);
    ctx.stroke();
  });

  // Center Silver/White Equipment Spec & Barcode Sticker (matching fids_rear.jpg)
  ctx.fillStyle = '#d1d5db';
  ctx.beginPath();
  ctx.roundRect(304, 412, 160, 96, 6);
  ctx.fill();
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#111827';
  ctx.font = '800 13px "IBM Plex Mono", monospace';
  ctx.fillText('ELBAN · FIDS 55P', 316, 430);
  ctx.font = '600 9px "IBM Plex Mono", monospace';
  ctx.fillText('MODEL : UPG-FIDS-K55', 316, 444);
  ctx.fillText('INPUT : 220-240V~ 50Hz', 316, 456);
  ctx.fillText('POWER : 185W   CE  ROHS', 316, 468);
  // Crisp Barcode Stripes
  for (let i = 0; i < 34; i++) {
    const bw = i % 3 === 0 ? 3 : 1.5;
    ctx.fillRect(318 + i * 3.8, 476, bw, 20);
  }

  // Center Square Lockable Media-Player Service Access Hatch
  ctx.strokeStyle = '#0b0e13';
  ctx.lineWidth = 4;
  ctx.strokeRect(256, 526, 256, 204);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(259, 529, 250, 198);

  // Flanking Left & Right Perforated Cooling Ventilation Grilles
  const drawVentGrid = (startX: number, startY: number) => {
    for (let r = 0; r < 18; r++) {
      for (let c = 0; c < 8; c++) {
        ctx.fillStyle = '#090c10';
        ctx.beginPath();
        ctx.arc(startX + c * 12, startY + r * 11, 3.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  drawVentGrid(134, 534);
  drawVentGrid(544, 534);

  // Lower Tall Rectangular Maintenance Access Door
  ctx.strokeStyle = '#0a0d12';
  ctx.lineWidth = 5;
  ctx.strokeRect(102, 754, 564, 742);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(106, 758, 556, 734);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createFidsInternalSwitchTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Industrial network switch aluminum/navy faceplate
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 124);

  // Left switch brand & status LEDs
  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 16px "IBM Plex Mono", monospace';
  ctx.fillText('FIDS LAN SWITCH', 14, 30);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11px "IBM Plex Mono", monospace';
  ctx.fillText('8-PORT GbE · NTP/AODB', 14, 48);

  // PWR + SYS LEDs
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(24, 76, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(24, 98, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '700 10px "IBM Plex Mono", monospace';
  ctx.fillText('PWR', 36, 80);
  ctx.fillText('LAN', 36, 102);

  // 8x RJ45 Ethernet Ports with active labels for P1 (UPLINK), P2 (FIDS), P3 (CLK)
  const labels = ['UP', 'MON', 'CLK', 'P4', 'P5', 'P6', 'P7', 'P8'];
  for (let i = 0; i < 8; i++) {
    const px = 176 + i * 40;
    const active = i < 3;
    ctx.fillStyle = active ? '#1e293b' : '#111827';
    ctx.fillRect(px, 44, 32, 42);
    ctx.strokeStyle = active ? '#60a5fa' : '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, 44, 32, 42);
    ctx.fillStyle = '#020617';
    ctx.fillRect(px + 4, 52, 24, 26);

    // Port LEDs
    ctx.fillStyle = active ? '#22c55e' : '#334155';
    ctx.fillRect(px + 4, 36, 9, 5);
    ctx.fillStyle = active ? '#facc15' : '#334155';
    ctx.fillRect(px + 19, 36, 9, 5);

    ctx.fillStyle = active ? '#f8fafc' : '#64748b';
    ctx.font = '700 10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], px + 16, 106);
  }
  ctx.textAlign = 'left';

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createBidsTexture(maxAnisotropy: number): {
  texture: THREE.CanvasTexture;
  redraw: (now?: Date) => void;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext('2d')!;
  const texture = finalizeTexture(canvas, maxAnisotropy);

  const drawLionAirBadge = (x: number, y: number, w: number, h: number) => {
    // Crisp white airline card
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, h);

    const cy = y + h * 0.55;
    // "Lion" bold italic red wordmark
    ctx.fillStyle = '#dc2626';
    ctx.font = 'italic 800 44px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Lion', x + 14, cy + 12);

    // Stylized red winged lion emblem in center
    const ex = x + w * 0.57;
    const ey = y + h * 0.5;
    ctx.save();
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#dc2626';
    // Wing feathers sweeping up-left
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(ex - 8 - i * 1.4, ey - 14 + i * 7, 16 - i * 1.5, 3.2, -0.58 + i * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
    // Lion head & mane silhouette
    ctx.beginPath();
    ctx.arc(ex + 6, ey - 10, 11, 0, Math.PI * 2);
    ctx.fill();
    // Lower tail swoosh
    ctx.beginPath();
    ctx.ellipse(ex + 2, ey + 14, 15, 7, -0.35, 0, Math.PI * 2);
    ctx.fill();
    // Negative white eye & wing separation lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(ex - 16, ey - 10 + i * 6);
      ctx.lineTo(ex + 1, ey - 4 + i * 5);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + 10, ey - 12, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // "air" italic red wordmark
    ctx.fillStyle = '#dc2626';
    ctx.font = 'italic 800 42px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('air', x + w - 70, cy + 12);
  };

  const drawSriwijayaBadge = (x: number, y: number, w: number, h: number) => {
    // White card base
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, h);

    // Crimson red left swooped panel + top/bottom thin borders
    const insetY = 20;
    const bandH = h - insetY * 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y + insetY, w, bandH);
    ctx.clip();

    // Red outer frame & swooped left emblem block
    ctx.fillStyle = '#c8102e';
    ctx.fillRect(x, y + insetY, w, bandH);

    // White curved right field for wordmark
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.44, y + insetY + 2);
    ctx.lineTo(x + w, y + insetY + 2);
    ctx.lineTo(x + w, y + insetY + bandH - 2);
    ctx.lineTo(x + w * 0.36, y + insetY + bandH - 2);
    ctx.quadraticCurveTo(x + w * 0.24, y + insetY + bandH * 0.5, x + w * 0.44, y + insetY + 2);
    ctx.closePath();
    ctx.fill();

    // Golden traditional Palembang knot emblem on red left field
    const gx = x + w * 0.16;
    const gy = y + h * 0.5;
    ctx.strokeStyle = '#f5c242';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(gx - 10, gy - 8, 12, 7, -0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(gx + 10, gy - 8, 12, 7, 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx, gy - 14);
    ctx.bezierCurveTo(gx - 14, gy + 4, gx + 14, gy + 10, gx, gy + 24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx, gy - 14);
    ctx.bezierCurveTo(gx + 14, gy + 4, gx - 14, gy + 10, gx, gy + 24);
    ctx.stroke();

    // Navy italic "Sriwijaya Air" wordmark + red/navy underlines
    ctx.fillStyle = '#1e2c6d';
    ctx.font = 'italic 800 24px Georgia, serif';
    ctx.fillText('Sriwijaya Air', x + w * 0.34, y + h * 0.5 + 3);

    ctx.fillStyle = '#c8102e';
    ctx.fillRect(x + w * 0.34, y + h * 0.5 + 9, w * 0.62, 2.2);
    ctx.fillStyle = '#1e2c6d';
    ctx.fillRect(x + w * 0.34, y + h * 0.5 + 13, w * 0.62, 1.8);

    ctx.fillStyle = '#1e2c6d';
    ctx.font = 'italic 700 11px Georgia, serif';
    ctx.fillText('Your Flying Partner', x + w * 0.53, y + h * 0.5 + 27);

    ctx.restore();
  };

  const redraw = (now = new Date()) => {
    // 1. Deep InJourney Maritime Teal-Navy Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1024, 576);
    bgGrad.addColorStop(0, '#0a2f44');
    bgGrad.addColorStop(1, '#0d364d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 576);

    // 2. Crisp Cyan-Blue Grid Dividers (exact layout of front.jpg)
    const splitX = 278;
    ctx.strokeStyle = '#2997d1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, 576);
    ctx.stroke();

    const rowY = [192, 374, 534];
    rowY.forEach((ry) => {
      ctx.beginPath();
      ctx.moveTo(splitX, ry);
      ctx.lineTo(1024, ry);
      ctx.stroke();
    });

    // 3. LEFT SIDEBAR: InJourney Airports Logo + Belt 7 + Date & Live Clock
    // "injourney" wordmark with colorful segmented ring "o"
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '400 32px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('inj  urney', splitX * 0.5, 62);
    // Colorful segmented "o" circle inside "injourney"
    const ox = splitX * 0.5 - 26;
    const oy = 53;
    const segs: Array<[number, number, string]> = [
      [-Math.PI * 0.7, Math.PI * 0.05, '#22c55e'],
      [Math.PI * 0.05, Math.PI * 0.75, '#38bdf8'],
      [Math.PI * 0.75, Math.PI * 1.3, '#f59e0b'],
    ];
    segs.forEach(([a0, a1, col]) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(ox, oy, 8.5, a0, a1);
      ctx.stroke();
    });

    // "A I R P O R T S" cyan spaced subtitle
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('A  I  R  P  O  R  T  S', splitX * 0.5, 88);

    // "Belt" + HUGE bold amber "7"
    ctx.fillStyle = '#f59e0b';
    ctx.font = '700 44px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Belt', splitX * 0.5, 224);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '700 124px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('7', splitX * 0.5, 336);

    // Bottom Date & Live 24h Clock
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${days[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(dateStr, splitX * 0.5, 480);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 62px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(timeStr, splitX * 0.5, 542);
    ctx.textAlign = 'left';

    // 4. RIGHT PANEL: 3 Authentic Flight Baggage Rows (Ternate JT-897, Surabaya JT-780, Jayapura SJ-702)
    const flights = [
      {
        airline: 'lion' as const,
        city: 'Ternate',
        code: 'JT-897',
        status: 'Landing 13:25',
        statusColor: '#22c55e',
        top: 14,
        rowH: 178,
      },
      {
        airline: 'lion' as const,
        city: 'Surabaya',
        code: 'JT-780',
        status: 'Estimate 14:48',
        statusColor: '#f59e0b',
        top: 196,
        rowH: 178,
      },
      {
        airline: 'sriwijaya' as const,
        city: 'Jayapura',
        code: 'SJ-702',
        status: 'Estimate 15:59',
        statusColor: '#f59e0b',
        top: 378,
        rowH: 154,
      },
    ];

    flights.forEach((f) => {
      const cardX = splitX + 18;
      const cardY = f.top + 14;
      const cardW = 248;
      const cardH = f.rowH - 28;

      if (f.airline === 'lion') {
        drawLionAirBadge(cardX, cardY, cardW, cardH);
      } else {
        drawSriwijayaBadge(cardX, cardY, cardW, cardH);
      }

      const textX = cardX + cardW + 22;
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 32px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(f.city, textX, cardY + 42);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 32px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(f.code, textX, cardY + 86);

      ctx.fillStyle = f.statusColor;
      ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(f.status, textX, cardY + 128);
    });

    texture.needsUpdate = true;
  };

  redraw();
  return { texture, redraw };
}

export function createBidsRearPanelTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext('2d')!;

  // Matte charcoal industrial rear housing
  const bg = ctx.createLinearGradient(0, 0, 0, 576);
  bg.addColorStop(0, '#272a2f');
  bg.addColorStop(0.5, '#222529');
  bg.addColorStop(1, '#1c1f23');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 576);

  // Outer perimeter chassis seam & recessed screw bosses (matching rear.jpg)
  ctx.strokeStyle = '#121417';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 1004, 556);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, 980, 532);

  // Perimeter Phillips screw dots
  const drawScrew = (sx: number, sy: number) => {
    ctx.fillStyle = '#101215';
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3f444c';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  };
  [38, 190, 355, 669, 834, 986].forEach((x) => {
    drawScrew(x, 22);
    drawScrew(x, 554);
  });
  [120, 288, 456].forEach((y) => {
    drawScrew(22, y);
    drawScrew(1002, y);
  });

  // Stepped trapezoidal chamfered inner electronics housing outline
  ctx.strokeStyle = '#15181c';
  ctx.lineWidth = 4;
  ctx.strokeRect(98, 96, 828, 384);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(102, 100, 820, 376);

  // Diagonal mold draft lines from corners to stepped body
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 2.5;
  [
    [22, 22, 98, 96],
    [1002, 22, 926, 96],
    [22, 554, 98, 480],
    [1002, 554, 926, 480],
  ].forEach(([x0, y0, x1, y1]) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  });

  // Helper for authentic industrial ventilation perforation clusters
  const drawVentBlock = (x: number, y: number, cols: number, rows: number, dx = 8.5, dy = 9) => {
    ctx.fillStyle = '#0d0f12';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillRect(x + c * dx, y + r * dy, 4.5, 4.5);
      }
    }
  };
  // Far left & far right vertical chamfer vents
  drawVentBlock(48, 128, 4, 15, 7.5, 7.5);
  drawVentBlock(946, 128, 4, 15, 7.5, 7.5);
  // Upper-left dual horizontal vent banks
  drawVentBlock(212, 46, 16, 5, 8.2, 8.2);
  drawVentBlock(212, 114, 16, 6, 8.2, 8.2);
  // Upper-right dual horizontal vent banks
  drawVentBlock(684, 46, 16, 5, 8.2, 8.2);
  drawVentBlock(684, 114, 16, 6, 8.2, 8.2);
  // Lower-right horizontal vent bank
  drawVentBlock(686, 404, 16, 5, 8.2, 8.2);

  // Center Technical Spec & Barcode Compliance Nameplate Sticker (matching rear.jpg)
  const lx = 446;
  const ly = 248;
  const lw = 132;
  const lh = 76;
  ctx.fillStyle = '#252930';
  ctx.fillRect(lx, ly, lw, lh);
  ctx.strokeStyle = '#3c424d';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(lx, ly, lw, lh);

  // Top-right white barcode box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(lx + 62, ly + 5, 64, 15);
  ctx.fillStyle = '#0f172a';
  for (let i = 0; i < 20; i++) {
    ctx.fillRect(lx + 66 + i * 2.9, ly + 7, i % 3 === 0 ? 1.8 : 1.0, 10);
  }
  // Left micro-spec lines
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 6px "IBM Plex Mono", monospace';
  ctx.fillText('MODEL: BIDS-55L-UPG', lx + 5, ly + 14);
  ctx.fillText('POWER: 100-240V~ 50/60Hz', lx + 5, ly + 23);
  ctx.fillText('INPUT: HDMI · LAN · USB', lx + 5, ly + 32);
  ctx.fillText('INJOURNEY AIRPORTS', lx + 5, ly + 41);

  // CE & FC logos
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 13px sans-serif';
  ctx.fillText('CE  FC', lx + 78, ly + 37);

  // Lower-left serial barcode
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(lx + 6, ly + 48, 62, 15);
  ctx.fillStyle = '#0f172a';
  for (let i = 0; i < 18; i++) {
    ctx.fillRect(lx + 9 + i * 3.1, ly + 50, i % 2 === 0 ? 1.6 : 1.0, 10);
  }
  // Compliance icons bottom-right (double square + WEEE)
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(lx + 78, ly + 48, 12, 12);
  ctx.strokeRect(lx + 81, ly + 51, 6, 6);
  ctx.strokeRect(lx + 100, ly + 48, 12, 13);
  ctx.beginPath();
  ctx.moveTo(lx + 98, ly + 47);
  ctx.lineTo(lx + 114, ly + 62);
  ctx.moveTo(lx + 114, ly + 47);
  ctx.lineTo(lx + 98, ly + 62);
  ctx.stroke();

  // Lower-left Recessed I/O Connector Bay Shroud Graphic
  ctx.fillStyle = '#15181c';
  ctx.fillRect(224, 330, 224, 146);
  ctx.strokeStyle = '#2d323a';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(224, 330, 224, 146);
  // Upper connector bay port shelf header
  ctx.fillStyle = '#1e2228';
  ctx.fillRect(228, 334, 216, 40);
  ctx.fillStyle = '#64748b';
  ctx.font = '700 9px "IBM Plex Mono", monospace';
  ctx.fillText('AC IN', 248, 366);
  ctx.fillText('HDMI', 302, 366);
  ctx.fillText('LAN RJ45', 344, 366);
  ctx.fillText('USB', 410, 366);

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

// =========================================================================
// AUTHENTIC BOSCH PRAESENSA / PRAESIDEO PAS PAGING & 42U RACK TEXTURES
// =========================================================================

export function createBoschPagingScreenTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Matte graphite faceplate surround
  ctx.fillStyle = '#2d3136';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle brushed silver perimeter border
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 502, 502);

  // Upper perforated monitor speaker vent grid (left & right of mic base collar)
  ctx.fillStyle = '#111418';
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 13; c++) {
      ctx.beginPath();
      ctx.arc(38 + c * 12.5, 34 + r * 11, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(320 + c * 12.5, 34 + r * 11, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Glossy black flush glass bezel around touchscreen
  ctx.fillStyle = '#0c0f13';
  ctx.beginPath();
  ctx.roundRect(36, 128, 440, 260, 12);
  ctx.fill();

  // Green Power LED & Fault triangle icon (top-left of glass bezel)
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(70, 152, 7.5, -Math.PI * 0.25, Math.PI * 1.25);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(70, 142);
  ctx.lineTo(70, 152);
  ctx.stroke();

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, 144);
  ctx.lineTo(104, 158);
  ctx.lineTo(88, 158);
  ctx.closePath();
  ctx.stroke();

  // Centered BOSCH logo above touchscreen
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(216, 152, 8.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(212, 146, 2.5, 12);
  ctx.fillRect(218, 146, 2.5, 12);
  ctx.fillRect(212, 151, 8, 2.2);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('BOSCH', 232, 158);

  // Bright Sky-Blue Capacitive Touchscreen Display ("Music" & "Fault log")
  const lcdX = 62;
  const lcdY = 178;
  const lcdW = 388;
  const lcdH = 186;
  const lcdGrad = ctx.createLinearGradient(lcdX, lcdY, lcdX, lcdY + lcdH);
  lcdGrad.addColorStop(0, '#0ea5e9');
  lcdGrad.addColorStop(0.22, '#0284c7');
  lcdGrad.addColorStop(0.55, '#0369a1');
  lcdGrad.addColorStop(1, '#0284c7');
  ctx.fillStyle = lcdGrad;
  ctx.fillRect(lcdX, lcdY, lcdW, lcdH);

  // Top translucent status bar gloss
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(lcdX, lcdY, lcdW, 24);

  // Two glass UI tiles: "Music" & "Fault log"
  const drawTile = (tx: number, title: string, icon: 'music' | 'fault') => {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(tx, lcdY + 34, 166, 122, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    if (icon === 'music') {
      // Musical note icon
      ctx.fillRect(tx + 72, lcdY + 56, 4, 34);
      ctx.fillRect(tx + 92, lcdY + 52, 4, 34);
      ctx.fillRect(tx + 72, lcdY + 52, 24, 6);
      ctx.beginPath();
      ctx.ellipse(tx + 69, lcdY + 90, 6.5, 4.5, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(tx + 89, lcdY + 86, 6.5, 4.5, -0.25, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Warning triangle icon
      ctx.beginPath();
      ctx.moveTo(tx + 83, lcdY + 52);
      ctx.lineTo(tx + 104, lcdY + 90);
      ctx.lineTo(tx + 62, lcdY + 90);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(tx + 81, lcdY + 65, 4, 13);
      ctx.beginPath();
      ctx.arc(tx + 83, lcdY + 83, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, tx + 83, lcdY + 132);
    ctx.textAlign = 'left';
  };
  drawTile(lcdX + 22, 'Music', 'music');
  drawTile(lcdX + 200, 'Fault log', 'fault');

  // 3 Pagination dots at bottom center of LCD
  [0, 1, 2].forEach((i) => {
    ctx.fillStyle = i === 1 ? '#ffffff' : 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(lcdX + lcdW / 2 - 16 + i * 16, lcdY + lcdH - 12, 3.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // Bottom PTT Talk Button Graphic (surrounded by 3D silver bezel)
  ctx.fillStyle = '#181c21';
  ctx.beginPath();
  ctx.roundRect(142, 424, 228, 52, 8);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.stroke();

  // White speaking person icon on PTT button
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(262, 444, 6.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(262, 464, 12, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  // Sound waves left of speaking icon
  ctx.beginPath();
  ctx.arc(248, 446, 6, Math.PI * 0.72, Math.PI * 1.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(248, 446, 11, Math.PI * 0.75, Math.PI * 1.25);
  ctx.stroke();

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createBoschPagingKeypadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Matte graphite faceplate + silver trim border
  ctx.fillStyle = '#2a2e33';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 502, 502);

  // Dark inner key matrix bed
  ctx.fillStyle = '#191c20';
  ctx.beginPath();
  ctx.roundRect(26, 26, 460, 460, 10);
  ctx.fill();

  // Header & divider grey strips
  ctx.fillStyle = '#3f444c';
  ctx.fillRect(42, 44, 428, 30);
  ctx.fillRect(42, 232, 428, 30);

  // White label strip helper
  const drawLabelStrip = (cx: number, y: number, lines: string[]) => {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(cx - 56, y, 112, 32);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 56, y, 112, 32);

    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    if (lines.length === 1) {
      ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(lines[0], cx, y + 20);
    } else {
      ctx.font = '700 9px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(lines[0], cx, y + 13);
      ctx.fillText(lines[1], cx, y + 25);
    }
    ctx.textAlign = 'left';
  };

  // Status LED + small warning triangle next to each key column
  const cols = [116, 256, 396];
  const indicatorRows = [104, 198, 294, 392];
  indicatorRows.forEach((ry) => {
    cols.forEach((cx) => {
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx + 58, ry - 8, 9, 4);
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(cx + 62, ry + 2);
      ctx.lineTo(cx + 67, ry + 11);
      ctx.lineTo(cx + 57, ry + 11);
      ctx.closePath();
      ctx.fill();
    });
  });

  // Row 1 labels (under 3 red emergency/confirm keys)
  drawLabelStrip(cols[0], 138, ['ZONE CN1']);
  drawLabelStrip(cols[1], 138, ['ZONE CN2']);
  drawLabelStrip(cols[2], 138, ['ZONE CN3']);

  // Row 3 labels (under Departure/Arrival zone buttons)
  drawLabelStrip(cols[0], 328, ['DEPARTURE', 'INTERNATIONAL']);
  drawLabelStrip(cols[1], 328, ['ARRIVAL', 'INTERNATIONAL']);
  drawLabelStrip(cols[2], 328, ['DEPARTURE', 'DOMESTIC']);

  // Row 4 labels (bottom public area & zone buttons)
  drawLabelStrip(cols[0], 426, ['ARRIVAL DOMESTIC']);
  drawLabelStrip(cols[1], 426, ['ALL PUBLIC AREA']);
  drawLabelStrip(cols[2], 426, ['ZONE 6']);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createBoschPagingRearTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2b2f35';
  ctx.fillRect(0, 0, 512, 256);

  // Upper circular cooling perforations left & right of spec label
  ctx.fillStyle = '#0f1216';
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 10; c++) {
      ctx.beginPath();
      ctx.arc(54 + c * 11, 34 + r * 11, 3.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(356 + c * 11, 34 + r * 11, 3.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // White BOSCH Product Compliance & Barcode Sticker (matching paging_rear.jpg)
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.roundRect(182, 24, 148, 92, 6);
  ctx.fill();
  ctx.fillStyle = '#1e293b';
  ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('BOSCH', 206, 44);
  ctx.font = '600 9px "IBM Plex Mono", monospace';
  ctx.fillText('PRA-CSLD · CALL STATION', 190, 58);
  ctx.fillText('OMNEO PoE · 24-48V DC', 190, 69);
  ctx.font = '700 13px sans-serif';
  ctx.fillText('CE', 284, 66);
  // Barcode bars
  ctx.fillStyle = '#0f172a';
  for (let i = 0; i < 34; i++) {
    ctx.fillRect(190 + i * 3.1, 80, i % 3 === 0 ? 2 : 1.1, 20);
  }

  // Recessed lower connector bay graphic
  ctx.fillStyle = '#181b20';
  ctx.beginPath();
  ctx.roundRect(42, 134, 428, 102, 8);
  ctx.fill();
  ctx.strokeStyle = '#3b4048';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 10px "IBM Plex Mono", monospace';
  ctx.fillText('PWR', 78, 162);
  ctx.fillText('ETH 1', 142, 162);
  ctx.fillText('ETH 2', 202, 162);
  ctx.fillText('Audio', 260, 162);
  ctx.fillText('HP', 306, 162);
  ctx.fillText('XLR', 354, 162);
  ctx.fillText('COM', 416, 162);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createBoschRackControllerTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  // Dark charcoal Bosch Network Controller faceplate (matching top of rack_front.jpg)
  ctx.fillStyle = '#252a30';
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#111418';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 506, 154);

  // Left & right dark perforated intake grille panels
  ctx.fillStyle = '#13161a';
  ctx.beginPath();
  ctx.roundRect(14, 16, 56, 128, 8);
  ctx.roundRect(442, 16, 56, 128, 8);
  ctx.fill();
  ctx.fillStyle = '#07090b';
  for (let y = 26; y < 138; y += 8) {
    for (let x = 22; x < 64; x += 8) {
      ctx.fillRect(x, y, 4, 4);
      ctx.fillRect(x + 428, y, 4, 4);
    }
  }

  // Iconic centered brushed-silver pill bezel surrounding LCD + rotary knob
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.roundRect(148, 30, 216, 74, 37);
  ctx.fill();
  ctx.fillStyle = '#1b1f24';
  ctx.beginPath();
  ctx.roundRect(156, 37, 200, 60, 30);
  ctx.fill();

  // Lime-green backlit character LCD window
  ctx.fillStyle = '#84cc16';
  ctx.fillRect(178, 49, 124, 36);
  ctx.fillStyle = '#1a2e05';
  ctx.font = '700 13px "IBM Plex Mono", monospace';
  ctx.fillText('PRAESIDEO NCO', 184, 65);
  ctx.font = '600 11px "IBM Plex Mono", monospace';
  ctx.fillText('PAS ONLINE · OK', 184, 80);

  // Silver rotary navigation encoder dial right of LCD
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(328, 67, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(328, 67, 11, 0, Math.PI * 2);
  ctx.fill();

  // Green power status LED right of bezel
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(392, 67, 5, 0, Math.PI * 2);
  ctx.fill();

  // Bottom centered BOSCH logo
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('(H)  BOSCH', 256, 134);
  ctx.textAlign = 'left';

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createBoschRackSwitchTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;

  // Brushed silver 1U managed OMNEO Ethernet switch (matching rack_front.jpg U39)
  const grad = ctx.createLinearGradient(0, 0, 0, 80);
  grad.addColorStop(0, '#e2e8f0');
  grad.addColorStop(0.5, '#cbd5e1');
  grad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 80);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 508, 76);

  // Left switch label & status LEDs
  ctx.fillStyle = '#1e293b';
  ctx.font = '800 13px "IBM Plex Mono", monospace';
  ctx.fillText('OMNEO GbE SWITCH', 18, 34);
  ctx.fillStyle = '#475569';
  ctx.font = '600 10px "IBM Plex Mono", monospace';
  ctx.fillText('24P PoE+ · 4x SFP', 18, 52);

  // 2x12 RJ45 port blocks + 4 SFP cages on right
  for (let b = 0; b < 2; b++) {
    const bx = 190 + b * 116;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bx, 14, 106, 52);
    for (let c = 0; c < 6; c++) {
      for (let r = 0; r < 2; r++) {
        ctx.fillStyle = b === 1 && c >= 2 ? '#0284c7' : '#1e293b';
        ctx.fillRect(bx + 5 + c * 16.5, 19 + r * 22, 13, 17);
        ctx.fillStyle = b === 1 ? '#22c55e' : '#facc15';
        ctx.fillRect(bx + 6 + c * 16.5, 16 + r * 22, 5, 2.5);
      }
    }
  }
  // 4x SFP fiber slots far right
  for (let s = 0; s < 4; s++) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(426 + s * 20, 20, 16, 40);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(428 + s * 20, 24, 12, 10);
  }

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createBoschAmpFrontTexture(maxAnisotropy: number, is2U = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = is2U ? 128 : 72;
  const ctx = canvas.getContext('2d')!;

  // Sleek matte-black BOSCH PRAESENSA/PRAESIDEO amplifier front panel
  ctx.fillStyle = '#15181d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Thin silver top/bottom contour accent line
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, canvas.width, 3);
  ctx.fillRect(0, canvas.height - 3, canvas.width, 3);

  // Small white asset label sticker on upper-left (exact detail from rack_front.jpg)
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(44, is2U ? 16 : 10, 48, is2U ? 16 : 11);
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 8px "IBM Plex Mono", monospace';
  ctx.fillText(is2U ? 'AMP-BKP' : 'AMP-100V', 47, is2U ? 27 : 18);

  // Centered white BOSCH wordmark
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `800 ${is2U ? 16 : 13}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('BOSCH', 256, is2U ? 30 : 22);
  ctx.textAlign = 'left';

  // Glowing emerald green channel/power status LEDs left & right (matching rack_front.jpg)
  const ledY = is2U ? 82 : 46;
  [54, 68, 82, 96, 110, 326, 352, 412, 444].forEach((lx, idx) => {
    ctx.fillStyle = idx === 7 ? '#38bdf8' : '#22c55e';
    ctx.beginPath();
    ctx.arc(lx, ledY, is2U ? 4.2 : 3.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Subtle vent louvers along bottom edge
  ctx.fillStyle = '#090b0e';
  for (let x = 140; x < 310; x += 10) {
    ctx.fillRect(x, canvas.height - 14, 6, 6);
  }

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createBoschAmpRearTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 72;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#181c22';
  ctx.fillRect(0, 0, 512, 72);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 508, 68);

  // 4 Iconic Bright Mint-Green Phoenix Euroblock 100V Output Terminal Blocks (matching rack_rear.webp!)
  [58, 168, 286, 386].forEach((px) => {
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(px, 22, 56, 28);
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, 22, 56, 28);
    ctx.fillStyle = '#14532d';
    for (let s = 0; s < 6; s++) {
      ctx.fillRect(px + 5 + s * 8.5, 29, 4.5, 14);
    }
  });

  // Dual RJ45 OMNEO ports on far right rear
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(460, 20, 18, 28);
  ctx.fillRect(482, 20, 18, 28);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(462, 16, 6, 3);
  ctx.fillRect(484, 16, 6, 3);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createBoschDeltaPsuTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // White upper housing + iconic vivid Delta sky-blue lower face (matching rack_front.jpg lower bay!)
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, 192, 140);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 140, 192, 116);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('DELTA', 22, 42);
  ctx.fillStyle = '#475569';
  ctx.font = '600 12px "IBM Plex Mono", monospace';
  ctx.fillText('CliQ 48V DC', 22, 66);
  ctx.fillText('DIN-RAIL PSU', 22, 86);

  // Cooling vent slots & green DC OK LED
  ctx.fillStyle = '#1e293b';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(18 + i * 26, 102, 14, 24);
  }
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(154, 42, 8, 0, Math.PI * 2);
  ctx.fill();

  // White terminal labels on blue lower cover
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 14px "IBM Plex Mono", monospace';
  ctx.fillText('+V  -V  DC OK', 22, 186);
  ctx.fillStyle = '#0369a1';
  ctx.fillRect(16, 206, 160, 32);

  return finalizeTexture(canvas, maxAnisotropy);
}




import * as THREE from 'three';
import {
  DeviceDissectionBlueprint,
  DissectionPartSpec,
  DissectionPartTelemetry,
  DissectionSimParams,
} from '../data/deviceDissectionData';

export interface BuiltDissectionPart {
  spec: DissectionPartSpec;
  group: THREE.Group;
  basePos: THREE.Vector3;
  meshes: THREE.Mesh[];
  originalMaterials: Map<THREE.Mesh, { opacity: number; transparent: boolean; wireframe: boolean; depthWrite: boolean }>;
}

export interface DissectionSignalStream {
  curve: THREE.CatmullRomCurve3;
  tube: THREE.Mesh;
  packets: THREE.Mesh[];
  phaseOffsets: number[];
  speed: number;
}

export interface CeilingSpeakerAnimHandle {
  inputGroup: THREE.Group;
  inputSparks: THREE.Mesh[];
  outputGroup: THREE.Group;
  waveRibbons: THREE.Mesh[];
  waveRings: THREE.Mesh[];
  voiceCoilPart: BuiltDissectionPart;
  conePart: BuiltDissectionPart;
  trafoPart: BuiltDissectionPart;
  grillePart: BuiltDissectionPart;
  spiderPart: BuiltDissectionPart;
}

export interface ColumnSpeakerAnimHandle {
  tweeterPart: BuiltDissectionPart;
  fullRangePart: BuiltDissectionPart;
  grillePart: BuiltDissectionPart;
  waveGroup: THREE.Group;
  waveArcs: THREE.Mesh[];
}

export interface BuiltDissectionModel {
  root: THREE.Group;
  parts: BuiltDissectionPart[];
  partMap: Record<string, BuiltDissectionPart>;
  wiresGroup: THREE.Group;
  streams: DissectionSignalStream[];
  ceilingAnim?: CeilingSpeakerAnimHandle;
  columnAnim?: ColumnSpeakerAnimHandle;
  dispose: () => void;
}

const _tmpVec = new THREE.Vector3();

function makeCanvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  anisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

function makePcbTexture(label: string, accent = '#38bdf8', anisotropy = 4): THREE.CanvasTexture {
  return makeCanvasTexture(
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#0f4c3a';
      ctx.fillRect(0, 0, w, h);
      // Copper PCB traces
      ctx.strokeStyle = '#1f7a5c';
      ctx.lineWidth = 3;
      for (let i = 24; i < w; i += 28) {
        ctx.beginPath();
        ctx.moveTo(i, 16);
        ctx.lineTo(i, h * 0.42);
        ctx.lineTo(i + 18, h * 0.52);
        ctx.lineTo(i + 18, h - 16);
        ctx.stroke();
      }
      // Gold via pads
      ctx.fillStyle = '#eab308';
      for (let y = 36; y < h - 20; y += 44) {
        for (let x = 32; x < w - 20; x += 56) {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Silkscreen label
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.strokeRect(18, 18, w - 36, h - 36);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 26px monospace';
      ctx.fillText(label, 34, 62);
      ctx.font = '18px monospace';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('ELBAN INDUSTRIAL PCB · REV 4.2', 34, h - 34);
    },
    anisotropy
  );
}

function makePerforatedGrilleTexture(anisotropy = 4): THREE.CanvasTexture {
  return makeCanvasTexture(
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#334155';
      const step = 18;
      for (let y = 12; y < h; y += step) {
        for (let x = 12; x < w; x += step) {
          const dx = x - w / 2;
          const dy = y - h / 2;
          if (Math.hypot(dx, dy) < w * 0.42) {
            ctx.beginPath();
            ctx.arc(x, y, 4.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * 0.45, 0, Math.PI * 2);
      ctx.stroke();
    },
    anisotropy
  );
}

function makeDarkPerforatedGrilleTexture(anisotropy = 4): THREE.CanvasTexture {
  return makeCanvasTexture(
    512,
    512,
    (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.42, h * 0.38, 24, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0, '#475569');
      grad.addColorStop(0.65, '#334155');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Dense honeycomb acoustic perforation dots
      const stepX = 14;
      const stepY = 12.2;
      let row = 0;
      for (let y = 14; y < h - 10; y += stepY) {
        const offsetX = (row % 2) * (stepX * 0.5);
        for (let x = 14 + offsetX; x < w - 10; x += stepX) {
          const dist = Math.hypot(x - w / 2, y - h / 2);
          if (dist < w * 0.43) {
            ctx.fillStyle = '#020617';
            ctx.beginPath();
            ctx.arc(x, y, 3.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(148,163,184,0.35)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
        row++;
      }

      // Outer brushed metallic bezel ring
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * 0.435, 0, Math.PI * 2);
      ctx.stroke();
    },
    anisotropy
  );
}

function makeCopperWindingTexture(anisotropy = 4): THREE.CanvasTexture {
  const tex = makeCanvasTexture(
    256,
    512,
    (ctx, w, h) => {
      const bg = ctx.createLinearGradient(0, 0, w, 0);
      bg.addColorStop(0, '#92400e');
      bg.addColorStop(0.35, '#d97706');
      bg.addColorStop(0.55, '#fbbf24');
      bg.addColorStop(0.8, '#b45309');
      bg.addColorStop(1, '#78350f');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Fine dense horizontal enameled copper coil turns
      for (let y = 0; y < h; y += 6) {
        ctx.fillStyle = 'rgba(69, 26, 3, 0.55)';
        ctx.fillRect(0, y, w, 2);
        ctx.fillStyle = 'rgba(254, 240, 138, 0.42)';
        ctx.fillRect(0, y + 2, w, 1.5);
      }
    },
    anisotropy
  );
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeSpiderTexture(anisotropy = 4): THREE.CanvasTexture {
  const tex = makeCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(0, 0, w, h);
      // Fine woven phenolic cloth mesh
      ctx.strokeStyle = 'rgba(113, 63, 18, 0.35)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < w; i += 6) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(w, i);
        ctx.stroke();
      }
      // Subtle golden ridges for concentric corrugations
      for (let y = 0; y < h; y += 26) {
        const rg = ctx.createLinearGradient(0, y, 0, y + 26);
        rg.addColorStop(0, 'rgba(254, 240, 138, 0.32)');
        rg.addColorStop(0.5, 'rgba(161, 98, 7, 0.25)');
        rg.addColorStop(1, 'rgba(254, 240, 138, 0.32)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, y, w, 26);
      }
    },
    anisotropy
  );
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeWhitePerforatedGrilleTexture(anisotropy = 4): THREE.CanvasTexture {
  return makeCanvasTexture(
    512,
    1024,
    (ctx, w, h) => {
      // Satin anodized white-silver metallic surface
      const bg = ctx.createLinearGradient(0, 0, w, 0);
      bg.addColorStop(0, '#d6dce3');
      bg.addColorStop(0.25, '#f1f5f9');
      bg.addColorStop(0.5, '#f8fafc');
      bg.addColorStop(0.75, '#e2e8f0');
      bg.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Dense staggered hexagonal acoustic perforations
      const stepX = 11;
      const stepY = 9.5;
      let row = 0;
      for (let y = 26; y < h - 26; y += stepY) {
        const offsetX = (row % 2) * (stepX * 0.5);
        for (let x = 22 + offsetX; x < w - 22; x += stepX) {
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.arc(x, y, 3.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(x + 0.4, y + 0.4, 2.3, 0, Math.PI * 2);
          ctx.fill();
        }
        row++;
      }

      // Clean metallic edge border
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 18;
      ctx.strokeRect(9, 9, w - 18, h - 18);

      // Subtle bottom brand badge (ELBAN PAS)
      const bw = 148;
      const bh = 38;
      const bx = (w - bw) / 2;
      const by = h - 122;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ELBAN · PAS', w / 2, by + bh / 2 + 1);
    },
    anisotropy
  );
}

function makeAcousticWoolTexture(anisotropy = 4): THREE.CanvasTexture {
  const tex = makeCanvasTexture(
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(0, 0, w, h);

      // Soft cloudy cotton/polyester fiber depth
      for (let i = 0; i < 160; i++) {
        const cx = ((i * 73) % w);
        const cy = ((i * 137) % h);
        const r = 24 + ((i * 29) % 44);
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
        const bright = i % 2 === 0;
        g.addColorStop(0, bright ? 'rgba(255,255,255,0.45)' : 'rgba(148,163,184,0.22)');
        g.addColorStop(1, 'rgba(226,232,240,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fine overlapping synthetic wool fibers
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 650; i++) {
        const x1 = ((i * 97) % w);
        const y1 = ((i * 151) % h);
        const ang = (i * 1.7) % (Math.PI * 2);
        const len = 14 + (i % 24);
        ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(148,163,184,0.28)';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(
          x1 + Math.cos(ang + 0.4) * len * 0.5,
          y1 + Math.sin(ang + 0.4) * len * 0.5,
          x1 + Math.cos(ang) * len,
          y1 + Math.sin(ang) * len
        );
        ctx.stroke();
      }
    },
    anisotropy
  );
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeTrafoTapeTexture(anisotropy = 4): THREE.CanvasTexture {
  const tex = makeCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#facc15');
      bg.addColorStop(0.4, '#fde047');
      bg.addColorStop(0.75, '#eab308');
      bg.addColorStop(1, '#ca8a04');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Subtle overlapping Kapton/Mylar insulation tape bands
      for (let y = 0; y < h; y += 22) {
        ctx.fillStyle = 'rgba(161, 98, 7, 0.22)';
        ctx.fillRect(0, y, w, 2);
        ctx.fillStyle = 'rgba(254, 249, 195, 0.35)';
        ctx.fillRect(0, y + 2, w, 3);
      }
    },
    anisotropy
  );
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeLaminatedSteelTexture(anisotropy = 4): THREE.CanvasTexture {
  const tex = makeCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      const bg = ctx.createLinearGradient(0, 0, w, 0);
      bg.addColorStop(0, '#94a3b8');
      bg.addColorStop(0.5, '#cbd5e1');
      bg.addColorStop(1, '#64748b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Crisp stacked silicon-steel E-I lamination sheets
      for (let x = 0; x < w; x += 6) {
        ctx.fillStyle = 'rgba(30, 41, 59, 0.36)';
        ctx.fillRect(x, 0, 1.5, h);
        ctx.fillStyle = 'rgba(248, 250, 252, 0.3)';
        ctx.fillRect(x + 2, 0, 1.2, h);
      }
    },
    anisotropy
  );
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeScreenTexture(
  kind: 'fids' | 'bids' | 'clock' | 'paging' | 'bosch_lcd',
  anisotropy = 4
): THREE.CanvasTexture {
  return makeCanvasTexture(
    512,
    kind === 'fids' ? 768 : 256,
    (ctx, w, h) => {
      if (kind === 'clock') {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 8;
        ctx.strokeRect(8, 8, w - 16, h - 16);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 116px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('14:28:09', w / 2, h / 2 + 6);
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('GPS LOCK · NTP STRATUM-1 · UTC+7', w / 2, 34);
      } else if (kind === 'bosch_lcd') {
        ctx.fillStyle = '#052e16';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 34px monospace';
        ctx.fillText('BOSCH PRAESENSA', 24, 58);
        ctx.font = '24px monospace';
        ctx.fillText('OMNEO: LINK OK  |  100V BUS: 100.0V', 24, 118);
        ctx.fillText('ZONES: ALL READY |  FAULT LOG: 0', 24, 168);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('PSU DELTA 48V: 6/6 NORMAL', 24, 218);
      } else if (kind === 'paging') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, 0, w, 52);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('BOSCH Call Station · Zone Control', 20, 34);
        const cols = ['#1e293b', '#0369a1', '#1e293b', '#15803d'];
        const labels = ['BGM Music', 'Concourse', 'Boarding', 'All Ready'];
        labels.forEach((lbl, idx) => {
          const x = 18 + (idx % 2) * 242;
          const y = 70 + Math.floor(idx / 2) * 82;
          ctx.fillStyle = cols[idx];
          ctx.fillRect(x, y, 226, 68);
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText(lbl, x + 16, y + 42);
        });
      } else if (kind === 'bids') {
        ctx.fillStyle = '#0b192c';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(0, 0, w, 56);
        ctx.fillStyle = '#0b192c';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('BAGGAGE CLAIM · BELT 7', 20, 38);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('JT-897  MAKASSAR     DELIVERING', 20, 108);
        ctx.fillStyle = '#fde68a';
        ctx.fillText('JT-780  JAKARTA      ON BELT', 20, 158);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('SJ-702  SURABAYA     NEXT', 20, 208);
      } else {
        ctx.fillStyle = '#0b192c';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(0, 0, w, 86);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 34px sans-serif';
        ctx.fillText('DEPARTURES · FIDS', 24, 54);
        const rows = [
          ['GA-614', 'JAKARTA', 'G03', 'BOARDING', '#4ade80'],
          ['JT-791', 'SURABAYA', 'G05', 'ON TIME', '#38bdf8'],
          ['ID-6283', 'MAKASSAR', 'G02', 'FINAL CALL', '#facc15'],
          ['QG-305', 'DENPASAR', 'G04', 'ON TIME', '#38bdf8'],
          ['SJ-701', 'BALIKPAPAN', 'G01', 'DELAYED', '#f87171'],
        ];
        rows.forEach(([fl, dest, gate, st, col], idx) => {
          const y = 135 + idx * 108;
          ctx.fillStyle = idx % 2 === 0 ? '#112240' : '#0f1d36';
          ctx.fillRect(16, y - 38, w - 32, 92);
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 30px monospace';
          ctx.fillText(fl, 28, y + 6);
          ctx.font = '24px sans-serif';
          ctx.fillText(dest, 168, y + 6);
          ctx.fillStyle = '#fde68a';
          ctx.fillText(gate, 352, y + 6);
          ctx.fillStyle = col;
          ctx.font = 'bold 20px monospace';
          ctx.fillText(st, 28, y + 40);
        });
      }
    },
    anisotropy
  );
}

function addBox(
  parent: THREE.Group,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function addCyl(
  parent: THREE.Group,
  rt: number,
  rb: number,
  h: number,
  seg: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  rz = 0
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, 0, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function buildIcDetails(parent: THREE.Group, w: number, d: number, yTop: number, count = 4): void {
  const icMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.25 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.6 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.22, metalness: 0.9 });
  addBox(parent, w * 0.26, 0.025, d * 0.26, icMat, 0, yTop + 0.012, 0);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.4;
    const rx = Math.cos(angle) * w * 0.3;
    const rz = Math.sin(angle) * d * 0.28;
    addCyl(parent, 0.018, 0.018, 0.042, 12, capMat, rx, yTop + 0.021, rz);
    addBox(parent, 0.022, 0.012, 0.022, goldMat, rx * 0.65, yTop + 0.006, -rz * 0.65);
  }
}

function buildSignalStream(
  wiresGroup: THREE.Group,
  points: THREE.Vector3[],
  colorHex: number,
  packetCount = 3,
  speed = 0.48
): DissectionSignalStream {
  const curve = new THREE.CatmullRomCurve3(points);
  const tubeGeo = new THREE.TubeGeometry(curve, 28, 0.011, 8, false);
  const tubeMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.22,
    roughness: 0.4,
    metalness: 0.3,
  });
  const tube = new THREE.Mesh(tubeGeo, tubeMat);
  tube.userData.isSignalEffect = true;
  wiresGroup.add(tube);

  const packets: THREE.Mesh[] = [];
  const phaseOffsets: number[] = [];
  const pktGeo = new THREE.SphereGeometry(0.024, 12, 12);
  for (let i = 0; i < packetCount; i++) {
    const pktMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: colorHex,
      emissiveIntensity: 1.5,
      roughness: 0.15,
      metalness: 0.1,
    });
    const pkt = new THREE.Mesh(pktGeo, pktMat);
    pkt.userData.isSignalEffect = true;
    wiresGroup.add(pkt);
    packets.push(pkt);
    phaseOffsets.push(i / packetCount);
  }

  return { curve, tube, packets, phaseOffsets, speed };
}

export function createDissectionSceneModel(
  blueprint: DeviceDissectionBlueprint,
  maxAnisotropy = 4
): BuiltDissectionModel {
  const root = new THREE.Group();
  const wiresGroup = new THREE.Group();
  root.add(wiresGroup);

  const builtParts: BuiltDissectionPart[] = [];
  const partMap: Record<string, BuiltDissectionPart> = {};
  const streams: DissectionSignalStream[] = [];
  const textures: THREE.Texture[] = [];
  let ceilingAnim: CeilingSpeakerAnimHandle | undefined;
  let columnAnim: ColumnSpeakerAnimHandle | undefined;

  const createPartContainer = (spec: DissectionPartSpec): THREE.Group => {
    const g = new THREE.Group();
    g.name = spec.id;
    g.userData.dissectionPartId = spec.id;
    root.add(g);
    return g;
  };

  const registerPart = (spec: DissectionPartSpec, group: THREE.Group) => {
    const meshes: THREE.Mesh[] = [];
    const originalMaterials = new Map<
      THREE.Mesh,
      { opacity: number; transparent: boolean; wireframe: boolean; depthWrite: boolean }
    >();
    group.traverse((obj) => {
      obj.userData.dissectionPartId = spec.id;
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        // Clone shared materials per mesh so highlight / x-ray doesn't bleed across parts
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => m.clone());
        } else {
          mesh.material = mesh.material.clone();
        }
        const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
        meshes.push(mesh);
        originalMaterials.set(mesh, {
          opacity: mat.opacity,
          transparent: mat.transparent,
          wireframe: mat.wireframe,
          depthWrite: mat.depthWrite,
        });
      }
    });

    const bp: BuiltDissectionPart = {
      spec,
      group,
      basePos: group.position.clone(),
      meshes,
      originalMaterials,
    };
    builtParts.push(bp);
    partMap[spec.id] = bp;
  };

  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.72 });
  const brushedAlum = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.85 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.88 });
  const ferriteMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.65, metalness: 0.35 });
  const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.05 });
  const greenPhoenix = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.42, metalness: 0.15 });
  const matteWhite = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45, metalness: 0.18 });
  const blueSwitch = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.32, metalness: 0.55 });

  const kind = blueprint.modelKind;

  if (kind === 'pas_rack') {
    // 01: BOSCH Network Controller
    const g1 = createPartContainer(blueprint.parts[0]);
    g1.position.set(0, 1.82, 0.02);
    addBox(g1, 0.54, 0.11, 0.44, darkSteel);
    const lcdTex = makeScreenTexture('bosch_lcd', maxAnisotropy);
    textures.push(lcdTex);
    addBox(
      g1,
      0.26,
      0.068,
      0.012,
      new THREE.MeshStandardMaterial({ map: lcdTex, emissiveMap: lcdTex, emissive: 0xffffff, emissiveIntensity: 0.45 }),
      -0.08,
      0,
      0.222
    );
    addCyl(g1, 0.022, 0.022, 0.02, 16, brushedAlum, 0.16, 0, 0.225, Math.PI / 2);
    registerPart(blueprint.parts[0], g1);

    // 02: Managed OMNEO Switch 24-Port
    const g2 = createPartContainer(blueprint.parts[1]);
    g2.position.set(0, 1.66, 0.02);
    addBox(g2, 0.54, 0.075, 0.4, darkSteel);
    addBox(g2, 0.52, 0.055, 0.012, blueSwitch, 0, 0, 0.202);
    for (let p = 0; p < 12; p++) {
      addBox(g2, 0.022, 0.018, 0.016, brushedAlum, -0.21 + p * 0.036, 0.004, 0.208);
    }
    registerPart(blueprint.parts[1], g2);

    // 03: Bank 11x Power Amplifiers BOSCH 100V
    const g3 = createPartContainer(blueprint.parts[2]);
    g3.position.set(0, 1.12, 0.02);
    for (let i = 0; i < 9; i++) {
      const yy = -0.38 + i * 0.095;
      addBox(g3, 0.54, 0.082, 0.46, darkSteel, 0, yy, 0);
      // Silver front handles
      addBox(g3, 0.018, 0.06, 0.03, brushedAlum, -0.24, yy, 0.24);
      addBox(g3, 0.018, 0.06, 0.03, brushedAlum, 0.24, yy, 0.24);
      // Signal LED strip
      addBox(
        g3,
        0.16,
        0.012,
        0.01,
        new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.7 }),
        -0.06,
        yy,
        0.232
      );
    }
    registerPart(blueprint.parts[2], g3);

    // 04: Rear Green Phoenix 100V Terminal Bus
    const g4 = createPartContainer(blueprint.parts[3]);
    g4.position.set(0, 1.1, -0.32);
    addBox(g4, 0.48, 0.88, 0.05, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.6 }));
    for (let i = 0; i < 9; i++) {
      addBox(g4, 0.36, 0.045, 0.04, greenPhoenix, 0, -0.36 + i * 0.09, -0.03);
    }
    registerPart(blueprint.parts[3], g4);

    // 05: 6x Delta DIN-Rail 48V DC PSUs + CEE Sockets
    const g5 = createPartContainer(blueprint.parts[4]);
    g5.position.set(0, 0.42, 0.02);
    addBox(g5, 0.54, 0.025, 0.44, brushedAlum, 0, -0.14, 0);
    for (let i = 0; i < 6; i++) {
      addBox(g5, 0.072, 0.22, 0.26, new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.7 }), -0.21 + i * 0.084, -0.01, 0.02);
      addBox(g5, 0.058, 0.03, 0.02, new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.4 }), -0.21 + i * 0.084, 0.07, 0.155);
    }
    // Blue CEE industrial power plugs
    addCyl(g5, 0.036, 0.036, 0.08, 16, blueSwitch, -0.18, -0.22, 0.14, Math.PI / 2);
    addCyl(g5, 0.036, 0.036, 0.08, 16, matteWhite, 0.18, -0.22, 0.14, Math.PI / 2);
    registerPart(blueprint.parts[4], g5);

    // 06: 42U Steel Frame Enclosure
    const g6 = createPartContainer(blueprint.parts[5]);
    g6.position.set(0, 1.04, 0);
    const frameColor = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.52, metalness: 0.7 });
    addBox(g6, 0.66, 0.06, 0.72, frameColor, 0, -1.01, 0);
    addBox(g6, 0.66, 0.06, 0.72, frameColor, 0, 1.01, 0);
    const posts: Array<[number, number]> = [
      [-0.31, 0.34],
      [0.31, 0.34],
      [-0.31, -0.34],
      [0.31, -0.34],
    ];
    for (const [px, pz] of posts) {
      addBox(g6, 0.04, 2.02, 0.04, frameColor, px, 0, pz);
    }
    // Translucent side & front glass frame
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.28,
      roughness: 0.3,
      metalness: 0.6,
      depthWrite: false,
    });
    addBox(g6, 0.015, 1.94, 0.64, sideMat, -0.325, 0, 0);
    addBox(g6, 0.015, 1.94, 0.64, sideMat, 0.325, 0, 0);
    registerPart(blueprint.parts[5], g6);

    streams.push(
      buildSignalStream(
        wiresGroup,
        [new THREE.Vector3(-0.34, 1.66, 0.24), new THREE.Vector3(-0.24, 1.74, 0.28), new THREE.Vector3(-0.18, 1.82, 0.24)],
        0x38bdf8,
        3,
        0.55
      ),
      buildSignalStream(
        wiresGroup,
        [new THREE.Vector3(0.22, 1.8, 0.24), new THREE.Vector3(0.26, 1.45, 0.26), new THREE.Vector3(0.22, 0.88, 0.24)],
        0x10b981,
        4,
        0.48
      ),
      buildSignalStream(
        wiresGroup,
        [new THREE.Vector3(0.16, 1.12, -0.22), new THREE.Vector3(0.16, 1.12, -0.34), new THREE.Vector3(-0.16, 1.12, -0.38)],
        0xf59e0b,
        3,
        0.52
      )
    );
  } else if (kind === 'pas_paging') {
    // 01: Gooseneck Mic & Windscreen
    const g1 = createPartContainer(blueprint.parts[0]);
    g1.position.set(-0.28, 0.44, -0.02);
    addCyl(g1, 0.032, 0.038, 0.05, 16, brushedAlum, 0, 0, 0);
    const neckCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.02, 0),
      new THREE.Vector3(0, 0.24, 0.02),
      new THREE.Vector3(0.04, 0.44, 0.14),
      new THREE.Vector3(0.08, 0.5, 0.26),
    ]);
    const neckMesh = new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 24, 0.012, 10, false), ferriteMat);
    g1.add(neckMesh);
    addCyl(g1, 0.022, 0.022, 0.018, 16, new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.9 }), 0.08, 0.5, 0.25, Math.PI / 2.2);
    addCyl(g1, 0.036, 0.032, 0.095, 16, new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.92, metalness: 0.05 }), 0.09, 0.51, 0.31, Math.PI / 2.2);
    registerPart(blueprint.parts[0], g1);

    // 02: Capacitive Touchscreen
    const g2 = createPartContainer(blueprint.parts[1]);
    g2.position.set(-0.12, 0.43, 0.04);
    g2.rotation.x = 0.28;
    addBox(g2, 0.34, 0.022, 0.24, darkSteel);
    const screenTex = makeScreenTexture('paging', maxAnisotropy);
    textures.push(screenTex);
    addBox(
      g2,
      0.3,
      0.008,
      0.2,
      new THREE.MeshStandardMaterial({ map: screenTex, emissiveMap: screenTex, emissive: 0xffffff, emissiveIntensity: 0.45 }),
      0,
      0.013,
      0
    );
    registerPart(blueprint.parts[1], g2);

    // 03: Mainboard DSP OMNEO & Silver PTT Switch
    const g3 = createPartContainer(blueprint.parts[2]);
    g3.position.set(-0.14, 0.3, 0.02);
    const pcbTex = makePcbTexture('BOSCH OMNEO DSP', '#38bdf8', maxAnisotropy);
    textures.push(pcbTex);
    addBox(g3, 0.44, 0.024, 0.34, new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.45, metalness: 0.3 }));
    buildIcDetails(g3, 0.44, 0.34, 0.012, 5);
    // Silver tactile PTT switch cap
    addBox(g3, 0.16, 0.045, 0.075, brushedAlum, -0.08, 0.045, 0.14);
    addBox(
      g3,
      0.17,
      0.01,
      0.085,
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.8 }),
      -0.08,
      0.022,
      0.14
    );
    registerPart(blueprint.parts[2], g3);

    // 04: Zone Extension Keypad (3 Red + 9 Zone Keys + Ribbon)
    const g4 = createPartContainer(blueprint.parts[3]);
    g4.position.set(0.42, 0.32, 0.02);
    addBox(g4, 0.38, 0.12, 0.36, darkSteel);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.2, emissive: 0x7f1d1d, emissiveIntensity: 0.3 });
    for (let c = 0; c < 3; c++) {
      addBox(g4, 0.088, 0.024, 0.055, redMat, -0.11 + c * 0.11, 0.072, -0.1);
    }
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        addBox(g4, 0.088, 0.02, 0.052, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.3 }), -0.11 + c * 0.11, 0.07, -0.02 + r * 0.072);
      }
    }
    // Flat Ribbon Cable linking to Mainboard
    addBox(g4, 0.24, 0.008, 0.06, new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 }), -0.26, 0, -0.08);
    registerPart(blueprint.parts[3], g4);

    // 05: Rear I/O Panel (Dual RJ45 OMNEO, XLR, Headphone, DC)
    const g5 = createPartContainer(blueprint.parts[4]);
    g5.position.set(-0.14, 0.3, -0.22);
    addBox(g5, 0.42, 0.11, 0.04, new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.65 }));
    addCyl(g5, 0.028, 0.028, 0.035, 16, brushedAlum, -0.14, 0, -0.025, Math.PI / 2); // XLR
    addCyl(g5, 0.014, 0.014, 0.03, 12, greenPhoenix, -0.06, 0, -0.022, Math.PI / 2); // Headphone green
    addBox(g5, 0.042, 0.036, 0.035, blueSwitch, 0.04, 0, -0.022); // OMNEO 1
    addBox(g5, 0.042, 0.036, 0.035, blueSwitch, 0.1, 0, -0.022); // OMNEO 2
    addCyl(g5, 0.016, 0.016, 0.03, 12, copperMat, 0.16, 0, -0.022, Math.PI / 2); // DC Power
    registerPart(blueprint.parts[4], g5);

    // 06: Die-Cast Console Base Shell
    const g6 = createPartContainer(blueprint.parts[5]);
    g6.position.set(-0.14, 0.2, 0.02);
    addBox(g6, 0.54, 0.1, 0.44, new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.48, metalness: 0.68 }));
    registerPart(blueprint.parts[5], g6);

    streams.push(
      buildSignalStream(
        wiresGroup,
        [new THREE.Vector3(-0.28, 0.48, 0.02), new THREE.Vector3(-0.22, 0.34, 0.02), new THREE.Vector3(-0.14, 0.32, -0.22)],
        0x38bdf8,
        3,
        0.58
      ),
      buildSignalStream(
        wiresGroup,
        [new THREE.Vector3(0.32, 0.32, -0.06), new THREE.Vector3(0.14, 0.32, -0.06), new THREE.Vector3(-0.08, 0.32, 0.02)],
        0xef4444,
        3,
        0.5
      )
    );
  } else if (kind === 'pas_ceiling') {
    const centerY = 0.68;
    const copperCoilTex = makeCopperWindingTexture(maxAnisotropy);
    const spiderTex = makeSpiderTexture(maxAnisotropy);
    const darkGrilleTex = makeDarkPerforatedGrilleTexture(maxAnisotropy);
    textures.push(copperCoilTex, spiderTex, darkGrilleTex);

    const woundCopperMat = new THREE.MeshStandardMaterial({
      map: copperCoilTex,
      roughness: 0.26,
      metalness: 0.84,
      side: THREE.DoubleSide,
    });
    const spiderMat = new THREE.MeshStandardMaterial({
      map: spiderTex,
      color: 0xfacc15,
      roughness: 0.58,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const basketSteelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.36,
      metalness: 0.82,
    });
    const trafoCoreMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.32,
      metalness: 0.86,
    });
    const redWireMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.42, metalness: 0.12 });
    const blueWireMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.42, metalness: 0.12 });
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.76,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const surroundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.86,
      metalness: 0.06,
      side: THREE.DoubleSide,
    });

    // Helper: create LatheGeometry rotated so axis points along +X
    const makeHorizontalLathe = (points: THREE.Vector2[], segments = 48): THREE.LatheGeometry => {
      const geo = new THREE.LatheGeometry(points, segments);
      geo.rotateZ(-Math.PI / 2);
      return geo;
    };

    // ==================== #01: TRAFO MATCHING & RANGKA BASKET ====================
    const g1 = createPartContainer(blueprint.parts[0]);
    g1.position.set(-0.22, centerY, 0);

    // Rear open steel basket (rear hub collar + 6 radial stamped struts + front mounting rim)
    const rearRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 12, 36), basketSteelMat);
    rearRing.rotation.y = Math.PI / 2;
    rearRing.position.set(-0.04, 0, 0);
    g1.add(rearRing);

    const frontRing = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.022, 12, 42), basketSteelMat);
    frontRing.rotation.y = Math.PI / 2;
    frontRing.position.set(0.24, 0, 0);
    g1.add(frontRing);

    for (let s = 0; s < 6; s++) {
      const ang = (s / 6) * Math.PI * 2 + Math.PI / 6;
      const strutCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.04, Math.sin(ang) * 0.19, Math.cos(ang) * 0.19),
        new THREE.Vector3(0.08, Math.sin(ang) * 0.31, Math.cos(ang) * 0.31),
        new THREE.Vector3(0.24, Math.sin(ang) * 0.4, Math.cos(ang) * 0.4),
      ]);
      const strut = new THREE.Mesh(new THREE.TubeGeometry(strutCurve, 12, 0.018, 6, false), basketSteelMat);
      strut.castShadow = true;
      g1.add(strut);
    }

    // Matching Transformer (E-I laminated steel core + golden copper winding bobbin + mounting bracket)
    const trafoGrp = new THREE.Group();
    trafoGrp.position.set(-0.18, -0.02, 0.01);
    g1.add(trafoGrp);
    // Mounting bracket plate
    addBox(trafoGrp, 0.025, 0.24, 0.18, darkSteel, 0.095, 0, 0);
    // Laminated steel core outer frame (top, bottom, front, back bars creating real window)
    addBox(trafoGrp, 0.16, 0.036, 0.14, trafoCoreMat, 0, 0.082, 0);
    addBox(trafoGrp, 0.16, 0.036, 0.14, trafoCoreMat, 0, -0.082, 0);
    addBox(trafoGrp, 0.036, 0.2, 0.14, trafoCoreMat, -0.062, 0, 0);
    addBox(trafoGrp, 0.036, 0.2, 0.14, trafoCoreMat, 0.062, 0, 0);
    // Copper-wound bobbin inside core window
    addBox(trafoGrp, 0.088, 0.132, 0.165, woundCopperMat, 0, 0, 0);
    // Yellow insulating bobbin cheeks
    addBox(trafoGrp, 0.094, 0.012, 0.172, new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 }), 0, 0.062, 0);
    addBox(trafoGrp, 0.094, 0.012, 0.172, new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 }), 0, -0.062, 0);
    // Terminal board with Red & Blue leads exiting forward toward Voice Coil
    addBox(trafoGrp, 0.022, 0.055, 0.08, ceramicMat, 0.06, -0.105, 0.03);
    const outRedCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.12, -0.12, 0.06),
      new THREE.Vector3(-0.02, -0.1, 0.09),
      new THREE.Vector3(0.08, -0.04, 0.05),
    ]);
    const outBlueCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.12, -0.13, 0.02),
      new THREE.Vector3(-0.02, -0.115, 0.045),
      new THREE.Vector3(0.08, -0.055, 0.015),
    ]);
    g1.add(new THREE.Mesh(new THREE.TubeGeometry(outRedCurve, 14, 0.009, 8, false), redWireMat));
    g1.add(new THREE.Mesh(new THREE.TubeGeometry(outBlueCurve, 14, 0.009, 8, false), blueWireMat));
    registerPart(blueprint.parts[0], g1);

    // ==================== #02: KUMPARAN SUARA (VOICE COIL) ====================
    const g2 = createPartContainer(blueprint.parts[1]);
    g2.position.set(-0.14, centerY, 0);

    // Hollow Kapton/Aluminum former sleeve (protruding slightly right toward cone)
    const formerPts = [
      new THREE.Vector2(0.088, -0.085),
      new THREE.Vector2(0.096, -0.085),
      new THREE.Vector2(0.096, 0.115),
      new THREE.Vector2(0.088, 0.115),
      new THREE.Vector2(0.088, -0.085),
    ];
    const formerMesh = new THREE.Mesh(
      makeHorizontalLathe(formerPts, 40),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.72 })
    );
    formerMesh.castShadow = true;
    g2.add(formerMesh);

    // Dense shiny copper wire winding cylinder wrapped over the left/middle section of the former
    const coilPts = [
      new THREE.Vector2(0.096, -0.082),
      new THREE.Vector2(0.114, -0.082),
      new THREE.Vector2(0.114, 0.068),
      new THREE.Vector2(0.096, 0.068),
    ];
    const coilMesh = new THREE.Mesh(makeHorizontalLathe(coilPts, 48), woundCopperMat);
    coilMesh.castShadow = true;
    g2.add(coilMesh);

    // Fine copper lead-out wires on rear edge of Voice Coil
    const tail1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.07, -0.08, 0.075),
      new THREE.Vector3(-0.13, -0.09, 0.065),
    ]);
    const tail2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.07, -0.095, 0.045),
      new THREE.Vector3(-0.13, -0.105, 0.035),
    ]);
    g2.add(new THREE.Mesh(new THREE.TubeGeometry(tail1, 8, 0.006, 6, false), copperMat));
    g2.add(new THREE.Mesh(new THREE.TubeGeometry(tail2, 8, 0.006, 6, false), copperMat));
    registerPart(blueprint.parts[1], g2);

    // ==================== #03: MAGNET PERMANEN (RING MAGNET) ====================
    const g3 = createPartContainer(blueprint.parts[2]);
    g3.position.set(-0.14, centerY, 0);

    // Thick chamfered toroidal ferrite ring magnet with open central air-gap hole
    const magPts = [
      new THREE.Vector2(0.132, -0.072),
      new THREE.Vector2(0.142, -0.082),
      new THREE.Vector2(0.258, -0.082),
      new THREE.Vector2(0.272, -0.068),
      new THREE.Vector2(0.272, 0.068),
      new THREE.Vector2(0.258, 0.082),
      new THREE.Vector2(0.142, 0.082),
      new THREE.Vector2(0.132, 0.072),
      new THREE.Vector2(0.132, -0.072),
    ];
    const magnetMesh = new THREE.Mesh(
      makeHorizontalLathe(magPts, 52),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.38, metalness: 0.72 })
    );
    magnetMesh.castShadow = true;
    g3.add(magnetMesh);

    // Brushed metallic front & rear pole-plate accent rings
    const poleFront = new THREE.Mesh(new THREE.RingGeometry(0.138, 0.256, 48), brushedAlum);
    poleFront.rotation.y = Math.PI / 2;
    poleFront.position.x = 0.083;
    g3.add(poleFront);

    const poleRear = new THREE.Mesh(new THREE.RingGeometry(0.138, 0.256, 48), brushedAlum);
    poleRear.rotation.y = -Math.PI / 2;
    poleRear.position.x = -0.083;
    g3.add(poleRear);
    registerPart(blueprint.parts[2], g3);

    // ==================== #04: SUSPENSI (SPIDER BERGELOMBANG) ====================
    const g4 = createPartContainer(blueprint.parts[3]);
    g4.position.set(-0.02, centerY, 0);

    // Corrugated concentric-rippled golden-amber spider damper (5 crisp radial waves)
    const spiderPts: THREE.Vector2[] = [];
    const rMin = 0.098;
    const rMax = 0.268;
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = THREE.MathUtils.lerp(rMin, rMax, t);
      const envelope = Math.sin(t * Math.PI);
      const wave = Math.sin(t * Math.PI * 10) * 0.017 * (0.35 + 0.65 * envelope);
      spiderPts.push(new THREE.Vector2(r, wave));
    }
    const spiderMesh = new THREE.Mesh(makeHorizontalLathe(spiderPts, 56), spiderMat);
    spiderMesh.castShadow = true;
    g4.add(spiderMesh);

    // Inner voice-coil gluing collar & outer mounting rim
    const spiderInnerRim = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.008, 10, 36), new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.5 }));
    spiderInnerRim.rotation.y = Math.PI / 2;
    g4.add(spiderInnerRim);
    const spiderOuterRim = new THREE.Mesh(new THREE.TorusGeometry(0.268, 0.009, 10, 44), new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.55 }));
    spiderOuterRim.rotation.y = Math.PI / 2;
    g4.add(spiderOuterRim);
    registerPart(blueprint.parts[3], g4);

    // ==================== #05: DIAFRAGMA / KERUCUT (CONE) ====================
    const g5 = createPartContainer(blueprint.parts[4]);
    g5.position.set(0.08, centerY, 0);

    // Curved dark charcoal acoustic cone body (voice coil neck -> curved flare)
    const conePts = [
      new THREE.Vector2(0.096, -0.115),
      new THREE.Vector2(0.125, -0.075),
      new THREE.Vector2(0.185, -0.025),
      new THREE.Vector2(0.265, 0.03),
      new THREE.Vector2(0.352, 0.085),
    ];
    const coneMesh = new THREE.Mesh(makeHorizontalLathe(conePts, 56), coneMat);
    coneMesh.castShadow = true;
    g5.add(coneMesh);

    // Flexible rubber half-roll surround + stepped mounting flange rim
    const surroundPts = [
      new THREE.Vector2(0.352, 0.085),
      new THREE.Vector2(0.368, 0.106),
      new THREE.Vector2(0.386, 0.106),
      new THREE.Vector2(0.398, 0.086),
      new THREE.Vector2(0.436, 0.086),
      new THREE.Vector2(0.436, 0.068),
      new THREE.Vector2(0.402, 0.068),
    ];
    const surroundMesh = new THREE.Mesh(makeHorizontalLathe(surroundPts, 56), surroundMat);
    surroundMesh.castShadow = true;
    g5.add(surroundMesh);

    // Center curved acoustic dust cap dome facing +X
    const dustCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.098, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.46),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.52, metalness: 0.15 })
    );
    dustCap.rotation.z = -Math.PI / 2;
    dustCap.position.x = -0.075;
    g5.add(dustCap);

    // 4 subtle metallic flange mounting screw eyelets
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const screw = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 8, 16), brushedAlum);
      screw.rotation.y = Math.PI / 2;
      screw.position.set(0.088, Math.sin(a) * 0.417, Math.cos(a) * 0.417);
      g5.add(screw);
    }
    registerPart(blueprint.parts[4], g5);

    // ==================== #06: GRILLE LOGAM (PELINDUNG LUAR) ====================
    const g6 = createPartContainer(blueprint.parts[5]);
    g6.position.set(0.23, centerY, 0);

    // Perforated dark-metallic circular acoustic face
    const grilleDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.415, 0.415, 0.022, 52),
      new THREE.MeshStandardMaterial({
        map: darkGrilleTex,
        roughness: 0.42,
        metalness: 0.62,
      })
    );
    grilleDisc.rotation.z = -Math.PI / 2;
    grilleDisc.castShadow = true;
    g6.add(grilleDisc);

    // Beveled metallic outer protective trim bezel ring
    const grilleTrim = new THREE.Mesh(new THREE.TorusGeometry(0.422, 0.022, 16, 56), brushedAlum);
    grilleTrim.rotation.y = Math.PI / 2;
    g6.add(grilleTrim);
    registerPart(blueprint.parts[5], g6);

    // ==================== LEFT INPUT (100V LINE CABLE + ELECTRIC ARCS) ====================
    const inputGroup = new THREE.Group();
    inputGroup.position.set(-0.22, centerY, 0);
    wiresGroup.add(inputGroup);

    // Blue-jacketed 100V main cable sheath entering from left
    const mainSheathCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.76, -0.05, 0.02),
      new THREE.Vector3(-0.56, -0.03, 0.015),
      new THREE.Vector3(-0.42, -0.02, 0.01),
    ]);
    const mainSheath = new THREE.Mesh(
      new THREE.TubeGeometry(mainSheathCurve, 16, 0.024, 12, false),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, metalness: 0.15 })
    );
    mainSheath.userData.isSignalEffect = true;
    inputGroup.add(mainSheath);

    // Red (+) & Blue (-) insulated 100V leads splitting into #01 Trafo Matching
    const inRedCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.43, -0.015, 0.015),
      new THREE.Vector3(-0.33, 0.02, 0.04),
      new THREE.Vector3(-0.23, 0.01, 0.03),
    ]);
    const inBlueCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.43, -0.025, 0.005),
      new THREE.Vector3(-0.33, -0.06, -0.015),
      new THREE.Vector3(-0.23, -0.05, -0.01),
    ]);
    const inRedMesh = new THREE.Mesh(new THREE.TubeGeometry(inRedCurve, 14, 0.01, 8, false), redWireMat);
    const inBlueMesh = new THREE.Mesh(new THREE.TubeGeometry(inBlueCurve, 14, 0.01, 8, false), blueWireMat);
    inRedMesh.userData.isSignalEffect = true;
    inBlueMesh.userData.isSignalEffect = true;
    inputGroup.add(inRedMesh, inBlueMesh);

    // Glowing cyan 100V high-voltage energy pulse rings & lightning arcs traveling along input cable
    const inputSparks: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x38bdf8 : 0x7dd3fc,
        transparent: true,
        opacity: 0.88,
      });
      const sparkRing = new THREE.Mesh(new THREE.TorusGeometry(0.042 + (i % 2) * 0.012, 0.006, 8, 20), sparkMat);
      sparkRing.rotation.y = Math.PI / 2;
      sparkRing.position.set(-0.68 + i * 0.12, -0.03, 0.01);
      sparkRing.userData.isSignalEffect = true;
      sparkRing.userData.sparkOffset = i * 0.25;
      inputGroup.add(sparkRing);
      inputSparks.push(sparkRing);
    }

    // ==================== RIGHT OUTPUT (MULTI-COLOR ACOUSTIC SOUNDWAVES) ====================
    const outputGroup = new THREE.Group();
    outputGroup.position.set(0.28, centerY, 0);
    wiresGroup.add(outputGroup);

    const waveColors = [0x38bdf8, 0xec4899, 0xf59e0b]; // Cyan -> Magenta -> Amber/Gold (matches reference!)
    const waveRibbons: THREE.Mesh[] = [];
    for (let w = 0; w < 3; w++) {
      const wavePts: THREE.Vector3[] = [];
      for (let i = 0; i <= 36; i++) {
        const u = i / 36;
        const x = 0.05 + u * 0.78;
        const env = Math.sin(u * Math.PI) * (0.45 + u * 0.75);
        const y = Math.sin(u * Math.PI * 5.2 + w * 1.15) * (0.11 + w * 0.025) * env;
        const z = Math.cos(u * Math.PI * 3.8 + w * 1.4) * 0.04 * env;
        wavePts.push(new THREE.Vector3(x, y, z));
      }
      const waveCurve = new THREE.CatmullRomCurve3(wavePts);
      const waveMat = new THREE.MeshBasicMaterial({
        color: waveColors[w],
        transparent: true,
        opacity: 0.85,
      });
      const ribbon = new THREE.Mesh(new THREE.TubeGeometry(waveCurve, 44, 0.0095, 8, false), waveMat);
      ribbon.rotation.x = (w - 1) * 0.78;
      ribbon.userData.isSignalEffect = true;
      ribbon.userData.waveIndex = w;
      outputGroup.add(ribbon);
      waveRibbons.push(ribbon);
    }

    // Concentric expanding acoustic wavefront rings radiating along +X
    const waveRings: THREE.Mesh[] = [];
    const ringColors = [0x38bdf8, 0xe879f9, 0xfbbf24, 0x38bdf8];
    for (let r = 0; r < 4; r++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColors[r],
        transparent: true,
        opacity: 0.75,
      });
      const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 10, 36), ringMat);
      ringMesh.rotation.y = Math.PI / 2;
      ringMesh.userData.isSignalEffect = true;
      ringMesh.userData.ringPhase = r * 0.25;
      outputGroup.add(ringMesh);
      waveRings.push(ringMesh);
    }

    // Coaxial internal signal streams (100V blue -> electromagnetic amber -> acoustic cyan)
    streams.push(
      buildSignalStream(
        wiresGroup,
        [
          new THREE.Vector3(-0.82, centerY - 0.04, 0),
          new THREE.Vector3(-0.42, centerY, 0),
          new THREE.Vector3(0.05, centerY, 0),
        ],
        0x38bdf8,
        4,
        0.54
      ),
      buildSignalStream(
        wiresGroup,
        [
          new THREE.Vector3(-0.36, centerY + 0.02, 0.02),
          new THREE.Vector3(0.18, centerY, 0),
          new THREE.Vector3(0.75, centerY, 0),
        ],
        0xf59e0b,
        4,
        0.6
      )
    );

    ceilingAnim = {
      inputGroup,
      inputSparks,
      outputGroup,
      waveRibbons,
      waveRings,
      voiceCoilPart: builtParts[1],
      conePart: builtParts[4],
      trafoPart: builtParts[0],
      grillePart: builtParts[5],
      spiderPart: builtParts[3],
    };
  } else if (kind === 'pas_horn') {
    // 01: Exponential Flare Horn Bell (LatheGeometry)
    const g1 = createPartContainer(blueprint.parts[0]);
    g1.position.set(0, 0.62, 0.18);
    const pts = [
      new THREE.Vector2(0.08, 0),
      new THREE.Vector2(0.11, 0.14),
      new THREE.Vector2(0.19, 0.3),
      new THREE.Vector2(0.32, 0.46),
      new THREE.Vector2(0.42, 0.56),
      new THREE.Vector2(0.4, 0.56),
      new THREE.Vector2(0.3, 0.45),
      new THREE.Vector2(0.17, 0.29),
      new THREE.Vector2(0.07, 0),
    ];
    const flareGeo = new THREE.LatheGeometry(pts, 36);
    flareGeo.rotateX(Math.PI / 2);
    const flareMesh = new THREE.Mesh(flareGeo, matteWhite);
    flareMesh.castShadow = true;
    g1.add(flareMesh);
    registerPart(blueprint.parts[0], g1);

    // 02: Acoustic Phase Plug Re-Entrant Torpedo
    const g2 = createPartContainer(blueprint.parts[1]);
    g2.position.set(0, 0.62, 0.38);
    addCyl(g2, 0.04, 0.13, 0.36, 24, blueSwitch, 0, 0, 0, Math.PI / 2);
    addCyl(g2, 0.12, 0.04, 0.1, 24, darkSteel, 0, 0, 0.2, Math.PI / 2);
    registerPart(blueprint.parts[1], g2);

    // 03: Compression Driver 30W (Diaphragm + Voice Coil + Magnet)
    const g3 = createPartContainer(blueprint.parts[2]);
    g3.position.set(0, 0.62, 0.02);
    addCyl(g3, 0.17, 0.17, 0.14, 28, ferriteMat, 0, 0, 0, Math.PI / 2);
    addCyl(g3, 0.09, 0.09, 0.12, 24, copperMat, 0, 0, 0.05, Math.PI / 2);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      brushedAlum
    );
    dome.rotation.x = Math.PI / 2;
    dome.position.z = 0.09;
    g3.add(dome);
    registerPart(blueprint.parts[2], g3);

    // 04: 100V Matching Transformer 30W + Rotary Tap Selector
    const g4 = createPartContainer(blueprint.parts[3]);
    g4.position.set(0, 0.62, -0.22);
    addBox(g4, 0.2, 0.18, 0.16, brushedAlum);
    addBox(g4, 0.14, 0.15, 0.18, copperMat);
    addCyl(g4, 0.045, 0.045, 0.04, 16, greenPhoenix, 0, 0, -0.1, Math.PI / 2);
    registerPart(blueprint.parts[3], g4);

    // 05: Rear Waterproof Canister & Cable Gland IP65
    const g5 = createPartContainer(blueprint.parts[4]);
    g5.position.set(0, 0.62, -0.36);
    addCyl(
      g5,
      0.16,
      0.18,
      0.24,
      28,
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.42, metalness: 0.6, transparent: true, opacity: 0.85 }),
      0,
      0,
      0,
      Math.PI / 2
    );
    addCyl(g5, 0.032, 0.038, 0.09, 16, darkSteel, 0, -0.05, -0.15, Math.PI / 2);
    registerPart(blueprint.parts[4], g5);

    // 06: Galvanized Steel U-Yoke Bracket
    const g6 = createPartContainer(blueprint.parts[5]);
    g6.position.set(0, 0.34, -0.02);
    addBox(g6, 0.48, 0.038, 0.07, brushedAlum, 0, -0.14, 0);
    addBox(g6, 0.035, 0.42, 0.06, brushedAlum, -0.22, 0.06, 0);
    addBox(g6, 0.035, 0.42, 0.06, brushedAlum, 0.22, 0.06, 0);
    addCyl(g6, 0.032, 0.032, 0.04, 16, darkSteel, -0.25, 0.24, 0, 0, Math.PI / 2);
    addCyl(g6, 0.032, 0.032, 0.04, 16, darkSteel, 0.25, 0.24, 0, 0, Math.PI / 2);
    registerPart(blueprint.parts[5], g6);

    streams.push(
      buildSignalStream(
        wiresGroup,
        [new THREE.Vector3(0, 0.56, -0.48), new THREE.Vector3(0, 0.62, -0.22), new THREE.Vector3(0, 0.62, 0.02), new THREE.Vector3(0, 0.62, 0.44)],
        0xf59e0b,
        4,
        0.58
      )
    );
  } else if (kind === 'pas_column') {
    // ==================== BEDAH INTERNAL COLUMN SPEAKER (SPEAKER KOLOM 100V) ====================
    const whiteGrilleTex = makeWhitePerforatedGrilleTexture(maxAnisotropy);
    const woolTex = makeAcousticWoolTexture(maxAnisotropy);
    const trafoTapeTex = makeTrafoTapeTexture(maxAnisotropy);
    const lamSteelTex = makeLaminatedSteelTexture(maxAnisotropy);
    const copperCoilTex = makeCopperWindingTexture(maxAnisotropy);
    const crossoverPcbTex = makePcbTexture('CROSSOVER 2-WAY', '#facc15', maxAnisotropy);
    textures.push(whiteGrilleTex, woolTex, trafoTapeTex, lamSteelTex, copperCoilTex, crossoverPcbTex);

    const alumCasingMat = new THREE.MeshStandardMaterial({
      color: 0xe6e9ee,
      roughness: 0.34,
      metalness: 0.42,
    });
    const alumTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd5dbe3,
      roughness: 0.28,
      metalness: 0.58,
    });
    const alumInnerMat = new THREE.MeshStandardMaterial({
      color: 0xbac3cf,
      roughness: 0.42,
      metalness: 0.48,
    });
    const grilleMeshMat = new THREE.MeshStandardMaterial({
      map: whiteGrilleTex,
      roughness: 0.36,
      metalness: 0.52,
    });
    const blackFrameMat = new THREE.MeshStandardMaterial({
      color: 0x181c22,
      roughness: 0.48,
      metalness: 0.22,
    });
    const rubberSurroundMat = new THREE.MeshStandardMaterial({
      color: 0x0f1217,
      roughness: 0.78,
      metalness: 0.08,
    });
    const coneFaceMat = new THREE.MeshStandardMaterial({
      color: 0x2b313b,
      roughness: 0.68,
      metalness: 0.14,
      side: THREE.DoubleSide,
    });
    const dustCapMat = new THREE.MeshStandardMaterial({
      color: 0x161a21,
      roughness: 0.34,
      metalness: 0.26,
    });
    const basketSilverMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.3,
      metalness: 0.84,
    });
    const magnetDarkMat = new THREE.MeshStandardMaterial({
      color: 0x374151,
      roughness: 0.42,
      metalness: 0.64,
    });
    const woolMat = new THREE.MeshStandardMaterial({
      map: woolTex,
      color: 0xf4f5f7,
      roughness: 0.94,
      metalness: 0.0,
    });
    const trafoSteelMat = new THREE.MeshStandardMaterial({
      map: lamSteelTex,
      color: 0xd1d5db,
      roughness: 0.3,
      metalness: 0.84,
    });
    const trafoBobbinMat = new THREE.MeshStandardMaterial({
      map: trafoTapeTex,
      roughness: 0.28,
      metalness: 0.14,
    });
    const woundCopperMat = new THREE.MeshStandardMaterial({
      map: copperCoilTex,
      roughness: 0.24,
      metalness: 0.88,
    });
    const redWireMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42, metalness: 0.1 });
    const blkWireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.46, metalness: 0.1 });
    const whtWireMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.44, metalness: 0.08 });

    // Helper: LatheGeometry oriented to face +Z
    const makeForwardLathe = (pts: THREE.Vector2[], seg = 40): THREE.LatheGeometry => {
      const geo = new THREE.LatheGeometry(pts, seg);
      geo.rotateX(Math.PI / 2);
      return geo;
    };

    // ==================== #01: GRILLE DEPAN (CURVED PERFORATED FRONT GRILLE) ====================
    const g1 = createPartContainer(blueprint.parts[0]);
    g1.position.set(-0.255, 0.95, 0.245);
    g1.rotation.y = -0.06;

    // Gently arched vertical perforated grille plate
    const grilleFront = new THREE.Mesh(new THREE.BoxGeometry(0.41, 1.7, 0.022), grilleMeshMat);
    grilleFront.castShadow = true;
    grilleFront.receiveShadow = true;
    g1.add(grilleFront);
    // Molded white-silver top & bottom end caps + slender vertical side rails
    addBox(g1, 0.43, 0.044, 0.056, alumCasingMat, 0, 0.865, -0.01);
    addBox(g1, 0.43, 0.044, 0.056, alumCasingMat, 0, -0.865, -0.01);
    addBox(g1, 0.018, 1.72, 0.04, alumTrimMat, -0.205, 0, -0.008);
    addBox(g1, 0.018, 1.72, 0.04, alumTrimMat, 0.205, 0, -0.008);
    // Raised subtle dark metallic logo badge at bottom front
    addBox(g1, 0.115, 0.032, 0.008, darkSteel, 0, -0.66, 0.014);
    registerPart(blueprint.parts[0], g1);

    // ==================== #02: CASING ALUMINIUM (EXTRUDED CUTAWAY CABINET) ====================
    const g2 = createPartContainer(blueprint.parts[1]);
    g2.position.set(0, 0.95, -0.01);

    // Top extruded aluminum cap with corner mounting screw recesses
    addBox(g2, 0.44, 0.034, 0.41, alumCasingMat, 0, 0.875, 0);
    addBox(g2, 0.41, 0.014, 0.37, alumInnerMat, 0, 0.854, 0);
    addCyl(g2, 0.009, 0.009, 0.012, 12, darkSteel, -0.175, 0.858, 0.165, Math.PI / 2);
    addCyl(g2, 0.009, 0.009, 0.012, 12, darkSteel, 0.175, 0.858, 0.165, Math.PI / 2);

    // Bottom extruded aluminum base plate with stepped lip
    addBox(g2, 0.44, 0.034, 0.41, alumCasingMat, 0, -0.875, 0);
    addBox(g2, 0.41, 0.014, 0.37, alumInnerMat, 0, -0.854, 0);

    // Left full side wall + Rear full wall (Right flank stays cleanly open for cutaway inspection!)
    addBox(g2, 0.022, 1.74, 0.38, alumCasingMat, -0.205, 0, 0);
    addBox(g2, 0.42, 1.74, 0.022, alumCasingMat, 0, 0, -0.185);
    // Rear-right aluminum extrusion spine & front-left baffle rail framing the cutaway
    addBox(g2, 0.024, 1.74, 0.032, alumTrimMat, 0.204, 0, -0.176);
    addBox(g2, 0.024, 1.74, 0.028, alumTrimMat, -0.204, 0, 0.176);
    // Front internal speaker baffle mounting flange strips on left
    addBox(g2, 0.016, 1.4, 0.018, alumInnerMat, -0.182, 0.15, 0.12);
    registerPart(blueprint.parts[1], g2);

    // ==================== #03: TWEETER (UPPER HIGH-FREQUENCY DOME DRIVER) ====================
    const g3 = createPartContainer(blueprint.parts[2]);
    g3.position.set(-0.01, 1.66, 0.065);

    // Square matte-black flanged tweeter faceplate (4 corner screws)
    addBox(g3, 0.205, 0.205, 0.02, blackFrameMat, 0, 0, 0.052);
    for (const sx of [-0.082, 0.082]) {
      for (const sy of [-0.082, 0.082]) {
        addCyl(g3, 0.009, 0.009, 0.008, 12, brushedAlum, sx, sy, 0.064, Math.PI / 2);
      }
    }
    // Waveguide trim ring & satin soft-dome diaphragm
    const twTrim = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.012, 12, 32), rubberSurroundMat);
    twTrim.position.set(0, 0, 0.062);
    g3.add(twTrim);
    const twDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.044, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.48),
      dustCapMat
    );
    twDome.rotation.x = Math.PI / 2;
    twDome.position.set(0, 0, 0.048);
    g3.add(twDome);
    // Rear cylindrical magnet motor + brushed steel end cap
    addCyl(g3, 0.062, 0.062, 0.068, 28, basketSilverMat, 0, 0, 0.006, Math.PI / 2);
    addCyl(g3, 0.056, 0.056, 0.036, 28, magnetDarkMat, 0, 0, -0.044, Math.PI / 2);
    addCyl(g3, 0.058, 0.058, 0.012, 28, brushedAlum, 0, 0, -0.066, Math.PI / 2);
    registerPart(blueprint.parts[2], g3);

    // ==================== #04: SPEAKER FULL-RANGE (×4 LINE-ARRAY) ====================
    const g4 = createPartContainer(blueprint.parts[3]);
    g4.position.set(-0.01, 0.94, 0.065);

    const coneProfile = [
      new THREE.Vector2(0.036, -0.025),
      new THREE.Vector2(0.058, -0.004),
      new THREE.Vector2(0.088, 0.02),
      new THREE.Vector2(0.112, 0.042),
    ];
    const sharedConeGeo = makeForwardLathe(coneProfile, 40);
    const driverOffsetsY = [0.42, 0.14, -0.14, -0.42]; // World Y: 1.36, 1.08, 0.80, 0.52

    driverOffsetsY.forEach((dy) => {
      const drv = new THREE.Group();
      drv.position.set(0, dy, 0);

      // Matte-black circular mounting frame + 4 corner screw tabs
      const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.122, 0.012, 12, 36), blackFrameMat);
      bezel.position.set(0, 0, 0.052);
      drv.add(bezel);
      for (const sx of [-0.098, 0.098]) {
        for (const sy of [-0.098, 0.098]) {
          addBox(drv, 0.036, 0.036, 0.014, blackFrameMat, sx, sy, 0.05);
          addCyl(drv, 0.008, 0.008, 0.01, 10, brushedAlum, sx, sy, 0.059, Math.PI / 2);
        }
      }

      // Half-roll black rubber surround
      const surround = new THREE.Mesh(new THREE.TorusGeometry(0.108, 0.011, 12, 36), rubberSurroundMat);
      surround.position.set(0, 0, 0.052);
      drv.add(surround);

      // Concave matte acoustic cone + satin convex center dust cap
      const cone = new THREE.Mesh(sharedConeGeo, coneFaceMat);
      cone.position.set(0, 0, 0.012);
      cone.castShadow = true;
      drv.add(cone);

      const dustCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.039, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.48),
        dustCapMat
      );
      dustCap.rotation.x = Math.PI / 2;
      dustCap.position.set(0, 0, 0.002);
      drv.add(dustCap);

      // Stamped steel rear basket (front collar, rear collar & 4 tapered radial struts)
      const basketBackRing = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.008, 10, 28), basketSilverMat);
      basketBackRing.position.set(0, 0, -0.025);
      drv.add(basketBackRing);
      for (let s = 0; s < 4; s++) {
        const a = (s / 4) * Math.PI * 2 + Math.PI / 4;
        const strutCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(Math.cos(a) * 0.114, Math.sin(a) * 0.114, 0.044),
          new THREE.Vector3(Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0.008),
          new THREE.Vector3(Math.cos(a) * 0.068, Math.sin(a) * 0.068, -0.026),
        ]);
        const strut = new THREE.Mesh(new THREE.TubeGeometry(strutCurve, 10, 0.0085, 6, false), basketSilverMat);
        drv.add(strut);
      }

      // Warm copper voice-coil neck visible behind basket
      addCyl(drv, 0.044, 0.044, 0.036, 24, woundCopperMat, 0, 0, -0.018, Math.PI / 2);
      // Ferrite ring magnet + brushed steel rear pole plate
      addCyl(drv, 0.072, 0.072, 0.042, 28, magnetDarkMat, 0, 0, -0.05, Math.PI / 2);
      addCyl(drv, 0.066, 0.066, 0.012, 28, brushedAlum, 0, 0, -0.075, Math.PI / 2);
      // Small rear solder terminal tab on bottom-right of basket
      addBox(drv, 0.024, 0.014, 0.012, ceramicMat, 0.074, -0.042, -0.028);

      g4.add(drv);
    });
    registerPart(blueprint.parts[3], g4);

    // ==================== #05: BAHAN PEREDAM (ACOUSTIC DAMPING WOOL) ====================
    const g5 = createPartContainer(blueprint.parts[4]);
    g5.position.set(-0.01, 1.09, -0.115);

    // Base fibrous acoustic batting slab lining rear chamber wall above lower partition
    addBox(g5, 0.34, 1.38, 0.075, woolMat, 0, 0, 0);
    // Layered organic cotton/dacron tufts for authentic fluffy acoustic wool silhouette
    const tuftPositions: Array<[number, number, number, number, number, number]> = [
      [-0.08, 0.56, 0.032, 0.11, 0.13, 0.045],
      [0.07, 0.52, 0.036, 0.105, 0.14, 0.048],
      [-0.06, 0.34, 0.038, 0.12, 0.14, 0.048],
      [0.08, 0.28, 0.032, 0.1, 0.13, 0.045],
      [-0.09, 0.1, 0.034, 0.115, 0.15, 0.048],
      [0.07, 0.06, 0.036, 0.11, 0.14, 0.046],
      [-0.07, -0.14, 0.038, 0.12, 0.15, 0.048],
      [0.08, -0.18, 0.032, 0.105, 0.14, 0.046],
      [-0.08, -0.38, 0.034, 0.115, 0.14, 0.048],
      [0.06, -0.44, 0.03, 0.1, 0.12, 0.042],
      [-0.04, -0.58, 0.032, 0.12, 0.11, 0.044],
      [0.08, -0.6, 0.028, 0.09, 0.1, 0.038],
    ];
    const tuftGeo = new THREE.SphereGeometry(1, 16, 12);
    tuftPositions.forEach(([tx, ty, tz, sx, sy, sz]) => {
      const tuft = new THREE.Mesh(tuftGeo, woolMat);
      tuft.position.set(tx, ty, tz);
      tuft.scale.set(sx, sy, sz);
      g5.add(tuft);
    });
    registerPart(blueprint.parts[4], g5);

    // ==================== #06: SISTEM CROSSOVER (PASSIVE CROSSOVER PCB) ====================
    const g6 = createPartContainer(blueprint.parts[5]);
    g6.position.set(0.088, 0.56, -0.042);

    // Vertical green PCB board mounted behind lower full-range driver
    const pcbBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.115, 0.165, 0.014),
      new THREE.MeshStandardMaterial({ map: crossoverPcbTex, roughness: 0.42, metalness: 0.18 })
    );
    pcbBoard.rotation.y = 0.22;
    pcbBoard.castShadow = true;
    g6.add(pcbBoard);

    const pcbSub = new THREE.Group();
    pcbSub.rotation.y = 0.22;
    g6.add(pcbSub);

    // 4 brass PCB corner mounting standoffs
    for (const px of [-0.046, 0.046]) {
      for (const py of [-0.07, 0.07]) {
        addCyl(pcbSub, 0.006, 0.006, 0.014, 10, copperMat, px, py, 0.008, Math.PI / 2);
      }
    }
    // 2× Shiny copper-wound cylindrical inductor coils
    addCyl(pcbSub, 0.02, 0.02, 0.056, 20, woundCopperMat, 0.024, 0.024, 0.034);
    addCyl(pcbSub, 0.023, 0.023, 0.006, 20, blackFrameMat, 0.024, 0.052, 0.034);
    addCyl(pcbSub, 0.023, 0.023, 0.006, 20, blackFrameMat, 0.024, -0.004, 0.034);

    addCyl(pcbSub, 0.017, 0.017, 0.046, 20, woundCopperMat, -0.022, 0.03, 0.03);
    addCyl(pcbSub, 0.02, 0.02, 0.005, 20, blackFrameMat, -0.022, 0.053, 0.03);
    addCyl(pcbSub, 0.02, 0.02, 0.005, 20, blackFrameMat, -0.022, 0.007, 0.03);

    // 2× Black upright electrolytic capacitors with silver vent caps
    addCyl(pcbSub, 0.012, 0.012, 0.038, 16, blackFrameMat, -0.036, -0.02, 0.025);
    addCyl(pcbSub, 0.011, 0.011, 0.004, 16, brushedAlum, -0.036, -0.001, 0.025);
    addCyl(pcbSub, 0.011, 0.011, 0.032, 16, blackFrameMat, -0.008, -0.024, 0.024);
    addCyl(pcbSub, 0.01, 0.01, 0.004, 16, brushedAlum, -0.008, -0.008, 0.024);

    // White ceramic cement power resistor block
    addBox(pcbSub, 0.044, 0.016, 0.016, ceramicMat, 0.022, -0.026, 0.018);

    // White 4-pin JST wire connector header at bottom edge
    addBox(pcbSub, 0.052, 0.022, 0.024, ceramicMat, 0.005, -0.064, 0.02);
    registerPart(blueprint.parts[5], g6);

    // ==================== #07: SEKAT INTERNAL (ACOUSTIC PARTITION SHELVES) ====================
    const g7 = createPartContainer(blueprint.parts[6]);
    g7.position.set(0, 0.36, -0.01);

    // Main Lower Internal Partition isolating driver chamber from 100V Transformer bay
    addBox(g7, 0.395, 0.016, 0.355, alumCasingMat, 0, 0, 0);
    // Rubber cable pass-through grommet ring on lower partition
    const grommet = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 10, 20), blackFrameMat);
    grommet.rotation.x = Math.PI / 2;
    grommet.position.set(0.065, 0.008, -0.02);
    g7.add(grommet);

    // Upper Internal Divider Shelf separating the Tweeter bay from the 4× Full-Range array
    addBox(g7, 0.385, 0.014, 0.32, alumCasingMat, -0.005, 1.155, 0.012);
    registerPart(blueprint.parts[6], g7);

    // ==================== #08: TRANSFORMATOR MATCHING (100V LINE) ====================
    const g8 = createPartContainer(blueprint.parts[7]);
    g8.position.set(-0.045, 0.21, 0.01);

    // Bolted steel L-foot mounting base resting on cabinet floor
    addBox(g8, 0.225, 0.012, 0.165, brushedAlum, 0, -0.102, 0);
    for (const bx of [-0.095, 0.095]) {
      for (const bz of [-0.062, 0.062]) {
        addCyl(g8, 0.008, 0.008, 0.01, 6, darkSteel, bx, -0.092, bz);
      }
    }
    // Laminated E-I Silicon-Steel Core outer frame (top, bottom, left, right stacks)
    addBox(g8, 0.185, 0.036, 0.138, trafoSteelMat, 0, 0.072, 0);
    addBox(g8, 0.185, 0.036, 0.138, trafoSteelMat, 0, -0.072, 0);
    addBox(g8, 0.038, 0.18, 0.138, trafoSteelMat, -0.074, 0, 0);
    addBox(g8, 0.038, 0.18, 0.138, trafoSteelMat, 0.074, 0, 0);
    // Steel side clamping strap around laminated core
    addBox(g8, 0.192, 0.016, 0.026, brushedAlum, 0, 0.094, 0);
    addBox(g8, 0.012, 0.194, 0.026, brushedAlum, -0.096, 0, 0);
    addBox(g8, 0.012, 0.194, 0.026, brushedAlum, 0.096, 0, 0);
    // Golden-yellow Kapton/Mylar tape-wrapped bobbin winding protruding through core window
    addBox(g8, 0.112, 0.118, 0.172, trafoBobbinMat, 0, 0, 0);
    // Subtle dark insulating bobbin flange lips
    addBox(g8, 0.118, 0.124, 0.008, blackFrameMat, 0, 0, 0.072);
    addBox(g8, 0.118, 0.124, 0.008, blackFrameMat, 0, 0, -0.072);
    registerPart(blueprint.parts[7], g8);

    // ==================== #09: TERMINAL INPUT & SELEKTOR DAYA ====================
    const g9 = createPartContainer(blueprint.parts[8]);
    g9.position.set(0.088, 0.215, -0.145);

    // Black molded flame-retardant input terminal housing
    addBox(g9, 0.118, 0.135, 0.052, blackFrameMat, 0, 0, 0);
    // Red (+) & Black (-) binding posts on front/inner face
    addCyl(g9, 0.014, 0.014, 0.028, 16, redWireMat, -0.026, 0.026, 0.034, Math.PI / 2);
    addCyl(g9, 0.007, 0.007, 0.036, 12, copperMat, -0.026, 0.026, 0.038, Math.PI / 2);
    addCyl(g9, 0.014, 0.014, 0.028, 16, darkSteel, -0.026, -0.026, 0.034, Math.PI / 2);
    addCyl(g9, 0.007, 0.007, 0.036, 12, brushedAlum, -0.026, -0.026, 0.038, Math.PI / 2);
    // Rotary / tap power wattage selector (20W / 10W / 5W / COM)
    addCyl(g9, 0.022, 0.022, 0.018, 18, darkSteel, 0.026, 0.004, 0.03, Math.PI / 2);
    addBox(g9, 0.006, 0.026, 0.008, ceramicMat, 0.026, 0.004, 0.041);
    // Corner mounting screws
    for (const tx of [-0.048, 0.048]) {
      for (const ty of [-0.056, 0.056]) {
        addCyl(g9, 0.006, 0.006, 0.008, 10, brushedAlum, tx, ty, 0.028, Math.PI / 2);
      }
    }
    registerPart(blueprint.parts[8], g9);

    // ==================== #10: KABEL INTERNAL & BRACKET DINDING ====================
    const g10 = createPartContainer(blueprint.parts[9]);
    g10.position.set(0, 0, 0);

    // Heavy-duty brushed aluminum Wall Mounting Brackets (lower & upper rear exterior)
    const addWallBracket = (by: number) => {
      const brk = new THREE.Group();
      brk.position.set(0.18, by, -0.225);
      // Mounting flange plate extending outward
      addBox(brk, 0.125, 0.21, 0.018, alumTrimMat, 0.03, 0, -0.02);
      // Bend flange joining cabinet rear wall
      addBox(brk, 0.022, 0.21, 0.075, alumTrimMat, -0.025, 0, 0.012);
      // Slotted vertical mounting holes (visual dark pill recesses)
      addCyl(brk, 0.011, 0.011, 0.022, 12, darkSteel, 0.058, 0.056, -0.02, Math.PI / 2);
      addCyl(brk, 0.011, 0.011, 0.022, 12, darkSteel, 0.058, -0.056, -0.02, Math.PI / 2);
      // Hex mounting bolts into cabinet spine
      addCyl(brk, 0.009, 0.009, 0.016, 6, brushedAlum, -0.006, 0.056, 0.018, 0, Math.PI / 2);
      addCyl(brk, 0.009, 0.009, 0.016, 6, brushedAlum, -0.006, -0.056, 0.018, 0, Math.PI / 2);
      g10.add(brk);
    };
    addWallBracket(0.22);
    addWallBracket(1.62);

    // Realistic color-coded 3D Internal Wiring Harness (Terminal -> Trafo -> Sekat -> Crossover -> 4x FR -> Tweeter)
    const addWireTube = (pts: THREE.Vector3[], mat: THREE.Material, rad = 0.0065) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, rad, 8, false), mat);
      mesh.castShadow = true;
      g10.add(mesh);
    };

    // Terminal Input -> Matching Transformer (Primary 100V red & black)
    addWireTube(
      [
        new THREE.Vector3(0.062, 0.24, -0.11),
        new THREE.Vector3(0.035, 0.245, -0.055),
        new THREE.Vector3(0.022, 0.23, 0.0),
      ],
      redWireMat
    );
    addWireTube(
      [
        new THREE.Vector3(0.062, 0.19, -0.11),
        new THREE.Vector3(0.038, 0.19, -0.05),
        new THREE.Vector3(0.022, 0.185, 0.0),
      ],
      blkWireMat
    );

    // Matching Transformer Secondary -> up through Lower Partition Grommet -> Crossover PCB JST Header
    addWireTube(
      [
        new THREE.Vector3(0.01, 0.27, 0.02),
        new THREE.Vector3(0.058, 0.31, -0.015),
        new THREE.Vector3(0.064, 0.37, -0.02),
        new THREE.Vector3(0.082, 0.44, -0.018),
        new THREE.Vector3(0.088, 0.495, -0.022),
      ],
      redWireMat
    );
    addWireTube(
      [
        new THREE.Vector3(0.018, 0.255, 0.005),
        new THREE.Vector3(0.068, 0.305, -0.022),
        new THREE.Vector3(0.072, 0.37, -0.026),
        new THREE.Vector3(0.095, 0.44, -0.024),
        new THREE.Vector3(0.102, 0.495, -0.025),
      ],
      blkWireMat
    );

    // Crossover PCB -> Daisy-chain vertically behind 4× Full-Range Drivers -> Top Tweeter
    addWireTube(
      [
        new THREE.Vector3(0.078, 0.495, -0.02),
        new THREE.Vector3(0.062, 0.47, 0.028),
        new THREE.Vector3(0.064, 0.52, 0.038),
        new THREE.Vector3(0.068, 0.80, 0.038),
        new THREE.Vector3(0.068, 1.08, 0.038),
        new THREE.Vector3(0.068, 1.36, 0.038),
        new THREE.Vector3(0.062, 1.52, 0.032),
        new THREE.Vector3(0.045, 1.65, 0.035),
      ],
      redWireMat,
      0.0058
    );
    addWireTube(
      [
        new THREE.Vector3(0.092, 0.495, -0.02),
        new THREE.Vector3(0.074, 0.465, 0.024),
        new THREE.Vector3(0.076, 0.52, 0.032),
        new THREE.Vector3(0.078, 0.80, 0.032),
        new THREE.Vector3(0.078, 1.08, 0.032),
        new THREE.Vector3(0.078, 1.36, 0.032),
        new THREE.Vector3(0.072, 1.52, 0.026),
        new THREE.Vector3(0.052, 1.64, 0.028),
      ],
      blkWireMat,
      0.0058
    );
    addWireTube(
      [
        new THREE.Vector3(0.106, 0.495, -0.022),
        new THREE.Vector3(0.088, 0.47, 0.012),
        new THREE.Vector3(0.085, 0.62, 0.018),
        new THREE.Vector3(0.085, 0.94, 0.018),
        new THREE.Vector3(0.085, 1.24, 0.018),
        new THREE.Vector3(0.072, 1.54, 0.018),
        new THREE.Vector3(0.048, 1.66, 0.02),
      ],
      whtWireMat,
      0.005
    );
    registerPart(blueprint.parts[9], g10);

    // ==================== LIVE SIGNAL FLOW STREAMS & LINE-ARRAY WAVEFRONTS ====================
    // Stream 1: Cyan 100V Line input from Terminal -> Matching Transformer
    streams.push(
      buildSignalStream(
        wiresGroup,
        [
          new THREE.Vector3(0.09, 0.22, -0.24),
          new THREE.Vector3(0.085, 0.22, -0.13),
          new THREE.Vector3(0.03, 0.22, -0.04),
          new THREE.Vector3(-0.04, 0.21, 0.01),
        ],
        0x38bdf8,
        3,
        0.55
      ),
      // Stream 2: Amber Step-Down 8Ω signal from Trafo -> through Sekat Internal -> Crossover PCB
      buildSignalStream(
        wiresGroup,
        [
          new THREE.Vector3(-0.01, 0.25, 0.02),
          new THREE.Vector3(0.065, 0.36, -0.02),
          new THREE.Vector3(0.09, 0.54, -0.03),
        ],
        0xf59e0b,
        3,
        0.62
      ),
      // Stream 3: Emerald/Gold filtered audio rising from Crossover -> 4× Full-Range Array -> Top Tweeter
      buildSignalStream(
        wiresGroup,
        [
          new THREE.Vector3(0.085, 0.56, -0.01),
          new THREE.Vector3(0.072, 0.52, 0.042),
          new THREE.Vector3(0.072, 0.80, 0.042),
          new THREE.Vector3(0.072, 1.08, 0.042),
          new THREE.Vector3(0.072, 1.36, 0.042),
          new THREE.Vector3(0.052, 1.66, 0.042),
        ],
        0x34d399,
        6,
        0.5
      )
    );

    // Vertical Line-Array forward-radiating acoustic wavefront arcs (+Z)
    const waveGroup = new THREE.Group();
    waveGroup.position.set(0, 1.06, 0.24);
    wiresGroup.add(waveGroup);

    const waveArcs: THREE.Mesh[] = [];
    const colWaveColors = [0xffdb00, 0x38bdf8, 0x34d399, 0xffdb00];
    for (let w = 0; w < 4; w++) {
      const arcMat = new THREE.MeshBasicMaterial({
        color: colWaveColors[w],
        transparent: true,
        opacity: 0.65,
      });
      // Vertical elliptical wavefront arc representing focused horizontal line-array dispersion
      const arcMesh = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.007, 8, 36, Math.PI * 1.15), arcMat);
      arcMesh.rotation.z = -Math.PI * 0.575;
      arcMesh.rotation.y = Math.PI / 2;
      arcMesh.userData.isSignalEffect = true;
      arcMesh.userData.arcPhase = w * 0.25;
      waveGroup.add(arcMesh);
      waveArcs.push(arcMesh);
    }

    columnAnim = {
      tweeterPart: builtParts[2],
      fullRangePart: builtParts[3],
      grillePart: builtParts[0],
      waveGroup,
      waveArcs,
    };
  } else if (kind === 'fids_kiosk') {
    // 01: Portrait 55" Industrial LCD Panel
    const g1 = createPartContainer(blueprint.parts[0]);
    g1.position.set(0, 1.05, 0.12);
    addBox(g1, 0.72, 1.18, 0.038, darkSteel);
    const fidsTex = makeScreenTexture('fids', maxAnisotropy);
    textures.push(fidsTex);
    addBox(
      g1,
      0.66,
      1.1,
      0.01,
      new THREE.MeshStandardMaterial({ map: fidsTex, emissiveMap: fidsTex, emissive: 0xffffff, emissiveIntensity: 0.45 }),
      0,
      0,
      0.021
    );
    registerPart(blueprint.parts[0], g1);

    // 02: T-Con & Scaler Video PCB
    const g2 = createPartContainer(blueprint.parts[1]);
    g2.position.set(0.12, 1.16, 0.02);
    const pcbTex = makePcbTexture('T-CON / SCALER', '#10b981', maxAnisotropy);
    textures.push(pcbTex);
    addBox(g2, 0.36, 0.24, 0.025, new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.45, metalness: 0.25 }));
    registerPart(blueprint.parts[1], g2);

    // 03: Internal 8-Port GbE LAN Switch
    const g3 = createPartContainer(blueprint.parts[2]);
    g3.position.set(-0.16, 0.8, -0.02);
    addBox(g3, 0.28, 0.075, 0.18, blueSwitch);
    for (let p = 0; p < 8; p++) {
      addBox(g3, 0.022, 0.02, 0.015, brushedAlum, -0.105 + p * 0.03, 0, 0.092);
    }
    registerPart(blueprint.parts[2], g3);

    // 04: Industrial Mini PC Media Player
    const g4 = createPartContainer(blueprint.parts[3]);
    g4.position.set(0.18, 0.76, -0.02);
    addBox(g4, 0.24, 0.22, 0.08, new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.38, metalness: 0.65 }));
    addBox(g4, 0.2, 0.02, 0.085, brushedAlum, 0, 0.07, 0);
    addBox(g4, 0.2, 0.02, 0.085, brushedAlum, 0, 0.02, 0);
    registerPart(blueprint.parts[3], g4);

    // 05: PSU 220V + Dual Fans
    const g5 = createPartContainer(blueprint.parts[4]);
    g5.position.set(0, 0.36, -0.02);
    addBox(g5, 0.42, 0.16, 0.14, new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4, metalness: 0.7 }));
    addCyl(g5, 0.06, 0.06, 0.03, 18, darkSteel, -0.14, 0, -0.08, Math.PI / 2);
    addCyl(g5, 0.06, 0.06, 0.03, 18, darkSteel, 0.14, 0, -0.08, Math.PI / 2);
    registerPart(blueprint.parts[4], g5);

    // 06: Standing Steel Totem Cabinet & Rear Door
    const g6 = createPartContainer(blueprint.parts[5]);
    g6.position.set(0, 0.9, -0.14);
    addBox(g6, 0.82, 1.72, 0.06, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.68 }));
    addBox(g6, 0.92, 0.06, 0.44, darkSteel, 0, -0.86, 0.12);
    registerPart(blueprint.parts[5], g6);

    streams.push(
      buildSignalStream(
        wiresGroup,
        [new THREE.Vector3(-0.16, 0.8, 0.06), new THREE.Vector3(0.02, 0.78, 0.06), new THREE.Vector3(0.18, 0.76, 0.04)],
        0x38bdf8,
        3,
        0.55
      ),
      buildSignalStream(
        wiresGroup,
        [new THREE.Vector3(0.18, 0.86, 0.02), new THREE.Vector3(0.14, 1.04, 0.04), new THREE.Vector3(0.06, 1.16, 0.08)],
        0x10b981,
        3,
        0.5
      ),
      buildSignalStream(
        wiresGroup,
        [new THREE.Vector3(-0.16, 0.84, 0), new THREE.Vector3(-0.16, 1.32, -0.02), new THREE.Vector3(-0.16, 1.72, -0.02)],
        0xf59e0b,
        3,
        0.48
      )
    );
  } else if (kind === 'master_clock') {
    // 01: Front Red LED Dot-Matrix Panel
    const g1 = createPartContainer(blueprint.parts[0]);
    g1.position.set(0, 0.48, 0.12);
    addBox(g1, 0.92, 0.34, 0.028, darkSteel);
    const clkTex = makeScreenTexture('clock', maxAnisotropy);
    textures.push(clkTex);
    addBox(
      g1,
      0.86,
      0.28,
      0.01,
      new THREE.MeshStandardMaterial({ map: clkTex, emissiveMap: clkTex, emissive: 0xffffff, emissiveIntensity: 0.55 }),
      0,
      0,
      0.016
    );
    registerPart(blueprint.parts[0], g1);

    // 02: GPS/GNSS Receiver Module
    const g2 = createPartContainer(blueprint.parts[1]);
    g2.position.set(-0.28, 0.5, 0);
    addBox(g2, 0.22, 0.16, 0.06, blueSwitch);
    addCyl(g2, 0.016, 0.016, 0.12, 12, copperMat, -0.05, 0.13, 0);
    registerPart(blueprint.parts[1], g2);

    // 03: Shielded OCXO Oscillator Can
    const g3 = createPartContainer(blueprint.parts[2]);
    g3.position.set(0, 0.5, 0);
    addBox(g3, 0.18, 0.16, 0.1, brushedAlum);
    addBox(g3, 0.12, 0.04, 0.11, copperMat, 0, 0, 0);
    registerPart(blueprint.parts[2], g3);

    // 04: NTP Server LAN Board
    const g4 = createPartContainer(blueprint.parts[3]);
    g4.position.set(0.28, 0.5, -0.02);
    const pcbTex = makePcbTexture('NTP STRATUM-1', '#10b981', maxAnisotropy);
    textures.push(pcbTex);
    addBox(g4, 0.24, 0.18, 0.03, new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.45 }));
    addBox(g4, 0.05, 0.045, 0.05, blueSwitch, 0.06, 0, -0.03);
    registerPart(blueprint.parts[3], g4);

    // 05: PoE PSU & Supercap Backup
    const g5 = createPartContainer(blueprint.parts[4]);
    g5.position.set(0, 0.34, -0.02);
    addBox(g5, 0.42, 0.075, 0.12, new THREE.MeshStandardMaterial({ color: 0x4338ca, roughness: 0.42, metalness: 0.5 }));
    addCyl(g5, 0.03, 0.03, 0.06, 16, copperMat, 0.14, 0.05, 0);
    registerPart(blueprint.parts[4], g5);

    // 06: Anodized Aluminum Housing
    const g6 = createPartContainer(blueprint.parts[5]);
    g6.position.set(0, 0.48, -0.12);
    addBox(g6, 0.98, 0.4, 0.06, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.78 }));
    registerPart(blueprint.parts[5], g6);

    streams.push(
      buildSignalStream(
        wiresGroup,
        [new THREE.Vector3(-0.28, 0.5, 0), new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0.28, 0.5, -0.02)],
        0x38bdf8,
        4,
        0.55
      )
    );
  } else if (kind === 'bids_display') {
    // 01: 55" Landscape IPS Display (Belt 7)
    const g1 = createPartContainer(blueprint.parts[0]);
    g1.position.set(0, 0.74, 0.12);
    addBox(g1, 1.32, 0.78, 0.038, darkSteel);
    const bidsTex = makeScreenTexture('bids', maxAnisotropy);
    textures.push(bidsTex);
    addBox(
      g1,
      1.26,
      0.72,
      0.01,
      new THREE.MeshStandardMaterial({ map: bidsTex, emissiveMap: bidsTex, emissive: 0xffffff, emissiveIntensity: 0.48 }),
      0,
      0,
      0.021
    );
    registerPart(blueprint.parts[0], g1);

    // 02: Mainboard SoC Media Player
    const g2 = createPartContainer(blueprint.parts[1]);
    g2.position.set(0.26, 0.76, 0.02);
    const pcbTex = makePcbTexture('BIDS SOC PLAYER', '#10b981', maxAnisotropy);
    textures.push(pcbTex);
    addBox(g2, 0.38, 0.28, 0.024, new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.45 }));
    registerPart(blueprint.parts[1], g2);

    // 03: PSU & LED Backlight Driver
    const g3 = createPartContainer(blueprint.parts[2]);
    g3.position.set(-0.26, 0.76, 0.02);
    const psuTex = makePcbTexture('PSU / LED DRV', '#f59e0b', maxAnisotropy);
    textures.push(psuTex);
    addBox(g3, 0.38, 0.28, 0.028, new THREE.MeshStandardMaterial({ map: psuTex, roughness: 0.45 }));
    registerPart(blueprint.parts[2], g3);

    // 04: Recessed Rear I/O Bay (IEC, HDMI, LAN)
    const g4 = createPartContainer(blueprint.parts[3]);
    g4.position.set(0, 0.56, -0.06);
    addBox(g4, 0.44, 0.14, 0.06, darkSteel);
    addBox(g4, 0.055, 0.045, 0.05, blueSwitch, 0.12, 0, -0.04); // RJ45 LAN
    addBox(g4, 0.065, 0.026, 0.045, copperMat, 0, 0, -0.04); // HDMI
    addBox(g4, 0.07, 0.048, 0.05, ferriteMat, -0.12, 0, -0.04); // IEC AC
    registerPart(blueprint.parts[3], g4);

    // 05: Dual-Channel Steel VESA Keyhole Bracket
    const g5 = createPartContainer(blueprint.parts[4]);
    g5.position.set(0, 0.74, -0.2);
    addBox(g5, 0.94, 0.08, 0.04, brushedAlum, 0, 0.22, 0);
    addBox(g5, 0.94, 0.08, 0.04, brushedAlum, 0, -0.22, 0);
    addBox(g5, 0.07, 0.56, 0.045, darkSteel, -0.26, 0, 0.01);
    addBox(g5, 0.07, 0.56, 0.045, darkSteel, 0.26, 0, 0.01);
    registerPart(blueprint.parts[4], g5);

    // 06: Ventilated Rear Steel Chassis
    const g6 = createPartContainer(blueprint.parts[5]);
    g6.position.set(0, 0.74, -0.1);
    addBox(g6, 1.28, 0.74, 0.045, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.65 }));
    registerPart(blueprint.parts[5], g6);

    streams.push(
      buildSignalStream(
        wiresGroup,
        [new THREE.Vector3(0.12, 0.56, -0.08), new THREE.Vector3(0.24, 0.72, 0.02), new THREE.Vector3(0.04, 0.74, 0.1)],
        0x38bdf8,
        3,
        0.55
      ),
      buildSignalStream(
        wiresGroup,
        [new THREE.Vector3(-0.12, 0.56, -0.08), new THREE.Vector3(-0.24, 0.74, 0.02), new THREE.Vector3(-0.08, 0.74, 0.1)],
        0xf59e0b,
        3,
        0.5
      )
    );
  } else {
    // Generic High-Detail 5-Part Industrial Electronics Module Cutaway
    // 01: Input / Sensor Stage
    const g1 = createPartContainer(blueprint.parts[0]);
    g1.position.set(-0.26, 0.54, 0.08);
    addBox(g1, 0.34, 0.16, 0.28, blueSwitch);
    addCyl(g1, 0.06, 0.06, 0.08, 20, brushedAlum, -0.18, 0, 0.06, 0, Math.PI / 2);
    addCyl(g1, 0.045, 0.045, 0.02, 20, new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.75 }), -0.22, 0, 0.06, 0, Math.PI / 2);
    registerPart(blueprint.parts[0], g1);

    // 02: Mainboard Control PCB
    const g2 = createPartContainer(blueprint.parts[1]);
    g2.position.set(0, 0.44, 0);
    const pcbTex = makePcbTexture(`${blueprint.deviceCode} MAIN PCB`, '#10b981', maxAnisotropy);
    textures.push(pcbTex);
    addBox(g2, 0.86, 0.032, 0.62, new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.42, metalness: 0.28 }));
    buildIcDetails(g2, 0.86, 0.62, 0.016, 6);
    registerPart(blueprint.parts[1], g2);

    // 03: Output Driver & Actuator Stage
    const g3 = createPartContainer(blueprint.parts[2]);
    g3.position.set(0.28, 0.54, 0.06);
    addBox(g3, 0.32, 0.16, 0.32, new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 0.38, metalness: 0.55 }));
    for (let f = 0; f < 5; f++) {
      addBox(g3, 0.28, 0.05, 0.016, brushedAlum, 0, 0.1, -0.11 + f * 0.055);
    }
    registerPart(blueprint.parts[2], g3);

    // 04: Power Regulator & Protection Stage
    const g4 = createPartContainer(blueprint.parts[3]);
    g4.position.set(0, 0.32, -0.18);
    addBox(g4, 0.66, 0.12, 0.22, new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.42, metalness: 0.65 }));
    const toroid = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.025, 12, 24), copperMat);
    toroid.rotation.x = Math.PI / 2;
    toroid.position.set(-0.18, 0.08, 0);
    g4.add(toroid);
    addBox(g4, 0.16, 0.05, 0.08, greenPhoenix, 0.2, 0.06, -0.1);
    registerPart(blueprint.parts[3], g4);

    // 05: Industrial Finned Enclosure Cover
    const g5 = createPartContainer(blueprint.parts[4]);
    g5.position.set(0, 0.52, 0);
    const encMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.45,
      metalness: 0.72,
      transparent: true,
      opacity: 0.86,
    });
    addBox(g5, 0.98, 0.04, 0.74, darkSteel, 0, -0.26, 0);
    addBox(g5, 0.98, 0.05, 0.74, encMat, 0, 0.24, 0);
    addBox(g5, 0.03, 0.48, 0.72, encMat, -0.48, 0, 0);
    addBox(g5, 0.03, 0.48, 0.72, encMat, 0.48, 0, 0);
    registerPart(blueprint.parts[4], g5);

    streams.push(
      buildSignalStream(
        wiresGroup,
        [new THREE.Vector3(-0.26, 0.54, 0.08), new THREE.Vector3(0, 0.48, 0), new THREE.Vector3(0.28, 0.54, 0.06)],
        0x38bdf8,
        4,
        0.55
      ),
      buildSignalStream(
        wiresGroup,
        [new THREE.Vector3(0, 0.34, -0.18), new THREE.Vector3(0, 0.44, -0.06), new THREE.Vector3(0.24, 0.5, 0.02)],
        0xf59e0b,
        3,
        0.48
      )
    );
  }

  return {
    root,
    parts: builtParts,
    partMap,
    wiresGroup,
    streams,
    ceilingAnim,
    columnAnim,
    dispose: () => {
      textures.forEach((t) => t.dispose());
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    },
  };
}

export function applyDissectionRuntimeVisuals(
  model: BuiltDissectionModel,
  params: DissectionSimParams,
  telemetryMap: Record<string, DissectionPartTelemetry>,
  selectedPartId: string | null,
  hoveredPartId: string | null,
  signalBlocked: boolean,
  delta: number,
  elapsed: number,
  audioBoost = 0
): void {
  const lambda = 9.5;
  const totalParts = model.parts.length;
  const ceilingActive =
    Boolean(model.ceilingAnim) && !signalBlocked && params.showSignalFlow && params.assemblyProgress > 0.75;
  const columnActive =
    Boolean(model.columnAnim) && !signalBlocked && params.showSignalFlow && params.assemblyProgress > 0.75;
  const excursionFreq = 22 + (params.workloadPercent / 100) * 14 + audioBoost * 10;
  const excursionAmp =
    ceilingActive || columnActive
      ? 0.012 + (params.workloadPercent / 100) * 0.016 + audioBoost * 0.026
      : 0;
  const excursionOffset = excursionAmp > 0 ? Math.sin(elapsed * excursionFreq) * excursionAmp : 0;

  for (let i = 0; i < totalParts; i++) {
    const bp = model.parts[i];
    const spec = bp.spec;
    const tel = telemetryMap[spec.id];
    const isSelected = selectedPartId !== null && spec.id === selectedPartId;
    const isHovered = spec.id === hoveredPartId;
    const isFault = tel?.status === 'FAULT';
    const isWarning = tel?.status === 'WARNING';

    // Staggered Timelapse Assembly progression (0 -> 1)
    const sliceStart = (i / Math.max(1, totalParts)) * 0.65;
    const sliceEnd = sliceStart + 0.35;
    const localAssembly = THREE.MathUtils.clamp(
      (params.assemblyProgress - sliceStart) / (sliceEnd - sliceStart),
      0,
      1
    );
    const invAssembly = 1 - localAssembly;

    const casingExtra = spec.isOuterCasing && params.casingDetached ? 1.45 : 0;
    const explodeMul = params.explodedFactor + casingExtra;

    let extraX = 0;
    let extraZ = 0;
    if (model.ceilingAnim && excursionOffset !== 0) {
      if (bp === model.ceilingAnim.voiceCoilPart || bp === model.ceilingAnim.conePart) {
        extraX = excursionOffset;
      } else if (bp === model.ceilingAnim.spiderPart) {
        extraX = excursionOffset * 0.45;
      }
    }
    if (model.columnAnim && excursionOffset !== 0) {
      if (bp === model.columnAnim.fullRangePart) {
        extraZ = excursionOffset * 0.65;
      } else if (bp === model.columnAnim.tweeterPart) {
        extraZ = Math.sin(elapsed * excursionFreq * 1.85) * excursionAmp * 0.35;
      }
    }

    const prevHoverFactor = (bp.group.userData.hoverFactor as number) ?? 0;
    const hoverFactor = THREE.MathUtils.damp(prevHoverFactor, isHovered ? 1 : 0, 13, delta);
    bp.group.userData.hoverFactor = hoverFactor;
    const hoverFloatY = hoverFactor * (0.015 + Math.sin(elapsed * 5.8) * 0.004);

    const targetX = bp.basePos.x + spec.explodeOffset[0] * explodeMul + spec.assemblyOffset[0] * invAssembly + extraX;
    const targetY = bp.basePos.y + spec.explodeOffset[1] * explodeMul + spec.assemblyOffset[1] * invAssembly + hoverFloatY;
    const targetZ = bp.basePos.z + spec.explodeOffset[2] * explodeMul + spec.assemblyOffset[2] * invAssembly + extraZ;

    bp.group.position.x = THREE.MathUtils.damp(bp.group.position.x, targetX, lambda, delta);
    bp.group.position.y = THREE.MathUtils.damp(bp.group.position.y, targetY, lambda, delta);
    bp.group.position.z = THREE.MathUtils.damp(bp.group.position.z, targetZ, lambda, delta);

    const visibleScale = localAssembly < 0.02 ? 0.001 : 1;
    bp.group.visible = localAssembly > 0.01 && !(spec.isOuterCasing && params.casingDetached && params.visualMode === 'xray');
    bp.group.scale.setScalar(visibleScale * (1 + hoverFactor * 0.042));

    // Rendering mode & Selection / Fault Emissive Highlight
    for (const mesh of bp.meshes) {
      const orig = bp.originalMaterials.get(mesh);
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const rawMat of mats) {
        const mat = rawMat as THREE.MeshStandardMaterial;
        if (params.visualMode === 'wireframe') {
          mat.wireframe = true;
          mat.transparent = false;
          mat.opacity = 1;
          mat.depthWrite = true;
        } else if (params.visualMode === 'xray') {
          mat.wireframe = false;
          mat.transparent = true;
          mat.opacity = isSelected ? 0.82 : spec.isOuterCasing ? 0.14 : 0.34;
          mat.depthWrite = isSelected;
        } else {
          mat.wireframe = orig?.wireframe ?? false;
          if (spec.isOuterCasing && params.casingDetached) {
            mat.transparent = true;
            mat.opacity = 0.25;
            mat.depthWrite = false;
          } else {
            mat.transparent = orig?.transparent ?? false;
            mat.opacity = orig?.opacity ?? 1;
            mat.depthWrite = orig?.depthWrite ?? true;
          }
        }

        // Preserve emissive maps (live screens), otherwise tint selection/fault cleanly
        if (!mat.emissiveMap) {
          if (isFault) {
            const pulse = 0.35 + Math.abs(Math.sin(elapsed * 6.5)) * 0.45;
            mat.emissive.setHex(0xef4444);
            mat.emissiveIntensity = pulse;
          } else if (isSelected) {
            mat.emissive.setHex(0xffdb00);
            mat.emissiveIntensity = 0.22;
          } else if (isHovered) {
            mat.emissive.setHex(0xffdb00);
            mat.emissiveIntensity = 0.16 + Math.sin(elapsed * 6.5) * 0.05;
          } else if (isWarning) {
            mat.emissive.setHex(0xf59e0b);
            mat.emissiveIntensity = 0.18;
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      }
    }
  }

  // Wires & Animated Internal Signal Packets
  model.wiresGroup.visible = params.showInternalWires && params.assemblyProgress > 0.72;
  const speedScale = 0.65 + (params.workloadPercent / 100) * 1.1 + audioBoost * 0.75;

  for (const stream of model.streams) {
    const tubeMat = stream.tube.material as THREE.MeshStandardMaterial;
    if (signalBlocked) {
      tubeMat.color.setHex(0xef4444);
      tubeMat.emissive.setHex(0xef4444);
      tubeMat.emissiveIntensity = 0.25 + Math.abs(Math.sin(elapsed * 5)) * 0.35;
    } else {
      tubeMat.emissiveIntensity = params.showSignalFlow ? 0.38 : 0.12;
    }

    for (let i = 0; i < stream.packets.length; i++) {
      const pkt = stream.packets[i];
      pkt.visible = params.showSignalFlow && !signalBlocked && model.wiresGroup.visible;
      if (pkt.visible) {
        const t = (elapsed * stream.speed * speedScale + stream.phaseOffsets[i]) % 1;
        stream.curve.getPointAt(t, _tmpVec);
        pkt.position.copy(_tmpVec);
      }
    }
  }

  // Dedicated Ceiling Speaker 100V Input Sparks & Multi-Color Acoustic Output Waves
  if (model.ceilingAnim) {
    const anim = model.ceilingAnim;
    // Keep Left 100V Input anchored to #01 Trafo Matching
    anim.inputGroup.position.x = anim.trafoPart.group.position.x;
    anim.inputGroup.visible = params.assemblyProgress > 0.72;

    const showWaves = params.showSignalFlow && !signalBlocked && params.assemblyProgress > 0.72;
    for (let i = 0; i < anim.inputSparks.length; i++) {
      const sp = anim.inputSparks[i];
      sp.visible = showWaves;
      if (showWaves) {
        const phase = (elapsed * 1.45 * speedScale + (sp.userData.sparkOffset as number)) % 1;
        sp.position.x = THREE.MathUtils.lerp(-0.74, -0.24, phase);
        const s = 0.75 + Math.sin(phase * Math.PI) * (0.65 + audioBoost * 0.45);
        sp.scale.setScalar(s);
        const mat = sp.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.sin(phase * Math.PI) * (0.75 + audioBoost * 0.25);
      }
    }

    // Keep Right Output Acoustic Waves anchored smoothly to #06 Grille (or #05 Cone if grille detached)
    const anchorX = params.casingDetached
      ? anim.conePart.group.position.x + 0.12
      : anim.grillePart.group.position.x + 0.04;
    anim.outputGroup.position.x = anchorX;
    anim.outputGroup.visible = showWaves;

    if (showWaves) {
      for (let w = 0; w < anim.waveRibbons.length; w++) {
        const ribbon = anim.waveRibbons[w];
        const idx = ribbon.userData.waveIndex as number;
        const ampScale = 0.78 + (params.workloadPercent / 100) * 0.42 + audioBoost * 0.55;
        ribbon.scale.set(
          0.95 + Math.sin(elapsed * 4.5 + idx) * 0.08,
          ampScale * (0.88 + Math.sin(elapsed * 9.5 + idx * 1.4) * 0.22),
          ampScale * (0.88 + Math.cos(elapsed * 8.2 + idx) * 0.22)
        );
        ribbon.rotation.x = (idx - 1) * 0.78 + elapsed * (0.65 + idx * 0.18);
        const mat = ribbon.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.clamp(0.58 + audioBoost * 0.35 + Math.sin(elapsed * 6 + idx) * 0.15, 0.2, 0.96);
      }

      for (let r = 0; r < anim.waveRings.length; r++) {
        const ring = anim.waveRings[r];
        const phase = (elapsed * 0.78 * speedScale + (ring.userData.ringPhase as number)) % 1;
        ring.position.x = 0.06 + phase * 0.82;
        const radiusScale = 0.55 + phase * (1.55 + audioBoost * 0.45);
        ring.scale.set(1, radiusScale, radiusScale);
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.sin(phase * Math.PI) * (0.62 + audioBoost * 0.32);
      }
    }
  }

  // Dedicated Column Speaker Line-Array Forward Acoustic Wavefront Arcs
  if (model.columnAnim) {
    const canim = model.columnAnim;
    const showColWaves = params.showSignalFlow && !signalBlocked && params.assemblyProgress > 0.72;
    canim.waveGroup.visible = showColWaves;
    canim.waveGroup.position.x = canim.fullRangePart.group.position.x;
    canim.waveGroup.position.z = canim.fullRangePart.group.position.z + 0.14;

    if (showColWaves) {
      for (let w = 0; w < canim.waveArcs.length; w++) {
        const arc = canim.waveArcs[w];
        const phase = (elapsed * 0.72 * speedScale + (arc.userData.arcPhase as number)) % 1;
        arc.position.z = 0.05 + phase * 0.68;
        const horizSpread = 0.75 + phase * (1.55 + audioBoost * 0.45);
        const vertHeight = 1.65 + phase * 0.35; // Narrow vertical, wide horizontal line-array dispersion!
        arc.scale.set(horizSpread, vertHeight, horizSpread);
        const mat = arc.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.sin(phase * Math.PI) * (0.52 + audioBoost * 0.38);
      }
    }
  }
}

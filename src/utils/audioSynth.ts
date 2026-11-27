// Zero-dependency procedural Web Audio synthesizer for ElBan working-principle simulations

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTone(
  freq: number,
  duration = 0.14,
  type: OscillatorType = 'sine',
  gainPeak = 0.08
): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playAirportChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6 airport chime
  notes.forEach((freq, idx) => {
    const now = ctx.currentTime + idx * 0.2;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.48);
  });
}

export function playMetalAlarm(): void {
  playTone(2400, 0.12, 'square', 0.05);
  window.setTimeout(() => playTone(2400, 0.18, 'square', 0.05), 160);
}

export function playAccessGranted(): void {
  playTone(880, 0.09, 'sine', 0.07);
  window.setTimeout(() => playTone(1318.5, 0.14, 'sine', 0.07), 100);
}

export function playAccessDenied(): void {
  playTone(220, 0.14, 'sawtooth', 0.06);
  window.setTimeout(() => playTone(185, 0.2, 'sawtooth', 0.06), 150);
}

export function playFireAlarmPulse(): void {
  playTone(960, 0.18, 'sawtooth', 0.05);
  window.setTimeout(() => playTone(720, 0.18, 'sawtooth', 0.05), 210);
  window.setTimeout(() => playTone(960, 0.18, 'sawtooth', 0.05), 420);
}

export function playRadioSquelch(start: boolean): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (start) {
    playTone(1200, 0.06, 'sine', 0.06);
    window.setTimeout(() => playTone(1650, 0.05, 'sine', 0.05), 65);
  } else {
    // Roger beep
    playTone(1480, 0.07, 'sine', 0.05);
  }
}

export function playLogbookConfirm(): void {
  playTone(587.33, 0.08, 'triangle', 0.07);
  window.setTimeout(() => playTone(880, 0.13, 'triangle', 0.07), 85);
}

export function playSwitchClick(turnedOn: boolean): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(turnedOn ? 1180 : 780, now);
  osc.frequency.exponentialRampToValueAtTime(turnedOn ? 460 : 320, now + 0.032);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.09, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}

export function playPttClick(pressed: boolean): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(pressed ? 940 : 620, now);
  osc.frequency.exponentialRampToValueAtTime(pressed ? 1320 : 440, now + 0.045);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}

export function playSpeakerTestTone(speakerType: 'ceiling' | 'column' | 'horn'): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (speakerType === 'ceiling') {
    // Warm soft 6W indoor terminal ceiling chime
    [659.25, 880.0].forEach((freq, idx) => {
      playReverbNote(ctx, freq, idx * 0.16, 0.42, 'sine', 0.075);
    });
  } else if (speakerType === 'column') {
    // Balanced 20W concourse line-array chime
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      playReverbNote(ctx, freq, idx * 0.14, 0.38, 'triangle', 0.085);
    });
  } else {
    // Crisp high-SPL 30W outdoor IP65 re-entrant horn attention tone
    [1046.5, 1318.5, 1046.5].forEach((freq, idx) => {
      playReverbNote(ctx, freq, idx * 0.14, 0.24, 'sawtooth', 0.055);
    });
  }
}

// =========================================================================
// PUBLIC ADDRESS SYSTEM (PAS / AAS) ZONE-BASED AUDIO SIMULATION ENGINE
// =========================================================================

export type PasBroadcastMode = 'boarding' | 'security' | 'baggage' | 'emergency';

export interface PasBroadcastPreset {
  mode: PasBroadcastMode;
  label_id: string;
  label_en: string;
  tag: string;
  script_id: string;
  script_en: string;
  isEmergency?: boolean;
}

export const PAS_BROADCAST_PRESETS: Record<PasBroadcastMode, PasBroadcastPreset> = {
  boarding: {
    mode: 'boarding',
    label_id: 'Panggilan Boarding (AAS)',
    label_en: 'Boarding Call (AAS)',
    tag: 'GA 402 · GATE A04',
    script_id:
      'Perhatian. Penumpang Garuda Indonesia penerbangan G A 4 0 2 tujuan Denpasar, dipersilakan menuju pintu keberangkatan A 0 4 untuk proses boarding.',
    script_en:
      'Attention please. Passengers of Garuda Indonesia flight G A 4 0 2 to Denpasar, please proceed to boarding gate A 0 4.',
  },
  security: {
    mode: 'security',
    label_id: 'Imbauan Pemeriksaan SCP',
    label_en: 'SCP Security Advisory',
    tag: 'SCP · X-RAY & WTMD',
    script_id:
      'Perhatian kepada seluruh penumpang di area Security Checkpoint. Harap keluarkan laptop, ponsel, dan benda logam sebelum melewati mesin X-Ray dan WTMD.',
    script_en:
      'Attention passengers at the Security Checkpoint. Please remove laptops, phones, and metallic items before entering the X-Ray and metal detector.',
  },
  baggage: {
    mode: 'baggage',
    label_id: 'Info Bagasi Kedatangan (BIDS)',
    label_en: 'Baggage Claim Info (BIDS)',
    tag: 'BELT 03 · GA 401',
    script_id:
      'Informasi bagasi kedatangan. Bagasi penumpang penerbangan G A 4 0 1 dari Denpasar kini telah tersedia di Conveyor Belt 0 3.',
    script_en:
      'Baggage claim announcement. Luggage for flight G A 4 0 1 from Denpasar is now arriving on Baggage Belt 0 3.',
  },
  emergency: {
    mode: 'emergency',
    label_id: 'Evakuasi Darurat (All-Zone)',
    label_en: 'Emergency Override (All-Zone)',
    tag: 'MCFA PRIORITY · ALL CALL',
    script_id:
      'Perhatian darurat. Sistem keamanan gedung mendeteksi kondisi siaga. Harap tetap tenang dan ikuti jalur evakuasi menuju titik kumpul terdekat.',
    script_en:
      'Emergency attention. Building safety alert activated. Please remain calm and follow illuminated exit routes to the nearest assembly point.',
    isEmergency: true,
  },
};

let activePasTimers: number[] = [];

export function stopPasBroadcast(): void {
  activePasTimers.forEach((id) => window.clearTimeout(id));
  activePasTimers = [];
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore speech synthesis cancellation errors
    }
  }
}

function playReverbNote(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType,
  volumeGain: number
): void {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const harmonic = ctx.createOscillator();
  const gain = ctx.createGain();
  const delay = ctx.createDelay();
  const feedback = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  harmonic.type = 'sine';
  harmonic.frequency.setValueAtTime(freq * 2, now);

  const harmGain = ctx.createGain();
  harmGain.gain.setValueAtTime(0.22, now);

  // Subtle terminal hall PA acoustic tail
  delay.delayTime.setValueAtTime(0.16, now);
  feedback.gain.setValueAtTime(0.28, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volumeGain), now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  harmonic.connect(harmGain);
  harmGain.connect(gain);

  gain.connect(ctx.destination);
  gain.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(ctx.destination);

  osc.start(now);
  harmonic.start(now);
  osc.stop(now + duration + 0.05);
  harmonic.stop(now + duration + 0.05);
}

export function triggerPasBroadcast(options: {
  mode: PasBroadcastMode;
  lang: 'id' | 'en';
  volume: number; // 0..1
  useVoice: boolean;
  onEnded?: () => void;
}): void {
  stopPasBroadcast();
  const ctx = getAudioContext();
  const peak = Math.max(0.005, Math.min(0.18, options.volume * 0.14));

  let chimeDurationMs = 1150;
  if (ctx) {
    if (options.mode === 'boarding') {
      // Classic 4-note ascending airport PA chime (C5 - E5 - G5 - C6)
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        playReverbNote(ctx, f, idx * 0.22, 0.58, 'triangle', peak);
      });
      chimeDurationMs = 1100;
    } else if (options.mode === 'baggage') {
      // Warm 3-note arrival chime (G4 - B4 - D5)
      [392.0, 493.88, 587.33].forEach((f, idx) => {
        playReverbNote(ctx, f, idx * 0.24, 0.55, 'triangle', peak);
      });
      chimeDurationMs = 950;
    } else if (options.mode === 'security') {
      // Crisp 2-note security attention tone (A5 - E5)
      [880.0, 659.25].forEach((f, idx) => {
        playReverbNote(ctx, f, idx * 0.24, 0.48, 'sine', peak);
      });
      chimeDurationMs = 780;
    } else {
      // High-priority emergency alternating sweep pulses
      [980, 740, 980, 740, 980].forEach((f, idx) => {
        playReverbNote(ctx, f, idx * 0.22, 0.2, 'sawtooth', peak * 0.72);
      });
      chimeDurationMs = 1250;
    }
  }

  const preset = PAS_BROADCAST_PRESETS[options.mode];
  const text = options.lang === 'id' ? preset.script_id : preset.script_en;

  const canSpeak =
    options.useVoice &&
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    options.volume > 0.01;

  if (canSpeak) {
    const startTimer = window.setTimeout(() => {
      try {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = options.lang === 'id' ? 'id-ID' : 'en-US';
        utter.rate = 0.96;
        utter.pitch = 1.02;
        utter.volume = Math.max(0.05, Math.min(1, options.volume));
        let finished = false;
        const done = () => {
          if (finished) return;
          finished = true;
          options.onEnded?.();
        };
        utter.onend = done;
        utter.onerror = done;
        window.speechSynthesis.speak(utter);
        // Safety fallback timer in case browser speech engine does not fire onend
        const guardTimer = window.setTimeout(done, 11500);
        activePasTimers.push(guardTimer);
      } catch {
        const fallbackTimer = window.setTimeout(() => options.onEnded?.(), 3200);
        activePasTimers.push(fallbackTimer);
      }
    }, chimeDurationMs);
    activePasTimers.push(startTimer);
  } else {
    const endTimer = window.setTimeout(() => {
      options.onEnded?.();
    }, chimeDurationMs + 2800);
    activePasTimers.push(endTimer);
  }
}

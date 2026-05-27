// Web Audio API synthesis for puzzle modifier sound effects.
//
// All effects are generated on the fly — no audio assets to ship. The
// AudioContext is created lazily on first call (autoplay policies require
// a user gesture). Each effect shapes a short envelope around an oscillator
// or filtered-noise source.
//
// Public surface: `playModifierSfx(kind)`. The caller gates on the user's
// SFX preference; this module assumes "yes, play it."

export type ModifierSfxKind =
    | 'iceMelt'
    | 'flyingWhoosh'
    | 'bubblePop'
    | 'bombTick'
    | 'bombArm'
    | 'bombDefuse'
    | 'bombExpire'
    | 'loopChange'
    | 'loopPeak'
    | 'bonusTurn'
    | 'goalChime'
    | 'starWin';

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
    if (_ctx) {
        // Some browsers start the context suspended; nudge it whenever we
        // try to play (cheap if already running).
        if (_ctx.state === 'suspended') _ctx.resume().catch(() => { /* ignore */ });
        return _ctx;
    }
    const AC: typeof AudioContext | undefined =
        (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    try {
        _ctx = new AC();
    } catch {
        return null;
    }
    return _ctx;
}

// Master gain so we can tame the overall loudness without per-effect tuning.
let _master: GainNode | null = null;
function getMaster(ctx: AudioContext): GainNode {
    if (_master && _master.context === ctx) return _master;
    _master = ctx.createGain();
    _master.gain.value = 0.4;
    _master.connect(ctx.destination);
    return _master;
}

// ---- Tone helpers ----

function tone(opts: {
    freq: number;
    duration: number;
    type?: OscillatorType;
    attack?: number;
    peakGain?: number;
    glideTo?: number;
    delay?: number;
}): void {
    const ctx = getCtx();
    if (!ctx) return;
    const start = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, start);
    if (opts.glideTo !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(
            Math.max(0.0001, opts.glideTo),
            start + opts.duration,
        );
    }
    const peak = opts.peakGain ?? 0.3;
    const attack = opts.attack ?? 0.006;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);
    osc.connect(gain);
    gain.connect(getMaster(ctx));
    osc.start(start);
    osc.stop(start + opts.duration + 0.05);
}

function noiseBurst(opts: {
    duration: number;
    filterFreq?: number;
    filterType?: BiquadFilterType;
    glideTo?: number;
    peakGain?: number;
    delay?: number;
}): void {
    const ctx = getCtx();
    if (!ctx) return;
    const start = ctx.currentTime + (opts.delay ?? 0);
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * opts.duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.filterType ?? 'bandpass';
    filter.frequency.setValueAtTime(opts.filterFreq ?? 800, start);
    if (opts.glideTo !== undefined) {
        filter.frequency.exponentialRampToValueAtTime(
            Math.max(0.0001, opts.glideTo),
            start + opts.duration,
        );
    }
    const gain = ctx.createGain();
    const peak = opts.peakGain ?? 0.4;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(getMaster(ctx));
    src.start(start);
    src.stop(start + opts.duration + 0.05);
}

// ---- Composed effects ----

function descendingChord(): void {
    // Ice melt: three sine notes 800 -> 600 -> 400 Hz, staggered.
    tone({ freq: 800, duration: 0.18, type: 'sine', peakGain: 0.25, delay: 0 });
    tone({ freq: 600, duration: 0.22, type: 'sine', peakGain: 0.22, delay: 0.05 });
    tone({ freq: 400, duration: 0.30, type: 'sine', peakGain: 0.20, delay: 0.10 });
}

// ---- Public API ----

export function playModifierSfx(kind: ModifierSfxKind): void {
    if (typeof window === 'undefined') return;
    switch (kind) {
        case 'iceMelt':
            descendingChord();
            // High-shelf shimmer for the ice glass timbre.
            noiseBurst({ duration: 0.25, filterFreq: 5000, filterType: 'highpass', peakGain: 0.18 });
            break;
        case 'flyingWhoosh':
            noiseBurst({ duration: 0.4, filterFreq: 600, glideTo: 3000, peakGain: 0.35 });
            break;
        case 'bubblePop':
            tone({ freq: 220, duration: 0.18, type: 'sine', peakGain: 0.4, glideTo: 880 });
            tone({ freq: 660, duration: 0.15, type: 'triangle', peakGain: 0.2, delay: 0.04 });
            break;
        case 'bombTick':
            tone({ freq: 1200, duration: 0.05, type: 'square', peakGain: 0.25 });
            break;
        case 'bombArm':
            // Low rumble + heartbeat.
            tone({ freq: 60, duration: 0.5, type: 'triangle', peakGain: 0.35 });
            tone({ freq: 140, duration: 0.18, type: 'sine', peakGain: 0.3, delay: 0.18 });
            tone({ freq: 140, duration: 0.18, type: 'sine', peakGain: 0.25, delay: 0.38 });
            break;
        case 'bombDefuse':
            // Snip + small upward chime.
            noiseBurst({ duration: 0.08, filterFreq: 3500, peakGain: 0.3 });
            tone({ freq: 660, duration: 0.18, type: 'sine', peakGain: 0.3, delay: 0.05 });
            tone({ freq: 990, duration: 0.22, type: 'sine', peakGain: 0.25, delay: 0.12 });
            break;
        case 'bombExpire':
            // Low filtered boom.
            tone({ freq: 90, duration: 0.45, type: 'triangle', peakGain: 0.45, glideTo: 40 });
            noiseBurst({ duration: 0.45, filterFreq: 200, filterType: 'lowpass', peakGain: 0.5 });
            break;
        case 'loopChange':
            tone({ freq: 520, duration: 0.12, type: 'triangle', peakGain: 0.22 });
            break;
        case 'loopPeak':
            // Bright bell.
            tone({ freq: 880, duration: 0.4, type: 'sine', peakGain: 0.3 });
            tone({ freq: 1320, duration: 0.35, type: 'sine', peakGain: 0.22, delay: 0.02 });
            break;
        case 'bonusTurn':
            // Harmonized clone chord.
            tone({ freq: 523.25, duration: 0.35, type: 'sine', peakGain: 0.3 });        // C5
            tone({ freq: 659.25, duration: 0.35, type: 'sine', peakGain: 0.28, delay: 0.03 }); // E5
            tone({ freq: 783.99, duration: 0.35, type: 'sine', peakGain: 0.26, delay: 0.06 }); // G5
            break;
        case 'goalChime':
            // Bright cheerful ping.
            tone({ freq: 1318.5, duration: 0.5, type: 'sine', peakGain: 0.35 });
            tone({ freq: 1760,    duration: 0.4, type: 'sine', peakGain: 0.28, delay: 0.08 });
            break;
        case 'starWin':
            // Ascending three-note arpeggio per star.
            tone({ freq: 880,  duration: 0.18, type: 'sine', peakGain: 0.3 });
            tone({ freq: 1108, duration: 0.18, type: 'sine', peakGain: 0.3, delay: 0.08 });
            tone({ freq: 1318, duration: 0.28, type: 'sine', peakGain: 0.3, delay: 0.16 });
            break;
    }
}

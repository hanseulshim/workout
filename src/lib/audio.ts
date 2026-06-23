let sharedCtx: AudioContext | null = null;

function getOrCreateContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedCtx || sharedCtx.state === "closed") {
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      sharedCtx = new AudioContextClass();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

function playSilence(ctx: AudioContext): void {
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // ignore
  }
}

/**
 * Call from any user gesture (tap, click) to create and unlock the AudioContext.
 * iOS Safari requires AudioContext to be created/resumed within a user gesture.
 * Safe to call multiple times.
 */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = getOrCreateContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => {
        playSilence(ctx);
      });
    } else {
      playSilence(ctx);
    }
  } catch {
    // AudioContext unavailable — fail silently
  }
}

/**
 * Periodically plays silence to keep the AudioContext in "running" state
 * and prevent browser auto-suspension during inactive periods.
 */
export function keepAudioAlive(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = getOrCreateContext();
    if (!ctx) return;
    if (ctx.state === "running") {
      playSilence(ctx);
    } else if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
  } catch {
    // ignore
  }
}

function scheduleChime(ctx: AudioContext): void {
  // C5 → E5 → G5 ascending major triad
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = ctx.currentTime + i * 0.14;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.28, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
    osc.start(start);
    osc.stop(start + 0.5);
  });
}

/**
 * Plays a short ascending chime using the Web Audio API.
 * Requires unlockAudio() to have been called from a prior user gesture.
 * Silent if AudioContext unavailable or not yet unlocked.
 */
export function playRestChime(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = getOrCreateContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => scheduleChime(ctx)).catch(() => {
        // Fallback: try to schedule anyway
        scheduleChime(ctx);
      });
      return;
    }
    scheduleChime(ctx);
  } catch {
    // AudioContext blocked or unavailable — fail silently
  }
}

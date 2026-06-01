/**
 * Plays a short ascending chime using the Web Audio API.
 * Works in foreground on iOS Safari/PWA. Silent if AudioContext unavailable.
 */
export function playRestChime() {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
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
  } catch {
    // AudioContext blocked or unavailable — fail silently
  }
}

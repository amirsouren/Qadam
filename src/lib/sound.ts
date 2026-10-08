/**
 * Optional, gentle feedback for completing a step.
 *
 * Everything here is best-effort and silently degrades: if the browser blocks
 * audio (no user gesture yet) or has no vibration motor, nothing happens.
 * Controlled by `UserSettings.enableSoundHaptics`.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    const W = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = W.AudioContext || W.webkitAudioContext;
    if (!Ctor) return null;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function blip(freqStart: number, freqEnd: number, duration: number, volume: number): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freqStart, now);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration * 0.6);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** Light haptic tap, if the device supports it. */
export function tap(enabled: boolean): void {
  if (!enabled) return;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(12);
    } catch {
      /* ignore */
    }
  }
}

/** A quiet double-tone for "step completed". */
export function playSoftCheck(enabled: boolean): void {
  if (!enabled) return;
  tap(enabled);
  try {
    blip(660, 880, 0.16, 0.12);
  } catch {
    /* ignore */
  }
}

/** A warm, unhurried chime for the end-of-day celebration. */
export function playCelebration(enabled: boolean): void {
  if (!enabled) return;
  tap(enabled);
  try {
    blip(523, 659, 0.22, 0.1);
    window.setTimeout(() => blip(659, 784, 0.28, 0.09), 130);
    window.setTimeout(() => blip(784, 1046, 0.36, 0.08), 280);
  } catch {
    /* ignore */
  }
}

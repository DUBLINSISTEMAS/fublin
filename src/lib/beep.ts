"use client";

/**
 * Som curto de alerta (dois toques), gerado na hora com WebAudio — sem arquivo de áudio.
 * O navegador só toca depois de um gesto do usuário: `unlockAudio()` é chamado no
 * primeiro clique/tecla da sessão.
 */
let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  if (!context) context = new AudioContext();
  return context;
}

export function unlockAudio(): void {
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export function isAudioUnlocked(): boolean {
  return context?.state === "running";
}

function tone(ctx: AudioContext, frequency: number, at: number, duration: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + duration + 0.05);
}

/** Toca "tin-tin"; silencioso se o áudio ainda não foi liberado. */
export function beep(): void {
  const ctx = getContext();
  if (!ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  tone(ctx, 880, now, 0.16);
  tone(ctx, 1320, now + 0.2, 0.22);
}

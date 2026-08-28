/**
 * Sons de alerta gerados na hora com WebAudio — sem arquivo de áudio, funciona
 * offline. O navegador só toca depois de um gesto do usuário: `unlockAudio()` é
 * chamado no primeiro clique/tecla da sessão.
 * (Sem "use client": as constantes também são lidas no servidor pelo schema das configurações.)
 */
export const SOUND_OPTIONS = [
  { id: "suave", label: "Suave (dois toques)" },
  { id: "sino", label: "Sino" },
  { id: "insistente", label: "Insistente (três toques)" },
  { id: "digital", label: "Digital" },
  { id: "off", label: "Sem som" },
] as const;
export type SoundId = (typeof SOUND_OPTIONS)[number]["id"];
export const SOUND_IDS = SOUND_OPTIONS.map((o) => o.id) as [SoundId, ...SoundId[]];
export const DEFAULT_SOUND: SoundId = "suave";

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

type Note = { frequency: number; at: number; duration: number; type?: OscillatorType; volume?: number };

function play(ctx: AudioContext, notes: Note[]) {
  const base = ctx.currentTime;
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.frequency;
    const start = base + n.at;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(n.volume ?? 0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + n.duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + n.duration + 0.05);
  }
}

const PRESETS: Record<Exclude<SoundId, "off">, Note[]> = {
  suave: [
    { frequency: 880, at: 0, duration: 0.16 },
    { frequency: 1320, at: 0.2, duration: 0.22 },
  ],
  sino: [
    { frequency: 1568, at: 0, duration: 0.9, volume: 0.2 },
    { frequency: 2093, at: 0, duration: 0.6, volume: 0.08 },
    { frequency: 1568, at: 0.55, duration: 0.9, volume: 0.16 },
  ],
  insistente: [
    { frequency: 988, at: 0, duration: 0.12, type: "triangle" },
    { frequency: 988, at: 0.18, duration: 0.12, type: "triangle" },
    { frequency: 988, at: 0.36, duration: 0.12, type: "triangle" },
    { frequency: 1319, at: 0.62, duration: 0.28, type: "triangle" },
  ],
  digital: [
    { frequency: 1046, at: 0, duration: 0.09, type: "square", volume: 0.12 },
    { frequency: 1568, at: 0.11, duration: 0.09, type: "square", volume: 0.12 },
    { frequency: 2093, at: 0.22, duration: 0.14, type: "square", volume: 0.12 },
  ],
};

/** Toca o som escolhido; silencioso se for "off" ou se o áudio ainda não foi liberado. */
export function playSound(id: SoundId): void {
  if (id === "off") return;
  const ctx = getContext();
  if (!ctx || ctx.state !== "running") return;
  play(ctx, PRESETS[id]);
}

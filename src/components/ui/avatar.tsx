import { cn } from "@/lib/cn";
import { initials } from "@/lib/text";

type Props = {
  name: string;
  /** Chave da foto em data/uploads; sem ela, mostra as iniciais. */
  photoKey?: string | null;
  /** Diâmetro em px. */
  size?: number;
  className?: string;
  /** Cor do círculo de iniciais. */
  tone?: "accent" | "neutral" | "white";
};

const TONES = {
  accent: "bg-accent-soft text-accent-ink",
  neutral: "bg-surface-2 text-ink-2",
  white: "bg-white/70 text-accent-ink",
};

export function photoUrl(photoKey: string): string {
  return `/api/fotos/${photoKey}`;
}

/** Foto redonda ou iniciais — a mesma peça para líderes, clientes e o dono. */
export function Avatar({ name, photoKey, size = 32, className, tone = "accent" }: Props) {
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.34)) };
  if (photoKey) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arquivo local servido pela API, sem otimização
      <img src={photoUrl(photoKey)} alt={name} width={size} height={size} style={style} className={cn("shrink-0 rounded-full object-cover", className)} />
    );
  }
  return (
    <span style={style} className={cn("grid shrink-0 place-items-center rounded-full font-semibold", TONES[tone], className)} aria-label={name} role="img">
      {initials(name)}
    </span>
  );
}

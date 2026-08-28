import { ImageResponse } from "next/og";
import { TrophyMark } from "@/lib/brand";

export const dynamic = "force-static";

const SIZES = new Set([48, 64, 96, 128, 192, 256, 512]);

/** PNG da marca em vários tamanhos (`/icons/192`, `/icons/512?maskable=1`) para o manifest e o instalador. */
export async function GET(request: Request, context: { params: Promise<{ size: string }> }) {
  const { size: raw } = await context.params;
  const size = Number(raw);
  if (!SIZES.has(size)) return new Response("Tamanho inválido", { status: 404 });
  const maskable = new URL(request.url).searchParams.get("maskable") === "1";
  return new ImageResponse(<TrophyMark size={size} padded={maskable} />, { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } });
}

export function generateStaticParams() {
  return [...SIZES].map((size) => ({ size: String(size) }));
}

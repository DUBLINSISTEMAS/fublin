import { ImageResponse } from "next/og";
import { TrophyMark } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícone para "Adicionar à tela inicial" no iOS (que ignora SVG): a marca com o troféu. */
export default function AppleIcon() {
  return new ImageResponse(<TrophyMark size={180} />, size);
}

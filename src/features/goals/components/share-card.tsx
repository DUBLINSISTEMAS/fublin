"use client";

import { useState } from "react";
import { Download, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { formatBRL } from "@/lib/money";

export type ShareCardData = {
  /** "Anderson · 1ª quinzena · 5 a 19 de ago." */
  title: string;
  achievedCents: number;
  targetCents: number | null;
  percent: number;
  closedCount: number;
  commissionCents: number;
  /** Frase da motivação. */
  headline: string;
  /** "Faltam 3 dias" etc. */
  footer: string;
};

const WIDTH = 1080;
const HEIGHT = 1080;

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Monta a arte (SVG 1080×1080, formato de story/grupo) só com dados — nada do DOM entra. */
export function shareCardSvg(d: ShareCardData): string {
  const percent = Math.min(Math.max(d.percent, 0), 100);
  const barWidth = 920;
  const fill = Math.round((barWidth * percent) / 100);
  const hit = d.targetCents !== null && d.percent >= 100;
  const barColor = hit ? "#a3e635" : "#ffffff";
  const target = d.targetCents !== null ? `de ${formatBRL(d.targetCents)}` : "sem meta definida";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="Outfit, 'Segoe UI', system-ui, sans-serif">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e3a8a"/>
      <stop offset="1" stop-color="#3b7bff"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" rx="56" fill="url(#bg)"/>
  <circle cx="940" cy="140" r="220" fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="120" cy="980" r="260" fill="#ffffff" fill-opacity="0.05"/>
  <g transform="translate(80 80)">
    <rect width="96" height="96" rx="26" fill="#ffffff" fill-opacity="0.16"/>
    <path d="M30 24h36v10c0 14-8 24-18 24s-18-10-18-24V24z" fill="#a3e635"/>
    <path d="M30 30H20c0 12 5 18 12 20M66 30h10c0 12-5 18-12 20" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
    <path d="M48 58v10M36 74h24" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
  </g>
  <text x="200" y="118" fill="#ffffff" fill-opacity="0.8" font-size="30" font-weight="500">${escape(d.title)}</text>
  <text x="200" y="160" fill="#ffffff" fill-opacity="0.6" font-size="24">Relacionador</text>
  <text x="80" y="380" fill="#ffffff" font-size="150" font-weight="300" letter-spacing="-6">${d.targetCents !== null ? `${Math.min(d.percent, 999)}%` : formatBRL(d.achievedCents)}</text>
  <text x="80" y="450" fill="#ffffff" fill-opacity="0.85" font-size="40">${escape(d.targetCents !== null ? `${formatBRL(d.achievedCents)} ${target}` : target)}</text>
  <rect x="80" y="520" width="${barWidth}" height="28" rx="14" fill="#ffffff" fill-opacity="0.2"/>
  <rect x="80" y="520" width="${Math.max(fill, 28)}" height="28" rx="14" fill="${barColor}"/>
  <g transform="translate(80 640)">
    <rect width="440" height="180" rx="32" fill="#ffffff" fill-opacity="0.12"/>
    <text x="32" y="60" fill="#ffffff" fill-opacity="0.7" font-size="26">Cartas fechadas</text>
    <text x="32" y="140" fill="#ffffff" font-size="72" font-weight="300">${d.closedCount}</text>
  </g>
  <g transform="translate(560 640)">
    <rect width="440" height="180" rx="32" fill="#ffffff" fill-opacity="0.12"/>
    <text x="32" y="60" fill="#ffffff" fill-opacity="0.7" font-size="26">A receber</text>
    <text x="32" y="140" fill="#a3e635" font-size="60" font-weight="400">${escape(formatBRL(d.commissionCents))}</text>
  </g>
  <text x="80" y="920" fill="#ffffff" font-size="44" font-weight="500">${escape(d.headline)}</text>
  <text x="80" y="980" fill="#ffffff" fill-opacity="0.7" font-size="28">${escape(d.footer)}</text>
</svg>`;
}

async function svgToPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Não deu para desenhar a imagem."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível.");
    ctx.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar o PNG."))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Props = { data: ShareCardData; filename: string };

/** Baixar imagem · Compartilhar (WhatsApp, no celular) · Imprimir — a arte é gerada na hora, só com os números. */
export function ShareActions({ data, filename }: Props) {
  const [busy, setBusy] = useState<"download" | "share" | null>(null);

  async function withPng(kind: "download" | "share") {
    setBusy(kind);
    try {
      const blob = await svgToPng(shareCardSvg(data));
      if (kind === "share") {
        const file = new File([blob], filename, { type: "image/png" });
        if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: data.title });
          return;
        }
        download(blob, filename);
        toast.info("Imagem baixada — envie no grupo pelo WhatsApp.");
        return;
      }
      download(blob, filename);
      toast.success("Imagem salva.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "Não deu para gerar a imagem.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button size="sm" variant="secondary" onClick={() => withPng("share")} disabled={busy !== null}>
        <Share2 className="size-4" aria-hidden />
        {busy === "share" ? "Preparando…" : "Enviar no grupo"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => withPng("download")} disabled={busy !== null}>
        <Download className="size-4" aria-hidden />
        Baixar imagem
      </Button>
      <Button size="sm" variant="ghost" onClick={() => window.print()}>
        <Printer className="size-4" aria-hidden />
        Imprimir
      </Button>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

const PREVIEW_PX = 280;
const OUTPUT_PX = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const JPEG_QUALITY = 0.86;

type Props = { image: ImageBitmap; title: string; onCancel: () => void; onConfirm: (blob: Blob) => void };

type View = { zoom: number; x: number; y: number };

/** Escala base: a menor dimensão da foto preenche o círculo. */
function baseScale(image: ImageBitmap, size: number): number {
  return size / Math.min(image.width, image.height);
}

/** Mantém a foto cobrindo o círculo inteiro (nunca sobra fundo vazio). */
function clampView(image: ImageBitmap, view: View, size: number): View {
  const scale = baseScale(image, size) * view.zoom;
  const w = image.width * scale;
  const h = image.height * scale;
  const maxX = (w - size) / 2;
  const maxY = (h - size) / 2;
  return { zoom: view.zoom, x: Math.min(Math.max(view.x, -maxX), maxX), y: Math.min(Math.max(view.y, -maxY), maxY) };
}

function draw(canvas: HTMLCanvasElement, image: ImageBitmap, view: View, size: number, mask: boolean) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const scale = baseScale(image, size) * view.zoom;
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(image, (size - w) / 2 + view.x, (size - h) / 2 + view.y, w, h);
  if (!mask) return;
  // Escurece o que fica fora do círculo.
  ctx.save();
  ctx.fillStyle = "rgba(17, 24, 39, 0.55)";
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, true);
  ctx.fill("evenodd");
  ctx.restore();
}

/** Ajuste da foto antes de subir: arraste para enquadrar, deslize para aproximar; sai um quadrado de 512px. */
export function PhotoCropper({ image, title, onCancel, onConfirm }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  useEffect(() => {
    if (canvas.current) draw(canvas.current, image, view, PREVIEW_PX, true);
  }, [image, view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function confirm() {
    const out = document.createElement("canvas");
    out.width = OUTPUT_PX;
    out.height = OUTPUT_PX;
    const ratio = OUTPUT_PX / PREVIEW_PX;
    draw(out, image, { zoom: view.zoom, x: view.x * ratio, y: view.y * ratio }, OUTPUT_PX, false);
    out.toBlob((blob) => blob && onConfirm(blob), "image/jpeg", JPEG_QUALITY);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px]" onClick={onCancel} aria-hidden />
      <section role="dialog" aria-modal="true" aria-label={title} className="animate-rise fixed inset-x-3 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 rounded-panel bg-surface p-5 shadow-float">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[17px] font-medium text-ink">{title}</p>
            <p className="text-[13px] text-muted">Arraste para enquadrar e use a barra para aproximar.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Fechar" className="icon-btn -mt-1 -mr-1 size-9">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <canvas
          ref={canvas}
          width={PREVIEW_PX}
          height={PREVIEW_PX}
          className="mx-auto mt-4 block cursor-grab touch-none rounded-card active:cursor-grabbing"
          style={{ width: PREVIEW_PX, height: PREVIEW_PX }}
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY, startX: view.x, startY: view.y };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            setView((v) => clampView(image, { ...v, x: d.startX + (e.clientX - d.x), y: d.startY + (e.clientY - d.y) }, PREVIEW_PX));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        />
        <label className="mt-4 flex items-center gap-3 text-[13px] text-muted">
          Zoom
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={view.zoom}
            onChange={(e) => setView((v) => clampView(image, { ...v, zoom: Number(e.target.value) }, PREVIEW_PX))}
            className="flex-1 accent-accent"
            aria-label="Aproximar"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={confirm}>Usar foto</Button>
        </div>
      </section>
    </>
  );
}

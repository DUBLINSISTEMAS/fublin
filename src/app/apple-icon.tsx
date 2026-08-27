import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícone para "Adicionar à tela inicial" no iOS (que ignora SVG): a mesma marca "R" de `public/icon.svg`. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#3b7bff" }}>
        <svg viewBox="0 0 64 64" width="180" height="180" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M20 44V20h12.5c5.5 0 9 3.2 9 8 0 3.6-2 6.2-5.3 7.3L44 44h-6.6l-7-8h-4.6v8H20zm5.8-12.6h6.2c2.6 0 4.2-1.3 4.2-3.4s-1.6-3.4-4.2-3.4h-6.2v6.8z"
            fill="#fff"
          />
        </svg>
      </div>
    ),
    size,
  );
}

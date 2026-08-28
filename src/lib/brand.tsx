/**
 * Marca do Relacionador: quadrado azul arredondado com um troféu (taça limão, traço branco).
 * Usada no favicon (public/icon.svg), no ícone da Apple, nos ícones do manifest e no instalador.
 */
export const BRAND_BLUE = "#3b7bff";
export const BRAND_LIME = "#c9f26b";

/** Traços do troféu (base 24×24, estilo Lucide), escalados para o tamanho pedido. */
export function TrophyMark({ size, padded = false }: { size: number; padded?: boolean }) {
  // Ícone "maskable": o sistema recorta as bordas, então o troféu fica menor e centralizado.
  const glyph = padded ? size * 0.44 : size * 0.58;
  const scale = glyph / 24;
  const offset = (size - glyph) / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} rx={padded ? 0 : size * 0.22} fill={BRAND_BLUE} />
      <g transform={`translate(${offset} ${offset}) scale(${scale})`} fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" fill={BRAND_LIME} />
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      </g>
    </svg>
  );
}

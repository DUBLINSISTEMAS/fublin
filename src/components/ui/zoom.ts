/**
 * No computador a interface roda com `zoom: 0.85` (densidade compacta). Coordenadas do
 * ponteiro (`clientX/Y`, `getBoundingClientRect`) vêm em pixels da tela; deslocamentos
 * aplicados em CSS (`transform`, `scrollLeft`) são em pixels do layout. Dividir pelo zoom
 * converte um no outro.
 */
export function readZoom(): number {
  if (typeof document === "undefined") return 1;
  const root = document.querySelector("[data-zoom-root]") ?? document.body;
  const raw = getComputedStyle(root).zoom;
  const zoom = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

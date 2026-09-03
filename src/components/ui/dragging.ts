/**
 * Bandeira global de "tem gesto em andamento" (funil e agenda).
 * O `<LiveRefresh>` lê daqui para não recarregar a árvore no meio de um arrasto —
 * um `router.refresh()` no meio do gesto solta o card na mão de quem arrasta.
 */
export function setDragging(active: boolean): void {
  if (typeof document === "undefined") return;
  if (active) document.body.dataset.dragging = "1";
  else delete document.body.dataset.dragging;
}

export function isDragging(): boolean {
  return typeof document !== "undefined" && document.body.dataset.dragging === "1";
}

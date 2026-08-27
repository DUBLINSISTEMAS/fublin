/** `searchParams` como o Next entrega às páginas: cada chave pode vir repetida. */
export type SearchParams = Record<string, string | string[] | undefined>;

/** Primeiro valor de uma chave da URL (ou `undefined`); chaves repetidas usam a primeira. */
export function pickParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

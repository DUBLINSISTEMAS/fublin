import { NextResponse } from "next/server";

/**
 * Bloqueia mutações iniciadas por outra origem (CSRF contra o servidor exposto na
 * rede local). Navegadores modernos enviam `Origin` em POST/DELETE; clientes não
 * navegadores sem esse cabeçalho continuam aceitos para manutenção local.
 */
export function rejectCrossOriginMutation(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  let expected: string;
  try {
    expected = new URL(request.url).origin;
  } catch {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }

  if (origin !== expected) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }
  return null;
}

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/features/auth/constants";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/entrar") return NextResponse.next();
  if (!request.cookies.has(SESSION_COOKIE)) return NextResponse.redirect(new URL("/entrar", request.url));
  return NextResponse.next();
}

/**
 * Tudo passa pelo proxy, menos a API (cada rota confere a sessão), os estáticos do Next
 * e os arquivos que o navegador busca sem cookie (manifest do PWA, ícones). As exceções
 * terminam em "/" ou no nome completo para não abrir brecha em rotas parecidas.
 */
export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico|icon.svg|apple-icon|icons/|manifest.webmanifest|robots.txt|sitemap.xml).*)"],
};

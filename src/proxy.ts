import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/features/auth/constants";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/entrar") return NextResponse.next();
  if (!request.cookies.has(SESSION_COOKIE)) return NextResponse.redirect(new URL("/entrar", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon|icons).*)"],
};

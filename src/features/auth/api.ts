import { NextResponse } from "next/server";
import { currentUser } from "./session";

export async function apiAuth(adminOnly = false): Promise<NextResponse | null> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  if (adminOnly && user.role !== "admin") return NextResponse.json({ error: "Acesso permitido somente ao administrador." }, { status: 403 });
  return null;
}

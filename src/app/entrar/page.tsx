import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { getDb } from "@/db/client";
import { LoginForm } from "@/features/auth/components/login-form";
import { currentUser } from "@/features/auth/session";
import { hasUsers } from "@/features/auth/service";
import { TrophyMark } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  const setup = !(await hasUsers(await getDb()));
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <section className="panel w-full max-w-md p-6 shadow-float sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <TrophyMark size={44} />
          <div>
            <h1 className="text-[25px] font-medium tracking-tight text-ink">{setup ? "Primeiro acesso" : "Bem-vindo de volta"}</h1>
            <p className="text-[13px] text-muted">{setup ? "Crie a conta administradora do Relacionador." : "Entre para acessar sua carteira."}</p>
          </div>
        </div>
        <div className="mb-5 flex items-start gap-2 rounded-control bg-accent-soft px-3 py-2.5 text-[13px] text-accent-ink">
          <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden />
          {setup ? "Essa conta poderá criar os acessos dos líderes depois." : "Seu acesso determina quais clientes e ações ficam disponíveis."}
        </div>
        <LoginForm setup={setup} requireSetupSecret={setup && Boolean(process.env.SETUP_SECRET)} />
      </section>
    </main>
  );
}

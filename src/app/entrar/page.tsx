import { redirect } from "next/navigation";
import { DatabaseZap, LockKeyhole } from "lucide-react";
import { getDb } from "@/db/client";
import { LoginForm } from "@/features/auth/components/login-form";
import { currentUser } from "@/features/auth/session";
import { hasUsers } from "@/features/auth/service";
import { TrophyMark } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar" };

/**
 * A primeira tela é a que descobre que o banco não está lá (variável faltando, tabela
 * inexistente). Em vez da página de erro genérica, diz o que aconteceu e onde mexer.
 */
/** Só as mensagens que o próprio app escreve (sem host, token ou caminho) podem ir para a tela pública. */
const SAFE_DB_MESSAGES = ["Banco não configurado", "Na Vercel, TURSO_DATABASE_URL"];

async function loadSetupState(): Promise<{ setup: boolean; dbError: string | null }> {
  try {
    return { setup: !(await hasUsers(await getDb())), dbError: null };
  } catch (error) {
    console.error("[entrar] banco indisponível", error);
    const message = error instanceof Error ? error.message : "";
    const safe = SAFE_DB_MESSAGES.some((prefix) => message.startsWith(prefix));
    return { setup: false, dbError: safe ? message : "Erro ao conectar. A causa completa está no log do servidor (Runtime Logs na Vercel ou servidor.log no computador)." };
  }
}

function DatabaseUnavailable({ message }: { message: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <section className="panel w-full max-w-md p-6 shadow-float sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-rose text-rose-ink"><DatabaseZap className="size-5" aria-hidden /></span>
          <div>
            <h1 className="text-[22px] font-medium tracking-tight text-ink">Banco de dados indisponível</h1>
            <p className="text-[13px] text-muted">O aplicativo não conseguiu abrir o banco.</p>
          </div>
        </div>
        <p className="rounded-control bg-surface-2 px-3 py-2.5 font-mono text-[12px] leading-relaxed break-words text-ink-2">{message}</p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-[13px] text-ink-2">
          <li>Na Vercel: confira <code>TURSO_DATABASE_URL</code> e <code>TURSO_AUTH_TOKEN</code> em Settings → Environment Variables e faça um novo deploy.</li>
          <li>No computador: feche e abra o app de novo; se continuar, rode <code>npm run db:migrate</code>.</li>
        </ul>
      </section>
    </main>
  );
}

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  const { setup, dbError } = await loadSetupState();
  if (dbError) return <DatabaseUnavailable message={dbError} />;
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

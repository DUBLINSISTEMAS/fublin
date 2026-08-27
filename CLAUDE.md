@AGENTS.md

# Relacionador CRM — guia para quem mexe no código

CRM pessoal, single-user, para um **relacionador** de consórcio (traz o cliente; o **líder de vendas** fecha).
Roda local (`npm run dev`, acessível na rede Wi-Fi), sem login. Textos da UI em pt-BR.

## Comandos

- `npm run check` — typecheck + lint + testes. Rode antes de entregar qualquer mudança.
- `npm run test:coverage` — cobertura (alvo: lógica de servidor ≥ 90%, componentes com estado testados).
- `npm run db:generate` — nova migração depois de alterar `src/db/schema.ts` (commitar `drizzle/`).
- `npm run db:seed` / `npm run db:reset` — dados de exemplo / apagar banco e anexos.

## Arquitetura (o que vai onde)

```
src/lib/          utilidades puras: domain.ts (enums + rótulos), dates, quinzena (períodos), period-filter, money (centavos), csv, result, validation, beep
src/db/           schema Drizzle (SQLite via @libsql/client), conexão singleton, seed, test-db (:memory:)
src/features/<x>/ schema.ts (Zod) · service.ts (regras, lança DomainError) · queries.ts (leitura) · actions.ts ("use server") · components/
                  clients · appointments (calendar/ = agenda dia/semana/mês) · leaders · attachments · activities · goals (metas) · settings · photos
src/components/   ui/ (primitivos, toast, avatar, photo-upload, period-picker) · layout/ (shell, sidebar, tabs, alertas) · charts/ (SVG puro)
src/app/          rotas; páginas são Server Components com `force-dynamic`; API só para upload/download/CSV/lembretes/fotos
```

Regras que mantêm o sistema coerente:

- **`src/lib/domain.ts` é a única fonte de enums e rótulos.** DB, Zod e UI importam de lá; nunca duplique strings de status.
- **Dinheiro em centavos (inteiro).** `parseBRL`/`formatBRL` em `lib/money.ts`. Datas em ISO UTC no banco, exibidas no fuso local.
- **Validação só no servidor, com Zod, via `parseForm`.** Formulários usam `useActionState` + `FormState` (`formErrors`/`formValue` repovoam os campos).
- **Ações rápidas (baixa, mover, excluir, ativar) devolvem `ActionResult`** e a UI mostra o erro com `<ActionError>`. Nada falha em silêncio; `DomainError` vira mensagem, o resto vira mensagem genérica + `console.error` (`lib/actions.ts`).
- **Serviços recebem `db: Db`** (injeção) para os testes rodarem com SQLite em memória (`createTestDb`).
- **Filtros vivem na URL** (`?q=&status=&interesse=&lider=`, `?d=`, `?mes=`); leia com `pickParam`, atualize com `useUrlUpdate`.
- **Cores só via tokens** de `src/app/globals.css` (`@theme`): `accent`, `lime`, `sun`, `sky`, `rose(-ink)`, `surface-*`, `ink*`. Não use a paleta padrão do Tailwind (`red-600`, `gray-500`…).
- Sem `window.confirm`: exclusões usam `<ConfirmButton>` (dois passos inline).
- **Toda ação automática avisa**: `toast.success(...)` ou `useActionToast(state, "Salvo.")` — o dono precisa ver que salvou.
- **Preferências** vivem em `features/settings` (tabela `settings`, JSON validado por Zod, `getSettings(db)` sempre com padrões). Perfil, dias de corte das quinzenas, alertas e meta padrão. Mudanças chamam `revalidatePath("/", "layout")` porque a sidebar depende delas.
- **Quinzenas e metas**: períodos em `lib/quinzena.ts` (chave `YYYY-MM-1|2`); progresso em `features/goals/queries.ts` (soma de `credit_cents` fechados por `closed_at`); frases em `goals/motivation.ts`. Filtros de período nas abas: `resolvePeriodFilter` + `<PeriodPicker>`.
- **Fotos** (líderes e perfil): `features/photos/service.ts` + `/api/fotos`; a chave muda a cada troca (cache imutável). Sempre renderize com `<Avatar>`; para trocar, `<PhotoUpload>`.
- **Agenda**: `appointments.duration_minutes` define o bloco; `calendar/layout.ts` posiciona (faixas para sobreposição) e é testado; `TimeGrid` é cliente (linha do agora, painel do evento), `MonthGrid`/`MiniCalendar` são servidor.
- **Alertas**: `ReminderWatcher` lê `/api/reminders` (itens + preferências) a cada 30 s; dispensados/adiados ficam no `localStorage` (`relacionador:alerts`). Som via `lib/beep.ts` só depois de um gesto do usuário.
- Testes de componente ficam ao lado do componente com `// @vitest-environment jsdom` na primeira linha; o padrão do Vitest é Node.

## Limitações conhecidas (decisões, não esquecimentos)

- Sem transações: cada serviço faz 2–3 escritas sequenciais (registro + timeline). Em SQLite local single-user o risco é baixo; ao ir para Turso/multiusuário, envolver em `db.transaction`.
- Sem CSP/autenticação: o app é para a rede local. Ao publicar na internet, adicionar login e CSP com nonce.
- Push com o app fechado não existe; o `ReminderWatcher` só avisa com uma aba aberta.

Decisões de produto e visual: `docs/superpowers/specs/2026-08-27-relacionador-crm-design.md`.

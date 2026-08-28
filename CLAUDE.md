@AGENTS.md

# Relacionador CRM — guia para quem mexe no código

CRM pessoal, single-user, para um **relacionador** de consórcio (traz o cliente; o **líder de vendas** fecha).
Roda local (`npm run dev`, acessível na rede Wi-Fi), sem login. Textos da UI em pt-BR.

## Comandos

- `npm run check` — typecheck + lint + testes. Rode antes de entregar qualquer mudança.
- `npm run test:coverage` — cobertura (alvo: lógica de servidor ≥ 90%, componentes com estado testados).
- `npm run db:generate` — nova migração depois de alterar `src/db/schema.ts` (commitar `drizzle/`).
- `npm run db:seed` / `npm run db:reset` — dados de exemplo / apagar banco e anexos.
- `npm run backup` — backup manual agora (mesma pasta/formato do automático). Instalador do Windows: `installer/Instalar.bat` (ver `installer/README.md`).

## Arquitetura (o que vai onde)

```
src/lib/          utilidades puras: domain.ts (enums + rótulos), dates, quinzena (períodos), period-filter, money (centavos), xlsx (planilhas), sounds, theme, brand (logo), result, validation
src/db/           schema Drizzle (SQLite via @libsql/client), conexão singleton, seed, test-db (:memory:)
src/features/<x>/ schema.ts (Zod) · service.ts (regras, lança DomainError) · queries.ts (leitura) · actions.ts ("use server") · components/
                  clients · appointments (calendar/ = agenda dia/semana/mês) · leaders · attachments · activities · goals (metas, recebimentos, tendência) · settings · photos · backup
src/components/   ui/ (primitivos, toast, avatar, photo-upload, period-picker, zoom) · layout/ (shell, sidebar, tabs, alertas, tema/densidade) · charts/ (SVG/CSS puro)
src/app/          rotas; páginas são Server Components com `force-dynamic`; API só para upload/download/Excel/lembretes/fotos/backup/ícones
src/instrumentation.ts  agendador do backup diário (roda com o servidor de pé); installer/ = instalador Windows (PowerShell)
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
- **Quinzenas e metas**: períodos em `lib/quinzena.ts` (chave `YYYY-MM-1|2`; cortes em qualquer ordem — a 1ª pode ir do dia 20 ao 5, a 2ª é o resto); progresso em `features/goals/queries.ts` (soma de `credit_cents` fechados por `closed_at`; `DefaultTarget` aceita metas padrão distintas por metade); frases em `goals/motivation.ts`; recebimentos em `goals/payouts.ts`; tendência de agendamentos em `goals/trend.ts`. Filtros de período nas abas: `resolvePeriodFilter` + `<PeriodPicker>`.
- **Fotos** (líderes e perfil): `features/photos/service.ts` + `/api/fotos`; a chave muda a cada troca (cache imutável). Sempre renderize com `<Avatar>`; para trocar, `<PhotoUpload>`.
- **Agenda**: `appointments.duration_minutes` define o bloco; `calendar/layout.ts` posiciona (faixas para sobreposição) e é testado; `TimeGrid` é cliente (linha do agora, painel do evento), `MonthGrid`/`MiniCalendar` são servidor.
- **Alertas**: `ReminderWatcher` lê `/api/reminders` (itens + preferências) a cada 30 s; dispensados/adiados ficam no `localStorage` (`relacionador:alerts`). Sons via `lib/sounds.ts` (presets WebAudio) só depois de um gesto do usuário.
- **Dinheiro digitado** sempre com `<MoneyInput>` (máscara pt-BR); nunca `<Input>` cru para valores.
- **Comissão**: `settings.commission.ratePercent` + `commissionCents()`; qualquer número de "recebimento" passa por aí.
- **Tema e densidade**: tokens do `@theme` redefinidos em `[data-theme="dark"]` no `globals.css`; nunca cores fixas em componentes. `ThemeToggle`/`DensityToggle` gravam em `localStorage` e `APPEARANCE_SCRIPT` (`lib/theme.ts`) aplica antes da hidratação; a troca de tema anima via classe `theme-transition`. Densidade compacta = `zoom: 0.85` no `body` em telas ≥ 1024px — qualquer conta com `clientX/Y` ou `getBoundingClientRect` precisa dividir por `readZoom()` (`components/ui/zoom.ts`) antes de virar `transform`/`scrollLeft`.
- **Agenda arrastável**: mouse arrasta direto; no toque, pressão longa (350 ms) ativa o arrasto e `touchmove` não-passivo trava a rolagem; `snapMinutes` encaixa em 15 min; a pilha (`groupSize > 1`) abre o `EventChooser`.
- **Funil**: cada coluna tem fundo tingido por etapa (`COLUMN_TINT`), o card arrastado ganha a borda da coluna sob ele (`COLUMN_RING`) e ao soltar toca `playEffect("pop")` se `settings.alerts.kanbanSound`.
- **Planilhas**: sempre `.xlsx` via `lib/xlsx.ts` (`buildWorkbook` + `xlsxResponse`, colunas tipadas: text/money/integer/date/datetime). Nada de CSV.
- **Backup**: `features/backup/service.ts` (criar, listar, restaurar com cópia de segurança, zip importar/exportar, poda); automático diário por `instrumentation.ts` enquanto o servidor roda e pela tarefa agendada do instalador (00:05) mesmo com o app fechado. Pasta `data/backups/` (ou `BACKUP_DIR`).
- **Compartilhar meta**: `goals/components/share-card.tsx` gera um SVG 1080×1080 só com dados → PNG (download / Web Share); impressão esconde o chrome via `print:hidden`.
- **Voltar**: use `backHref` no `PageHeader` em toda tela que não é raiz do menu.
- Testes de componente ficam ao lado do componente com `// @vitest-environment jsdom` na primeira linha; o padrão do Vitest é Node.

## Limitações conhecidas (decisões, não esquecimentos)

- Sem transações: cada serviço faz 2–3 escritas sequenciais (registro + timeline). Em SQLite local single-user o risco é baixo; ao ir para Turso/multiusuário, envolver em `db.transaction`.
- Sem CSP/autenticação: o app é para a rede local. Ao publicar na internet, adicionar login e CSP com nonce.
- Push com o app fechado não existe; o `ReminderWatcher` só avisa com uma aba aberta.

Decisões de produto e visual: `docs/superpowers/specs/2026-08-27-relacionador-crm-design.md`.

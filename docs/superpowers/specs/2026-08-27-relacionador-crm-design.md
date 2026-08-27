# Relacionador CRM — Design (v1)

Data: 2026-08-27 · Caminho: arquitetural (projeto novo) · Status: decisões tomadas de forma autônoma, ajustáveis.

## 1. Problema e papel

O usuário é **relacionador** numa loja de consórcio/crédito. Ele traz o cliente até a loja; um **líder de vendas** fecha a venda. Ele precisa de um sistema pessoal de organização:

- cadastrar clientes com interesse (imóvel, automóvel, …), origem, observações;
- registrar **quando o cliente veio** e **qual líder** atendeu;
- acompanhar o **status** do cliente (funil);
- **agendar** visitas/ligações/retornos com dia e horário e **ser lembrado**;
- usar no **desktop** (na loja) e no **celular** (na rua), com o mesmo dado.

Não é: multiusuário, controle de vendas do líder, integração com a administradora.

## 2. Decisões de produto (assunções explícitas)

| Tema | Decisão v1 |
|---|---|
| Usuários | 1 usuário (o relacionador). Sem login na v1; app roda local e é acessado pelo celular na mesma rede Wi‑Fi. |
| Interesses | `imovel`, `automovel`, `moto`, `servicos`, `pesados`, `outro` + campo livre "valor da carta". |
| Funil (status do cliente) | `novo` → `agendado` → `visitou` → `negociando` → `fechou` / `perdido`. Transição livre (o usuário escolhe), mas o sistema sugere: criar agendamento ⇒ `agendado`; marcar visita como realizada ⇒ `visitou`. |
| Origem | `indicacao`, `redes_sociais`, `telefone`, `abordagem`, `outro` (opcional). |
| Agendamento | tipo `visita` \| `ligacao` \| `retorno`; status `agendado` \| `realizado` \| `faltou` \| `cancelado`; lembrete N minutos antes (padrão 30). |
| Lembrete | (a) tela **Hoje** com "agora / próximos / atrasados"; (b) badge no menu; (c) **notificação do navegador** quando faltar N min, enquanto o app estiver aberto (desktop ou celular). Push com app fechado fica para v2 (precisa de servidor público). |
| Histórico | timeline por cliente: notas, mudanças de status, agendamentos criados/concluídos. |
| Exportar | CSV de clientes. |
| Dados de exemplo | `npm run db:seed` (opt‑in) cria líderes/clientes/agendamentos fictícios para testar. |

## 3. Arquitetura

- **Next.js 16** (App Router, Turbopack, React 19.2), **TypeScript** estrito.
- **Server Components** para leitura; **Server Actions** para mutações (`useActionState` nos forms, progressive enhancement).
- **Drizzle ORM + SQLite (`@libsql/client`, arquivo `data/app.db`)** — zero compilação nativa no Windows; migrações versionadas em `drizzle/` aplicadas automaticamente no boot.
- **Zod** valida todas as entradas de formulário no servidor (boundary única).
- **Tailwind CSS 4** com tokens em `@theme`; **IBM Plex Sans** via `next/font` (self‑hosted).
- **Vitest**: unit (lib/schemas) + integração (queries/actions contra SQLite em memória).
- Sem estado global no cliente; URL guarda filtros (`?q=&status=&interesse=&lider=`), dia da agenda (`?d=YYYY-MM-DD`).

### Estrutura

```
src/
  app/                    rotas (layout, hoje, clientes, agenda, lideres, config, api)
  components/ui/          primitivos (Button, Input, Select, Badge, Card, EmptyState, Field)
  components/layout/      AppShell (Sidebar desktop / BottomTabs mobile), PageHeader, ReminderWatcher
  features/clients/       schema.ts (zod) · queries.ts · actions.ts · components/
  features/appointments/  idem
  features/leaders/       idem
  features/activities/    timeline
  db/                     client.ts · schema.ts · migrate.ts · seed.ts
  lib/                    dates.ts · status.ts · ids.ts · csv.ts · result.ts
drizzle/                  migrações SQL geradas
```

### Modelo de dados

```
leaders       id, name, phone?, active, created_at
clients       id, name, phone, email?, interest, interest_notes?, status, source?,
              leader_id?, first_visit_at?, notes?, created_at, updated_at
appointments  id, client_id, scheduled_at (ISO UTC), kind, status, notes?,
              reminder_minutes, created_at, updated_at
activities    id, client_id, type, content, created_at
```

Datas: gravadas em ISO‑8601 UTC; exibidas no fuso local do servidor (o PC do usuário, `America/Sao_Paulo`).

## 4. Telas

1. **Hoje** (`/`) — cabeçalho editorial com a data; blocos: *Agora/Próximos* (≤ 2h), *Hoje*, *Atrasados* (agendados no passado sem baixa, com ações "Realizado / Faltou"); métricas do mês (novos, visitas, fechados).
2. **Clientes** (`/clientes`) — busca + filtros (status, interesse, líder), lista densa com status pill, líder, próximo agendamento; FAB/botão "Novo cliente".
3. **Cliente** (`/clientes/[id]`) — dados, troca rápida de status, próximo agendamento, atalhos (WhatsApp/ligar), timeline, nota rápida. Editar em `/clientes/[id]/editar`.
4. **Agenda** (`/agenda?d=…`) — navegação por dia (← hoje →), lista por hora; "Novo agendamento" com seletor de cliente.
5. **Líderes** (`/lideres`) — criar, renomear, ativar/desativar.
6. **Config** (`/config`) — permissão de notificações, exportar CSV, apagar dados de exemplo.

## 5. Direção visual — "Ledger" (editorial‑minimal, claro)

- Fundo `#FAFAF8`, superfície `#FFFFFF`, borda `#E7E5E4`, texto `#1C1917`, muted `#57534E` (contraste ≥ 4.5:1).
- **Um acento**: teal‑700 `#0F766E` (confiança/financeiro) + tint `#CCFBF1`. Status com cores semânticas fixas.
- Tipografia IBM Plex Sans; títulos com tracking apertado; números tabulares.
- Hierarquia por escala e ritmo (não por caixas iguais); profundidade só onde importa (sheets, FAB, cards "agora").
- Mobile: bottom tab bar (Hoje · Clientes · Agenda · Mais) + FAB; Desktop: sidebar 240px.
- Alvos de toque ≥ 44px, foco visível, `prefers-reduced-motion` respeitado, ícones Lucide.

## 6. Lembretes — mecanismo

- `GET /api/reminders` devolve agendamentos `agendado` entre agora‑5min e agora+24h.
- `ReminderWatcher` (client, no layout) consulta a cada 60s; para cada item com `scheduled_at − reminder_minutes ≤ now` e não notificado (Set em `localStorage`), dispara `Notification` (se permitido) **e** um toast in‑app. Foco na aba abre o cliente.

## 7. Erros e validação

- Zod no servidor; erros de campo retornados ao form via `useActionState` (mensagens em pt‑BR).
- Ações devolvem `Result<T>` (`{ ok: true, data } | { ok: false, error, fieldErrors? }`), nunca lançam para a UI.
- Migração falhando ⇒ app não sobe com mensagem clara.

## 8. Testes

- `lib/*` (datas, status, csv) — unit.
- `features/*/schema.ts` — unit (parse válido/inválido).
- `features/*/queries.ts` + `actions.ts` — integração com `:memory:`.
- Smoke visual manual (375px e 1440px) antes de entregar.

## 9. Fora da v1 (explicitamente)

Login/multiusuário · push com app fechado · WhatsApp API · relatórios avançados · anexos · deploy em nuvem (README explica como fazer depois).

---

## Adendo (2026-08-27, mesma tarde) — redesign "SaaS azul"

Pedido do dono: reproduzir o visual de dois shots do Dribbble (*Customer Journey CRM Dashboard*, RonDesignLab; *B2B SaaS Web CRM Dashboard*, Ronas IT) e usar azul.

Tradução para o produto:
- Canvas `#EEF1F6`; painéis brancos `radius 24px`, cards `20px`, sombra quase nula; controles com fundo cinza `#F4F6F9` sem borda e foco azul.
- Azul principal `#3B7BFF`; pastéis: limão `#C9F26B`, amarelo `#FFD84D`, azul-claro `#BFD7FF`; carvão `#1F242B` para CTA secundário, contadores e card "Próximo".
- Fonte Outfit (300–600); títulos 26–30px peso 500; números KPI 40px peso 300.
- Shell: sidebar branca flutuante (nav + Líderes + card escuro "Próximo"), barra superior com busca global + "Novo cliente" azul; tab bar branca no mobile.
- Hoje: gráfico de área azul/limão (7 dias), heatmap hora×dia (14 dias), KPIs com chip de variação, agenda em colunas kanban (Agora em azul-claro).
- Clientes: kanban do funil (Novo → Fechou) com cards (chip de interesse, líder com avatar, próximo agendamento); lista para busca/filtros; toggle Funil/Lista na URL (`?view=lista`).

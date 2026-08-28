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

---

## Adendo 2 (2026-08-27, noite) — lógica v2: a rotina do relacionador

Pedido: "aja como tech lead", kanban com arrastar, líder por cliente, análise/aprovação com adesão, anexar propostas, responsivo em tudo.

Domínio:
- Funil: `novo → agendado → atendido → negociando → analise → aprovado → fechou | perdido` (`visitou` migrado para `atendido`). `PIPELINE_STATUSES` define as colunas; `perdido` é a última coluna (zona de descarte).
- Cliente ganha `attendance` (presencial/online), `credit_cents` (carta), `adesao_cents`, `analysis_started_at`, `approved_at`, `closed_at`, `lost_at`, `lost_reason`. `statusStamps()` carimba as datas ao entrar em cada etapa (só se vazias; fechar direto carimba aprovação também; sair de perdido limpa `lost_*`).
- Agendamento ganha o tipo `reuniao` (online). Realizar `visita` ou `reuniao` = atendimento (conta em `meetingsCount`, avança novo/agendado → atendido).
- Anexos: tabela `attachments` + arquivos em `data/uploads/<clientId>/<id>.<ext>`; upload por route handler (`POST /api/anexos`, multipart, 10 MB, JPG/PNG/WebP/HEIC/PDF), leitura por `GET /api/anexos/[id]`.
- Dinheiro sempre em centavos (`lib/money.ts`: `parseBRL`, `formatBRL`).

UI:
- Kanban com @dnd-kit (PointerSensor 6px, TouchSensor 220ms, KeyboardSensor); atualização otimista + `moveClientAction`; menu "…" com "Mover para" e "Líder de vendas" como alternativa acessível.
- Página do cliente: cabeçalho com chips (etapa, interesse, atendimento), card "Aprovação" (carta, adesão, datas), "Propostas e documentos" (upload por arrasto/escolha/câmera, galeria), etapa com motivo de perda.
- Aba **Aprovados** (`/aprovados?mes=YYYY-MM|todos&lider=`): KPIs, tabela (desktop) / cards (mobile), CSV.
- **Líderes**: tabela de desempenho (`getLeaderStats`).
- Nav mobile: Hoje · Clientes · Agenda · Aprovados · Mais (Líderes, Config).
- Hoje: faixa do funil, KPIs (agendados hoje, em análise, fechados e adesão no mês), gráfico com hover.

QA: gstack `responsive` em 375/768/1280 para Hoje, Funil, Cliente, Aprovados, Líderes; DnD validado com pointer events reais (Gabriela: Em análise → Aprovado, `approved_at` carimbado, timeline registrada).

---

## Adendo 3 (2026-08-27, noite) — agenda de verdade, metas por quinzena, perfil e alertas

Pedido do dono (áudio transcrito): foto dos líderes; agenda "tipo Google Agenda" (referência: *Agenda Concept*, Pim Scholten/Dribbble) com filtro por dia/semana; kanban que role de lado sem esforço e com animação de pouso ("não sei qual card entrou"); X para dispensar aviso; alerta contínuo N minutos antes até desativar; "salvo" visível; seu nome e foto no lugar de "Relacionador"; **meta por quinzena** (a loja fecha produção em 2 quinzenas: dia 5→19 e 20→4; ex.: 616 mil na 1ª quinzena, 81 mil na 2ª, meta de 700 mil agora e 1 milhão na produção) que vá contando a cada cliente fechado e motive.

Decisões:
- **Quinzenas** (`lib/quinzena.ts`): dois dias de corte configuráveis (padrão 5 e 20). 1ª = [1º corte, 2º corte), 2ª = [2º corte, 1º corte do mês seguinte). Chave `YYYY-MM-1|2` (mês de referência). Produção = as duas quinzenas do mesmo mês de referência. Dias de corte > dias do mês são presos ao último dia.
- **Meta** = soma do **valor da carta** (`credit_cents`) dos clientes que chegaram a "Fechou" com `closed_at` dentro da quinzena (adesão é pequena demais para ser a produção). Tabela `goals(period_key, target_cents)`; meta padrão nas configurações para quinzenas sem meta própria. Página `/metas` (hero + cartas fechadas + produção + histórico), card na sidebar e na tela Hoje, frases de motivação por faixa de progresso × dias restantes (`goals/motivation.ts`).
- **Settings** (`settings` tabela chave/valor JSON validada por Zod, `features/settings`): `profile` (nome, foto), `period` (cortes), `alerts` (antecedência padrão, repetição, som), `goals` (meta padrão). Linha inválida cai no padrão.
- **Fotos** (`features/photos`, `/api/fotos`): líderes e perfil; conteúdo verificado pelos bytes; chave com sufixo aleatório a cada troca (`lideres/<id>-<x>.jpg`) → cache imutável sem foto velha; o navegador reduz para 512px JPEG antes de enviar (`PhotoUpload`). `Avatar` é a peça única (foto ou iniciais).
- **Agenda** (`features/appointments/components/calendar`): `duration_minutes` no agendamento (padrão por tipo: visita 60, reunião 45, ligação 15, retorno 30); visões Dia · Semana · Mês (`?view=`), grade 07–20h com 64px/h, blocos por duração com faixas para sobreposição (`layout.ts`), linha do "agora", clique no horário vazio → `/agenda/novo?d=&h=`, painel lateral do evento (WhatsApp, ligar, baixa, editar), mini-calendário com pontinhos, filtro por tipo (`?tipo=`) e "só em aberto" (`?ocultar=1`). No celular a semana rola de lado com encaixe por dia.
- **Kanban**: arrastar o fundo rola o quadro (mouse), setas nas bordas, `dropAnimation` do dnd-kit (o fantasma pousa no lugar final), FLIP para os vizinhos abrirem espaço (`useFlip`) e brilho azul no card que chegou (`card-settle`). Toast "Nome → Etapa".
- **Alertas** (`ReminderWatcher`): poll de 30 s; alerta fica na tela até dispensar (X), adiar 5 min (soneca) ou dar baixa; repete som (WebAudio, liberado no 1º clique) e notificação do sistema a cada N min configurados; título da aba mostra "(n)". Dispensados/adiados ficam no `localStorage` por 2 dias.
- **Toasts** (`components/ui/toast.tsx`): store fora do React; `useActionToast` transforma resultados de ações em "Salvo"/erro. Todas as ações automáticas (etapa, líder, baixa, foto, metas, configurações) avisam.
- **Períodos nas abas**: `PeriodPicker` (Quinzena · Mês · Tudo) em Aprovados e Líderes; `getLeaderStats(range)` conta cada fato pela própria data; nova coluna "Cartas" (produção do líder).

---

## Adendo 4 (2026-08-27, madrugada) — revisão de uso: navegação, agenda arrastável, comissão, dashboard, tema

Pedido do dono (áudio): setinha de voltar em cards/formulários; arrastar o evento na agenda para outro horário; dois clientes no mesmo horário empilhados com escolha; dinheiro sempre em R$ formatado; quinzenas como "do dia X ao dia Y"; ouvir e escolher o som do alerta; dashboard "é o que vou ver todos os dias?" com filtro de período; card "Próximo" chamativo (amarelo) e recolhível; ajustar a foto no upload; modo escuro azul; comissão de 0,4% por venda com recebimentos por quinzena; "tirar todo lixo".

Decisões:
- **Voltar**: `PageHeader` ganha `backHref` (setinha + nome de onde veio) em novo/editar cliente e agendamento; a página do cliente mostra "← Clientes" em todo tamanho. **Atalhos** (`components/layout/shortcuts.tsx`): `/` busca, `n` novo cliente, `a` agendar, `?` lista, Esc fecha painéis.
- **Agenda**: arrastar com o mouse remarca (encaixe de 15 min, prévia tracejada, otimista + `rescheduleAppointmentAction`, toast "remarcado"); no toque, remarcar é pelo painel → Editar. Clientes no mesmo horário viram uma **pilha** (cards deslocados 10px, badge com a quantidade) e o clique abre o `EventChooser` para escolher. `layout.ts` passa a devolver `group/groupSize`.
- **Dinheiro**: `MoneyInput` (máscara pt-BR ao digitar, completa centavos ao sair) em carta, adesão, meta e meta padrão.
- **Quinzenas**: formulário "1ª quinzena do dia X ao dia Y"; a 2ª é calculada (Y+1 até X−1 do mês seguinte) e mostrada ao vivo com "hoje estamos na …". Armazenamento continua em cortes (`cutsFromRange`/`rangeFromCuts`).
- **Sons**: presets WebAudio (`lib/sounds.ts`: suave, sino, insistente, digital, sem som) com botão "Ouvir"; `alerts.sound` vira id (valores booleanos antigos são convertidos).
- **Comissão**: `settings.commission.ratePercent` (padrão 0,4%; mudar pede confirmação "subi de nível"). `commissionCents(cartas, %)` aparece no hero da meta, nas linhas do histórico, no card **Recebimentos** do Hoje (quinzena atual + anterior) e nos KPIs de resultados.
- **Hoje** repensado para o dia a dia: saudação com o nome; meta + recebimentos; Agora/Hoje/Atrasados/Amanhã; **Precisa de ação** (abertos sem próximo passo, parados em análise ≥ 5 dias, aprovados sem adesão — `listClientsNeedingAction`); **Resultados** com `PeriodPicker` (quinzena/mês/tudo): KPIs, série diária do período e funil. O heatmap saiu (bonito, pouco acionável).
- **Próximo** na sidebar: `NextUpCard` amarelo com contagem regressiva e botão de recolher (lembrado no navegador); tema Claro/Escuro/Automático na sidebar e em Config.
- **Fotos**: `PhotoCropper` (arrastar para enquadrar, zoom, recorte circular 512px) antes do upload; HEIC não decodificável sobe como veio.
- **Modo escuro**: tokens redefinidos em `[data-theme="dark"]` (azul-marinho #0d1526 / #141d33, nunca preto); script inline no `<head>` aplica o tema salvo antes da hidratação; `ThemeToggle` com `localStorage` + `prefers-color-scheme`.

## Adendo 5 (2026-08-28, madrugada) — pendências fechadas: quinzena livre, Excel, backup, instalador, app-like

Pedido: "faça as pendências" + erros vistos em uso. Entregue nesta rodada:

- **Quinzena em qualquer ordem.** A 1ª pode ir do dia 20 ao dia 5 (vira o mês); a 2ª é sempre o resto. `periodRange` decide sozinho se o segundo corte cai no mês seguinte. Metas padrão **separadas por metade** (`goals.defaultFirstCents` / `defaultSecondCents`) e meta própria por quinzena continua valendo; a produção soma as duas.
- **Meta de agendamentos por semana** (`goals.appointmentsPerWeek`): card na sidebar (semana atual × meta, delta vs. semana anterior) e seção em Metas com gráfico de 8 semanas (marcados × realizados, linha da meta) e a frase "Evoluindo / Estável / Regredindo" (`goals/trend.ts`, média das 3 últimas semanas fechadas contra as 3 anteriores).
- **Recebimentos** na tela de Metas: comissão por quinzena em gráfico + lista (em andamento / fechada / futura) e planilha Excel.
- **Compartilhar**: arte 1080×1080 gerada só com os números (SVG → PNG), "Enviar no grupo" (Web Share no celular; no computador baixa o PNG), "Baixar imagem" e "Imprimir" (chrome do app escondido na impressão).
- **Excel nativo**: todos os downloads viram `.xlsx` (`lib/xlsx.ts`, `write-excel-file`): clientes, aprovados (mesmos filtros da tela) e recebimentos. CSV removido.
- **Backup**: pasta `data/backups/AAAA-MM-DD_HHMM/` com o banco e os uploads + manifesto; automático diário (agendador em `instrumentation.ts` enquanto o servidor roda; tarefa do Windows às 00:05 pelo instalador mesmo com o app fechado); em Config: criar agora, baixar .zip, importar .zip, restaurar por data (sempre guardando uma cópia de segurança do estado atual antes). Mantém os 30 mais recentes.
- **Instalador Windows** (`installer/Instalar.bat`): checa Node, builda, registra o servidor para subir no logon, cria o atalho na Área de Trabalho e no Menu Iniciar com o ícone do troféu, libera a porta no firewall e agenda o backup. `Desinstalar.bat` desfaz tudo sem tocar em `data/`.
- **Logo**: troféu branco com taça limão em quadrado azul (`lib/brand.tsx`); ícones PNG em `/icons/[size]` para o manifest (PWA "Adicionar à tela inicial" abre em tela cheia) e para o `.ico` do instalador.
- **Funil**: colunas com fundo tingido por etapa (referência Anota AI), cards brancos; o card arrastado ganha a borda na cor da coluna sob ele, com transição; sonzinho "pop" ao soltar (desligável em Config). Tinta de cada coluna: novo cinza, agendado azul-claro, atendido azul-tinta, negociando amarelo, análise limão-claro, aprovado limão, fechou azul, perdido rosa.
- **Densidade compacta** (padrão no computador): `zoom: 0.85` na raiz do app em telas ≥ 1024px, alternável em Config › Aparência. Toda conta com coordenadas do ponteiro divide pelo zoom (`readZoom`); o overlay de arrasto do funil vive fora da raiz para não desalinhar.
- **Tema** com transição suave (350 ms nas cores) ao trocar claro/escuro.
- **Agenda no toque**: segurar o bloco 350 ms inicia o arrasto (vibra), rolagem travada enquanto arrasta; toque curto abre. Em tablet (768–1023px) a agenda usa colunas de 176px roláveis e esconde o mini-calendário; chips de tipo aparecem até `lg`.
- **Teste de alerta** em Config: "Testar alerta agora" dispara um alerta de verdade (card + som + notificação, se permitida) depois de destravar o áudio no clique; botão "Ativar notificações" quando ainda não foi pedido.

Fora desta rodada (continua): push com o app fechado; deploy na internet.

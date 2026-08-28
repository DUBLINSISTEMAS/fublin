# Relacionador

Sistema pessoal de organização para **relacionadores** de consórcio/crédito: cadastre os clientes que você traz para a loja, registre quem é o líder de vendas, o interesse (imóvel, automóvel…), acompanhe o funil até a aprovação e a adesão, guarde as propostas e **agende visitas, reuniões, ligações e retornos com lembrete**.

Roda no seu computador e é acessado também pelo celular (mesma rede Wi-Fi). Visual claro, responsivo, estilo dashboard SaaS.

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org) 20.9 ou mais novo (testado com Node 24).

```bash
npm install        # só na primeira vez
npm run dev        # abre em http://localhost:3000
```

O banco de dados (SQLite, arquivo `data/app.db`) é criado e migrado automaticamente na primeira abertura.

Quer ver o app com dados de exemplo?

```bash
npm run db:seed    # cria líderes, clientes e agendamentos fictícios
npm run db:reset   # apaga banco e anexos (recriados vazios no próximo `npm run dev`)
```

### No celular

1. Deixe `npm run dev` rodando no computador.
2. Abra **Config** no app: ele mostra o endereço da rede local, algo como `http://192.168.0.10:3000`.
3. Abra esse endereço no navegador do celular e use "Adicionar à tela inicial".

Se o celular não abrir, libere a porta 3000 no Firewall do Windows (na primeira execução ele costuma perguntar).

### Agenda

- **Dia · Semana · Mês**, no estilo Google Agenda: grade de horas com os blocos no tamanho da duração, linha vermelha do "agora", mini-calendário e filtro por tipo (visita, reunião online, ligação, retorno). Clique num horário vazio para agendar já naquela hora; clique num bloco para ver o cliente, chamar no WhatsApp, dar baixa ou editar.
- **Arraste um bloco** (com o mouse) para outro horário ou dia: remarca na hora, de 15 em 15 minutos. Dois clientes no mesmo horário aparecem empilhados com um contador — o clique abre a escolha de qual ver.
- No celular a semana desliza de lado, um dia por vez.

### Atalhos e navegação

Toda tela de cadastro tem a setinha de voltar. No computador: `/` vai para a busca, `n` abre um cliente novo, `a` abre um agendamento, `?` mostra os atalhos, `Esc` fecha painéis.

### Alertas

- A tela **Hoje** mostra o que está por vir agora, o dia inteiro e o que ficou atrasado sem baixa.
- Cada agendamento tem um lembrete (15 min, 30 min, 1 h…). Quando chega a hora, o alerta **fica na tela até você dispensar (X), adiar 5 min ou dar baixa**, repetindo som e notificação no intervalo que você escolher em **Config → Alertas** — lá você também escolhe e ouve o som (suave, sino, insistente, digital).
- Em **Config**, ative as notificações do navegador para receber o aviso do sistema mesmo em outra aba.

### Metas por quinzena

A loja fecha a produção em duas quinzenas por mês (por padrão a 1ª vai do dia 5 ao 19; a 2ª é o resto do mês — ajuste em **Config → Quinzenas**, escrevendo "do dia X ao dia Y"). Em **Metas** você define a meta de cada quinzena (ou uma meta padrão); cada cliente que chega a **Fechou** soma o valor da carta na barra, e o sistema diz quanto falta, quanto precisa fechar por dia e como está a produção (as duas quinzenas juntas). A meta também aparece no menu e na tela Hoje.

### Comissão e recebimentos

Sua comissão é **0,4% do valor de cada carta fechada** (Config → Comissão; mudar pede confirmação, porque só líderes ganham mais). A tela Hoje mostra quanto você vai receber pela quinzena atual e pela anterior; Metas mostra a comissão de cada quinzena do histórico.

### Você e os líderes

Em **Config → Perfil** coloque seu nome e sua foto (aparecem no topo do menu). Na aba **Líderes**, clique na câmera do avatar para colocar a foto de cada líder — ela aparece nos cards, na agenda e nas tabelas.

## Funil do cliente (a sua rotina)

`Novo` → `Agendado` → `Atendido` → `Em negociação` → `Em análise` → `Aprovado` → `Fechou` · `Perdido`

- **Atendido** = o cliente falou com o líder de vendas, na loja (presencial) ou por videochamada (online). Cada cliente tem o campo **Atendimento** (presencial/online) e o sistema conta quantas visitas/reuniões já aconteceram.
- **Em negociação** = voltou para nova reunião ou ajuste de proposta (é normal fechar na 2ª ou 3ª visita).
- **Em análise → Aprovado → Fechou** = a proposta foi para análise, passou, e a adesão foi paga. As datas de cada etapa são carimbadas sozinhas quando você move o card; a **adesão** e o **valor da carta** você preenche no card "Aprovação" da página do cliente.
- **Perdido** guarda o motivo.

Mova o cliente **arrastando o card** no kanban (mouse, toque com pressão longa ou teclado), pelo menu "…" do card ("Mover para"), ou pelo seletor na página do cliente. Automatismos que ajudam:

- agendar para um cliente **Novo** o marca como **Agendado**;
- marcar uma **visita** ou **reunião online** como **Realizado** registra o 1º atendimento e avança para **Atendido**.

Tudo fica na linha do tempo do cliente: status, líder, notas, agendamentos e anexos. Se alguma ação rápida falhar (por exemplo, o registro foi apagado em outro aparelho), a mensagem aparece ao lado do botão — nada falha em silêncio.

### Líderes, Aprovados e propostas

- **Líderes**: você atribui o líder no card ("…" → Líder de vendas) ou no cadastro; a aba mostra, por líder e por período (quinzena, mês ou tudo), clientes recebidos, atendidos, aprovados, fechados, conversão, cartas fechadas e adesão.
- **Aprovados**: aba com quem passou na análise — líder, carta, adesão, datas, anexos — por quinzena, mês ou geral, com exportação em Excel (.xlsx).
- **Propostas e documentos**: na página do cliente, anexe fotos ou PDFs (arrastando, escolhendo ou pela câmera do celular). Os arquivos ficam em `data/uploads/` e entram no backup diário automático (`data/backups/`).
- **Planilhas Excel** (Config ou Mais): clientes, aprovados e recebimentos em `.xlsx` nativo, com moeda e datas formatadas.
- **Backup**: todo dia à meia-noite (e às 00:05 pela tarefa do Windows, mesmo com o app fechado) o banco e os anexos vão para `data/backups/`; em Config você cria um backup agora, baixa o .zip, importa e restaura por data.
- **Metas e recebimentos**: metas por quinzena (1ª e 2ª podem ter valores diferentes), meta de agendamentos por semana com gráfico e tendência, comissão por quinzena, e uma arte pronta para mandar no grupo.

## Visual

Direção inspirada em dashboards SaaS de CRM (referências: *B2B SaaS Web CRM Dashboard* e *Customer Journey CRM Dashboard*, Dribbble): canvas cinza-azulado claro, painéis brancos flutuantes com raio grande, azul como cor principal, chips pastel (azul, limão, amarelo), contadores pretos redondos, tipografia geométrica leve (Outfit).

- **Hoje**: saudação, meta da quinzena e recebimentos, a agenda em colunas (Agora · Hoje · Atrasados · Amanhã), **Precisa de ação** (quem está sem próximo passo, parado em análise ou sem adesão) e **Resultados** por quinzena, mês ou tudo (KPIs, gráfico diário, funil).
- **Tema**: claro, escuro (azul-marinho) ou automático — na sidebar ou em Config.
- **Clientes**: kanban do funil por status com arrastar-e-soltar (`@dnd-kit`) — arraste o fundo ou use as setas para ver as outras etapas; o card que chega "pousa" com animação e um brilho azul. Ou lista; busca global na barra superior.
- Sidebar com seu perfil, a meta da quinzena, os líderes de vendas (com foto) e um card escuro com o próximo agendamento.

Tokens de cor, raio e sombra ficam em `src/app/globals.css` (`@theme`). Todo componente usa só esses tokens.

## Stack

| Camada | Escolha |
|---|---|
| App | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Dados | SQLite via `@libsql/client` + Drizzle ORM (migrações em `drizzle/`) |
| Validação | Zod (no servidor, em todas as entradas) |
| UI | Tailwind CSS 4, Outfit (Google Fonts via `next/font`), ícones Lucide, gráficos em SVG puro |
| Testes | Vitest: unitários + integração com SQLite em memória + componentes com Testing Library (jsdom) |

```
src/
  app/          rotas (Hoje, Clientes, Agenda, Aprovados, Metas, Líderes, Config, Mais, API), manifest e ícones
  components/   ui/ (primitivos, toasts, avatar, upload de foto) · layout/ (shell, sidebar, tabs, alertas) · charts/ (SVG)
  features/     clients · appointments (+ calendar/) · leaders · attachments · activities · goals · settings · photos
                 └ schema.ts (Zod) · service.ts · queries.ts · actions.ts · components/
  db/           schema Drizzle, conexão, seed, banco de teste
  lib/          domínio (rótulos), datas, quinzenas, períodos, dinheiro, xlsx, telefone, validação, resultado de ações
  test/         setup do Vitest e fixtures
```

Convenções detalhadas para quem for alterar o código: `CLAUDE.md`.

## Scripts

```bash
npm run dev            # desenvolvimento (acessível na rede local)
npm run build && npm start   # produção local
npm run check          # typecheck + lint + testes
npm run test:coverage  # cobertura
npm run db:generate    # gera migração após alterar src/db/schema.ts
```

## Limites desta versão

- Um usuário, sem login. Os dados ficam só neste computador (`data/app.db` + `data/uploads/`), com backup diário em `data/backups/`.
- Notificação com o app **fechado** (push) e deploy na nuvem ficam para uma próxima versão; a arquitetura já está pronta para isso (basta trocar o SQLite local por Turso/libSQL remoto e adicionar autenticação).

Decisões de design: `docs/superpowers/specs/2026-08-27-relacionador-crm-design.md`.

## Instalar no Windows

Para usar o Relacionador como um programa de verdade — ícone na Área de Trabalho e no Menu Iniciar, servidor subindo sozinho quando você entra no Windows, backup diário às 00:05 e porta 3000 liberada para o celular — dê duplo clique em [`installer/Instalar.bat`](installer/Instalar.bat). Para atualizar, rode-o de novo; para remover, [`installer/Desinstalar.bat`](installer/Desinstalar.bat) (seus dados em `data/` ficam). Detalhes e solução de problemas em [`installer/README.md`](installer/README.md).

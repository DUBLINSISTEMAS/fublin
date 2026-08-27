# Relacionador

Sistema pessoal de organização para **relacionadores** de consórcio/crédito: cadastre os clientes que você traz para a loja, registre quem é o líder de vendas, o interesse (imóvel, automóvel…), o dia em que o cliente veio, e **agende visitas, ligações e retornos com lembrete**.

Roda no seu computador e é acessado também pelo celular (mesma rede Wi-Fi). Visual claro, minimalista, responsivo.

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
npm run db:reset   # apaga tudo (o banco é recriado vazio no próximo `npm run dev`)
```

### No celular

1. Deixe `npm run dev` rodando no computador.
2. Abra **Config** no app: ele mostra o endereço da rede local, algo como `http://192.168.0.10:3000`.
3. Abra esse endereço no navegador do celular e use "Adicionar à tela inicial".

Se o celular não abrir, libere a porta 3000 no Firewall do Windows (na primeira execução ele costuma perguntar).

### Lembretes

- A tela **Hoje** mostra o que está por vir agora, o dia inteiro e o que ficou atrasado sem baixa.
- Em **Config**, ative as notificações do navegador. Com o app aberto (em qualquer aba), você recebe um aviso do sistema antes de cada agendamento, conforme o lembrete escolhido (15 min, 30 min, 1 h…).

## Funil do cliente

`Novo` → `Agendado` → `Visitou a loja` → `Em negociação` → `Fechou` / `Perdido`

O status é livre (você muda quando quiser), mas o sistema ajuda:

- criar um agendamento para um cliente **Novo** o marca como **Agendado**;
- marcar uma **visita** como **Realizado** registra a data da primeira visita e avança para **Visitou a loja**.

Toda mudança fica na linha do tempo do cliente, junto das suas notas.

## Visual

Direção inspirada em dashboards SaaS de CRM (referências: *B2B SaaS Web CRM Dashboard* e *Customer Journey CRM Dashboard*, Dribbble): canvas cinza-azulado claro, painéis brancos flutuantes com raio grande, azul como cor principal, chips pastel (azul, limão, amarelo), contadores pretos redondos, tipografia geométrica leve (Outfit).

- **Hoje**: gráfico de área (novos clientes × visitas, 7 dias), heatmap de atividade (hora × dia, 14 dias), KPIs e a agenda em colunas (Agora · Hoje · Atrasados · Amanhã).
- **Clientes**: kanban do funil por status (rola na horizontal no celular) ou lista; busca global na barra superior.
- Sidebar com os líderes de vendas e um card escuro com o próximo agendamento.

Tokens de cor, raio e sombra ficam em `src/app/globals.css` (`@theme`).

## Stack

| Camada | Escolha |
|---|---|
| App | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Dados | SQLite via `@libsql/client` + Drizzle ORM (migrações em `drizzle/`) |
| Validação | Zod (no servidor, em todas as entradas) |
| UI | Tailwind CSS 4, Outfit (Google Fonts via `next/font`), ícones Lucide, gráficos em SVG puro |
| Testes | Vitest (unitários + integração com SQLite em memória) |

```
src/
  app/          rotas (Hoje, Clientes, Agenda, Líderes, Config, API)
  components/   primitivos de UI e layout (sidebar, tabs mobile, lembretes)
  features/     clients · appointments · leaders · activities
                 └ schema.ts (Zod) · service.ts · queries.ts · actions.ts · components/
  db/           schema Drizzle, conexão, seed
  lib/          datas, domínio (rótulos), csv, telefone, validação
```

## Scripts

```bash
npm run dev            # desenvolvimento (acessível na rede local)
npm run build && npm start   # produção local
npm run check          # typecheck + lint + testes
npm run test:coverage  # cobertura
npm run db:generate    # gera migração após alterar src/db/schema.ts
```

## Limites desta versão

- Um usuário, sem login. Os dados ficam só neste computador (`data/app.db`) — faça backup da pasta `data/`.
- Notificação com o app **fechado** (push) e deploy na nuvem ficam para uma próxima versão; a arquitetura já está pronta para isso (basta trocar o SQLite local por Turso/libSQL remoto e adicionar autenticação).

Decisões de design: `docs/superpowers/specs/2026-08-27-relacionador-crm-design.md`.

# Publicação segura na Vercel

O sistema continua usando SQLite e arquivos locais no computador. Na Vercel, usa um banco libSQL/Turso remoto e um Vercel Blob **privado**, porque o disco das funções não é persistente.

## 1. Preserve a instalação atual

Na tela **Configurações → Backup**, crie e baixe um backup antes da migração. Não apague a pasta `data/`. A publicação não altera o banco instalado no computador.

## 2. Configure os serviços

1. Crie um banco Turso/libSQL e importe uma cópia de `data/app.db`.
2. No projeto da Vercel, conecte um Blob configurado como **private**.
3. Cadastre em Production, Preview e Development, conforme necessário:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `BLOB_READ_WRITE_TOKEN` (a integração do Blob normalmente cria esta variável)
   - `STORAGE_DRIVER=blob`
   - `SETUP_SECRET` com um valor longo e aleatório

Nunca salve esses valores no Git. Mudanças em variáveis só entram em vigor em um novo deploy.

## 3. Migre e valide

Na Vercel as migrações rodam **no build** (`npm run vercel-build` = `db:migrate` + `next build`), uma vez por deploy, antes de qualquer requisição. Por isso `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` precisam estar disponíveis no build (marque Production e Preview ao cadastrar). Se faltarem, o build falha com a mensagem "Banco não configurado" em vez de o site abrir quebrado.

Se mesmo assim a tela de entrar mostrar "Banco de dados indisponível", a mensagem exibida é a causa real; ela também aparece nos Runtime Logs do deploy.

Com as variáveis de produção disponíveis em um terminal seguro, você também pode validar antecipadamente:

```bash
npm run db:migrate
npm run deploy:check
```

Se o banco remoto estiver vazio, abra `/entrar` após o deploy e use a `SETUP_SECRET` para criar o primeiro administrador. Se você importou `app.db`, os usuários e agendamentos existentes continuam nele.

Com `BLOB_READ_WRITE_TOKEN` disponível no terminal, copie fotos e anexos existentes mantendo as chaves do banco:

```bash
npm run storage:migrate
```

Não coloque o sistema público em uso antes de confirmar banco e arquivos.

## 4. Publique

Conecte o repositório pelo painel da Vercel ou use `vercel` para Preview e `vercel --prod` para produção. Depois valide login, permissões de líder, criação de cliente, agenda e upload/download de um arquivo.

O backup local do aplicativo fica propositalmente desabilitado na nuvem. Use a política de backup/exportação dos provedores para banco e Blob.

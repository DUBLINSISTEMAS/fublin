# Instalar o Relacionador no Windows

Dê **duplo clique em `Instalar.bat`** (precisa do [Node.js](https://nodejs.org/pt) 20 ou mais novo; se faltar, o instalador abre o site e para). Ele:

1. roda `npm install` e `npm run build` na pasta do projeto;
2. cria `%LOCALAPPDATA%\Relacionador\` com os scripts que sobem o servidor **sem janela** (`iniciar-servidor.cmd` + `.vbs`, log em `servidor.log`) e o de backup (`fazer-backup.cmd` + `.vbs`, log em `backup.log`);
3. registra duas tarefas no Agendador do Windows, para o seu usuário, sem senha e sem limite de tempo:
   - **Relacionador - Servidor** — sobe `next start` na porta 3000 sempre que você entra no Windows (e já agora);
   - **Relacionador - Backup** — roda `npm run backup` todo dia às 00:05; se o PC estava desligado nessa hora, roda assim que ligar;
4. gera `relacionador.ico` a partir do ícone do app e cria o atalho **Relacionador** na Área de Trabalho e no Menu Iniciar — abre no Edge ou Chrome em modo aplicativo (janela própria, sem barra de endereço); sem esses navegadores, abre `http://localhost:3000` no padrão;
5. libera a porta 3000 no Firewall (regra `Relacionador 3000`). Só isso precisa de administrador: o Windows pergunta na hora; se você recusar, o app continua funcionando no PC e só o celular fica de fora (dá para liberar depois rodando `Instalar.bat` como administrador).

No fim ele mostra o endereço para abrir no celular (mesma rede Wi-Fi), onde ficam os dados (`data\`) e os backups (`data\backups\`).

## Atualizar

Rode `Instalar.bat` de novo: ele para o servidor antigo, refaz o build, reinicia e atualiza tarefas, ícone e atalhos. Pode rodar quantas vezes quiser.

## Desinstalar

`Desinstalar.bat` remove as tarefas, os atalhos, a regra do firewall e a pasta `%LOCALAPPDATA%\Relacionador`. **Não apaga `data\`** (banco, anexos, backups) nem a pasta do projeto — seus dados continuam lá.

## Se algo der errado

- **O atalho abre uma página de erro** → o servidor não subiu. Veja `%LOCALAPPDATA%\Relacionador\servidor.log`. A causa mais comum é a porta 3000 ocupada por um `npm run dev` aberto: feche-o e rode `Instalar.bat` de novo (ou saia e entre no Windows).
- **Backup não aparece em `data\backups\`** → veja `%LOCALAPPDATA%\Relacionador\backup.log`. A tarefa só roda com você logado no Windows.
- **Celular não abre** → confira a regra `Relacionador 3000` no Firewall (o instalador avisa se não conseguiu criá-la) e se o celular está na mesma rede Wi-Fi.
- Para ver ou rodar as tarefas à mão: Iniciar → "Agendador de Tarefas" → procure "Relacionador".

## Arquivos desta pasta

| Arquivo | Para quê |
|---|---|
| `Instalar.bat` / `instalar.ps1` | instala ou atualiza |
| `Desinstalar.bat` / `desinstalar.ps1` | remove (mantém `data\`) |
| `comum.ps1` | funções compartilhadas pelos dois scripts |
| `make-ico.mjs` | gera `relacionador.ico` baixando `http://localhost:3000/icons/256` (o app precisa estar no ar) |
| `relacionador.ico` | ícone do atalho (já vem pronto; o instalador o atualiza quando consegue) |

#Requires -Version 5.1
<#
  instalar.ps1 — instala o Relacionador neste computador (Windows 10/11).

  O que faz (e refaz, se você rodar de novo — serve para atualizar):
    1. confere o Node.js (20 ou mais novo; se faltar, abre o site para baixar);
    2. para o servidor anterior do Relacionador, se estiver rodando;
    3. npm install + npm run build na raiz do projeto;
    4. cria %LOCALAPPDATA%\Relacionador com os scripts que sobem o servidor sem janela;
    5. registra a tarefa "Relacionador - Servidor" (ao entrar no Windows) e a inicia;
    6. registra a tarefa "Relacionador - Backup" (todo dia às 00:05);
    7. gera o ícone e cria os atalhos (Área de Trabalho e Menu Iniciar);
    8. libera a porta 3000 no Firewall (pede permissão de administrador só para isso).

  Use pelo Instalar.bat (duplo clique) ou:
    powershell -NoProfile -ExecutionPolicy Bypass -File instalar.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

. (Join-Path $PSScriptRoot 'comum.ps1')

$Raiz = Split-Path $PSScriptRoot -Parent
$ArquivoIco = Join-Path $PSScriptRoot 'relacionador.ico'
$GeradorIco = Join-Path $PSScriptRoot 'make-ico.mjs'
$Usuario = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$NodeMinimo = 20
$EsperaServidorSegundos = 90
$SiteNode = 'https://nodejs.org/pt'

# ---------- funções ----------

function Abortar([string]$Mensagem, [string[]]$Dicas = @()) {
  Write-Host ''
  Write-Falha $Mensagem
  foreach ($dica in $Dicas) { Write-Info $dica }
  Write-Host ''
  Write-Host 'A instalação foi interrompida. Corrija o problema e rode o Instalar.bat de novo.' -ForegroundColor Red
  exit 1
}

function ConvertTo-VersaoNode([string]$Texto) {
  if ($Texto -match '^v?(\d+)\.(\d+)\.(\d+)') {
    return New-Object System.Version([int]$matches[1], [int]$matches[2], [int]$matches[3])
  }
  return $null
}

function Test-ScriptNpm([string]$Nome) {
  try {
    $pacote = Get-Content -LiteralPath (Join-Path $Raiz 'package.json') -Raw | ConvertFrom-Json
    return ($null -ne $pacote.scripts.$Nome)
  } catch {
    return $false
  }
}

function Register-Tarefa([string]$Nome, [string]$Descricao, [string]$Vbs, $Gatilho) {
  $acao = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument ('"{0}"' -f $Vbs)
  $config = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew
  # Em algumas versões do Windows o TimeSpan zero não vira "sem limite"; PT0S garante.
  try { $config.ExecutionTimeLimit = 'PT0S' } catch { }
  $principal = New-ScheduledTaskPrincipal -UserId $Usuario -LogonType Interactive -RunLevel Limited
  Register-ScheduledTask -TaskName $Nome -Description $Descricao -Action $acao -Trigger $Gatilho `
    -Settings $config -Principal $principal -Force | Out-Null
}

# ---------- início ----------

Write-Titulo 'Relacionador — instalação no Windows'
Write-Info "Projeto: $Raiz"
Write-Info "Usuário: $Usuario"

# 1. Node.js
Write-Etapa 'Conferindo o Node.js'
$comandoNode = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $comandoNode) {
  Start-Process $SiteNode
  Abortar 'Node.js não encontrado neste computador.' @(
    "Abri o site $SiteNode no navegador: baixe e instale a versão LTS ($NodeMinimo ou mais nova).",
    'Depois de instalar, feche esta janela e rode o Instalar.bat de novo.'
  )
}
$nodeExe = $comandoNode.Source
$versaoTexto = [string](& $nodeExe -v | Select-Object -First 1)
$versao = ConvertTo-VersaoNode $versaoTexto
if (-not $versao -or $versao.Major -lt $NodeMinimo) {
  Start-Process $SiteNode
  Abortar "O Node.js instalado ($versaoTexto) é antigo demais: precisa ser a versão $NodeMinimo ou mais nova." @(
    "Abri o site ${SiteNode}: instale a versão LTS por cima e rode o Instalar.bat de novo."
  )
}
Write-Ok "Node.js $versaoTexto ($nodeExe)"

$npmCmd = Join-Path (Split-Path $nodeExe -Parent) 'npm.cmd'
if (-not (Test-Path -LiteralPath $npmCmd)) {
  $comandoNpm = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($comandoNpm) { $npmCmd = $comandoNpm.Source }
  else { Abortar 'npm não encontrado (ele vem junto com o Node.js). Reinstale o Node.js.' }
}

# 2. Servidor anterior
Write-Etapa 'Verificando se o Relacionador já está rodando'
$parados = Stop-ServidorRelacionador $Raiz
if ($parados -gt 0) {
  Write-Ok "Servidor anterior parado ($parados processo(s)). Ele volta atualizado no fim da instalação."
} else {
  Write-Info 'Nenhum servidor anterior do Relacionador rodando.'
}
$outrosNaPorta = @(Get-ProcessosNaPorta $Porta)
$portaOcupada = ($outrosNaPorta.Count -gt 0)
if ($portaOcupada) {
  $descricao = ($outrosNaPorta | ForEach-Object { "$($_.Nome) (PID $($_.Pid))" }) -join ', '
  Write-Aviso "A porta $Porta está ocupada por outro programa: $descricao."
  Write-Info 'Se for o "npm run dev", feche-o. A instalação continua, mas o servidor instalado só sobe com a porta livre'
  Write-Info '(ele tenta de novo sozinho na próxima vez que você entrar no Windows, ou rode o Instalar.bat outra vez).'
}

# 3. Dependências e build
$env:NEXT_TELEMETRY_DISABLED = '1'
Push-Location -LiteralPath $Raiz
try {
  Write-Etapa 'Instalando as dependências (npm install) — pode levar alguns minutos'
  & $npmCmd install --no-fund --no-audit
  if ($LASTEXITCODE -ne 0) {
    Abortar "O npm install terminou com erro (código $LASTEXITCODE)." @(
      'Veja as mensagens acima. Confira a conexão com a internet e tente de novo.'
    )
  }
  Write-Ok 'Dependências instaladas.'

  Write-Etapa 'Gerando a versão de produção (npm run build) — pode levar alguns minutos'
  & $npmCmd run build
  if ($LASTEXITCODE -ne 0) {
    Abortar "O build falhou (código $LASTEXITCODE). O Relacionador NÃO foi instalado." @(
      'Veja o erro acima. Nada foi alterado nas tarefas e atalhos;',
      'se já havia uma versão instalada, ela fica parada até o build passar.'
    )
  }
  Write-Ok 'Build concluído.'
} finally {
  Pop-Location
}

# 4. Pasta do app e scripts
Write-Etapa "Preparando $PastaApp"
New-Item -ItemType Directory -Path $PastaApp -Force | Out-Null
$cmdServidor = Join-Path $PastaApp 'iniciar-servidor.cmd'
$vbsServidor = Join-Path $PastaApp 'iniciar-servidor.vbs'
$cmdBackup = Join-Path $PastaApp 'fazer-backup.cmd'
$vbsBackup = Join-Path $PastaApp 'fazer-backup.vbs'
$logServidor = Join-Path $PastaApp 'servidor.log'
$logBackup = Join-Path $PastaApp 'backup.log'

Write-ArquivoCmd $cmdServidor (Get-LinhasCmdServidor $Raiz $nodeExe $logServidor)
Write-ArquivoVbs $vbsServidor (Get-LinhasVbs $cmdServidor 'Roda o iniciar-servidor.cmd escondido (sem janela).')
Write-ArquivoCmd $cmdBackup (Get-LinhasCmdBackup $Raiz $npmCmd $logBackup)
Write-ArquivoVbs $vbsBackup (Get-LinhasVbs $cmdBackup 'Roda o fazer-backup.cmd escondido (sem janela).')
Write-Ok 'Scripts de inicialização e backup gravados.'

# 5. Tarefas agendadas
Write-Etapa 'Registrando as tarefas no Agendador do Windows'
try {
  Register-Tarefa $NomeTarefaServidor "Sobe o servidor local do Relacionador ($UrlLocal) ao entrar no Windows." `
    $vbsServidor (New-ScheduledTaskTrigger -AtLogOn -User $Usuario)
  Write-Ok "Tarefa '$NomeTarefaServidor' registrada (roda ao entrar no Windows)."
} catch {
  Abortar "Não consegui registrar a tarefa '$NomeTarefaServidor': $($_.Exception.Message)" @(
    'Confira se o serviço "Agendador de Tarefas" está ativo (services.msc).'
  )
}
try {
  Register-Tarefa $NomeTarefaBackup 'Backup diário dos dados do Relacionador (npm run backup) às 00:05.' `
    $vbsBackup (New-ScheduledTaskTrigger -Daily -At '00:05')
  Write-Ok "Tarefa '$NomeTarefaBackup' registrada (todo dia às 00:05; se o PC estiver desligado, roda ao ligar)."
} catch {
  Write-Aviso "Não consegui registrar a tarefa de backup: $($_.Exception.Message)"
}
if (-not (Test-ScriptNpm 'backup')) {
  Write-Aviso 'Este projeto ainda não tem o comando "npm run backup" no package.json: a tarefa de backup vai'
  Write-Info "falhar até ele existir (veja $logBackup). Atualize o projeto e rode o instalador de novo."
}

# 6. Subir o servidor
Write-Etapa 'Subindo o servidor'
$respondeu = $false
if ($portaOcupada) {
  Write-Aviso "Porta $Porta ocupada: não vou iniciar o servidor agora (veja o aviso da etapa 2)."
} else {
  try {
    Start-ScheduledTask -TaskName $NomeTarefaServidor
  } catch {
    Write-Aviso "Não consegui iniciar pela tarefa ($($_.Exception.Message)); iniciando direto."
    Start-Process -FilePath 'wscript.exe' -ArgumentList ('"{0}"' -f $vbsServidor)
  }
  Write-Host "    Aguardando $UrlLocal responder (até $EsperaServidorSegundos s) " -NoNewline
  $respondeu = Wait-Servidor $UrlLocal $EsperaServidorSegundos
  Write-Host ''
  if ($respondeu) {
    Write-Ok "Servidor no ar em $UrlLocal"
  } else {
    Write-Aviso "O servidor não respondeu em $EsperaServidorSegundos s. Veja o log: $logServidor"
    Write-Info 'A instalação continua; ele tenta subir de novo quando você entrar no Windows.'
  }
}

# 7. Ícone
Write-Etapa 'Gerando o ícone'
$icoGerado = $false
if (($respondeu -or $portaOcupada) -and (Test-Path -LiteralPath $GeradorIco)) {
  & $nodeExe $GeradorIco
  $icoGerado = ($LASTEXITCODE -eq 0)
}
if ($icoGerado) {
  Write-Ok "Ícone atualizado: $ArquivoIco"
} elseif (Test-Path -LiteralPath $ArquivoIco) {
  Write-Info "Usando o ícone que já vem com o projeto ($ArquivoIco)."
} else {
  Write-Aviso 'Sem ícone: o atalho vai usar o ícone do navegador.'
}

# 8. Atalhos
Write-Etapa 'Criando os atalhos'
$navegador = Find-Navegador
if ($navegador) {
  Write-Info "Navegador: $navegador (abre como aplicativo, sem barra de endereço)."
} else {
  Write-Aviso 'Não achei o Edge nem o Chrome: o atalho abre no navegador padrão.'
}
foreach ($caminhoAtalho in (Get-CaminhosAtalho)) {
  try {
    $criado = New-AtalhoRelacionador $caminhoAtalho $navegador $ArquivoIco
    Write-Ok "Atalho: $criado"
  } catch {
    Write-Aviso "Não consegui criar o atalho em $caminhoAtalho — $($_.Exception.Message)"
  }
}

# 9. Firewall
Write-Etapa "Liberando a porta $Porta no Firewall do Windows (para o celular)"
if (Test-RegraFirewall) {
  Write-Ok "A regra '$NomeRegraFirewall' já existe."
} else {
  if (-not (Test-Administrador)) {
    Write-Info 'Isso precisa de permissão de administrador: o Windows vai perguntar agora (clique em "Sim").'
  }
  $resultadoFirewall = Set-RegraFirewall 'adicionar'
  if ($resultadoFirewall -eq 'ok') {
    Write-Ok "Regra '$NomeRegraFirewall' criada."
  } else {
    Write-Aviso 'A porta NÃO foi liberada (sem permissão de administrador).'
    Write-Info 'O sistema funciona normalmente neste computador; só o celular não vai conseguir abrir.'
    Write-Info 'Para liberar depois: clique com o botão direito em Instalar.bat e escolha "Executar como administrador",'
    Write-Info 'ou rode este comando num PowerShell aberto como administrador:'
    Write-Info "  netsh advfirewall firewall add rule name=`"$NomeRegraFirewall`" dir=in action=allow protocol=TCP localport=$Porta"
  }
}

# 10. Resumo
Write-Titulo 'Pronto!'
Write-Host "  No computador : atalho 'Relacionador' na Área de Trabalho e no Menu Iniciar (ou abra $UrlLocal)."
Write-Host '                  O servidor sobe sozinho sempre que você entrar no Windows.'
$enderecos = @(Get-EnderecosRede)
if ($enderecos.Count -gt 0) {
  Write-Host '  No celular    : na mesma rede Wi-Fi, abra no navegador e use "Adicionar à tela inicial":'
  foreach ($endereco in $enderecos) {
    Write-Host "                  http://$($endereco.Endereco):$Porta" -ForegroundColor Cyan -NoNewline
    Write-Host "   ($($endereco.Rede))" -ForegroundColor Gray
  }
} else {
  Write-Host '  No celular    : veja o endereço em Config dentro do app (mesma rede Wi-Fi).'
}
Write-Host "  Dados         : $(Join-Path $Raiz 'data')"
Write-Host "  Backups       : $(Join-Path $Raiz 'data\backups')  (todo dia às 00:05)"
Write-Host "  Log           : $logServidor"
Write-Host ''
Write-Host '  Para atualizar: rode o Instalar.bat de novo.  Para remover: Desinstalar.bat (os dados ficam).' -ForegroundColor Gray

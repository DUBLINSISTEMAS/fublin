# comum.ps1 — constantes e funções usadas por instalar.ps1 e desinstalar.ps1.
# Carregado com:  . (Join-Path $PSScriptRoot 'comum.ps1')
# Compatível com Windows PowerShell 5.1 (sem &&, sem ??, sem ternário).

$Porta = 3000
$UrlLocal = "http://localhost:$Porta"
$NomeTarefaServidor = 'Relacionador - Servidor'
$NomeTarefaBackup = 'Relacionador - Backup'
$NomeRegraFirewall = 'Relacionador 3000'
$NomeAtalho = 'Relacionador.lnk'
$DescricaoAtalho = 'Relacionador — clientes, agenda e metas'
$PastaApp = Join-Path $env:LOCALAPPDATA 'Relacionador'
$PastaMenuIniciar = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$LimiteLogBytes = 5000000

$script:NumeroEtapa = 0

# ---------- saída no console ----------

function Write-Titulo([string]$Texto) {
  Write-Host ''
  Write-Host "  $Texto" -ForegroundColor Cyan
  Write-Host ('  ' + ('=' * $Texto.Length)) -ForegroundColor Cyan
  Write-Host ''
}

function Write-Etapa([string]$Texto) {
  $script:NumeroEtapa++
  Write-Host ''
  Write-Host "[$($script:NumeroEtapa)] $Texto" -ForegroundColor White
}

function Write-Ok([string]$Texto)    { Write-Host "    OK  $Texto" -ForegroundColor Green }
function Write-Info([string]$Texto)  { Write-Host "        $Texto" -ForegroundColor Gray }
function Write-Aviso([string]$Texto) { Write-Host "    !!  $Texto" -ForegroundColor Yellow }
function Write-Falha([string]$Texto) { Write-Host "    XX  $Texto" -ForegroundColor Red }

# ---------- sistema ----------

function Test-Administrador {
  $identidade = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identidade)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Caminhos dos dois atalhos: Área de Trabalho (respeita OneDrive) e Menu Iniciar.
function Get-CaminhosAtalho {
  $areaDeTrabalho = [Environment]::GetFolderPath('Desktop')
  if ([string]::IsNullOrWhiteSpace($areaDeTrabalho)) { $areaDeTrabalho = Join-Path $env:USERPROFILE 'Desktop' }
  return @(
    (Join-Path $areaDeTrabalho $NomeAtalho),
    (Join-Path $PastaMenuIniciar $NomeAtalho)
  )
}

# Grava um arquivo .cmd na codificação que o cmd.exe lê (OEM) — importante se o caminho tiver acento.
function Write-ArquivoCmd([string]$Caminho, [string[]]$Linhas) {
  $Linhas | Set-Content -LiteralPath $Caminho -Encoding Oem
}

# Grava um arquivo .vbs na codificação ANSI do sistema (a que o WScript lê).
function Write-ArquivoVbs([string]$Caminho, [string[]]$Linhas) {
  $Linhas | Set-Content -LiteralPath $Caminho -Encoding Default
}

# ---------- conteúdo dos scripts gerados em %LOCALAPPDATA%\Relacionador ----------

# Linha de .cmd que guarda o log anterior quando ele passa do limite (%LOG% precisa estar definido).
function Get-LinhaRotacaoLog {
  return "if exist ""%LOG%"" for %%F in (""%LOG%"") do if %%~zF GTR $LimiteLogBytes move /y ""%LOG%"" ""%LOG%.anterior"" >nul"
}

# iniciar-servidor.cmd: entra na raiz e sobe "next start" na porta, com log.
function Get-LinhasCmdServidor([string]$Raiz, [string]$NodeExe, [string]$Log) {
  $nextBin = Join-Path $Raiz 'node_modules\next\dist\bin\next'
  return @(
    '@echo off',
    'rem Sobe o servidor do Relacionador sem janela. Gerado pelo instalador (rodar o Instalar.bat refaz este arquivo).',
    "set ""LOG=$Log""",
    "set ""NODE=$NodeExe""",
    'if not exist "%NODE%" set "NODE=node"',
    (Get-LinhaRotacaoLog),
    "cd /d ""$Raiz""",
    'set NODE_ENV=production',
    'set NEXT_TELEMETRY_DISABLED=1',
    'rem Rede local sem HTTPS: cookie de sessao sem "secure" e primeiro acesso sem chave de instalacao.',
    'set LOCAL_NETWORK_HTTP=1',
    'echo [%date% %time%] iniciando o servidor >> "%LOG%"',
    """%NODE%"" ""$nextBin"" start -H 0.0.0.0 -p $Porta >> ""%LOG%"" 2>&1",
    'echo [%date% %time%] servidor encerrado com codigo %errorlevel% >> "%LOG%"'
  )
}

# fazer-backup.cmd: entra na raiz e roda "npm run backup", com log.
function Get-LinhasCmdBackup([string]$Raiz, [string]$NpmCmd, [string]$Log) {
  return @(
    '@echo off',
    'rem Backup diario dos dados do Relacionador (npm run backup). Gerado pelo instalador.',
    "set ""LOG=$Log""",
    "set ""NPM=$NpmCmd""",
    'if not exist "%NPM%" set "NPM=npm"',
    (Get-LinhaRotacaoLog),
    "cd /d ""$Raiz""",
    'echo [%date% %time%] backup iniciado >> "%LOG%"',
    'call "%NPM%" run backup >> "%LOG%" 2>&1',
    'echo [%date% %time%] backup terminou com codigo %errorlevel% >> "%LOG%"'
  )
}

# .vbs que roda um .cmd escondido (janela 0) sem esperar terminar.
function Get-LinhasVbs([string]$Cmd, [string]$Comentario) {
  return @(
    "' $Comentario Gerado pelo instalador.",
    ('CreateObject("WScript.Shell").Run """' + $Cmd + '""", 0, False')
  )
}

# ---------- atalho ----------

# Join-Path que devolve $null se a base estiver vazia (ex.: ProgramFiles(x86) em Windows 32 bits).
function Join-Seguro([string]$Base, [string]$Filho) {
  if ([string]::IsNullOrWhiteSpace($Base)) { return $null }
  return Join-Path $Base $Filho
}

# Edge, senão Chrome (nas pastas usuais). $null se não achar nenhum.
function Find-Navegador {
  $candidatos = @(
    (Join-Seguro ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Seguro $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Seguro $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Seguro ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Seguro $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
  )
  foreach ($caminho in $candidatos) {
    if ($caminho -and (Test-Path -LiteralPath $caminho)) { return $caminho }
  }
  return $null
}

# O mesmo atalho como Internet Shortcut (.url) — usado quando não há Edge/Chrome.
function Get-CaminhoAtalhoUrl([string]$CaminhoLnk) {
  return [System.IO.Path]::ChangeExtension($CaminhoLnk, '.url')
}

# Cria (ou sobrescreve) o atalho e devolve o caminho criado.
# Com navegador: .lnk em modo aplicativo. Sem: .url, que abre a URL no navegador padrão.
# Remove a variante que sobrou de uma instalação anterior (.url ou .lnk).
function New-AtalhoRelacionador([string]$CaminhoLnk, [string]$Navegador, [string]$Ico) {
  $pasta = Split-Path $CaminhoLnk -Parent
  if (-not (Test-Path -LiteralPath $pasta)) { New-Item -ItemType Directory -Path $pasta -Force | Out-Null }
  $caminhoUrl = Get-CaminhoAtalhoUrl $CaminhoLnk
  $temIco = ($Ico -and (Test-Path -LiteralPath $Ico))

  if ($Navegador) {
    $shell = New-Object -ComObject WScript.Shell
    $atalho = $shell.CreateShortcut($CaminhoLnk)
    $atalho.TargetPath = $Navegador
    $atalho.Arguments = "--app=$UrlLocal --window-size=1280,860"
    $atalho.WorkingDirectory = Split-Path $Navegador -Parent
    if ($temIco) { $atalho.IconLocation = "$Ico,0" }
    $atalho.Description = $DescricaoAtalho
    $atalho.Save()
    if (Test-Path -LiteralPath $caminhoUrl) { Remove-Item -LiteralPath $caminhoUrl -Force }
    return $CaminhoLnk
  }

  $linhas = @('[InternetShortcut]', "URL=$UrlLocal")
  if ($temIco) { $linhas += @("IconFile=$Ico", 'IconIndex=0') }
  $linhas | Set-Content -LiteralPath $caminhoUrl -Encoding Default
  if (Test-Path -LiteralPath $CaminhoLnk) { Remove-Item -LiteralPath $CaminhoLnk -Force }
  return $caminhoUrl
}

# ---------- servidor ----------

# Processos escutando na porta: Pid, Nome e LinhaDeComando. Nada se não houver (chame com @(...)).
function Get-ProcessosNaPorta([int]$PortaAlvo) {
  $resultado = @()
  try {
    $conexoes = @(Get-NetTCPConnection -LocalPort $PortaAlvo -State Listen -ErrorAction Stop)
  } catch {
    return $resultado
  }
  $listaPid = $conexoes | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($idProcesso in $listaPid) {
    if (-not $idProcesso) { continue }
    $info = Get-CimInstance Win32_Process -Filter "ProcessId = $idProcesso" -ErrorAction SilentlyContinue
    if (-not $info) { continue }
    $resultado += [pscustomobject]@{
      Pid            = [int]$idProcesso
      Nome           = [string]$info.Name
      LinhaDeComando = [string]$info.CommandLine
    }
  }
  return $resultado
}

# É o servidor do Relacionador ("next start" rodando a partir desta raiz)?
# Um "npm run dev" ou outro projeto na mesma porta NÃO casa — e fica intacto.
function Test-ServidorRelacionador($Processo, [string]$Raiz) {
  if (-not $Processo) { return $false }
  $linha = [string]$Processo.LinhaDeComando
  if ([string]::IsNullOrWhiteSpace($linha)) { return $false }
  $ehNode = $Processo.Nome -match '^node(\.exe)?$'
  $ehStart = $linha -match 'next"?\s+start\b'
  $ehDestaRaiz = $linha.ToLowerInvariant().Contains($Raiz.ToLowerInvariant())
  return ($ehNode -and $ehStart -and $ehDestaRaiz)
}

# Para o servidor do Relacionador desta raiz (só ele). Devolve quantos processos parou.
function Stop-ServidorRelacionador([string]$Raiz) {
  $parados = 0
  foreach ($processo in (Get-ProcessosNaPorta $Porta)) {
    if (Test-ServidorRelacionador $processo $Raiz) {
      Stop-Process -Id $processo.Pid -Force -ErrorAction SilentlyContinue
      $parados++
    }
  }
  if ($parados -gt 0) { Start-Sleep -Seconds 2 }
  return $parados
}

# Espera a URL responder (até N segundos). Imprime um ponto a cada tentativa.
function Wait-Servidor([string]$Url, [int]$Segundos) {
  $limite = (Get-Date).AddSeconds($Segundos)
  while ((Get-Date) -lt $limite) {
    try {
      $resposta = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($resposta.StatusCode -ge 200 -and $resposta.StatusCode -lt 500) { return $true }
    } catch { }
    Write-Host '.' -NoNewline
    Start-Sleep -Seconds 2
  }
  return $false
}

# ---------- firewall ----------

function Test-RegraFirewall {
  try {
    $regra = Get-NetFirewallRule -DisplayName $NomeRegraFirewall -ErrorAction Stop
    return ($null -ne $regra)
  } catch {
    return $false
  }
}

# Cria ('adicionar') ou remove ('remover') a regra que libera a porta.
# Sem permissão de administrador, pede elevação (o Windows mostra o aviso do UAC).
# Devolve 'ok', 'recusado' (usuário não autorizou) ou 'erro'.
function Set-RegraFirewall([string]$Acao) {
  $remover = "advfirewall firewall delete rule name=`"$NomeRegraFirewall`""
  $adicionar = "advfirewall firewall add rule name=`"$NomeRegraFirewall`" dir=in action=allow protocol=TCP localport=$Porta"
  try {
    if (Test-Administrador) {
      & netsh.exe advfirewall firewall delete rule name="$NomeRegraFirewall" | Out-Null
      if ($Acao -eq 'adicionar') {
        & netsh.exe advfirewall firewall add rule name="$NomeRegraFirewall" dir=in action=allow protocol=TCP localport=$Porta | Out-Null
      }
    } else {
      $comando = "netsh $remover"
      if ($Acao -eq 'adicionar') { $comando = "$comando & netsh $adicionar" }
      Start-Process -FilePath 'cmd.exe' -ArgumentList "/c $comando" -Verb RunAs -WindowStyle Hidden -Wait | Out-Null
    }
  } catch {
    return 'recusado'
  }
  $existe = Test-RegraFirewall
  if ($Acao -eq 'adicionar' -and $existe) { return 'ok' }
  if ($Acao -eq 'remover' -and -not $existe) { return 'ok' }
  return 'erro'
}

# ---------- rede ----------

# Endereços IPv4 das placas físicas ativas (Wi-Fi primeiro), para abrir no celular. Chame com @(...).
function Get-EnderecosRede {
  $lista = @()
  try {
    $ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' })
    $adaptadores = @(Get-NetAdapter -Physical -ErrorAction Stop | Where-Object { $_.Status -eq 'Up' })
    $ordenados = $adaptadores | Sort-Object {
      if (($_.Name + ' ' + $_.InterfaceDescription) -match 'Wi-?Fi|Wireless|WLAN|802\.11') { 0 } else { 1 }
    }
    foreach ($adaptador in $ordenados) {
      foreach ($ip in $ips) {
        if ($ip.InterfaceIndex -eq $adaptador.InterfaceIndex) {
          $lista += [pscustomobject]@{ Rede = $adaptador.Name; Endereco = $ip.IPAddress }
        }
      }
    }
    if ($lista.Count -eq 0) {
      foreach ($ip in $ips) {
        $lista += [pscustomobject]@{ Rede = $ip.InterfaceAlias; Endereco = $ip.IPAddress }
      }
    }
  } catch { }
  return $lista
}

#Requires -Version 5.1
<#
  desinstalar.ps1 — remove o que o instalar.ps1 criou:
    - as tarefas "Relacionador - Servidor" e "Relacionador - Backup";
    - os atalhos da Área de Trabalho e do Menu Iniciar;
    - a regra "Relacionador 3000" do Firewall;
    - a pasta %LOCALAPPDATA%\Relacionador.

  NÃO apaga a pasta data\ (banco, anexos e backups) nem a pasta do projeto.

  Use pelo Desinstalar.bat (duplo clique) ou:
    powershell -NoProfile -ExecutionPolicy Bypass -File desinstalar.ps1 [-Sim]
#>
[CmdletBinding()]
param(
  # Pula a pergunta de confirmação.
  [switch]$Sim
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

. (Join-Path $PSScriptRoot 'comum.ps1')

$Raiz = Split-Path $PSScriptRoot -Parent
$PastaDados = Join-Path $Raiz 'data'

Write-Titulo 'Relacionador — desinstalação'
Write-Info "Projeto: $Raiz"
Write-Info 'Isto remove: o servidor automático, o backup diário, os atalhos, a regra do firewall e a pasta %LOCALAPPDATA%\Relacionador.'
Write-Info "Isto NÃO apaga: seus dados em $PastaDados nem a pasta do projeto."
Write-Host ''
if (-not $Sim) {
  $resposta = Read-Host 'Digite S e Enter para confirmar (qualquer outra coisa cancela)'
  if ($resposta -notmatch '^[sS]$') {
    Write-Host 'Cancelado. Nada foi alterado.'
    exit 0
  }
}

# 1. Servidor
Write-Etapa 'Parando o servidor'
$parados = Stop-ServidorRelacionador $Raiz
if ($parados -gt 0) { Write-Ok "Servidor parado ($parados processo(s))." }
else { Write-Info 'O servidor não estava rodando.' }

# 2. Tarefas
Write-Etapa 'Removendo as tarefas agendadas'
foreach ($nome in @($NomeTarefaServidor, $NomeTarefaBackup)) {
  $tarefa = Get-ScheduledTask -TaskName $nome -ErrorAction SilentlyContinue
  if (-not $tarefa) {
    Write-Info "Tarefa '$nome' não existia."
    continue
  }
  try {
    Unregister-ScheduledTask -TaskName $nome -Confirm:$false
    Write-Ok "Tarefa '$nome' removida."
  } catch {
    Write-Aviso "Não consegui remover a tarefa '$nome': $($_.Exception.Message)"
  }
}

# 3. Atalhos
Write-Etapa 'Removendo os atalhos'
$arquivosAtalho = @()
foreach ($caminhoLnk in (Get-CaminhosAtalho)) {
  $arquivosAtalho += @($caminhoLnk, (Get-CaminhoAtalhoUrl $caminhoLnk))
}
foreach ($caminhoAtalho in $arquivosAtalho) {
  if (-not (Test-Path -LiteralPath $caminhoAtalho)) {
    Write-Info "Não existia: $caminhoAtalho"
    continue
  }
  try {
    Remove-Item -LiteralPath $caminhoAtalho -Force
    Write-Ok "Removido: $caminhoAtalho"
  } catch {
    Write-Aviso "Não consegui remover $caminhoAtalho — $($_.Exception.Message)"
  }
}

# 4. Firewall
Write-Etapa 'Removendo a regra do firewall'
if (-not (Test-RegraFirewall)) {
  Write-Info "A regra '$NomeRegraFirewall' não existia."
} else {
  if (-not (Test-Administrador)) {
    Write-Info 'Isso precisa de permissão de administrador: o Windows vai perguntar agora (clique em "Sim").'
  }
  $resultadoFirewall = Set-RegraFirewall 'remover'
  if ($resultadoFirewall -eq 'ok') {
    Write-Ok "Regra '$NomeRegraFirewall' removida."
  } else {
    Write-Aviso "A regra '$NomeRegraFirewall' NÃO foi removida (sem permissão de administrador)."
    Write-Info 'Para remover depois: clique com o botão direito em Desinstalar.bat e escolha "Executar como administrador",'
    Write-Info 'ou rode num PowerShell aberto como administrador:'
    Write-Info "  netsh advfirewall firewall delete rule name=`"$NomeRegraFirewall`""
  }
}

# 5. Pasta do app
Write-Etapa "Removendo $PastaApp"
if (-not (Test-Path -LiteralPath $PastaApp)) {
  Write-Info 'A pasta não existia.'
} else {
  try {
    Remove-Item -LiteralPath $PastaApp -Recurse -Force
    Write-Ok 'Pasta removida.'
  } catch {
    Write-Aviso "Não consegui apagar a pasta (algum arquivo em uso?): $($_.Exception.Message)"
    Write-Info 'Reinicie o computador e apague-a manualmente.'
  }
}

# 6. Resumo
Write-Titulo 'Desinstalação concluída'
Write-Host "  Seus dados continuam em: $PastaDados"
Write-Host '                           (banco app.db, anexos em uploads\, backups em backups\)'
Write-Host "  A pasta do projeto ($Raiz) também ficou."
Write-Host '  Se quiser remover tudo, apague a pasta do projeto — mas guarde a pasta data\ antes.'
Write-Host '  Para instalar de novo: Instalar.bat.' -ForegroundColor Gray

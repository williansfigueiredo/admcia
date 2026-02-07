# Script para exportar dados do MySQL local
Write-Host "📤 Exportando dados do MySQL local..." -ForegroundColor Cyan

# CONFIGURAÇÕES DO BANCO LOCAL
$LOCAL_USER = "root"
$LOCAL_PASS = ""  # Coloque sua senha aqui se tiver
$LOCAL_DB = "sistema_gestao_tp"

# Exportar apenas os DADOS (sem estrutura)
Write-Host "Criando arquivo dados-local.sql..." -ForegroundColor Yellow

$comando = "mysqldump -u $LOCAL_USER"
if ($LOCAL_PASS) {
    $comando += " -p$LOCAL_PASS"
}
$comando += " --no-create-info --skip-triggers --complete-insert $LOCAL_DB"
$comando += " > dados-local.sql"

Invoke-Expression $comando

if (Test-Path "dados-local.sql") {
    Write-Host "✅ Dados exportados para: dados-local.sql" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximo passo:" -ForegroundColor Yellow
    Write-Host "   1. Adicione este arquivo ao Git" -ForegroundColor White
    Write-Host "   2. Faça push para o GitHub" -ForegroundColor White
    Write-Host "   3. O Railway vai importar automaticamente" -ForegroundColor White
} else {
    Write-Host "❌ Erro ao exportar dados!" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Verifique se o MySQL está instalado:" -ForegroundColor Yellow
    Write-Host "   mysql --version" -ForegroundColor White
}

Read-Host "Pressione ENTER"

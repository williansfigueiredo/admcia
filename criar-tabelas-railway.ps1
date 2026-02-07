# Script para criar tabelas no Railway MySQL
# Execute este script no PowerShell

Write-Host "🚀 Criando tabelas no Railway MySQL..." -ForegroundColor Green

# Você precisa das credenciais do Railway
# Vá em Railway > MySQL > Variables e pegue:
# - MYSQLHOST (ou DB_HOST)
# - MYSQLUSER (ou DB_USER)  
# - MYSQLPASSWORD (ou DB_PASS)
# - MYSQLDATABASE (ou DB_NAME)
# - MYSQLPORT (ou DB_PORT)

$DB_HOST = "mysql.railway.internal"  # ou o host correto
$DB_PORT = "3306"
$DB_USER = "root"
$DB_PASS = ""  # COLOQUE A SENHA AQUI
$DB_NAME = "railway"

# Verifica se o MySQL client está instalado
$mysqlPath = "mysql"

try {
    Write-Host "📡 Conectando ao Railway MySQL..." -ForegroundColor Cyan
    
    # Executa o SQL
    Get-Content "database_completo.sql" | & $mysqlPath -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME
    
    Write-Host "✅ Tabelas criadas com sucesso!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erro: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 OPÇÃO ALTERNATIVA:" -ForegroundColor Yellow
    Write-Host "1. Acesse: https://railway.app/" -ForegroundColor White
    Write-Host "2. Vá no seu projeto > MySQL > Query" -ForegroundColor White
    Write-Host "3. Cole o conteúdo de database_completo.sql" -ForegroundColor White
    Write-Host "4. Execute!" -ForegroundColor White
}

Read-Host "Pressione ENTER para sair"

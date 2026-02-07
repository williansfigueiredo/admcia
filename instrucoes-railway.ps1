# ================================================
# INSTRUÇÕES PARA CRIAR TABELAS NO RAILWAY MYSQL
# ================================================

# CREDENCIAIS FORNECIDAS:
# Host Interno: mysql.railway.internal (NÃO FUNCIONA de fora)
# Database: railway
# User: root
# Password: mstiQHeOFUkxyvorfVPwzTqoXODkJOoc
# Port: 3306

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SOLUCAO: Use DBeaver para conectar" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "O host mysql.railway.internal so funciona DENTRO do Railway." -ForegroundColor Red
Write-Host ""
Write-Host "OPCOES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. BAIXAR DBEAVER (Recomendado):" -ForegroundColor Green
Write-Host "   - Baixe: https://dbeaver.io/download/" -ForegroundColor White
Write-Host "   - Instale e abra" -ForegroundColor White
Write-Host "   - Nova Conexao > MySQL" -ForegroundColor White
Write-Host "   - Use as credenciais abaixo" -ForegroundColor White
Write-Host ""

Write-Host "2. NO RAILWAY, PROCURE O HOST PUBLICO:" -ForegroundColor Green
Write-Host "   - Va em MySQL > Variables" -ForegroundColor White
Write-Host "   - Procure por: MYSQL_PUBLIC_URL ou MYSQLURL" -ForegroundColor White
Write-Host "   - Deve ter algo como: xyz.railway.app ou viaduct.proxy.rlwy.net" -ForegroundColor White
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CREDENCIAIS (salvas em credenciais.txt)" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan

$cred = @"
CREDENCIAIS RAILWAY MYSQL
=========================

Host Interno: mysql.railway.internal
(Use o host publico que voce encontrar nas Variables)

Database: railway
User: root
Password: mstiQHeOFUkxyvorfVPwzTqoXODkJOoc
Port: 3306

=========================
ARQUIVO SQL: database_completo.sql
=========================
"@

$cred | Out-File "credenciais.txt" -Encoding UTF8

Write-Host ""
Write-Host "Credenciais salvas em: credenciais.txt" -ForegroundColor Green
Write-Host ""

notepad "credenciais.txt"

Write-Host ""
Write-Host "Abrindo download do DBeaver..." -ForegroundColor Cyan
Start-Process "https://dbeaver.io/download/"

Write-Host ""
Read-Host "Pressione ENTER para sair"

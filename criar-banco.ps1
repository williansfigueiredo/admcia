# Script para criar tabelas no Railway MySQL

Write-Host ""
Write-Host "CRIADOR DE TABELAS - RAILWAY MYSQL" -ForegroundColor Cyan
Write-Host ""

Write-Host "Va no Railway e copie as credenciais:" -ForegroundColor Yellow
Write-Host ""

$MYSQLHOST = Read-Host "MYSQLHOST"
$MYSQLPORT = Read-Host "MYSQLPORT"
$MYSQLUSER = Read-Host "MYSQLUSER"
$MYSQLPASSWORD = Read-Host "MYSQLPASSWORD" -AsSecureString
$MYSQLDATABASE = Read-Host "MYSQLDATABASE"

$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($MYSQLPASSWORD)
$PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Conectando..." -ForegroundColor Cyan

$mysqlInstalled = Get-Command mysql -ErrorAction SilentlyContinue

if (-not $mysqlInstalled) {
    Write-Host "MySQL nao instalado. Criando arquivo com credenciais..." -ForegroundColor Yellow
    
    $info = "Host: $MYSQLHOST`nPort: $MYSQLPORT`nUser: $MYSQLUSER`nPassword: $PlainPassword`nDatabase: $MYSQLDATABASE"
    $info | Out-File "CREDENCIAIS_RAILWAY.txt"
    
    Write-Host "Salvo em: CREDENCIAIS_RAILWAY.txt" -ForegroundColor Green
    notepad "CREDENCIAIS_RAILWAY.txt"
    
} else {
    Write-Host "Executando SQL..." -ForegroundColor Cyan
    Get-Content "database_completo.sql" | mysql -h $MYSQLHOST -P $MYSQLPORT -u $MYSQLUSER -p$PlainPassword $MYSQLDATABASE
    Write-Host "Concluido!" -ForegroundColor Green
}

Read-Host "Pressione ENTER"

// Script para verificar estrutura da tabela clientes
const mysql = require('mysql2');

console.log('🔍 Verificando estrutura da tabela clientes...\n');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'mysql.railway.internal',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'railway',
  port: Number(process.env.DB_PORT || 3306)
});

db.connect((err) => {
  if (err) {
    console.error('❌ Erro ao conectar:', err);
    process.exit(1);
  }
  
  console.log('✅ Conectado!\n');
  
  db.query('DESCRIBE clientes', (error, results) => {
    if (error) {
      console.error('❌ Erro:', error.message);
      db.end();
      process.exit(1);
    }
    
    console.log('📋 Estrutura da tabela clientes:\n');
    results.forEach(col => {
      console.log(`${col.Field}: ${col.Type}`);
      if (col.Field === 'uf') {
        console.log('\n⚠️  CAMPO UF: ' + col.Type);
        if (col.Type !== 'varchar(50)') {
          console.log('❌ PROBLEMA: Campo UF ainda está com tamanho errado!');
        } else {
          console.log('✅ Campo UF está correto!');
        }
      }
    });
    
    db.end();
  });
});

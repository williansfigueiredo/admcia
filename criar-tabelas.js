// Script para criar tabelas no Railway MySQL via Node.js
// Execute este script no seu servidor que já está conectado ao Railway

const fs = require('fs');
const mysql = require('mysql2');

console.log('🚀 Criando tabelas no Railway MySQL...\n');

// Usar as variáveis de ambiente do Railway
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'mysql.railway.internal',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'railway',
  port: Number(process.env.DB_PORT || 3306),
  multipleStatements: true // Permite executar múltiplos SQL
});

db.connect((err) => {
  if (err) {
    console.error('❌ Erro ao conectar:', err);
    process.exit(1);
  }
  
  console.log('✅ Conectado ao MySQL Railway!\n');
  
  // Ler o arquivo SQL
  const sql = fs.readFileSync('database_completo.sql', 'utf8');
  
  console.log('📤 Executando SQL...\n');
  
  // Executar o SQL
  db.query(sql, (error, results) => {
    if (error) {
      console.error('❌ Erro ao executar SQL:', error);
      db.end();
      process.exit(1);
    }
    
    console.log('✅ SUCESSO! Tabelas criadas com sucesso!\n');
    console.log('📊 Resultados:', results);
    
    // Verificar as tabelas criadas
    db.query('SHOW TABLES', (err, tables) => {
      if (err) {
        console.error('Erro ao listar tabelas:', err);
      } else {
        console.log('\n📋 Tabelas criadas:');
        tables.forEach(table => {
          console.log('  ✓', Object.values(table)[0]);
        });
      }
      
      db.end();
      console.log('\n✅ Concluído!');
    });
  });
});

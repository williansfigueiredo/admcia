// Script para aumentar tamanho do campo UF
const mysql = require('mysql2');

console.log('🔧 Corrigindo tamanho do campo UF...\n');

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
  
  console.log('✅ Conectado ao MySQL!\n');
  
  // Aumentar campo UF da tabela clientes
  const sql = `ALTER TABLE clientes MODIFY COLUMN uf VARCHAR(50) DEFAULT NULL`;
  
  db.query(sql, (error) => {
    if (error) {
      console.error('❌ Erro ao alterar:', error.message);
      db.end();
      process.exit(1);
    }
    
    console.log('✅ Campo UF alterado para VARCHAR(50)!\n');
    db.end();
  });
});

/**
 * Script de diagnóstico - verifica dados do funcionário
 */
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sistema_gestao_tp'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
  
  const sql = `SELECT id, nome, email, telefone, 
               CASE WHEN senha_hash IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_senha,
               is_master, acesso_ativo
               FROM funcionarios 
               WHERE status = 'Ativo'
               ORDER BY nome`;
  
  db.query(sql, (err, rows) => {
    if (err) {
      console.error('❌ Erro:', err.message);
    } else {
      console.log('\n📋 Todos os funcionários ativos:');
      console.table(rows);
    }
    db.end();
  });
});

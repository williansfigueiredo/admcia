// Script para importar dados no Railway MySQL
const fs = require('fs');
const mysql = require('mysql2');

console.log('📥 Importando dados no Railway MySQL...\n');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'mysql.railway.internal',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'railway',
  port: Number(process.env.DB_PORT || 3306),
  multipleStatements: true
});

db.connect((err) => {
  if (err) {
    console.error('❌ Erro ao conectar:', err);
    process.exit(1);
  }
  
  console.log('✅ Conectado ao Railway MySQL!\n');
  
  // Ler o arquivo de dados
  const sql = fs.readFileSync('dados-local.sql', 'utf8');
  
  console.log('📤 Inserindo dados...\n');
  
  db.query(sql, (error) => {
    if (error) {
      console.error('❌ Erro ao importar:', error.message);
      db.end();
      process.exit(1);
    }
    
    console.log('✅ DADOS IMPORTADOS COM SUCESSO!\n');
    
    // Verificar quantos registros foram inseridos
    const tabelas = ['clientes', 'funcionarios', 'jobs', 'equipamentos', 'job_itens', 'job_equipe', 'escalas', 'veiculos'];
    
    let completed = 0;
    tabelas.forEach(tabela => {
      db.query(`SELECT COUNT(*) as total FROM ${tabela}`, (err, result) => {
        if (!err) {
          console.log(`   ${tabela}: ${result[0].total} registros`);
        }
        completed++;
        if (completed === tabelas.length) {
          db.end();
          console.log('\n🎉 Importação concluída!');
        }
      });
    });
  });
});

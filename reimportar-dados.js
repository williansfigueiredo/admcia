// Script para LIMPAR e REIMPORTAR dados no Railway
const fs = require('fs');
const mysql = require('mysql2');

console.log('🗑️  LIMPANDO e REIMPORTANDO dados...\n');

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
  
  // Limpar todas as tabelas (ordem inversa por causa de FK)
  const sqlLimpar = `
    SET FOREIGN_KEY_CHECKS = 0;
    TRUNCATE TABLE escalas;
    TRUNCATE TABLE job_equipe;
    TRUNCATE TABLE job_itens;
    TRUNCATE TABLE jobs;
    TRUNCATE TABLE equipamentos;
    TRUNCATE TABLE veiculos;
    TRUNCATE TABLE funcionarios;
    TRUNCATE TABLE clientes;
    SET FOREIGN_KEY_CHECKS = 1;
  `;
  
  console.log('🗑️  Limpando tabelas...\n');
  
  db.query(sqlLimpar, (error) => {
    if (error) {
      console.error('❌ Erro ao limpar:', error.message);
      db.end();
      process.exit(1);
    }
    
    console.log('✅ Tabelas limpas!\n');
    
    // Importar dados e REMOVER caracteres problemáticos
    let sql = fs.readFileSync('dados-local.sql', 'utf8');
    
    // Remover BOM e caracteres invisíveis
    sql = sql.replace(/^\uFEFF/, '');  // Remove BOM
    sql = sql.replace(/[^\x00-\x7F]/g, '');  // Remove caracteres não-ASCII
    
    console.log('📤 Inserindo dados...\n');
    
    db.query(sql, (error) => {
      if (error) {
        console.error('❌ Erro ao importar:', error.message);
        db.end();
        process.exit(1);
      }
      
      console.log('✅ DADOS IMPORTADOS COM SUCESSO!\n');
      
      // Verificar quantos registros
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
            console.log('\n🎉 Reimportação concluída!');
          }
        });
      });
    });
  });
});

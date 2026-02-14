/**
 * Script para definir um funcionário como MASTER
 * Uso: node scripts/definir-master.js
 */

const mysql = require('mysql2');

// Configuração do banco
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sistema_gestao_tp'
});

// Email do funcionário para definir como master
const EMAIL_MASTER = 'patricia@ciadotp.com.br';

db.connect((err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Conectado ao banco de dados');
  
  // Primeiro, verifica se a coluna is_master existe
  const sqlCheck = `SHOW COLUMNS FROM funcionarios LIKE 'is_master'`;
  
  db.query(sqlCheck, (err, columns) => {
    if (err) {
      console.error('❌ Erro ao verificar coluna:', err.message);
      db.end();
      process.exit(1);
    }
    
    if (columns.length === 0) {
      console.log('⚠️ Coluna is_master não existe. Criando...');
      
      const sqlCreate = `ALTER TABLE funcionarios ADD COLUMN is_master TINYINT(1) NOT NULL DEFAULT 0`;
      
      db.query(sqlCreate, (err2) => {
        if (err2) {
          console.error('❌ Erro ao criar coluna:', err2.message);
          db.end();
          process.exit(1);
        }
        console.log('✅ Coluna is_master criada!');
        definirMaster();
      });
    } else {
      console.log('✅ Coluna is_master já existe');
      definirMaster();
    }
  });
  
  function definirMaster() {
    // Atualiza o funcionário para master
    const sqlUpdate = `UPDATE funcionarios SET is_master = 1 WHERE email = ?`;
    
    db.query(sqlUpdate, [EMAIL_MASTER], (err, result) => {
      if (err) {
        console.error('❌ Erro ao atualizar:', err.message);
        db.end();
        process.exit(1);
      }
      
      if (result.affectedRows === 0) {
        console.log(`⚠️ Funcionário com email "${EMAIL_MASTER}" não encontrado.`);
        listarFuncionarios();
      } else {
        console.log(`\n✅ Funcionário "${EMAIL_MASTER}" definido como MASTER!`);
        
        // Verifica
        db.query('SELECT id, nome, email, is_master FROM funcionarios WHERE email = ?', [EMAIL_MASTER], (err2, rows) => {
          if (!err2 && rows.length > 0) {
            console.log('\n📋 Dados atualizados:');
            console.table(rows);
          }
          db.end();
          console.log('\n✅ Concluído! Reinicie o servidor e faça login novamente.');
        });
      }
    });
  }
  
  function listarFuncionarios() {
    console.log('\n📋 Funcionários cadastrados:');
    db.query('SELECT id, nome, email, is_master FROM funcionarios WHERE status = "Ativo"', (err, rows) => {
      if (!err) {
        console.table(rows);
      }
      db.end();
    });
  }
});

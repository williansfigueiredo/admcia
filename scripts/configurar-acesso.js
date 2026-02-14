/**
 * Script para configurar acesso do funcionário
 * Uso: node scripts/configurar-acesso.js
 */

const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sistema_gestao_tp'
});

// ========== CONFIGURAÇÃO ==========
const EMAIL_FUNCIONARIO = 'willian@empresa.com';
const SENHA = '123456';  // Senha inicial
const IS_MASTER = true;  // true = admin, false = normal
// ===================================

db.connect(async (err) => {
  if (err) {
    console.error('❌ Erro ao conectar:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Conectado ao banco');
  console.log(`\n🔧 Configurando acesso para: ${EMAIL_FUNCIONARIO}`);
  console.log(`   Senha: ${SENHA}`);
  console.log(`   Master: ${IS_MASTER ? 'SIM' : 'NÃO'}`);
  
  try {
    // Gera hash bcrypt
    const senhaHash = await bcrypt.hash(SENHA, 10);
    
    // Atualiza funcionário
    const sql = `UPDATE funcionarios 
                 SET senha_hash = ?, is_master = ? 
                 WHERE email = ?`;
    
    db.query(sql, [senhaHash, IS_MASTER ? 1 : 0, EMAIL_FUNCIONARIO], (err, result) => {
      if (err) {
        console.error('❌ Erro ao atualizar:', err.message);
        db.end();
        process.exit(1);
      }
      
      if (result.affectedRows === 0) {
        console.log(`⚠️ Funcionário com email "${EMAIL_FUNCIONARIO}" não encontrado.`);
      } else {
        console.log(`\n✅ Funcionário atualizado com sucesso!`);
        console.log(`   - Senha definida (hash bcrypt)`);
        console.log(`   - is_master = ${IS_MASTER ? 1 : 0}`);
      }
      
      // Verifica resultado
      db.query('SELECT id, nome, email, is_master, CASE WHEN senha_hash IS NOT NULL THEN "SIM" ELSE "NÃO" END as tem_senha FROM funcionarios WHERE email = ?', 
        [EMAIL_FUNCIONARIO], (err2, rows) => {
        if (!err2 && rows.length > 0) {
          console.log('\n📋 Dados atualizados:');
          console.table(rows);
        }
        db.end();
        console.log('\n✅ Reinicie o servidor e teste o login!');
      });
    });
  } catch (error) {
    console.error('❌ Erro:', error.message);
    db.end();
    process.exit(1);
  }
});

/**
 * Script para cadastrar senha diretamente (sem interatividade)
 * Uso: node scripts/definir-senha-direta.js
 */

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sistema_gestao_tp',
  port: Number(process.env.DB_PORT || 3306)
};

async function main() {
  console.log('\n🔐 CADASTRANDO SENHA PARA TODOS OS FUNCIONÁRIOS ATIVOS...\n');

  const connection = await mysql.createConnection(dbConfig);
  
  // Senha padrão: 123456
  const senha = '123456';
  const salt = await bcrypt.genSalt(10);
  const senhaHash = await bcrypt.hash(senha, salt);

  // Busca funcionários ativos
  const [funcionarios] = await connection.execute(
    "SELECT id, nome, email FROM funcionarios WHERE status = 'Ativo'"
  );

  console.log(`📋 Encontrados ${funcionarios.length} funcionários ativos:\n`);

  for (const f of funcionarios) {
    await connection.execute(
      "UPDATE funcionarios SET senha_hash = ? WHERE id = ?",
      [senhaHash, f.id]
    );
    console.log(`  ✅ ${f.nome} (${f.email || 'sem email'})`);
  }

  console.log('\n========================================');
  console.log('🎉 SENHA CADASTRADA COM SUCESSO!');
  console.log('========================================');
  console.log('\n📧 Emails disponíveis para login:');
  funcionarios.filter(f => f.email).forEach(f => {
    console.log(`   - ${f.email}`);
  });
  console.log(`\n🔑 Senha padrão: ${senha}`);
  console.log('\n');

  await connection.end();
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});

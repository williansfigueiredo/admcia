/**
 * ============================================
 * SCRIPT PARA CADASTRAR SENHA DE FUNCIONÁRIO
 * Execute: node scripts/cadastrar-senha.js
 * ============================================
 */

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const readline = require('readline');

// Configuração do banco
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sistema_gestao_tp',
  port: Number(process.env.DB_PORT || 3306)
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n🔐 CADASTRO DE SENHA DE FUNCIONÁRIO');
  console.log('====================================\n');

  let connection;
  
  try {
    // Conecta ao banco
    console.log('📡 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado!\n');

    // Lista funcionários ativos
    const [funcionarios] = await connection.execute(
      "SELECT id, nome, email, cargo, status FROM funcionarios WHERE status = 'Ativo' ORDER BY nome"
    );

    if (funcionarios.length === 0) {
      console.log('⚠️ Nenhum funcionário ativo encontrado.\n');
      rl.close();
      process.exit(0);
    }

    console.log('📋 FUNCIONÁRIOS ATIVOS:\n');
    funcionarios.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.nome} (${f.email || 'sem email'}) - ${f.cargo || 'sem cargo'}`);
    });

    console.log('\n');

    // Seleciona funcionário
    const escolha = await question('Digite o número do funcionário (ou 0 para todos): ');
    const idx = parseInt(escolha);

    if (isNaN(idx) || idx < 0 || idx > funcionarios.length) {
      console.log('❌ Opção inválida.\n');
      rl.close();
      process.exit(1);
    }

    // Solicita a senha
    const senha = await question('Digite a senha para cadastrar: ');

    if (!senha || senha.length < 6) {
      console.log('❌ A senha deve ter pelo menos 6 caracteres.\n');
      rl.close();
      process.exit(1);
    }

    // Gera hash
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    if (idx === 0) {
      // Cadastra para todos
      console.log('\n🔄 Cadastrando senha para todos os funcionários...\n');
      
      for (const f of funcionarios) {
        await connection.execute(
          "UPDATE funcionarios SET senha_hash = ? WHERE id = ?",
          [senhaHash, f.id]
        );
        console.log(`  ✅ ${f.nome}`);
      }

      console.log(`\n✅ Senha cadastrada para ${funcionarios.length} funcionários!`);
    } else {
      // Cadastra para um específico
      const funcionario = funcionarios[idx - 1];
      
      await connection.execute(
        "UPDATE funcionarios SET senha_hash = ? WHERE id = ?",
        [senhaHash, funcionario.id]
      );

      console.log(`\n✅ Senha cadastrada para: ${funcionario.nome} (${funcionario.email})`);
    }

    console.log('\n🎉 Pronto! O funcionário pode fazer login no sistema.\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
    rl.close();
  }
}

main();

/* =============================================================
   SCRIPT OPCIONAL - LIMPAR CAMPOS ANTIGOS DE CONTATO
   Execute SOMENTE DEPOIS de confirmar que a migração funcionou
   ============================================================= */

const mysql = require('mysql2');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Conexão com o banco
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sistema_gestao_tp',
  port: Number(process.env.DB_PORT || 3306)
});

console.log('⚠️  ATENÇÃO - OPERAÇÃO IRREVERSÍVEL ⚠️\n');
console.log('Este script irá REMOVER as colunas antigas de contato:');
console.log('- contato1_nome, contato1_cargo, contato1_email, contato1_telefone');
console.log('- contato2_nome, contato2_cargo, contato2_email, contato2_telefone\n');
console.log('Certifique-se de que:');
console.log('1. Você já executou o script de migração (migrar-contatos.js)');
console.log('2. Verificou que os contatos aparecem corretamente no sistema');
console.log('3. Tem um backup do banco de dados\n');

rl.question('Deseja continuar? Digite "SIM" para confirmar: ', (resposta) => {
  if (resposta.toUpperCase() !== 'SIM') {
    console.log('❌ Operação cancelada.');
    rl.close();
    process.exit(0);
  }
  
  db.connect((err) => {
    if (err) {
      console.error('❌ Erro ao conectar:', err);
      rl.close();
      process.exit(1);
    }
    
    console.log('\n🔄 Removendo colunas antigas...\n');
    
    const colunas = [
      'contato1_nome',
      'contato1_cargo', 
      'contato1_email',
      'contato1_telefone',
      'contato2_nome',
      'contato2_cargo',
      'contato2_email',
      'contato2_telefone'
    ];
    
    let removidas = 0;
    
    colunas.forEach(coluna => {
      const sql = `ALTER TABLE clientes DROP COLUMN ${coluna}`;
      
      db.query(sql, (err) => {
        if (err) {
          if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
            console.log(`⏭️  Coluna ${coluna} já foi removida anteriormente`);
          } else {
            console.error(`❌ Erro ao remover ${coluna}:`, err.message);
          }
        } else {
          console.log(`✅ Coluna ${coluna} removida`);
        }
        
        removidas++;
        
        if (removidas === colunas.length) {
          console.log('\n✅ Processo concluído!');
          console.log('💾 A estrutura da tabela foi otimizada.\n');
          db.end();
          rl.close();
        }
      });
    });
  });
});

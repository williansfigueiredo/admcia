/* =============================================================
   SCRIPT DE VERIFICAÇÃO - ESTADO ATUAL DOS CONTATOS
   Execute para ver como estão os dados antes/depois da migração
   ============================================================= */

const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sistema_gestao_tp',
  port: Number(process.env.DB_PORT || 3306)
});

db.connect((err) => {
  if (err) {
    console.error('❌ Erro ao conectar:', err);
    process.exit(1);
  }
  
  console.log('✅ Conectado ao banco!\n');
  verificarEstado();
});

function verificarEstado() {
  // 1. Conta clientes com contatos nos campos antigos
  const sqlAntigos = `
    SELECT COUNT(*) as total 
    FROM clientes 
    WHERE (contato1_nome IS NOT NULL AND contato1_nome != '') 
       OR (contato2_nome IS NOT NULL AND contato2_nome != '')
  `;
  
  // 2. Conta registros na nova tabela
  const sqlNovos = 'SELECT COUNT(*) as total FROM contatos_clientes';
  
  // 3. Conta quantos clientes têm contatos na nova tabela
  const sqlClientesNovos = 'SELECT COUNT(DISTINCT cliente_id) as total FROM contatos_clientes';
  
  console.log('📊 RESUMO DO ESTADO ATUAL\n');
  console.log('='.repeat(60));
  
  db.query(sqlAntigos, (err, result) => {
    if (err) {
      console.error('❌ Erro:', err);
      db.end();
      return;
    }
    
    const totalAntigos = result[0].total;
    console.log(`📁 Clientes com contatos nos campos ANTIGOS: ${totalAntigos}`);
    
    db.query(sqlNovos, (err2, result2) => {
      if (err2) {
        console.error('❌ Erro:', err2);
        db.end();
        return;
      }
      
      const totalNovos = result2[0].total;
      console.log(`📋 Total de contatos na NOVA TABELA: ${totalNovos}`);
      
      db.query(sqlClientesNovos, (err3, result3) => {
        if (err3) {
          console.error('❌ Erro:', err3);
          db.end();
          return;
        }
        
        const clientesNovos = result3[0].total;
        console.log(`👥 Clientes com contatos na NOVA TABELA: ${clientesNovos}`);
        console.log('='.repeat(60));
        
        // Verifica se precisa migrar
        if (totalAntigos > 0 && clientesNovos === 0) {
          console.log('\n⚠️  AÇÃO NECESSÁRIA:');
          console.log('Existem contatos antigos que precisam ser migrados.');
          console.log('Execute: node migrar-contatos.js\n');
        } else if (totalAntigos > 0 && clientesNovos > 0) {
          console.log('\n✅ Migração parcialmente concluída.');
          console.log('Alguns clientes já têm contatos na nova tabela.');
          console.log('Execute: node migrar-contatos.js (para completar)\n');
        } else if (totalAntigos === 0 && clientesNovos > 0) {
          console.log('\n🎉 Tudo certo! Todos os contatos estão na nova tabela.');
          console.log('Você pode opcionalmente remover as colunas antigas com:');
          console.log('node limpar-campos-antigos.js\n');
        } else {
          console.log('\nℹ️  Nenhum contato encontrado no sistema.\n');
        }
        
        // Mostra exemplos
        mostrarExemplos();
      });
    });
  });
}

function mostrarExemplos() {
  console.log('📄 EXEMPLOS DE DADOS:\n');
  
  // Exemplo de cliente com contatos antigos
  const sqlExemploAntigo = `
    SELECT id, nome, contato1_nome, contato2_nome 
    FROM clientes 
    WHERE (contato1_nome IS NOT NULL AND contato1_nome != '')
    LIMIT 3
  `;
  
  db.query(sqlExemploAntigo, (err, clientes) => {
    if (err || clientes.length === 0) {
      console.log('(Nenhum cliente com contatos antigos)');
    } else {
      console.log('🔹 Clientes com dados nos campos ANTIGOS:');
      clientes.forEach(cli => {
        console.log(`   ID ${cli.id}: ${cli.nome}`);
        if (cli.contato1_nome) console.log(`      - Contato 1: ${cli.contato1_nome}`);
        if (cli.contato2_nome) console.log(`      - Contato 2: ${cli.contato2_nome}`);
      });
    }
    
    console.log('');
    
    // Exemplo de contatos na nova tabela
    const sqlExemploNovo = `
      SELECT c.id, c.nome, cc.nome as contato_nome, cc.cargo
      FROM clientes c
      JOIN contatos_clientes cc ON c.id = cc.cliente_id
      LIMIT 5
    `;
    
    db.query(sqlExemploNovo, (err2, contatos) => {
      if (err2 || contatos.length === 0) {
        console.log('(Nenhum contato na nova tabela ainda)\n');
      } else {
        console.log('🔹 Contatos na NOVA TABELA:');
        contatos.forEach(c => {
          console.log(`   ${c.nome} → ${c.contato_nome} (${c.cargo || 'Sem cargo'})`);
        });
        console.log('');
      }
      
      db.end();
    });
  });
}

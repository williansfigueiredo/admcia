/* =============================================================
   SCRIPT DE MIGRAÇÃO - CONTATOS ANTIGOS PARA NOVA TABELA
   Execute este arquivo UMA ÚNICA VEZ para migrar os contatos
   ============================================================= */

const mysql = require('mysql2');

// Conexão com o banco
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sistema_gestao_tp',
  port: Number(process.env.DB_PORT || 3306)
});

db.connect((err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err);
    process.exit(1);
  }
  
  console.log('✅ Conectado ao banco de dados!');
  console.log('🔄 Iniciando migração de contatos...\n');
  
  migrarContatos();
});

function migrarContatos() {
  // 1. Busca todos os clientes que têm contatos nos campos antigos
  const sqlBuscar = `
    SELECT id, 
           contato1_nome, contato1_cargo, contato1_email, contato1_telefone,
           contato2_nome, contato2_cargo, contato2_email, contato2_telefone
    FROM clientes
    WHERE (contato1_nome IS NOT NULL AND contato1_nome != '') 
       OR (contato2_nome IS NOT NULL AND contato2_nome != '')
  `;
  
  db.query(sqlBuscar, (err, clientes) => {
    if (err) {
      console.error('❌ Erro ao buscar clientes:', err);
      db.end();
      return;
    }
    
    if (clientes.length === 0) {
      console.log('ℹ️  Nenhum cliente com contatos antigos encontrado.');
      db.end();
      return;
    }
    
    console.log(`📋 Encontrados ${clientes.length} clientes com contatos para migrar.\n`);
    
    let processados = 0;
    let contatosInseridos = 0;
    
    // 2. Para cada cliente, insere os contatos na nova tabela
    clientes.forEach((cliente, index) => {
      const clienteId = cliente.id;
      const contatos = [];
      
      // Monta array de contatos do cliente
      if (cliente.contato1_nome && cliente.contato1_nome.trim() !== '') {
        contatos.push({
          nome: cliente.contato1_nome,
          cargo: cliente.contato1_cargo,
          email: cliente.contato1_email,
          telefone: cliente.contato1_telefone
        });
      }
      
      if (cliente.contato2_nome && cliente.contato2_nome.trim() !== '') {
        contatos.push({
          nome: cliente.contato2_nome,
          cargo: cliente.contato2_cargo,
          email: cliente.contato2_email,
          telefone: cliente.contato2_telefone
        });
      }
      
      // Verifica se já existem contatos na nova tabela para este cliente
      const sqlVerificar = 'SELECT COUNT(*) as total FROM contatos_clientes WHERE cliente_id = ?';
      
      db.query(sqlVerificar, [clienteId], (err, resultado) => {
        if (err) {
          console.error(`❌ Erro ao verificar cliente ${clienteId}:`, err.message);
          processados++;
          verificarConclusao();
          return;
        }
        
        const jaExistem = resultado[0].total > 0;
        
        if (jaExistem) {
          console.log(`⏭️  Cliente ID ${clienteId} já possui contatos na nova tabela. Pulando...`);
          processados++;
          verificarConclusao();
          return;
        }
        
        // Insere os contatos
        if (contatos.length === 0) {
          processados++;
          verificarConclusao();
          return;
        }
        
        let contatosInseridosCliente = 0;
        
        contatos.forEach(contato => {
          const sqlInserir = `
            INSERT INTO contatos_clientes (cliente_id, nome, cargo, email, telefone)
            VALUES (?, ?, ?, ?, ?)
          `;
          
          const valores = [
            clienteId,
            contato.nome || null,
            contato.cargo || null,
            contato.email || null,
            contato.telefone || null
          ];
          
          db.query(sqlInserir, valores, (err, result) => {
            if (err) {
              console.error(`❌ Erro ao inserir contato do cliente ${clienteId}:`, err.message);
            } else {
              contatosInseridos++;
              contatosInseridosCliente++;
            }
            
            // Se inseriu todos os contatos deste cliente
            if (contatosInseridosCliente === contatos.length) {
              console.log(`✅ Cliente ID ${clienteId}: ${contatos.length} contato(s) migrado(s)`);
              processados++;
              verificarConclusao();
            }
          });
        });
      });
    });
    
    // 3. Verifica se terminou de processar todos
    function verificarConclusao() {
      if (processados === clientes.length) {
        console.log('\n' + '='.repeat(60));
        console.log('🎉 MIGRAÇÃO CONCLUÍDA!');
        console.log(`📊 Total de contatos migrados: ${contatosInseridos}`);
        console.log(`📋 Total de clientes processados: ${processados}`);
        console.log('='.repeat(60));
        
        // Pergunta se quer limpar campos antigos
        console.log('\n⚠️  PRÓXIMO PASSO (OPCIONAL):');
        console.log('Para limpar os campos antigos da tabela clientes, execute:');
        console.log('node limpar-campos-antigos.js\n');
        
        db.end();
      }
    }
  });
}

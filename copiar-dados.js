// Script para copiar dados do MySQL local para o Railway
const mysql = require('mysql2/promise');

async function copiarDados() {
  console.log('🚀 Iniciando cópia de dados LOCAL → RAILWAY\n');

  // CONEXÃO LOCAL
  const dbLocal = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Coloque sua senha local se tiver
    database: 'sistema_gestao_tp',
    port: 3306
  });

  // CONEXÃO RAILWAY
  const dbRailway = await mysql.createConnection({
    host: process.env.DB_HOST || 'mysql.railway.internal',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'railway',
    port: Number(process.env.DB_PORT || 3306)
  });

  console.log('✅ Conectado aos dois bancos!\n');

  // Tabelas na ordem correta (respeitar foreign keys)
  const tabelas = [
    'clientes',
    'funcionarios',
    'veiculos',
    'equipamentos',
    'jobs',
    'job_itens',
    'job_equipe',
    'escalas'
  ];

  try {
    for (const tabela of tabelas) {
      console.log(`📊 Copiando tabela: ${tabela}...`);
      
      // 1. Ler dados da tabela local
      const [rows] = await dbLocal.query(`SELECT * FROM ${tabela}`);
      
      if (rows.length === 0) {
        console.log(`   ⚠️  Tabela ${tabela} está vazia (local)\n`);
        continue;
      }

      // 2. Limpar tabela no Railway (opcional)
      await dbRailway.query(`DELETE FROM ${tabela}`);
      
      // 3. Inserir dados no Railway
      for (const row of rows) {
        const colunas = Object.keys(row);
        const valores = Object.values(row);
        
        const placeholders = colunas.map(() => '?').join(', ');
        const sql = `INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES (${placeholders})`;
        
        await dbRailway.query(sql, valores);
      }
      
      console.log(`   ✅ ${rows.length} registro(s) copiado(s)\n`);
    }

    console.log('🎉 SUCESSO! Todos os dados foram copiados!\n');
    
    // Mostrar resumo
    console.log('📋 RESUMO:');
    for (const tabela of tabelas) {
      const [count] = await dbRailway.query(`SELECT COUNT(*) as total FROM ${tabela}`);
      console.log(`   ${tabela}: ${count[0].total} registros`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await dbLocal.end();
    await dbRailway.end();
    console.log('\n✅ Conexões fechadas!');
  }
}

copiarDados();

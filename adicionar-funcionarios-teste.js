const mysql = require('mysql2/promise');

async function adicionarFuncionariosTeste() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'sistema_gestao_tp'
  });

  const funcionarios = [
    { nome: 'Lucas Desenvolvedor', cargo: 'Desenvolvedor Full Stack', email: 'lucas@empresa.com', telefone: '(11) 99999-0001', departamento: 'Tecnologia', status: 'Ativo', data_admissao: '2024-01-15' },
    { nome: 'Ana Designer', cargo: 'Designer UX/UI', email: 'ana@empresa.com', telefone: '(11) 99999-0002', departamento: 'Tecnologia', status: 'Ativo', data_admissao: '2024-02-20' },
    { nome: 'Pedro Vendedor', cargo: 'Representante de Vendas', email: 'pedro@empresa.com', telefone: '(11) 99999-0003', departamento: 'Comercial', status: 'Ativo', data_admissao: '2024-03-10' },
    { nome: 'Carla Analista', cargo: 'Analista de Marketing', email: 'carla@empresa.com', telefone: '(11) 99999-0004', departamento: 'Comercial', status: 'Férias', data_admissao: '2024-01-05' },
    { nome: 'Ricardo Contador', cargo: 'Contador Sênior', email: 'ricardo@empresa.com', telefone: '(11) 99999-0005', departamento: 'Financeiro', status: 'Ativo', data_admissao: '2023-11-20' },
    { nome: 'Fernanda RH', cargo: 'Analista de RH', email: 'fernanda@empresa.com', telefone: '(11) 99999-0006', departamento: 'Administrativo', status: 'Ativo', data_admissao: '2024-04-12' },
    { nome: 'Gabriel Operador', cargo: 'Operador de Máquinas', email: 'gabriel@empresa.com', telefone: '(11) 99999-0007', departamento: 'Produção', status: 'Ativo', data_admissao: '2024-02-28' },
    { nome: 'Juliana Assistente', cargo: 'Assistente Administrativo', email: 'juliana@empresa.com', telefone: '(11) 99999-0008', departamento: 'Administrativo', status: 'Ativo', data_admissao: '2024-05-01' },
    { nome: 'Thiago Logística', cargo: 'Coordenador de Logística', email: 'thiago@empresa.com', telefone: '(11) 99999-0009', departamento: 'Logística', status: 'Ativo', data_admissao: '2023-12-15' },
    { nome: 'Marina Supervisora', cargo: 'Supervisora de Produção', email: 'marina@empresa.com', telefone: '(11) 99999-0010', departamento: 'Produção', status: 'Ativo', data_admissao: '2024-01-20' }
  ];

  for (const func of funcionarios) {
    const sql = `INSERT INTO funcionarios (nome, cargo, email, telefone, departamento, status, data_admissao) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    await connection.execute(sql, [func.nome, func.cargo, func.email, func.telefone, func.departamento, func.status, func.data_admissao]);
    console.log(`✅ Adicionado: ${func.nome}`);
  }

  console.log('\n🎉 10 funcionários adicionados com sucesso!');
  await connection.end();
}

adicionarFuncionariosTeste().catch(console.error);

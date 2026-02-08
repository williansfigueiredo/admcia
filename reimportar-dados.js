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
    
    // DADOS EMBUTIDOS NO CÓDIGO (sem ler arquivo externo)
    const sql = `
      INSERT INTO clientes (id, nome, nome_fantasia, documento, inscricao_estadual, email, telefone, data_cadastro, cep, logradouro, numero, bairro, cidade, uf, contato1_nome, contato1_cargo, contato1_email, contato1_telefone, contato2_nome, contato2_cargo, contato2_email, contato2_telefone, observacoes, site, status) VALUES 
      (19,'TV Record Comunicacao S/A','Record TV','12.345.678/0001-90','ISENTO','contato@recordtv.com.br','(11) 3003-1234','2026-01-22 22:25:54','01153000','Av. Miruna','221','Moema','Sao Paulo','SP','Mariana Souza','Producao','mariana.souza@recordtv.com.br','(11) 98888-1111','Paulo Lima','Financeiro','financeiro@recordtv.com.br','(11) 97777-2222','Cliente recorrente','https://recordtv.com.br','Ativo'),
      (20,'Pfizer Brasil Ltda','Pfizer','45.678.901/0001-10','110.222.333.444','eventos@pfizer.com','(11) 4004-5678','2026-01-22 22:25:54','04547000','Av. Brigadeiro Faria Lima','3477','Itaim Bibi','Sao Paulo','SP','Ana Martins','Eventos','ana.martins@pfizer.com','(11) 96666-3333','Ricardo Alves','Contas a Pagar','ap@pfizer.com','(11) 95555-4444','Eventos corporativos','https://pfizer.com.br','Ativo'),
      (21,'VideoArt Producoes','VideoArt','23.456.789/0001-55','ISENTO','contato@videoart.com.br','(21) 3003-9999','2026-01-22 22:25:54','20040002','Av. Rio Branco','1','Centro','Rio de Janeiro','RJ','Bruno Rocha','Produtor','bruno@videoart.com.br','(21) 98888-5555','Fernanda Melo','Administrativo','adm@videoart.com.br','(21) 97777-6666','Solicita diarias extras','https://videoart.com.br','Ativo'),
      (22,'Agencia Horizonte','Horizonte','34.567.890/0001-12','ISENTO','contato@horizonte.ag','(31) 3003-7777','2026-01-22 22:25:54','30140071','Av. do Contorno','1234','Funcionarios','Belo Horizonte','MG','Camila Nunes','Atendimento','camila@horizonte.ag','(31) 98888-7777','Joao Pedro','Financeiro','financeiro@horizonte.ag','(31) 97777-8888','Campanhas publicitarias','https://horizonte.ag','Ativo');

      INSERT INTO funcionarios (id, nome, cargo, departamento, email, telefone, cep, logradouro, numero, bairro, cidade, uf, status, data_admissao, data_demissao, observacoes, cpf, endereco) VALUES 
      (14,'Willian Operador','Operador de Teleprompter','Producao','willian@empresa.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Ativo',NULL,NULL,NULL,NULL,NULL),
      (15,'Carlos Tecnico','Tecnico de Video','Operacao','carlos@empresa.com','','','','','','','','Ferias',NULL,NULL,'','',NULL),
      (16,'Bruna Operadora','Operadora','Operacao','bruna@empresa.com','','','','','','','','Ferias',NULL,NULL,'','',NULL),
      (17,'Juliana Producao','Produtora','Producao','juliana@empresa.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Ativo',NULL,NULL,NULL,NULL,NULL),
      (18,'Rafael Freelancer','Freelancer','Operacao','rafael@empresa.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Inativo',NULL,NULL,NULL,NULL,NULL),
      (19,'Marcos Logistica','Motorista','Logistica','marcos@empresa.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Ativo',NULL,NULL,NULL,NULL,NULL),
      (20,'Aline Atendimento','Atendimento','Comercial','aline@empresa.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Ativo',NULL,NULL,NULL,NULL,NULL),
      (21,'Felipe Supervisor','Supervisor','Operacao','felipe@empresa.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Ativo',NULL,NULL,NULL,NULL,NULL),
      (22,'Natalia Financeiro','Financeiro','Administrativo','natalia@empresa.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Ativo',NULL,NULL,NULL,NULL,NULL),
      (23,'Gustavo TI','TI','Tecnologia','gustavo@empresa.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Ativo',NULL,NULL,NULL,NULL,NULL);

      INSERT INTO equipamentos (id, nome, tipo, status, marca, modelo, observacoes, qtd_total, qtd_disponivel, valor_diaria, categoria, imagem, n_serie) VALUES 
      (47,'Teleprompter 17','Teleprompter','Disponivel','PrompterPro','TP-17','Kit completo',4,4,250.00,'Teleprompter','foto-1769217220684-220510378.png','0000'),
      (48,'Teleprompter 19','Teleprompter','Disponivel','PrompterPro','TP-19','Ideal para auditorios',3,3,320.00,'Teleprompter','foto-1769217453687-141094666.png','00000'),
      (49,'Monitor 19','Monitor','Disponivel','LG','19M38A','Monitor reserva',6,6,80.00,'','foto-1769208888489-443128382.jpg','00000'),
      (50,'Vidro 70/30','Acessorio','Disponivel','GlassTech','70-30','Vidro refletivo',8,8,40.00,'','','00000'),
      (51,'Controle Remoto','Acessorio','Manutencao','Logitech','R400','Controle em manutencao',6,6,35.00,'Acessorio','','121'),
      (52,'Tripe Profissional','Suporte','Disponivel','Manfrotto','190X','Tripe para camera',4,4,90.00,'Suporte','','1212'),
      (53,'Notebook Operacao','Informatica','Disponivel','Dell','Inspiron','Notebook para controle',2,2,150.00,'Informatica','','1221'),
      (54,'Intercom','Audio','Disponivel','Hollyland','Solidcom','Comunicacao equipe',2,2,120.00,'','','12112');

      INSERT INTO veiculos (id, modelo, placa, status) VALUES 
      (11,'Fiorino 1.4','ABC1D23','Ativo'),
      (12,'Sprinter 415','DEF4G56','Ativo'),
      (13,'Kangoo Express','HIJ7K89','Ativo'),
      (14,'Saveiro','LMN0P12','Manutencao'),
      (15,'Doblo Cargo','QRS3T45','Ativo');
    `;
    
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

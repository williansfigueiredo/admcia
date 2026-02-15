// Carrega variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
// --- BIBLIOTECAS DE ARQUIVO ---
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// --- BIBLIOTECA DE CRIPTOGRAFIA ---
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
// --- BIBLIOTECAS DE AUTENTICAÇÃO ---
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const funcionariosRoutes = require('./routes/funcionarios');
const { requireAuth, redirectIfAuthenticated } = require('./middleware/requireAuth');

const app = express();
app.use(express.json());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());

// --- LIBERAR PASTA PUBLIC (CSS, JS) ---
app.use('/public', express.static('public'));

// --- LIBERAR PASTA DE UPLOADS ---
app.use('/uploads', express.static('uploads'));


// --- CONFIGURAÇÃO DO UPLOAD (MULTER) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'foto-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- ROTA DE LOGIN (PÁGINA) ---
app.get('/login', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// --- ROTA DE LIMPEZA DE CACHE (PÚBLICA) ---
app.get('/clear-cache', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'clear-cache.html'));
});

// --- SERVIR ARQUIVOS HTML NA RAIZ (PROTEGIDO) ---
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/invoice', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'invoice.html'));

});

// --- CONEXÃO COM O BANCO ---
// Suporta variáveis do Railway (MYSQL*) e variáveis customizadas (DB_*)
// Usar POOL de conexões para reconexão automática (importante para Railway)
const db = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASS || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'sistema_gestao_tp',
  port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});


// Testar conexão inicial
db.getConnection((err, connection) => {
  if (err) console.error('Erro ao conectar:', err);
  else {
    console.log('Sucesso! Conectado ao banco de dados MySQL (Pool).');
    connection.release(); // Libera a conexão de volta ao pool

    // Inicializa serviço de email
    try {
      const emailService = require('./services/emailService');
      emailService.inicializarEmail();
    } catch (e) {
      console.log('⚠️ Serviço de email não inicializado:', e.message);
    }

    // =====================================================
    // ✅ MIGRAÇÃO JÁ EXECUTADA NO RAILWAY - COMENTADO
    // =====================================================
    /*
    const tabelasSQL = [
      // 1. clientes
      `CREATE TABLE IF NOT EXISTS clientes (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255),
        nome_fantasia VARCHAR(255),
        documento VARCHAR(50),
        inscricao_estadual VARCHAR(50),
        email VARCHAR(100),
        telefone VARCHAR(50),
        data_cadastro DATETIME,
        cep VARCHAR(20),
        logradouro VARCHAR(255),
        numero VARCHAR(50),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        uf VARCHAR(5),
        contato1_nome VARCHAR(100),
        contato1_cargo VARCHAR(50),
        contato1_email VARCHAR(100),
        contato1_telefone VARCHAR(50),
        contato2_nome VARCHAR(100),
        contato2_cargo VARCHAR(50),
        contato2_email VARCHAR(100),
        contato2_telefone VARCHAR(50),
        observacoes TEXT,
        site VARCHAR(255),
        status ENUM('Ativo','Inativo','Bloqueado') DEFAULT 'Ativo'
      )`,
      
      // 2. contatos_clientes
      `CREATE TABLE IF NOT EXISTS contatos_clientes (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT(11),
        nome VARCHAR(255),
        cargo VARCHAR(255),
        email VARCHAR(255),
        telefone VARCHAR(50)
      )`,
      
      // 3. funcionarios
      `CREATE TABLE IF NOT EXISTS funcionarios (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100),
        cargo VARCHAR(50),
        departamento VARCHAR(50),
        email VARCHAR(100),
        telefone VARCHAR(20),
        cep VARCHAR(20),
        logradouro VARCHAR(255),
        numero VARCHAR(20),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        uf VARCHAR(2),
        status VARCHAR(20) DEFAULT 'Ativo',
        data_admissao DATE,
        data_demissao DATE,
        observacoes TEXT,
        cpf VARCHAR(20),
        endereco TEXT,
        avatar VARCHAR(255),
        senha_hash VARCHAR(255),
        ultimo_login DATETIME,
        is_master TINYINT(1) DEFAULT 0,
        acesso_ativo TINYINT(1) DEFAULT 1
      )`,
      
      // 4. equipamentos
      `CREATE TABLE IF NOT EXISTS equipamentos (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100),
        tipo VARCHAR(50),
        status VARCHAR(50),
        marca VARCHAR(100),
        modelo VARCHAR(100),
        observacoes TEXT,
        qtd_total INT(11) DEFAULT 0,
        qtd_disponivel INT(11) DEFAULT 0,
        valor_diaria DECIMAL(10,2),
        categoria VARCHAR(100),
        imagem VARCHAR(255),
        n_serie VARCHAR(100)
      )`,
      
      // 5. jobs
      `CREATE TABLE IF NOT EXISTS jobs (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        descricao VARCHAR(150),
        valor DECIMAL(10,2),
        data_job DATE,
        data_fim DATE,
        hora_chegada_prevista TIME,
        hora_inicio_evento TIME,
        hora_fim_evento TIME,
        status VARCHAR(30) DEFAULT 'Agendado',
        pagamento VARCHAR(30),
        cliente_id INT(11),
        operador_id INT(11),
        logradouro VARCHAR(255),
        numero VARCHAR(50),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        uf VARCHAR(2),
        cep VARCHAR(20),
        solicitante_nome VARCHAR(100),
        solicitante_email VARCHAR(100),
        solicitante_telefone VARCHAR(50),
        producao_local VARCHAR(100),
        producao_contato VARCHAR(100),
        producao_email VARCHAR(100),
        pagador_nome VARCHAR(100),
        pagador_cnpj VARCHAR(50),
        pagador_email VARCHAR(100),
        pagador_endereco VARCHAR(255),
        forma_pagamento VARCHAR(50),
        tipo_documento VARCHAR(50),
        observacoes TEXT,
        data_inicio DATE,
        desconto_porcentagem DECIMAL(5,2),
        motivo_desconto VARCHAR(255),
        vencimento_texto VARCHAR(100),
        pagador_cep VARCHAR(20),
        pagador_logradouro VARCHAR(255),
        pagador_numero VARCHAR(50),
        pagador_bairro VARCHAR(100),
        pagador_cidade VARCHAR(100),
        pagador_uf VARCHAR(2),
        desconto_valor DECIMAL(10,2),
        numero_pedido VARCHAR(50)
      )`,
      
      // 6. job_itens
      `CREATE TABLE IF NOT EXISTS job_itens (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        job_id INT(11),
        descricao VARCHAR(255),
        qtd INT(11),
        valor_unitario DECIMAL(10,2),
        desconto_item DECIMAL(10,2),
        equipamento_id INT(11)
      )`,
      
      // 7. job_equipe
      `CREATE TABLE IF NOT EXISTS job_equipe (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        job_id INT(11),
        funcionario_id INT(11),
        funcao VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      // 8. escalas
      `CREATE TABLE IF NOT EXISTS escalas (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        funcionario_id INT(11),
        job_id INT(11),
        data_escala DATE,
        data_inicio DATE,
        data_fim DATE,
        tipo VARCHAR(50),
        observacao TEXT
      )`,
      
      // 9. veiculos
      `CREATE TABLE IF NOT EXISTS veiculos (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        modelo VARCHAR(100),
        placa VARCHAR(20),
        status VARCHAR(20) DEFAULT 'Disponível'
      )`,
      
      // 10. estoque
      `CREATE TABLE IF NOT EXISTS estoque (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        item VARCHAR(100),
        categoria VARCHAR(50),
        qtd_total INT(11) DEFAULT 0,
        qtd_disponivel INT(11) DEFAULT 0,
        valor_diaria DECIMAL(10,2)
      )`,
      
      // 11. empresa
      `CREATE TABLE IF NOT EXISTS empresa (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        razao_social VARCHAR(255),
        nome_fantasia VARCHAR(255),
        cnpj VARCHAR(20),
        ie VARCHAR(50),
        im VARCHAR(50),
        email VARCHAR(255),
        telefone VARCHAR(30),
        website VARCHAR(255),
        linkedin VARCHAR(255),
        cep VARCHAR(15),
        logradouro VARCHAR(255),
        numero VARCHAR(20),
        complemento VARCHAR(100),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        estado VARCHAR(2),
        logo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      // 12. configuracoes_sistema
      `CREATE TABLE IF NOT EXISTS configuracoes_sistema (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        chave VARCHAR(100),
        valor TEXT,
        descricao VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      // 13. permissoes_funcionarios
      `CREATE TABLE IF NOT EXISTS permissoes_funcionarios (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        funcionario_id INT(11),
        acesso_sistema TINYINT(1) DEFAULT 0,
        acesso_dashboard TINYINT(1) DEFAULT 1,
        acesso_clientes TINYINT(1) DEFAULT 0,
        acesso_funcionarios TINYINT(1) DEFAULT 0,
        acesso_contratos TINYINT(1) DEFAULT 0,
        acesso_estoque TINYINT(1) DEFAULT 0,
        acesso_financeiro TINYINT(1) DEFAULT 0,
        acesso_configuracoes TINYINT(1) DEFAULT 0,
        is_master TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      // 14. usuarios_sistema
      `CREATE TABLE IF NOT EXISTS usuarios_sistema (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        funcionario_id INT(11),
        email VARCHAR(255),
        senha_hash VARCHAR(255),
        ativo TINYINT(1) DEFAULT 1,
        ultimo_login TIMESTAMP NULL,
        token_reset VARCHAR(255),
        token_expira TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      // 15. sessoes_usuarios
      `CREATE TABLE IF NOT EXISTS sessoes_usuarios (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT(11),
        token VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 16. log_atividades
      `CREATE TABLE IF NOT EXISTS log_atividades (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT(11),
        funcionario_id INT(11),
        acao VARCHAR(100),
        tabela_afetada VARCHAR(100),
        registro_id INT(11),
        dados_antigos LONGTEXT,
        dados_novos LONGTEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 17. transacoes financeiras
      `CREATE TABLE IF NOT EXISTS transacoes (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        tipo ENUM('receita', 'despesa') NOT NULL,
        categoria VARCHAR(100),
        descricao VARCHAR(255),
        valor DECIMAL(10,2) NOT NULL,
        data_vencimento DATE,
        data_pagamento DATE,
        status ENUM('pendente', 'pago', 'atrasado', 'cancelado') DEFAULT 'pendente',
        job_id INT(11),
        cliente_id INT(11),
        forma_pagamento VARCHAR(50),
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    ];
    
    // Executar criação de todas as tabelas
    console.log('🔧 Verificando/criando tabelas do sistema...');
    let tabelasCriadas = 0;
    tabelasSQL.forEach((sql, index) => {
      db.query(sql, (err) => {
        if (err) {
          console.error(`❌ Erro na tabela ${index + 1}:`, err.message);
        } else {
          tabelasCriadas++;
          if (tabelasCriadas === tabelasSQL.length) {
            console.log(`✅ ${tabelasCriadas} tabelas verificadas/criadas com sucesso!`);
            
            // Criar usuário master se não existir
            criarUsuarioMasterSeNecessario();
          }
        }
      });
    });
    
    // Função para criar usuário master inicial
    function criarUsuarioMasterSeNecessario() {
      db.query('SELECT id FROM funcionarios WHERE is_master = 1 LIMIT 1', (err, results) => {
        if (err) return console.error('Erro ao verificar master:', err);
        
        if (results.length === 0) {
          console.log('📝 Criando usuário master inicial...');
          
          const sqlMaster = `
            INSERT INTO funcionarios (nome, cargo, departamento, email, telefone, cpf, status, senha_hash, is_master, acesso_ativo)
            VALUES ('Administrador Master', 'Administrador', 'TI', 'admin@ciadotp.com.br', '(11) 99999-9999', '000.000.000-00', 'Ativo', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 1)
          `;
          
          db.query(sqlMaster, (err, result) => {
            if (err) return console.error('Erro ao criar master:', err);
            
            const masterId = result.insertId;
            console.log(`✅ Funcionário master criado (ID: ${masterId})`);
            
            // Criar permissões
            db.query(`INSERT INTO permissoes_funcionarios (funcionario_id, acesso_sistema, acesso_dashboard, acesso_clientes, acesso_funcionarios, acesso_contratos, acesso_estoque, acesso_financeiro, acesso_configuracoes, is_master) VALUES (${masterId}, 1, 1, 1, 1, 1, 1, 1, 1, 1)`, (err) => {
              if (err) console.error('Erro ao criar permissões master:', err);
              else console.log('✅ Permissões master criadas');
            });
            
            // Criar usuário sistema
            db.query(`INSERT INTO usuarios_sistema (funcionario_id, email, senha_hash, ativo) VALUES (${masterId}, 'admin@ciadotp.com.br', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1)`, (err) => {
              if (err) console.error('Erro ao criar usuario_sistema master:', err);
              else console.log('✅ Usuário master criado! Email: admin@ciadotp.com.br | Senha: password');
            });
          });
        } else {
          console.log('✅ Usuário master já existe');
        }
      });
    }
    */


















    // Migração: Adicionar coluna avatar na tabela funcionarios (se não existir)
    // FUNÇÃO DE MIGRAÇÃO COM RETRY PARA EVITAR DEADLOCK
    const executarMigracaoComRetry = (sql, nomeColuna, callback, tentativa = 1) => {
      const maxTentativas = 3;
      const delayRetry = 1000 * tentativa; // Aumenta delay a cada tentativa

      db.query(sql, (err) => {
        if (err) {
          if (err.code === 'ER_DUP_FIELDNAME') {
            console.log(`✅ Coluna ${nomeColuna} já existe.`);
            if (callback) callback();
          } else if ((err.code === 'ER_LOCK_DEADLOCK' || err.message.includes('Deadlock')) && tentativa < maxTentativas) {
            console.log(`⚠️ Deadlock em ${nomeColuna}, tentando novamente em ${delayRetry}ms... (tentativa ${tentativa}/${maxTentativas})`);
            setTimeout(() => executarMigracaoComRetry(sql, nomeColuna, callback, tentativa + 1), delayRetry);
          } else {
            console.error(`⚠️ Erro ao adicionar coluna ${nomeColuna}:`, err.message);
            if (callback) callback();
          }
        } else {
          console.log(`✅ Coluna ${nomeColuna} criada com sucesso.`);
          if (callback) callback();
        }
      });
    };

    // Executar migrações SEQUENCIALMENTE para evitar deadlocks
    executarMigracaoComRetry(
      'ALTER TABLE funcionarios ADD COLUMN avatar VARCHAR(255)',
      'avatar',
      () => executarMigracaoComRetry(
        'ALTER TABLE funcionarios ADD COLUMN avatar_base64 LONGTEXT',
        'avatar_base64',
        () => executarMigracaoComRetry(
          'ALTER TABLE funcionarios ADD COLUMN senha_hash VARCHAR(255) NULL',
          'senha_hash',
          () => executarMigracaoComRetry(
            'ALTER TABLE funcionarios ADD COLUMN ultimo_login TIMESTAMP NULL',
            'ultimo_login',
            () => executarMigracaoComRetry(
              'ALTER TABLE funcionarios ADD COLUMN is_master TINYINT(1) NOT NULL DEFAULT 0',
              'is_master',
              () => executarMigracaoComRetry(
                'ALTER TABLE funcionarios ADD COLUMN acesso_ativo TINYINT(1) NOT NULL DEFAULT 1',
                'acesso_ativo',
                () => executarMigracaoComRetry(
                  'ALTER TABLE jobs ADD COLUMN numero_pedido VARCHAR(50)',
                  'numero_pedido (jobs)',
                  () => executarMigracaoComRetry(
                    'ALTER TABLE escalas ADD COLUMN data_inicio DATE',
                    'data_inicio (escalas)',
                    () => executarMigracaoComRetry(
                      'ALTER TABLE escalas ADD COLUMN data_fim DATE',
                      'data_fim (escalas)',
                      () => executarMigracaoComRetry(
                        'ALTER TABLE jobs ADD COLUMN data_vencimento DATE',
                        'data_vencimento (jobs)',
                        () => executarMigracaoComRetry(
                          'ALTER TABLE jobs ADD COLUMN prazo_pagamento INT',
                          'prazo_pagamento (jobs)',
                          () => console.log('✅ Todas as migrações concluídas!')
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    );
  }
});

// --- DISPONIBILIZA DB PARA AS ROTAS ---
app.set('db', db);

// --- ROTAS DE AUTENTICAÇÃO ---
app.use('/api/auth', authRoutes);

// --- ROTAS DE FUNCIONÁRIOS (Perfil e Master) ---
app.use('/api/funcionarios', funcionariosRoutes);


// --- ROTAS ---






// 1. Buscar FATURAMENTO (Igual ao anterior)
app.get('/dashboard/faturamento', (req, res) => {
  const sql = "SELECT SUM(valor) as total FROM jobs WHERE status = 'Finalizado' AND pagamento = 'Pago' AND MONTH(data_job) = MONTH(CURRENT_DATE()) AND YEAR(data_job) = YEAR(CURRENT_DATE())";
  db.query(sql, (err, data) => {
    if (err) return res.json(err);
    return res.json(data[0]);
  });
});

// 2. Buscar TODOS OS JOBS (Com JOIN para trazer os nomes)
// No arquivo server.js

// ATUALIZAÇÃO NO SERVER.JS (Rota de Busca)

// ROTA: BUSCAR JOBS ATIVOS (Agendado, Em Andamento, Confirmado)
// IMPORTANTE: Esta rota deve vir ANTES da rota /jobs para não conflitar
app.get('/jobs/ativos', (req, res) => {
  const sql = `
    SELECT j.id, j.numero_pedido, j.descricao, j.data_inicio, j.data_fim, j.status,
           c.nome as nome_cliente
    FROM jobs j
    LEFT JOIN clientes c ON j.cliente_id = c.id
    WHERE j.status IN ('Agendado', 'Em Andamento', 'Confirmado')
    ORDER BY j.data_inicio ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar jobs ativos:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.get('/jobs', (req, res) => {
  // VERIFICAR E ATUALIZAR JOBS VENCIDOS AUTOMATICAMENTE
  const sqlUpdateVencidos = `
    UPDATE jobs 
    SET pagamento = 'Vencido'
    WHERE data_vencimento IS NOT NULL 
      AND data_vencimento < CURDATE()
      AND pagamento NOT IN ('Pago', 'Vencido')
      AND status != 'Cancelado'
  `;
  
  db.query(sqlUpdateVencidos, (errUpdate) => {
    if (errUpdate) console.error('Erro ao atualizar vencidos:', errUpdate);
    
    // AQUI ESTÁ O SEGREDO: "f.nome as nome_operador"
    const sqlJobs = `
          SELECT j.*, 
                 c.nome as nome_cliente, c.documento as cliente_documento, 
                 f.nome as nome_operador 
          FROM jobs j
          LEFT JOIN clientes c ON j.cliente_id = c.id
          LEFT JOIN funcionarios f ON j.operador_id = f.id
          ORDER BY j.id DESC
      `;

    db.query(sqlJobs, (err, jobs) => {
      if (err) return res.status(500).json(err);

      // Busca Itens
      const sqlItens = "SELECT * FROM job_itens";
      db.query(sqlItens, (err2, itens) => {
        if (err2) return res.status(500).json(err2);

        // Junta tudo
        const jobsCompletos = jobs.map(job => {
          return {
            ...job,
            itens: itens.filter(i => i.job_id === job.id)
          };
        });
        return res.json(jobsCompletos);
      });
    });
  });
});

// --- NOVO: BUSCAR 1 CLIENTE PELO ID (Para Edição) ---
app.get('/clientes/:id', (req, res) => {
  const sql = "SELECT * FROM clientes WHERE id = ?";
  db.query(sql, [req.params.id], (err, data) => {
    if (err) return res.status(500).json(err);
    return res.json(data[0]); // Retorna só o objeto do cliente
  });
});

// --- NOVO: EXCLUIR CLIENTE ---
// --- ATUALIZAÇÃO: EXCLUIR CLIENTE COM TRAVA FINANCEIRA ---
// --- NOVO: EXCLUIR CLIENTE E SEU HISTÓRICO (CASCATA) ---
// --- EXCLUSÃO SEGURA (BLOQUEIA SE TIVER HISTÓRICO) ---
app.delete('/clientes/:id', (req, res) => {
  const id = req.params.id;

  // 1. VERIFICA SE EXISTE QUALQUER PEDIDO (Pago, Pendente, Cancelado...)
  // Se o cliente tem 1 job que seja, ele faz parte da história da empresa.
  const sqlCheck = "SELECT COUNT(*) as qtd FROM jobs WHERE cliente_id = ?";

  db.query(sqlCheck, [id], (err, results) => {
    if (err) return res.status(500).json({ error: "Erro ao verificar histórico." });

    const historico = results[0].qtd;

    if (historico > 0) {
      // TRAVA TOTAL: Tem histórico? Não exclui. Manda inativar.
      return res.status(400).json({
        error: `⚠️ AÇÃO BLOQUEADA POR SEGURANÇA!\n\nEste cliente possui ${historico} pedido(s) no histórico (pagos ou não).\n\nNão é possível excluí-lo pois isso apagaria seus relatórios financeiros.\n\n>> SOLUÇÃO: Edite o cliente e mude o Status para 'Inativo'.`
      });
    }

    // 2. SE NÃO TIVER NENHUM PEDIDO (Cadastro virgem/errado), PODE EXCLUIR.
    const sqlDelete = "DELETE FROM clientes WHERE id = ?";

    db.query(sqlDelete, [id], (errDel, result) => {
      if (errDel) return res.status(500).json({ error: errDel.message });

      res.json({ success: true, message: "Cliente excluído (não possuía histórico)." });
    });
  });
});






// --- NOVO: ATUALIZAR CLIENTE (PUT) ---
app.put('/clientes/:id', (req, res) => {
  const id = req.params.id;
  const d = req.body;

  const sql = `
        UPDATE clientes SET
            nome = ?, nome_fantasia = ?, documento = ?, inscricao_estadual = ?,
            status = ?, site = ?, cep = ?, logradouro = ?, numero = ?,
            bairro = ?, cidade = ?, uf = ?, observacoes = ?
        WHERE id = ?
    `;

  const values = [
    d.nome, d.nome_fantasia, d.documento, d.inscricao_estadual,
    d.status, d.site, d.cep, d.logradouro, d.numero,
    d.bairro, d.cidade, d.uf, d.observacoes,
    id // O ID vai por último no WHERE
  ];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json(err);

    // Atualizar contatos: primeiro remove os antigos, depois insere os novos
    const sqlDeleteContatos = "DELETE FROM contatos_clientes WHERE cliente_id = ?";

    db.query(sqlDeleteContatos, [id], (err) => {
      if (err) console.error("Erro ao deletar contatos antigos:", err);

      // Salvar novos contatos se existirem
      if (d.contatos && Array.isArray(d.contatos) && d.contatos.length > 0) {
        const sqlContatos = `
          INSERT INTO contatos_clientes (cliente_id, nome, cargo, email, telefone)
          VALUES (?, ?, ?, ?, ?)
        `;

        let contatosSalvos = 0;
        const totalContatos = d.contatos.length;

        d.contatos.forEach(contato => {
          db.query(sqlContatos, [
            id,
            contato.nome || null,
            contato.cargo || null,
            contato.email || null,
            contato.telefone || null
          ], (err) => {
            if (err) console.error("Erro ao salvar contato:", err);

            contatosSalvos++;

            // Quando todos os contatos forem processados, retorna a resposta
            if (contatosSalvos === totalContatos) {
              res.json({ success: true, message: "Cliente atualizado!" });
            }
          });
        });
      } else {
        res.json({ success: true, message: "Cliente atualizado!" });
      }
    });
  });
});

// 3. ROTA NOVA: Buscar Lista de CLIENTES
app.get('/clientes', (req, res) => {
  const sql = "SELECT * FROM clientes"; // <--- Mude para asterisco (*)
  db.query(sql, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

// ROTA PARA BUSCAR CONTATOS DE UM CLIENTE
app.get('/clientes/:id/contatos', (req, res) => {
  const clienteId = req.params.id;
  const sql = "SELECT * FROM contatos_clientes WHERE cliente_id = ?";

  db.query(sql, [clienteId], (err, contatos) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(contatos);
  });
});
// 4. ROTA NOVA: Buscar Lista de FUNCIONÁRIOS
// Rota simplificada para dropdowns (apenas ativos)
app.get('/funcionarios', (req, res) => {
  const sql = "SELECT id, nome FROM funcionarios WHERE status = 'Ativo'";
  db.query(sql, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

// Rota completa para a tela de gestão (todos os funcionários com todos os campos)
app.get('/funcionarios/todos', (req, res) => {
  const sql = "SELECT * FROM funcionarios ORDER BY status ASC, nome ASC";
  db.query(sql, (err, data) => {
    if (err) {
      console.error("Erro ao buscar funcionários:", err);
      return res.status(500).json(err);
    }
    return res.json(data);
  });
});


// 5. Cadastrar Job (Inteligente: aceita Agendamento Novo e Antigo)
// NO ARQUIVO SERVER.JS - SUBSTITUA A ROTA app.post('/jobs'...) POR ESTA:

// ATUALIZAÇÃO NO SERVER.JS - Rota de Salvar Job

// SUBSTITUA NO SERVER.JS

app.post('/jobs', (req, res) => {
  const data = req.body;

  // PRIMEIRO: Buscar configuração do número de pedido
  const sqlConfig = "SELECT chave, valor FROM configuracoes_sistema WHERE chave IN ('pedido_prefixo', 'pedido_numero_atual', 'pedido_incremento')";

  db.query(sqlConfig, (errConfig, configResults) => {
    // Se não houver configuração, usa valores padrão
    let prefixo = 'PED';
    let numeroAtual = 1000;
    let incremento = 1;

    if (!errConfig && configResults && configResults.length > 0) {
      configResults.forEach(r => {
        if (r.chave === 'pedido_prefixo') prefixo = r.valor;
        if (r.chave === 'pedido_numero_atual') numeroAtual = parseInt(r.valor) || 1000;
        if (r.chave === 'pedido_incremento') incremento = parseInt(r.valor) || 1;
      });
    }

    const numeroPedido = `${prefixo}-${numeroAtual}`;
    console.log(`📝 Gerando pedido com número: ${numeroPedido}`);

    // Função auxiliar para converter data para formato SQL (evita problema de timezone)
    const formatarDataSQL = (data) => {
      if (!data) return null;
      const d = new Date(data);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // 1. ADICIONADO: Colunas de horário e numero_pedido no INSERT
    const sqlJob = `
        INSERT INTO jobs (
            numero_pedido,
            descricao, valor, data_job, data_inicio, data_fim, status, pagamento, cliente_id,
            operador_id, 
            hora_chegada_prevista, hora_inicio_evento, hora_fim_evento,
            logradouro, numero, bairro, cidade, uf, cep,
            solicitante_nome, solicitante_email, solicitante_telefone,
            producao_local, producao_contato, producao_email,
            pagador_nome, pagador_cnpj, pagador_email, pagador_endereco,
            forma_pagamento, tipo_documento, observacoes,
            desconto_porcentagem, motivo_desconto, vencimento_texto,
            pagador_cep, pagador_logradouro, pagador_numero, pagador_bairro,
            pagador_cidade, pagador_uf, desconto_valor,
            prazo_pagamento, data_vencimento
        ) VALUES (
            ?,
            ?, ?, ?, ?, ?, ?, ?, ?, 
            ?, ?, ?,
            ?, ?, ?, ?, ?, ?, 
            ?, ?, ?, 
            ?, ?, ?, 
            ?, ?, ?, ?, 
            ?, ?, ?, ?, 
            ?, ?, ?, 
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?
        )
    `;
    const pagadorEnderecoCompleto = (data.pagador_logradouro || data.endereco?.logradouro)
      ? `${data.pagador_logradouro || data.endereco?.logradouro}, ${data.pagador_numero || data.endereco?.numero} - ${data.pagador_bairro || data.endereco?.bairro}, ${data.pagador_cidade || data.endereco?.cidade}/${data.pagador_uf || data.endereco?.uf}`
      : null;

    // 2. Definição dos Valores (Incluindo numero_pedido)
    // CALCULAR DATA DE VENCIMENTO baseado no prazo
    let dataVencimento = null;
    if (data.prazo_pagamento && data.data_inicio) {
      const dataInicio = new Date(data.data_inicio);
      dataInicio.setDate(dataInicio.getDate() + parseInt(data.prazo_pagamento));
      dataVencimento = formatarDataSQL(dataInicio);
    } else if (data.data_vencimento) {
      dataVencimento = formatarDataSQL(data.data_vencimento);
    }

    const values = [
      numeroPedido,
      data.descricao || null,
      data.valor || 0,
      formatarDataSQL(new Date()), // data_job = data ATUAL (criação do pedido)
      formatarDataSQL(data.data_inicio) || null, // data_inicio = data do evento
      formatarDataSQL(data.data_fim) || null, // data_fim = data final do evento
      "Agendado",
      "Pendente",
      data.cliente_id || null,
      data.operador_id || null,

      data.hora_chegada_prevista || null,
      data.hora_inicio_evento || null,
      data.hora_fim_evento || null,

      data.endereco?.logradouro || null,
      data.endereco?.numero || null,
      data.endereco?.bairro || null,
      data.endereco?.cidade || null,
      data.endereco?.uf || null,
      data.endereco?.cep || null,

      data.solicitante_nome || null,
      data.solicitante_email || null,
      data.solicitante_telefone || null,

      data.producao_local || null,
      data.producao_contato || null,
      data.producao_email || null,

      data.pagador_nome || null,
      data.pagador_cnpj || null,
      data.pagador_email || null,
      pagadorEnderecoCompleto,

      data.forma_pagamento || null,
      data.tipo_documento || null,
      data.observacoes || null,
      0, // desconto_porcentagem
      data.motivo_desconto || null,
      (data.vencimento_texto && data.vencimento_texto.trim() !== '' && data.vencimento_texto !== 'null') ? data.vencimento_texto : "À vista",

      data.pagador_cep || null,
      data.pagador_logradouro || null,
      data.pagador_numero || null,
      data.pagador_bairro || null,
      data.pagador_cidade || null,
      data.pagador_uf || null,
      data.desconto_valor || 0,
      data.prazo_pagamento || null,
      dataVencimento
    ];

    db.query(sqlJob, values, (err, result) => {
      if (err) {
        console.error("Erro INSERT:", err);
        return res.status(500).json({ error: err.message });
      }

      const novoId = result.insertId;

      // =========================================================
      // 3. IMPLEMENTAÇÃO DA NOVA LÓGICA DE EQUIPE (MÚLTIPLOS)
      // =========================================================
      console.log('========================================');
      console.log('📋 PROCESSANDO EQUIPE DO JOB', novoId);
      console.log('📋 Operador ID recebido:', data.operador_id);
      console.log('📋 Equipe recebida:', JSON.stringify(data.equipe, null, 2));
      console.log('📋 Total de membros recebidos:', data.equipe?.length || 0);
      console.log('========================================');

      // Monta a equipe completa (apenas membros adicionados manualmente)
      // NOTA: Operador técnico NÃO é adicionado automaticamente à equipe
      let equipeCompleta = [];

      // Adiciona os membros da equipe enviados pelo frontend
      if (data.equipe && data.equipe.length > 0) {
        data.equipe.forEach(membro => {
          equipeCompleta.push({
            funcionario_id: membro.funcionario_id,
            funcao: membro.funcao || 'Técnico'
          });
        });
      }

      console.log('📋 Equipe COMPLETA a salvar:', JSON.stringify(equipeCompleta, null, 2));
      console.log('📋 Total FINAL de membros:', equipeCompleta.length);

      // SALVA NA TABELA JOB_EQUIPE E NA TABELA ESCALAS
      if (equipeCompleta.length > 0) {
        // A. SALVAR NA TABELA JOB_EQUIPE
        const sqlEquipe = "INSERT INTO job_equipe (job_id, funcionario_id, funcao) VALUES ?";
        const valoresEquipe = equipeCompleta.map(m => [novoId, m.funcionario_id, m.funcao]);

        console.log('📋 Valores a inserir em job_equipe:', valoresEquipe);

        db.query(sqlEquipe, [valoresEquipe], (errEq) => {
          if (errEq) console.error("❌ Erro ao inserir lista de equipe:", errEq);
          else console.log(`✅ ${valoresEquipe.length} membros inseridos na equipe do job ${novoId}`);
        });

        // B. CRIAR ESCALAS AUTOMATICAMENTE PARA CADA MEMBRO DA EQUIPE
        // Função auxiliar para converter data para formato SQL (evita problema de timezone)
        const formatarDataSQL = (data) => {
          if (!data) return null;
          const d = new Date(data);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const dataInicio = formatarDataSQL(data.data_inicio) || null;
        const dataFim = formatarDataSQL(data.data_fim || data.data_inicio) || null;

        if (dataInicio) {
          const sqlEscalas = `
          INSERT INTO escalas (funcionario_id, job_id, data_escala, data_inicio, data_fim, tipo, observacao)
          VALUES ?
        `;
          const valoresEscalas = equipeCompleta.map(m => [
            m.funcionario_id,
            novoId,
            dataInicio,
            dataInicio,
            dataFim,
            'Trabalho',
            `Job #${novoId} - ${data.descricao || 'Pedido'}`
          ]);

          console.log('📅 Criando escalas para equipe:', valoresEscalas);

          db.query(sqlEscalas, [valoresEscalas], (errEsc) => {
            if (errEsc) console.error("❌ Erro ao criar escalas:", errEsc);
            else console.log(`✅ ${valoresEscalas.length} escalas criadas para o job ${novoId}`);
          });
        }
      }

      // Processamento de itens (MANTIDO EXATAMENTE IGUAL)
      if (data.itens && data.itens.length > 0) {
        const sqlItens = "INSERT INTO job_itens (job_id, descricao, qtd, valor_unitario, desconto_item, equipamento_id) VALUES ?";
        const itensFormatados = data.itens.map(i => [
          novoId,
          i.descricao,
          i.qtd,
          i.valor,
          i.desconto_item || 0,
          i.equipamento_id || null
        ]);

        db.query(sqlItens, [itensFormatados], (errItens) => {
          if (errItens) console.error("Erro ao inserir itens:", errItens);

          // Incrementar número do pedido para o próximo
          const proximoNumero = numeroAtual + incremento;
          db.query(
            "INSERT INTO configuracoes_sistema (chave, valor) VALUES ('pedido_numero_atual', ?) ON DUPLICATE KEY UPDATE valor = ?",
            [String(proximoNumero), String(proximoNumero)],
            () => { } // Fire and forget
          );

          res.json({ message: "Job e Equipe salvos com sucesso!", id: novoId, numero_pedido: numeroPedido });
        });
      } else {
        // Incrementar número do pedido para o próximo
        const proximoNumero = numeroAtual + incremento;
        db.query(
          "INSERT INTO configuracoes_sistema (chave, valor) VALUES ('pedido_numero_atual', ?) ON DUPLICATE KEY UPDATE valor = ?",
          [String(proximoNumero), String(proximoNumero)],
          () => { } // Fire and forget
        );

        res.json({ message: "Job e Equipe salvos com sucesso!", id: novoId, numero_pedido: numeroPedido });
      }
    });
  }); // Fecha o db.query de configurações
});

/* =============================================================
   ROTA DE EDIÇÃO DE JOB
   ============================================================= */
app.put('/jobs/:id', (req, res) => {
  const data = req.body;
  const id = req.params.id;

  console.log(`📝 PUT /jobs/${id} - Iniciando atualização...`);

  // VERIFICAÇÃO: Job existe antes de atualizar?
  db.query("SELECT id FROM jobs WHERE id = ?", [id], (errCheck, jobCheck) => {
    if (errCheck) {
      console.error(`❌ Erro ao verificar job ${id}:`, errCheck);
      return res.status(500).json({ error: errCheck.message });
    }

    if (!jobCheck || jobCheck.length === 0) {
      console.error(`❌ Job ${id} não existe no banco de dados`);
      return res.status(404).json({
        error: `Pedido #${id} não encontrado. Ele pode ter sido excluído. Por favor, recarregue a página.`
      });
    }

    console.log(`✅ Job ${id} existe, prosseguindo com atualização...`);

    // Função auxiliar para converter data para formato SQL (evita problema de timezone)
    const formatarDataSQL = (data) => {
      if (!data) return null;
      const d = new Date(data);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // CALCULAR DATA DE VENCIMENTO baseado no prazo
    let dataVencimento = null;
    if (data.prazo_pagamento && data.data_inicio) {
      const dataInicio = new Date(data.data_inicio);
      dataInicio.setDate(dataInicio.getDate() + parseInt(data.prazo_pagamento));
      dataVencimento = formatarDataSQL(dataInicio);
    } else if (data.data_vencimento) {
      dataVencimento = formatarDataSQL(data.data_vencimento);
    }

    // MONTAR ENDEREÇO COMPLETO DO PAGADOR
    const pagadorEnderecoCompleto = (data.pagador_logradouro || data.endereco?.logradouro)
      ? `${data.pagador_logradouro || data.endereco?.logradouro}, ${data.pagador_numero || data.endereco?.numero} - ${data.pagador_bairro || data.endereco?.bairro}, ${data.pagador_cidade || data.endereco?.cidade}/${data.pagador_uf || data.endereco?.uf}`
      : null;

    // 1. ADICIONADO: Campos de horário no UPDATE
    const sqlJob = `
          UPDATE jobs SET
              descricao = ?, valor = ?, data_job = ?, data_inicio = ?, data_fim = ?,
              cliente_id = ?, operador_id = ?,
              hora_chegada_prevista = ?, hora_inicio_evento = ?, hora_fim_evento = ?, -- NOVOS CAMPOS
              logradouro = ?, numero = ?, bairro = ?, cidade = ?, uf = ?, cep = ?,
              solicitante_nome = ?, solicitante_email = ?, solicitante_telefone = ?,
              producao_local = ?, producao_contato = ?, producao_email = ?,
              pagador_nome = ?, pagador_cnpj = ?, pagador_email = ?, pagador_endereco = ?,
              forma_pagamento = ?, tipo_documento = ?, observacoes = ?,
              motivo_desconto = ?, vencimento_texto = ?,
              pagador_cep = ?, pagador_logradouro = ?, pagador_numero = ?, pagador_bairro = ?,
              pagador_cidade = ?, pagador_uf = ?, desconto_valor = ?,
              prazo_pagamento = ?, data_vencimento = ?
          WHERE id = ?
      `;

    // 2. ADICIONADO: Valores dos horários no array values
    const values = [
      data.descricao || null,
      data.valor || 0,
      formatarDataSQL(data.data_job || new Date()), // data_job (mantém a existente ou usa data atual)
      formatarDataSQL(data.data_inicio) || null, // data_inicio = data do evento
      formatarDataSQL(data.data_fim) || null, // data_fim = data final do evento
      data.cliente_id || null,
      data.operador_id || null,

      // NOVOS VALORES
      data.hora_chegada_prevista || null,
      data.hora_inicio_evento || null,
      data.hora_fim_evento || null,

      data.endereco?.logradouro || null,
      data.endereco?.numero || null,
      data.endereco?.bairro || null,
      data.endereco?.cidade || null,
      data.endereco?.uf || null,
      data.endereco?.cep || null,
      data.solicitante_nome || null,
      data.solicitante_email || null,
      data.solicitante_telefone || null,
      data.producao_local || null,
      data.producao_contato || null,
      data.producao_email || null,
      data.pagador_nome || null,
      data.pagador_cnpj || null,
      data.pagador_email || null,
      pagadorEnderecoCompleto,
      data.forma_pagamento || null,
      data.tipo_documento || null,
      data.observacoes || null,
      data.motivo_desconto || null,
      (data.vencimento_texto && data.vencimento_texto.trim() !== '') ? data.vencimento_texto : "À vista",
      data.pagador_cep || null,
      data.pagador_logradouro || null,
      data.pagador_numero || null,
      data.pagador_bairro || null,
      data.pagador_cidade || null,
      data.pagador_uf || null,
      data.desconto_valor || 0,
      data.prazo_pagamento || null,
      dataVencimento,
      id
    ];

    db.query(sqlJob, values, (err, result) => {
      if (err) {
        console.error("Erro UPDATE Job:", err);
        return res.status(500).json({ error: err.message });
      }

      // =========================================================
      // 3. IMPLEMENTAÇÃO DA ATUALIZAÇÃO DA EQUIPE
      // (Limpa a equipe antiga e insere a nova, igual à lógica dos itens)
      // =========================================================

      // A. LIMPA EQUIPE ANTIGA
      db.query("DELETE FROM job_equipe WHERE job_id = ?", [id], (errDelEq) => {
        if (errDelEq) console.error("Erro ao limpar equipe antiga:", errDelEq);

        // B. LIMPA ESCALAS ANTIGAS DESTE JOB (Para recriar atualizado)
        db.query("DELETE FROM escalas WHERE job_id = ?", [id], (errDelEsc) => {
          if (errDelEsc) console.error("Erro ao limpar escalas antigas:", errDelEsc);

          // C. INSERE DADOS NOVOS (SE HOUVER EQUIPE)
          if (data.equipe && data.equipe.length > 0) {

            // 1. INSERE NA JOB_EQUIPE
            const sqlEquipe = "INSERT INTO job_equipe (job_id, funcionario_id, funcao) VALUES ?";
            const valoresEquipe = data.equipe.map(m => [id, m.funcionario_id, m.funcao]);

            db.query(sqlEquipe, [valoresEquipe], (errInsEq) => {
              if (errInsEq) console.error("Erro ao inserir nova equipe:", errInsEq);
            });

            // 2. CRIA ESCALAS AUTOMATICAMENTE PARA CADA MEMBRO DA EQUIPE
            const dataInicio = formatarDataSQL(data.data_inicio) || null;
            const dataFim = formatarDataSQL(data.data_fim || data.data_inicio) || null;

            if (dataInicio) {
              const sqlEscalas = `
              INSERT INTO escalas (funcionario_id, job_id, data_escala, data_inicio, data_fim, tipo, observacao)
              VALUES ?
            `;
              const valoresEscalas = data.equipe.map(m => [
                m.funcionario_id,
                id,
                dataInicio,
                dataInicio,
                dataFim,
                'Trabalho',
                `Job #${id} - ${data.descricao || 'Pedido'}`
              ]);

              console.log('📅 Criando escalas atualizadas para equipe:', valoresEscalas);

              db.query(sqlEscalas, [valoresEscalas], (errEsc) => {
                if (errEsc) console.error("❌ Erro ao criar escalas:", errEsc);
                else console.log(`✅ ${valoresEscalas.length} escalas atualizadas para o job ${id}`);
              });
            }
          }
        });
      });

      // =========================================================
      // LÓGICA DE ITENS (MANTIDA EXATAMENTE IGUAL)
      // =========================================================
      db.query("DELETE FROM job_itens WHERE job_id = ?", [id], (errDel) => {
        if (errDel) {
          console.error("Erro ao limpar itens antigos:", errDel);
          return res.status(500).json({ error: errDel.message });
        }

        // SE NÃO TIVER ITENS NOVOS, TERMINA AQUI
        if (!data.itens || data.itens.length === 0) {
          console.log(`Job ${id} atualizado e itens limpos.`);
          return res.json({ message: "Job atualizado (lista de itens zerada)" });
        }

        // SE TIVER ITENS, INSERE OS NOVOS
        const sqlItens = `
                INSERT INTO job_itens (job_id, descricao, qtd, valor_unitario, desconto_item, equipamento_id)
                VALUES ?
            `;

        const itensFormatados = data.itens.map(i => [
          id,
          i.descricao,
          i.qtd,
          i.valor,
          i.desconto_item || 0,
          i.equipamento_id || null
        ]);

        db.query(sqlItens, [itensFormatados], (errIns) => {
          if (errIns) {
            console.error("Erro ao inserir novos itens:", errIns);
            return res.status(500).json({ error: errIns.message });
          }
          console.log(`Job ${id} atualizado com ${itensFormatados.length} novos itens.`);
          res.json({ message: "Job atualizado com novos itens" });
        });
      });
    });
  }); // fecha callback da verificação de existência do job
});

// --- ROTA NOVA: DADOS PARA O GRÁFICO ANUAL ---
app.get('/dashboard/grafico-financeiro', (req, res) => {
  // Essa query soma os valores agrupando por mês (1=Jan, 2=Fev...)
  // Apenas do ano atual
  const sql = `
        SELECT 
            MONTH(data_job) as mes, 
            SUM(valor) as total 
        FROM jobs 
        WHERE YEAR(data_job) = YEAR(CURRENT_DATE()) 
          AND status = 'Finalizado' 
          AND pagamento = 'Pago'
        GROUP BY mes 
        ORDER BY mes;
    `;

  db.query(sql, (err, results) => {
    if (err) return res.json(err);

    // O Banco devolve algo tipo: [{mes: 1, total: 5000}, {mes: 2, total: 8000}]
    // Precisamos transformar num array liso de 12 posições: [5000, 8000, 0, 0, ...]

    const dadosPorMes = Array(12).fill(0); // Cria array com 12 zeros

    results.forEach(item => {
      // item.mes vai de 1 a 12, mas array vai de 0 a 11. Então subtraímos 1.
      dadosPorMes[item.mes - 1] = item.total;
    });

    res.json(dadosPorMes);
  });
});


// =============================================================
// ROTAS DO MÓDULO FINANCEIRO
// =============================================================

// RESUMO FINANCEIRO (Cards do topo) - COM COMPARAÇÃO MÊS ANTERIOR
app.get('/financeiro/resumo', (req, res) => {
  const queries = {
    // A Receber: Jobs não pagos (Pendente + Parcial + Vencido) - TOTAL GERAL
    aReceber: `
      SELECT COALESCE(SUM(valor), 0) as total 
      FROM jobs 
      WHERE pagamento IN ('Pendente', 'Parcial', 'Vencido') 
        AND status NOT IN ('Cancelado')
    `,
    // Recebido ESTE MÊS
    recebidoMesAtual: `
      SELECT COALESCE(SUM(valor), 0) as total 
      FROM jobs 
      WHERE pagamento = 'Pago' 
        AND MONTH(data_job) = MONTH(CURRENT_DATE()) 
        AND YEAR(data_job) = YEAR(CURRENT_DATE())
    `,
    // Recebido MÊS ANTERIOR (para comparação)
    recebidoMesAnterior: `
      SELECT COALESCE(SUM(valor), 0) as total 
      FROM jobs 
      WHERE pagamento = 'Pago' 
        AND MONTH(data_job) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
        AND YEAR(data_job) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    `,
    // Despesas ESTE MÊS
    despesasMesAtual: `
      SELECT COALESCE(SUM(valor), 0) as total 
      FROM transacoes 
      WHERE tipo = 'despesa'
        AND status IN ('pago', 'pendente')
        AND MONTH(data_vencimento) = MONTH(CURRENT_DATE()) 
        AND YEAR(data_vencimento) = YEAR(CURRENT_DATE())
    `,
    // Despesas MÊS ANTERIOR (para comparação)
    despesasMesAnterior: `
      SELECT COALESCE(SUM(valor), 0) as total 
      FROM transacoes 
      WHERE tipo = 'despesa'
        AND status IN ('pago', 'pendente')
        AND MONTH(data_vencimento) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
        AND YEAR(data_vencimento) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    `,
    // Vencidas (Jobs com pagamento = 'Vencido' - TOTAL ACUMULADO, não apenas do mês)
    vencidas: `
      SELECT COALESCE(SUM(valor), 0) as total, COUNT(*) as qtd
      FROM jobs 
      WHERE pagamento = 'Vencido'
        AND status NOT IN ('Cancelado')
    `
  };

  const resultado = { 
    aReceber: 0, 
    recebidoMes: 0, 
    recebidoMesAnterior: 0,
    despesasMes: 0, 
    despesasMesAnterior: 0,
    vencidas: 0, 
    qtdVencidas: 0,
    saldo: 0,
    saldoMesAnterior: 0,
    // Porcentagens de variação
    variacaoRecebido: 0,
    variacaoDespesas: 0,
    variacaoSaldo: 0
  };

  // Função para calcular porcentagem de variação
  const calcularVariacao = (atual, anterior) => {
    if (anterior === 0) return atual > 0 ? 100 : 0;
    return ((atual - anterior) / anterior) * 100;
  };

  db.query(queries.aReceber, (err, r1) => {
    if (!err && r1[0]) resultado.aReceber = parseFloat(r1[0].total) || 0;
    
    db.query(queries.recebidoMesAtual, (err, r2) => {
      if (!err && r2[0]) resultado.recebidoMes = parseFloat(r2[0].total) || 0;
      
      db.query(queries.recebidoMesAnterior, (err, r2b) => {
        if (!err && r2b[0]) resultado.recebidoMesAnterior = parseFloat(r2b[0].total) || 0;
        
        db.query(queries.despesasMesAtual, (err, r3) => {
          if (!err && r3[0]) resultado.despesasMes = parseFloat(r3[0].total) || 0;
          
          db.query(queries.despesasMesAnterior, (err, r3b) => {
            if (!err && r3b[0]) resultado.despesasMesAnterior = parseFloat(r3b[0].total) || 0;
            
            db.query(queries.vencidas, (err, r4) => {
              if (!err && r4[0]) {
                resultado.vencidas = parseFloat(r4[0].total) || 0;
                resultado.qtdVencidas = r4[0].qtd || 0;
              }
              
              // Calcula saldos
              resultado.saldo = resultado.recebidoMes - resultado.despesasMes;
              resultado.saldoMesAnterior = resultado.recebidoMesAnterior - resultado.despesasMesAnterior;
              
              // Calcula variações percentuais
              resultado.variacaoRecebido = calcularVariacao(resultado.recebidoMes, resultado.recebidoMesAnterior);
              resultado.variacaoDespesas = calcularVariacao(resultado.despesasMes, resultado.despesasMesAnterior);
              resultado.variacaoSaldo = calcularVariacao(resultado.saldo, resultado.saldoMesAnterior);
              
              res.json(resultado);
            });
          });
        });
      });
    });
  });
});

// LISTAR TRANSAÇÕES (Jobs como receitas + transações manuais)
app.get('/financeiro/transacoes', (req, res) => {
  const { tipo, status, dataInicio, dataFim, busca } = req.query;

  // União de Jobs (receitas) com Transações manuais
  let sql = `
    SELECT 
      'job' as origem,
      j.id,
      j.descricao,
      'receita' as tipo,
      CASE 
        WHEN j.forma_pagamento LIKE '%Locação%' THEN 'Locação'
        WHEN j.forma_pagamento LIKE '%Serviço%' THEN 'Serviço'
        ELSE 'Locação + Serviço'
      END as categoria,
      j.valor,
      j.data_job as data_vencimento,
      NULL as data_pagamento,
      CASE 
        WHEN j.pagamento = 'Pago' THEN 'pago'
        WHEN j.pagamento = 'Cancelado' THEN 'cancelado'
        WHEN j.data_job < CURRENT_DATE() AND j.pagamento != 'Pago' THEN 'atrasado'
        ELSE 'pendente'
      END as status,
      c.nome as cliente_nome,
      j.cliente_id
    FROM jobs j
    LEFT JOIN clientes c ON j.cliente_id = c.id
    WHERE j.status != 'Cancelado'
    
    UNION ALL
    
    SELECT 
      'transacao' as origem,
      t.id,
      t.descricao,
      t.tipo,
      t.categoria,
      t.valor,
      t.data_vencimento,
      t.data_pagamento,
      t.status,
      c.nome as cliente_nome,
      t.cliente_id
    FROM transacoes t
    LEFT JOIN clientes c ON t.cliente_id = c.id
  `;

  let conditions = [];
  let params = [];

  // Filtros aplicados via subquery
  let sqlFinal = `SELECT * FROM (${sql}) AS uniao WHERE 1=1`;

  if (tipo && tipo !== 'todos') {
    sqlFinal += ` AND tipo = ?`;
    params.push(tipo);
  }

  if (status && status !== 'todos') {
    sqlFinal += ` AND status = ?`;
    params.push(status);
  }

  if (dataInicio) {
    sqlFinal += ` AND data_vencimento >= ?`;
    params.push(dataInicio);
  }

  if (dataFim) {
    sqlFinal += ` AND data_vencimento <= ?`;
    params.push(dataFim);
  }

  if (busca) {
    sqlFinal += ` AND (descricao LIKE ? OR cliente_nome LIKE ?)`;
    params.push(`%${busca}%`, `%${busca}%`);
  }

  sqlFinal += ` ORDER BY data_vencimento DESC LIMIT 100`;

  db.query(sqlFinal, params, (err, results) => {
    if (err) {
      console.error('❌ Erro ao buscar transações:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// CRIAR TRANSAÇÃO MANUAL (Despesa ou Receita)
app.post('/financeiro/transacoes', (req, res) => {
  const { tipo, categoria, descricao, valor, data_vencimento, status, forma_pagamento, observacoes, cliente_id, job_id } = req.body;

  const sql = `
    INSERT INTO transacoes (tipo, categoria, descricao, valor, data_vencimento, status, forma_pagamento, observacoes, cliente_id, job_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    tipo || 'despesa',
    categoria || 'Outros',
    descricao,
    valor,
    data_vencimento,
    status || 'pendente',
    forma_pagamento,
    observacoes,
    cliente_id || null,
    job_id || null
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Erro ao criar transação:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('✅ Transação criada com ID:', result.insertId);
    res.json({ message: 'Transação criada com sucesso!', id: result.insertId });
  });
});

// ATUALIZAR STATUS DE TRANSAÇÃO
app.put('/financeiro/transacoes/:id', (req, res) => {
  const { id } = req.params;
  const { status, data_pagamento, ...outros } = req.body;

  let sql = 'UPDATE transacoes SET status = ?';
  let params = [status];

  if (data_pagamento) {
    sql += ', data_pagamento = ?';
    params.push(data_pagamento);
  }

  // Campos adicionais se enviados
  ['categoria', 'descricao', 'valor', 'data_vencimento', 'forma_pagamento', 'observacoes'].forEach(campo => {
    if (outros[campo] !== undefined) {
      sql += `, ${campo} = ?`;
      params.push(outros[campo]);
    }
  });

  sql += ' WHERE id = ?';
  params.push(id);

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Transação atualizada!', affected: result.affectedRows });
  });
});

// DELETAR TRANSAÇÃO
app.delete('/financeiro/transacoes/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM transacoes WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Transação excluída!', deleted: result.affectedRows });
  });
});

// MARCAR JOB COMO PAGO
app.put('/financeiro/jobs/:id/pagar', (req, res) => {
  const { id } = req.params;
  const { data_pagamento } = req.body;

  const sql = `UPDATE jobs SET pagamento = 'Pago' WHERE id = ?`;
  
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    console.log(`✅ Job #${id} marcado como pago`);
    res.json({ message: 'Pagamento registrado!', affected: result.affectedRows });
  });
});

// GRÁFICO DE FLUXO DE CAIXA (Entradas vs Saídas por mês)
app.get('/financeiro/grafico-fluxo', (req, res) => {
  const ano = req.query.ano || new Date().getFullYear();

  // Receitas (Jobs pagos - usa data_inicio como referência da entrega)
  const sqlReceitas = `
    SELECT MONTH(data_inicio) as mes, COALESCE(SUM(valor), 0) as total
    FROM jobs 
    WHERE YEAR(data_inicio) = ? 
      AND pagamento = 'Pago'
      AND status = 'Finalizado'
    GROUP BY MONTH(data_inicio)
  `;

  // Despesas por mês (usa data_vencimento como referência)
  const sqlDespesas = `
    SELECT MONTH(data_vencimento) as mes, COALESCE(SUM(valor), 0) as total
    FROM transacoes 
    WHERE tipo = 'despesa' 
      AND YEAR(data_vencimento) = ? 
      AND status IN ('pago', 'pendente')
    GROUP BY MONTH(data_vencimento)
  `;

  db.query(sqlReceitas, [ano], (err, receitas) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query(sqlDespesas, [ano], (err, despesas) => {
      if (err) return res.status(500).json({ error: err.message });

      // Monta arrays de 12 posições
      const entradas = Array(12).fill(0);
      const saidas = Array(12).fill(0);

      receitas.forEach(r => { 
        if (r.mes >= 1 && r.mes <= 12) {
          entradas[r.mes - 1] = parseFloat(r.total); 
        }
      });
      despesas.forEach(d => { 
        if (d.mes >= 1 && d.mes <= 12) {
          saidas[d.mes - 1] = parseFloat(d.total); 
        }
      });

      res.json({ entradas, saidas });
    });
  });
});

// CATEGORIAS DE DESPESAS (para dropdown)
app.get('/financeiro/categorias', (req, res) => {
  const categorias = [
    'Combustível',
    'Manutenção',
    'Logística',
    'Folha de Pagamento',
    'Aluguel',
    'Materiais',
    'Marketing',
    'Impostos',
    'Fornecedores',
    'Outros'
  ];
  res.json(categorias);
});

// DESPESAS POR CATEGORIA (para gráfico de pizza)
app.get('/financeiro/despesas-por-categoria', (req, res) => {
  const sql = `
    SELECT 
      COALESCE(categoria, 'Outros') as categoria,
      SUM(valor) as total
    FROM transacoes 
    WHERE tipo = 'despesa'
      AND MONTH(data_vencimento) = MONTH(CURRENT_DATE()) 
      AND YEAR(data_vencimento) = YEAR(CURRENT_DATE())
    GROUP BY categoria
    ORDER BY total DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Erro ao buscar despesas por categoria:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Formata para o gráfico
    const dados = {
      labels: results.map(r => r.categoria),
      valores: results.map(r => parseFloat(r.total) || 0),
      total: results.reduce((acc, r) => acc + (parseFloat(r.total) || 0), 0)
    };
    
    res.json(dados);
  });
});


// =============================================================
// ROTA MÁGICA: RECALIBRAR ESTOQUE (CORRIGE QUALQUER ERRO)
// =============================================================
app.get('/debug/recalcular-estoque', (req, res) => {
  console.log("🔄 Iniciando recalibração total de estoque...");

  // 1. PRIMEIRO: Reseta tudo (Disponível = Total)
  // Assume que nada está alugado por enquanto
  const sqlReset = "UPDATE equipamentos SET qtd_disponivel = qtd_total";

  db.query(sqlReset, (err) => {
    if (err) return res.status(500).json({ error: "Erro ao resetar: " + err.message });

    // 2. SEGUNDO: Descobre o que está sendo usado AGORA
    // Soma os itens de pedidos Agendados, Confirmados ou Em Andamento
    const sqlEmUso = `
            SELECT i.equipamento_id, SUM(i.qtd) as total_usado
            FROM job_itens i
            INNER JOIN jobs j ON i.job_id = j.id
            WHERE j.status IN ('Agendado', 'Confirmado', 'Em Andamento')
              AND i.equipamento_id IS NOT NULL
            GROUP BY i.equipamento_id
        `;

    db.query(sqlEmUso, (err2, itensEmUso) => {
      if (err2) return res.status(500).json({ error: "Erro ao calcular uso: " + err2.message });

      console.log(`📉 Encontrados ${itensEmUso.length} equipamentos em uso atualmente.`);

      // 3. TERCEIRO: Abate do estoque disponível
      let processados = 0;

      if (itensEmUso.length === 0) {
        return res.json({ message: "Estoque recalibrado! Nenhum item em uso no momento." });
      }

      itensEmUso.forEach(item => {
        const sqlUpdate = "UPDATE equipamentos SET qtd_disponivel = qtd_disponivel - ? WHERE id = ?";

        db.query(sqlUpdate, [item.total_usado, item.equipamento_id], (err3) => {
          if (err3) console.error(`Erro ao atualizar ID ${item.equipamento_id}:`, err3);

          processados++;
          if (processados === itensEmUso.length) {
            res.json({
              success: true,
              message: "Estoque recalibrado com sucesso com base nos pedidos ativos!",
              detalhes: itensEmUso
            });
          }
        });
      });
    });
  });
});




// Inicia o servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});


// Rota para buscar a Frota
app.get('/veiculos', (req, res) => {
  const sql = "SELECT * FROM veiculos";
  db.query(sql, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});


app.post('/jobs/update/:id', (req, res) => {
  const { id } = req.params;
  const { campo, valor } = req.body;

  if (!['status', 'pagamento'].includes(campo)) {
    return res.status(400).json({ error: "Campo inválido" });
  }

  const sql = `UPDATE jobs SET ${campo} = ? WHERE id = ?`;
  db.query(sql, [valor, id], (err, result) => {
    if (err) {
      console.error("Erro ao atualizar:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});
/* ADICIONE ESTA ROTA NO server.js PARA DIAGNOSTICAR */

// Rota de Diagnóstico - Execute no terminal ou browser
app.get('/debug/estrutura-jobs', (req, res) => {
  const sql = "DESCRIBE jobs";
  db.query(sql, (err, results) => {
    if (err) return res.json({ error: err.message });

    // Mostra todas as colunas
    const colunas = results.map(r => r.Field);
    const totalColunas = colunas.length;

    res.json({
      total_colunas: totalColunas,
      colunas: colunas,
      estrutura_completa: results
    });
  });
});

/* 
   PARA USAR:
   1. Reinicie o node server.js
   2. Abra no browser: http://localhost:3000/debug/estrutura-jobs
   3. Copie TODO O RESULTADO JSON aqui para análise
   
   Isso vai mostrar:
   - Quantas colunas existem
   - Qual é o nome de cada coluna
   - O tipo de cada coluna
*/

// Debug: Verificar datas dos jobs
app.get('/debug/jobs-datas', (req, res) => {
  const sql = "SELECT id, descricao, data_job, data_inicio, data_fim, operador_id FROM jobs ORDER BY id DESC LIMIT 10";
  db.query(sql, (err, results) => {
    if (err) return res.json({ error: err.message });
    res.json({
      total: results.length,
      jobs: results,
      info: "Mostrando últimos 10 jobs com suas datas"
    });
  });
});

// Debug: Verificar itens de um job com detalhes de equipamento
app.get('/debug/job-itens/:id', (req, res) => {
  const jobId = req.params.id;

  const sql = `
    SELECT 
      ji.id as item_id,
      ji.job_id,
      ji.descricao,
      ji.qtd,
      ji.equipamento_id,
      e.nome as equipamento_nome,
      e.qtd_disponivel,
      e.qtd_total
    FROM job_itens ji
    LEFT JOIN equipamentos e ON ji.equipamento_id = e.id
    WHERE ji.job_id = ?
  `;

  db.query(sql, [jobId], (err, results) => {
    if (err) return res.json({ error: err.message });

    const comEquipamento = results.filter(r => r.equipamento_id);
    const semEquipamento = results.filter(r => !r.equipamento_id);

    res.json({
      job_id: jobId,
      total_itens: results.length,
      com_equipamento_id: comEquipamento.length,
      sem_equipamento_id: semEquipamento.length,
      itens: results,
      aviso: semEquipamento.length > 0
        ? "Atenção: Itens sem equipamento_id não serão devolvidos ao estoque!"
        : "Todos os itens têm equipamento_id vinculado"
    });
  });
});

// Debug: Verificar dependências de um job antes de excluir
app.get('/debug/job-dependencias/:id', (req, res) => {
  const jobId = req.params.id;

  const queries = {
    job: "SELECT id, descricao, status FROM jobs WHERE id = ?",
    job_itens: "SELECT COUNT(*) as total FROM job_itens WHERE job_id = ?",
    job_equipe: "SELECT COUNT(*) as total FROM job_equipe WHERE job_id = ?",
    escalas: "SELECT COUNT(*) as total FROM escalas WHERE job_id = ?",
  };

  const resultados = {};
  let completadas = 0;
  const totalQueries = Object.keys(queries).length;

  Object.entries(queries).forEach(([nome, sql]) => {
    db.query(sql, [jobId], (err, results) => {
      if (err) {
        resultados[nome] = { error: err.message };
      } else {
        resultados[nome] = results[0] || results;
      }
      completadas++;

      if (completadas === totalQueries) {
        // Verificar foreign keys
        db.query("SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME = 'jobs' AND TABLE_SCHEMA = DATABASE()", (err, fks) => {
          resultados.foreign_keys = err ? { error: err.message } : fks;
          res.json({
            job_id: jobId,
            dependencias: resultados,
            info: "Use isso para verificar o que impede a exclusão"
          });
        });
      }
    });
  });
});

// Debug: Forçar exclusão de job (apenas para emergência)
app.delete('/debug/forcar-exclusao-job/:id', (req, res) => {
  const jobId = req.params.id;

  console.log(`⚠️ EXCLUSÃO FORÇADA do job ${jobId}`);

  // Executa todas as exclusões em sequência sem transação
  const queries = [
    `DELETE FROM job_itens WHERE job_id = ${jobId}`,
    `DELETE FROM job_equipe WHERE job_id = ${jobId}`,
    `DELETE FROM escalas WHERE job_id = ${jobId}`,
    `DELETE FROM jobs WHERE id = ${jobId}`
  ];

  let executadas = 0;
  const erros = [];

  queries.forEach((sql, index) => {
    db.query(sql, (err, result) => {
      if (err) {
        erros.push({ query: index, sql: sql, error: err.message, code: err.code });
      }
      executadas++;

      if (executadas === queries.length) {
        if (erros.length > 0) {
          res.json({ success: false, erros: erros });
        } else {
          res.json({ success: true, message: `Job ${jobId} excluído com sucesso` });
        }
      }
    });
  });
});

// Debug: Limpar TODOS os jobs (CUIDADO!)
app.delete('/debug/limpar-todos-jobs', (req, res) => {
  console.log('⚠️ LIMPANDO TODOS OS JOBS DO SISTEMA');

  const queries = [
    'DELETE FROM job_itens',
    'DELETE FROM job_equipe',
    'DELETE FROM escalas WHERE job_id IS NOT NULL',
    'DELETE FROM jobs'
  ];

  let executadas = 0;
  const resultados = [];

  queries.forEach((sql, index) => {
    db.query(sql, (err, result) => {
      resultados.push({
        query: sql,
        success: !err,
        error: err ? err.message : null,
        affectedRows: result ? result.affectedRows : 0
      });
      executadas++;

      if (executadas === queries.length) {
        const temErro = resultados.some(r => !r.success);
        res.json({
          success: !temErro,
          message: temErro ? 'Alguns erros ocorreram' : 'Todos os jobs foram excluídos',
          detalhes: resultados
        });
      }
    });
  });
});

// Rota para Atualizar Status ou Pagamento
app.post('/jobs/update/:id', (req, res) => {
  const { id } = req.params;
  const { campo, valor } = req.body;

  console.log(`Tentando atualizar Job ${id}: ${campo} -> ${valor}`); // DEBUG NO TERMINAL

  // Proteção básica
  if (campo !== 'status' && campo !== 'pagamento') {
    return res.status(400).json({ error: "Campo inválido" });
  }

  const sql = `UPDATE jobs SET ${campo} = ? WHERE id = ?`;
  db.query(sql, [valor, id], (err, result) => {
    if (err) {
      console.error("Erro no SQL:", err);
      return res.status(500).json(err);
    }
    res.json({ success: true });
  });
});

// ROTA DE CADASTRO COMPLETO (PROFISSIONAL)
/* SUBSTITUA A ROTA POST /clientes NO server.js */

app.post('/clientes', (req, res) => {
  const d = req.body;

  const sql = `
        INSERT INTO clientes (
            nome,
            nome_fantasia,
            documento,
            inscricao_estadual,
            status,
            site,
            cep,
            logradouro,
            numero,
            bairro,
            cidade,
            uf,
            observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  const values = [
    d.nome || null,
    d.nome_fantasia || null,
    d.documento || null,
    d.inscricao_estadual || null,
    d.status || 'Ativo',
    d.site || null,
    d.cep || null,
    d.logradouro || null,
    d.numero || null,
    d.bairro || null,
    d.cidade || null,
    d.uf || null,
    d.observacoes || null
  ];

  console.log("INSERT Clientes - Valores:", values); // DEBUG

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erro no cadastro:", err);
      return res.status(500).json({ error: err.message });
    }

    const clienteId = result.insertId;
    console.log("Cliente cadastrado com ID:", clienteId);

    // Salvar contatos se existirem
    if (d.contatos && Array.isArray(d.contatos) && d.contatos.length > 0) {
      const sqlContatos = `
        INSERT INTO contatos_clientes (cliente_id, nome, cargo, email, telefone)
        VALUES (?, ?, ?, ?, ?)
      `;

      let contatosSalvos = 0;
      const totalContatos = d.contatos.length;

      d.contatos.forEach(contato => {
        db.query(sqlContatos, [
          clienteId,
          contato.nome || null,
          contato.cargo || null,
          contato.email || null,
          contato.telefone || null
        ], (err) => {
          if (err) console.error("Erro ao salvar contato:", err);

          contatosSalvos++;

          // Quando todos os contatos forem processados, retorna a resposta
          if (contatosSalvos === totalContatos) {
            res.json({ message: "Cadastro realizado!", id: clienteId });
          }
        });
      });
    } else {
      res.json({ message: "Cadastro realizado!", id: clienteId });
    }
  });
});

// =============================================================
// ROTA DE EXCLUSÃO INTELIGENTE (DEVOLVE ESTOQUE ANTES DE APAGAR)
// =============================================================
// =============================================================
// ROTA DE EXCLUSÃO INTELIGENTE (CORRIGIDA)
// Só devolve estoque se o pedido estiver ATIVO
// =============================================================
app.delete('/jobs/:id', async (req, res) => {
  const { id } = req.params;

  console.log(`🗑️ Solicitada exclusão do Job ${id}...`);

  try {
    // 1. PRIMEIRO: DESCOBRIR O STATUS DO PEDIDO
    const jobResult = await new Promise((resolve, reject) => {
      db.query("SELECT status FROM jobs WHERE id = ?", [id], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (!jobResult.length) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    const job = jobResult[0];
    console.log(`📊 Status do pedido a excluir: ${job.status}`);

    // Lista de status que NÃO devem devolver estoque
    const isInativo = (job.status === 'Finalizado' || job.status === 'Cancelado');

    if (!isInativo) {
      // 2. SE ESTIVER ATIVO: DEVOLVER O ESTOQUE
      const itens = await new Promise((resolve, reject) => {
        db.query("SELECT equipamento_id, qtd FROM job_itens WHERE job_id = ?", [id], (err, results) => {
          if (err) reject(err);
          else resolve(results || []);
        });
      });

      console.log(`📦 Itens encontrados no job: ${itens.length}`);
      console.log(`📦 Itens detalhados:`, JSON.stringify(itens));

      // Filtra itens que têm equipamento_id
      const itensComEquipamento = itens.filter(i => i.equipamento_id);
      console.log(`📦 Itens COM equipamento_id: ${itensComEquipamento.length}`);
      console.log(`⏭️ Itens SEM equipamento_id (ignorados): ${itens.length - itensComEquipamento.length}`);

      if (itensComEquipamento.length > 0) {
        console.log(`📦 Pedido Ativo: Devolvendo ${itensComEquipamento.length} equipamento(s) ao estoque...`);

        for (const item of itensComEquipamento) {
          console.log(`   → Devolvendo: Equipamento ${item.equipamento_id}, Qtd: ${item.qtd}`);
          await new Promise((resolve, reject) => {
            db.query("UPDATE equipamentos SET qtd_disponivel = qtd_disponivel + ? WHERE id = ?",
              [item.qtd, item.equipamento_id], (err, result) => {
                if (err) {
                  console.error(`   ❌ Erro ao devolver equipamento ${item.equipamento_id}:`, err);
                  reject(err);
                } else {
                  console.log(`   ✅ Equipamento ${item.equipamento_id}: +${item.qtd} (affected: ${result.affectedRows})`);
                  resolve();
                }
              });
          });
        }
        console.log("✅ Todo o estoque foi devolvido com sucesso.");
      } else {
        console.log(`⚠️ Nenhum item com equipamento_id para devolver.`);
      }
    } else {
      console.log("🛑 Pedido já inativo (Finalizado/Cancelado). Estoque já foi devolvido anteriormente.");
    }

    // 3. APAGA OS ITENS DO PEDIDO
    await new Promise((resolve, reject) => {
      db.query("DELETE FROM job_itens WHERE job_id = ?", [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 3.1 APAGA AS ESCALAS ASSOCIADAS AO JOB
    await new Promise((resolve, reject) => {
      db.query("DELETE FROM escalas WHERE job_id = ?", [id], (err) => {
        if (err) reject(err);
        else {
          console.log(`📅 Escalas do job ${id} removidas`);
          resolve();
        }
      });
    });

    // 3.2 APAGA A EQUIPE DO JOB
    await new Promise((resolve, reject) => {
      db.query("DELETE FROM job_equipe WHERE job_id = ?", [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 4. APAGA O PEDIDO (CABEÇALHO)
    await new Promise((resolve, reject) => {
      db.query("DELETE FROM jobs WHERE id = ?", [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const msg = isInativo
      ? "Pedido excluído (Estoque mantido pois já estava finalizado/cancelado)."
      : "Pedido excluído e estoque devolvido com sucesso!";

    console.log(`✅ Job ${id} excluído com sucesso`);
    res.json({ success: true, message: msg });

  } catch (error) {
    console.error("❌ Erro na exclusão do Job:", error);
    res.status(500).json({
      message: "Falha ao excluir",
      error: error.message || "Erro desconhecido",
      code: error.code || null,
      sqlMessage: error.sqlMessage || null
    });
  }
});


// === ROTA 1: Validar se pode mudar status do cliente ===
app.post('/clientes/:id/pode-alterar-status', (req, res) => {
  const { id } = req.params;
  const { novo_status } = req.body;

  // Se mantém como Ativo, permite sem verificar
  if (novo_status === 'Ativo') {
    return res.json({ permitido: true });
  }

  // Verifica se tem pedidos com pagamento não finalizado
  const sql = `
        SELECT COUNT(*) as qtd 
        FROM jobs 
        WHERE cliente_id = ? 
          AND pagamento != 'Pago' 
          AND pagamento != 'Cancelado'
    `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro na validação:", err);
      return res.status(500).json({ error: err.message });
    }

    const temPendencia = results[0].qtd > 0;

    if (temPendencia) {
      return res.status(400).json({
        permitido: false,
        error: `⚠️ STATUS NÃO PODE SER ALTERADO!\n\nEste cliente possui ${results[0].qtd} pedido(s) com pagamento pendente/vencido.\n\nResolva os pagamentos antes de bloquear ou desativar o cliente.`
      });
    }

    res.json({ permitido: true });
  });
});



// === ROTA 2: Endpoint simples para teste (debug) ===
app.get('/debug/clientes/:id/pendencias', (req, res) => {
  const { id } = req.params;

  const sql = `
        SELECT pagamento, COUNT(*) as qtd 
        FROM jobs 
        WHERE cliente_id = ? 
        GROUP BY pagamento
    `;

  db.query(sql, [id], (err, results) => {
    if (err) return res.json({ error: err.message });
    res.json({
      cliente_id: id,
      resumo_por_status: results,
      tem_pendencia: results.some(r => r.pagamento !== 'Pago' && r.pagamento !== 'Cancelado')
    });
  });
});


// 1. CADASTRAR (POST com upload.single)
app.post('/equipamentos', upload.single('foto'), (req, res) => {
  console.log("=== CADASTRO COM FOTO ===");
  const d = req.body;
  const nomeImagem = req.file ? req.file.filename : null;

  // ADICIONADO: n_serie
  const sql = `
        INSERT INTO equipamentos (
            nome, categoria, qtd_total, qtd_disponivel, valor_diaria, 
            status, marca, modelo, n_serie, observacoes, imagem
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  const values = [
    d.nome, d.categoria, d.qtd_total, d.qtd_disponivel, d.valor_diaria,
    d.status, d.marca, d.modelo, d.n_serie, d.observacoes, nomeImagem
  ];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Equipamento salvo!", id: result.insertId });
  });
});



// 5. ROTA DE EDIÇÃO COM FOTO (PUT)
// O PUT não lida bem com arquivos em alguns navegadores, vamos usar POST para update com arquivo ou lógica condicional
// Vamos fazer uma rota específica ou ajustar a lógica. Para simplificar, vou manter PUT mas usando FormData no front.
// --- ROTA: ATUALIZAR EQUIPAMENTO (COM FOTO E LOGS) ---
app.put('/equipamentos/:id', upload.single('foto'), (req, res) => {
  const id = req.params.id;
  const d = req.body;
  console.log(`=== EDITANDO ID ${id} ===`);

  // ADICIONADO: n_serie
  let sql = `
        UPDATE equipamentos SET 
            nome = ?, categoria = ?, qtd_total = ?, qtd_disponivel = ?, 
            valor_diaria = ?, status = ?, marca = ?, modelo = ?, n_serie = ?, observacoes = ?
    `;

  let values = [
    d.nome, d.categoria, d.qtd_total, d.qtd_disponivel,
    d.valor_diaria, d.status, d.marca, d.modelo, d.n_serie, d.observacoes
  ];

  if (req.file) {
    sql += `, imagem = ?`;
    values.push(req.file.filename);
  }

  sql += ` WHERE id = ?`;
  values.push(id);

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true, message: "Item atualizado!" });
  });
});
// =======================================================
//          ROTAS DE EQUIPAMENTOS (COM FOTO)
// =======================================================

// 1. LISTAR
app.get('/equipamentos', (req, res) => {
  db.query("SELECT * FROM equipamentos", (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

// 1. CADASTRAR (POST com upload.single)
app.post('/equipamentos', upload.single('foto'), (req, res) => {
  console.log("=== CADASTRO COM FOTO ===");
  const d = req.body;
  const nomeImagem = req.file ? req.file.filename : null;

  // ADICIONADO: n_serie
  const sql = `
        INSERT INTO equipamentos (
            nome, categoria, qtd_total, qtd_disponivel, valor_diaria, 
            status, marca, modelo, n_serie, observacoes, imagem
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  const values = [
    d.nome, d.categoria, d.qtd_total, d.qtd_disponivel, d.valor_diaria,
    d.status, d.marca, d.modelo, d.n_serie, d.observacoes, nomeImagem
  ];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Equipamento salvo!", id: result.insertId });
  });
});


// 3. EDITAR (PUT com upload.single)
app.put('/equipamentos/:id', upload.single('foto'), (req, res) => {
  const id = req.params.id;
  const d = req.body;
  console.log(`=== EDITANDO ID ${id} ===`);

  // ADICIONADO: n_serie
  let sql = `
        UPDATE equipamentos SET 
            nome = ?, categoria = ?, qtd_total = ?, qtd_disponivel = ?, 
            valor_diaria = ?, status = ?, marca = ?, modelo = ?, n_serie = ?, observacoes = ?
    `;

  let values = [
    d.nome, d.categoria, d.qtd_total, d.qtd_disponivel,
    d.valor_diaria, d.status, d.marca, d.modelo, d.n_serie, d.observacoes
  ];

  if (req.file) {
    sql += `, imagem = ?`;
    values.push(req.file.filename);
  }

  sql += ` WHERE id = ?`;
  values.push(id);

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true, message: "Item atualizado!" });
  });
});



// 4. EXCLUIR
app.delete('/equipamentos/:id', (req, res) => {
  db.query("DELETE FROM equipamentos WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true, message: "Item excluído!" });
  });
});



// ============================================
// ROTA: VALIDAR ESTOQUE ANTES DE SALVAR
// Insira ANTES da rota DELETE /equipamentos/:id
// ============================================
// ROTA: VALIDAR ESTOQUE ANTES DE SALVAR (CORRIGIDA)
// Insira ANTES da rota DELETE /equipamentos/:id
// ============================================
app.post('/jobs/validar-estoque', (req, res) => {
  const { itens } = req.body;

  console.log("🔍 [VALIDAR ESTOQUE] Itens recebidos:", itens);

  // Se não tem itens, está OK
  if (!itens || itens.length === 0) {
    console.log("✅ [VALIDAR ESTOQUE] Sem itens, retornando OK");
    return res.json({ valido: true });
  }

  // Pega os IDs dos equipamentos
  const idsEquipamentos = itens
    .map(i => i.equipamento_id)
    .filter(id => id); // Remove nulos/undefined

  if (idsEquipamentos.length === 0) {
    console.log("✅ [VALIDAR ESTOQUE] Sem equipamentos específicos");
    return res.json({ valido: true });
  }

  // Query para buscar quantidade disponível
  const placeholders = idsEquipamentos.map(() => '?').join(',');
  const sql = `SELECT id, nome, qtd_disponivel, qtd_total FROM equipamentos WHERE id IN (${placeholders})`;

  console.log("🔍 [VALIDAR ESTOQUE] SQL:", sql);
  console.log("🔍 [VALIDAR ESTOQUE] IDs:", idsEquipamentos);

  db.query(sql, idsEquipamentos, (err, equipamentos) => {
    if (err) {
      console.error("❌ [VALIDAR ESTOQUE] Erro SQL:", err);
      return res.status(500).json({
        valido: false,
        erro: err.message
      });
    }

    console.log("✅ [VALIDAR ESTOQUE] Equipamentos encontrados:", equipamentos);

    let problemas = [];

    // Verifica cada item solicitado
    itens.forEach(item => {
      if (!item.equipamento_id) {
        console.log("⏭️ [VALIDAR ESTOQUE] Item sem equipamento_id, pulando");
        return;
      }

      // Usar '==' para ignorar diferença entre string e número
      const equip = equipamentos.find(e => e.id == item.equipamento_id);

      console.log(`🔍 [VALIDAR ESTOQUE] Item: Equip=${item.equipamento_id}, Qtd=${item.qtd}, Encontrado:`, equip);

      if (!equip) {
        problemas.push(`❌ Equipamento ID ${item.equipamento_id} não encontrado`);
      } else if (equip.qtd_disponivel < item.qtd) {
        problemas.push(
          `❌ Estoque insuficiente para "${equip.nome}":\n` +
          `   Disponível: ${equip.qtd_disponivel} | Solicitado: ${item.qtd}`
        );
      }
    });

    if (problemas.length > 0) {
      console.log("❌ [VALIDAR ESTOQUE] Problemas encontrados:", problemas);
      return res.status(400).json({
        valido: false,
        mensagem: problemas.join('\n\n')
      });
    }

    // Tudo OK
    console.log("✅ [VALIDAR ESTOQUE] Validação OK!");
    res.json({ valido: true });
  });
});



// ============================================
// ROTA: BAIXAR ESTOQUE (Ao salvar pedido com sucesso)
// Insira ANTES da rota DELETE /equipamentos/:id
// ============================================
app.post('/jobs/:jobId/baixar-estoque', (req, res) => {
  const { jobId } = req.params;
  const { itens } = req.body;

  console.log(`\n🔽 [BAIXAR ESTOQUE] Job ${jobId} - Itens:`, itens);

  // Se não tem itens, nada para fazer
  if (!itens || itens.length === 0) {
    console.log(`✅ [BAIXAR ESTOQUE] Nenhum item com equipamento_id`);
    return res.json({ sucesso: true, mensagem: "Sem itens para baixar" });
  }

  let atualizados = 0;
  let erros = [];

  // Processa cada item
  itens.forEach((item, index) => {
    if (!item.equipamento_id) {
      console.log(`⏭️ [BAIXAR ESTOQUE] Item ${index} sem equipamento_id, pulando`);
      atualizados++;
      return;
    }

    console.log(`\n📦 [BAIXAR ESTOQUE] Item ${index}:`, item);

    const sql = `
            UPDATE equipamentos 
            SET qtd_disponivel = qtd_disponivel - ? 
            WHERE id = ? AND qtd_disponivel >= ?
        `;

    const valores = [item.qtd, item.equipamento_id, item.qtd];

    console.log(`   SQL: ${sql}`);
    console.log(`   Valores: [${valores}]`);

    db.query(sql, valores, (err, result) => {
      if (err) {
        console.error(`❌ [BAIXAR ESTOQUE] Erro no item ${index}:`, err);
        erros.push(`Erro ao atualizar equipamento ID ${item.equipamento_id}: ${err.message}`);
      } else {
        console.log(`   Result:`, result);

        if (result.affectedRows === 0) {
          console.warn(`⚠️ [BAIXAR ESTOQUE] Falha - Estoque insuficiente para equip ${item.equipamento_id}`);
          erros.push(`Estoque insuficiente para equipamento ID ${item.equipamento_id}`);
        } else {
          console.log(`✅ [BAIXAR ESTOQUE] Equipamento ${item.equipamento_id} - ${item.qtd} unidades baixadas`);
        }
      }

      atualizados++;

      // Quando todas as queries terminarem
      if (atualizados === itens.length) {
        console.log(`\n📊 [BAIXAR ESTOQUE] Finalizado! Erros: ${erros.length}`);

        if (erros.length > 0) {
          console.error("❌ [BAIXAR ESTOQUE] Houve erros:", erros);
          return res.status(400).json({
            sucesso: false,
            mensagem: erros.join('\n')
          });
        }

        console.log("✅ [BAIXAR ESTOQUE] Tudo ok!");
        res.json({
          sucesso: true,
          mensagem: "Estoque atualizado com sucesso"
        });
      }
    });
  });
});

// ============================================
// ROTA: DEVOLVER ESTOQUE (Se cancelar/editar pedido)
// Insira ANTES da rota DELETE /equipamentos/:id
// ============================================
// ============================================
// ROTA: DEVOLVER ESTOQUE (CORRIGIDA E BLINDADA)
// ============================================
app.post('/jobs/:jobId/devolver-estoque', (req, res) => {
  const { jobId } = req.params;
  const { itens } = req.body;

  console.log(`\n↩️ [DEVOLVER ESTOQUE] Job ${jobId} - Iniciando devolução...`);
  console.log(`📋 Total de itens recebidos: ${itens?.length || 0}`);
  console.log(`📋 Itens:`, JSON.stringify(itens, null, 2));

  if (!itens || itens.length === 0) {
    console.log(`⚠️ [DEVOLVER ESTOQUE] Nenhum item recebido na requisição!`);
    return res.json({ sucesso: true, mensagem: "Sem itens para devolver" });
  }

  // Filtra apenas itens que têm equipamento_id
  const itensComEquipamento = itens.filter(i => i.equipamento_id);
  console.log(`📦 Itens COM equipamento_id: ${itensComEquipamento.length}`);
  console.log(`⏭️ Itens SEM equipamento_id (ignorados): ${itens.length - itensComEquipamento.length}`);

  if (itensComEquipamento.length === 0) {
    console.log(`⚠️ [DEVOLVER ESTOQUE] Nenhum item tem equipamento_id vinculado!`);
    return res.json({ sucesso: true, mensagem: "Nenhum item com equipamento vinculado" });
  }

  let processados = 0;
  let erros = [];
  let sucessos = [];

  itensComEquipamento.forEach((item, index) => {
    // Garante que é número para evitar erro de texto '1' + 1 = '11'
    const idEquip = parseInt(item.equipamento_id);
    const qtdDevolver = parseInt(item.qtd);

    console.log(`📦 Processando Item ${index + 1}/${itensComEquipamento.length}: Equipamento ID ${idEquip} | Qtd a devolver: ${qtdDevolver}`);

    // SQL BLINDADO: 
    // 1. COALESCE(qtd_disponivel, 0) -> Transforma NULL em 0 antes de somar
    // 2. Garante que soma matematicamente
    const sql = `
            UPDATE equipamentos 
            SET qtd_disponivel = COALESCE(qtd_disponivel, 0) + ? 
            WHERE id = ?
        `;

    db.query(sql, [qtdDevolver, idEquip], (err, result) => {
      if (err) {
        console.error(`❌ Erro SQL no equipamento ${idEquip}:`, err);
        erros.push(`Erro técnico no ID ${idEquip}: ${err.message}`);
      } else {
        // AGORA VERIFICAMOS SE O BANCO REALMENTE ACHOU O ITEM
        if (result.affectedRows === 0) {
          console.warn(`⚠️ ALERTA: Equipamento ID ${idEquip} não foi encontrado no banco! Nada foi alterado.`);
          erros.push(`Equipamento ID ${idEquip} não existe no cadastro.`);
        } else {
          console.log(`✅ Equipamento ${idEquip}: +${qtdDevolver} unidades devolvidas ao estoque`);
          sucessos.push({ equipamento_id: idEquip, qtd: qtdDevolver });
        }
      }

      processados++;
      verificarFim();
    });
  });

  function verificarFim() {
    if (processados === itensComEquipamento.length) {
      console.log(`\n📊 [DEVOLVER ESTOQUE] Finalizado!`);
      console.log(`   ✅ Sucessos: ${sucessos.length}`);
      console.log(`   ❌ Erros: ${erros.length}`);

      if (erros.length > 0) {
        console.error(`❌ [DEVOLVER ESTOQUE] Alguns itens falharam:`, erros);
        return res.status(400).json({
          sucesso: false,
          mensagem: erros.join('\n'),
          detalhes: { sucessos: sucessos.length, erros: erros.length }
        });
      }

      console.log(`✅ [DEVOLVER ESTOQUE] Todos os ${sucessos.length} itens devolvidos com sucesso!`);
      res.json({
        sucesso: true,
        mensagem: `Estoque devolvido: ${sucessos.length} equipamento(s) atualizados`,
        itens_devolvidos: sucessos
      });
    }
  }
});


// =======================================================
//          ROTAS DE FUNCIONÁRIOS (RH) - IMPORTANTE
// =======================================================

// 1. LISTAR TODOS OS FUNCIONÁRIOS (Completo)
app.get('/funcionarios/completo', (req, res) => {
  // Busca tudo para preencher os cards e a lista
  const sql = "SELECT * FROM funcionarios ORDER BY status ASC, nome ASC";
  db.query(sql, (err, data) => {
    if (err) {
      console.error("Erro ao buscar funcionarios:", err);
      return res.status(500).json(err);
    }
    return res.json(data);
  });
});

// 2. CADASTRAR FUNCIONÁRIO
// ROTA CADASTRAR COM LOGS DETALHADOS (DEBUG)
app.post('/funcionarios', (req, res) => {
  console.log("📥 TENTATIVA DE CADASTRO RECEBIDA:");
  console.log(req.body); // Mostra os dados que chegaram do front

  const d = req.body;

  // SQL atualizado com todos os campos novos
  const sql = `
        INSERT INTO funcionarios (
            nome, cargo, departamento, email, telefone, 
            cpf, data_admissao, data_demissao, endereco, status, observacoes,
            cep, logradouro, numero, bairro, cidade, uf
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  // Trata datas vazias como NULL
  const demissao = (d.data_demissao && d.data_demissao.trim() !== '') ? d.data_demissao : null;
  const admissao = (d.data_admissao && d.data_admissao.trim() !== '') ? d.data_admissao : null;

  const values = [
    d.nome, d.cargo, d.departamento, d.email, d.telefone,
    d.cpf, admissao, demissao, d.endereco,
    d.status || 'Ativo', d.observacoes,
    d.cep, d.logradouro, d.numero, d.bairro, d.cidade, d.uf
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("❌ ERRO NO BANCO DE DADOS:", err.sqlMessage); // Mostra o motivo exato
      return res.status(500).json({ error: "Erro no Banco: " + err.sqlMessage });
    }
    console.log("✅ SUCESSO! ID Criado:", result.insertId);
    res.json({ message: "Funcionário cadastrado!", id: result.insertId });
  });
});


// 3. ATUALIZAR FUNCIONÁRIO (ATUALIZADO)
app.put('/funcionarios/:id', (req, res) => {
  const id = req.params.id;
  const d = req.body;
  const sql = `
        UPDATE funcionarios SET 
            nome=?, cargo=?, departamento=?, email=?, telefone=?, 
            cpf=?, data_admissao=?, data_demissao=?, status=?, observacoes=?,
            cep=?, logradouro=?, numero=?, bairro=?, cidade=?, uf=?
        WHERE id=?
    `;

  // Trata datas vazias como NULL
  const demissao = (d.data_demissao && d.data_demissao.trim() !== '') ? d.data_demissao : null;
  const admissao = (d.data_admissao && d.data_admissao.trim() !== '') ? d.data_admissao : null;

  const values = [
    d.nome, d.cargo, d.departamento, d.email, d.telefone,
    d.cpf, admissao, demissao, d.status, d.observacoes,
    d.cep, d.logradouro, d.numero, d.bairro, d.cidade, d.uf,
    id
  ];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    // Sincroniza email com tabela usuarios_sistema
    if (d.email) {
      db.query('UPDATE usuarios_sistema SET email = ? WHERE funcionario_id = ?', [d.email, id], (errSync) => {
        if (errSync) {
          console.error('Erro ao sincronizar email em usuarios_sistema:', errSync);
        }
      });
    }

    res.json({ message: "Funcionário atualizado!" });
  });
});




// 4. EXCLUIR FUNCIONÁRIO
app.delete('/funcionarios/:id', (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM funcionarios WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Funcionário excluído!" });
  });
});










// 5. UPLOAD DE AVATAR DO FUNCIONÁRIO
// Configuração para salvar avatar como Base64 no banco (persiste no Railway)
const uploadAvatarMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas!'));
    }
  }
});

app.post('/funcionarios/:id/avatar', uploadAvatarMemory.single('avatar'), (req, res) => {
  const funcionarioId = req.params.id;

  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  // Converte o arquivo para Base64
  const base64String = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype;
  const avatarBase64 = `data:${mimeType};base64,${base64String}`;

  // Tenta salvar na coluna avatar_base64, com fallback para avatar
  const sqlPrimario = 'UPDATE funcionarios SET avatar_base64 = ?, avatar = NULL WHERE id = ?';

  db.query(sqlPrimario, [avatarBase64, funcionarioId], (err, result) => {
    if (err) {
      // Se coluna avatar_base64 não existe, salva direto na coluna avatar
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        console.log('⚠️ Coluna avatar_base64 não existe, usando coluna avatar');
        const sqlFallback = 'UPDATE funcionarios SET avatar = ? WHERE id = ?';
        db.query(sqlFallback, [avatarBase64, funcionarioId], (err2, result2) => {
          if (err2) {
            console.error('Erro ao salvar avatar (fallback):', err2);
            return res.status(500).json({ error: err2.message });
          }
          console.log('✅ Avatar salvo (fallback) para funcionário:', funcionarioId);
          res.json({
            success: true,
            avatarUrl: avatarBase64,
            message: 'Avatar atualizado com sucesso!'
          });
        });
        return;
      }
      console.error('Erro ao salvar avatar:', err);
      return res.status(500).json({ error: err.message });
    }

    console.log('✅ Avatar Base64 salvo para funcionário:', funcionarioId);
    res.json({
      success: true,
      avatarUrl: avatarBase64,
      message: 'Avatar atualizado com sucesso!'
    });
  });
});

// Buscar itens de um Job (para cancelar / devolver estoque com segurança)
app.get('/jobs/:jobId/itens', (req, res) => {
  const { jobId } = req.params;

  const sql = `
    SELECT descricao, qtd, valor_unitario AS valor, desconto_item, equipamento_id
    FROM job_itens
    WHERE job_id = ?
  `;

  db.query(sql, [jobId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ sucesso: true, itens: rows || [] });
  });
});


// =======================================================
//          ROTAS DE CALENDÁRIO E EQUIPE
// =======================================================

// 1. BUSCAR TUDO PARA O CALENDÁRIO (MANUAL + JOBS)
// =======================================================
//          ROTA DE CALENDÁRIO (COM CORES DOS PILLS)
// =======================================================
// Busca TUDO (Escalas Manuais + Jobs com Cores IGUAIS aos Pills)

app.get('/agenda', (req, res) => {
  // Busca TODAS as escalas (manuais com ou sem job vinculado)
  // Usa data_inicio/data_fim da ESCALA, não do job
  const sqlEscalas = `
    SELECT 
      CONCAT('escala-', e.id) as id,
      COALESCE(e.data_inicio, e.data_escala) as data_inicio,
      COALESCE(e.data_fim, e.data_escala) as data_fim,
      f.nome as funcionario_nome,
      e.tipo as tipo_escala,
      j.descricao as job_descricao,
      j.numero_pedido as job_numero,
      j.status as job_status,
      j.hora_chegada_prevista as job_hora_chegada,
      j.hora_fim_evento as job_hora_fim,
      e.tipo as description,
      f.id as operador_id,
      f.nome as operador_nome,
      '' as localizacao,
      'escala' as tipo_evento,
      e.job_id
    FROM escalas e
    JOIN funcionarios f ON e.funcionario_id = f.id
    LEFT JOIN jobs j ON e.job_id = j.id
  `;

  // Depois busca jobs: operador principal + equipe adicional
  const sqlJobs = `
    SELECT 
      j.id as job_id,
      j.data_inicio,
      j.data_fim,
      j.hora_chegada_prevista,
      j.hora_fim_evento,
      j.descricao,
      j.status,
      j.logradouro,
      j.numero,
      j.bairro,
      j.cidade,
      j.operador_id as funcionario_id,
      f.nome as funcionario_nome
    FROM jobs j
    LEFT JOIN funcionarios f ON j.operador_id = f.id
    WHERE j.data_inicio IS NOT NULL AND j.operador_id IS NOT NULL
    
    UNION ALL
    
    SELECT 
      j.id as job_id,
      j.data_inicio,
      j.data_fim,
      j.hora_chegada_prevista,
      j.hora_fim_evento,
      j.descricao,
      j.status,
      j.logradouro,
      j.numero,
      j.bairro,
      j.cidade,
      je.funcionario_id,
      f.nome as funcionario_nome
    FROM jobs j
    INNER JOIN job_equipe je ON j.id = je.job_id
    INNER JOIN funcionarios f ON je.funcionario_id = f.id
    WHERE j.data_inicio IS NOT NULL
  `;

  db.query(sqlEscalas, (err, escalasRaw) => {
    if (err) {
      console.error("❌ Erro ao buscar escalas:", err);
      return res.status(500).json({ error: err.message });
    }

    // Função para extrair data YYYY-MM-DD de forma segura (sem problemas de timezone)
    const extrairDataStr = (data) => {
      if (!data) return null;

      // Se já é string no formato YYYY-MM-DD, usa direto
      if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return data;
      }

      // Se é string com T (ISO), extrai só a parte da data
      if (typeof data === 'string' && data.includes('T')) {
        return data.split('T')[0];
      }

      // Se é objeto Date, converte para string local sem timezone
      const d = new Date(data);
      // Adiciona offset para compensar o UTC
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Função para iterar entre duas datas (retorna array de strings YYYY-MM-DD)
    const gerarDiasEntre = (dataInicioStr, dataFimStr) => {
      const dias = [];
      if (!dataInicioStr) return dias;

      const fimStr = dataFimStr || dataInicioStr;

      // Parse das datas como locais (não UTC)
      const [anoI, mesI, diaI] = dataInicioStr.split('-').map(Number);
      const [anoF, mesF, diaF] = fimStr.split('-').map(Number);

      let atual = new Date(anoI, mesI - 1, diaI, 12, 0, 0);
      const fim = new Date(anoF, mesF - 1, diaF, 12, 0, 0);

      while (atual <= fim) {
        const y = atual.getFullYear();
        const m = String(atual.getMonth() + 1).padStart(2, '0');
        const d = String(atual.getDate()).padStart(2, '0');
        dias.push(`${y}-${m}-${d}`);
        atual.setDate(atual.getDate() + 1);
      }

      return dias;
    };

    // Expande escalas para múltiplos dias
    const eventosEscalas = [];
    // Guarda combinação (funcionario_id, job_id) de escalas manuais para evitar duplicação
    const escalasComJob = new Set();

    escalasRaw.forEach(e => {
      const dataInicioStr = extrairDataStr(e.data_inicio);
      const dataFimStr = e.data_fim ? extrairDataStr(e.data_fim) : dataInicioStr;

      if (!dataInicioStr) return;

      const dias = gerarDiasEntre(dataInicioStr, dataFimStr);

      // Monta o título com ícone correto:
      // 📋 = trabalho de um pedido (tem job_id E tipo é "Trabalho")
      // 📅 = escala manual/avulsa ou tipo diferente de Trabalho (Treinamento, Folga, Férias, etc.)
      const isTrabalhoDeJob = e.job_id && e.tipo_escala === 'Trabalho';
      const icone = isTrabalhoDeJob ? '📋' : '📅';
      let titulo = `${icone} ${e.funcionario_nome}`;

      // Marca que esse funcionário tem escala vinculada a este job (para evitar duplicação)
      // Marca TODAS as escalas com job_id para evitar que apareça duplicado do sqlJobs
      if (e.job_id) {
        escalasComJob.add(`${e.operador_id}-${e.job_id}`);
      }

      if (e.job_descricao) {
        titulo += ` - ${e.job_descricao}`;
      }
      titulo += ` - ${e.tipo_escala}`;

      // Define cor: se tem job vinculado, usa cor do status do job; senão, azul padrão
      let cor = '#3b82f6'; // azul padrão para escalas avulsas
      if (e.job_id && e.job_status) {
        if (e.job_status === 'Agendado') cor = '#0284c7';
        else if (e.job_status === 'Em Andamento') cor = '#16a34a';
        else if (e.job_status === 'Confirmado') cor = '#d97706';
        else if (e.job_status === 'Finalizado') cor = '#64748b';
        else if (e.job_status === 'Cancelado') cor = '#dc2626';
      }

      dias.forEach(dataStr => {
        // Se escala tem job vinculado, usa horário do job; senão usa horário padrão
        const horaInicio = e.job_hora_chegada || '08:00:00';
        const horaFim = e.job_hora_fim || horaInicio; // Se não tem fim, usa o mesmo horário de início

        eventosEscalas.push({
          id: `${e.id}-${dataStr}`,
          start: `${dataStr} ${horaInicio}`,
          end: `${dataStr} ${horaFim}`,
          title: titulo,
          description: e.job_status || e.description,
          operador_id: e.operador_id,
          operador_nome: e.operador_nome,
          localizacao: e.localizacao,
          backgroundColor: cor,
          borderColor: cor,
          tipo_evento: e.tipo_evento
        });
      });
    });

    db.query(sqlJobs, (err, jobs) => {
      if (err) {
        console.error("❌ Erro ao buscar jobs:", err);
        return res.status(500).json({ error: err.message });
      }

      // Expande jobs para todos os dias e membros da equipe
      const eventosJobs = [];
      jobs.forEach(job => {
        // Se esse funcionário tem escala manual vinculada a esse job, pula
        // (vai aparecer via escala manual com as datas específicas)
        if (escalasComJob.has(`${job.funcionario_id}-${job.job_id}`)) {
          return;
        }

        // Extrai datas como strings YYYY-MM-DD
        const dataInicioStr = job.data_inicio ? extrairDataStr(job.data_inicio) : null;
        const dataFimStr = job.data_fim ? extrairDataStr(job.data_fim) : dataInicioStr;

        if (!dataInicioStr) return; // Pula se não tem data

        // Gera array de todos os dias entre início e fim
        const dias = gerarDiasEntre(dataInicioStr, dataFimStr);

        // Para cada dia do período
        dias.forEach(dataStr => {
          // ⏰ Usa horário de chegada; se não houver hora de fim, usa a mesma hora de chegada
          const horaChegada = job.hora_chegada_prevista || '08:00:00';
          const horaFim = job.hora_fim_evento || horaChegada; // Se não tem fim, usa chegada (evento pontual)

          let cor = '#475569';
          if (job.status === 'Agendado') cor = '#0284c7';
          else if (job.status === 'Em Andamento') cor = '#16a34a';
          else if (job.status === 'Confirmado') cor = '#d97706';
          else if (job.status === 'Finalizado') cor = '#64748b';
          else if (job.status === 'Cancelado') cor = '#dc2626';

          eventosJobs.push({
            id: `job-${job.job_id}-${job.funcionario_id}-${dataStr}`,
            start: `${dataStr} ${horaChegada}`,
            end: `${dataStr} ${horaFim}`,
            title: `📋 ${job.funcionario_nome} - ${job.descricao}`,
            description: job.status,
            operador_id: job.funcionario_id,
            operador_nome: job.funcionario_nome,
            localizacao: `${job.logradouro || ''}, ${job.numero || ''} - ${job.bairro || ''}, ${job.cidade || ''}`,
            backgroundColor: cor,
            borderColor: cor,
            tipo_evento: 'job',
            // 📅 Datas reais do job (período completo) em formato string
            data_inicio_real: dataInicioStr,
            data_fim_real: dataFimStr
          });
        });
      });

      const todosEventos = [...eventosEscalas, ...eventosJobs];
      console.log(`✅ Agenda retornou ${todosEventos.length} eventos (${eventosEscalas.length} escalas, ${eventosJobs.length} jobs)`);

      res.json(todosEventos);
    });
  });
});

// 3. VINCULAR FUNCIONÁRIO AO JOB (Para aparecer automático depois)
// Você vai usar essa rota quando estiver na tela de Jobs
app.post('/jobs/equipe', (req, res) => {
  const { job_id, funcionario_id, funcao } = req.body;
  const sql = "INSERT INTO job_equipe (job_id, funcionario_id, funcao) VALUES (?, ?, ?)";
  db.query(sql, [job_id, funcionario_id, funcao], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Funcionário adicionado ao Job!" });
  });
});

// 3.1 ADICIONAR FUNCIONÁRIO À EQUIPE DE UM JOB ESPECÍFICO
app.post('/jobs/:id/equipe/adicionar', (req, res) => {
  const jobId = req.params.id;
  const { funcionario_id, funcao } = req.body;

  // Verifica se já existe esse funcionário nesse job
  const sqlCheck = "SELECT id FROM job_equipe WHERE job_id = ? AND funcionario_id = ?";
  db.query(sqlCheck, [jobId, funcionario_id], (errCheck, results) => {
    if (errCheck) {
      console.error("Erro ao verificar equipe:", errCheck);
      return res.status(500).json({ error: errCheck.message });
    }

    // Se já existe, não adiciona novamente
    if (results.length > 0) {
      console.log(`📋 Funcionário ${funcionario_id} já está na equipe do job ${jobId}`);
      return res.json({ message: "Funcionário já está na equipe", alreadyExists: true });
    }

    // Se não existe, adiciona
    const sqlInsert = "INSERT INTO job_equipe (job_id, funcionario_id, funcao) VALUES (?, ?, ?)";
    db.query(sqlInsert, [jobId, funcionario_id, funcao || 'Técnico'], (errInsert) => {
      if (errInsert) {
        console.error("Erro ao adicionar à equipe:", errInsert);
        return res.status(500).json({ error: errInsert.message });
      }
      console.log(`✅ Funcionário ${funcionario_id} adicionado à equipe do job ${jobId}`);
      res.json({ message: "Funcionário adicionado à equipe com sucesso!" });
    });
  });
});


app.get('/jobs/:id/equipe', (req, res) => {
  const sql = `
        SELECT je.*, f.nome, f.cargo 
        FROM job_equipe je
        JOIN funcionarios f ON je.funcionario_id = f.id
        WHERE je.job_id = ?
    `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});


// ROTA PARA CRIAR ESCALA MANUAL
app.post('/escalas', (req, res) => {
  const data = req.body;
  console.log("📥 Recebendo tentativa de escala:", data);

  // Mapeamento dos dados
  // Aceita tanto 'data' (único dia) quanto 'data_inicio'/'data_fim' (período)
  const dataInicio = data.data_inicio || data.data;
  const dataFim = data.data_fim || data.data;
  const jobId = data.job_id || null;

  // Se tem job_id, busca o nome do job para a observação
  if (jobId) {
    const sqlJob = "SELECT titulo FROM jobs WHERE id = ?";
    db.query(sqlJob, [jobId], (err, jobResult) => {
      if (err) {
        console.error("❌ Erro ao buscar job:", err);
        return res.status(500).json({ error: err.message });
      }

      const nomeJob = jobResult[0]?.titulo || 'Evento';
      const observacaoAuto = `Job #${jobId} - ${nomeJob}`;

      const sql = `
        INSERT INTO escalas (funcionario_id, data_escala, data_inicio, data_fim, tipo, observacao, job_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        data.funcionario_id,
        dataInicio,
        dataInicio,
        dataFim,
        data.tipo,
        observacaoAuto,  // Observação automática com nome do job
        jobId
      ];

      db.query(sql, values, (err, result) => {
        if (err) {
          console.error("❌ Erro ao salvar escala:", err);
          return res.status(500).json({ error: err.message });
        }
        console.log("✅ Escala salva com ID:", result.insertId, "- Obs:", observacaoAuto);
        res.json({ message: "Escala salva com sucesso!", id: result.insertId });
      });
    });
  } else {
    // Escala avulsa (sem job vinculado)
    const sql = `
      INSERT INTO escalas (funcionario_id, data_escala, data_inicio, data_fim, tipo, observacao, job_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.funcionario_id,
      dataInicio,
      dataInicio,
      dataFim,
      data.tipo,
      data.obs || null,  // Usa a obs do formulário
      null
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("❌ Erro ao salvar escala:", err);
        return res.status(500).json({ error: err.message });
      }
      console.log("✅ Escala avulsa salva com ID:", result.insertId);
      res.json({ message: "Escala salva com sucesso!", id: result.insertId });
    });
  }
});

// ROTA PARA LER AS ESCALAS (Para aparecer no calendário depois)
app.get('/escalas', (req, res) => {
  const sql = `
        SELECT e.*, f.nome as nome_funcionario 
        FROM escalas e
        JOIN funcionarios f ON e.funcionario_id = f.id
    `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


// ROTA PARA DELETAR ESCALA INDIVIDUAL
app.delete('/escalas/:id', (req, res) => {
  const escalaId = req.params.id;
  console.log(`🗑️ Deletando escala ID: ${escalaId}`);

  const sql = "DELETE FROM escalas WHERE id = ?";
  db.query(sql, [escalaId], (err, result) => {
    if (err) {
      console.error("❌ Erro ao deletar escala:", err);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Escala ${escalaId} deletada com sucesso`);
    res.json({ message: "Escala deletada com sucesso!", deleted: result.affectedRows });
  });
});


// ROTA: BUSCAR HISTÓRICO DE JOBS DE UM FUNCIONÁRIO
// ROTA: BUSCAR HISTÓRICO (UNINDO EQUIPE + OPERADOR PRINCIPAL + ESCALAS MANUAIS)
app.get('/funcionarios/:id/historico', (req, res) => {
  const id = req.params.id;
  console.log(`🔎 Buscando histórico completo para Func ID: ${id}`);

  const sql = `
        /* 1. Busca se ele está na lista de EQUIPE (Tabela Nova) - EXCETO jobs com escala manual */
        SELECT j.id, j.descricao, j.data_inicio, j.data_fim, j.status, je.funcao, 'job' as tipo_registro, NULL as job_id
        FROM jobs j
        JOIN job_equipe je ON j.id = je.job_id
        WHERE je.funcionario_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM escalas e 
          WHERE e.funcionario_id = je.funcionario_id 
          AND e.job_id = j.id
        )

        UNION ALL

        /* 2. Busca se ele é o OPERADOR PRINCIPAL (Tabela Antiga/Dropdown) */
        SELECT j.id, j.descricao, j.data_inicio, j.data_fim, j.status, 'Operador Principal' as funcao, 'job' as tipo_registro, NULL as job_id
        FROM jobs j
        WHERE j.operador_id = ?

        UNION ALL

        /* 3. Busca ESCALAS MANUAIS do funcionário */
        SELECT 
          COALESCE(e.job_id, e.id) as id,
          CASE 
            WHEN j.descricao IS NOT NULL THEN CONCAT(j.descricao, ' - ', e.tipo)
            ELSE CONCAT('Escala ', e.tipo)
          END as descricao,
          COALESCE(e.data_inicio, e.data_escala) as data_inicio, 
          COALESCE(e.data_fim, e.data_escala) as data_fim, 
          COALESCE(j.status, 'Escala') as status, 
          e.tipo as funcao,
          'escala' as tipo_registro,
          e.job_id as job_id
        FROM escalas e
        LEFT JOIN jobs j ON e.job_id = j.id
        WHERE e.funcionario_id = ?

        ORDER BY data_inicio DESC
    `;

  // Passamos o ID três vezes (uma para cada ?)
  db.query(sql, [id, id, id], (err, results) => {
    if (err) {
      console.error("❌ Erro SQL Histórico:", err);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Encontrados ${results.length} registros no total.`);
    res.json(results);
  });
});


// =======================================================
//          SISTEMA DE CONTROLE DE ACESSO
// =======================================================

// Função para hash de senha (usando crypto nativo)
function hashSenha(senha) {
  return crypto.createHash('sha256').update(senha + 'erp_salt_2026').digest('hex');
}

// Função para gerar senha temporária
function gerarSenhaTemporaria() {
  return crypto.randomBytes(4).toString('hex'); // 8 caracteres
}

// Função para gerar token de sessão
function gerarToken() {
  return crypto.randomBytes(32).toString('hex');
}

// =======================================================
//          ROTAS DA EMPRESA
// =======================================================

// BUSCAR DADOS DA EMPRESA
app.get('/empresa', (req, res) => {
  const sql = "SELECT * FROM empresa ORDER BY id DESC LIMIT 1";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar empresa:", err);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.json(null);
    }
    res.json(results[0]);
  });
});

// SALVAR/ATUALIZAR DADOS DA EMPRESA
app.post('/empresa', (req, res) => {
  const data = req.body;
  console.log("📝 Salvando dados da empresa:", data);

  // Primeiro verifica se já existe um registro
  db.query("SELECT id FROM empresa LIMIT 1", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length > 0) {
      // Atualiza o registro existente
      const sql = `
        UPDATE empresa SET
          razao_social = ?,
          nome_fantasia = ?,
          cnpj = ?,
          ie = ?,
          im = ?,
          email = ?,
          telefone = ?,
          website = ?,
          linkedin = ?,
          cep = ?,
          logradouro = ?,
          numero = ?,
          complemento = ?,
          bairro = ?,
          cidade = ?,
          estado = ?,
          logo = COALESCE(?, logo)
        WHERE id = ?
      `;
      const values = [
        data.razao_social, data.nome_fantasia, data.cnpj, data.ie, data.im,
        data.email, data.telefone, data.website, data.linkedin,
        data.cep, data.logradouro, data.numero, data.complemento,
        data.bairro, data.cidade, data.estado, data.logo || null,
        results[0].id
      ];

      db.query(sql, values, (err2, result) => {
        if (err2) {
          console.error("Erro ao atualizar empresa:", err2);
          return res.status(500).json({ error: err2.message });
        }
        console.log("✅ Empresa atualizada!");
        res.json({ success: true, message: "Empresa atualizada com sucesso!" });
      });
    } else {
      // Insere novo registro
      const sql = `
        INSERT INTO empresa (
          razao_social, nome_fantasia, cnpj, ie, im,
          email, telefone, website, linkedin,
          cep, logradouro, numero, complemento, bairro, cidade, estado, logo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        data.razao_social, data.nome_fantasia, data.cnpj, data.ie, data.im,
        data.email, data.telefone, data.website, data.linkedin,
        data.cep, data.logradouro, data.numero, data.complemento,
        data.bairro, data.cidade, data.estado, data.logo || null
      ];

      db.query(sql, values, (err2, result) => {
        if (err2) {
          console.error("Erro ao inserir empresa:", err2);
          return res.status(500).json({ error: err2.message });
        }
        console.log("✅ Empresa cadastrada com ID:", result.insertId);
        res.json({ success: true, message: "Empresa cadastrada com sucesso!", id: result.insertId });
      });
    }
  });
});

// UPLOAD DO LOGO DA EMPRESA
app.post('/empresa/logo', (req, res) => {
  const { logo } = req.body; // Base64 da imagem

  if (!logo) {
    return res.status(400).json({ error: "Logo não informado" });
  }

  // Verifica se existe um registro de empresa
  db.query("SELECT id FROM empresa LIMIT 1", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length > 0) {
      // Atualiza o logo
      db.query("UPDATE empresa SET logo = ? WHERE id = ?", [logo, results[0].id], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        console.log("✅ Logo da empresa atualizado!");
        res.json({ success: true, message: "Logo atualizado!" });
      });
    } else {
      // Cria registro só com logo
      db.query("INSERT INTO empresa (logo) VALUES (?)", [logo], (err2, result) => {
        if (err2) return res.status(500).json({ error: err2.message });
        console.log("✅ Logo da empresa cadastrado!");
        res.json({ success: true, message: "Logo cadastrado!", id: result.insertId });
      });
    }
  });
});

// REMOVER LOGO DA EMPRESA
app.delete('/empresa/logo', (req, res) => {
  db.query("UPDATE empresa SET logo = NULL WHERE id = (SELECT id FROM (SELECT id FROM empresa LIMIT 1) as t)", (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: "Logo removido!" });
  });
});

// =======================================================
//          ROTAS DE CONFIGURAÇÕES DO SISTEMA
// =======================================================

// BUSCAR TODAS AS CONFIGURAÇÕES
app.get('/configuracoes', (req, res) => {
  const sql = "SELECT * FROM configuracoes_sistema";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar configurações:", err);
      return res.status(500).json({ error: err.message });
    }
    // Converte para objeto chave-valor
    const config = {};
    results.forEach(row => {
      config[row.chave] = row.valor;
    });
    res.json(config);
  });
});

// GERAR PRÓXIMO NÚMERO DO PEDIDO (DEVE VIR ANTES DA ROTA GENÉRICA)
app.get('/configuracoes/proximo-numero-pedido', (req, res) => {
  const sql = "SELECT chave, valor FROM configuracoes_sistema WHERE chave IN ('pedido_prefixo', 'pedido_numero_atual', 'pedido_incremento')";

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const config = {};
    results.forEach(r => {
      config[r.chave] = r.valor;
    });

    const prefixo = config.pedido_prefixo || 'PED';
    const numero = parseInt(config.pedido_numero_atual) || 1000;
    const incremento = parseInt(config.pedido_incremento) || 1;

    const numeroPedido = `${prefixo}-${numero}`;

    res.json({
      numero_pedido: numeroPedido,
      prefixo,
      numero_atual: numero,
      incremento,
      proximo: numero + incremento
    });
  });
});

// BUSCAR CONFIGURAÇÃO ESPECÍFICA
app.get('/configuracoes/:chave', (req, res) => {
  const { chave } = req.params;
  const sql = "SELECT valor FROM configuracoes_sistema WHERE chave = ?";
  db.query(sql, [chave], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Configuração não encontrada' });
    res.json({ chave, valor: results[0].valor });
  });
});

// ATUALIZAR CONFIGURAÇÃO
app.put('/configuracoes/:chave', (req, res) => {
  const { chave } = req.params;
  const { valor } = req.body;

  const sql = `
    INSERT INTO configuracoes_sistema (chave, valor) 
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE valor = ?, updated_at = CURRENT_TIMESTAMP
  `;

  db.query(sql, [chave, valor, valor], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Configuração atualizada!' });
  });
});

// SALVAR CONFIGURAÇÃO DO NÚMERO DO PEDIDO
app.post('/configuracoes/numero-pedido', (req, res) => {
  const { prefixo, numero_inicial, incremento } = req.body;

  console.log('📝 Salvando configuração de número de pedido:', { prefixo, numero_inicial, incremento });

  // Primeiro, garantir que a tabela existe com a estrutura correta
  const sqlCriarTabela = `
    CREATE TABLE IF NOT EXISTS configuracoes_sistema (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chave VARCHAR(100) NOT NULL,
      valor TEXT,
      descricao VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_chave (chave)
    )
  `;

  db.query(sqlCriarTabela, (errTabela) => {
    if (errTabela) console.warn('Aviso ao verificar tabela:', errTabela.message);

    // Agora salvar as configurações usando REPLACE que funciona melhor
    const sqlSalvar = `
      REPLACE INTO configuracoes_sistema (chave, valor, descricao) VALUES 
      ('pedido_prefixo', ?, 'Prefixo do número do pedido'),
      ('pedido_numero_atual', ?, 'Número atual do pedido'),
      ('pedido_incremento', ?, 'Incremento do pedido')
    `;

    const valores = [
      prefixo || 'PED',
      String(numero_inicial || 1000),
      String(incremento || 1)
    ];

    db.query(sqlSalvar, valores, (err, result) => {
      if (err) {
        console.error('❌ Erro ao salvar configurações:', err);
        return res.status(500).json({ error: err.message });
      }

      console.log('✅ Configurações salvas com sucesso!', result);
      res.json({ success: true, message: 'Configuração do número de pedido salva!' });
    });
  });
});

// =======================================================
//          ROTAS DE PERMISSÕES DE FUNCIONÁRIOS
// =======================================================

// BUSCAR TODAS AS PERMISSÕES (Para lista de controle de acesso)
app.get('/permissoes', (req, res) => {
  const sql = `
    SELECT f.id, f.nome, f.cargo, f.status, f.email, f.avatar,
           COALESCE(p.acesso_sistema, 0) as acesso_sistema,
           COALESCE(p.acesso_dashboard, 1) as acesso_dashboard,
           COALESCE(p.acesso_clientes, 1) as acesso_clientes,
           COALESCE(p.acesso_funcionarios, 0) as acesso_funcionarios,
           COALESCE(p.acesso_contratos, 1) as acesso_contratos,
           COALESCE(p.acesso_estoque, 0) as acesso_estoque,
           COALESCE(p.acesso_financeiro, 0) as acesso_financeiro,
           COALESCE(p.acesso_configuracoes, 0) as acesso_configuracoes,
           COALESCE(p.is_master, 0) as is_master,
           u.email as login_email,
           u.ativo as usuario_ativo
    FROM funcionarios f
    LEFT JOIN permissoes_funcionarios p ON f.id = p.funcionario_id
    LEFT JOIN usuarios_sistema u ON f.id = u.funcionario_id
    ORDER BY f.nome
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar permissões:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// BUSCAR PERMISSÕES DE UM FUNCIONÁRIO
app.get('/permissoes/:funcionarioId', (req, res) => {
  const { funcionarioId } = req.params;

  const sql = `
    SELECT f.id, f.nome, f.cargo, f.email, f.avatar,
           COALESCE(f.is_master, 0) as is_master,
           COALESCE(p.acesso_sistema, 0) as acesso_sistema,
           COALESCE(p.acesso_dashboard, 1) as acesso_dashboard,
           COALESCE(p.acesso_clientes, 1) as acesso_clientes,
           COALESCE(p.acesso_funcionarios, 0) as acesso_funcionarios,
           COALESCE(p.acesso_contratos, 1) as acesso_contratos,
           COALESCE(p.acesso_estoque, 0) as acesso_estoque,
           COALESCE(p.acesso_financeiro, 0) as acesso_financeiro,
           COALESCE(p.acesso_configuracoes, 0) as acesso_configuracoes,
           u.email as login_email
    FROM funcionarios f
    LEFT JOIN permissoes_funcionarios p ON f.id = p.funcionario_id
    LEFT JOIN usuarios_sistema u ON f.id = u.funcionario_id
    WHERE f.id = ?
  `;

  db.query(sql, [funcionarioId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Funcionário não encontrado' });
    res.json(results[0]);
  });
});

// SALVAR PERMISSÕES E CREDENCIAIS DE UM FUNCIONÁRIO
app.post('/permissoes/:funcionarioId', (req, res) => {
  const { funcionarioId } = req.params;
  const {
    acesso_sistema,
    acesso_dashboard,
    acesso_clientes,
    acesso_funcionarios,
    acesso_contratos,
    acesso_estoque,
    acesso_financeiro,
    acesso_configuracoes,
    is_master,
    email,
    senha
  } = req.body;

  console.log(`📝 Salvando permissões para funcionário ${funcionarioId}:`, req.body);

  // 1. Inserir/Atualizar permissões
  const sqlPermissoes = `
    INSERT INTO permissoes_funcionarios 
    (funcionario_id, acesso_sistema, acesso_dashboard, acesso_clientes, acesso_funcionarios, 
     acesso_contratos, acesso_estoque, acesso_financeiro, acesso_configuracoes, is_master)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      acesso_sistema = VALUES(acesso_sistema),
      acesso_dashboard = VALUES(acesso_dashboard),
      acesso_clientes = VALUES(acesso_clientes),
      acesso_funcionarios = VALUES(acesso_funcionarios),
      acesso_contratos = VALUES(acesso_contratos),
      acesso_estoque = VALUES(acesso_estoque),
      acesso_financeiro = VALUES(acesso_financeiro),
      acesso_configuracoes = VALUES(acesso_configuracoes),
      is_master = VALUES(is_master),
      updated_at = CURRENT_TIMESTAMP
  `;

  const valoresPermissoes = [
    funcionarioId,
    acesso_sistema ? 1 : 0,
    acesso_dashboard ? 1 : 0,
    acesso_clientes ? 1 : 0,
    acesso_funcionarios ? 1 : 0,
    acesso_contratos ? 1 : 0,
    acesso_estoque ? 1 : 0,
    acesso_financeiro ? 1 : 0,
    acesso_configuracoes ? 1 : 0,
    is_master ? 1 : 0
  ];

  db.query(sqlPermissoes, valoresPermissoes, (err) => {
    if (err) {
      console.error("Erro ao salvar permissões:", err);
      return res.status(500).json({ error: err.message });
    }

    // 2.1 Atualiza is_master na tabela funcionarios (sistema novo de login)
    db.query('UPDATE funcionarios SET is_master = ? WHERE id = ?', [is_master ? 1 : 0, funcionarioId], (errMaster) => {
      if (errMaster) {
        console.error("Erro ao atualizar is_master em funcionarios:", errMaster);
      } else {
        console.log(`✅ is_master atualizado na tabela funcionarios (${funcionarioId}): ${is_master ? 1 : 0}`);
      }
    });

    // 2. Se tem acesso ao sistema e email foi fornecido, criar/atualizar usuário
    if (acesso_sistema && email) {
      let sqlUsuario;
      let valoresUsuario;

      if (senha && senha.trim() !== '') {
        // Com nova senha - usar bcrypt para compatibilidade com novo sistema de login
        const senhaHashBcrypt = bcrypt.hashSync(senha, 10);
        const senhaHashLegacy = hashSenha(senha);

        // Atualiza senha no novo sistema (tabela funcionarios)
        db.query('UPDATE funcionarios SET senha_hash = ? WHERE id = ?', [senhaHashBcrypt, funcionarioId], (errSenha) => {
          if (errSenha) {
            console.error("Erro ao atualizar senha em funcionarios:", errSenha);
          } else {
            console.log(`✅ Senha atualizada em funcionarios (${funcionarioId}) com bcrypt`);
          }
        });

        sqlUsuario = `
          INSERT INTO usuarios_sistema (funcionario_id, email, senha_hash, ativo)
          VALUES (?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE
            email = VALUES(email),
            senha_hash = VALUES(senha_hash),
            ativo = 1,
            updated_at = CURRENT_TIMESTAMP
        `;
        valoresUsuario = [funcionarioId, email, senhaHashLegacy];
      } else {
        // Sem alteração de senha
        sqlUsuario = `
          INSERT INTO usuarios_sistema (funcionario_id, email, senha_hash, ativo)
          VALUES (?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE
            email = VALUES(email),
            ativo = 1,
            updated_at = CURRENT_TIMESTAMP
        `;
        // Senha temporária se for novo usuário
        const senhaTmp = hashSenha(gerarSenhaTemporaria());
        valoresUsuario = [funcionarioId, email, senhaTmp];
      }

      db.query(sqlUsuario, valoresUsuario, (err2) => {
        if (err2) {
          console.error("Erro ao salvar usuário:", err2);
          return res.status(500).json({ error: 'Permissões salvas, mas erro ao criar usuário: ' + err2.message });
        }

        console.log('✅ Permissões e usuário salvos com sucesso!');
        res.json({ success: true, message: 'Permissões e credenciais salvas!' });
      });
    } else if (!acesso_sistema) {
      // Se removeu acesso, desativar usuário
      db.query("UPDATE usuarios_sistema SET ativo = 0 WHERE funcionario_id = ?", [funcionarioId], () => {
        res.json({ success: true, message: 'Permissões salvas! Acesso ao sistema desativado.' });
      });
    } else {
      res.json({ success: true, message: 'Permissões salvas!' });
    }
  });
});

// RESETAR SENHA DO FUNCIONÁRIO
app.post('/usuarios/:funcionarioId/resetar-senha', (req, res) => {
  const { funcionarioId } = req.params;
  const novaSenha = gerarSenhaTemporaria();
  const senhaHash = hashSenha(novaSenha);

  const sql = "UPDATE usuarios_sistema SET senha_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE funcionario_id = ?";

  db.query(sql, [senhaHash, funcionarioId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Em produção, enviar por email. Aqui retornamos para exibir
    res.json({
      success: true,
      message: 'Senha resetada com sucesso!',
      senha_temporaria: novaSenha // Em produção, NÃO retornar isso - enviar por email
    });
  });
});

// =======================================================
//          ROTAS DE AUTENTICAÇÃO
// =======================================================

// LOGIN
app.post('/auth/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const senhaHash = hashSenha(senha);

  const sql = `
    SELECT u.*, f.nome, f.cargo, f.avatar,
           p.acesso_dashboard, p.acesso_clientes, p.acesso_funcionarios,
           p.acesso_contratos, p.acesso_estoque, p.acesso_financeiro,
           p.acesso_configuracoes, p.is_master
    FROM usuarios_sistema u
    INNER JOIN funcionarios f ON u.funcionario_id = f.id
    LEFT JOIN permissoes_funcionarios p ON u.funcionario_id = p.funcionario_id
    WHERE u.email = ? AND u.senha_hash = ? AND u.ativo = 1
  `;

  db.query(sql, [email, senhaHash], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const usuario = results[0];
    const token = gerarToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Criar sessão
    const sqlSessao = `
      INSERT INTO sessoes_usuarios (usuario_id, token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sqlSessao, [
      usuario.id,
      token,
      req.ip || 'unknown',
      req.headers['user-agent'] || 'unknown',
      expiresAt
    ], (err2) => {
      if (err2) {
        console.error("Erro ao criar sessão:", err2);
        return res.status(500).json({ error: 'Erro ao criar sessão' });
      }

      // Atualiza último login
      db.query("UPDATE usuarios_sistema SET ultimo_login = CURRENT_TIMESTAMP WHERE id = ?", [usuario.id]);

      res.json({
        success: true,
        token,
        usuario: {
          id: usuario.id,
          funcionario_id: usuario.funcionario_id,
          nome: usuario.nome,
          cargo: usuario.cargo,
          email: usuario.email,
          avatar: usuario.avatar,
          permissoes: {
            dashboard: usuario.acesso_dashboard,
            clientes: usuario.acesso_clientes,
            funcionarios: usuario.acesso_funcionarios,
            contratos: usuario.acesso_contratos,
            estoque: usuario.acesso_estoque,
            financeiro: usuario.acesso_financeiro,
            configuracoes: usuario.acesso_configuracoes,
            is_master: usuario.is_master
          }
        }
      });
    });
  });
});

// LOGOUT
app.post('/auth/logout', (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.cookies?.auth_token;

  // Limpa o cookie de autenticação
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });

  if (!token) {
    return res.json({ success: true });
  }

  db.query("DELETE FROM sessoes_usuarios WHERE token = ?", [token], () => {
    res.json({ success: true, message: 'Logout realizado!' });
  });
});

// LOGOUT via GET (para redirect simples)
app.get('/auth/logout', (req, res) => {
  const token = req.cookies?.auth_token;

  // Limpa o cookie de autenticação
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });

  if (token) {
    db.query("DELETE FROM sessoes_usuarios WHERE token = ?", [token], () => { });
  }

  res.redirect('/login');
});

// VERIFICAR SESSÃO
app.get('/auth/verificar', (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const sql = `
    SELECT s.*, u.email, u.funcionario_id, f.nome, f.cargo, f.avatar,
           p.acesso_dashboard, p.acesso_clientes, p.acesso_funcionarios,
           p.acesso_contratos, p.acesso_estoque, p.acesso_financeiro,
           p.acesso_configuracoes, p.is_master
    FROM sessoes_usuarios s
    INNER JOIN usuarios_sistema u ON s.usuario_id = u.id
    INNER JOIN funcionarios f ON u.funcionario_id = f.id
    LEFT JOIN permissoes_funcionarios p ON u.funcionario_id = p.funcionario_id
    WHERE s.token = ? AND s.expires_at > NOW() AND u.ativo = 1
  `;

  db.query(sql, [token], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada' });
    }

    const sessao = results[0];

    // Garante que o avatar sempre tenha caminho completo
    let avatarCompleto = sessao.avatar;
    if (avatarCompleto && !avatarCompleto.startsWith('/')) {
      avatarCompleto = `/uploads/avatars/${avatarCompleto}`;
    }

    res.json({
      valido: true,
      usuario: {
        id: sessao.usuario_id,
        funcionario_id: sessao.funcionario_id,
        nome: sessao.nome,
        cargo: sessao.cargo,
        email: sessao.email,
        avatar: avatarCompleto,
        permissoes: {
          dashboard: sessao.acesso_dashboard,
          clientes: sessao.acesso_clientes,
          funcionarios: sessao.acesso_funcionarios,
          contratos: sessao.acesso_contratos,
          estoque: sessao.acesso_estoque,
          financeiro: sessao.acesso_financeiro,
          configuracoes: sessao.acesso_configuracoes,
          is_master: sessao.is_master
        }
      }
    });
  });
});

// =======================================================
//          MIDDLEWARE DE VERIFICAÇÃO DE PERMISSÃO
// =======================================================

// Função middleware para verificar permissão (uso futuro)
function verificarPermissao(permissaoNecessaria) {
  return (req, res, next) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Acesso não autorizado' });
    }

    const sql = `
      SELECT p.*, u.ativo
      FROM sessoes_usuarios s
      INNER JOIN usuarios_sistema u ON s.usuario_id = u.id
      LEFT JOIN permissoes_funcionarios p ON u.funcionario_id = p.funcionario_id
      WHERE s.token = ? AND s.expires_at > NOW() AND u.ativo = 1
    `;

    db.query(sql, [token], (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).json({ error: 'Sessão inválida' });
      }

      const permissoes = results[0];

      // Master ignora verificações
      if (permissoes.is_master) {
        return next();
      }

      // Verifica permissão específica
      const campoPermissao = `acesso_${permissaoNecessaria}`;
      if (!permissoes[campoPermissao]) {
        return res.status(403).json({ error: 'Você não tem permissão para acessar esta área.' });
      }

      next();
    });
  };
}

// Exportar para uso em outras partes se necessário
module.exports = { verificarPermissao };

// =======================================================
//          ROTA DE MIGRAÇÃO DE EMERGÊNCIA
// =======================================================
app.get('/migrar-numero-pedido', (req, res) => {
  console.log('🚨 EXECUTANDO MIGRAÇÃO DE EMERGÊNCIA: numero_pedido');

  const sqlAdicionarNumeroPedido = `
    ALTER TABLE jobs 
    ADD COLUMN numero_pedido VARCHAR(50)
  `;

  db.query(sqlAdicionarNumeroPedido, (err) => {
    if (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ Coluna numero_pedido já existe na tabela jobs.');
        return res.json({
          success: true,
          message: 'Coluna numero_pedido já existe na tabela jobs. ✅',
          status: 'JÁ EXISTIA'
        });
      } else {
        console.error('❌ Erro ao adicionar coluna numero_pedido:', err);
        return res.status(500).json({
          success: false,
          error: err.message,
          message: 'Erro ao criar a coluna. Veja os detalhes no console.'
        });
      }
    } else {
      console.log('✅ Coluna numero_pedido criada com sucesso na tabela jobs!');
      return res.json({
        success: true,
        message: 'Coluna numero_pedido criada com sucesso! 🎉',
        status: 'CRIADA AGORA'
      });
    }
  });
});
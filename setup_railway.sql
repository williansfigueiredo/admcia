-- ===========================================
-- SCRIPT COMPLETO DO BANCO DE DADOS
-- Sistema de Gestão - Cia do TP
-- Rodar este script no Railway MySQL
-- ===========================================

-- 1. TABELA: clientes
CREATE TABLE IF NOT EXISTS clientes (
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
);

-- 2. TABELA: contatos_clientes
CREATE TABLE IF NOT EXISTS contatos_clientes (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT(11),
  nome VARCHAR(255),
  cargo VARCHAR(255),
  email VARCHAR(255),
  telefone VARCHAR(50)
);

-- 3. TABELA: funcionarios
CREATE TABLE IF NOT EXISTS funcionarios (
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
);

-- 4. TABELA: equipamentos
CREATE TABLE IF NOT EXISTS equipamentos (
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
);

-- 5. TABELA: jobs
CREATE TABLE IF NOT EXISTS jobs (
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
);

-- 6. TABELA: job_itens
CREATE TABLE IF NOT EXISTS job_itens (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  job_id INT(11),
  descricao VARCHAR(255),
  qtd INT(11),
  valor_unitario DECIMAL(10,2),
  desconto_item DECIMAL(10,2),
  equipamento_id INT(11)
);

-- 7. TABELA: job_equipe
CREATE TABLE IF NOT EXISTS job_equipe (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  job_id INT(11),
  funcionario_id INT(11),
  funcao VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 8. TABELA: escalas
CREATE TABLE IF NOT EXISTS escalas (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  funcionario_id INT(11),
  job_id INT(11),
  data_escala DATE,
  data_inicio DATE,
  data_fim DATE,
  tipo VARCHAR(50),
  observacao TEXT
);

-- 9. TABELA: veiculos
CREATE TABLE IF NOT EXISTS veiculos (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  modelo VARCHAR(100),
  placa VARCHAR(20),
  status VARCHAR(20) DEFAULT 'Disponível'
);

-- 10. TABELA: estoque
CREATE TABLE IF NOT EXISTS estoque (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  item VARCHAR(100),
  categoria VARCHAR(50),
  qtd_total INT(11) DEFAULT 0,
  qtd_disponivel INT(11) DEFAULT 0,
  valor_diaria DECIMAL(10,2)
);

-- 11. TABELA: empresa
CREATE TABLE IF NOT EXISTS empresa (
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
);

-- 12. TABELA: configuracoes_sistema
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  chave VARCHAR(100),
  valor TEXT,
  descricao VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 13. TABELA: permissoes_funcionarios
CREATE TABLE IF NOT EXISTS permissoes_funcionarios (
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
);

-- 14. TABELA: usuarios_sistema
CREATE TABLE IF NOT EXISTS usuarios_sistema (
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
);

-- 15. TABELA: sessoes_usuarios
CREATE TABLE IF NOT EXISTS sessoes_usuarios (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT(11),
  token VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. TABELA: log_atividades
CREATE TABLE IF NOT EXISTS log_atividades (
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
);

-- ===========================================
-- CRIAR USUÁRIO MASTER INICIAL
-- ===========================================

-- Inserir funcionário master
INSERT INTO funcionarios (
  nome, cargo, departamento, email, telefone, cpf, status, 
  senha_hash, is_master, acesso_ativo
) VALUES (
  'Administrador Master',
  'Administrador',
  'TI',
  'admin@ciadotp.com.br',
  '(11) 99999-9999',
  '000.000.000-00',
  'Ativo',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  1,
  1
);

-- Pegar ID e criar permissões
SET @master_id = LAST_INSERT_ID();

INSERT INTO permissoes_funcionarios (
  funcionario_id, acesso_sistema, acesso_dashboard, acesso_clientes,
  acesso_funcionarios, acesso_contratos, acesso_estoque,
  acesso_financeiro, acesso_configuracoes, is_master
) VALUES (
  @master_id, 1, 1, 1, 1, 1, 1, 1, 1, 1
);

INSERT INTO usuarios_sistema (
  funcionario_id, email, senha_hash, ativo
) VALUES (
  @master_id,
  'admin@ciadotp.com.br',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  1
);

-- ===========================================
-- CREDENCIAIS DE ACESSO:
-- Email: admin@ciadotp.com.br
-- Senha: password
-- 
-- ALTERE A SENHA APÓS O PRIMEIRO LOGIN!
-- ===========================================

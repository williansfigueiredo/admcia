-- ============================================
-- MIGRAÇÃO COMPLETA PARA RAILWAY DEPLOY
-- Data: 2026-02-14
-- Versão: 2.0.0
-- ============================================
-- 
-- Execute este script no banco MySQL do Railway
-- Inclui todas as alterações de:
-- - Sistema de login com funcionários
-- - Controle de acesso Master/Admin
-- - Sistema de permissões
-- - Avatares e configurações
--
-- ============================================

-- ========================================
-- 1. ALTERAÇÕES NA TABELA FUNCIONARIOS
-- ========================================

-- Coluna para armazenar senha criptografada (bcrypt)
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS senha_hash VARCHAR(255) NULL;

-- Coluna para último login
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP NULL;

-- Coluna para avatar (foto do perfil)
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS avatar VARCHAR(255) NULL;

-- Coluna para indicar se é administrador/master
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS is_master TINYINT(1) NOT NULL DEFAULT 0;

-- Coluna para controle de acesso ao sistema
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS acesso_ativo TINYINT(1) NOT NULL DEFAULT 1;

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_funcionarios_email ON funcionarios(email);
CREATE INDEX IF NOT EXISTS idx_funcionarios_is_master ON funcionarios(is_master);
CREATE INDEX IF NOT EXISTS idx_funcionarios_acesso_ativo ON funcionarios(acesso_ativo);


-- ========================================
-- 2. TABELA DE USUÁRIOS DO SISTEMA
-- ========================================

CREATE TABLE IF NOT EXISTS usuarios_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcionario_id INT NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMP NULL,
    token_reset VARCHAR(255) NULL,
    token_expira TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
);


-- ========================================
-- 3. TABELA DE PERMISSÕES
-- ========================================

CREATE TABLE IF NOT EXISTS permissoes_funcionarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcionario_id INT NOT NULL UNIQUE,
    acesso_sistema BOOLEAN DEFAULT FALSE,
    acesso_dashboard BOOLEAN DEFAULT TRUE,
    acesso_clientes BOOLEAN DEFAULT TRUE,
    acesso_funcionarios BOOLEAN DEFAULT FALSE,
    acesso_contratos BOOLEAN DEFAULT TRUE,
    acesso_estoque BOOLEAN DEFAULT FALSE,
    acesso_financeiro BOOLEAN DEFAULT FALSE,
    acesso_configuracoes BOOLEAN DEFAULT FALSE,
    is_master BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
);


-- ========================================
-- 4. TABELA DE SESSÕES
-- ========================================

CREATE TABLE IF NOT EXISTS sessoes_usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios_sistema(id) ON DELETE CASCADE
);

-- Índices para sessões
CREATE INDEX IF NOT EXISTS idx_sessoes_token ON sessoes_usuarios(token);
CREATE INDEX IF NOT EXISTS idx_sessoes_expira ON sessoes_usuarios(expires_at);


-- ========================================
-- 5. TABELA DE LOG/AUDITORIA
-- ========================================

CREATE TABLE IF NOT EXISTS log_atividades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    funcionario_id INT NULL,
    acao VARCHAR(100) NOT NULL,
    tabela_afetada VARCHAR(100),
    registro_id INT,
    dados_antigos JSON,
    dados_novos JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios_sistema(id) ON DELETE SET NULL,
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE SET NULL
);

-- Índices para log
CREATE INDEX IF NOT EXISTS idx_log_usuario ON log_atividades(usuario_id);
CREATE INDEX IF NOT EXISTS idx_log_data ON log_atividades(created_at);


-- ========================================
-- 6. TABELA DE CONFIGURAÇÕES DO SISTEMA
-- ========================================

CREATE TABLE IF NOT EXISTS configuracoes_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    descricao VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Configurações iniciais
INSERT INTO configuracoes_sistema (chave, valor, descricao) VALUES 
('pedido_prefixo', 'PED', 'Prefixo do número do pedido'),
('pedido_numero_atual', '1000', 'Número atual do pedido'),
('pedido_incremento', '1', 'Valor de incremento do número do pedido')
ON DUPLICATE KEY UPDATE valor = valor;


-- ========================================
-- 7. TABELA DE CONTATOS DE CLIENTES
-- ========================================

CREATE TABLE IF NOT EXISTS contatos_clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    cargo VARCHAR(100),
    telefone VARCHAR(20),
    email VARCHAR(255),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);


-- ========================================
-- 8. ALTERAÇÕES NA TABELA JOBS (se existir)
-- ========================================

-- Adicionar número do pedido 
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS numero_pedido VARCHAR(50) NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_numero_pedido ON jobs(numero_pedido);


-- ========================================
-- 9. LIMPEZA DE DADOS INVÁLIDOS
-- ========================================

-- Limpar datas inválidas (antes de 1950)
UPDATE funcionarios SET data_admissao = NULL WHERE data_admissao IS NOT NULL AND YEAR(data_admissao) < 1950;
UPDATE funcionarios SET data_demissao = NULL WHERE data_demissao IS NOT NULL AND YEAR(data_demissao) < 1950;


-- ========================================
-- 10. CRIAR PRIMEIRO USUÁRIO MASTER
-- ========================================

-- IMPORTANTE: Execute manualmente ou ajuste conforme necessário
-- Este exemplo define o funcionário ID 35 (Patricia) como master

-- UPDATE funcionarios SET is_master = 1, acesso_ativo = 1 WHERE id = 35;

-- Para criar senha para um funcionário (senha: 123456):
-- A senha deve ser gerada via bcrypt no servidor
-- ou use o script: node scripts/cadastrar-senha.js


-- ============================================
-- NOTAS PARA O RAILWAY
-- ============================================
-- 
-- 1. Variáveis de ambiente necessárias (.env):
--    - DB_HOST (host do MySQL Railway)
--    - DB_USER (usuário do banco)
--    - DB_PASS (senha do banco)
--    - DB_NAME (nome do banco)
--    - JWT_SECRET (chave secreta para tokens)
--    - SMTP_HOST (servidor SMTP para emails)
--    - SMTP_PORT (porta SMTP, geralmente 587)
--    - SMTP_USER (email para envio)
--    - SMTP_PASS (senha do email/app password)
--    - SMTP_FROM (email de origem)
--    - APP_URL (URL da aplicação no Railway)
--
-- 2. Após deploy, crie o primeiro usuário master:
--    node scripts/cadastrar-senha.js
--
-- 3. Regras de acesso:
--    - is_master = 1 -> pode gerenciar outros usuários
--    - acesso_ativo = 1 -> pode fazer login
--    - senha_hash NOT NULL -> tem senha definida
--
-- ============================================

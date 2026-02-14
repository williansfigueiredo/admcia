-- ============================================
-- MIGRAÇÃO: Sistema de Controle de Acesso e Configurações
-- Data: 2026-02-13
-- ============================================

-- 1. Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    descricao VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Inserir configuração inicial do número de pedido
INSERT INTO configuracoes_sistema (chave, valor, descricao) VALUES 
('pedido_prefixo', 'PED', 'Prefixo do número do pedido'),
('pedido_numero_atual', '1000', 'Número atual do pedido (incrementa automaticamente)'),
('pedido_incremento', '1', 'Valor de incremento do número do pedido')
ON DUPLICATE KEY UPDATE valor = valor;

-- 2. Tabela de Permissões de Funcionários
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

-- 3. Tabela de Usuários do Sistema (Credenciais)
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

-- 4. Tabela de Sessões (para controle de login)
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

-- 5. Tabela de Log de Atividades (Auditoria)
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

-- Índices para performance
CREATE INDEX idx_sessoes_token ON sessoes_usuarios(token);
CREATE INDEX idx_sessoes_expira ON sessoes_usuarios(expires_at);
CREATE INDEX idx_log_usuario ON log_atividades(usuario_id);
CREATE INDEX idx_log_data ON log_atividades(created_at);

-- 6. Adicionar coluna numero_pedido na tabela jobs (se não existir)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS numero_pedido VARCHAR(50) NULL;

-- Criar índice para busca rápida por número do pedido
CREATE INDEX IF NOT EXISTS idx_jobs_numero_pedido ON jobs(numero_pedido);

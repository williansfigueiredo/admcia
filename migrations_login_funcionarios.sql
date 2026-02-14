-- ============================================
-- MIGRAÇÃO: Sistema de Login com Funcionários
-- Data: 2026-02-13
-- ============================================

-- 1. Adicionar coluna senha_hash na tabela funcionarios
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS senha_hash VARCHAR(255) NULL;

-- 2. Adicionar coluna ultimo_login na tabela funcionarios
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP NULL;

-- 3. Criar índice para busca por email (melhora performance do login)
CREATE INDEX IF NOT EXISTS idx_funcionarios_email ON funcionarios(email);

-- ============================================
-- NOTAS DE IMPLEMENTAÇÃO
-- ============================================
-- 
-- Esta migração adiciona campos necessários para o sistema de login
-- diretamente na tabela 'funcionarios', sem criar tabelas adicionais.
--
-- Campos adicionados:
-- - senha_hash: Armazena a senha criptografada com bcrypt
-- - ultimo_login: Registra a data/hora do último acesso
--
-- Para cadastrar uma senha via bcrypt, use o script:
-- node scripts/cadastrar-senha.js
--
-- Ou via API (após login de admin):
-- POST /api/auth/definir-senha/:funcionarioId
-- Body: { "senha": "nova_senha" }
--
-- ============================================

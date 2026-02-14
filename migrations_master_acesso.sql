-- ============================================
-- MIGRAÇÃO: Sistema Master e Controle de Acesso
-- Data: 2026-02-13
-- ============================================

-- 1. Adicionar coluna is_master (indica se é admin/master)
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS is_master TINYINT(1) NOT NULL DEFAULT 0;

-- 2. Adicionar coluna acesso_ativo (controle de acesso ao sistema)
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS acesso_ativo TINYINT(1) NOT NULL DEFAULT 1;

-- 3. Definir o primeiro funcionário como Master (caso não exista nenhum)
-- Execute manualmente se necessário:
-- UPDATE funcionarios SET is_master = 1 WHERE id = 1;

-- 4. Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_funcionarios_is_master ON funcionarios(is_master);
CREATE INDEX IF NOT EXISTS idx_funcionarios_acesso_ativo ON funcionarios(acesso_ativo);

-- ============================================
-- NOTAS DE IMPLEMENTAÇÃO
-- ============================================
-- 
-- is_master = 1: Funcionário pode gerenciar acessos de outros
-- acesso_ativo = 1: Funcionário pode fazer login
-- 
-- Regras de Login:
-- - senha_hash IS NULL -> bloqueado (aguardando liberação)
-- - acesso_ativo = 0 -> bloqueado
-- - data_demissao IS NOT NULL -> bloqueado
-- - status != 'Ativo' -> bloqueado
--
-- Permissões Master:
-- - Listar funcionários
-- - Ativar/desativar acesso
-- - Definir/resetar senhas
-- - Promover/rebaixar Masters
-- ============================================

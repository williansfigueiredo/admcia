-- ============================================
-- SISTEMA DE GESTÃO TP - ESTRUTURA COMPLETA
-- Criado em: 07/02/2026
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- TABELA: clientes
-- ============================================
CREATE TABLE IF NOT EXISTS `clientes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(255) NOT NULL,
  `nome_fantasia` VARCHAR(255) DEFAULT NULL,
  `documento` VARCHAR(50) DEFAULT NULL,
  `inscricao_estadual` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `telefone` VARCHAR(50) DEFAULT NULL,
  `data_cadastro` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `cep` VARCHAR(20) DEFAULT NULL,
  `logradouro` VARCHAR(255) DEFAULT NULL,
  `numero` VARCHAR(50) DEFAULT NULL,
  `bairro` VARCHAR(100) DEFAULT NULL,
  `cidade` VARCHAR(100) DEFAULT NULL,
  `uf` VARCHAR(5) DEFAULT NULL,
  `contato1_nome` VARCHAR(100) DEFAULT NULL,
  `contato1_cargo` VARCHAR(50) DEFAULT NULL,
  `contato1_email` VARCHAR(100) DEFAULT NULL,
  `contato1_telefone` VARCHAR(50) DEFAULT NULL,
  `contato2_nome` VARCHAR(100) DEFAULT NULL,
  `contato2_cargo` VARCHAR(50) DEFAULT NULL,
  `contato2_email` VARCHAR(100) DEFAULT NULL,
  `contato2_telefone` VARCHAR(50) DEFAULT NULL,
  `observacoes` TEXT DEFAULT NULL,
  `site` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('Ativo','Inativo','Bloqueado') DEFAULT 'Ativo',
  `desconto_porcentage` DECIMAL(5,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  INDEX `idx_cliente_status` (`status`),
  INDEX `idx_cliente_documento` (`documento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: funcionarios
-- ============================================
CREATE TABLE IF NOT EXISTS `funcionarios` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(100) NOT NULL,
  `cargo` VARCHAR(50) DEFAULT NULL,
  `departamento` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `telefone` VARCHAR(20) DEFAULT NULL,
  `cep` VARCHAR(20) DEFAULT NULL,
  `logradouro` VARCHAR(255) DEFAULT NULL,
  `numero` VARCHAR(20) DEFAULT NULL,
  `bairro` VARCHAR(100) DEFAULT NULL,
  `cidade` VARCHAR(100) DEFAULT NULL,
  `uf` VARCHAR(2) DEFAULT NULL,
  `status` VARCHAR(20) DEFAULT 'Ativo',
  `data_admissao` DATE DEFAULT NULL,
  `data_demissao` DATE DEFAULT NULL,
  `observacoes` TEXT DEFAULT NULL,
  `cpf` VARCHAR(20) DEFAULT NULL,
  `endereco` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_funcionario_status` (`status`),
  INDEX `idx_funcionario_cpf` (`cpf`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: jobs
-- ============================================
CREATE TABLE IF NOT EXISTS `jobs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `descricao` VARCHAR(150) DEFAULT NULL,
  `valor` DECIMAL(10,2) DEFAULT NULL,
  `data_job` DATE DEFAULT NULL,
  `data_fim` DATE DEFAULT NULL,
  `hora_chegada_prevista` TIME DEFAULT NULL,
  `hora_inicio_evento` TIME DEFAULT NULL,
  `hora_fim_evento` TIME DEFAULT NULL,
  `status` VARCHAR(30) DEFAULT NULL,
  `pagamento` VARCHAR(30) DEFAULT NULL,
  `cliente_id` INT(11) DEFAULT NULL,
  `operador_id` INT(11) DEFAULT NULL,
  `logradouro` VARCHAR(255) DEFAULT NULL,
  `numero` VARCHAR(50) DEFAULT NULL,
  `bairro` VARCHAR(100) DEFAULT NULL,
  `cidade` VARCHAR(100) DEFAULT NULL,
  `uf` VARCHAR(2) DEFAULT NULL,
  `cep` VARCHAR(20) DEFAULT NULL,
  `solicitante_nome` VARCHAR(100) DEFAULT NULL,
  `solicitante_email` VARCHAR(100) DEFAULT NULL,
  `solicitante_telefone` VARCHAR(50) DEFAULT NULL,
  `producao_local` VARCHAR(100) DEFAULT NULL,
  `producao_contato` VARCHAR(100) DEFAULT NULL,
  `producao_email` VARCHAR(100) DEFAULT NULL,
  `pagador_nome` VARCHAR(100) DEFAULT NULL,
  `pagador_cnpj` VARCHAR(50) DEFAULT NULL,
  `pagador_email` VARCHAR(100) DEFAULT NULL,
  `pagador_endereco` VARCHAR(255) DEFAULT NULL,
  `forma_pagamento` VARCHAR(50) DEFAULT NULL,
  `tipo_documento` VARCHAR(50) DEFAULT NULL,
  `observacoes` TEXT DEFAULT NULL,
  `data_inicio` DATE DEFAULT NULL,
  `desconto_porcentagem` DECIMAL(5,2) DEFAULT 0.00,
  `motivo_desconto` VARCHAR(255) DEFAULT NULL,
  `vencimento_texto` VARCHAR(100) DEFAULT NULL,
  `pagador_cep` VARCHAR(20) DEFAULT NULL,
  `pagador_logradouro` VARCHAR(255) DEFAULT NULL,
  `pagador_numero` VARCHAR(50) DEFAULT NULL,
  `pagador_bairro` VARCHAR(100) DEFAULT NULL,
  `pagador_cidade` VARCHAR(100) DEFAULT NULL,
  `pagador_uf` VARCHAR(2) DEFAULT NULL,
  `desconto_valor` DECIMAL(10,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  INDEX `idx_job_cliente` (`cliente_id`),
  INDEX `idx_job_operador` (`operador_id`),
  INDEX `idx_job_status` (`status`),
  INDEX `idx_job_pagamento` (`pagamento`),
  INDEX `idx_job_data` (`data_job`),
  CONSTRAINT `fk_job_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_operador` FOREIGN KEY (`operador_id`) REFERENCES `funcionarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: equipamentos
-- ============================================
CREATE TABLE IF NOT EXISTS `equipamentos` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(100) DEFAULT NULL,
  `tipo` VARCHAR(50) DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'Disponível',
  `marca` VARCHAR(100) DEFAULT NULL,
  `modelo` VARCHAR(100) DEFAULT NULL,
  `observacoes` TEXT DEFAULT NULL,
  `qtd_total` INT(11) DEFAULT 1,
  `qtd_disponivel` INT(11) DEFAULT 1,
  `valor_diaria` DECIMAL(10,2) DEFAULT 0.00,
  `categoria` VARCHAR(100) DEFAULT NULL,
  `imagem` VARCHAR(255) DEFAULT NULL,
  `n_serie` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_equipamento_status` (`status`),
  INDEX `idx_equipamento_categoria` (`categoria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: job_itens
-- ============================================
CREATE TABLE IF NOT EXISTS `job_itens` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `job_id` INT(11) NOT NULL,
  `descricao` VARCHAR(255) DEFAULT NULL,
  `qtd` INT(11) DEFAULT NULL,
  `valor_unitario` DECIMAL(10,2) DEFAULT NULL,
  `desconto_item` DECIMAL(10,2) DEFAULT 0.00,
  `equipamento_id` INT(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_item_job` (`job_id`),
  INDEX `idx_item_equipamento` (`equipamento_id`),
  CONSTRAINT `fk_item_job` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_item_equipamento` FOREIGN KEY (`equipamento_id`) REFERENCES `equipamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: job_equipe
-- ============================================
CREATE TABLE IF NOT EXISTS `job_equipe` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `job_id` INT(11) DEFAULT NULL,
  `funcionario_id` INT(11) DEFAULT NULL,
  `funcao` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_equipe_job` (`job_id`),
  INDEX `idx_equipe_funcionario` (`funcionario_id`),
  CONSTRAINT `fk_equipe_job` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_equipe_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: escalas
-- ============================================
CREATE TABLE IF NOT EXISTS `escalas` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `funcionario_id` INT(11) DEFAULT NULL,
  `job_id` INT(11) DEFAULT NULL,
  `data_escala` DATE DEFAULT NULL,
  `tipo` VARCHAR(50) DEFAULT NULL,
  `observacao` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_escala_funcionario` (`funcionario_id`),
  INDEX `idx_escala_job` (`job_id`),
  INDEX `idx_escala_data` (`data_escala`),
  CONSTRAINT `fk_escala_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_escala_job` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: veiculos
-- ============================================
CREATE TABLE IF NOT EXISTS `veiculos` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `modelo` VARCHAR(100) DEFAULT NULL,
  `placa` VARCHAR(20) DEFAULT NULL,
  `status` VARCHAR(20) DEFAULT 'Ativo',
  PRIMARY KEY (`id`),
  INDEX `idx_veiculo_placa` (`placa`),
  INDEX `idx_veiculo_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- FIM DA ESTRUTURA DO BANCO
-- ============================================

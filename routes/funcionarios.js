/**
 * ============================================
 * ROTAS DE FUNCIONÁRIOS - Perfil e Master
 * ============================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET || 'cia_adm_secret_key_2026_erp_system';

// ============================================
// CONFIGURAÇÃO DO MULTER PARA AVATAR
// ============================================
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'avatars');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou GIF.'), false);
    }
  }
});

// ============================================
// MIDDLEWARE DE AUTENTICAÇÃO LOCAL
// ============================================
function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, error: 'Não autenticado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
  }
}

// ============================================
// MIDDLEWARE REQUIRE MASTER
// ============================================
function requireMaster(req, res, next) {
  const token = req.cookies?.auth_token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, error: 'Não autenticado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Verifica no banco se é master (mais seguro que confiar apenas no token)
    const db = req.app.get('db');
    db.query('SELECT is_master FROM funcionarios WHERE id = ?', [decoded.id], (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).json({ success: false, error: 'Usuário não encontrado' });
      }

      if (results[0].is_master !== 1) {
        return res.status(403).json({ success: false, error: 'Acesso restrito a administradores' });
      }

      next();
    });
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
  }
}

// ============================================
// ROTAS DO PRÓPRIO PERFIL (/me)
// ============================================

/**
 * PUT /api/funcionarios/me
 * Atualiza dados do próprio perfil
 */
router.put('/me', requireAuth, (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;
  const {
    nome, cpf, telefone, cargo, departamento, status,
    data_admissao, data_demissao,
    observacoes, cep, logradouro, numero, bairro, cidade, uf
  } = req.body;

  // Trata datas vazias como NULL
  const demissao = (data_demissao && typeof data_demissao === 'string' && data_demissao.trim() !== '') ? data_demissao.trim() : null;
  const admissao = (data_admissao && typeof data_admissao === 'string' && data_admissao.trim() !== '') ? data_admissao.trim() : null;

  // Campos que o próprio usuário pode editar
  const sql = `
    UPDATE funcionarios SET
      nome = COALESCE(?, nome),
      cpf = ?,
      telefone = ?,
      cargo = ?,
      departamento = ?,
      status = ?,
      data_admissao = ?,
      data_demissao = ?,
      observacoes = ?,
      cep = ?,
      logradouro = ?,
      numero = ?,
      bairro = ?,
      cidade = ?,
      uf = ?
    WHERE id = ?
  `;

  const values = [
    nome, cpf, telefone, cargo, departamento, status,
    admissao, demissao,
    observacoes, cep, logradouro, numero, bairro, cidade, uf,
    userId
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Erro ao atualizar perfil:', err);
      return res.status(500).json({ success: false, error: 'Erro ao atualizar perfil' });
    }

    return res.json({ success: true, message: 'Perfil atualizado com sucesso!' });
  });
});

/**
 * POST /api/funcionarios/me/avatar
 * Upload de foto do próprio perfil
 */
router.post('/me/avatar', requireAuth, (req, res) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, error: 'Arquivo muito grande. Máximo 2MB.' });
        }
      }
      return res.status(400).json({ success: false, error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
    }

    const db = req.app.get('db');
    const userId = req.user.id;
    const avatarPath = req.file.filename;

    // Busca avatar antigo para deletar
    db.query('SELECT avatar FROM funcionarios WHERE id = ?', [userId], (err, results) => {
      if (!err && results.length > 0 && results[0].avatar) {
        const oldPath = path.join(__dirname, '..', 'uploads', 'avatars', results[0].avatar);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Atualiza avatar no banco - SALVA COM CAMINHO COMPLETO
      const avatarComCaminho = `/uploads/avatars/${avatarPath}`;

      db.query('UPDATE funcionarios SET avatar = ? WHERE id = ?', [avatarComCaminho, userId], (err) => {
        if (err) {
          console.error('Erro ao atualizar avatar:', err);
          return res.status(500).json({ success: false, error: 'Erro ao salvar avatar' });
        }

        return res.json({
          success: true,
          message: 'Avatar atualizado!',
          avatar: avatarComCaminho
        });
      });
    });
  });
});

/**
 * DELETE /api/funcionarios/me/avatar
 * Remove foto do próprio perfil
 */
router.delete('/me/avatar', requireAuth, (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;

  db.query('SELECT avatar FROM funcionarios WHERE id = ?', [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Erro ao buscar avatar' });
    }

    if (results.length > 0 && results[0].avatar) {
      const avatarPath = path.join(__dirname, '..', 'uploads', 'avatars', results[0].avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    db.query('UPDATE funcionarios SET avatar = NULL WHERE id = ?', [userId], (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Erro ao remover avatar' });
      }

      return res.json({ success: true, message: 'Avatar removido!' });
    });
  });
});

// ============================================
// ROTAS MASTER - GERENCIAMENTO DE ACESSO
// ============================================

/**
 * GET /api/funcionarios/lista-acesso
 * Lista todos os funcionários para gerenciamento de acesso (apenas Master)
 */
router.get('/lista-acesso', requireMaster, (req, res) => {
  const db = req.app.get('db');

  const sql = `
    SELECT id, nome, email, cargo, status, avatar,
           is_master, acesso_ativo, data_demissao,
           CASE WHEN senha_hash IS NOT NULL THEN 1 ELSE 0 END as tem_senha
    FROM funcionarios
    ORDER BY nome ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Erro ao listar funcionários:', err);
      return res.status(500).json({ success: false, error: 'Erro ao buscar funcionários' });
    }

    // Formata os booleanos
    const funcionarios = results.map(f => ({
      ...f,
      is_master: f.is_master === 1,
      acesso_ativo: f.acesso_ativo === 1,
      tem_senha: f.tem_senha === 1
    }));

    return res.json({ success: true, funcionarios });
  });
});

/**
 * PATCH /api/funcionarios/:id/acesso
 * Ativa ou desativa acesso de um funcionário (apenas Master)
 */
router.patch('/:id/acesso', requireMaster, (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { acesso_ativo } = req.body;

  // Não permite desativar próprio acesso
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ success: false, error: 'Você não pode desativar seu próprio acesso' });
  }

  const valor = acesso_ativo ? 1 : 0;

  db.query('UPDATE funcionarios SET acesso_ativo = ? WHERE id = ?', [valor, id], (err, result) => {
    if (err) {
      console.error('Erro ao atualizar acesso:', err);
      return res.status(500).json({ success: false, error: 'Erro ao atualizar acesso' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Funcionário não encontrado' });
    }

    return res.json({
      success: true,
      message: acesso_ativo ? 'Acesso ativado!' : 'Acesso desativado!'
    });
  });
});

/**
 * PATCH /api/funcionarios/:id/master
 * Promove ou rebaixa um funcionário a Master (apenas Master)
 */
router.patch('/:id/master', requireMaster, (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { is_master } = req.body;

  // Não permite rebaixar a si mesmo
  if (parseInt(id) === req.user.id && !is_master) {
    return res.status(400).json({ success: false, error: 'Você não pode remover seu próprio status de Master' });
  }

  const valor = is_master ? 1 : 0;

  db.query('UPDATE funcionarios SET is_master = ? WHERE id = ?', [valor, id], (err, result) => {
    if (err) {
      console.error('Erro ao atualizar master:', err);
      return res.status(500).json({ success: false, error: 'Erro ao atualizar permissão' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Funcionário não encontrado' });
    }

    return res.json({
      success: true,
      message: is_master ? 'Funcionário promovido a Master!' : 'Permissão Master removida!'
    });
  });
});

/**
 * POST /api/funcionarios/:id/definir-senha
 * Define senha inicial para um funcionário (apenas Master)
 */
router.post('/:id/definir-senha', requireMaster, async (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { senha } = req.body;
  const enviarEmail = req.body?.enviarEmail ?? true; // Opção de enviar email

  if (!senha || senha.length < 6) {
    return res.status(400).json({ success: false, error: 'A senha deve ter pelo menos 6 caracteres' });
  }

  // Busca dados do funcionário primeiro
  db.query('SELECT nome, email FROM funcionarios WHERE id = ?', [id], async (errBusca, funcionarios) => {
    if (errBusca || funcionarios.length === 0) {
      console.error('❌ Funcionário não encontrado:', id);
      return res.status(404).json({ success: false, error: 'Funcionário não encontrado' });
    }

    const funcionario = funcionarios[0];
    console.log(`🔐 Definindo senha para: ${funcionario.nome} (${funcionario.email})`);

    try {
      const senhaHash = await bcrypt.hash(senha, 10);

      db.query('UPDATE funcionarios SET senha_hash = ? WHERE id = ?', [senhaHash, id], async (err, result) => {
        if (err) {
          console.error('❌ Erro ao definir senha:', err);
          return res.status(500).json({ success: false, error: 'Erro ao definir senha' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, error: 'Funcionário não encontrado' });
        }

        console.log('✅ Senha definida no banco de dados');
        let emailEnviado = false;

        // Tenta enviar email se configurado e solicitado
        if (enviarEmail && funcionario.email) {
          try {
            const emailService = require('../services/emailService');
            console.log(`📧 Verificando serviço de email...`);
            console.log(`📧 Email configurado: ${emailService.emailConfigurado()}`);
            
            if (emailService.emailConfigurado()) {
              console.log(`📧 Enviando email de senha definida para ${funcionario.email}...`);
              
              const resultado = await emailService.enviarEmailSenhaDefinida(
                funcionario.nome,
                funcionario.email,
                senha,
                `${req.protocol}://${req.get('host')}`
              );
              
              console.log(`📧 Resultado do envio:`, resultado);
              emailEnviado = resultado.success;
              
              if (emailEnviado) {
                console.log(`✅ Email de senha definida enviado para ${funcionario.email}`);
              } else {
                console.error(`❌ Falha ao enviar email:`, resultado.error);
              }
            } else {
              console.warn('⚠️ Serviço de email não configurado');
            }
          } catch (emailError) {
            console.error('❌ Erro ao enviar email:', emailError);
          }
        } else {
          console.log('📧 Email não será enviado (desabilitado ou sem email)');
        }

        return res.json({
          success: true,
          message: emailEnviado
            ? 'Senha definida e email enviado ao funcionário!'
            : 'Senha definida com sucesso!',
          email_enviado: emailEnviado
        });
    });
  } catch (error) {
    console.error('Erro ao gerar hash:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar senha' });
  }
});

/**
 * POST /api/funcionarios/:id/reset-senha
 * Reseta senha de um funcionário (gera temporária) (apenas Master)
 */
router.post('/:id/reset-senha', requireMaster, async (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const enviarEmail = req.body?.enviarEmail ?? true; // Opção de enviar email

  // Busca dados do funcionário
  db.query('SELECT nome, email FROM funcionarios WHERE id = ?', [id], async (errBusca, funcionarios) => {
    if (errBusca || funcionarios.length === 0) {
      return res.status(404).json({ success: false, error: 'Funcionário não encontrado' });
    }

    const funcionario = funcionarios[0];

    // Gera senha temporária
    const senhaTemp = Math.random().toString(36).slice(-8).toUpperCase();

    try {
      const senhaHash = await bcrypt.hash(senhaTemp, 10);

      db.query('UPDATE funcionarios SET senha_hash = ? WHERE id = ?', [senhaHash, id], async (err, result) => {
        if (err) {
          console.error('Erro ao resetar senha:', err);
          return res.status(500).json({ success: false, error: 'Erro ao resetar senha' });
        }

        console.log('✅ Senha resetada no banco de dados');
        let emailEnviado = false;

        // Tenta enviar email se configurado e solicitado
        if (enviarEmail && funcionario.email) {
          try {
            const emailService = require('../services/emailService');
            console.log(`📧 Verificando serviço de email...`);
            console.log(`📧 Email configurado: ${emailService.emailConfigurado()}`);
            
            if (emailService.emailConfigurado()) {
              console.log(`📧 Enviando email de senha resetada para ${funcionario.email}...`);
              
              const resultado = await emailService.enviarEmailSenhaResetada(
                funcionario.nome,
                funcionario.email,
                senhaTemp,
                `${req.protocol}://${req.get('host')}`
              );
              
              console.log(`📧 Resultado do envio:`, resultado);
              emailEnviado = resultado.success;
              
              if (emailEnviado) {
                console.log(`✅ Email de senha resetada enviado para ${funcionario.email}`);
              } else {
                console.error(`❌ Falha ao enviar email:`, resultado.error);
              }
            } else {
              console.warn('⚠️ Serviço de email não configurado');
            }
          } catch (emailError) {
            console.error('❌ Erro ao enviar email:', emailError);
          }
        } else {
          console.log('📧 Email não será enviado (desabilitado ou sem email)');
        }

        return res.json({
          success: true,
          message: emailEnviado
            ? 'Senha resetada e email enviado!'
            : 'Senha resetada com sucesso!',
          senha_temporaria: senhaTemp,
          email_enviado: emailEnviado
        });
      });
    } catch (error) {
      console.error('Erro ao gerar hash:', error);
      return res.status(500).json({ success: false, error: 'Erro ao processar senha' });
    }
  });
});

module.exports = router;

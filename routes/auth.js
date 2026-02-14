/**
 * ============================================
 * ROTAS DE AUTENTICAÇÃO - Sistema de Login
 * Utiliza tabela 'funcionarios' com bcrypt + JWT
 * ============================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Segredo do JWT (em produção, usar variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'cia_adm_secret_key_2026_erp_system';
const JWT_EXPIRES_IN = '8h';

/**
 * POST /api/auth/login
 * Realiza o login do funcionário
 */
router.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const db = req.app.get('db');

  // Validação básica
  if (!email || !senha) {
    return res.status(400).json({ 
      success: false,
      error: 'Email e senha são obrigatórios' 
    });
  }

  // Busca funcionário pelo email
  const sql = `
    SELECT id, nome, email, cargo, departamento, status, senha_hash, avatar,
           is_master, acesso_ativo, data_demissao, telefone, cpf
    FROM funcionarios 
    WHERE email = ?
  `;

  db.query(sql, [email.toLowerCase().trim()], async (err, results) => {
    if (err) {
      console.error('Erro ao buscar funcionário:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor' 
      });
    }

    // Verifica se encontrou o funcionário
    if (results.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenciais inválidas' 
      });
    }

    const funcionario = results[0];

    // Verifica se o status é "Ativo"
    if (funcionario.status !== 'Ativo') {
      let mensagem = 'Acesso não autorizado';
      
      if (funcionario.status === 'Férias') {
        mensagem = 'Funcionário em férias. Acesso temporariamente bloqueado.';
      } else if (funcionario.status === 'Inativo') {
        mensagem = 'Funcionário inativo. Entre em contato com o administrador.';
      }
      
      return res.status(403).json({ 
        success: false,
        error: mensagem 
      });
    }

    // Verifica se o acesso está ativo
    if (funcionario.acesso_ativo === 0) {
      return res.status(403).json({ 
        success: false,
        error: 'Acesso ao sistema desativado. Entre em contato com o administrador.' 
      });
    }

    // Verifica se foi demitido
    if (funcionario.data_demissao) {
      return res.status(403).json({ 
        success: false,
        error: 'Funcionário desligado. Acesso não permitido.' 
      });
    }

    // Verifica se existe senha_hash cadastrada
    if (!funcionario.senha_hash) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenciais não configuradas. Entre em contato com o administrador.' 
      });
    }

    // Compara a senha usando bcrypt
    try {
      const senhaValida = await bcrypt.compare(senha, funcionario.senha_hash);

      if (!senhaValida) {
        return res.status(401).json({ 
          success: false,
          error: 'Credenciais inválidas' 
        });
      }

      // Gera o token JWT
      const payload = {
        id: funcionario.id,
        nome: funcionario.nome,
        email: funcionario.email,
        cargo: funcionario.cargo,
        is_master: funcionario.is_master === 1
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      // Atualiza último login
      const sqlUpdate = `
        UPDATE funcionarios 
        SET ultimo_login = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      db.query(sqlUpdate, [funcionario.id], (errUpdate) => {
        if (errUpdate) {
          console.log('Aviso: Não foi possível atualizar ultimo_login');
        }
      });

      // Configura cookie httpOnly
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS em produção
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000 // 8 horas em ms
      });

      // Retorna dados do usuário (sem senha_hash)
      return res.json({
        success: true,
        message: 'Login realizado com sucesso!',
        token, // Também envia no body para SPAs
        usuario: {
          id: funcionario.id,
          nome: funcionario.nome,
          email: funcionario.email,
          cargo: funcionario.cargo,
          departamento: funcionario.departamento,
          telefone: funcionario.telefone,
          cpf: funcionario.cpf,
          avatar: funcionario.avatar,
          is_master: funcionario.is_master === 1
        }
      });

    } catch (bcryptError) {
      console.error('Erro ao comparar senha:', bcryptError);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao processar autenticação' 
      });
    }
  });
});

/**
 * GET /api/auth/me
 * Retorna dados do funcionário logado
 */
router.get('/me', (req, res) => {
  const db = req.app.get('db');
  
  // Obtém token do cookie ou header
  const token = req.cookies?.auth_token || 
                req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Não autenticado' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Busca dados atualizados do funcionário (sem senha_hash)
    const sql = `
      SELECT id, nome, email, cargo, departamento, status, avatar,
             telefone, cpf, cep, logradouro, numero, bairro, cidade, uf,
             observacoes, data_admissao, is_master, acesso_ativo
      FROM funcionarios 
      WHERE id = ?
    `;

    db.query(sql, [decoded.id], (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não encontrado' 
        });
      }

      const funcionario = results[0];

      // Verifica se ainda está ativo
      if (funcionario.status !== 'Ativo') {
        return res.status(403).json({ 
          success: false,
          error: 'Acesso bloqueado' 
        });
      }

      // Formata is_master como boolean
      funcionario.is_master = funcionario.is_master === 1;

      // Garante que o avatar sempre tenha caminho completo
      if (funcionario.avatar && !funcionario.avatar.startsWith('/')) {
        funcionario.avatar = `/uploads/avatars/${funcionario.avatar}`;
      }

      return res.json({
        success: true,
        usuario: funcionario
      });
    });

  } catch (jwtError) {
    return res.status(401).json({ 
      success: false,
      error: 'Token inválido ou expirado' 
    });
  }
});

/**
 * POST /api/auth/logout
 * Encerra a sessão do usuário
 */
router.post('/logout', (req, res) => {
  // Limpa o cookie de autenticação
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  return res.json({
    success: true,
    message: 'Logout realizado com sucesso!'
  });
});

/**
 * POST /api/auth/alterar-senha
 * Permite ao funcionário alterar sua própria senha
 */
router.post('/alterar-senha', async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;
  const db = req.app.get('db');

  // Obtém token
  const token = req.cookies?.auth_token || 
                req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Não autenticado' 
    });
  }

  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ 
      success: false,
      error: 'Senha atual e nova senha são obrigatórias' 
    });
  }

  if (novaSenha.length < 6) {
    return res.status(400).json({ 
      success: false,
      error: 'A nova senha deve ter pelo menos 6 caracteres' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Busca senha atual do funcionário
    const sql = "SELECT id, senha_hash FROM funcionarios WHERE id = ?";
    
    db.query(sql, [decoded.id], async (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não encontrado' 
        });
      }

      const funcionario = results[0];

      // Verifica senha atual
      const senhaValida = await bcrypt.compare(senhaAtual, funcionario.senha_hash);
      
      if (!senhaValida) {
        return res.status(401).json({ 
          success: false,
          error: 'Senha atual incorreta' 
        });
      }

      // Gera hash da nova senha
      const novaHash = await bcrypt.hash(novaSenha, 10);

      // Atualiza a senha
      const sqlUpdate = "UPDATE funcionarios SET senha_hash = ? WHERE id = ?";
      
      db.query(sqlUpdate, [novaHash, funcionario.id], (errUpdate) => {
        if (errUpdate) {
          console.error('Erro ao atualizar senha:', errUpdate);
          return res.status(500).json({ 
            success: false,
            error: 'Erro ao atualizar senha' 
          });
        }

        return res.json({
          success: true,
          message: 'Senha alterada com sucesso!'
        });
      });
    });

  } catch (jwtError) {
    return res.status(401).json({ 
      success: false,
      error: 'Token inválido ou expirado' 
    });
  }
});

/**
 * POST /api/auth/definir-senha/:funcionarioId
 * Define senha para um funcionário (usado pelo admin)
 */
router.post('/definir-senha/:funcionarioId', async (req, res) => {
  const { funcionarioId } = req.params;
  const { senha } = req.body;
  const db = req.app.get('db');

  // Obtém token para verificar se é admin/autorizado
  const token = req.cookies?.auth_token || 
                req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Não autorizado' 
    });
  }

  if (!senha || senha.length < 6) {
    return res.status(400).json({ 
      success: false,
      error: 'A senha deve ter pelo menos 6 caracteres' 
    });
  }

  try {
    // Verifica se o token é válido
    jwt.verify(token, JWT_SECRET);

    // Gera hash da nova senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Atualiza a senha do funcionário
    const sql = "UPDATE funcionarios SET senha_hash = ? WHERE id = ?";
    
    db.query(sql, [senhaHash, funcionarioId], (err, result) => {
      if (err) {
        console.error('Erro ao definir senha:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Erro ao definir senha' 
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Funcionário não encontrado' 
        });
      }

      return res.json({
        success: true,
        message: 'Senha definida com sucesso!'
      });
    });

  } catch (jwtError) {
    return res.status(401).json({ 
      success: false,
      error: 'Não autorizado' 
    });
  }
});

// ============================================
// RECUPERAÇÃO DE SENHA
// ============================================

// Armazena códigos de recuperação temporários (em produção, use Redis ou banco)
const codigosRecuperacao = new Map();

/**
 * POST /api/auth/recuperar-senha
 * Envia código de recuperação por email
 */
router.post('/recuperar-senha', (req, res) => {
  const db = req.app.get('db');
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email é obrigatório' 
    });
  }

  // Verifica se o email existe no banco
  db.query('SELECT id, nome, email FROM funcionarios WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Erro ao buscar funcionário:', err);
      return res.status(500).json({ success: false, error: 'Erro interno' });
    }

    // Por segurança, não revelamos se o email existe ou não
    if (results.length === 0) {
      // Mas ainda assim retornamos sucesso
      console.log(`⚠️ Tentativa de recuperação para email não cadastrado: ${email}`);
      return res.json({ success: true, message: 'Se o email existir, o código será enviado' });
    }

    const funcionario = results[0];

    // Gera código de 6 caracteres
    const codigo = Math.random().toString(36).slice(-6).toUpperCase();
    
    // Armazena código com expiração de 30 minutos
    codigosRecuperacao.set(email.toLowerCase(), {
      codigo,
      funcionarioId: funcionario.id,
      expiracao: Date.now() + 30 * 60 * 1000 // 30 minutos
    });

    console.log(`🔑 Código de recuperação para ${email}: ${codigo}`);

    // Tenta enviar email (se configurado)
    try {
      const emailService = require('../services/emailService');
      if (emailService.emailConfigurado()) {
        await emailService.enviarEmailRecuperacaoSenha(
          funcionario.nome,
          funcionario.email,
          codigo,
          `${req.protocol}://${req.get('host')}/login`
        );
        console.log(`📧 Email de recuperação enviado para ${email}`);
      } else {
        console.log(`⚠️ Email não configurado. Código: ${codigo}`);
      }
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      // Continua mesmo se o email falhar
    }

    return res.json({ 
      success: true, 
      message: 'Código enviado para o email',
      // Em desenvolvimento, retorna o código (remover em produção!)
      ...(process.env.NODE_ENV !== 'production' && { codigo_debug: codigo })
    });
  });
});

/**
 * POST /api/auth/verificar-codigo
 * Verifica se o código de recuperação é válido
 */
router.post('/verificar-codigo', (req, res) => {
  const { email, codigo } = req.body;

  if (!email || !codigo) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email e código são obrigatórios' 
    });
  }

  const dados = codigosRecuperacao.get(email.toLowerCase());

  if (!dados) {
    return res.status(400).json({ 
      success: false, 
      error: 'Código não encontrado. Solicite um novo código.' 
    });
  }

  if (Date.now() > dados.expiracao) {
    codigosRecuperacao.delete(email.toLowerCase());
    return res.status(400).json({ 
      success: false, 
      error: 'Código expirado. Solicite um novo código.' 
    });
  }

  if (dados.codigo !== codigo.toUpperCase()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Código incorreto' 
    });
  }

  return res.json({ 
    success: true, 
    message: 'Código válido' 
  });
});

/**
 * POST /api/auth/redefinir-senha
 * Redefine a senha usando o código de recuperação
 */
router.post('/redefinir-senha', async (req, res) => {
  const db = req.app.get('db');
  const { email, codigo, novaSenha } = req.body;

  if (!email || !codigo || !novaSenha) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email, código e nova senha são obrigatórios' 
    });
  }

  if (novaSenha.length < 6) {
    return res.status(400).json({ 
      success: false, 
      error: 'A senha deve ter pelo menos 6 caracteres' 
    });
  }

  const dados = codigosRecuperacao.get(email.toLowerCase());

  if (!dados) {
    return res.status(400).json({ 
      success: false, 
      error: 'Código não encontrado. Solicite um novo código.' 
    });
  }

  if (Date.now() > dados.expiracao) {
    codigosRecuperacao.delete(email.toLowerCase());
    return res.status(400).json({ 
      success: false, 
      error: 'Código expirado. Solicite um novo código.' 
    });
  }

  if (dados.codigo !== codigo.toUpperCase()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Código incorreto' 
    });
  }

  try {
    // Gera hash da nova senha
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    // Atualiza no banco
    db.query('UPDATE funcionarios SET senha_hash = ? WHERE id = ?', 
      [senhaHash, dados.funcionarioId], 
      (err, result) => {
        if (err) {
          console.error('Erro ao atualizar senha:', err);
          return res.status(500).json({ success: false, error: 'Erro ao atualizar senha' });
        }

        // Remove código usado
        codigosRecuperacao.delete(email.toLowerCase());

        console.log(`✅ Senha redefinida para funcionário ID ${dados.funcionarioId}`);

        return res.json({ 
          success: true, 
          message: 'Senha alterada com sucesso!' 
        });
      }
    );

  } catch (error) {
    console.error('Erro ao processar senha:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar senha' });
  }
});

module.exports = router;
module.exports.JWT_SECRET = JWT_SECRET;

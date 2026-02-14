/**
 * ============================================
 * MIDDLEWARE DE AUTENTICAÇÃO - requireAuth
 * Protege rotas que exigem login
 * ============================================
 */

const jwt = require('jsonwebtoken');

// Importa o secret do auth (ou usa fallback)
const JWT_SECRET = process.env.JWT_SECRET || 'cia_adm_secret_key_2026_erp_system';

/**
 * Middleware para verificar se o usuário está autenticado
 * Uso: app.use('/api/rota-protegida', requireAuth, rotaHandler)
 */
function requireAuth(req, res, next) {
  // Obtém token do cookie ou header Authorization
  const token = req.cookies?.auth_token || 
                req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    // Se for requisição de API, retorna JSON
    if (req.path.startsWith('/api') || req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ 
        success: false,
        error: 'Autenticação necessária',
        redirect: '/login'
      });
    }
    // Se for requisição de página, redireciona
    return res.redirect('/login');
  }

  try {
    // Verifica e decodifica o token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Anexa dados do usuário à requisição
    req.user = {
      id: decoded.id,
      nome: decoded.nome,
      email: decoded.email,
      cargo: decoded.cargo
    };

    // Continua para a próxima middleware/rota
    next();

  } catch (error) {
    console.log('Token inválido ou expirado:', error.message);

    // Se for requisição de API, retorna JSON
    if (req.path.startsWith('/api') || req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ 
        success: false,
        error: 'Sessão expirada. Faça login novamente.',
        redirect: '/login'
      });
    }
    // Se for requisição de página, redireciona
    return res.redirect('/login');
  }
}

/**
 * Middleware opcional: Verifica se está logado, mas não bloqueia
 * Útil para páginas que funcionam com ou sem login
 */
function checkAuth(req, res, next) {
  const token = req.cookies?.auth_token || 
                req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: decoded.id,
        nome: decoded.nome,
        email: decoded.email,
        cargo: decoded.cargo
      };
    } catch (error) {
      // Token inválido, mas não bloqueia
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
}

/**
 * Middleware para redirecionar ao dashboard se já estiver logado
 * Útil para a página de login
 */
function redirectIfAuthenticated(req, res, next) {
  const token = req.cookies?.auth_token || 
                req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      // Se token válido, redireciona para o dashboard
      return res.redirect('/');
    } catch (error) {
      // Token inválido, continua para login
    }
  }

  next();
}

module.exports = { 
  requireAuth, 
  checkAuth, 
  redirectIfAuthenticated 
};

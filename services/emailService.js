/**
 * ============================================
 * SERVIÇO DE ENVIO DE EMAIL
 * ============================================
 * 
 * Configuração para envio de emails automáticos
 * - Novo acesso ao sistema
 * - Reset de senha
 * - Esqueci minha senha
 */

const nodemailer = require('nodemailer');

// ============================================
// CONFIGURAÇÃO DO TRANSPORTER
// ============================================

let transporter = null;
let emailFrom = null;

/**
 * Inicializa o transporter de email
 */
function inicializarEmail() {
  // Ler variáveis aqui (não no topo) para garantir que estão carregadas
  const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587; // Mudança: 587 TLS como padrão
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || '';
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
  const useSecure = smtpPort === 465; // SSL para porta 465

  // Configurar remetente
  emailFrom = process.env.SMTP_FROM_NAME
    ? `${process.env.SMTP_FROM_NAME} <${smtpUser}>`
    : process.env.EMAIL_FROM || smtpUser;

  console.log(`📧 Tentando configurar email: host=${smtpHost}, port=${smtpPort}, secure=${useSecure}, user=${smtpUser ? smtpUser.substring(0, 5) + '...' : 'NÃO DEFINIDO'}`);

  if (smtpUser && smtpPass) {
    // Configuração otimizada para Railway e outras plataformas
    const transporterConfig = {
      host: smtpHost,
      port: smtpPort,
      secure: useSecure, // true para 465, false para outros
      requireTLS: !useSecure, // força TLS para portas não-SSL
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      // Timeouts mais longos para Railway
      connectionTimeout: 60000, // 60 segundos
      greetingTimeout: 30000, // 30 segundos  
      socketTimeout: 60000, // 60 segundos
      // Configurações adicionais para compatibilidade
      tls: {
        // Não falha em certificados auto-assinados
        rejectUnauthorized: false,
        // Permite conexões menos seguras (necessário para alguns provedores)
        ciphers: 'SSLv3'
      },
      // Pool de conexões para melhor performance
      pool: true,
      maxConnections: 5,
      maxMessages: 10,
      // Configurações de debug
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development'
    };

    console.log('🔧 Configuração final:', {
      host: transporterConfig.host,
      port: transporterConfig.port,
      secure: transporterConfig.secure,
      requireTLS: transporterConfig.requireTLS,
      user: smtpUser.substring(0, 5) + '...',
      timeouts: '60s connection, 30s greeting, 60s socket'
    });

    transporter = nodemailer.createTransport(transporterConfig);
    
    // Teste de conectividade assíncrono (não bloqueia startup)
    setTimeout(() => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Falha na verificação do email:', error.message);
          console.log('💡 Dica: Para Gmail use porta 587 + TLS, ou 465 + SSL');
          console.log('💡 Verifique se EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS estão corretos');
        } else {
          console.log('✅ Servidor de email verificado com sucesso! Pronto para enviar emails.');
        }
      });
    }, 5000); // Aguarda 5 segundos antes de testar

    console.log('✅ Transporter de email criado! (Verificação em andamento...)');
    return true;
  } else {
    console.log('⚠️ Serviço de email não configurado (EMAIL_USER ou EMAIL_PASS não definidos)');
    return false;
  }
}

/**
 * Verifica se o serviço de email está configurado
 */
function emailConfigurado() {
  return transporter !== null;
}

// ============================================
// TEMPLATES DE EMAIL
// ============================================

/**
 * Template HTML base
 */
function templateBase(conteudo, titulo) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .highlight-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .credentials { background: #e8f5e9; border: 1px solid #4caf50; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .credentials p { margin: 10px 0; }
    .credentials strong { color: #2e7d32; }
    .btn { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .warning { color: #ff5722; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏢 Sistema de Gestão</h1>
    </div>
    <div class="content">
      ${conteudo}
    </div>
    <div class="footer">
      <p>Este é um email automático. Por favor, não responda.</p>
      <p>© ${new Date().getFullYear()} - Sistema de Gestão TP</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Gera email de novo acesso ao sistema
 */
function templateNovoAcesso(nome, email, senha, urlSistema) {
  const conteudo = `
    <h2>Olá, ${nome}! 👋</h2>
    <p>Bem-vindo ao nosso sistema! Suas credenciais de acesso foram criadas.</p>
    
    <div class="credentials">
      <h3 style="margin-top: 0; color: #2e7d32;">🔐 Suas Credenciais</h3>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Senha:</strong> ${senha}</p>
    </div>
    
    <div class="highlight-box">
      <p><strong>⚠️ Importante:</strong> Por segurança, recomendamos que você altere sua senha no primeiro acesso.</p>
      <p>Acesse: <strong>Configurações → Segurança → Alterar Senha</strong></p>
    </div>
    
    <p style="text-align: center;">
      <a href="${urlSistema}" class="btn">Acessar o Sistema</a>
    </p>
  `;

  return templateBase(conteudo, 'Bem-vindo ao Sistema');
}

/**
 * Gera email de senha resetada (pelo Master)
 */
function templateSenhaResetada(nome, email, senha, urlSistema) {
  const conteudo = `
    <h2>Olá, ${nome}! 👋</h2>
    <p>Sua senha foi resetada pelo administrador do sistema.</p>
    
    <div class="credentials">
      <h3 style="margin-top: 0; color: #2e7d32;">🔐 Nova Senha Temporária</h3>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Nova Senha:</strong> ${senha}</p>
    </div>
    
    <div class="highlight-box">
      <p class="warning"><strong>⚠️ Atenção:</strong> Esta é uma senha temporária.</p>
      <p>Por favor, altere sua senha imediatamente após o login.</p>
      <p>Acesse: <strong>Configurações → Segurança → Alterar Senha</strong></p>
    </div>
    
    <p style="text-align: center;">
      <a href="${urlSistema}" class="btn">Acessar o Sistema</a>
    </p>
  `;

  return templateBase(conteudo, 'Senha Resetada');
}

/**
 * Gera email de recuperação de senha (Esqueci minha senha)
 */
function templateRecuperacaoSenha(nome, codigo, urlRecuperacao, minutosExpiracao = 30) {
  const conteudo = `
    <h2>Olá, ${nome}! 👋</h2>
    <p>Recebemos uma solicitação para redefinir sua senha.</p>
    
    <div class="credentials">
      <h3 style="margin-top: 0; color: #2e7d32;">🔑 Código de Verificação</h3>
      <p style="font-size: 32px; letter-spacing: 8px; text-align: center; font-weight: bold; color: #667eea;">
        ${codigo}
      </p>
    </div>
    
    <div class="highlight-box">
      <p><strong>⏰ Este código expira em ${minutosExpiracao} minutos.</strong></p>
      <p>Se você não solicitou esta recuperação, ignore este email.</p>
    </div>
    
    <p style="text-align: center;">
      <a href="${urlRecuperacao}" class="btn">Redefinir Senha</a>
    </p>
    
    <p class="warning" style="text-align: center; font-size: 12px;">
      Se o botão não funcionar, use o código acima diretamente no sistema.
    </p>
  `;

  return templateBase(conteudo, 'Recuperação de Senha');
}

// ============================================
// FUNÇÕES DE ENVIO
// ============================================

/**
 * Envia email genérico
 */
async function enviarEmail(destinatario, assunto, htmlContent) {
  if (!transporter) {
    console.log('⚠️ Email não enviado: serviço não configurado');
    return { success: false, error: 'Serviço de email não configurado' };
  }

  const mailOptions = {
    from: emailFrom,
    to: destinatario,
    subject: assunto,
    html: htmlContent
  };

  // Implementar retry com timeout progressivo
  const maxAttempts = 3;
  let attempt = 1;

  while (attempt <= maxAttempts) {
    try {
      console.log(`📧 Tentativa ${attempt}/${maxAttempts} - Enviando email para ${destinatario}...`);
      
      // Promise com timeout customizado
      const info = await Promise.race([
        transporter.sendMail(mailOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout na tentativa ${attempt} (90s)`)), 90000)
        )
      ]);

      console.log(`✅ Email enviado com sucesso! MessageID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error(`❌ Tentativa ${attempt} falhou:`, error.message);
      
      // Se é problema de timeout ou conectividade, tentar novamente
      const isRetryableError = 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.message.includes('timeout') ||
        error.message.includes('CONN');

      if (isRetryableError && attempt < maxAttempts) {
        const waitTime = attempt * 2000; // 2s, 4s, 6s
        console.log(`⏳ Aguardando ${waitTime}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempt++;
        continue;
      }

      // Se não é erro recuperável ou esgotou tentativas
      const errorMessage = this.getErrorMessage(error);
      console.error(`💥 Falha definitiva após ${attempt} tentativa(s):`, errorMessage);
      
      return { 
        success: false, 
        error: errorMessage,
        details: {
          code: error.code,
          attempt: attempt,
          isRetryable: isRetryableError
        }
      };
    }
  }
}

/**
 * Converte erros técnicos em mensagens mais amigáveis
 */
function getErrorMessage(error) {
  const errorMap = {
    'ETIMEDOUT': 'Timeout na conexão com servidor de email. Verifique configurações de rede.',
    'ECONNRESET': 'Conexão foi resetada pelo servidor. Tente novamente.',
    'ENOTFOUND': 'Servidor de email não encontrado. Verifique EMAIL_HOST.',
    'ECONNREFUSED': 'Conexão recusada. Verifique porta e configurações de firewall.',
    'AUTH_FAILED': 'Falha na autenticação. Verifique EMAIL_USER e EMAIL_PASS.',
    'ESOCKET': 'Erro de socket. Problema de conectividade de rede.'
  };

  return errorMap[error.code] || error.message || 'Erro desconhecido ao enviar email';
}

/**
 * Envia email de novo acesso ao sistema
 */
async function enviarEmailNovoAcesso(nome, email, senha, urlSistema = 'http://localhost:3000') {
  const html = templateNovoAcesso(nome, email, senha, urlSistema);
  return await enviarEmail(email, '🎉 Bem-vindo ao Sistema de Gestão!', html);
}

/**
 * Envia email de senha resetada
 */
async function enviarEmailSenhaResetada(nome, email, senha, urlSistema = 'http://localhost:3000') {
  const html = templateSenhaResetada(nome, email, senha, urlSistema);
  return await enviarEmail(email, '🔐 Sua Senha foi Resetada', html);
}

/**
 * Envia email de recuperação de senha
 */
async function enviarEmailRecuperacaoSenha(nome, email, codigo, urlRecuperacao) {
  const html = templateRecuperacaoSenha(nome, codigo, urlRecuperacao);
  return await enviarEmail(email, '🔑 Código de Recuperação de Senha', html);
}

// ============================================
// EXPORTS
// ============================================

/**
 * Testa diferentes configurações de email para encontrar a melhor
 */
async function testarConfiguracaoEmail() {
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  
  if (!smtpUser || !smtpPass) {
    return {
      success: false,
      error: 'Credenciais não configuradas',
      configs: []
    };
  }

  // Configurações comuns para teste
  const configuracoes = [
    // Gmail TLS (mais comum)
    {
      name: 'Gmail TLS (Recomendado)',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true
    },
    // Gmail SSL
    {
      name: 'Gmail SSL',
      host: 'smtp.gmail.com', 
      port: 465,
      secure: true,
      requireTLS: false
    },
    // Outlook/Hotmail
    {
      name: 'Outlook',
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      requireTLS: true
    },
    // Yahoo
    {
      name: 'Yahoo',
      host: 'smtp.mail.yahoo.com',
      port: 587,
      secure: false,
      requireTLS: true
    }
  ];

  const resultados = [];

  for (const config of configuracoes) {
    try {
      console.log(`🧪 Testando ${config.name}...`);
      
      const testTransporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        requireTLS: config.requireTLS,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        tls: {
          rejectUnauthorized: false
        }
      });

      // Teste de conectividade com timeout
      await Promise.race([
        new Promise((resolve, reject) => {
          testTransporter.verify((error, success) => {
            if (error) reject(error);
            else resolve(success);
          });
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout 30s')), 30000)
        )
      ]);

      resultados.push({
        ...config,
        status: 'success',
        message: 'Configuração funcionando!'
      });

      console.log(`✅ ${config.name} - Funcionando!`);
      
      // Fechar conexão
      testTransporter.close();

    } catch (error) {
      resultados.push({
        ...config,
        status: 'error',
        message: error.message,
        code: error.code
      });

      console.log(`❌ ${config.name} - ${error.message}`);
    }
  }

  return {
    success: resultados.some(r => r.status === 'success'),
    configs: resultados,
    recommendation: resultados.find(r => r.status === 'success')
  };
}

module.exports = {
  inicializarEmail,
  emailConfigurado,
  enviarEmail,
  enviarEmailNovoAcesso,
  enviarEmailSenhaResetada,
  enviarEmailRecuperacaoSenha,
  testarConfiguracaoEmail
};

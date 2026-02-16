/**
 * ============================================
 * SERVIÇO DE ENVIO DE EMAIL
 * ============================================
 * 
 * Configuração para envio de emails automáticos
 * - Suporta Resend (recomendado) e SMTP (fallback)
 * - Novo acesso ao sistema
 * - Reset de senha
 * - Esqueci minha senha
 */

const nodemailer = require('nodemailer');
const { Resend } = require('resend');

// ============================================
// CONFIGURAÇÃO DO SERVIÇO DE EMAIL
// ============================================

let resend = null;
let transporter = null;
let emailFrom = null;
let emailMethod = 'none'; // 'resend', 'smtp', 'none'

/**
 * Inicializa o serviço de email (Resend ou SMTP)
 */
function inicializarEmail() {
  // PRIORIDADE 1: Resend (recomendado para Railway)
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (resendApiKey) {
    try {
      resend = new Resend(resendApiKey);
      emailFrom = process.env.RESEND_FROM || process.env.EMAIL_FROM || 'onboarding@resend.dev';
      emailMethod = 'resend';
      console.log('✅ Resend configurado com sucesso!');
      console.log(`📧 Remetente: ${emailFrom}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao configurar Resend:', error.message);
    }
  }

  // PRIORIDADE 2: SMTP (fallback)
  const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || '';
  const smtpPort = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587;
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || '';
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';

  if (smtpUser && smtpPass && smtpHost) {
    try {
      const useSecure = smtpPort === 465;
      
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: useSecure,
        requireTLS: !useSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000
      });

      emailFrom = process.env.SMTP_FROM_NAME
        ? `${process.env.SMTP_FROM_NAME} <${smtpUser}>`
        : process.env.EMAIL_FROM || smtpUser;

      emailMethod = 'smtp';
      
      console.log(`✅ SMTP configurado como fallback`);
      console.log(`📧 Host: ${smtpHost}:${smtpPort}, User: ${smtpUser.substring(0, 5)}...`);
      
      // Testar conexão SMTP
      setTimeout(() => {
        transporter.verify((error, success) => {
          if (error) {
            console.error('❌ SMTP falhou na verificação:', error.message);
          } else {
            console.log('✅ SMTP verificado com sucesso!');
          }
        });
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao configurar SMTP:', error.message);
    }
  }

  console.log('⚠️ Nenhum serviço de email configurado');
  console.log('💡 Configure RESEND_API_KEY (recomendado) ou SMTP_HOST/USER/PASS');
  return false;
}

/**
 * Verifica se o serviço de email está configurado
 */
function emailConfigurado() {
  return resend !== null || transporter !== null;
}

/**
 * Retorna o método de email ativo
 */
function getEmailMethod() {
  return emailMethod;
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
 * Envia email genérico (Resend ou SMTP)
 */
async function enviarEmail(destinatario, assunto, htmlContent) {
  if (!emailConfigurado()) {
    console.log('⚠️ Email não enviado: serviço não configurado');
    return { success: false, error: 'Serviço de email não configurado' };
  }

  console.log(`📧 Enviando email via ${emailMethod.toUpperCase()}: ${destinatario}`);

  // MÉTODO 1: Resend (preferencial)
  if (emailMethod === 'resend') {
    try {
      const response = await resend.emails.send({
        from: emailFrom,
        to: [destinatario],
        subject: assunto,
        html: htmlContent
      });

      // Resend pode retornar { data: { id: '...' } } ou { id: '...' }
      const emailId = response?.data?.id || response?.id || 'sent';
      
      console.log(`✅ Email enviado com sucesso via Resend! ID: ${emailId}`);
      return { success: true, messageId: emailId, method: 'resend' };

    } catch (error) {
      console.error('❌ Falha ao enviar via Resend:', error.message);
      
      // Se tiver SMTP configurado, tentar como fallback
      if (transporter) {
        console.log('🔄 Tentando SMTP como fallback...');
        return await enviarViaSMTP(destinatario, assunto, htmlContent);
      }

      return { 
        success: false, 
        error: error.message,
        method: 'resend'
      };
    }
  }

  // MÉTODO 2: SMTP (fallback ou principal se Resend não configurado)
  if (emailMethod === 'smtp') {
    return await enviarViaSMTP(destinatario, assunto, htmlContent);
  }

  return { success: false, error: 'Nenhum método de email configurado' };
}

/**
 * Envia email via SMTP (com retry)
 */
async function enviarViaSMTP(destinatario, assunto, htmlContent) {
  const mailOptions = {
    from: emailFrom,
    to: destinatario,
    subject: assunto,
    html: htmlContent
  };

  const maxAttempts = 2; // Reduzido para 2 tentativas
  let attempt = 1;

  while (attempt <= maxAttempts) {
    try {
      console.log(`📧 [SMTP] Tentativa ${attempt}/${maxAttempts} - Enviando para ${destinatario}...`);
      
      const info = await Promise.race([
        transporter.sendMail(mailOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout na tentativa ${attempt}`)), 30000)
        )
      ]);

      console.log(`✅ Email enviado com sucesso via SMTP! MessageID: ${info.messageId}`);
      return { success: true, messageId: info.messageId, method: 'smtp' };

    } catch (error) {
      console.error(`❌ [SMTP] Tentativa ${attempt} falhou:`, error.message);
      
      const isRetryableError = 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNRESET' ||
        error.message.includes('timeout');

      if (isRetryableError && attempt < maxAttempts) {
        const waitTime = 2000;
        console.log(`⏳ Aguardando ${waitTime}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempt++;
        continue;
      }

      const errorMessage = getErrorMessage(error);
      console.error(`💥 [SMTP] Falha definitiva:`, errorMessage);
      
      return { 
        success: false, 
        error: errorMessage,
        method: 'smtp',
        details: {
          code: error.code,
          attempt: attempt
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
    'ETIMEDOUT': 'Timeout na conexão com servidor de email. Tente EMAIL_PORT=587 para Railway.',
    'ENETUNREACH': 'Rede inacessível (provável problema IPv6). Use EMAIL_PORT=587 ou outro provedor.',
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

  // Configurações comuns para teste (priorizando TLS para Railway)
  const configuracoes = [
    // Gmail TLS (melhor para Railway/deploy)
    {
      name: 'Gmail TLS (Railway)',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      family: 4 // IPv4 only
    },
    // Gmail SSL (fallback)
    {
      name: 'Gmail SSL', 
      host: 'smtp.gmail.com', 
      port: 465,
      secure: true,
      requireTLS: false,
      family: 4 // IPv4 only
    },
    // Outlook/Hotmail
    {
      name: 'Outlook',
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      requireTLS: true,
      family: 4 // IPv4 only
    },
    // Yahoo
    {
      name: 'Yahoo',
      host: 'smtp.mail.yahoo.com',
      port: 587,
      secure: false,
      requireTLS: true,
      family: 4 // IPv4 only
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
        family: config.family || 4, // IPv4 prioritário
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
  getEmailMethod,
  enviarEmail,
  enviarEmailNovoAcesso,
  enviarEmailSenhaResetada,
  enviarEmailRecuperacaoSenha,
  testarConfiguracaoEmail
};

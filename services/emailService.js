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

// Aceita tanto SMTP_* quanto EMAIL_* (Railway usa EMAIL_*)
const transporterConfig = {
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587,
  secure: false, // true para 465, false para outras portas
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || ''
  }
};

// Email remetente
const emailFrom = process.env.SMTP_FROM_NAME 
  ? `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_USER || process.env.EMAIL_USER}>`
  : process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER;

let transporter = null;

/**
 * Inicializa o transporter de email
 */
function inicializarEmail() {
  if (transporterConfig.auth.user && transporterConfig.auth.pass) {
    transporter = nodemailer.createTransport(transporterConfig);
    console.log('📧 Serviço de email configurado');
    return true;
  } else {
    console.log('⚠️ Serviço de email não configurado (variáveis SMTP_USER e SMTP_PASS não definidas)');
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

  try {
    const info = await transporter.sendMail({
      from: emailFrom,
      to: destinatario,
      subject: assunto,
      html: htmlContent
    });

    console.log(`📧 Email enviado para ${destinatario}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return { success: false, error: error.message };
  }
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

module.exports = {
  inicializarEmail,
  emailConfigurado,
  enviarEmail,
  enviarEmailNovoAcesso,
  enviarEmailSenhaResetada,
  enviarEmailRecuperacaoSenha
};

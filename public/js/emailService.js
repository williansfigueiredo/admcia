/**
 * ============================================
 * SERVIÇO DE EMAIL - FRONTEND
 * ============================================
 * 
 * Funções para integração com o serviço de email
 */

class EmailService {
    constructor() {
        this.baseUrl = window.location.origin;
        this.statusCache = null;
        this.cacheTime = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
    }

    // ============================================
    // VERIFICAÇÃO DE STATUS
    // ============================================

    /**
     * Verifica se o serviço de email está configurado
     */
    async verificarStatus(forceRefresh = false) {
        try {
            // Usar cache se disponível e válido
            const now = Date.now();
            if (!forceRefresh && this.statusCache && this.cacheTime && (now - this.cacheTime < this.CACHE_DURATION)) {
                return this.statusCache;
            }

            const response = await fetch('/debug/email-status');
            const data = await response.json();
            
            // Atualizar cache
            this.statusCache = data;
            this.cacheTime = now;
            
            return data;
        } catch (error) {
            console.error('Erro ao verificar status do email:', error);
            throw new Error('Falha na conexão com o servidor');
        }
    }

    /**
     * Verifica se o email está configurado (versão rápida)
     */
    async emailConfigurado() {
        try {
            const status = await this.verificarStatus();
            return status.success && status.configurado;
        } catch (error) {
            console.error('Erro ao verificar se email está configurado:', error);
            return false;
        }
    }

    // ============================================
    // ENVIO DE EMAILS
    // ============================================

    /**
     * Envia um email de teste personalizado
     */
    async enviarTeste(destinatario, assunto = null, mensagem = null) {
        try {
            if (!destinatario) {
                throw new Error('Email destinatário é obrigatório');
            }

            const payload = { destinatario };
            if (assunto) payload.assunto = assunto;
            if (mensagem) payload.mensagem = mensagem;

            const response = await fetch('/debug/testar-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Erro ao enviar email');
            }

            return {
                success: true,
                message: data.message,
                messageId: data.messageId,
                detalhes: data.detalhes
            };
        } catch (error) {
            console.error('Erro ao enviar email de teste:', error);
            throw error;
        }
    }

    /**
     * Envia email de boas-vindas para novo funcionário
     */
    async enviarNovoAcesso(nome, email, senha, urlSistema = null) {
        try {
            if (!nome || !email || !senha) {
                throw new Error('Nome, email e senha são obrigatórios');
            }

            const payload = { nome, email, senha };
            if (urlSistema) payload.urlSistema = urlSistema;

            const response = await fetch('/email/novo-acesso', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Erro ao enviar email');
            }

            return {
                success: true,
                message: data.message,
                messageId: data.messageId
            };
        } catch (error) {
            console.error('Erro ao enviar email de novo acesso:', error);
            throw error;
        }
    }

    /**
     * Envia email de senha resetada
     */
    async enviarSenhaResetada(nome, email, senha, urlSistema = null) {
        try {
            if (!nome || !email || !senha) {
                throw new Error('Nome, email e senha são obrigatórios');
            }

            const payload = { nome, email, senha };
            if (urlSistema) payload.urlSistema = urlSistema;

            const response = await fetch('/email/senha-resetada', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Erro ao enviar email');
            }

            return {
                success: true,
                message: data.message,
                messageId: data.messageId
            };
        } catch (error) {
            console.error('Erro ao enviar email de senha resetada:', error);
            throw error;
        }
    }

    // ============================================
    // UTILITÁRIOS E VALIDAÇÃO
    // ============================================

    /**
     * Valida se um email é válido
     */
    validarEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Exibe notificação sobre status do email
     */
    async mostrarStatusNotificacao() {
        try {
            const status = await this.verificarStatus(true);
            
            const tipo = status.configurado ? 'success' : 'warning';
            const icone = status.configurado ? '✅' : '⚠️';
            const mensagem = `${icone} ${status.message}`;
            
            // Se houver sistema de notificação, usar
            if (window.mostrarNotificacao) {
                window.mostrarNotificacao(mensagem, tipo);
            } else if (window.adicionarNotificacao) {
                window.adicionarNotificacao({
                    tipo: status.configurado ? 'sucesso' : 'aviso',
                    titulo: 'Status do Email',
                    mensagem: status.message
                });
            } else {
                // Fallback para alert
                alert(mensagem);
            }

            return status;
        } catch (error) {
            const mensagem = `❌ Erro ao verificar email: ${error.message}`;
            
            if (window.mostrarNotificacao) {
                window.mostrarNotificacao(mensagem, 'error');
            } else {
                alert(mensagem);
            }
            
            throw error;
        }
    }

    /**
     * Abre página de teste de email
     */
    abrirTesteEmail() {
        const url = `${this.baseUrl}/email-teste.html`;
        window.open(url, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
    }

    // ============================================
    // MÉTODOS DE INTEGRAÇÃO PARA FUNCIONÁRIOS
    // ============================================

    /**
     * Enviar email ao criar novo funcionário (integração com cadastro)
     */
    async notificarNovoFuncionario(dadosFuncionario) {
        try {
            const { nome, email, senha_temporaria } = dadosFuncionario;
            
            if (!nome || !email || !senha_temporaria) {
                console.log('⚠️ Dados insuficientes para enviar email de novo acesso');
                return false;
            }

            const configurado = await this.emailConfigurado();
            if (!configurado) {
                console.log('⚠️ Email não configurado, pulando envio');
                return false;
            }

            const resultado = await this.enviarNovoAcesso(nome, email, senha_temporaria);
            
            console.log('✅ Email de novo acesso enviado:', resultado.message);
            
            // Notificar usuário se possível
            if (window.mostrarNotificacao) {
                window.mostrarNotificacao('📧 Email de boas-vindas enviado!', 'success');
            }

            return true;
        } catch (error) {
            console.error('❌ Erro ao enviar email de novo funcionário:', error);
            
            if (window.mostrarNotificacao) {
                window.mostrarNotificacao(`❌ Erro ao enviar email: ${error.message}`, 'error');
            }
            
            return false;
        }
    }

    /**
     * Enviar email ao resetar senha de funcionário
     */
    async notificarResetSenha(dadosFuncionario) {
        try {
            const { nome, email, senha_nova } = dadosFuncionario;
            
            if (!nome || !email || !senha_nova) {
                console.log('⚠️ Dados insuficientes para enviar email de senha resetada');
                return false;
            }

            const configurado = await this.emailConfigurado();
            if (!configurado) {
                console.log('⚠️ Email não configurado, pulando envio');
                return false;
            }

            const resultado = await this.enviarSenhaResetada(nome, email, senha_nova);
            
            console.log('✅ Email de senha resetada enviado:', resultado.message);
            
            // Notificar usuário se possível
            if (window.mostrarNotificacao) {
                window.mostrarNotificacao('📧 Email de nova senha enviado!', 'success');
            }

            return true;
        } catch (error) {
            console.error('❌ Erro ao enviar email de reset de senha:', error);
            
            if (window.mostrarNotificacao) {
                window.mostrarNotificacao(`❌ Erro ao enviar email: ${error.message}`, 'error');
            }
            
            return false;
        }
    }
}

// ============================================
// INSTÂNCIA GLOBAL E FUNÇÕES DE UTILIDADE
// ============================================

// Criar instância global
const emailService = new EmailService();

// Funções globais para compatibilidade
async function verificarStatusEmail() {
    return await emailService.verificarStatus();
}

async function emailConfigurado() {
    return await emailService.emailConfigurado();
}

async function enviarEmailTeste(destinatario, assunto, mensagem) {
    return await emailService.enviarTeste(destinatario, assunto, mensagem);
}

async function enviarEmailNovoAcesso(nome, email, senha, urlSistema) {
    return await emailService.enviarNovoAcesso(nome, email, senha, urlSistema);
}

async function enviarEmailSenhaResetada(nome, email, senha, urlSistema) {
    return await emailService.enviarSenhaResetada(nome, email, senha, urlSistema);
}

// ============================================
// CONSOLE HELPERS PARA DEBUG
// ============================================

// Adicionar funções ao console global para debug
if (typeof window !== 'undefined') {
    window.emailService = emailService;
    
    // Funções de debug para console
    window.testarEmail = async function(email = 'teste@exemplo.com') {
        console.log('🧪 Testando envio de email...');
        try {
            const resultado = await emailService.enviarTeste(email, 'Teste do Console', 'Email enviado via console do navegador');
            console.log('✅ Sucesso:', resultado);
        } catch (error) {
            console.error('❌ Erro:', error.message);
        }
    };
    
    window.statusEmail = async function() {
        console.log('📊 Verificando status do email...');
        try {
            const status = await emailService.verificarStatus(true);
            console.log(status.configurado ? '✅ Email configurado!' : '⚠️ Email não configurado!', status);
        } catch (error) {
            console.error('❌ Erro:', error.message);
        }
    };
}

// Debug automático se em desenvolvimento
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 EmailService carregado! Comandos disponíveis:');
    console.log('   • emailService.verificarStatus() - Verificar configuração');
    console.log('   • statusEmail() - Verificar status (helper)');
    console.log('   • testarEmail("seu@email.com") - Enviar teste (helper)');
    console.log('   • emailService.abrirTesteEmail() - Abrir ferramenta de teste');
}

// Export para uso em outros módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EmailService, emailService };
}
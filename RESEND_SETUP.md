# 📧 Configuração do Email com Resend

## Por que usar Resend?

- ✅ **Funciona perfeitamente no Railway** (sem problemas de IPv6)
- ✅ **Gratuito até 3.000 emails/mês**
- ✅ **Setup super simples** (1 variável de ambiente)
- ✅ **API moderna e confiável**
- ✅ **Sem portas SMTP ou firewall** para configurar

## 🚀 Passo a Passo

### 1. Criar conta no Resend

1. Acesse https://resend.com
2. Clique em **Sign Up** (pode usar conta GitHub)
3. Confirme seu email

### 2. Gerar API Key

1. Entre no dashboard do Resend
2. Vá em **API Keys** (no menu lateral)
3. Clique em **Create API Key**
4. Dê um nome (ex: "Sistema CIA")
5. Copie a chave gerada (começa com `re_...`)

⚠️ **IMPORTANTE**: Salve a chave agora! Ela só aparece uma vez.

### 3. Configurar no Railway

1. Entre no seu projeto no **Railway**
2. Vá em **Settings** → **Environment** (ou **Variables**)
3. Adicione a variável:

```
RESEND_API_KEY = re_sua_chave_aqui
```

4. **(Opcional)** Personalize o remetente:

```
RESEND_FROM = Sistema CIA <onboarding@resend.dev>
```

5. Clique em **Save** ou **Deploy**

### 4. Testar

Aguarde o Railway fazer o deploy (1-2 minutos) e depois:

1. Acesse: `https://seu-app.railway.app/debug/email-status`
   - Deve mostrar: `✅ Email configurado via RESEND`

2. Teste envio: `https://seu-app.railway.app/email-teste.html`
   - Envie um email de teste

3. Teste recuperação de senha:
   - Vá no login → "Esqueci minha senha"
   - Digite seu email

## 📝 Variáveis de Ambiente

### Obrigatória:
- `RESEND_API_KEY` - Sua API key do Resend

### Opcionais:
- `RESEND_FROM` - Email do remetente (padrão: `onboarding@resend.dev`)
- `EMAIL_FROM` - Alternativa ao RESEND_FROM

## 🎯 Domínio Personalizado (Opcional)

Para usar seu próprio domínio no email (ex: `sistema@suaempresa.com`):

1. No Resend, vá em **Domains**
2. Clique em **Add Domain**
3. Adicione `suaempresa.com`
4. Configure os registros DNS (SPF, DKIM, DMARC)
5. Aguarde verificação
6. Configure `RESEND_FROM=Sistema CIA <sistema@suaempresa.com>`

## ❓ Troubleshooting

### "Email não configurado"
- Verifique se `RESEND_API_KEY` está no Railway
- Confira se o deploy foi feito após adicionar a variável
- Veja os logs: Railway → Deploy → Logs

### "Invalid API key"
- A API key está correta? (começa com `re_`)
- Você copiou toda a chave?
- Teste criar uma nova API key

### "Limit exceeded"
- Plano gratuito: 3.000 emails/mês
- Upgrade para mais: https://resend.com/pricing

## 🔄 Fallback para SMTP

O sistema continua suportando SMTP como fallback. Se Resend falhar, ele tenta SMTP automaticamente se configurado.

Variáveis SMTP (opcional):
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

## 📊 Monitoramento

Veja emails enviados no dashboard do Resend:
- https://resend.com/emails

Você pode ver:
- ✅ Emails entregues
- ❌ Emails que falharam
- 📈 Estatísticas de envio

## 💰 Pricing

- **Free**: 3.000 emails/mês
- **Plano Pago**: A partir de $20/mês (50.000 emails)

Plano gratuito é mais que suficiente para maioria dos casos! 🎉

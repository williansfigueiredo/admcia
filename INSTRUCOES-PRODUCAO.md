# INSTRUÇÕES PARA PRODUÇÃO

## Quando o sistema estiver 100% funcionando:

### 1. LIMPAR package.json

Trocar esta linha:
```json
"start": "node criar-tabelas.js && node importar-dados.js && node server.js"
```

Por:
```json
"start": "node server.js"
```

### 2. ARQUIVOS QUE PODE APAGAR

Após o sistema estar rodando perfeitamente:
- [ ] criar-tabelas.js
- [ ] importar-dados.js  
- [ ] reimportar-dados.js
- [ ] copiar-dados.js
- [ ] dados-local.sql

### 3. ARQUIVOS QUE DEVE MANTER

- [x] server.js (servidor principal)
- [x] database_completo.sql (backup da estrutura)
- [x] Todos os arquivos HTML, CSS, JS do sistema
- [x] package.json (com o start limpo)

### 4. SOBRE OS DADOS

⚠️ IMPORTANTE:
- Dados cadastrados pelos usuários ficam PERMANENTES no Railway MySQL
- NÃO precisa reimportar dados toda vez
- Os scripts são SÓ para setup inicial

### 5. BACKUP

Recomendado fazer backup periódico:
```bash
# Exportar dados atuais do Railway (via Railway CLI ou DBeaver)
mysqldump -h HOST -u USER -p DATABASE > backup-producao.sql
```

### 6. ATUALIZAÇÕES FUTURAS

Se precisar adicionar/modificar tabelas:
1. Crie um script de migration específico
2. Execute UMA VEZ no Railway
3. Remova o script após executar
4. NÃO mantenha scripts rodando automaticamente

---

## RESUMO:

**AGORA:** Scripts rodam automaticamente (setup)
**DEPOIS:** Só o servidor roda (dados já existem)

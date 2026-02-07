const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
// --- BIBLIOTECAS DE ARQUIVO ---
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

// --- LIBERAR PASTA PUBLIC (CSS, JS) ---
app.use('/public', express.static('public'));

// --- LIBERAR PASTA DE UPLOADS ---
app.use('/uploads', express.static('uploads'));


// --- CONFIGURAÇÃO DO UPLOAD (MULTER) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'foto-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- SERVIR ARQUIVOS HTML NA RAIZ ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/invoice', (req, res) => {
  res.sendFile(path.join(__dirname, 'invoice.html'));
});

// --- CONEXÃO COM O BANCO ---
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sistema_gestao_tp',
  port: Number(process.env.DB_PORT || 3306)
});

db.connect((err) => {
  if (err) console.error('Erro ao conectar:', err);
  else console.log('Sucesso! Conectado ao banco de dados MySQL.');
});




// --- ROTAS ---






// 1. Buscar FATURAMENTO (Igual ao anterior)
app.get('/dashboard/faturamento', (req, res) => {
  const sql = "SELECT SUM(valor) as total FROM jobs WHERE status = 'Finalizado' AND pagamento = 'Pago' AND MONTH(data_job) = MONTH(CURRENT_DATE()) AND YEAR(data_job) = YEAR(CURRENT_DATE())";
  db.query(sql, (err, data) => {
    if (err) return res.json(err);
    return res.json(data[0]);
  });
});

// 2. Buscar TODOS OS JOBS (Com JOIN para trazer os nomes)
// No arquivo server.js

// ATUALIZAÇÃO NO SERVER.JS (Rota de Busca)

app.get('/jobs', (req, res) => {
  // AQUI ESTÁ O SEGREDO: "f.nome as nome_operador"
  const sqlJobs = `
        SELECT j.*, 
               c.nome as nome_cliente, c.documento as cliente_documento, 
               f.nome as nome_operador 
        FROM jobs j
        LEFT JOIN clientes c ON j.cliente_id = c.id
        LEFT JOIN funcionarios f ON j.operador_id = f.id
        ORDER BY j.id DESC
    `;

  db.query(sqlJobs, (err, jobs) => {
    if (err) return res.status(500).json(err);

    // Busca Itens
    const sqlItens = "SELECT * FROM job_itens";
    db.query(sqlItens, (err2, itens) => {
      if (err2) return res.status(500).json(err2);

      // Junta tudo
      const jobsCompletos = jobs.map(job => {
        return {
          ...job,
          itens: itens.filter(i => i.job_id === job.id)
        };
      });
      return res.json(jobsCompletos);
    });
  });
});

// --- NOVO: BUSCAR 1 CLIENTE PELO ID (Para Edição) ---
app.get('/clientes/:id', (req, res) => {
  const sql = "SELECT * FROM clientes WHERE id = ?";
  db.query(sql, [req.params.id], (err, data) => {
    if (err) return res.status(500).json(err);
    return res.json(data[0]); // Retorna só o objeto do cliente
  });
});

// --- NOVO: EXCLUIR CLIENTE ---
// --- ATUALIZAÇÃO: EXCLUIR CLIENTE COM TRAVA FINANCEIRA ---
// --- NOVO: EXCLUIR CLIENTE E SEU HISTÓRICO (CASCATA) ---
// --- EXCLUSÃO SEGURA (BLOQUEIA SE TIVER HISTÓRICO) ---
app.delete('/clientes/:id', (req, res) => {
  const id = req.params.id;

  // 1. VERIFICA SE EXISTE QUALQUER PEDIDO (Pago, Pendente, Cancelado...)
  // Se o cliente tem 1 job que seja, ele faz parte da história da empresa.
  const sqlCheck = "SELECT COUNT(*) as qtd FROM jobs WHERE cliente_id = ?";

  db.query(sqlCheck, [id], (err, results) => {
    if (err) return res.status(500).json({ error: "Erro ao verificar histórico." });

    const historico = results[0].qtd;

    if (historico > 0) {
      // TRAVA TOTAL: Tem histórico? Não exclui. Manda inativar.
      return res.status(400).json({
        error: `⚠️ AÇÃO BLOQUEADA POR SEGURANÇA!\n\nEste cliente possui ${historico} pedido(s) no histórico (pagos ou não).\n\nNão é possível excluí-lo pois isso apagaria seus relatórios financeiros.\n\n>> SOLUÇÃO: Edite o cliente e mude o Status para 'Inativo'.`
      });
    }

    // 2. SE NÃO TIVER NENHUM PEDIDO (Cadastro virgem/errado), PODE EXCLUIR.
    const sqlDelete = "DELETE FROM clientes WHERE id = ?";

    db.query(sqlDelete, [id], (errDel, result) => {
      if (errDel) return res.status(500).json({ error: errDel.message });

      res.json({ success: true, message: "Cliente excluído (não possuía histórico)." });
    });
  });
});






// --- NOVO: ATUALIZAR CLIENTE (PUT) ---
app.put('/clientes/:id', (req, res) => {
  const id = req.params.id;
  const d = req.body;

  const sql = `
        UPDATE clientes SET
            nome = ?, nome_fantasia = ?, documento = ?, inscricao_estadual = ?,
            status = ?, site = ?, cep = ?, logradouro = ?, numero = ?, desconto_porcentage = ?
            bairro = ?, cidade = ?, uf = ?, contato1_nome = ?, contato1_cargo = ?,
            contato1_email = ?, contato1_telefone = ?, contato2_nome = ?,
            contato2_cargo = ?, contato2_email = ?, contato2_telefone = ?,
            observacoes = ?
        WHERE id = ?
    `;

  const values = [
    d.nome, d.nome_fantasia, d.documento, d.inscricao_estadual,
    d.status, d.site, d.cep, d.logradouro, d.numero,
    d.bairro, d.cidade, d.uf, d.contato1_nome, d.contato1_cargo,
    d.contato1_email, d.contato1_telefone, d.contato2_nome,
    d.contato2_cargo, d.contato2_email, d.contato2_telefone,
    d.observacoes,
    id // O ID vai por último no WHERE
  ];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true, message: "Cliente atualizado!" });
  });
});

// 3. ROTA NOVA: Buscar Lista de CLIENTES
app.get('/clientes', (req, res) => {
  const sql = "SELECT * FROM clientes"; // <--- Mude para asterisco (*)
  db.query(sql, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});
// 4. ROTA NOVA: Buscar Lista de FUNCIONÁRIOS
app.get('/funcionarios', (req, res) => {
  const sql = "SELECT id, nome FROM funcionarios WHERE status = 'Ativo'";
  db.query(sql, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});


// 5. Cadastrar Job (Inteligente: aceita Agendamento Novo e Antigo)
// NO ARQUIVO SERVER.JS - SUBSTITUA A ROTA app.post('/jobs'...) POR ESTA:

// ATUALIZAÇÃO NO SERVER.JS - Rota de Salvar Job

// SUBSTITUA NO SERVER.JS

app.post('/jobs', (req, res) => {
  const data = req.body;

  // 1. ADICIONADO: Colunas de horário no INSERT
  const sqlJob = `
        INSERT INTO jobs (
            descricao, valor, data_job, data_fim, status, pagamento, cliente_id,
            operador_id, 
            hora_chegada_prevista, hora_inicio_evento, hora_fim_evento, -- 3 NOVOS
            logradouro, numero, bairro, cidade, uf, cep,
            solicitante_nome, solicitante_email, solicitante_telefone,
            producao_local, producao_contato, producao_email,
            pagador_nome, pagador_cnpj, pagador_email, pagador_endereco,
            forma_pagamento, tipo_documento, observacoes, data_inicio,
            desconto_porcentagem, motivo_desconto, vencimento_texto,
            pagador_cep, pagador_logradouro, pagador_numero, pagador_bairro,
            pagador_cidade, pagador_uf, desconto_valor
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, 
            ?, ?, ?,                 -- AS 3 INTERROGAÇÕES NOVAS ESTÃO AQUI
            ?, ?, ?, ?, ?, ?, 
            ?, ?, ?, 
            ?, ?, ?, 
            ?, ?, ?, ?, 
            ?, ?, ?, ?, 
            ?, ?, ?, 
            ?, ?, ?, ?, ?, ?, ?
        )
    `;
  const pagadorEnderecoCompleto = (data.pagador_logradouro || data.endereco?.logradouro)
    ? `${data.pagador_logradouro || data.endereco?.logradouro}, ${data.pagador_numero || data.endereco?.numero} - ${data.pagador_bairro || data.endereco?.bairro}, ${data.pagador_cidade || data.endereco?.cidade}/${data.pagador_uf || data.endereco?.uf}`
    : null;

  // 2. Definição dos Valores (Também tem 41 itens)
  const values = [
    data.descricao || null,
    data.valor || 0,
    data.data_inicio || null, // Note que no banco é data_job, mas salvamos data_inicio
    data.data_fim || null,
    "Agendado",
    "Pendente",
    data.cliente_id || null,
    data.operador_id || null,

    // === OS 3 NOVOS VALORES DE HORÁRIO ===
    data.hora_chegada_prevista || null,
    data.hora_inicio_evento || null,
    data.hora_fim_evento || null,

    data.endereco?.logradouro || null,
    data.endereco?.numero || null,
    data.endereco?.bairro || null,
    data.endereco?.cidade || null,
    data.endereco?.uf || null,
    data.endereco?.cep || null,

    data.solicitante_nome || null,
    data.solicitante_email || null,
    data.solicitante_telefone || null,

    data.producao_local || null,
    data.producao_contato || null,
    data.producao_email || null,

    data.pagador_nome || null,
    data.pagador_cnpj || null,
    data.pagador_email || null,
    pagadorEnderecoCompleto,

    data.forma_pagamento || null,
    data.tipo_documento || null,
    data.observacoes || null,
    data.data_inicio || null,
    0, // desconto_porcentagem
    data.motivo_desconto || null,
    (data.vencimento_texto && data.vencimento_texto.trim() !== '' && data.vencimento_texto !== 'null') ? data.vencimento_texto : "À vista",

    data.pagador_cep || null,
    data.pagador_logradouro || null,
    data.pagador_numero || null,
    data.pagador_bairro || null,
    data.pagador_cidade || null,
    data.pagador_uf || null,
    data.desconto_valor || 0
  ];

  db.query(sqlJob, values, (err, result) => {
    if (err) {
      console.error("Erro INSERT:", err);
      return res.status(500).json({ error: err.message });
    }

    const novoId = result.insertId;

    // =========================================================
    // 3. IMPLEMENTAÇÃO DA NOVA LÓGICA DE EQUIPE (MÚLTIPLOS)
    // =========================================================
    if (data.equipe && data.equipe.length > 0) {
      // A. SALVAR NA TABELA JOB_EQUIPE
      const sqlEquipe = "INSERT INTO job_equipe (job_id, funcionario_id, funcao) VALUES ?";
      const valoresEquipe = data.equipe.map(m => [novoId, m.funcionario_id, m.funcao]);

      db.query(sqlEquipe, [valoresEquipe], (errEq) => {
        if (errEq) console.error("❌ Erro ao inserir lista de equipe:", errEq);
        else console.log("✅ Equipe inserida com sucesso.");
      });

      // B. === AUTOMÁTICO: GRAVAR NA TABELA ESCALAS ===
      // Usa a data de início do Job. Se não tiver, usa a data de hoje.
      const dataParaEscala = data.data_inicio ? data.data_inicio.split('T')[0] : new Date().toISOString().split('T')[0];
      const obsEscala = `Job #${novoId} - ${data.descricao || 'Sem descrição'}`;

      const sqlEscala = "INSERT INTO escalas (funcionario_id, job_id, data_escala, tipo, observacao) VALUES ?";
      // Mapeia os mesmos funcionários para a tabela de escalas
      const valoresEscala = data.equipe.map(m => [
        m.funcionario_id,
        novoId,
        dataParaEscala,
        'Trabalho', // Define como trabalho automaticamente
        obsEscala
      ]);

      db.query(sqlEscala, [valoresEscala], (errEsc) => {
        if (errEsc) console.error("❌ Erro ao inserir na tabela ESCALAS:", errEsc);
        else console.log("✅ Escalas geradas automaticamente para a equipe.");
      });

    }
    // MANTIVE O SEU CÓDIGO ANTIGO COMO FALLBACK (caso não venha a lista 'equipe')
    else if (data.operador_id) {
      const sqlEquipe = "INSERT INTO job_equipe (job_id, funcionario_id, funcao) VALUES (?, ?, ?)";
      db.query(sqlEquipe, [novoId, data.operador_id, 'Operador Principal'], (errEquipe) => {
        if (errEquipe) console.error("❌ Erro ao inserir na job_equipe:", errEquipe);
        else console.log("✅ Operador inserido na equipe do Job:", novoId);
      });

      // Também gera escala para o operador único se for o caso
      const dataParaEscala = data.data_inicio ? data.data_inicio.split('T')[0] : new Date().toISOString().split('T')[0];
      const sqlEscalaUnica = "INSERT INTO escalas (funcionario_id, job_id, data_escala, tipo, observacao) VALUES (?, ?, ?, ?, ?)";
      db.query(sqlEscalaUnica, [data.operador_id, novoId, dataParaEscala, 'Trabalho', `Job #${novoId} (Operador)`], (errEsc) => {
        if (errEsc) console.error("Erro escala operador unico:", errEsc);
      });
    }

    // Processamento de itens (MANTIDO EXATAMENTE IGUAL)
    if (data.itens && data.itens.length > 0) {
      const sqlItens = "INSERT INTO job_itens (job_id, descricao, qtd, valor_unitario, desconto_item, equipamento_id) VALUES ?";
      const itensFormatados = data.itens.map(i => [
        novoId,
        i.descricao,
        i.qtd,
        i.valor,
        i.desconto_item || 0,
        i.equipamento_id || null
      ]);

      db.query(sqlItens, [itensFormatados], (errItens) => {
        if (errItens) console.error("Erro ao inserir itens:", errItens);
        res.json({ message: "Job e Equipe salvos com sucesso!", id: novoId });
      });
    } else {
      res.json({ message: "Job e Equipe salvos com sucesso!", id: novoId });
    }
  });
});

/* =============================================================
   ROTA DE EDIÇÃO DE JOB
   ============================================================= */
app.put('/jobs/:id', (req, res) => {
  const data = req.body;
  const id = req.params.id;

  // MONTAR ENDEREÇO COMPLETO DO PAGADOR
  const pagadorEnderecoCompleto = (data.pagador_logradouro || data.endereco?.logradouro)
    ? `${data.pagador_logradouro || data.endereco?.logradouro}, ${data.pagador_numero || data.endereco?.numero} - ${data.pagador_bairro || data.endereco?.bairro}, ${data.pagador_cidade || data.endereco?.cidade}/${data.pagador_uf || data.endereco?.uf}`
    : null;

  // 1. ADICIONADO: Campos de horário no UPDATE
  const sqlJob = `
        UPDATE jobs SET
            descricao = ?, valor = ?, data_job = ?, data_inicio = ?, data_fim = ?,
            cliente_id = ?, operador_id = ?,
            hora_chegada_prevista = ?, hora_inicio_evento = ?, hora_fim_evento = ?, -- NOVOS CAMPOS
            logradouro = ?, numero = ?, bairro = ?, cidade = ?, uf = ?, cep = ?,
            solicitante_nome = ?, solicitante_email = ?, solicitante_telefone = ?,
            producao_local = ?, producao_contato = ?, producao_email = ?,
            pagador_nome = ?, pagador_cnpj = ?, pagador_email = ?, pagador_endereco = ?,
            forma_pagamento = ?, tipo_documento = ?, observacoes = ?,
            motivo_desconto = ?, vencimento_texto = ?,
            pagador_cep = ?, pagador_logradouro = ?, pagador_numero = ?, pagador_bairro = ?,
            pagador_cidade = ?, pagador_uf = ?, desconto_valor = ?
        WHERE id = ?
    `;

  // 2. ADICIONADO: Valores dos horários no array values
  const values = [
    data.descricao || null,
    data.valor || 0,
    data.data_inicio || null,
    data.data_inicio || null,
    data.data_fim || null,
    data.cliente_id || null,
    data.operador_id || null,

    // NOVOS VALORES
    data.hora_chegada_prevista || null,
    data.hora_inicio_evento || null,
    data.hora_fim_evento || null,

    data.endereco?.logradouro || null,
    data.endereco?.numero || null,
    data.endereco?.bairro || null,
    data.endereco?.cidade || null,
    data.endereco?.uf || null,
    data.endereco?.cep || null,
    data.solicitante_nome || null,
    data.solicitante_email || null,
    data.solicitante_telefone || null,
    data.producao_local || null,
    data.producao_contato || null,
    data.producao_email || null,
    data.pagador_nome || null,
    data.pagador_cnpj || null,
    data.pagador_email || null,
    pagadorEnderecoCompleto,
    data.forma_pagamento || null,
    data.tipo_documento || null,
    data.observacoes || null,
    data.motivo_desconto || null,
    (data.vencimento_texto && data.vencimento_texto.trim() !== '') ? data.vencimento_texto : "À vista",
    data.pagador_cep || null,
    data.pagador_logradouro || null,
    data.pagador_numero || null,
    data.pagador_bairro || null,
    data.pagador_cidade || null,
    data.pagador_uf || null,
    data.desconto_valor || 0,
    id
  ];

  db.query(sqlJob, values, (err, result) => {
    if (err) {
      console.error("Erro UPDATE Job:", err);
      return res.status(500).json({ error: err.message });
    }

    // =========================================================
    // 3. IMPLEMENTAÇÃO DA ATUALIZAÇÃO DA EQUIPE
    // (Limpa a equipe antiga e insere a nova, igual à lógica dos itens)
    // =========================================================

    // A. LIMPA EQUIPE ANTIGA
    db.query("DELETE FROM job_equipe WHERE job_id = ?", [id], (errDelEq) => {
      if (errDelEq) console.error("Erro ao limpar equipe antiga:", errDelEq);

      // B. LIMPA ESCALAS ANTIGAS DESTE JOB (Para recriar atualizado)
      db.query("DELETE FROM escalas WHERE job_id = ?", [id], (errDelEsc) => {
        if (errDelEsc) console.error("Erro ao limpar escalas antigas:", errDelEsc);

        // C. INSERE DADOS NOVOS (SE HOUVER EQUIPE)
        if (data.equipe && data.equipe.length > 0) {

          // 1. INSERE NA JOB_EQUIPE
          const sqlEquipe = "INSERT INTO job_equipe (job_id, funcionario_id, funcao) VALUES ?";
          const valoresEquipe = data.equipe.map(m => [id, m.funcionario_id, m.funcao]);

          db.query(sqlEquipe, [valoresEquipe], (errInsEq) => {
            if (errInsEq) console.error("Erro ao inserir nova equipe:", errInsEq);
          });

          // 2. === AUTOMÁTICO: INSERE NA TABELA ESCALAS ===
          const dataParaEscala = data.data_inicio ? data.data_inicio.split('T')[0] : new Date().toISOString().split('T')[0];
          const obsEscala = `Job #${id} - ${data.descricao || 'Atualizado'}`;

          const sqlEscala = "INSERT INTO escalas (funcionario_id, job_id, data_escala, tipo, observacao) VALUES ?";
          const valoresEscala = data.equipe.map(m => [
            m.funcionario_id,
            id,
            dataParaEscala,
            'Trabalho',
            obsEscala
          ]);

          db.query(sqlEscala, [valoresEscala], (errInsEsc) => {
            if (errInsEsc) console.error("❌ Erro ao atualizar escalas:", errInsEsc);
            else console.log("✅ Escalas atualizadas com sucesso!");
          });
        }
      });
    });

    // =========================================================
    // LÓGICA DE ITENS (MANTIDA EXATAMENTE IGUAL)
    // =========================================================
    db.query("DELETE FROM job_itens WHERE job_id = ?", [id], (errDel) => {
      if (errDel) {
        console.error("Erro ao limpar itens antigos:", errDel);
        return res.status(500).json({ error: errDel.message });
      }

      // SE NÃO TIVER ITENS NOVOS, TERMINA AQUI
      if (!data.itens || data.itens.length === 0) {
        console.log(`Job ${id} atualizado e itens limpos.`);
        return res.json({ message: "Job atualizado (lista de itens zerada)" });
      }

      // SE TIVER ITENS, INSERE OS NOVOS
      const sqlItens = `
                INSERT INTO job_itens (job_id, descricao, qtd, valor_unitario, desconto_item, equipamento_id)
                VALUES ?
            `;

      const itensFormatados = data.itens.map(i => [
        id,
        i.descricao,
        i.qtd,
        i.valor,
        i.desconto_item || 0,
        i.equipamento_id || null
      ]);

      db.query(sqlItens, [itensFormatados], (errIns) => {
        if (errIns) {
          console.error("Erro ao inserir novos itens:", errIns);
          return res.status(500).json({ error: errIns.message });
        }
        console.log(`Job ${id} atualizado com ${itensFormatados.length} novos itens.`);
        res.json({ message: "Job atualizado com novos itens" });
      });
    });
  });
});

// --- ROTA NOVA: DADOS PARA O GRÁFICO ANUAL ---
app.get('/dashboard/grafico-financeiro', (req, res) => {
  // Essa query soma os valores agrupando por mês (1=Jan, 2=Fev...)
  // Apenas do ano atual
  const sql = `
        SELECT 
            MONTH(data_job) as mes, 
            SUM(valor) as total 
        FROM jobs 
        WHERE YEAR(data_job) = YEAR(CURRENT_DATE()) 
          AND status = 'Finalizado' 
          AND pagamento = 'Pago'
        GROUP BY mes 
        ORDER BY mes;
    `;

  db.query(sql, (err, results) => {
    if (err) return res.json(err);

    // O Banco devolve algo tipo: [{mes: 1, total: 5000}, {mes: 2, total: 8000}]
    // Precisamos transformar num array liso de 12 posições: [5000, 8000, 0, 0, ...]

    const dadosPorMes = Array(12).fill(0); // Cria array com 12 zeros

    results.forEach(item => {
      // item.mes vai de 1 a 12, mas array vai de 0 a 11. Então subtraímos 1.
      dadosPorMes[item.mes - 1] = item.total;
    });

    res.json(dadosPorMes);
  });
});


// =============================================================
// ROTA MÁGICA: RECALIBRAR ESTOQUE (CORRIGE QUALQUER ERRO)
// =============================================================
app.get('/debug/recalcular-estoque', (req, res) => {
  console.log("🔄 Iniciando recalibração total de estoque...");

  // 1. PRIMEIRO: Reseta tudo (Disponível = Total)
  // Assume que nada está alugado por enquanto
  const sqlReset = "UPDATE equipamentos SET qtd_disponivel = qtd_total";

  db.query(sqlReset, (err) => {
    if (err) return res.status(500).json({ error: "Erro ao resetar: " + err.message });

    // 2. SEGUNDO: Descobre o que está sendo usado AGORA
    // Soma os itens de pedidos Agendados, Confirmados ou Em Andamento
    const sqlEmUso = `
            SELECT i.equipamento_id, SUM(i.qtd) as total_usado
            FROM job_itens i
            INNER JOIN jobs j ON i.job_id = j.id
            WHERE j.status IN ('Agendado', 'Confirmado', 'Em Andamento')
              AND i.equipamento_id IS NOT NULL
            GROUP BY i.equipamento_id
        `;

    db.query(sqlEmUso, (err2, itensEmUso) => {
      if (err2) return res.status(500).json({ error: "Erro ao calcular uso: " + err2.message });

      console.log(`📉 Encontrados ${itensEmUso.length} equipamentos em uso atualmente.`);

      // 3. TERCEIRO: Abate do estoque disponível
      let processados = 0;

      if (itensEmUso.length === 0) {
        return res.json({ message: "Estoque recalibrado! Nenhum item em uso no momento." });
      }

      itensEmUso.forEach(item => {
        const sqlUpdate = "UPDATE equipamentos SET qtd_disponivel = qtd_disponivel - ? WHERE id = ?";

        db.query(sqlUpdate, [item.total_usado, item.equipamento_id], (err3) => {
          if (err3) console.error(`Erro ao atualizar ID ${item.equipamento_id}:`, err3);

          processados++;
          if (processados === itensEmUso.length) {
            res.json({
              success: true,
              message: "Estoque recalibrado com sucesso com base nos pedidos ativos!",
              detalhes: itensEmUso
            });
          }
        });
      });
    });
  });
});




// Inicia o servidor
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});

// Rota para buscar a Frota
app.get('/veiculos', (req, res) => {
  const sql = "SELECT * FROM veiculos";
  db.query(sql, (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});


app.post('/jobs/update/:id', (req, res) => {
  const { id } = req.params;
  const { campo, valor } = req.body;

  if (!['status', 'pagamento'].includes(campo)) {
    return res.status(400).json({ error: "Campo inválido" });
  }

  const sql = `UPDATE jobs SET ${campo} = ? WHERE id = ?`;
  db.query(sql, [valor, id], (err, result) => {
    if (err) {
      console.error("Erro ao atualizar:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});
/* ADICIONE ESTA ROTA NO server.js PARA DIAGNOSTICAR */

// Rota de Diagnóstico - Execute no terminal ou browser
app.get('/debug/estrutura-jobs', (req, res) => {
  const sql = "DESCRIBE jobs";
  db.query(sql, (err, results) => {
    if (err) return res.json({ error: err.message });

    // Mostra todas as colunas
    const colunas = results.map(r => r.Field);
    const totalColunas = colunas.length;

    res.json({
      total_colunas: totalColunas,
      colunas: colunas,
      estrutura_completa: results
    });
  });
});

/* 
   PARA USAR:
   1. Reinicie o node server.js
   2. Abra no browser: http://localhost:3000/debug/estrutura-jobs
   3. Copie TODO O RESULTADO JSON aqui para análise
   
   Isso vai mostrar:
   - Quantas colunas existem
   - Qual é o nome de cada coluna
   - O tipo de cada coluna
*/

// Rota para Atualizar Status ou Pagamento
app.post('/jobs/update/:id', (req, res) => {
  const { id } = req.params;
  const { campo, valor } = req.body;

  console.log(`Tentando atualizar Job ${id}: ${campo} -> ${valor}`); // DEBUG NO TERMINAL

  // Proteção básica
  if (campo !== 'status' && campo !== 'pagamento') {
    return res.status(400).json({ error: "Campo inválido" });
  }

  const sql = `UPDATE jobs SET ${campo} = ? WHERE id = ?`;
  db.query(sql, [valor, id], (err, result) => {
    if (err) {
      console.error("Erro no SQL:", err);
      return res.status(500).json(err);
    }
    res.json({ success: true });
  });
});

// ROTA DE CADASTRO COMPLETO (PROFISSIONAL)
/* SUBSTITUA A ROTA POST /clientes NO server.js */

app.post('/clientes', (req, res) => {
  const d = req.body;

  const sql = `
        INSERT INTO clientes (
            nome,
            nome_fantasia,
            documento,
            inscricao_estadual,
            status,
            site,
            cep,
            logradouro,
            numero,
            bairro,
            cidade,
            uf,
            desconto_porcentage,
            contato1_nome,
            contato1_cargo,
            contato1_email,
            contato1_telefone,
            contato2_nome,
            contato2_cargo,
            contato2_email,
            contato2_telefone,
            observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  const values = [
    d.nome || null,
    d.nome_fantasia || null,
    d.documento || null,
    d.inscricao_estadual || null,
    d.status || 'Ativo',
    d.site || null,
    d.cep || null,
    d.logradouro || null,
    d.numero || null,
    d.bairro || null,
    d.cidade || null,
    d.uf || null,
    d.contato1_nome || null,
    d.contato1_cargo || null,
    d.contato1_email || null,
    d.contato1_telefone || null,
    d.contato2_nome || null,
    d.contato2_cargo || null,
    d.contato2_email || null,
    d.contato2_telefone || null,
    d.observacoes || null
  ];

  console.log("INSERT Clientes - Valores:", values); // DEBUG

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erro no cadastro:", err);
      return res.status(500).json({ error: err.message });
    }
    console.log("Cliente cadastrado com ID:", result.insertId);
    res.json({ message: "Cadastro realizado!", id: result.insertId });
  });
});

// =============================================================
// ROTA DE EXCLUSÃO INTELIGENTE (DEVOLVE ESTOQUE ANTES DE APAGAR)
// =============================================================
// =============================================================
// ROTA DE EXCLUSÃO INTELIGENTE (CORRIGIDA)
// Só devolve estoque se o pedido estiver ATIVO
// =============================================================
app.delete('/jobs/:id', (req, res) => {
  const { id } = req.params;

  console.log(`🗑️ Solicitada exclusão do Job ${id}...`);

  db.beginTransaction(async (err) => {
    if (err) return res.status(500).json({ message: "Erro de transação" });

    try {
      // 1. PRIMEIRO: DESCOBRIR O STATUS DO PEDIDO
      const job = await new Promise((resolve, reject) => {
        db.query("SELECT status FROM jobs WHERE id = ?", [id], (err, results) => {
          if (err) reject(err);
          else if (!results.length) reject(new Error("Pedido não encontrado"));
          else resolve(results[0]);
        });
      });

      console.log(`📊 Status do pedido a excluir: ${job.status}`);

      // Lista de status que NÃO devem devolver estoque (pois já estão baixados ou nunca saíram)
      // Se estiver Finalizado ou Cancelado, os itens "não estão na rua", então não devolvemos nada.
      const isInativo = (job.status === 'Finalizado' || job.status === 'Cancelado');

      if (isInativo) {
        console.log("🛑 Pedido já inativo (Finalizado/Cancelado). Pulando devolução de estoque.");
      } else {
        // 2. SE ESTIVER ATIVO: DEVOLVER O ESTOQUE
        const buscarItens = () => {
          return new Promise((resolve, reject) => {
            db.query("SELECT equipamento_id, qtd FROM job_itens WHERE job_id = ?", [id], (err, results) => {
              if (err) reject(err);
              else resolve(results);
            });
          });
        };

        const itens = await buscarItens();

        if (itens.length > 0) {
          console.log(`📦 Pedido Ativo: Devolvendo ${itens.length} itens ao estoque...`);

          const atualizacoes = itens.map(item => {
            if (!item.equipamento_id) return Promise.resolve();

            return new Promise((resolve, reject) => {
              const sqlDevolucao = "UPDATE equipamentos SET qtd_disponivel = qtd_disponivel + ? WHERE id = ?";
              db.query(sqlDevolucao, [item.qtd, item.equipamento_id], (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          });

          await Promise.all(atualizacoes);
          console.log("✅ Estoque devolvido com sucesso.");
        }
      }

      // 3. APAGA OS ITENS DO PEDIDO (Limpeza do banco)
      await new Promise((resolve, reject) => {
        db.query("DELETE FROM job_itens WHERE job_id = ?", [id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 4. APAGA O PEDIDO (CABEÇALHO)
      await new Promise((resolve, reject) => {
        db.query("DELETE FROM jobs WHERE id = ?", [id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 5. CONFIRMA TUDO
      db.commit((err) => {
        if (err) {
          return db.rollback(() => res.status(500).json({ message: "Erro no commit final" }));
        }

        const msg = isInativo
          ? "Pedido excluído (Estoque mantido pois já estava finalizado/cancelado)."
          : "Pedido excluído e estoque devolvido com sucesso!";

        res.json({ success: true, message: msg });
      });

    } catch (error) {
      console.error("❌ Erro na exclusão:", error);
      db.rollback(() => res.status(500).json({ message: "Erro ao excluir: " + error.message }));
    }
  });
});


// === ROTA 1: Validar se pode mudar status do cliente ===
app.post('/clientes/:id/pode-alterar-status', (req, res) => {
  const { id } = req.params;
  const { novo_status } = req.body;

  // Se mantém como Ativo, permite sem verificar
  if (novo_status === 'Ativo') {
    return res.json({ permitido: true });
  }

  // Verifica se tem pedidos com pagamento não finalizado
  const sql = `
        SELECT COUNT(*) as qtd 
        FROM jobs 
        WHERE cliente_id = ? 
          AND pagamento != 'Pago' 
          AND pagamento != 'Cancelado'
    `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro na validação:", err);
      return res.status(500).json({ error: err.message });
    }

    const temPendencia = results[0].qtd > 0;

    if (temPendencia) {
      return res.status(400).json({
        permitido: false,
        error: `⚠️ STATUS NÃO PODE SER ALTERADO!\n\nEste cliente possui ${results[0].qtd} pedido(s) com pagamento pendente/vencido.\n\nResolva os pagamentos antes de bloquear ou desativar o cliente.`
      });
    }

    res.json({ permitido: true });
  });
});



// === ROTA 2: Endpoint simples para teste (debug) ===
app.get('/debug/clientes/:id/pendencias', (req, res) => {
  const { id } = req.params;

  const sql = `
        SELECT pagamento, COUNT(*) as qtd 
        FROM jobs 
        WHERE cliente_id = ? 
        GROUP BY pagamento
    `;

  db.query(sql, [id], (err, results) => {
    if (err) return res.json({ error: err.message });
    res.json({
      cliente_id: id,
      resumo_por_status: results,
      tem_pendencia: results.some(r => r.pagamento !== 'Pago' && r.pagamento !== 'Cancelado')
    });
  });
});


// 1. CADASTRAR (POST com upload.single)
app.post('/equipamentos', upload.single('foto'), (req, res) => {
  console.log("=== CADASTRO COM FOTO ===");
  const d = req.body;
  const nomeImagem = req.file ? req.file.filename : null;

  // ADICIONADO: n_serie
  const sql = `
        INSERT INTO equipamentos (
            nome, categoria, qtd_total, qtd_disponivel, valor_diaria, 
            status, marca, modelo, n_serie, observacoes, imagem
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  const values = [
    d.nome, d.categoria, d.qtd_total, d.qtd_disponivel, d.valor_diaria,
    d.status, d.marca, d.modelo, d.n_serie, d.observacoes, nomeImagem
  ];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Equipamento salvo!", id: result.insertId });
  });
});



// 5. ROTA DE EDIÇÃO COM FOTO (PUT)
// O PUT não lida bem com arquivos em alguns navegadores, vamos usar POST para update com arquivo ou lógica condicional
// Vamos fazer uma rota específica ou ajustar a lógica. Para simplificar, vou manter PUT mas usando FormData no front.
// --- ROTA: ATUALIZAR EQUIPAMENTO (COM FOTO E LOGS) ---
app.put('/equipamentos/:id', upload.single('foto'), (req, res) => {
  const id = req.params.id;
  const d = req.body;
  console.log(`=== EDITANDO ID ${id} ===`);

  // ADICIONADO: n_serie
  let sql = `
        UPDATE equipamentos SET 
            nome = ?, categoria = ?, qtd_total = ?, qtd_disponivel = ?, 
            valor_diaria = ?, status = ?, marca = ?, modelo = ?, n_serie = ?, observacoes = ?
    `;

  let values = [
    d.nome, d.categoria, d.qtd_total, d.qtd_disponivel,
    d.valor_diaria, d.status, d.marca, d.modelo, d.n_serie, d.observacoes
  ];

  if (req.file) {
    sql += `, imagem = ?`;
    values.push(req.file.filename);
  }

  sql += ` WHERE id = ?`;
  values.push(id);

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true, message: "Item atualizado!" });
  });
});
// =======================================================
//          ROTAS DE EQUIPAMENTOS (COM FOTO)
// =======================================================

// 1. LISTAR
app.get('/equipamentos', (req, res) => {
  db.query("SELECT * FROM equipamentos", (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

// 1. CADASTRAR (POST com upload.single)
app.post('/equipamentos', upload.single('foto'), (req, res) => {
  console.log("=== CADASTRO COM FOTO ===");
  const d = req.body;
  const nomeImagem = req.file ? req.file.filename : null;

  // ADICIONADO: n_serie
  const sql = `
        INSERT INTO equipamentos (
            nome, categoria, qtd_total, qtd_disponivel, valor_diaria, 
            status, marca, modelo, n_serie, observacoes, imagem
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  const values = [
    d.nome, d.categoria, d.qtd_total, d.qtd_disponivel, d.valor_diaria,
    d.status, d.marca, d.modelo, d.n_serie, d.observacoes, nomeImagem
  ];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Equipamento salvo!", id: result.insertId });
  });
});


// 3. EDITAR (PUT com upload.single)
app.put('/equipamentos/:id', upload.single('foto'), (req, res) => {
  const id = req.params.id;
  const d = req.body;
  console.log(`=== EDITANDO ID ${id} ===`);

  // ADICIONADO: n_serie
  let sql = `
        UPDATE equipamentos SET 
            nome = ?, categoria = ?, qtd_total = ?, qtd_disponivel = ?, 
            valor_diaria = ?, status = ?, marca = ?, modelo = ?, n_serie = ?, observacoes = ?
    `;

  let values = [
    d.nome, d.categoria, d.qtd_total, d.qtd_disponivel,
    d.valor_diaria, d.status, d.marca, d.modelo, d.n_serie, d.observacoes
  ];

  if (req.file) {
    sql += `, imagem = ?`;
    values.push(req.file.filename);
  }

  sql += ` WHERE id = ?`;
  values.push(id);

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true, message: "Item atualizado!" });
  });
});



// 4. EXCLUIR
app.delete('/equipamentos/:id', (req, res) => {
  db.query("DELETE FROM equipamentos WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true, message: "Item excluído!" });
  });
});



// ============================================
// ROTA: VALIDAR ESTOQUE ANTES DE SALVAR
// Insira ANTES da rota DELETE /equipamentos/:id
// ============================================
// ROTA: VALIDAR ESTOQUE ANTES DE SALVAR (CORRIGIDA)
// Insira ANTES da rota DELETE /equipamentos/:id
// ============================================
app.post('/jobs/validar-estoque', (req, res) => {
  const { itens } = req.body;

  console.log("🔍 [VALIDAR ESTOQUE] Itens recebidos:", itens);

  // Se não tem itens, está OK
  if (!itens || itens.length === 0) {
    console.log("✅ [VALIDAR ESTOQUE] Sem itens, retornando OK");
    return res.json({ valido: true });
  }

  // Pega os IDs dos equipamentos
  const idsEquipamentos = itens
    .map(i => i.equipamento_id)
    .filter(id => id); // Remove nulos/undefined

  if (idsEquipamentos.length === 0) {
    console.log("✅ [VALIDAR ESTOQUE] Sem equipamentos específicos");
    return res.json({ valido: true });
  }

  // Query para buscar quantidade disponível
  const placeholders = idsEquipamentos.map(() => '?').join(',');
  const sql = `SELECT id, nome, qtd_disponivel, qtd_total FROM equipamentos WHERE id IN (${placeholders})`;

  console.log("🔍 [VALIDAR ESTOQUE] SQL:", sql);
  console.log("🔍 [VALIDAR ESTOQUE] IDs:", idsEquipamentos);

  db.query(sql, idsEquipamentos, (err, equipamentos) => {
    if (err) {
      console.error("❌ [VALIDAR ESTOQUE] Erro SQL:", err);
      return res.status(500).json({
        valido: false,
        erro: err.message
      });
    }

    console.log("✅ [VALIDAR ESTOQUE] Equipamentos encontrados:", equipamentos);

    let problemas = [];

    // Verifica cada item solicitado
    itens.forEach(item => {
      if (!item.equipamento_id) {
        console.log("⏭️ [VALIDAR ESTOQUE] Item sem equipamento_id, pulando");
        return;
      }

      // Usar '==' para ignorar diferença entre string e número
      const equip = equipamentos.find(e => e.id == item.equipamento_id);

      console.log(`🔍 [VALIDAR ESTOQUE] Item: Equip=${item.equipamento_id}, Qtd=${item.qtd}, Encontrado:`, equip);

      if (!equip) {
        problemas.push(`❌ Equipamento ID ${item.equipamento_id} não encontrado`);
      } else if (equip.qtd_disponivel < item.qtd) {
        problemas.push(
          `❌ Estoque insuficiente para "${equip.nome}":\n` +
          `   Disponível: ${equip.qtd_disponivel} | Solicitado: ${item.qtd}`
        );
      }
    });

    if (problemas.length > 0) {
      console.log("❌ [VALIDAR ESTOQUE] Problemas encontrados:", problemas);
      return res.status(400).json({
        valido: false,
        mensagem: problemas.join('\n\n')
      });
    }

    // Tudo OK
    console.log("✅ [VALIDAR ESTOQUE] Validação OK!");
    res.json({ valido: true });
  });
});



// ============================================
// ROTA: BAIXAR ESTOQUE (Ao salvar pedido com sucesso)
// Insira ANTES da rota DELETE /equipamentos/:id
// ============================================
app.post('/jobs/:jobId/baixar-estoque', (req, res) => {
  const { jobId } = req.params;
  const { itens } = req.body;

  console.log(`\n🔽 [BAIXAR ESTOQUE] Job ${jobId} - Itens:`, itens);

  // Se não tem itens, nada para fazer
  if (!itens || itens.length === 0) {
    console.log(`✅ [BAIXAR ESTOQUE] Nenhum item com equipamento_id`);
    return res.json({ sucesso: true, mensagem: "Sem itens para baixar" });
  }

  let atualizados = 0;
  let erros = [];

  // Processa cada item
  itens.forEach((item, index) => {
    if (!item.equipamento_id) {
      console.log(`⏭️ [BAIXAR ESTOQUE] Item ${index} sem equipamento_id, pulando`);
      atualizados++;
      return;
    }

    console.log(`\n📦 [BAIXAR ESTOQUE] Item ${index}:`, item);

    const sql = `
            UPDATE equipamentos 
            SET qtd_disponivel = qtd_disponivel - ? 
            WHERE id = ? AND qtd_disponivel >= ?
        `;

    const valores = [item.qtd, item.equipamento_id, item.qtd];

    console.log(`   SQL: ${sql}`);
    console.log(`   Valores: [${valores}]`);

    db.query(sql, valores, (err, result) => {
      if (err) {
        console.error(`❌ [BAIXAR ESTOQUE] Erro no item ${index}:`, err);
        erros.push(`Erro ao atualizar equipamento ID ${item.equipamento_id}: ${err.message}`);
      } else {
        console.log(`   Result:`, result);

        if (result.affectedRows === 0) {
          console.warn(`⚠️ [BAIXAR ESTOQUE] Falha - Estoque insuficiente para equip ${item.equipamento_id}`);
          erros.push(`Estoque insuficiente para equipamento ID ${item.equipamento_id}`);
        } else {
          console.log(`✅ [BAIXAR ESTOQUE] Equipamento ${item.equipamento_id} - ${item.qtd} unidades baixadas`);
        }
      }

      atualizados++;

      // Quando todas as queries terminarem
      if (atualizados === itens.length) {
        console.log(`\n📊 [BAIXAR ESTOQUE] Finalizado! Erros: ${erros.length}`);

        if (erros.length > 0) {
          console.error("❌ [BAIXAR ESTOQUE] Houve erros:", erros);
          return res.status(400).json({
            sucesso: false,
            mensagem: erros.join('\n')
          });
        }

        console.log("✅ [BAIXAR ESTOQUE] Tudo ok!");
        res.json({
          sucesso: true,
          mensagem: "Estoque atualizado com sucesso"
        });
      }
    });
  });
});

// ============================================
// ROTA: DEVOLVER ESTOQUE (Se cancelar/editar pedido)
// Insira ANTES da rota DELETE /equipamentos/:id
// ============================================
// ============================================
// ROTA: DEVOLVER ESTOQUE (CORRIGIDA E BLINDADA)
// ============================================
app.post('/jobs/:jobId/devolver-estoque', (req, res) => {
  const { jobId } = req.params;
  const { itens } = req.body;

  console.log(`\n↩️ [DEVOLVER ESTOQUE] Job ${jobId} - Iniciando devolução...`);

  if (!itens || itens.length === 0) {
    console.log(`✅ [DEVOLVER ESTOQUE] Sem itens para devolver`);
    return res.json({ sucesso: true });
  }

  let processados = 0;
  let erros = [];

  itens.forEach((item, index) => {
    // Pula se não tiver ID
    if (!item.equipamento_id) {
      processados++;
      verificarFim();
      return;
    }

    // Garante que é número para evitar erro de texto '1' + 1 = '11'
    const idEquip = parseInt(item.equipamento_id);
    const qtdDevolver = parseInt(item.qtd);

    console.log(`📦 Processando Item: ID ${idEquip} | Qtd a devolver: ${qtdDevolver}`);

    // SQL BLINDADO: 
    // 1. COALESCE(qtd_disponivel, 0) -> Transforma NULL em 0 antes de somar
    // 2. Garante que soma matematicamente
    const sql = `
            UPDATE equipamentos 
            SET qtd_disponivel = COALESCE(qtd_disponivel, 0) + ? 
            WHERE id = ?
        `;

    db.query(sql, [qtdDevolver, idEquip], (err, result) => {
      if (err) {
        console.error(`❌ Erro SQL no item ${idEquip}:`, err);
        erros.push(`Erro técnico no ID ${idEquip}`);
      } else {
        // AGORA VERIFICAMOS SE O BANCO REALMENTE ACHOU O ITEM
        if (result.affectedRows === 0) {
          console.warn(`⚠️ ALERTA: Equipamento ID ${idEquip} não foi encontrado no banco! Nada foi alterado.`);
          erros.push(`Equipamento ID ${idEquip} não existe no cadastro.`);
        } else {
          console.log(`✅ Sucesso: Equipamento ${idEquip} recebeu +${qtdDevolver} (Linhas alteradas: ${result.affectedRows})`);
        }
      }

      processados++;
      verificarFim();
    });
  });

  function verificarFim() {
    if (processados === itens.length) {
      console.log(`\n📊 [DEVOLVER ESTOQUE] Finalizado. Erros: ${erros.length}`);

      if (erros.length > 0) {
        return res.status(400).json({
          sucesso: false,
          mensagem: erros.join('\n')
        });
      }

      res.json({
        sucesso: true,
        mensagem: "Estoque devolvido com sucesso"
      });
    }
  }
});


// =======================================================
//          ROTAS DE FUNCIONÁRIOS (RH) - IMPORTANTE
// =======================================================

// 1. LISTAR TODOS OS FUNCIONÁRIOS (Completo)
app.get('/funcionarios/completo', (req, res) => {
  // Busca tudo para preencher os cards e a lista
  const sql = "SELECT * FROM funcionarios ORDER BY status ASC, nome ASC";
  db.query(sql, (err, data) => {
    if (err) {
      console.error("Erro ao buscar funcionarios:", err);
      return res.status(500).json(err);
    }
    return res.json(data);
  });
});

// 2. CADASTRAR FUNCIONÁRIO
// ROTA CADASTRAR COM LOGS DETALHADOS (DEBUG)
app.post('/funcionarios', (req, res) => {
  console.log("📥 TENTATIVA DE CADASTRO RECEBIDA:");
  console.log(req.body); // Mostra os dados que chegaram do front

  const d = req.body;

  // SQL atualizado com todos os campos novos
  const sql = `
        INSERT INTO funcionarios (
            nome, cargo, departamento, email, telefone, 
            cpf, data_admissao, data_demissao, endereco, status, observacoes,
            cep, logradouro, numero, bairro, cidade, uf
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  const demissao = d.data_demissao ? d.data_demissao : null;

  const values = [
    d.nome, d.cargo, d.departamento, d.email, d.telefone,
    d.cpf, d.data_admissao, demissao, d.endereco,
    d.status || 'Ativo', d.observacoes,
    d.cep, d.logradouro, d.numero, d.bairro, d.cidade, d.uf
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("❌ ERRO NO BANCO DE DADOS:", err.sqlMessage); // Mostra o motivo exato
      return res.status(500).json({ error: "Erro no Banco: " + err.sqlMessage });
    }
    console.log("✅ SUCESSO! ID Criado:", result.insertId);
    res.json({ message: "Funcionário cadastrado!", id: result.insertId });
  });
});


// 3. ATUALIZAR FUNCIONÁRIO (ATUALIZADO)
app.put('/funcionarios/:id', (req, res) => {
  const id = req.params.id;
  const d = req.body;
  const sql = `
        UPDATE funcionarios SET 
            nome=?, cargo=?, departamento=?, email=?, telefone=?, 
            cpf=?, data_admissao=?, data_demissao=?, status=?, observacoes=?,
            cep=?, logradouro=?, numero=?, bairro=?, cidade=?, uf=?
        WHERE id=?
    `;

  const demissao = d.data_demissao ? d.data_demissao : null;

  const values = [
    d.nome, d.cargo, d.departamento, d.email, d.telefone,
    d.cpf, d.data_admissao, demissao, d.status, d.observacoes,
    d.cep, d.logradouro, d.numero, d.bairro, d.cidade, d.uf,
    id
  ];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Funcionário atualizado!" });
  });
});




// 4. EXCLUIR FUNCIONÁRIO
app.delete('/funcionarios/:id', (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM funcionarios WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Funcionário excluído!" });
  });
});


// Buscar itens de um Job (para cancelar / devolver estoque com segurança)
app.get('/jobs/:jobId/itens', (req, res) => {
  const { jobId } = req.params;

  const sql = `
    SELECT descricao, qtd, valor_unitario AS valor, desconto_item, equipamento_id
    FROM job_itens
    WHERE job_id = ?
  `;

  db.query(sql, [jobId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ sucesso: true, itens: rows || [] });
  });
});


// =======================================================
//          ROTAS DE CALENDÁRIO E EQUIPE
// =======================================================

// 1. BUSCAR TUDO PARA O CALENDÁRIO (MANUAL + JOBS)
// =======================================================
//          ROTA DE CALENDÁRIO (COM CORES DOS PILLS)
// =======================================================
// Busca TUDO (Escalas Manuais + Jobs com Cores IGUAIS aos Pills)

app.get('/agenda', (req, res) => {
  const sql = `
        SELECT 
            CONCAT('escala-', e.id) as id,
            e.data_escala as start, 
            e.data_escala as end, 
            CONCAT(f.nome, ' | Escala') as title,
            e.tipo as description,
            f.id as operador_id,
            f.nome as operador_nome,
            '' as localizacao,
            '#3b82f6' as backgroundColor,
            '#3b82f6' as borderColor,
            'escala' as tipo_evento
        FROM escalas e
        JOIN funcionarios f ON e.funcionario_id = f.id
        
        UNION ALL
        
        SELECT 
            CONCAT('job-', j.id) as id,
            j.data_inicio as start, 
            j.data_fim as end, 
            CONCAT(j.descricao, ' | ', f.nome) as title,
            j.status as description,
            f.id as operador_id,
            f.nome as operador_nome,
            CONCAT(j.logradouro, ', ', j.numero, ' - ', j.bairro, ', ', j.cidade) as localizacao,
            CASE 
                WHEN j.status = 'Agendado' THEN '#0284c7'      -- Azul VIVO
                WHEN j.status = 'Em Andamento' THEN '#16a34a'  -- Verde VIVO
                WHEN j.status = 'Confirmado' THEN '#d97706'    -- Laranja VIVO
                WHEN j.status = 'Finalizado' THEN '#64748b'    -- Cinza escuro VIVO
                WHEN j.status = 'Cancelado' THEN '#dc2626'     -- Vermelho VIVO
                ELSE '#475569'                                 -- Cinza padrão
            END as backgroundColor,
            CASE 
                WHEN j.status = 'Agendado' THEN '#0284c7'      -- Azul VIVO
                WHEN j.status = 'Em Andamento' THEN '#16a34a'  -- Verde VIVO
                WHEN j.status = 'Confirmado' THEN '#d97706'    -- Laranja VIVO
                WHEN j.status = 'Finalizado' THEN '#64748b'    -- Cinza escuro VIVO
                WHEN j.status = 'Cancelado' THEN '#dc2626'     -- Vermelho VIVO
                ELSE '#475569'                                 -- Cinza padrão
            END as borderColor,
            'job' as tipo_evento
        FROM jobs j
        LEFT JOIN funcionarios f ON j.operador_id = f.id
        WHERE j.data_inicio IS NOT NULL
    `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Erro ao buscar agenda:", err);
      return res.status(500).json({ error: err.message });
    }

    console.log(`✅ Agenda retornou ${results.length} eventos`);

    res.json(results);
  });
});

// 3. VINCULAR FUNCIONÁRIO AO JOB (Para aparecer automático depois)
// Você vai usar essa rota quando estiver na tela de Jobs
app.post('/jobs/equipe', (req, res) => {
  const { job_id, funcionario_id, funcao } = req.body;
  const sql = "INSERT INTO job_equipe (job_id, funcionario_id, funcao) VALUES (?, ?, ?)";
  db.query(sql, [job_id, funcionario_id, funcao], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Funcionário adicionado ao Job!" });
  });
});


app.get('/jobs/:id/equipe', (req, res) => {
  const sql = `
        SELECT je.*, f.nome, f.cargo 
        FROM job_equipe je
        JOIN funcionarios f ON je.funcionario_id = f.id
        WHERE je.job_id = ?
    `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});


// ROTA PARA CRIAR ESCALA MANUAL
app.post('/escalas', (req, res) => {
  const data = req.body;
  console.log("📥 Recebendo tentativa de escala:", data);

  const sql = `
        INSERT INTO escalas (funcionario_id, data_escala, tipo, observacao, job_id)
        VALUES (?, ?, ?, ?, ?)
    `;

  // Mapeamento dos dados
  const values = [
    data.funcionario_id,     // ID do funcionário
    data.data,               // Data (Frontend manda como 'data', banco grava em 'data_escala')
    data.tipo,               // Tipo (Folga, Trabalho, etc)
    data.obs || null,        // Observação
    data.job_id || null      // Job ID (opcional, pode ser nulo se for folga manual)
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("❌ Erro ao salvar escala:", err);
      return res.status(500).json({ error: err.message });
    }
    console.log("✅ Escala salva com ID:", result.insertId);
    res.json({ message: "Escala salva com sucesso!", id: result.insertId });
  });
});

// ROTA PARA LER AS ESCALAS (Para aparecer no calendário depois)
app.get('/escalas', (req, res) => {
  const sql = `
        SELECT e.*, f.nome as nome_funcionario 
        FROM escalas e
        JOIN funcionarios f ON e.funcionario_id = f.id
    `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});



// ROTA: BUSCAR HISTÓRICO DE JOBS DE UM FUNCIONÁRIO
// ROTA: BUSCAR HISTÓRICO (UNINDO EQUIPE + OPERADOR PRINCIPAL)
app.get('/funcionarios/:id/historico', (req, res) => {
  const id = req.params.id;
  console.log(`🔎 Buscando histórico completo para Func ID: ${id}`);

  const sql = `
        /* 1. Busca se ele está na lista de EQUIPE (Tabela Nova) */
        SELECT j.id, j.descricao, j.data_inicio, j.status, je.funcao
        FROM jobs j
        JOIN job_equipe je ON j.id = je.job_id
        WHERE je.funcionario_id = ?

        UNION ALL

        /* 2. Busca se ele é o OPERADOR PRINCIPAL (Tabela Antiga/Dropdown) */
        SELECT j.id, j.descricao, j.data_inicio, j.status, 'Operador Principal' as funcao
        FROM jobs j
        WHERE j.operador_id = ?

        ORDER BY data_inicio DESC
    `;

  // Passamos o ID duas vezes (uma para cada ?)
  db.query(sql, [id, id], (err, results) => {
    if (err) {
      console.error("❌ Erro SQL Histórico:", err);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Encontrados ${results.length} registros no total.`);
    res.json(results);
  });
});
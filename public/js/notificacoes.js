/* =============================================================
   SISTEMA DE NOTIFICAÇÕES
   ============================================================= */

// Armazena notificações no localStorage
function obterNotificacoes() {
  const notificacoes = localStorage.getItem('notificacoes');
  return notificacoes ? JSON.parse(notificacoes) : [];
}

function salvarNotificacoes(notificacoes) {
  localStorage.setItem('notificacoes', JSON.stringify(notificacoes));
  atualizarBadgeNotificacoes();
}

// Adiciona uma nova notificação
function adicionarNotificacao(tipo, titulo, texto) {
  const notificacoes = obterNotificacoes();
  const novaNotificacao = {
    id: Date.now(),
    tipo, // 'sucesso', 'alerta', 'erro', 'info'
    titulo,
    texto,
    lida: false,
    timestamp: new Date().toISOString()
  };
  
  notificacoes.unshift(novaNotificacao);
  
  // Mantém apenas as últimas 50 notificacoes
  if (notificacoes.length > 50) {
    notificacoes.splice(50);
  }
  
  salvarNotificacoes(notificacoes);
  renderizarNotificacoes();
}

// Renderiza as notificações no dropdown
function renderizarNotificacoes() {
  const notificacoes = obterNotificacoes();
  const lista = document.getElementById('listaNotificacoes');
  
  if (!lista) return;
  
  if (notificacoes.length === 0) {
    lista.innerHTML = `
      <div class="text-center text-muted py-4">
        <i class="bi bi-bell-slash fs-3"></i>
        <p class="mb-0 mt-2 small">Nenhuma notificação</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  notificacoes.forEach(notif => {
    const icone = {
      'sucesso': 'bi-check-circle-fill',
      'alerta': 'bi-exclamation-triangle-fill',
      'erro': 'bi-x-circle-fill',
      'info': 'bi-info-circle-fill'
    }[notif.tipo] || 'bi-bell-fill';
    
    const tempo = formatarTempoNotificacao(new Date(notif.timestamp));
    
    html += `
      <div class="notificacao-item ${notif.lida ? '' : 'nao-lida'}" onclick="marcarComoLida(${notif.id})">
        <div class="notificacao-icon tipo-${notif.tipo}">
          <i class="bi ${icone}"></i>
        </div>
        <div class="notificacao-conteudo">
          <div class="notificacao-titulo">${notif.titulo}</div>
          <div class="notificacao-texto">${notif.texto}</div>
          <div class="notificacao-tempo">${tempo}</div>
        </div>
      </div>
    `;
  });
  
  lista.innerHTML = html;
}

// Formata o tempo da notificação (ex: "Há 5 minutos")
function formatarTempoNotificacao(data) {
  const agora = new Date();
  const diff = agora - data;
  const minutos = Math.floor(diff / 60000);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  
  if (minutos < 1) return 'Agora';
  if (minutos < 60) return `Há ${minutos} minuto${minutos > 1 ? 's' : ''}`;
  if (horas < 24) return `Há ${horas} hora${horas > 1 ? 's' : ''}`;
  if (dias < 7) return `Há ${dias} dia${dias > 1 ? 's' : ''}`;
  
  return data.toLocaleDateString('pt-BR');
}

// Atualiza o badge de contagem
function atualizarBadgeNotificacoes() {
  const notificacoes = obterNotificacoes();
  const naoLidas = notificacoes.filter(n => !n.lida).length;
  const badge = document.getElementById('badgeNotificacoes');
  
  if (badge) {
    if (naoLidas > 0) {
      badge.textContent = naoLidas > 99 ? '99+' : naoLidas;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Toggle do dropdown de notificações
function toggleNotificacoes() {
  const dropdown = document.getElementById('dropdownNotificacoes');
  if (!dropdown) return;
  
  if (dropdown.style.display === 'none' || dropdown.style.display === '') {
    dropdown.style.display = 'block';
    renderizarNotificacoes();
    
    // Fecha ao clicar fora
    setTimeout(() => {
      document.addEventListener('click', fecharNotificacoesAoClicarFora);
    }, 100);
  } else {
    dropdown.style.display = 'none';
    document.removeEventListener('click', fecharNotificacoesAoClicarFora);
  }
}

function fecharNotificacoesAoClicarFora(event) {
  const dropdown = document.getElementById('dropdownNotificacoes');
  const botao = document.getElementById('btnNotificacoes');
  
  if (dropdown && botao && !dropdown.contains(event.target) && !botao.contains(event.target)) {
    dropdown.style.display = 'none';
    document.removeEventListener('click', fecharNotificacoesAoClicarFora);
  }
}

// Marca notificação como lida
function marcarComoLida(id) {
  const notificacoes = obterNotificacoes();
  const notif = notificacoes.find(n => n.id === id);
  if (notif) {
    notif.lida = true;
    salvarNotificacoes(notificacoes);
    renderizarNotificacoes();
  }
}

// Limpa todas as notificações
function limparTodasNotificacoes() {
  if (confirm('Deseja limpar todas as notificações?')) {
    localStorage.setItem('notificacoes', JSON.stringify([]));
    renderizarNotificacoes();
    atualizarBadgeNotificacoes();
  }
}

// Verifica pedidos vencidos e próximos do vencimento
async function verificarVencimentosPedidos() {
  try {
    const response = await fetch(`${window.API_URL || 'http://localhost:3000'}/jobs`);
    if (!response.ok) return;
    
    const jobs = await response.json();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Obtém IDs de notificações já enviadas hoje
    const notificacoesHoje = obterNotificacoesEnviadasHoje();
    
    jobs.forEach(job => {
      if (!job.data_job || job.status === 'Cancelado' || job.pagamento === 'Pago') return;
      
      const dataJob = new Date(job.data_job);
      dataJob.setHours(0, 0, 0, 0);
      
      const diffDias = Math.ceil((dataJob - hoje) / (1000  * 60 * 60 * 24));
      
      // Cria chave única para evitar notificações duplicadas
      const chaveNotif = `job-${job.id}-${diffDias}`;
      
      // Se já enviou notificação para este job hoje, pula
      if (notificacoesHoje.includes(chaveNotif)) return;
      
      // Pedido vencido
      if (diffDias < 0) {
        const diasAtrasado = Math.abs(diffDias);
        adicionarNotificacao(
          'erro',
          '⏰ Pedido Vencido',
          `O pedido "${job.descricao}" está atrasado há ${diasAtrasado} dia${diasAtrasado > 1 ? 's' : ''}`
        );
        salvarNotificacaoEnviada(chaveNotif);
      }
      // Falta 2 dias para vencer
      else if (diffDias === 2) {
        adicionarNotificacao(
          'alerta',
          '⚠️ Pedido Próximo do Vencimento',
          `O pedido "${job.descricao}" vence em 2 dias (${dataJob.toLocaleDateString('pt-BR')})`
        );
        salvarNotificacaoEnviada(chaveNotif);
      }
      // Vence hoje
      else if (diffDias === 0) {
        adicionarNotificacao(
          'alerta',
          '🔔 Pedido Vence Hoje',
          `O pedido "${job.descricao}" vence hoje!`
        );
        salvarNotificacaoEnviada(chaveNotif);
      }
    });
  } catch (error) {
    console.error('Erro ao verificar vencimentos:', error);
  }
}

// Controle de notificações enviadas (para evitar duplicatas)
function obterNotificacoesEnviadasHoje() {
  const hoje = new Date().toDateString();
  const dados = localStorage.getItem('notificacoesEnviadas');
  
  if (!dados) return [];
  
  const parsed = JSON.parse(dados);
  
  // Se é de outro dia, limpa e retorna vazio
  if (parsed.data !== hoje) {
    localStorage.setItem('notificacoesEnviadas', JSON.stringify({ data: hoje, ids: [] }));
    return [];
  }
  
  return parsed.ids || [];
}

function salvarNotificacaoEnviada(id) {
  const hoje = new Date().toDateString();
  const dados = localStorage.getItem('notificacoesEnviadas');
  let parsed = dados ? JSON.parse(dados) : { data: hoje, ids: [] };
  
  // Se mudou o dia, reseta
  if (parsed.data !== hoje) {
    parsed = { data: hoje, ids: [] };
  }
  
  if (!parsed.ids.includes(id)) {
    parsed.ids.push(id);
    localStorage.setItem('notificacoesEnviadas', JSON.stringify(parsed));
  }
}

// Notificação quando criar novo pedido
function notificarNovoPedido(descricao) {
  adicionarNotificacao(
    'sucesso',
    '✅ Novo Pedido Criado',
    `O pedido "${descricao}" foi criado com sucesso!`
  );
}

// Inicializa sistema de notificações
function inicializarNotificacoes() {
  atualizarBadgeNotificacoes();
  verificarVencimentosPedidos();
  
  // Verifica vencimentos a cada 30 minutos
  setInterval(verificarVencimentosPedidos, 30 * 60 * 1000);
}

// Expor funções globalmente
window.toggleNotificacoes = toggleNotificacoes;
window.limparTodasNotificacoes = limparTodasNotificacoes;
window.marcarComoLida = marcarComoLida;
window.adicionarNotificacao = adicionarNotificacao;
window.inicializarNotificacoes = inicializarNotificacoes;
window.notificarNovoPedido = notificarNovoPedido;
window.verificarVencimentosPedidos = verificarVencimentosPedidos;

// Inicializa notificações quando o DOM carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarNotificacoes);
} else {
  inicializarNotificacoes();
}

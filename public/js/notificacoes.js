/* =============================================================
   SISTEMA DE NOTIFICAÇÕES (COMPARTILHADO VIA SERVIDOR)
   ============================================================= */

// Obtém o ID do funcionário logado do sessionStorage
function obterFuncionarioId() {
  const funcionarioData = sessionStorage.getItem('funcionario');
  if (funcionarioData) {
    try {
      const parsed = JSON.parse(funcionarioData);
      return parsed.id || null;
    } catch (e) {
      console.error('Erro ao parsear dados do funcionário:', e);
    }
  }
  return null;
}

// Busca notificações do servidor
async function obterNotificacoes() {
  const funcionarioId = obterFuncionarioId();
  if (!funcionarioId) {
    console.warn('Funcionário não logado - notificações desabilitadas');
    return [];
  }
  
  try {
    const response = await fetch(`${window.API_URL}/notificacoes?funcionario_id=${funcionarioId}`);
    if (!response.ok) throw new Error('Erro ao buscar notificações');
    
    const notificacoes = await response.json();
    return notificacoes;
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return [];
  }
}

// Adiciona uma nova notificação (envia ao servidor)
async function adicionarNotificacao(tipo, titulo, texto, job_id = null) {
  try {
    const response = await fetch(`${window.API_URL}/notificacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, titulo, texto, job_id })
    });
    
    if (!response.ok) throw new Error('Erro ao criar notificação');
    
    const result = await response.json();
    
    // Atualiza a interface imediatamente
    await renderizarNotificacoes();
    atualizarBadgeNotificacoes();
    
    return result;
  } catch (error) {
    console.error('Erro ao adicionar notificação:', error);
  }
}

// Renderiza as notificações no dropdown
async function renderizarNotificacoes() {
  const notificacoes = await obterNotificacoes();
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
    
    const tempo = formatarTempoNotificacao(new Date(notif.criado_em));
    
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
async function atualizarBadgeNotificacoes() {
  const notificacoes = await obterNotificacoes();
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
async function marcarComoLida(id) {
  const funcionarioId = obterFuncionarioId();
  if (!funcionarioId) return;
  
  try {
    await fetch(`${window.API_URL}/notificacoes/${id}/lida`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funcionario_id: funcionarioId })
    });
    
    await renderizarNotificacoes();
    atualizarBadgeNotificacoes();
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
  }
}

// Limpa todas as notificações (marca todas como lidas)
async function limparTodasNotificacoes() {
  const funcionarioId = obterFuncionarioId();
  if (!funcionarioId) return;
  
  if (confirm('Deseja marcar todas as notificações como lidas?')) {
    try {
      await fetch(`${window.API_URL}/notificacoes/marcar-todas-lidas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funcionario_id: funcionarioId })
      });
      
      await renderizarNotificacoes();
      atualizarBadgeNotificacoes();
    } catch (error) {
      console.error('Erro ao limpar notificações:', error);
    }
  }
}

// Verifica pedidos vencidos e próximos do vencimento (agora feito pelo servidor)
// Esta função apenas atualiza as notificações do servidor
async function verificarVencimentosPedidos() {
  await renderizarNotificacoes();
  atualizarBadgeNotificacoes();
}

// Notificação quando criar novo pedido (chamada pelo frontend, mas salva no servidor)
function notificarNovoPedido(descricao) {
  // Nota: A notificação será criada pelo servidor automaticamente
  // Esta função está aqui apenas para compatibilidade com código legado
  console.log('Notificação de novo pedido será criada pelo servidor:', descricao);
}

// Notificação quando mudar status do pedido (chamada pelo frontend, mas salva no servidor)
function notificarMudancaStatus(descricao, statusAntigo, statusNovo) {
  // Nota: A notificação será criada pelo servidor automaticamente
  // Esta função está aqui apenas para compatibilidade com código legado
  console.log('Notificação de mudança de status será criada pelo servidor:', descricao);
}

// Notificação quando cancelar pedido (chamada pelo frontend, mas salva no servidor)
function notificarPedidoCancelado(descricao) {
  // Nota: A notificação será criada pelo servidor automaticamente
  // Esta função está aqui apenas para compatibilidade com código legado
  console.log('Notificação de cancelamento será criada pelo servidor:', descricao);
}

// Inicializa sistema de notificações
function inicializarNotificacoes() {
  atualizarBadgeNotificacoes();
  verificarVencimentosPedidos();
  
  // Atualiza notificações a cada 30 segundos
  setInterval(() => {
    renderizarNotificacoes();
    atualizarBadgeNotificacoes();
  }, 30 * 1000);
}

// Expor funções globalmente
window.toggleNotificacoes = toggleNotificacoes;
window.limparTodasNotificacoes = limparTodasNotificacoes;
window.marcarComoLida = marcarComoLida;
window.adicionarNotificacao = adicionarNotificacao;
window.inicializarNotificacoes = inicializarNotificacoes;
window.notificarNovoPedido = notificarNovoPedido;
window.notificarMudancaStatus = notificarMudancaStatus;
window.notificarPedidoCancelado = notificarPedidoCancelado;
window.verificarVencimentosPedidos = verificarVencimentosPedidos;

// Inicializa notificações quando o DOM carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarNotificacoes);
} else {
  inicializarNotificacoes();
}

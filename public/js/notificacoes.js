/* =============================================================// FUNÇÕES DE DEBUG E TESTE
// =============================================================

/**
 * Testa todo o sistema de notificações step-by-step
 */
window.debugNotificacoes = async function () {
  console.log('\n🧪 =================================');
  console.log('🧪 TESTE COMPLETO DE NOTIFICAÇÕES');
  console.log('🧪 =================================\n');

  // 1. Verificar autenticação
  console.log('1️⃣ Verificando autenticação...');
  const token = sessionStorage.getItem('auth_token');
  const usuario = sessionStorage.getItem('usuario');

  console.log('   Token:', token ? '✅ Presente' : '❌ Ausente');
  console.log('   Dados usuário:', usuario ? '✅ Presente' : '❌ Ausente');

  if (!token || !usuario) {
    console.error('❌ FALHA: Usuário não está logado corretamente');
    return;
  }

  // 2. Verificar dados do usuário
  console.log('\n2️⃣ Verificando dados do usuário...');
  let userData = null;
  try {
    userData = JSON.parse(usuario);
    console.log('   ID:', userData.id);
    console.log('   Nome:', userData.nome);
    console.log('   Email:', userData.email);
    console.log('   Perfil:', userData.perfil);
  } catch (e) {
    console.error('❌ FALHA: Dados do usuário corrompidos:', e);
    return;
  }

  // 3. Testar busca de notificações
  console.log('\n3️⃣ Testando busca de notificações...');
  try {
    const funcionarioId = obterFuncionarioId();
    console.log('   Funcionário ID obtido:', funcionarioId);

    if (!funcionarioId) {
      console.error('❌ FALHA: Não conseguiu obter ID do funcionário');
      return;
    }

    const notificacoes = await obterNotificacoes();
    console.log('   Notificações recebidas:', notificacoes.length);

    if (notificacoes.length > 0) {
      console.log('✅ SUCESSO: Sistema funcionando!');
      console.log('   Últimas notificações:');
      notificacoes.slice(0, 3).forEach((notif, i) => {
        console.log(`     ${i + 1}. ${notif.titulo} (${notif.tipo})`);
      });
    } else {
      console.warn('⚠️ AVISO: Nenhuma notificação encontrada (pode ser normal)');
    }

  } catch (error) {
    console.error('❌ FALHA no teste de notificações:', error);
  }

  // 4. Testar criação de tabelas
  console.log('\n4️⃣ Verificando se tabelas existem...');
  try {
    const response = await fetch('/debug/testar-notificacoes');
    const result = await response.json();

    if (result.success) {
      console.log('✅ Backend funcionando:', result.message);
    } else {
      console.warn('⚠️ Problema no backend:', result.message);

      // Tentar criar tabelas
      console.log('\n🔧 Tentando criar tabelas...');
      const createResponse = await fetch('/debug/criar-tabelas-notificacoes', { method: 'POST' });
      const createResult = await createResponse.json();

      if (createResult.success) {
        console.log('✅ Tabelas criadas:', createResult.message);
      } else {
        console.error('❌ Erro ao criar tabelas:', createResult.message);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao testar backend:', error);
  }

  console.log('\n🧪 Teste completo finalizado! 🧪\n');
};

/**
 * Força atualização das notificações (para debug)
 */
window.forcarAtualizacaoNotificacoes = async function () {
  console.log('🔄 Forçando atualização das notificações...');
  try {
    await carregarNotificacoes();
    console.log('✅ Notificações atualizadas!');
  } catch (error) {
    console.error('❌ Erro ao atualizar:', error);
  }
};

/**
 * Mostra informações da sessão atual
 */
window.infoSessao = function () {
  console.log('\n📋 INFORMAÇÕES DA SESSÃO:');
  console.log('Token:', sessionStorage.getItem('auth_token') ? 'Presente' : 'Ausente');
  console.log('Usuario:', sessionStorage.getItem('usuario'));
  console.log('Current View:', sessionStorage.getItem('currentView'));
  console.log('API URL:', window.API_URL);
  console.log('Location:', window.location.href);
  console.log('\n📋 Por favor, copie essas informações se precisar de ajuda!\n');
};

// Detecta se está em desenvolvimento para mostrar helpers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('\n🛠️  MODO DESENVOLVIMENTO - Comandos disponíveis:');
  console.log('   • debugNotificacoes() - Teste completo do sistema');
  console.log('   • forcarAtualizacaoNotificacoes() - Força update');
  console.log('   • infoSessao() - Info da sessão atual');
  console.log('   • testarNotificacoes() - Teste básico\n');
}

// =============================================================   SISTEMA DE NOTIFICAÇÕES (COMPARTILHADO VIA SERVIDOR)


// Obtém o ID do funcionário logado do sessionStorage
function obterFuncionarioId() {
  // Primeiro, verifica se tem token de autenticação
  const token = sessionStorage.getItem('auth_token');
  if (!token) {
    console.warn('⚠️ Token de autenticação não encontrado - usuário não logado');
    return null;
  }

  // Busca dados do usuário (chave correta é 'usuario', não 'funcionario')
  const usuarioData = sessionStorage.getItem('usuario');
  if (usuarioData) {
    try {
      const parsed = JSON.parse(usuarioData);
      console.log('🔍 Funcionário logado:', parsed.nome || parsed.email, 'ID:', parsed.id);
      return parsed.id || null;
    } catch (e) {
      console.error('❌ Erro ao parsear dados do usuário:', e);
      // Limpa dados corrompidos
      sessionStorage.removeItem('usuario');
    }
  }

  console.warn('⚠️ Dados do usuário não encontrados - sessão inválida');
  // Se não tem dados do usuário mas tem token, limpa a sessão
  if (token) {
    console.log('🔧 Limpando sessão corrompida...');
    sessionStorage.clear();
    window.location.reload();
  }

  return null;
}

// Busca notificações do servidor
async function obterNotificacoes() {
  const funcionarioId = obterFuncionarioId();
  if (!funcionarioId) {
    console.warn('🚫 Funcionário não logado - notificações desabilitadas');
    // Esconder dropdown de notificação se não logado
    const dropdownNotif = document.querySelector('.dropdown-toggle[data-bs-toggle="dropdown"]');
    if (dropdownNotif && dropdownNotif.textContent.includes('Notificações')) {
      const badge = dropdownNotif.querySelector('.badge');
      if (badge) badge.textContent = '0';
    }
    return [];
  }

  try {
    const token = sessionStorage.getItem('auth_token');
    const url = `${window.API_URL}/notificacoes?funcionario_id=${funcionarioId}`;
    console.log('📡 Buscando notificações para funcionário ID:', funcionarioId);
    console.log('📡 URL:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Resposta do servidor:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }

    const notificacoes = await response.json();
    console.log('🔔 Notificações recebidas:', notificacoes.length);

    if (notificacoes.length > 0) {
      console.log('🔔 Primeiras 3 notificações:', notificacoes.slice(0, 3));
    } else {
      console.log('📭 Nenhuma notificação encontrada');
    }

    return notificacoes;
  } catch (error) {
    console.error('❌ Erro ao buscar notificações:', error.message);

    // Se erro 401, limpar sessão
    if (error.message.includes('401')) {
      console.log('🔧 Erro de autenticação - limpando sessão...');
      sessionStorage.clear();
      window.location.reload();
    }

    return [];
  }
}

// Adiciona uma nova notificação (envia ao servidor)
async function adicionarNotificacao(tipo, titulo, texto, job_id = null) {
  try {
    const dados = { tipo, titulo, texto, job_id };
    console.log('✉️ Criando notificação:', dados);

    const response = await fetch(`${window.API_URL}/notificacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    console.log('✉️ Resposta da criação:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✉️ Notificação criada com sucesso:', result);

    // Atualiza a interface imediatamente
    await renderizarNotificacoes();
    atualizarBadgeNotificacoes();

    return result;
  } catch (error) {
    console.error('❌ Erro ao adicionar notificação:', error);
  }
}

// Renderiza as notificações no dropdown
async function renderizarNotificacoes() {
  const todasNotificacoes = await obterNotificacoes();

  // Filtrar apenas as notificações NÃO LIDAS
  const notificacoes = todasNotificacoes.filter(n => !n.lida);

  console.log('📊 Total de notificações:', todasNotificacoes.length);
  console.log('📊 Notificações não lidas:', notificacoes.length);
  console.log('📊 Notificações lidas:', todasNotificacoes.filter(n => n.lida).length);

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
      <div class="notificacao-item ${notif.lida ? '' : 'nao-lida'}" data-notif-id="${notif.id}" onclick="marcarComoLida(${notif.id}, event)">
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

// Marca notificação como lida com feedback visual instantâneo
async function marcarComoLida(id, event) {
  const funcionarioId = obterFuncionarioId();
  if (!funcionarioId) return;

  // Prevenir propagação do evento
  if (event) event.stopPropagation();

  // 1. FEEDBACK VISUAL IMEDIATO
  const notifElement = document.querySelector(`[data-notif-id="${id}"]`);
  if (notifElement) {
    // Remove destaque de não lida
    notifElement.classList.remove('nao-lida');
    // Adiciona classe para animação de fade-out
    notifElement.classList.add('marcando-lida');
  }

  // 2. ATUALIZAR BADGE IMEDIATAMENTE (decrementar)
  const badge = document.getElementById('badgeNotificacoes');
  if (badge) {
    const numAtual = parseInt(badge.textContent) || 0;
    const novoNum = Math.max(0, numAtual - 1);

    if (novoNum > 0) {
      badge.textContent = novoNum > 99 ? '99+' : novoNum;
    } else {
      badge.style.display = 'none';
    }
  }

  // 3. CHAMAR API EM BACKGROUND
  try {
    console.log(`✓ Marcando notificação ${id} como lida...`);

    const response = await fetch(`${window.API_URL}/notificacoes/${id}/lida`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ funcionario_id: funcionarioId })
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}`);
    }

    console.log(`✅ Notificação ${id} marcada como lida`);

    // 4. REMOVER DA LISTA COM ANIMAÇÃO (após 300ms)
    setTimeout(() => {
      if (notifElement) {
        notifElement.style.maxHeight = notifElement.offsetHeight + 'px';
        setTimeout(() => {
          notifElement.style.maxHeight = '0';
          notifElement.style.padding = '0 16px';
          notifElement.style.opacity = '0';
        }, 10);

        // Remove do DOM após animação
        setTimeout(() => {
          notifElement.remove();

          // Se não houver mais notificações, mostrar mensagem de vazio
          const lista = document.getElementById('listaNotificacoes');
          if (lista && lista.children.length === 0) {
            lista.innerHTML = `
              <div class="text-center text-muted py-4">
                <i class="bi bi-bell-slash fs-3"></i>
                <p class="mb-0 mt-2 small">Nenhuma notificação</p>
              </div>
            `;
          }
        }, 300);
      }
    }, 300);

  } catch (error) {
    console.error('❌ Erro ao marcar notificação como lida:', error);

    // Reverter mudanças visuais em caso de erro
    if (notifElement) {
      notifElement.classList.add('nao-lida');
      notifElement.classList.remove('marcando-lida');
    }

    // Re-atualizar o badge corretamente
    atualizarBadgeNotificacoes();
  }
}

// Limpa todas as notificações (marca todas como lidas)
async function limparTodasNotificacoes() {
  const funcionarioId = obterFuncionarioId();
  if (!funcionarioId) return;

  if (confirm('Deseja marcar todas as notificações como lidas?')) {
    try {
      console.log('🧹 Limpando todas as notificações...');

      const response = await fetch(`${window.API_URL}/notificacoes/marcar-todas-lidas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ funcionario_id: funcionarioId })
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      console.log('✅ Notificações marcadas como lidas');

      // Recarregar notificações forçadamente
      await renderizarNotificacoes();
      atualizarBadgeNotificacoes();

      console.log('✅ Interface atualizada');
    } catch (error) {
      console.error('❌ Erro ao limpar notificações:', error);
      alert('Erro ao limpar notificações. Tente novamente.');
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

// Força atualização imediata das notificações (sem esperar o polling)
async function forcarAtualizacaoNotificacoes() {
  console.log('⚡ Forçando atualização imediata de notificações...');
  await renderizarNotificacoes();
  await atualizarBadgeNotificacoes();
}

// Inicializa sistema de notificações
function inicializarNotificacoes() {
  console.log('🔔 Inicializando sistema de notificações...');
  atualizarBadgeNotificacoes();
  verificarVencimentosPedidos();

  // Atualiza notificações a cada 2 segundos para resposta mais rápida
  setInterval(() => {
    renderizarNotificacoes();
    atualizarBadgeNotificacoes();
  }, 2 * 1000);
}

// Função de teste para debug
async function testarNotificacoes() {
  console.log('🧪 === TESTANDO SISTEMA DE NOTIFICAÇÕES ===');

  // 1. Verificar se funcionário está logado
  const funcionarioId = obterFuncionarioId();
  console.log('👤 Funcionário ID:', funcionarioId);

  // 2. Testar busca de notificações
  console.log('📥 Testando busca de notificações...');
  const notifs = await obterNotificacoes();
  console.log('📥 Quantidade encontrada:', notifs.length);

  // 3. Criar notificação de teste
  console.log('✍️ Criando notificação de teste...');
  const resultado = await adicionarNotificacao(
    'info',
    '🧪 Teste Manual',
    'Esta é uma notificação de teste criada manualmente'
  );
  console.log('✍️ Resultado:', resultado);

  // 4. Buscar novamente
  console.log('🔄 Buscando notificações após teste...');
  const notifsAposTeste = await obterNotificacoes();
  console.log('🔄 Nova quantidade:', notifsAposTeste.length);

  console.log('🧪 === TESTE FINALIZADO ===');
  return {
    funcionarioId,
    notificacoesAntes: notifs.length,
    notificacaocriada: resultado,
    notificacoesDepois: notifsAposTeste.length
  };
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
window.testarNotificacoes = testarNotificacoes; // Função de teste

// Inicializa notificações quando o DOM carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarNotificacoes);
} else {
  inicializarNotificacoes();
}

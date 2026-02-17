/* =============================================================
   GLOBAL SKELETON LOADER SYSTEM - COM SKELETONS ESPECÍFICOS
   ============================================================= */

/**
 * Retorna a URL do avatar de um funcionário
 * Prioriza avatar_base64 (persiste no Railway) sobre avatar (arquivo local)
 * @param {Object} func - Objeto do funcionário com avatar_base64 e/ou avatar
 * @returns {string|null} URL do avatar ou null
 */
function getAvatarUrl(func) {
  if (!func) return null;
  if (func.avatar_base64) return func.avatar_base64;
  if (func.avatar) return func.avatar;
  return null;
}

// Variáveis de controle do skeleton loader
let skeletonStartTime = null;
const SKELETON_MIN_DISPLAY_TIME = 2000; // Tempo mínimo de exibição (2000ms = 2 segundos)
let currentSkeletonId = null; // Controla qual skeleton está ativo

/**
 * Exibe o skeleton loader específico para a página
 * @param {string} skeletonType - Tipo de skeleton: 'dashboard', 'clientes', 'funcionarios', 'jobs', 'estoque', 'financeiro', 'configuracoes'
 * @param {boolean} forceImmediate - Se true, mostra imediatamente sem delay
 */
function showGlobalSkeleton(skeletonType = 'dashboard', forceImmediate = false) {
  // Oculta qualquer skeleton que esteja ativo
  hideAllSkeletons();

  // Define o ID do skeleton baseado no tipo
  const skeletonId = `skeleton-${skeletonType}`;
  const skeleton = document.getElementById(skeletonId);

  if (!skeleton) {
    console.warn(`⚠️ Skeleton "${skeletonType}" não encontrado. Usando skeleton-dashboard como fallback.`);
    const fallbackSkeleton = document.getElementById('skeleton-dashboard');
    if (fallbackSkeleton) {
      currentSkeletonId = 'skeleton-dashboard';
      skeletonStartTime = Date.now();
      fallbackSkeleton.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
    return;
  }

  currentSkeletonId = skeletonId;
  skeletonStartTime = Date.now();
  skeleton.classList.remove('hidden');

  // Previne scroll do body quando skeleton está ativo
  document.body.style.overflow = 'hidden';

  console.log(`🔄 Skeleton "${skeletonType}" ativado`);
}

/**
 * Oculta todos os skeletons
 */
function hideAllSkeletons() {
  const skeletonTypes = ['dashboard', 'clientes', 'funcionarios', 'jobs', 'estoque', 'financeiro', 'configuracoes'];
  skeletonTypes.forEach(type => {
    const skeleton = document.getElementById(`skeleton-${type}`);
    if (skeleton) {
      skeleton.classList.add('hidden');
    }
  });
}

/**
 * Oculta o skeleton loader ativo com tempo mínimo de exibição
 * @returns {Promise} Promise que resolve quando o skeleton é ocultado
 */
async function hideGlobalSkeleton() {
  if (!currentSkeletonId) return;

  const skeleton = document.getElementById(currentSkeletonId);
  if (!skeleton || skeleton.classList.contains('hidden')) return;

  const elapsedTime = Date.now() - skeletonStartTime;
  const remainingTime = Math.max(0, SKELETON_MIN_DISPLAY_TIME - elapsedTime);

  // Aguarda o tempo mínimo antes de ocultar
  if (remainingTime > 0) {
    await new Promise(resolve => setTimeout(resolve, remainingTime));
  }

  skeleton.classList.add('hidden');
  document.body.style.overflow = '';

  console.log(`✅ Skeleton desativado`);
  currentSkeletonId = null;
}

/**
 * Wrapper para operações assíncronas com skeleton loader
 * @param {Function} asyncFunction - Função assíncrona a ser executada
 * @param {string} skeletonType - Tipo de skeleton: 'dashboard', 'clientes', 'funcionarios', 'jobs', 'estoque', 'financeiro', 'configuracoes'
 * @param {Object} options - Opções de configuração
 * @returns {Promise} Resultado da função assíncrona
 */
async function withSkeletonLoader(asyncFunction, skeletonType = 'dashboard', options = {}) {
  const { showSkeleton = true } = options;

  try {
    if (showSkeleton) {
      showGlobalSkeleton(skeletonType);
    }

    const result = await asyncFunction();
    return result;
  } catch (error) {
    console.error('❌ Erro durante operação com skeleton:', error);
    throw error;
  } finally {
    if (showSkeleton) {
      await hideGlobalSkeleton();
    }
  }
}

/* =============================================================
   SISTEMA DE BUSCA GLOBAL
   ============================================================= */

// Cache de dados para busca
let searchCache = {
  clientes: [],
  jobs: [],
  produtos: [],
  funcionarios: []
};

// Debounce para otimizar performance
let searchTimeout = null;

/**
 * Inicializa o sistema de busca global
 */
function initializeGlobalSearch() {
  const searchInput = document.getElementById('globalSearchInput');
  const searchResults = document.getElementById('globalSearchResults');

  if (!searchInput || !searchResults) return;

  // Event listener para o input
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    // Cancela busca anterior
    if (searchTimeout) clearTimeout(searchTimeout);

    if (query.length < 2) {
      searchResults.classList.remove('active');
      return;
    }

    // Aguarda 300ms após usuário parar de digitar
    searchTimeout = setTimeout(() => {
      performGlobalSearch(query);
    }, 300);
  });

  // Fecha resultados ao clicar fora
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.remove('active');
    }
  });

  // Atualiza cache inicial
  updateSearchCache();
}

/**
 * Atualiza o cache de dados para busca
 */
async function updateSearchCache() {
  try {
    // Busca clientes - carrega se ainda não existir
    if (!window.listaClientes || window.listaClientes.length === 0) {
      try {
        const response = await fetch(`${API_URL}/clientes`);
        if (response.ok) {
          const clientes = await response.json();
          window.listaClientes = clientes;
          searchCache.clientes = clientes;
        }
      } catch (error) {
        console.log('Erro ao carregar clientes para busca:', error);
      }
    } else {
      searchCache.clientes = window.listaClientes;
    }

    // Busca jobs - carrega se ainda não existir
    if (!window.todosOsJobsCache || window.todosOsJobsCache.length === 0) {
      try {
        const response = await fetch(`${API_URL}/jobs`);
        if (response.ok) {
          const jobs = await response.json();
          window.todosOsJobsCache = jobs;
          searchCache.jobs = jobs;
        }
      } catch (error) {
        console.log('Erro ao carregar jobs para busca:', error);
      }
    } else {
      searchCache.jobs = window.todosOsJobsCache;
    }

    // Busca equipamentos - carrega se ainda não existir
    if (!window.cacheEstoque || window.cacheEstoque.length === 0) {
      try {
        const response = await fetch(`${API_URL}/equipamentos`);
        if (response.ok) {
          const equipamentos = await response.json();
          window.cacheEstoque = equipamentos;
          searchCache.produtos = equipamentos;
        }
      } catch (error) {
        console.log('Erro ao carregar equipamentos para busca:', error);
      }
    } else {
      searchCache.produtos = window.cacheEstoque;
    }

    // Busca TODOS os funcionários (incluindo desativados/férias) para busca global
    try {
      const response = await fetch(`${API_URL}/funcionarios/todos?_t=${Date.now()}`);
      if (response.ok) {
        const funcionarios = await response.json();
        searchCache.funcionarios = funcionarios;
        // Atualiza o cache principal também
        if (!window.cacheFuncionarios || window.cacheFuncionarios.length === 0) {
          window.cacheFuncionarios = funcionarios;
        }
      }
    } catch (error) {
      console.log('Erro ao carregar funcionários para busca:', error);
      // Fallback para o cache existente se houver erro
      if (window.cacheFuncionarios && window.cacheFuncionarios.length > 0) {
        searchCache.funcionarios = window.cacheFuncionarios;
      }
    }
  } catch (error) {
    console.error('Erro ao atualizar cache de busca:', error);
  }
}

/**
 * Remove acentos e normaliza string para busca
 */
function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacríticos (acentos)
}

/**
 * Verifica se uma string contém outra (normalizado)
 */
function matchSearch(text, query) {
  return normalizeString(text).includes(normalizeString(query));
}

/**
 * Executa a busca global
 */
function performGlobalSearch(query) {
  const searchResults = document.getElementById('globalSearchResults');
  const queryLower = query.toLowerCase();

  let results = [];

  // Busca em clientes (todos os campos)
  const clientesResults = searchCache.clientes
    .filter(c => {
      const nome = c.nome || '';
      const cpfCnpj = c.cpf_cnpj || '';
      const email = c.email || '';
      const telefone = c.telefone || '';
      const endereco = c.endereco || '';
      const cidade = c.cidade || '';
      const uf = c.uf || '';
      const contato = c.contato || '';

      return matchSearch(nome, query) ||
        matchSearch(cpfCnpj, query) ||
        matchSearch(email, query) ||
        matchSearch(telefone, query) ||
        matchSearch(endereco, query) ||
        matchSearch(cidade, query) ||
        matchSearch(uf, query) ||
        matchSearch(contato, query);
    })
    .slice(0, 3)
    .map(c => ({
      type: 'cliente',
      id: c.id,
      title: c.nome,
      subtitle: c.cpf_cnpj || c.email,
      icon: 'bi-person-circle'
    }));

  // Busca em jobs (número, título, cliente, equipamentos, datas, status)
  const jobsResults = searchCache.jobs
    .filter(j => {
      const numero = `${j.id}`;
      const titulo = j.titulo || '';
      const cliente = j.cliente_nome || j.nome_cliente || '';
      const descricao = j.descricao || '';
      const equipamentos = j.equipamentos_nomes || '';
      const dataInicio = j.data_inicio || '';
      const dataFim = j.data_fim || '';
      const status = j.status || '';
      const operador = j.operador_nome || '';

      return numero.includes(queryLower) ||
        matchSearch(titulo, query) ||
        matchSearch(cliente, query) ||
        matchSearch(descricao, query) ||
        matchSearch(equipamentos, query) ||
        matchSearch(dataInicio, query) ||
        matchSearch(dataFim, query) ||
        matchSearch(status, query) ||
        matchSearch(operador, query);
    })
    .slice(0, 4)
    .map(j => ({
      type: 'job',
      id: j.id,
      title: `#${j.id} - ${j.titulo || j.descricao || 'Job'}`,
      subtitle: j.cliente_nome || j.nome_cliente || 'Cliente não informado',
      icon: 'bi-briefcase'
    }));

  // Busca em produtos/equipamentos (todos os campos)
  const produtosResults = searchCache.produtos
    .filter(p => {
      const nome = p.nome || '';
      const categoria = p.categoria || '';
      const descricao = p.descricao || '';
      const marca = p.marca || '';
      const modelo = p.modelo || '';
      const codigo = p.codigo || '';
      const serial = p.serial || '';

      return matchSearch(nome, query) ||
        matchSearch(categoria, query) ||
        matchSearch(descricao, query) ||
        matchSearch(marca, query) ||
        matchSearch(modelo, query) ||
        matchSearch(codigo, query) ||
        matchSearch(serial, query);
    })
    .slice(0, 3)
    .map(p => ({
      type: 'produto',
      id: p.id,
      title: p.nome,
      subtitle: `${p.categoria || 'Equipamento'} - Estoque: ${p.quantidade || 0}`,
      icon: 'bi-box'
    }));

  // Busca em funcionários (TODOS - incluindo desativados/férias)
  const funcionariosResults = searchCache.funcionarios
    .filter(f => {
      const nome = f.nome || '';
      const cargo = f.cargo || '';
      const email = f.email || '';
      const departamento = f.departamento || '';
      const telefone = f.telefone || '';
      const cpf = f.cpf || '';
      const status = f.status || '';

      return matchSearch(nome, query) ||
        matchSearch(cargo, query) ||
        matchSearch(email, query) ||
        matchSearch(departamento, query) ||
        matchSearch(telefone, query) ||
        matchSearch(cpf, query) ||
        matchSearch(status, query);
    })
    .slice(0, 3)
    .map(f => {
      // Mostra status se não for "Ativo"
      let subtitle = f.cargo || 'Cargo não informado';
      if (f.status && f.status !== 'Ativo') {
        subtitle += ` • ${f.status}`;
      }

      return {
        type: 'funcionario',
        id: f.id,
        title: f.nome,
        subtitle: subtitle,
        icon: 'bi-person-badge'
      };
    });

  results = [...clientesResults, ...jobsResults, ...produtosResults, ...funcionariosResults];

  displaySearchResults(results);
}

/**
 * Exibe os resultados da busca
 */
function displaySearchResults(results) {
  const searchResults = document.getElementById('globalSearchResults');

  if (results.length === 0) {
    searchResults.innerHTML = '<div class="search-no-results">Nenhum resultado encontrado</div>';
    searchResults.classList.add('active');
    return;
  }

  const html = results.map(result => `
    <div class="search-result-item" onclick="handleSearchResultClick('${result.type}', ${result.id})">
      <div class="search-result-icon type-${result.type}">
        <i class="bi ${result.icon}"></i>
      </div>
      <div class="search-result-content">
        <div class="search-result-title">${result.title}</div>
        <div class="search-result-subtitle">${result.subtitle}</div>
      </div>
    </div>
  `).join('');

  searchResults.innerHTML = html;
  searchResults.classList.add('active');
}

/**
 * Trata clique em resultado da busca
 */
window.handleSearchResultClick = function (type, id) {
  const searchResults = document.getElementById('globalSearchResults');
  const searchInput = document.getElementById('globalSearchInput');

  // Fecha resultados e limpa busca
  searchResults.classList.remove('active');
  searchInput.value = '';

  // Navega para o item correto
  switch (type) {
    case 'cliente':
      switchView('clientes');
      setTimeout(() => visualizarCliente(id), 300);
      break;
    case 'job':
      switchView('contratos');
      setTimeout(() => visualizarJob(id), 300);
      break;
    case 'produto':
      switchView('estoque');
      setTimeout(() => {
        if (typeof editarProduto === 'function') {
          editarProduto(id);
        }
      }, 300);
      break;
    case 'funcionario':
      switchView('funcionarios');
      setTimeout(() => visualizarFuncionario(id), 300);
      break;
  }
};

/* =============================================================
   INDICADORES DE STATUS EM TEMPO REAL
   ============================================================= */

/**
 * Atualiza os indicadores de status no header
 */
async function updateStatusIndicators() {
  

  // 1. VERIFICA CONEXÃO COM SERVIDOR
  const statusOnline = document.querySelector('.status-online');
  try {
    const response = await fetch(`${API_URL}/jobs`, {
      method: 'HEAD',
      cache: 'no-cache'
    });

    if (statusOnline) {
      if (response.ok) {
        statusOnline.classList.remove('status-offline');
        statusOnline.classList.add('status-online');
        statusOnline.innerHTML = '<i class="bi bi-circle-fill"></i><span>Online</span>';
      } else {
        statusOnline.classList.remove('status-online');
        statusOnline.classList.add('status-offline');
        statusOnline.innerHTML = '<i class="bi bi-circle-fill"></i><span>Offline</span>';
      }
    }
  } catch (error) {
    console.warn('⚠️ Servidor offline');
    if (statusOnline) {
      statusOnline.classList.remove('status-online');
      statusOnline.classList.add('status-offline');
      statusOnline.innerHTML = '<i class="bi bi-circle-fill"></i><span>Offline</span>';
    }
  }

  // 2. JOBS ATIVOS
  const statusJobs = document.getElementById('statusJobsAtivos');
  if (statusJobs && window.todosOsJobsCache) {
    const jobsAtivos = window.todosOsJobsCache.filter(j =>
      j.status === 'Agendado' || j.status === 'Confirmado' || j.status === 'Em Andamento'
    );

    console.log('📊 Jobs no cache:', window.todosOsJobsCache.length);
    console.log('📊 Jobs ativos filtrados:', jobsAtivos.length);
    console.log('📊 Status dos jobs:', window.todosOsJobsCache.map(j => ({ id: j.id, status: j.status })));

    statusJobs.innerHTML = `<i class="bi bi-lightning-charge-fill"></i><span>${jobsAtivos.length} jobs</span>`;
  } else {
    console.warn('⚠️ statusJobsAtivos ou todosOsJobsCache não encontrado');
  }

  // 3. FUNCIONÁRIOS ALOCADOS EM JOBS EM ANDAMENTO
  const statusFunc = document.getElementById('statusFuncionarios');
  if (statusFunc && window.todosOsJobsCache) {
    try {
      // Busca apenas jobs EM ANDAMENTO
      const jobsEmAndamento = window.todosOsJobsCache.filter(j => j.status === 'Em Andamento');

      console.log('🎬 Jobs em andamento:', jobsEmAndamento.length);

      if (jobsEmAndamento.length === 0) {
        statusFunc.innerHTML = `<i class="bi bi-people-fill"></i><span>0 pessoas</span>`;
      } else {
        // Cria um Set com IDs únicos de funcionários
        const funcionariosUnicos = new Set();

        // 1. ADICIONA OS OPERADORES TÉCNICOS (responsáveis principais)
        jobsEmAndamento.forEach(job => {
          if (job.operador_id) {
            funcionariosUnicos.add(job.operador_id);
          }
        });

        // 2. BUSCA E ADICIONA A EQUIPE ADICIONAL de cada job (cache-bust para dados frescos)
        const promessasEquipes = jobsEmAndamento.map(job =>
          fetch(`${API_URL}/jobs/${job.id}/equipe?_t=${Date.now()}`, {
            cache: 'no-cache',
            headers: { 'Cache-Control': 'no-cache' }
          })
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
        );

        const todasEquipes = await Promise.all(promessasEquipes);

        // Adiciona membros da equipe ao Set (evita duplicatas se operador também estiver na equipe)
        todasEquipes.forEach(equipe => {
          equipe.forEach(membro => {
            if (membro.funcionario_id) {
              funcionariosUnicos.add(membro.funcionario_id);
            }
          });
        });

        const totalFuncionarios = funcionariosUnicos.size;
        console.log('👥 Operadores técnicos + equipe:', totalFuncionarios);

        statusFunc.innerHTML = `<i class="bi bi-people-fill"></i><span>${totalFuncionarios} ${totalFuncionarios === 1 ? 'pessoa' : 'pessoas'}</span>`;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar funcionários alocados:', error);
      statusFunc.innerHTML = `<i class="bi bi-people-fill"></i><span>0 pessoas</span>`;
    }
  } else {
    console.warn('⚠️ statusFuncionarios ou todosOsJobsCache não encontrado');
  }

  

  // 4. ATUALIZA GRÁFICO DE JOBS DA SEMANA
  atualizarGraficoJobsSemana();
}

/**
 * Atualiza o mini-gráfico de jobs da semana (barras verticais)
 */
async function atualizarGraficoJobsSemana() {
  const miniChart = document.getElementById('mini-chart-jobs');
  const kpiTotal = document.getElementById('kpi-jobs');
  const kpiTrend = document.getElementById('kpi-jobs-trend');
  const kpiPct = document.getElementById('kpi-jobs-pct');

  if (!miniChart) return;

  try {
    const response = await fetch(`${API_URL}/jobs/semana`);
    const dados = await response.json();

    // Atualiza valor total
    if (kpiTotal) {
      kpiTotal.textContent = dados.total;
    }

    // Atualiza variação percentual
    if (kpiTrend && kpiPct) {
      const variacao = parseFloat(dados.variacao);
      const sinal = variacao >= 0 ? '+' : '';

      kpiPct.textContent = `${sinal}${Math.abs(variacao).toFixed(1)}%`;

      // Remove classes antigas
      kpiTrend.classList.remove('positive', 'negative', 'neutral');

      // Adiciona classe baseada na variação
      if (variacao > 0) {
        kpiTrend.classList.add('positive');
        kpiTrend.innerHTML = `<i class="bi bi-arrow-up"></i><span id="kpi-jobs-pct">${sinal}${Math.abs(variacao).toFixed(1)}%</span><span class="text-muted ms-1 fw-normal">vs semana ant.</span>`;
      } else if (variacao < 0) {
        kpiTrend.classList.add('negative');
        kpiTrend.innerHTML = `<i class="bi bi-arrow-down"></i><span id="kpi-jobs-pct">${sinal}${Math.abs(variacao).toFixed(1)}%</span><span class="text-muted ms-1 fw-normal">vs semana ant.</span>`;
      } else {
        kpiTrend.classList.add('neutral');
        kpiTrend.innerHTML = `<i class="bi bi-dash"></i><span id="kpi-jobs-pct">0.0%</span><span class="text-muted ms-1 fw-normal">vs semana ant.</span>`;
      }
    }

    // Cria mini-barras (semana começa na segunda)
    miniChart.innerHTML = '';
    const maxValor = Math.max(...dados.dias);
    const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    dados.dias.forEach((valor, index) => {
      let altura = 0;
      if (maxValor > 0) altura = (valor / maxValor) * 100;
      if (altura < 15) altura = 15;

      const barra = document.createElement('div');
      barra.className = 'mini-bar bg-bar-green';
      barra.style.height = `${altura}%`;
      barra.style.cursor = "pointer";
      barra.title = `${labels[index]}: ${valor} dia${valor !== 1 ? 's' : ''}`;

      // Destaca o dia atual (converte de 0=Dom para índice onde 0=Seg)
      const diaJS = new Date().getDay(); // 0 = Dom, 1 = Seg, ...
      const diaIndex = diaJS === 0 ? 6 : diaJS - 1; // Converte: Dom=6, Seg=0, Ter=1, ...
      if (index === diaIndex) {
        barra.style.opacity = "1";
      } else {
        barra.style.opacity = "0.4";
      }

      miniChart.appendChild(barra);
    });

    
  } catch (error) {
    console.error('❌ Erro ao carregar gráfico da semana:', error);
  }
}

/* =============================================================
   USER PROFILE DROPDOWN MENU SYSTEM
   ============================================================= */

/**
 * Abre/fecha o menu dropdown de perfil do usuário
 */
function toggleUserProfileMenu() {
  const dropdown = document.getElementById('userProfileDropdown');
  const overlay = document.getElementById('userProfileOverlay');

  if (!dropdown || !overlay) return;

  const isOpen = dropdown.classList.contains('show');

  if (isOpen) {
    closeUserProfileMenu();
  } else {
    openUserProfileMenu();
  }
}

/**
 * Abre o menu dropdown de perfil
 */
function openUserProfileMenu() {
  const dropdown = document.getElementById('userProfileDropdown');
  const overlay = document.getElementById('userProfileOverlay');

  if (!dropdown || !overlay) return;

  dropdown.classList.add('show');
  overlay.classList.add('show');

  
}

/**
 * Fecha o menu dropdown de perfil
 */
function closeUserProfileMenu() {
  const dropdown = document.getElementById('userProfileDropdown');
  const overlay = document.getElementById('userProfileOverlay');

  if (!dropdown || !overlay) return;

  dropdown.classList.remove('show');
  overlay.classList.remove('show');

  
}

/**
 * Navega para a página de Configurações e ativa uma aba específica
 * @param {string} tabId - ID da aba a ser ativada (ex: 'tab-perfil', 'tab-seguranca')
 */
function navegarParaConfiguracoes(tabId = 'tab-perfil') {
  console.log('🔍 Navegando para Configurações → Aba:', tabId);

  // Esconde todas as seções
  document.querySelectorAll('.view-section').forEach(view => {
    view.classList.remove('active');
  });

  // Mostra Configurações
  const viewConfiguracoes = document.getElementById('view-configuracoes');
  if (!viewConfiguracoes) {
    console.error('❌ Elemento #view-configuracoes não encontrado!');
    return;
  }

  viewConfiguracoes.classList.add('active');

  // Ativa a aba específica usando Bootstrap tabs
  setTimeout(() => {
    const tabButton = document.querySelector(`[data-bs-target="#${tabId}"]`);
    if (tabButton) {
      const tab = new bootstrap.Tab(tabButton);
      tab.show();
          } else {
      console.warn(`⚠️ Botão da aba #${tabId} não encontrado`);
    }

    // Carregar dados se for aba de perfil
    if (tabId === 'tab-perfil' && typeof carregarDadosPerfil === 'function') {
      carregarDadosPerfil();
    }
  }, 100);

  // Remove ativo do menu lateral
  document.querySelectorAll('.sidebar .nav-link').forEach(link => link.classList.remove('active'));

  
}

/**
 * Handler para itens do menu de perfil
 * @param {string} action - Ação a ser executada
 * @param {Event} event - Evento do click
 */
function handleProfileMenuClick(action, event) {
  event.preventDefault();
  closeUserProfileMenu();

  console.log('🔧 Ação do menu:', action);

  switch (action) {
    case 'account':
      // Navega para Configurações → Aba Perfil
      navegarParaConfiguracoes('tab-perfil');
      break;

    case 'manage-users':
      // Navega para Configurações → Aba Segurança
      navegarParaConfiguracoes('tab-seguranca');
      break;

    case 'settings':
      // Navega para Configurações (aba padrão)
      navegarParaConfiguracoes('tab-perfil');

      // Carregar outras configurações
      setTimeout(() => {
        if (typeof carregarConfigNumeroPedido === 'function') carregarConfigNumeroPedido();
        if (typeof carregarControleAcesso === 'function') carregarControleAcesso();
      }, 100);
      break;

    default:
      console.warn('Ação desconhecida:', action);
  }
}

/**
 * Abre o file input para selecionar foto de avatar
 */
function triggerAvatarUpload() {
  const input = document.getElementById('avatarUploadInput');
  if (input) {
    input.click();
  }
}

/**
 * Processa o upload da foto de avatar
 * @param {Event} event - Evento do input file
 */
async function handleAvatarUpload(event) {
  const file = event.target.files[0];

  if (!file) return;

  // Valida se é imagem
  if (!file.type.startsWith('image/')) {
    alert('⚠️ Por favor, selecione apenas arquivos de imagem (JPG, PNG, etc.)');
    return;
  }

  // Valida tamanho (max 2MB)
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    alert('⚠️ A imagem deve ter no máximo 2MB');
    return;
  }

  // Faz upload para o servidor
  const token = sessionStorage.getItem('auth_token');
  if (!token) {
    alert('Sessão expirada. Faça login novamente.');
    return;
  }

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const response = await fetch(`${API_URL}/api/funcionarios/me/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: formData
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Avatar salvo no servidor:', result.avatar);
      alert('✅ Foto de perfil atualizada com sucesso!');

      // Atualiza dados do usuário na UI
      loadUserProfileData();

      // Atualiza preview na aba de configurações se existir
      if (typeof carregarDadosPerfil === 'function') {
        carregarDadosPerfil();
      }
    } else {
      throw new Error(result.error || 'Erro ao salvar avatar');
    }
  } catch (error) {
    console.error('❌ Erro ao fazer upload do avatar:', error);
    alert('❌ Erro ao salvar foto: ' + error.message);
  }
}

/**
 * Envia a foto para o servidor (para implementação futura)
 * @param {File} file - Arquivo de imagem
 */
async function uploadAvatarToServer(file) {
  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${API_URL}/usuario/avatar`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Avatar salvo no servidor:', data);
      alert('✅ Foto de perfil atualizada com sucesso!');
    } else {
      throw new Error('Erro ao salvar avatar');
    }
  } catch (error) {
    console.error('❌ Erro ao fazer upload do avatar:', error);
    alert('❌ Erro ao salvar foto. Tente novamente.');
  }
}

/**
 * Handler para logout
 */
async function handleLogout() {
  closeUserProfileMenu();

  if (confirm('Tem certeza que deseja sair do sistema?')) {
    try {
      // Chama endpoint de logout
      const token = sessionStorage.getItem('auth_token');
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
    } catch (error) {
      console.log('Erro ao fazer logout:', error);
    }

    // Limpa dados locais
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('usuario');

    

    // Redireciona para login
    window.location.href = '/login';
  }
}

/**
 * Carrega dados do usuário logado do servidor/localStorage
 */
async function loadUserProfileData() {
  // 🔄 NÃO USA CACHE - Sempre busca dados frescos do servidor
  let userData = null;

  // Tenta buscar dados atualizados do servidor
  const token = sessionStorage.getItem('auth_token');
  if (token) {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        credentials: 'include',
        cache: 'no-store' // Força não usar cache do navegador
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.usuario) {
          userData = data.usuario;

          // 🐛 DEBUG: Mostra o que chegou
          console.log('📥 Dados da API /me:', {
            nome: userData.nome,
            temAvatar: !!userData.avatar,
            temAvatarBase64: !!userData.avatar_base64,
            avatar_base64_inicio: userData.avatar_base64 ? userData.avatar_base64.substring(0, 30) + '...' : 'NULO'
          });

          sessionStorage.setItem('usuario', JSON.stringify(userData));
        }
      } else if (response.status === 401) {
        // Token expirado - redireciona para login
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('usuario');
        window.location.href = '/login';
        return;
      }
    } catch (error) {
      console.log('Erro ao buscar dados do usuário:', error);
    }
  }

  // Se não tem dados, usa fallback
  if (!userData) {
    userData = {
      nome: 'Usuário',
      email: 'usuario@sistema.com',
      cargo: 'Funcionário',
      avatar: null
    };
  }

  // Formata dados para uso na UI
  // Prioridade: avatar_base64 (persiste no Railway) > avatar (caminho antigo)
  let avatarUrl = null;
  if (userData.avatar_base64) {
    avatarUrl = userData.avatar_base64; // Já é uma data URL completa
    
  } else if (userData.avatar) {
    avatarUrl = userData.avatar.startsWith('/') ? userData.avatar : `/uploads/avatars/${userData.avatar}`;
    console.log('🖼️ Usando avatar (path):', avatarUrl);
  } else {
    
  }

  const displayData = {
    name: userData.nome || 'Usuário',
    email: userData.email || '',
    role: userData.cargo || 'Funcionário',
    avatar: userData.nome ? userData.nome.charAt(0).toUpperCase() : 'U',
    avatarUrl: avatarUrl
  };

  console.log('✅ Avatar URL final:', displayData.avatarUrl ? displayData.avatarUrl.substring(0, 50) + '...' : 'NENHUM');

  // Atualiza header
  const headerName = document.getElementById('userNameHeader');
  const headerRole = document.getElementById('userRoleHeader');
  const headerAvatar = document.getElementById('userAvatarHeader');

  if (headerName) headerName.textContent = displayData.name;
  if (headerRole) headerRole.textContent = displayData.role;
  if (headerAvatar) {
    if (displayData.avatarUrl) {
      // Não adiciona timestamp em URLs base64 (data:image/...)
      const avatarUrlHeader = displayData.avatarUrl.startsWith('data:')
        ? displayData.avatarUrl
        : `${displayData.avatarUrl}?t=${Date.now()}`;
      headerAvatar.style.backgroundImage = `url(${avatarUrlHeader})`;
      headerAvatar.style.backgroundSize = 'cover';
      headerAvatar.style.backgroundPosition = 'center';
      headerAvatar.textContent = '';
    } else {
      headerAvatar.style.backgroundImage = '';
      headerAvatar.textContent = displayData.avatar;
    }
  }

  // Atualiza dropdown
  const dropdownName = document.getElementById('userNameDropdown');
  const dropdownEmail = document.getElementById('userEmailDropdown');
  const dropdownAvatar = document.getElementById('userAvatarDropdown');

  if (dropdownName) dropdownName.textContent = displayData.name;
  if (dropdownEmail) dropdownEmail.textContent = displayData.email;
  if (dropdownAvatar) {
    if (displayData.avatarUrl) {
      // Não adiciona timestamp em URLs base64 (data:image/...)
      const avatarUrlDropdown = displayData.avatarUrl.startsWith('data:')
        ? displayData.avatarUrl
        : `${displayData.avatarUrl}?t=${Date.now()}`;
      dropdownAvatar.style.backgroundImage = `url(${avatarUrlDropdown})`;
      dropdownAvatar.style.backgroundSize = 'cover';
      dropdownAvatar.style.backgroundPosition = 'center';
      // Limpa texto e mantém apenas o overlay
      const overlay = dropdownAvatar.querySelector('.avatar-upload-overlay');
      dropdownAvatar.innerHTML = '';
      if (overlay) dropdownAvatar.appendChild(overlay.cloneNode(true));
      else dropdownAvatar.innerHTML = '<div class="avatar-upload-overlay"><i class="bi bi-camera-fill"></i></div>';
    } else {
      dropdownAvatar.style.backgroundImage = '';
      dropdownAvatar.innerHTML = displayData.avatar + '<div class="avatar-upload-overlay"><i class="bi bi-camera-fill"></i></div>';
    }
  }

  console.log('👤 Dados do usuário carregados:', displayData);
}

// Event listeners para fechar dropdown
document.addEventListener('DOMContentLoaded', function () {
  // Carrega dados do usuário
  loadUserProfileData();

  // Fecha dropdown ao pressionar ESC
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeUserProfileMenu();
    }
  });

  // Fecha dropdown ao rolar a página
  let scrollTimeout;
  window.addEventListener('scroll', function () {
    const dropdown = document.getElementById('userProfileDropdown');
    if (dropdown && dropdown.classList.contains('show')) {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(closeUserProfileMenu, 150);
    }
  });
});

/* =============================================================
   CONFIGURAÇÕES GERAIS E INICIALIZAÇÃO
   ============================================================= */







// Detecta automaticamente se está rodando local ou no Railway
// Tornar disponível globalmente para outros módulos (notificacoes.js)
window.API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : window.location.origin;

const API_URL = window.API_URL; // Alias local para compatibilidade

console.log('🌐 API_URL:', window.API_URL);

/* =============================================================
   SISTEMA DE AUTENTICAÇÃO E GESTÃO DE SESSÃO
   ============================================================= */

// Flag para evitar múltiplas verificações simultâneas
let verificandoAutenticacao = false;

// Verifica se NÃO está na página de login
function naoEstaNoLogin() {
  return !window.location.pathname.includes('/login');
}

// Verifica autenticação ao carregar a página (APENAS se não estiver no login)
async function verificarAutenticacaoInicial() {
  // Evita verificações duplicadas simultâneas
  if (verificandoAutenticacao) {
    
    return false;
  }

  // Não verifica se estiver na página de login
  if (!naoEstaNoLogin()) {
    
    return true;
  }

  verificandoAutenticacao = true;

  const token = sessionStorage.getItem('auth_token');

  if (!token) {
    
    // Limpa TUDO do sessionStorage incluindo currentView
    sessionStorage.clear();
    window.location.replace('/login'); // Usa replace para não criar histórico
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Token inválido');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error('Autenticação falhou');
    }

    
    return true;

  } catch (error) {
    console.error('❌ Erro de autenticação:', error.message);
    // Limpa TUDO do sessionStorage incluindo currentView
    sessionStorage.clear();
    window.location.replace('/login'); // Usa replace para não criar histórico
    return false;
  } finally {
    verificandoAutenticacao = false;
  }
}

// Monitora status de conexão (online/offline)
function iniciarMonitoramentoConexao() {
  // Não monitora se estiver na página de login
  if (!naoEstaNoLogin()) {
    return;
  }

  let estaOffline = false;

  // Detecta quando fica offline
  window.addEventListener('offline', () => {
    
    estaOffline = true;
  });

  // Detecta quando volta online e verifica autenticação
  window.addEventListener('online', async () => {
    

    if (estaOffline) {
      const token = sessionStorage.getItem('auth_token');

      if (!token) {
        
        window.location.replace('/login');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          },
          credentials: 'include'
        });

        if (!response.ok || !(await response.json()).success) {
          throw new Error('Token inválido após reconexão');
        }

        
        estaOffline = false;

        // Recarrega a página para atualizar dados
        window.location.reload();

      } catch (error) {
        console.error('❌ Sessão expirada após reconexão:', error.message);
        // Limpa TUDO do sessionStorage
        sessionStorage.clear();
        alert('Sua sessão expirou. Por favor, faça login novamente.');
        window.location.replace('/login');
      }
    }
  });

  // Verificação periódica de token (a cada 10 minutos - aumentado para evitar excesso)
  setInterval(async () => {
    // Não verifica se estiver na página de login
    if (!naoEstaNoLogin()) {
      return;
    }

    const token = sessionStorage.getItem('auth_token');

    if (token && navigator.onLine) {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Token expirado');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error('Sessão inválida');
        }

      } catch (error) {
        console.error('❌ Sessão expirada:', error.message);
        // Limpa TUDO do sessionStorage
        sessionStorage.clear();
        alert('Sua sessão expirou. Por favor, faça login novamente.');
        window.location.replace('/login');
      }
    }
  }, 10 * 60 * 1000); // 10 minutos

  
}

// Flag para evitar múltiplas execuções do DOMContentLoaded
let sistemaInicializado = false;

// Função para obter a view que deve ser carregada
function obterViewInicial() {
  // Só restaura se houver token válido (usuário autenticado)
  const token = sessionStorage.getItem('auth_token');
  if (!token) {
    
    sessionStorage.removeItem('currentView');
    return 'principal';
  }

  const viewSalva = sessionStorage.getItem('currentView');

  // Se não houver view salva, retorna principal
  if (!viewSalva) {
    
    return 'principal';
  }

  console.log(`🔄 View salva encontrada: ${viewSalva}`);
  return viewSalva;
}


// GARANTIA: Assim que a tela abrir, roda tudo com skeleton loader
document.addEventListener('DOMContentLoaded', async () => {
  console.log("Sistema Iniciado 🚀");

  // Evita múltiplas execuções
  if (sistemaInicializado) {
    
    return;
  }
  sistemaInicializado = true;

  // Não executa se estiver na página de login
  if (!naoEstaNoLogin()) {
    
    return;
  }

  // Verifica autenticação ANTES de fazer qualquer coisa
  const autenticado = await verificarAutenticacaoInicial();
  if (!autenticado) {
    
    sistemaInicializado = false; // Permite tentar novamente
    return;
  }

  // Inicia monitoramento de conexão
  iniciarMonitoramentoConexao();

  // Verifica qual view deve ser carregada ANTES de carregar dados
  const viewInicial = obterViewInicial();
  console.log(`🎯 View inicial definida: ${viewInicial}`);

  // Mostra skeleton loader durante carregamento inicial
  showGlobalSkeleton();

  try {
    // Operações de inicialização síncronas
    iniciarSidebar();
    iniciarMapa();
    carregarOpcoesDoFormulario();
    window.idClienteEdicao = null;

    // Operações assíncronas de carregamento
    await Promise.all([
      atualizarDashboard(),
      carregarGestaoContratos(),
      carregarEstoque()
    ]);

    // Carrega equipamentos para pedido
    if (typeof window.carregarEquipamentosParaPedido === 'function') {
      window.carregarEquipamentosParaPedido();
    }

    // Carrega funcionários
    
    if (typeof window.carregarFuncionarios === 'function') {
      
      window.carregarFuncionarios();
    } else {
      console.error('❌ Função carregarFuncionarios NÃO existe!');
    }

    // Inicializa busca global
    initializeGlobalSearch();

    // Atualiza indicadores de status
    updateStatusIndicators();

    // Inicia monitoramento de conexão (verifica a cada 30 segundos)
    setInterval(updateStatusIndicators, 30000);

    // Se a view inicial não for 'principal', troca para ela (SEM setTimeout)
    if (viewInicial !== 'principal') {
      console.log(`🔄 Trocando para view: ${viewInicial}`);
      await switchView(viewInicial);
    }

    
  } catch (error) {
    console.error('❌ Erro durante inicialização:', error);
    sistemaInicializado = false; // Permite tentar novamente em caso de erro
  } finally {
    // Oculta skeleton loader após carregamento
    await hideGlobalSkeleton();
  }

  /* =============================================================
     NOVO SISTEMA DE RASTREAMENTO DE ORIGEM E MODO
     Insira este bloco NO INÍCIO do arquivo main.js (após DOMContentLoaded)
     ============================================================= */

  // ============================================================
  // 1. CONSTANTES E VARIÁVEIS GLOBAIS DE CONTROLE
  // ============================================================
  window.jobViewState = {
    jobId: null,
    mode: null, // 'view' = detalhes/leitura, 'edit' = edição, null = nenhum
    origin: null, // 'contratos', 'client_history', null
    clientId: null, // ID do cliente (para retornar ao histórico correto)
    returnUrl: null // Para casos especiais
  };

  // ============================================================
  // 2. FUNÇÃO DE RESET (Chamada ao entrar na tela do job)
  // ============================================================
  window.resetJobViewState = function () {
    console.log("🔄 [RESET] Limpando estado anterior do Job");
    window.__jobEditandoId = null;
    window.__jobVisandoId = null;
    window.__itensOriginais = [];

    // REABILITAR TODOS OS INPUTS (importante ao sair do modo visualização)
    const inputs = document.querySelectorAll('#view-novo-job input, #view-novo-job select, #view-novo-job textarea');
    inputs.forEach(el => {
      el.disabled = false;
      el.style.backgroundColor = '';
      el.style.cursor = '';
    });

    // Restaurar botões
    const btnSalvar = document.querySelector('#view-novo-job .btn-success');
    const btnAdicionar = document.querySelector('#view-novo-job button[onclick*="adicionarLinhaItem"]');
    const btnRemover = document.querySelectorAll('#view-novo-job .btn-danger');

    if (btnSalvar) btnSalvar.style.display = 'inline-block';
    if (btnAdicionar) btnAdicionar.style.display = 'inline-block';
    btnRemover.forEach(btn => btn.style.display = 'inline-block');

    // NÃO limpa jobViewState, apenas quando necessário
  };

  // ============================================================
  // 3. FUNÇÃO DE DEFINIÇÃO DE ORIGEM (Chamada ANTES de abrir o job)
  // ============================================================
  window.setJobOrigin = function (origin, clientId = null) {
    console.log(`📍 [ORIGIN] Definindo origem: ${origin}${clientId ? ` (Cliente: ${clientId})` : ''}`);
    window.jobViewState.origin = origin; // 'contratos' ou 'client_history'
    window.jobViewState.clientId = clientId;
  };

  // ============================================================
  // 4. FUNÇÃO DE RETORNO INTELIGENTE
  // ============================================================
  // ============================================================
  // 4. FUNÇÃO DE RETORNO INTELIGENTE (CORRIGIDA)
  // ============================================================
  window.voltarDoJob = function () {
    // PASSO 1: Captura "de onde vim" ANTES de limpar o estado global
    // Isso é o "pulo do gato". Guardamos em variáveis locais temporárias.
    const origemDestino = window.jobViewState.origin;
    const idClienteRetorno = window.jobViewState.clientId;

    console.log("🔙 [VOLTAR] Clicado. Origem salva:", origemDestino, "| ID Cliente:", idClienteRetorno);

    // PASSO 2: Limpeza Visual (Reseta o formulário HTML)
    document.getElementById('formNovoJobFull').reset();
    document.getElementById('lista-itens-job').innerHTML = ''; // Limpa itens da tabela

    // Remove o badge "Modo Visualização" se ele existir
    const badge = document.getElementById('badge-modo-visualizacao');
    if (badge) badge.remove();

    // Reabilita os campos (Tira o cinza e o bloqueio) para o próximo uso
    const inputs = document.querySelectorAll('#view-novo-job input, #view-novo-job select, #view-novo-job textarea');
    inputs.forEach(el => {
      el.disabled = false;
      el.style.backgroundColor = '';
      el.style.cursor = '';
    });

    // Restaura os botões (Salvar, Adicionar Item, etc)
    const btnSalvar = document.querySelector('#view-novo-job .btn-success');
    const btnCancelar = document.querySelector('#view-novo-job .btn-outline-secondary');

    if (btnSalvar) {
      btnSalvar.style.display = 'inline-block';
      btnSalvar.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i> SALVAR PEDIDO';
    }
    // Restaura texto original do botão voltar
    if (btnCancelar) {
      btnCancelar.textContent = 'Cancelar';
      btnCancelar.onclick = () => switchView('contratos'); // Reseta comportamento padrão
    }

    // PASSO 3: Navegação (Usando as variáveis que salvamos no Passo 1)
    if (origemDestino === 'client_history' && idClienteRetorno) {
      console.log(`↩️ Voltando para Perfil do Cliente ID: ${idClienteRetorno}`);

      // 1. Carrega o perfil do cliente
      abrirPerfilCliente(idClienteRetorno);

      // 2. Truque visual: Clica na aba "Histórico" automaticamente após 200ms
      setTimeout(() => {
        const abaPedidos = document.querySelector('button[data-bs-target="#aba-pedidos"]');
        if (abaPedidos) {
          const tab = new bootstrap.Tab(abaPedidos);
          tab.show();
        }
      }, 200);

    } else if (origemDestino === 'financeiro') {
      console.log("↩️ Voltando para Financeiro");
      switchView('financeiro');
    } else {
      // Se não veio do histórico, volta para a tela principal de Contratos
      console.log("↩️ Voltando para Gestão de Contratos (Padrão)");
      switchView('contratos');
    }

    // PASSO 4: AGORA SIM, limpa o estado global
    window.resetJobViewState();
    window.jobViewState = {
      jobId: null,
      mode: null,
      origin: null, // Volta a ser null
      clientId: null,
      returnUrl: null
    };
  };


});

/* =============================================================
   1. LÓGICA DE DADOS (DASHBOARD E JOBS)
   ============================================================= */

// Função Principal: Atualiza KPI Cards, Tabela e Gráficos
/* =============================================================
   1. LÓGICA DE DADOS (DASHBOARD E JOBS)
   ============================================================= */

// Função Principal: Atualiza KPI Cards, Tabela e Gráficos
async function atualizarDashboard() {
  try {
    // 1. Chama as funções dos outros cards
    iniciarGraficos();
    renderizarGraficoStatusJobs(); // NOVO - Gráfico de Status dos Jobs
    // atualizarCardFrota(); // COMENTADO - Card de Veículos removido
    atualizarCardClientes(); // NOVO - Card de Clientes Ativos
    atualizarCardEquipamentos();

    // 2. Card Faturamento (Valor Monetário)
    const resFaturamento = await fetch(`${API_URL}/dashboard/faturamento`);
    const dataFaturamento = await resFaturamento.json();
    const el = document.getElementById('kpi-faturamento');
    if (el) el.innerText = formatarMoedaK(dataFaturamento.total || 0);

    // 3. Jobs, Tabela e Lógica da Semana (Jobs da Semana - Em Andamento + Finalizado)
    const resJobs = await fetch(`${API_URL}/jobs`);
    const jobs = await resJobs.json();

    // Atualiza Tabela (Últimas Diárias)
    preencherTabela(jobs);

    // Atualiza indicadores de status no header
    updateStatusIndicators();
  } catch (err) {
    console.error("Erro ao buscar dados do dashboard:", err);
  }
}

// --- FUNÇÕES SEPARADAS (FORA DO ATUALIZARDASHBOARD) ---

// Função do Card de Veículos
/* CARD VEÍCULOS ATIVOS - COMENTADO
function atualizarCardFrota() {
  fetch(`${API_URL}/veiculos`)
    .then(res => res.json())
    .then(veiculos => {
      const total = veiculos.length;
      const ativos = veiculos.filter(v => v.status === 'Ativo').length;
      const manutencao = veiculos.filter(v => v.status === 'Manutenção');

      // 1. Atualiza o Número Grande
      const elValor = document.getElementById('kpi-frota-valor');
      if (elValor) elValor.innerText = `${ativos}/${total}`;

      // 2. Lógica de Status e Cores
      const elStatus = document.getElementById('kpi-frota-status');
      const elIconBg = document.getElementById('kpi-frota-icon');

      if (manutencao.length === 0) {
        // TUDO CERTO
        if (elStatus) {
          elStatus.innerHTML = `
                        <div class="text-green small fw-bold">
                            <i class="bi bi-check-circle-fill"></i> Operação 100%
                        </div>
                        <div class="text-muted small" style="font-size: 11px;">Nenhuma manutenção</div>
                    `;
        }
        if (elIconBg) elIconBg.className = "kpi-icon-circle bg-green-soft text-green";

      } else {
        // PROBLEMA
        const nomesQuebrados = manutencao.map(v => v.modelo).join(', ');
        if (elStatus) {
          elStatus.innerHTML = `
                        <div class="text-warning small fw-bold">
                            <i class="bi bi-exclamation-triangle-fill"></i> Atenção:
                        </div>
                        <div class="text-dark small" style="line-height: 1.2;">
                            Na oficina: <b>${nomesQuebrados}</b>
                        </div>
                    `;
        }
        if (elIconBg) elIconBg.className = "kpi-icon-circle bg-yellow-soft text-yellow";
      }
    })
    .catch(err => console.error("Erro ao carregar frota:", err));
}
*/

// ===== CARD CLIENTES ATIVOS - NOVO =====
function atualizarCardClientes() {
  fetch(`${API_URL}/clientes`)
    .then(res => res.json())
    .then(clientes => {
      // Total de clientes ativos
      const clientesAtivos = clientes.filter(c => c.status === 'Ativo').length;

      // Clientes cadastrados no mês atual
      const hoje = new Date();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();

      const clientesMesAtual = clientes.filter(c => {
        if (!c.data_cadastro) return false;
        const dataCadastro = new Date(c.data_cadastro);
        return dataCadastro.getMonth() === mesAtual && dataCadastro.getFullYear() === anoAtual;
      }).length;

      // Clientes cadastrados no mês anterior
      const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
      const anoMesAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

      const clientesMesAnterior = clientes.filter(c => {
        if (!c.data_cadastro) return false;
        const dataCadastro = new Date(c.data_cadastro);
        return dataCadastro.getMonth() === mesAnterior && dataCadastro.getFullYear() === anoMesAnterior;
      }).length;

      // Calcula percentual de crescimento
      let percentual = 0;
      let sinal = '';
      let corTexto = 'text-muted';
      let icone = 'bi-dash';

      if (clientesMesAnterior > 0) {
        percentual = Math.round(((clientesMesAtual - clientesMesAnterior) / clientesMesAnterior) * 100);

        if (percentual > 0) {
          sinal = '+';
          corTexto = 'text-green';
          icone = 'bi-arrow-up';
        } else if (percentual < 0) {
          sinal = '';
          corTexto = 'text-red';
          icone = 'bi-arrow-down';
        }
      } else if (clientesMesAtual > 0) {
        // Primeiro mês com clientes
        percentual = 100;
        sinal = '+';
        corTexto = 'text-green';
        icone = 'bi-arrow-up';
      }

      // Atualiza o número principal
      const elValor = document.getElementById('kpi-clientes-valor');
      if (elValor) elValor.innerText = clientesAtivos;

      // Atualiza o status com percentual
      const elStatus = document.getElementById('kpi-clientes-status');
      if (elStatus) {
        elStatus.innerHTML = `
          <div class="${corTexto} small fw-bold">
            <i class="bi ${icone}"></i> ${sinal}${percentual}% este mês
          </div>
          <div class="text-muted small" style="font-size: 11px;">${clientesMesAtual} novos em ${getMesNome(mesAtual)}</div>
        `;
      }

      // Ícone sempre ciano (azul claro)
      const elIconBg = document.getElementById('kpi-clientes-icon');
      if (elIconBg) elIconBg.className = "kpi-icon-circle bg-cyan-soft text-cyan";

    })
    .catch(err => console.error("Erro ao carregar clientes:", err));
}

// Função auxiliar para nome do mês
function getMesNome(mes) {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return meses[mes];
}

// Função do Card de Manutenção (Equipamentos)
function atualizarCardEquipamentos() {
  fetch(`${API_URL}/equipamentos`)
    .then(res => res.json())
    .then(equips => {
      const emManutencao = equips.filter(e => e.status === 'Manutenção');
      const qtd = emManutencao.length;

      // 1. Atualiza o Número Grande
      const elValor = document.getElementById('kpi-equip-valor');
      if (elValor) elValor.innerText = qtd;

      // 2. Lógica Visual
      const elStatus = document.getElementById('kpi-equip-status');
      const elIconBg = document.getElementById('kpi-equip-icon');

      if (qtd === 0) {
        // TUDO OK
        if (elStatus) {
          elStatus.innerHTML = `
                        <div class="text-green small fw-bold">
                            <i class="bi bi-shield-check"></i> Tudo Operacional
                        </div>
                        <div class="text-muted small" style="font-size: 11px;">Nenhum chamado aberto</div>
                    `;
        }
        if (elIconBg) elIconBg.className = "kpi-icon-circle bg-green-soft text-green";

      } else {
        // PROBLEMA
        const nomes = emManutencao.map(e => e.nome).slice(0, 2).join(', ');
        const mais = qtd > 2 ? ` (+${qtd - 2})` : '';

        if (elStatus) {
          elStatus.innerHTML = `
                        <div class="text-danger small fw-bold">
                            <i class="bi bi-exclamation-circle-fill"></i> Em Avaria:
                        </div>
                        <div class="text-dark small" style="line-height: 1.2;">
                            ${nomes}${mais}
                        </div>
                    `;
        }
        if (elIconBg) elIconBg.className = "kpi-icon-circle bg-red-soft text-red";
      }
    })
    .catch(err => console.error("Erro ao carregar equipamentos:", err));
}

// Preenche a tabela lá embaixo (SEM A COLUNA DETALHES)
// Preenche a tabela "Últimas Diárias" (Top 5 - ORDEM DE CADASTRO)
function preencherTabela(listaJobs) {
  const tabela = document.getElementById('tabela-ultimas-diarias');
  const mobileContainer = document.getElementById('ultimas-diarias-mobile-cards');
  if (!tabela) return;

  tabela.innerHTML = "";
  if (mobileContainer) mobileContainer.innerHTML = "";

  // 1. ORDENAÇÃO: Pelo ID (Do maior para o menor)
  const listaOrdenada = listaJobs.sort((a, b) => {
    return b.id - a.id;
  });

  // 2. LIMITAÇÃO: Pega apenas os 5 últimos cadastrados
  const top5 = listaOrdenada.slice(0, 5);

  top5.forEach(job => {
    // --- LÓGICA DE DATA (MESMA DA GESTÃO DE CONTRATOS) ---
    const dInicio = new Date(job.data_inicio || job.data_job);
    dInicio.setHours(dInicio.getHours() + 3); // Ajuste fuso

    let textoData = "";
    const diaIni = dInicio.getDate();
    const mesIni = dInicio.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

    // Verifica se existe data final e se é diferente da inicial
    if (job.data_fim) {
      const dFim = new Date(job.data_fim);
      dFim.setHours(dFim.getHours() + 3);

      if (dFim.toDateString() !== dInicio.toDateString()) {
        const diaFim = dFim.getDate();
        const mesFim = dFim.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

        if (mesIni === mesFim) {
          // Mesmo mês: "12 a 15 jan"
          textoData = `${diaIni} a ${diaFim} ${mesIni}`;
        } else {
          // Meses diferentes: "28 jan a 02 fev"
          textoData = `${diaIni} ${mesIni} - ${diaFim} ${mesFim}`;
        }
      } else {
        // Datas iguais
        textoData = `${diaIni} ${mesIni}`;
      }
    } else {
      // Sem data fim (legado)
      textoData = `${diaIni} ${mesIni}`;
    }
    // -----------------------------------------------------

    // Desktop: tabela <tr>
    const tr = document.createElement('tr');
    tr.innerHTML = `
            <td>
                <div class="fw-bold text-dark text-truncate" style="max-width: 200px;">
                    ${job.descricao}
                </div>
                <div class="small text-muted fw-normal text-truncate" style="max-width: 200px;">
                    ${job.nome_cliente || 'Cliente'}
                </div>
            </td>
            
            <td>
                <div class="text-dark small fw-bold">${textoData}</div>
                <div class="text-muted small" style="font-size: 11px;">Período</div>
            </td>

            <td class="fw-bold text-dark">${formatarMoeda(job.valor)}</td>
            
            <td>${getStatusPill(job.status)}</td>
            
            <td>${getPagamentoPill(job.pagamento)}</td>
        `;
    tabela.appendChild(tr);

    // Mobile: card (Últimas Diárias)
    if (mobileContainer) {
      const card = document.createElement('div');
      card.className = 'diaria-card-mobile';
      card.innerHTML = `
        <div class="diaria-header">
          <div>
            <div class="diaria-title">${job.descricao}</div>
            <div class="diaria-client">${job.nome_cliente || 'Cliente'}</div>
          </div>
          <div class="diaria-date">${textoData}</div>
        </div>
        <div class="diaria-footer">
          <div class="diaria-valor">${formatarMoeda(job.valor)}</div>
          <div class="diaria-pills">
            ${getStatusPill(job.status)}
            ${getPagamentoPill(job.pagamento)}
          </div>
        </div>
      `;
      mobileContainer.appendChild(card);
    }
  });

  // Atualiza visibilidade table/cards conforme tela
  if (typeof toggleMobileCards === 'function') toggleMobileCards();
}

// Preenche os Selects do Modal (CORREÇÃO DO BUG "CARREGANDO...")
// 1. Atualizar para carregar os selects da NOVA tela
// --- CORREÇÃO PARA EVITAR "NULL" E "OBJECT" ---

// NO FINAL DO MAIN.JS
// Variável global para armazenar os clientes carregados
window.cacheClientesSelect = [];

// Variável global para armazenar os dados dos clientes carregados no select
window.cacheClientesSelect = [];

function carregarOpcoesDoFormulario() {

  // 1. Carregar Clientes (MANTIDO IGUAL, REMOVIDA APENAS A CHAMADA ERRADA DA EQUIPE)
  fetch(`${API_URL}/clientes`)
    .then(res => res.json())
    .then(data => {
      const clientesAtivos = data.filter(c => c.status === 'Ativo');
      window.cacheClientesSelect = clientesAtivos;

      // ---------------------------------------------------------------
      // (REMOVIDO DAQUI: carregarSelectEquipe(data) estava errado aqui)
      // ---------------------------------------------------------------

      const select = document.getElementById('jobClienteFull');

      if (select) {
        select.innerHTML = '<option value="" selected disabled>Selecione o Cliente...</option>';

        clientesAtivos.forEach(c => {
          // Usei nome_fantasia como preferência, fallback para nome
          select.innerHTML += `<option value="${c.id}">${c.nome_fantasia || c.nome}</option>`;
        });

        // Remove event listeners antigos clonando o nó (Sua lógica original)
        const newSelect = select.cloneNode(true);
        select.parentNode.replaceChild(newSelect, select);

        newSelect.addEventListener('change', function () {
          const idSelecionado = this.value;
          const cliente = window.cacheClientesSelect.find(c => c.id == idSelecionado);

          if (cliente) {
            const campoDoc = document.getElementById('jobClienteDocumento');
            if (campoDoc) {
              campoDoc.value = cliente.documento || "";
            }

            const setVal = (idCampo, valor) => {
              const el = document.getElementById(idCampo);
              if (el) el.value = valor || "";
            };

            setVal('jobPagador', cliente.nome_fantasia || cliente.nome);
            setVal('jobPagadorCNPJ', cliente.documento);
            setVal('jobPagadorEmail', cliente.contato1_email || '');
            setVal('jobPagadorCep', cliente.cep);
            setVal('jobPagadorLogradouro', cliente.logradouro);
            setVal('jobPagadorNumero', cliente.numero);
            setVal('jobPagadorBairro', cliente.bairro);
            setVal('jobPagadorCidade', cliente.cidade);
            setVal('jobPagadorUf', cliente.uf);
          }
        });
      }
    });

  // 2. Carregar Operadores/Funcionários
  fetch(`${API_URL}/funcionarios`)
    .then(res => res.json())
    .then(data => {

      // === AQUI ESTÁ A CORREÇÃO ===
      // Agora passamos a lista 'data' (que contém FUNCIONÁRIOS) para a equipe
      if (typeof carregarSelectEquipe === 'function') {
        carregarSelectEquipe(data);
      }
      // ============================

      const select = document.getElementById('jobOperadorFull');
      if (select) {
        select.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        data.forEach(f => {
          select.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
        });
      }
    });
}

// ============================================
// FUNÇÃO: Validar Estoque ANTES de Salvar
// Insira ANTES de window.salvarJobTelaCheia
// ============================================
window.validarEstoqueAntesSalvar = async function (itensArray) {
  console.log("🔍 Validando estoque antes de salvar...", itensArray);

  if (!itensArray || itensArray.length === 0) {
    console.log("✅ Sem itens, validação OK");
    return true;
  }

  try {
    const response = await fetch(`${API_URL}/jobs/validar-estoque`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens: itensArray })
    });

    const resultado = await response.json();

    if (!response.ok || !resultado.valido) {
      alert(`⛔ ESTOQUE INSUFICIENTE!\n\n${resultado.mensagem}`);
      return false;
    }

    console.log("✅ Estoque validado com sucesso!");
    return true;

  } catch (erro) {
    console.error("❌ Erro ao validar estoque:", erro);
    alert("⛔ Erro ao validar estoque. Tente novamente.");
    return false;
  }
};


// ============================================
// FUNÇÃO: Baixar Estoque APÓS Salvar com Sucesso
// Insira ANTES de window.salvarJobTelaCheia
// ============================================
window.baixarEstoqueAposSalvar = async function (jobId, itensArray) {
  console.log("🔽 Iniciando baixa de estoque para Job", jobId);
  console.log("📦 Itens a baixar:", itensArray);

  if (!itensArray || itensArray.length === 0) {
    console.log("✅ Sem itens para baixar");
    return true;
  }

  try {
    const response = await fetch(`${API_URL}/jobs/${jobId}/baixar-estoque`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens: itensArray })
    });

    const resultado = await response.json();

    if (!response.ok || !resultado.sucesso) {
      console.warn("⚠️ Erro ao atualizar estoque:", resultado.mensagem);
      alert(`⚠️ AVISO:\n\nPedido foi salvo, mas houve um problema ao atualizar o estoque:\n${resultado.mensagem}`);
      return false;
    }

    console.log("✅ Estoque atualizado com sucesso!");
    return true;

  } catch (erro) {
    console.error("❌ Erro ao baixar estoque:", erro);
    alert("⚠️ Pedido foi salvo, mas o estoque não foi atualizado.\n\nContate o suporte.");
    return false;
  }
};

// ============================================
// FUNÇÃO: Devolver Estoque (Ao Cancelar/Editar)
// Insira ANTES de window.salvarJobTelaCheia
// ============================================
window.devolverEstoqueAoEditar = async function (jobId, itens) {
  if (!itens || itens.length === 0) {
    console.log("[DEVOLUÇÃO] Sem itens, pulando...");
    return true;
  }

  try {
    console.log("[DEVOLUÇÃO] Devolvendo estoque do Job", jobId);

    const response = await fetch(`${API_URL}/jobs/${jobId}/devolver-estoque`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens })
    });

    const data = await response.json();
    console.log("[DEVOLUÇÃO] Resposta:", data);

    if (!data.sucesso) {
      console.error("[DEVOLUÇÃO] Erro:", data.mensagem);
      return false;
    }

    console.log("[DEVOLUÇÃO] ✅ Estoque devolvido!");
    return true;

  } catch (err) {
    console.error("[DEVOLUÇÃO] Erro:", err);
    return false;
  }
};


// SUBSTITUA A FUNÇÃO salvarJobTelaCheia NO MAIN.JS

/* =============================================================
   1. FUNÇÃO DE SALVAR (ATUALIZADA PARA MANDAR DESCONTO E DATA)
   ============================================================= */
/* =============================================================
   1. FUNÇÃO DE SALVAR (ATUALIZADA PARA MANDAR DESCONTO E DATA)
   ============================================================= */
window.salvarJobTelaCheia = async function () {
  const val = (id) => document.getElementById(id) ? document.getElementById(id).value : "";

  console.log("🚀 === INICIANDO SALVAR PEDIDO ===");

  // 1. TRATAMENTO DE DATA DE VENCIMENTO
  let vencimentoFinal = "À vista";
  let prazo_pagamento = null;
  let data_vencimento = null;

  const modoDataEl = document.getElementById('modoData');
  const modoPrazoEl = document.getElementById('modoPrazo');

  // Verificação de segurança caso os elementos não existam
  const modoDataChecked = modoDataEl ? modoDataEl.checked : true;
  const modoPrazoChecked = modoPrazoEl ? modoPrazoEl.checked : false;

  if (modoDataChecked) {
    const dataVenc = val('jobVencimento');
    if (dataVenc && dataVenc.trim() !== '') {
      const [ano, mes, dia] = dataVenc.split('-');
      vencimentoFinal = `${dia}/${mes}/${ano}`;
      data_vencimento = dataVenc; // yyyy-mm-dd format
    }
  } else if (modoPrazoChecked) {
    const prazo = val('jobVencimentoPrazo');
    if (prazo && prazo.trim() !== '') {
      prazo_pagamento = parseInt(prazo);
      vencimentoFinal = `${prazo} dias`;
    }
  }

  // 2. CÁLCULOS DOS ITENS
  const itensArray = window.extrairItensComEquipamento();
  const isEdit = Number.isInteger(window.__jobEditandoId);

  // Verifica se é um job que JÁ ESTÁ finalizado ou cancelado
  const isJobInativo = isEdit && (window.__statusJobAtual === 'Finalizado' || window.__statusJobAtual === 'Cancelado');

  // =================================================================
  // 🔒 VALIDAÇÃO DE ESTOQUE: APENAS EM NOVOS PEDIDOS
  // =================================================================
  // IMPORTANTE: Ao editar um pedido, NÃO validamos o estoque porque:
  // 1. Os itens originais já foram baixados do estoque quando o pedido foi criado
  // 2. O sistema devolve/baixa o estoque automaticamente durante a edição
  // 3. Validar novamente causaria erro de "estoque insuficiente" mesmo sem mudanças

  if (!isEdit) {
    // Apenas valida estoque em NOVOS pedidos
    console.log("🆕 Novo pedido: Validando estoque antes de salvar...");
    const estoqueOk = await window.validarEstoqueAntesSalvar(itensArray);
    if (!estoqueOk) return;
  } else {
    console.log("✏️ Editando pedido: Pulando validação de estoque (itens já estão reservados).");
  }

  // 3. CÁLCULO FINANCEIRO (AQUI ESTAVA O PROBLEMA DE APARECER 00,00)
  let subTotalGeral = 0;

  itensArray.forEach(item => {
    const valorBruto = item.qtd * item.valor;
    // Se desconto_item não existir, assume 0
    const descItem = parseFloat(item.desconto_item) || 0;
    const valorComDescontoItem = valorBruto * (1 - (descItem / 100));
    subTotalGeral += valorComDescontoItem;
  });

  if (subTotalGeral < 0) {
    alert("Erro: Subtotal não pode ser negativo!");
    return;
  }

  // Desconto Global
  let descGlobalPorcent = parseFloat(val('descontoTotal')) || 0;
  descGlobalPorcent = Math.max(0, Math.min(100, descGlobalPorcent));

  // Cálculos Finais (Valor real que deve ser salvo)
  const valorDescontoMoeda = subTotalGeral * (descGlobalPorcent / 100);
  const valorFinalPedido = subTotalGeral - valorDescontoMoeda;

  console.log("💰 Totais Calculados:", {
    subTotal: subTotalGeral,
    totalFinal: valorFinalPedido
  });

  // 4. MONTAR OBJETO DE DADOS (PREENCHENDO OS VALORES CORRETOS)
  const jobData = {
    cliente_id: val('jobClienteFull'),
    operador_id: val('jobOperadorFull'),
    descricao: val('jobDescricaoFull'),
    data_inicio: val('jobDataInicio'),
    data_fim: val('jobDataFim'),
    cliente_id: val('jobClienteFull'),
    descricao: val('jobDescricaoFull'),

    // === CORREÇÃO AQUI: USAR AS VARIÁVEIS CALCULADAS ===
    valor: valorFinalPedido.toFixed(2),              // Valor Total Líquido
    desconto_valor: valorDescontoMoeda.toFixed(2),   // Valor do Desconto em R$
    desconto_porcentagem: descGlobalPorcent,         // Valor do Desconto em %
    // ==================================================

    // === NOVOS CAMPOS DE HORÁRIO ===
    hora_chegada_prevista: val('jobHoraChegada'),
    hora_inicio_evento: val('jobHoraInicio'),
    hora_fim_evento: val('jobHoraFim'),


    // === NOVA LISTA DE EQUIPE ===
    equipe: window.equipeDoJob, // Envia o array criado acima

    motivo_desconto: val('motivoDesconto'),
    vencimento_texto: vencimentoFinal,

    endereco: {
      cep: val('jobCep'),
      logradouro: val('jobLogradouro'),
      numero: val('jobNumeroLocal'),
      bairro: val('jobBairro'),
      cidade: val('jobCidade'),
      uf: val('jobUf')
    },

    producao_local: val('jobProducaoLocal'),
    producao_contato: val('jobProducaoContato'),
    producao_email: val('jobProducaoEmail'),

    pagador_nome: val('jobPagador'),
    pagador_cnpj: val('jobPagadorCNPJ'),
    pagador_email: val('jobPagadorEmail'),
    pagador_cep: val('jobPagadorCep'),
    pagador_logradouro: val('jobPagadorLogradouro'),
    pagador_numero: val('jobPagadorNumero'),
    pagador_bairro: val('jobPagadorBairro'),
    pagador_cidade: val('jobPagadorCidade'),
    pagador_uf: val('jobPagadorUf'),

    solicitante_nome: val('jobSolicitanteNome'),
    solicitante_email: val('jobSolicitanteEmail'),
    solicitante_telefone: val('jobSolicitanteTelefone'),

    forma_pagamento: val('jobFormaPagamento'),
    tipo_documento: val('jobTipoDocumento'),
    observacoes: val('jobObservacoes'),

    prazo_pagamento: prazo_pagamento,
    data_vencimento: data_vencimento,

    itens: itensArray
  };

  const urlFinal = isEdit ? `${API_URL}/jobs/${window.__jobEditandoId}` : `${API_URL}/jobs`;

  try {
    const res = await fetch(urlFinal, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobData)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Erro HTTP ${res.status}: ${text}`);
    }

    const resJson = await res.json();

    console.log("✅ Job salvo no banco!");

    // ⭐⭐⭐ GERENCIAR ESTOQUE (A CORREÇÃO ESTÁ AQUI) ⭐⭐⭐
    let sucessoEstoque = true;

    if (isJobInativo) {
      // SE O JOB JÁ ESTAVA FINALIZADO OU CANCELADO: NÃO MEXE NO ESTOQUE!
      console.log("🛑 Job está Finalizado/Cancelado. Nenhuma alteração de estoque realizada.");

      // AVISO CLARO PARA O USUÁRIO
      alert("✅ Pedido atualizado com sucesso!\n\nℹ️ NOTA: Como este pedido já estava Finalizado ou Cancelado, os valores foram corrigidos, mas o estoque NÃO foi alterado.");

    } else {
      // SE O JOB ESTÁ ATIVO (Agendado, Em Andamento, etc): SEGUE O BAILE
      if (isEdit) {
        // === MODO EDIÇÃO ===
        console.log("🔄 MODO EDIÇÃO ATIVO - Calculando diferenças...");

        const { itensParaBaixar, itensParaDevolver } = window.compararItensParaEdicao();

        // 1. Devolver estoque
        if (itensParaDevolver.length > 0) {
          const devolucaoOk = await window.devolverEstoqueAoEditar(window.__jobEditandoId, itensParaDevolver);
          if (!devolucaoOk) sucessoEstoque = false;
        }

        // 2. Baixar estoque
        if (itensParaBaixar.length > 0) {
          const baixaOk = await window.baixarEstoqueAposSalvar(window.__jobEditandoId, itensParaBaixar);
          if (!baixaOk) sucessoEstoque = false;
        }

      } else {
        // === MODO NOVO ===
        console.log("➕ MODO NOVO - Baixando estoque...");
        const baixaOk = await window.baixarEstoqueAposSalvar(resJson.id, itensArray);
        if (!baixaOk) sucessoEstoque = false;
      }

      if (sucessoEstoque) {
        alert(isEdit ? "✅ Pedido atualizado com sucesso!" : "✅ Pedido criado com sucesso!");

        // Adiciona notificação se for um novo pedido
        if (!isEdit && typeof window.notificarNovoPedido === 'function') {
          window.notificarNovoPedido(jobData.descricao);
        }

        // Força atualização imediata das notificações
        if (typeof window.forcarAtualizacaoNotificacoes === 'function') {
          setTimeout(() => {
            window.forcarAtualizacaoNotificacoes();
          }, 500);
        }
      }
      else alert("⚠️ Pedido salvo, mas houve erro no estoque.");
    }

    // Limpezas Finais
    window.__jobEditandoId = null;
    window.__jobVisandoId = null;
    window.__itensOriginais = [];
    window.__statusJobAtual = null; // Limpa status

    if (typeof atualizarDashboard === 'function') atualizarDashboard();
    if (typeof carregarGestaoContratos === 'function') carregarGestaoContratos();

    switchView('contratos');

    setTimeout(() => {
      if (typeof recarregarCalendario === 'function') {
        window.recarregarCalendario();
      }
    }, 500);

  } catch (err) {
    console.error("Erro:", err);
    alert("Erro ao salvar: " + err.message);
  }
};


window.guardarItensOriginais = function () {
  const itens = window.extrairItensComEquipamento();
  window.__itensOriginais = JSON.parse(JSON.stringify(itens));
  console.log("💾 Itens originais guardados:", window.__itensOriginais);
  return window.__itensOriginais;
};


// ============================================
// FUNÇÃO: Comparar itens (para edição)
// COM VALIDAÇÃO DE SEGURANÇA
// ============================================
window.compararItensParaEdicao = function () {
  const itensAtuais = window.extrairItensComEquipamento();
  const itensOriginais = window.__itensOriginais || [];

  console.log("📊 Itens Atuais:", itensAtuais);
  console.log("📊 Itens Originais:", itensOriginais);

  // Se não tem originais, é um novo pedido (não é edição)
  if (!itensOriginais || itensOriginais.length === 0) {
    console.log("➕ Não há itens originais, tratando como novo pedido");
    return { itensParaBaixar: itensAtuais, itensParaDevolver: [] };
  }

  const itensParaDevolver = [];
  const itensParaBaixar = [];

  // 1. Verificar cada item atual
  itensAtuais.forEach(atual => {
    const original = itensOriginais.find(o => o.equipamento_id === atual.equipamento_id);

    if (!original) {
      // ➕ Item novo, precisa baixar
      console.log(`➕ Item novo: ${atual.descricao} - Qtd: ${atual.qtd}`);
      itensParaBaixar.push(atual);
    } else if (atual.qtd > original.qtd) {
      // ⬆️ Quantidade aumentou, precisa baixar a diferença
      const diferenca = atual.qtd - original.qtd;
      console.log(`⬆️ Quantidade aumentou: ${atual.descricao} - De ${original.qtd} para ${atual.qtd} (Diferença: ${diferenca})`);
      itensParaBaixar.push({
        descricao: atual.descricao,
        qtd: diferenca,
        valor: atual.valor,
        desconto_item: atual.desconto_item,
        equipamento_id: atual.equipamento_id
      });
    } else if (atual.qtd < original.qtd) {
      // ⬇️ Quantidade diminuiu, precisa devolver a diferença
      const diferenca = original.qtd - atual.qtd;
      console.log(`⬇️ Quantidade diminuiu: ${original.descricao} - De ${original.qtd} para ${atual.qtd} (Devolver: ${diferenca})`);
      itensParaDevolver.push({
        descricao: original.descricao,
        qtd: diferenca,
        valor: original.valor,
        desconto_item: original.desconto_item,
        equipamento_id: original.equipamento_id
      });
    }
  });

  // 2. Verificar itens que foram removidos
  itensOriginais.forEach(original => {
    const atual = itensAtuais.find(a => a.equipamento_id === original.equipamento_id);

    if (!atual) {
      // ❌ Item foi removido, devolver tudo
      console.log(`❌ Item removido: ${original.descricao} - Devolver ${original.qtd} unidades`);
      itensParaDevolver.push(original);
    }
  });

  console.log("✅ Itens para baixar:", itensParaBaixar);
  console.log("↩️ Itens para devolver:", itensParaDevolver);

  return { itensParaBaixar, itensParaDevolver };
};





// Salva Novo Job
// Salva Novo Job (Modal)
/* =============================================================
   FUNÇÃO SALVAR JOB (VERSÃO DEFINITIVA: ESTOQUE + DASHBOARD)
   ============================================================= */
window.salvarNovoJob = async function () {
  const btn = document.querySelector('#view-novo-job .btn-success');
  const textoOriginal = btn.innerHTML;

  // Trava botão e mostra loading
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';
  btn.disabled = true;

  try {
    // 1. Validação Básica (Para não salvar vazio)
    const cliente = document.getElementById('jobClienteFull').value;
    const valor = document.getElementById('valorTotalPedido').textContent;
    if (!cliente || valor === "R$ 0,00") {
      alert("⚠️ Por favor, selecione um cliente e adicione itens ao pedido.");
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
      return;
    }

    // 2. Coleta TODOS os dados (Completo)
    const job = {
      descricao: document.getElementById('jobDescricaoFull').value,
      cliente_id: cliente,
      operador_id: document.getElementById('jobOperadorFull').value,
      data_inicio: document.getElementById('jobDataInicio').value,
      data_fim: document.getElementById('jobDataFim').value,

      // Dados de Contato e Endereço
      solicitante_nome: document.getElementById('jobSolicitanteNome').value,
      solicitante_email: document.getElementById('jobSolicitanteEmail').value,
      solicitante_telefone: document.getElementById('jobSolicitanteTelefone').value,
      producao_local: document.getElementById('jobProducaoLocal').value,
      producao_contato: document.getElementById('jobProducaoContato').value,
      producao_email: document.getElementById('jobProducaoEmail').value,

      endereco: {
        cep: document.getElementById('jobCep').value,
        logradouro: document.getElementById('jobLogradouro').value,
        numero: document.getElementById('jobNumeroLocal').value,
        bairro: document.getElementById('jobBairro').value,
        cidade: document.getElementById('jobCidade').value,
        uf: document.getElementById('jobUf').value,
      },

      // Dados Financeiros
      pagador_nome: document.getElementById('jobPagador').value,
      pagador_cnpj: document.getElementById('jobPagadorCNPJ').value,
      pagador_email: document.getElementById('jobPagadorEmail').value,
      pagador_cep: document.getElementById('jobPagadorCep').value,
      pagador_logradouro: document.getElementById('jobPagadorLogradouro').value,
      pagador_numero: document.getElementById('jobPagadorNumero').value,
      pagador_bairro: document.getElementById('jobPagadorBairro').value,
      pagador_cidade: document.getElementById('jobPagadorCidade').value,
      pagador_uf: document.getElementById('jobPagadorUf').value,

      forma_pagamento: document.getElementById('jobFormaPagamento').value,
      tipo_documento: document.getElementById('jobTipoDocumento').value,
      observacoes: document.getElementById('jobObservacoes').value,
      motivo_desconto: document.getElementById('motivoDesconto').value,

      valor: parseFloat(valor.replace('R$', '').replace('.', '').replace(',', '.')) || 0,
      desconto_valor: parseFloat(document.getElementById('descontoValor').textContent.replace('R$', '').replace('.', '').replace(',', '.')) || 0,

      vencimento_texto: document.getElementById('modoData').checked
        ? (document.getElementById('jobVencimento').value ? document.getElementById('jobVencimento').value.split('-').reverse().join('/') : null)
        : document.getElementById('jobVencimentoPrazo').value
    };

    // 3. Pega os Itens (Fundamental para o Estoque)
    const itens = window.extrairItensComEquipamento();
    job.itens = itens;

    // 4. Pega a Equipe do Job (Funcionários escalados)
    // COMBINA: Operador Técnico + Equipe do Evento
    const selectOperadorEl = document.getElementById('jobOperadorFull');
    const operadorId = selectOperadorEl?.value;
    let equipeCompleta = [];

    
    
    console.log('📋 Select Operador Element:', selectOperadorEl);
    console.log('📋 Operador Técnico ID (value):', operadorId);
    console.log('📋 Operador Técnico ID tipo:', typeof operadorId);
    console.log('📋 Operador Técnico é truthy?:', !!operadorId);
    console.log('📋 Equipe do Evento (window.equipeDoJob):', JSON.stringify(window.equipeDoJob));
    console.log('📋 Tamanho da equipe do evento:', (window.equipeDoJob || []).length);
    

    // PRIMEIRO: Adiciona o Operador Técnico (se selecionado)
    if (operadorId && operadorId !== '' && operadorId !== 'undefined') {
      const optionSelecionada = selectOperadorEl?.options[selectOperadorEl.selectedIndex];
      const nomeOperador = optionSelecionada?.text || optionSelecionada?.textContent || 'Operador';

      console.log('✅ Adicionando OPERADOR TÉCNICO:', { id: operadorId, nome: nomeOperador });

      equipeCompleta.push({
        funcionario_id: String(operadorId),
        nome: nomeOperador,
        cargo: 'Operador',
        funcao: 'Operador Técnico'
      });
    } else {
      console.log('⚠️ OPERADOR NÃO SELECIONADO OU VAZIO! operadorId =', operadorId);
    }

    // SEGUNDO: Adiciona a Equipe do Evento (se houver membros)
    if (window.equipeDoJob && window.equipeDoJob.length > 0) {
      window.equipeDoJob.forEach(membro => {
        // Verifica se o membro já não é o operador (evita duplicidade)
        if (String(membro.funcionario_id) !== String(operadorId)) {
          console.log('✅ Adicionando MEMBRO DA EQUIPE:', membro);
          equipeCompleta.push({
            funcionario_id: String(membro.funcionario_id),
            nome: membro.nome,
            cargo: membro.cargo || 'Técnico',
            funcao: membro.funcao || 'Técnico'
          });
        } else {
          console.log('⚠️ Membro já é o operador, ignorando duplicação:', membro);
        }
      });
    }

    job.equipe = equipeCompleta;

    
    
    console.log('📋 Total de membros:', equipeCompleta.length);
    equipeCompleta.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.nome} (ID: ${m.funcionario_id}) - ${m.funcao}`);
    });
    console.log('📋 JSON da equipe:', JSON.stringify(equipeCompleta));
    

    // Edição ou Criação?
    const isEdit = window.__jobEditandoId != null;
    const url = isEdit ? `${API_URL}/jobs/${window.__jobEditandoId}` : `${API_URL}/jobs`;
    const method = isEdit ? 'PUT' : 'POST';

    console.log('📋 Job completo a enviar:', JSON.stringify(job, null, 2));

    // 4. Envia para o servidor
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job)
    });

    const data = await res.json();

    if (res.ok) {
      // --- [NOVO] BAIXA DE ESTOQUE ---
      if (!isEdit && itens.length > 0) {
        console.log("Realizando baixa de estoque...");
        await fetch(`${API_URL}/jobs/${data.id}/baixar-estoque`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itens: itens })
        });
      }
      alert(isEdit ? "✅ Pedido atualizado!" : "✅ Pedido criado e estoque baixado!");

      // Adiciona notificação se for um novo pedido
      if (!isEdit && typeof window.notificarNovoPedido === 'function') {
        window.notificarNovoPedido(job.descricao || 'Novo pedido');
      }

      // 2. ATUALIZAÇÃO DO CALENDÁRIO (Gatilho para mudar cor e posição)
      if (typeof recarregarCalendario === 'function') {
        console.log("🔄 Recarregando eventos no calendário...");
        recarregarCalendario();
      }

      // Limpeza
      document.getElementById('form-novo-job').reset();
      document.getElementById('lista-itens-job').innerHTML = "";
      window.__jobEditandoId = null;

      // Volta para a tela de lista
      switchView('jobs');

      // Atualiza o restante do sistema que você já tem
      carregarGestaoContratos();
      if (typeof carregarEstoque === 'function') carregarEstoque();
      if (typeof atualizarDashboard === 'function') atualizarDashboard();

    } else {
      alert("Erro ao salvar: " + (data.error || data.message));
    }

  } catch (error) {
    console.error(error);
    alert("Erro técnico: " + error.message);
  } finally {
    btn.innerHTML = textoOriginal;
    btn.disabled = false;
  }
};


/* =============================================================
   2. GRÁFICOS E VISUALIZAÇÃO
   ============================================================= */

function atualizarMiniGraficoSemana(todosJobs, dataSegundaAtual) {
  const container = document.getElementById('mini-chart-jobs');
  if (!container) return;

  
  console.log('Total de jobs recebidos:', todosJobs.length);

  container.innerHTML = "";
  const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  // 1. Define o dia de hoje (zerado para comparar datas)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Variáveis para cálculos
  let totalSemanaAtual = 0;
  const contagemPorDia = [];

  // 2. Loop para montar os dados dos 7 dias
  for (let i = 0; i < 7; i++) {
    const dataBarra = new Date(dataSegundaAtual);
    dataBarra.setDate(dataBarra.getDate() + i);
    dataBarra.setHours(0, 0, 0, 0);

    const qtd = todosJobs.filter(j => {
      // Usa data_inicio (data de execução) ao invés de data_job
      const d = new Date(j.data_inicio || j.data_job);
      d.setHours(0, 0, 0, 0);
      const match = d.getDate() === dataBarra.getDate() &&
        d.getMonth() === dataBarra.getMonth() &&
        d.getFullYear() === dataBarra.getFullYear() &&
        (j.status === "Em Andamento" || j.status === "Finalizado");

      if (match) {
        console.log(`  ✓ Job #${j.id} no dia ${diasSemana[i]}: ${j.descricao} (${j.status})`);
      }

      return match;
    }).length;

    console.log(`${diasSemana[i]} (${dataBarra.toLocaleDateString('pt-BR')}): ${qtd} job(s)`);

    contagemPorDia.push({
      dia: diasSemana[i],
      qtd: qtd,
      dataObjeto: dataBarra
    });
    totalSemanaAtual += qtd;
  }

  // 3. (Opcional) Cálculo da % vs Semana Passada (mantido igual)
  const dataSegundaPassada = new Date(dataSegundaAtual);
  dataSegundaPassada.setDate(dataSegundaPassada.getDate() - 7);
  let totalSemanaPassada = 0;
  for (let i = 0; i < 7; i++) {
    const dPassado = new Date(dataSegundaPassada);
    dPassado.setDate(dPassado.getDate() + i);
    const qtdPassada = todosJobs.filter(j => {
      // Usa data_inicio (data de execução) ao invés de data_job
      const d = new Date(j.data_inicio || j.data_job);
      d.setHours(0, 0, 0, 0);
      return d.getDate() === dPassado.getDate() &&
        d.getMonth() === dPassado.getMonth() &&
        d.getFullYear() === dPassado.getFullYear() &&
        (j.status === "Em Andamento" || j.status === "Finalizado");
    }).length;
    totalSemanaPassada += qtdPassada;
  }
  const elTrend = document.getElementById('kpi-jobs-trend');
  const elPct = document.getElementById('kpi-jobs-pct');
  if (elTrend && elPct) {
    let pct = 0;
    if (totalSemanaPassada > 0) pct = ((totalSemanaAtual - totalSemanaPassada) / totalSemanaPassada) * 100;
    else if (totalSemanaAtual > 0) pct = 100;
    elPct.innerText = `${pct.toFixed(0)}%`;
    elTrend.className = pct >= 0 ? "kpi-trend text-green" : "kpi-trend text-red";
    const icon = elTrend.querySelector('i');
    if (icon) icon.className = pct >= 0 ? "bi bi-arrow-up-right" : "bi bi-arrow-down-right";
  }

  // 4. DESENHAR AS BARRAS (PADRÃO CORRIGIDO)
  contagemPorDia.forEach((item) => {
    const barra = document.createElement('div');
    barra.className = 'mini-bar';

    // COR PADRÃO (Igual ao Card de Faturamento)
    // Usamos sempre a mesma cor, mudando apenas a OPACIDADE
    barra.style.backgroundColor = '#0ab39c';

    // Verifica se é hoje
    const ehHoje = item.dataObjeto.getTime() === hoje.getTime();

    // --- LÓGICA DE OPACIDADE (IGUAL AO FATURAMENTO) ---
    // Se for hoje: Opacidade 1 (Forte)
    // Se não for hoje: Opacidade 0.4 (Suave)
    if (ehHoje) {
      barra.style.opacity = "1";
    } else {
      barra.style.opacity = "0.4";
    }

    // Altura da barra
    let altura = item.qtd > 0 ? (item.qtd * 30) : 15;
    if (altura > 100) altura = 100;
    barra.style.height = `${altura}%`;

    barra.style.flex = "1";
    barra.style.borderRadius = "3px";
    barra.style.cursor = "pointer";
    barra.title = `${item.dia}: ${item.qtd} jobs`;

    // --- EVENTO DE CLIQUE ---
    barra.addEventListener('click', () => {
      // 1. Atualiza o número grande
      const valorGrande = document.getElementById('kpi-jobs');
      if (valorGrande) valorGrande.innerText = item.qtd;

      // 2. Reseta TODAS as barras para o estado "Suave" (0.4)
      const todasBarras = container.querySelectorAll('.mini-bar');
      todasBarras.forEach(b => {
        b.style.opacity = "0.4";
      });

      // 3. Destaca APENAS a barra clicada (1.0)
      barra.style.opacity = "1";
    });

    container.appendChild(barra);
  });
}
// Gráficos Financeiros (Código que já fizemos e está funcionando)
function iniciarGraficos() {
  const ctxMain = document.getElementById("chartPrincipal");
  if (ctxMain) {
    fetch(`${API_URL}/dashboard/grafico-financeiro`)
      .then(res => res.json())
      .then(dadosAnuais => {
        // 1. DESCOBRE O MÊS ATUAL DE VERDADE
        const dataHoje = new Date();
        const mesAtual = dataHoje.getMonth(); // 0 = Jan, 1 = Fev...
        const nomesMeses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

        // 2. FORÇA O RESET VISUAL PARA O MÊS ATUAL
        // Pega o valor do mês atual no array de dados
        const valorMesAtual = dadosAnuais[mesAtual] || 0;

        // Reseta o Valor Grande (Ex: R$ 15.8K)
        const elValor = document.getElementById('kpi-faturamento');
        if (elValor) elValor.innerText = formatarMoedaK(valorMesAtual);

        // Reseta o Título (Ex: FATURAMENTO (JAN))
        const tituloCard = document.querySelector('#kpi-faturamento').previousElementSibling;
        if (tituloCard) tituloCard.innerText = `FATURAMENTO (${nomesMeses[mesAtual]})`;

        // Reseta a Porcentagem (Trend)
        const mesAnterior = mesAtual - 1;
        const valorAnterior = mesAnterior >= 0 ? dadosAnuais[mesAnterior] : 0;
        atualizarPorcentagem(valorMesAtual, valorAnterior);

        // 3. GRÁFICO PRINCIPAL (LINHA)
        const ctx = ctxMain.getContext("2d");
        if (window.myMainChart) window.myMainChart.destroy();

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, "rgba(10, 179, 156, 0.2)");
        gradient.addColorStop(1, "rgba(10, 179, 156, 0.0)");

        window.myMainChart = new Chart(ctx, {
          type: "line",
          data: {
            labels: nomesMeses,
            datasets: [{
              label: "Vendas",
              data: dadosAnuais,
              borderColor: "#0ab39c",
              backgroundColor: gradient,
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              borderWidth: 3,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                display: true,
                beginAtZero: true,
                grid: {
                  color: "rgba(255, 255, 255, 0.06)",
                  borderDash: [5, 5]
                },
                ticks: {
                  callback: function (value) {
                    if (value === 0) return 'R$ 0';

                    // Se for 1 milhão ou mais, mostra em milhões
                    if (value >= 1000000) {
                      return 'R$ ' + (value / 1000000).toFixed(1) + 'M';
                    }

                    // Se for 1 mil ou mais, mostra em milhares
                    if (value >= 1000) {
                      return 'R$ ' + (value / 1000).toFixed(1) + 'K';
                    }

                    // Se for menos de 1 mil, mostra o valor inteiro
                    return 'R$ ' + value.toFixed(0);
                  },
                  color: "#6b7a90"
                }
              },
              x: { display: true, grid: { display: false }, ticks: { color: "#6b7a90" } }
            },
          },
        });

        // 4. MINI GRÁFICO (BARRINHAS)
        const miniChart = document.getElementById('mini-chart-faturamento');
        if (miniChart) {
          miniChart.innerHTML = ''; // Limpa as barras antigas
          const maxValor = Math.max(...dadosAnuais);

          dadosAnuais.forEach((valor, index) => {
            let altura = 0;
            if (maxValor > 0) altura = (valor / maxValor) * 100;
            if (altura < 15) altura = 15;

            const barra = document.createElement('div');
            barra.className = 'mini-bar bg-bar-green';
            barra.style.height = `${altura}%`;
            barra.style.cursor = "pointer";
            barra.title = `${nomesMeses[index]}: R$ ${valor.toLocaleString('pt-BR')}`;

            // LOGICA DE DESTAQUE:
            // Se for o mês atual, opacidade 1. Se não, 0.4.
            if (index === mesAtual) barra.style.opacity = "1";
            else barra.style.opacity = "0.4";

            // CLIQUE NA BARRA (Para ver detalhes de outro mês)
            barra.addEventListener('click', () => {
              // Atualiza valor e texto visualmente
              document.getElementById('kpi-faturamento').innerText = formatarMoedaK(valor);
              if (tituloCard) tituloCard.innerText = `FATURAMENTO (${nomesMeses[index]})`;

              // Ajusta opacidade visual (destaca só o clicado)
              const todasBarras = miniChart.querySelectorAll('.mini-bar');
              todasBarras.forEach(b => b.style.opacity = "0.3");
              barra.style.opacity = "1";

              // Calcula % baseado no mês clicado vs anterior
              const vlrAnt = (index - 1) >= 0 ? dadosAnuais[index - 1] : 0;
              atualizarPorcentagem(valor, vlrAnt);
            });
            miniChart.appendChild(barra);
          });
        }
      });
  }
}



// Auxiliar de Porcentagem
function atualizarPorcentagem(valorAtual, valorAnterior) {
  const trendElement = document.getElementById('kpi-faturamento-trend');
  const pctElement = document.getElementById('kpi-faturamento-pct');
  const iconElement = trendElement ? trendElement.querySelector('i') : null;

  if (trendElement && pctElement) {
    let novaPct = 0;
    let novaClasse = "text-muted";
    let novoIcone = "bi-dash";

    if (valorAnterior > 0) novaPct = ((valorAtual - valorAnterior) / valorAnterior) * 100;
    else if (valorAtual > 0) novaPct = 100;

    if (novaPct > 0) { novaClasse = "text-green"; novoIcone = "bi-arrow-up-right"; }
    else if (novaPct < 0) { novaClasse = "text-red"; novoIcone = "bi-arrow-down-right"; }

    trendElement.className = `kpi-trend ${novaClasse}`;
    pctElement.innerText = `${novaPct.toFixed(1)}%`;
    if (iconElement) iconElement.className = `bi ${novoIcone}`;
  }
}

// ===== GRÁFICO DE STATUS DOS JOBS - NOVO =====
let chartStatusJobsInstance = null; // Armazena a instância do gráfico para evitar duplicação

function renderizarGraficoStatusJobs() {
  const canvas = document.getElementById('chartStatusJobs');
  if (!canvas) return;

  fetch(`${API_URL}/jobs`)
    .then(res => res.json())
    .then(jobs => {
      // Filtra jobs do mês atual
      const hoje = new Date();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();
      const nomeMes = getMesNome(mesAtual);

      // Atualiza o subtítulo com o mês de referência
      const subtituloEl = document.querySelector('#cardStatusJobs .text-muted.small');
      if (subtituloEl) {
        subtituloEl.textContent = `${nomeMes}/${anoAtual}`;
      }

      const jobsMesAtual = jobs.filter(job => {
        if (!job.data_job) return false;
        const dataJob = new Date(job.data_job);
        return dataJob.getMonth() === mesAtual && dataJob.getFullYear() === anoAtual;
      });

      // Conta jobs por status (do mês atual)
      const agendados = jobsMesAtual.filter(j => j.status === 'Agendado').length;
      const emAndamento = jobsMesAtual.filter(j => j.status === 'Em Andamento').length;
      const confirmados = jobsMesAtual.filter(j => j.status === 'Confirmado').length;
      const finalizados = jobsMesAtual.filter(j => j.status === 'Finalizado').length;
      const cancelados = jobsMesAtual.filter(j => j.status === 'Cancelado').length;

      // Destroi gráfico anterior se existir
      if (chartStatusJobsInstance) {
        chartStatusJobsInstance.destroy();
      }

      // Cria o gráfico de barras horizontais
      const ctx = canvas.getContext('2d');
      chartStatusJobsInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Agendado', 'Em Andamento', 'Confirmado', 'Finalizado', 'Cancelado'],
          datasets: [{
            label: 'Quantidade',
            data: [agendados, emAndamento, confirmados, finalizados, cancelados],
            backgroundColor: [
              '#3b82f6',  // Azul (Agendado)
              '#10b981',  // Verde (Em Andamento)
              '#f59e0b',  // Laranja (Confirmado)
              '#6b7280',  // Cinza (Finalizado)
              '#ef4444'   // Vermelho (Cancelado)
            ],
            borderRadius: 6,
            barThickness: 28
          }]
        },
        options: {
          indexAxis: 'y', // Barras horizontais
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              enabled: true,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              borderWidth: 1,
              callbacks: {
                label: function (context) {
                  return context.parsed.x + ' jobs';
                }
              }
            },
            datalabels: {
              anchor: 'end',
              align: 'end',
              color: function (context) {
                // Cor baseada no tema (light/dark)
                const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
                return isDark ? '#e5e7eb' : '#1f2937';
              },
              font: {
                size: 13,
                weight: 'bold'
              },
              formatter: function (value) {
                return value;
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              max: function (context) {
                // Define o máximo como 120% do maior valor para dar espaço aos labels
                const maxValue = Math.max(...context.chart.data.datasets[0].data);
                return Math.ceil(maxValue * 1.15);
              },
              ticks: {
                stepSize: 15,
                color: function () {
                  const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
                  return isDark ? '#6b7280' : '#9ca3af';
                },
                font: {
                  size: 11
                }
              },
              grid: {
                color: function () {
                  const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
                  return isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
                },
                drawBorder: false
              }
            },
            y: {
              ticks: {
                color: function () {
                  const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
                  return isDark ? '#d1d5db' : '#374151';
                },
                font: {
                  size: 13,
                  weight: '500'
                },
                padding: 10
              },
              grid: {
                display: false
              }
            }
          },
          layout: {
            padding: {
              left: 0,
              right: 30,
              top: 10,
              bottom: 10
            }
          }
        },
        plugins: [{
          // Plugin customizado para desenhar os valores no final das barras
          id: 'customLabels',
          afterDatasetsDraw(chart) {
            const { ctx, data, scales: { x, y } } = chart;

            ctx.save();
            ctx.font = 'bold 13px Inter, sans-serif';

            const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
            ctx.fillStyle = isDark ? '#e5e7eb' : '#1f2937';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            data.datasets[0].data.forEach((value, index) => {
              const barEnd = x.getPixelForValue(value);
              const yPos = y.getPixelForValue(index);

              // Desenha o valor ao final da barra com um pequeno offset
              ctx.fillText(value, barEnd + 8, yPos);
            });

            ctx.restore();
          }
        }]
      });
    })
    .catch(err => console.error('Erro ao carregar status dos jobs:', err));
}

/* =============================================================
   3. HELPERS E INTERFACE (SIDEBAR, MAPA)
   ============================================================= */

// Funções auxiliares para controle do sidebar em mobile
function toggleSidebarMobile() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (!sidebar) return;

  const isOpen = sidebar.classList.contains('show');

  if (isOpen) {
    sidebar.classList.remove('show');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';
  } else {
    sidebar.classList.add('show');
    if (overlay) overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeSidebarMobile() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (sidebar) sidebar.classList.remove('show');
  if (overlay) overlay.classList.remove('show');
  document.body.style.overflow = '';
}

function iniciarSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  // Toggle do sidebar (botão dentro do sidebar - para desktop)
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', (e) => {
      e.stopPropagation();

      if (window.innerWidth < 992) {
        // Em mobile, fecha o menu
        closeSidebarMobile();
      } else {
        // Em desktop, colapsa com ícones
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
      }
    });
  }

  // Toggle mobile (botão no header)
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSidebarMobile();
    });
  }

  // Fechar ao clicar no overlay
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      closeSidebarMobile();
    });
  }

  // *** NAVEGAÇÃO DIRETA QUANDO SIDEBAR COLLAPSED ***
  // Clique nos nav-links navega para view default quando collapsed
  if (sidebar) {
    const navItems = sidebar.querySelectorAll('.nav-item[data-default-view]');
    navItems.forEach(item => {
      const navLink = item.querySelector('.nav-link');
      if (navLink) {
        navLink.addEventListener('click', (e) => {
          // Se sidebar está collapsed E é desktop
          if (sidebar.classList.contains('collapsed') && window.innerWidth >= 992) {
            const defaultView = item.getAttribute('data-default-view');
            if (defaultView) {
              e.preventDefault();
              e.stopPropagation();
              switchView(defaultView);
            }
          }
        });
      }
    });

    // *** FECHAR SUBMENU AO CLICAR FORA ***
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-item') && sidebar.classList.contains('collapsed')) {
        // Fecha qualquer submenu flutuante aberto (o CSS cuida disso via hover)
      }
    });
  }

  // *** FECHAR SIDEBAR AO CLICAR EM ITEM DO SUBMENU FLUTUANTE ***
  if (sidebar) {
    sidebar.addEventListener('click', (e) => {
      const isCollapsedSubmenuItem = e.target.closest('.collapsed-submenu-item');
      if (isCollapsedSubmenuItem && sidebar.classList.contains('collapsed')) {
        // Item do submenu flutuante clicado - a função já foi executada via onclick
        return;
      }
      
      // Verificar se clicou em um link do menu em dispositivo móvel
      if (window.innerWidth < 992) {
        const isMenuLink = e.target.closest('.submenu-link') ||
          e.target.closest('.nav-link:not([data-bs-toggle])') ||
          (e.target.closest('.nav-link') && !e.target.closest('[data-bs-toggle]'));

        if (isMenuLink) {
          // Pequeno delay para permitir que a ação seja executada primeiro
          setTimeout(() => {
            closeSidebarMobile();
          }, 100);
        }
      }
    });
  }

  // Restaurar preferência do usuário em desktop
  if (localStorage.getItem('sidebarCollapsed') === 'true' && window.innerWidth >= 992) {
    sidebar.classList.add('collapsed');
  }

  // Ajustar ao redimensionar a janela
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 992) {
      closeSidebarMobile();
    } else {
      sidebar.classList.remove('collapsed');
    }
  });
}

function iniciarMapa() {
  if (!document.getElementById("map")) return;
  // Se quiser o mapa, descomente aqui e garanta que o Leaflet JS está no HTML
  // const map = L.map("map").setView([-23.5505, -46.6333], 13);
  // L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);
}

window.switchView = async function (viewId) {
  // Evita trocar para a mesma view que já está ativa
  const viewAtual = document.querySelector('.view-section.active');
  if (viewAtual && viewAtual.id === 'view-' + viewId) {
    console.log(`⚠️ View ${viewId} já está ativa - ignorando troca`);
    return;
  }

  console.log(`🔄 Trocando para view: ${viewId}`);

  // Salva a view atual no sessionStorage para manter após atualizar página
  sessionStorage.setItem('currentView', viewId);

  // Mapeia views para skeletons específicos
  const skeletonMap = {
    'principal': 'dashboard',
    'financeiro': 'financeiro',
    'clientes': 'clientes',
    'contratos': 'clientes',
    'novo-job': 'jobs',
    'estoque': 'estoque',
    'novo-item': 'estoque',
    'funcionarios': 'funcionarios',
    'configuracoes': 'configuracoes'
  };

  // Mostra skeleton específico para a view
  const skeletonType = skeletonMap[viewId] || 'dashboard';
  showGlobalSkeleton(skeletonType);

  try {
    // 1. Remove ativo de todas as seções e links (Lógica padrão)
    document.querySelectorAll(".view-section").forEach((el) => el.classList.remove("active"));
    document.querySelectorAll(".submenu-link").forEach((el) => el.classList.remove("active"));

    // 2. Fechar sidebar automaticamente em dispositivos móveis
    if (window.innerWidth < 992) {
      closeSidebarMobile();
    }

    // 3. Ativa a tela desejada
    const viewAlvo = document.getElementById("view-" + viewId);
    if (viewAlvo) viewAlvo.classList.add("active");

    // 4. Ativa o link correspondente no menu lateral
    const linkMenu = document.getElementById("link-" + viewId);
    if (linkMenu) linkMenu.classList.add("active");

    // --- LÓGICA DE CARREGAMENTO ESPECÍFICA ---

    if (viewId === 'principal') {
      await atualizarDashboard();
    }

    if (viewId === 'clientes') {
      await carregarListaClientes();
      // Restaura a página salva se existir
      setTimeout(() => {
        if (window.paginacaoClientes.paginaSalva > 1) {
          console.log('🔙 Restaurando página:', window.paginacaoClientes.paginaSalva);
          window.paginacaoClientes.paginaAtual = window.paginacaoClientes.paginaSalva;
          renderizarPaginaClientes();
          renderizarBotoesPaginacao();
        }
      }, 100);
    }

    if (viewId === 'estoque') {
      await carregarEstoque(); // <--- ADICIONE ISSO PARA RECARREGAR SEMPRE QUE ENTRAR NA TELA
    }

    if (viewId === 'funcionarios') {
      await carregarFuncionarios(); // <--- ADICIONE ISSO
    }

    // === A CORREÇÃO MÁGICA ESTÁ AQUI ===
    if (viewId === 'novo-job') {
      // Verifica se NÃO estamos editando (ou seja, é um NOVO pedido)
      if (window.__jobEditandoId === null) {

        // 1. Limpa os campos de texto (input, select, textarea)
        const form = document.getElementById('formNovoJobFull');
        if (form) form.reset();

        // 2. Limpa a tabela de itens (remove linhas antigas)
        const tbody = document.getElementById('lista-itens-job');
        if (tbody) {
          tbody.innerHTML = '';
          adicionarLinhaItem(); // Adiciona uma linha em branco novinha
        }

        // 3. Zera o Valor Total Visualmente
        const totalEl = document.getElementById('displayValorTotal');
        if (totalEl) totalEl.innerText = "R$ 0,00";

        // 4. Garante que o botão mostre "Salvar" e não "Atualizar"
        const btnSalvar = document.querySelector('#view-novo-job .btn-success');
        if (btnSalvar) btnSalvar.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i> SALVAR PEDIDO';

        // 5. Limpa a equipe do job anterior
        window.equipeDoJob = [];
        const tabelaEquipe = document.getElementById('tabela-equipe-job');
        if (tabelaEquipe) tabelaEquipe.innerHTML = '';

        // 6. Carrega o próximo número do pedido automaticamente
        carregarProximoNumeroPedido();

        // 7. Carrega o logo e nome da empresa
        carregarLogoNoPedido();
      }
    }

    // Configurações
    if (viewId === 'configuracoes') {
      // Carrega dados do perfil do usuário logado
      if (typeof carregarDadosPerfil === 'function') carregarDadosPerfil();
      if (typeof carregarConfigNumeroPedido === 'function') carregarConfigNumeroPedido();
      if (typeof carregarControleAcesso === 'function') carregarControleAcesso();
    }

    // Financeiro
    if (viewId === 'financeiro') {
      if (typeof inicializarFinanceiro === 'function') inicializarFinanceiro();
    }
    // --------------------------------
  } finally {
    // Oculta skeleton após troca de view
    await hideGlobalSkeleton();
  }
}

// Formatadores
// Formatador Inteligente (Milhares e Milhões)
function formatarMoedaK(valor) {
  // Sempre mostra o valor real sem arredondamento (sem K ou M)
  return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatarMoeda(valor) { return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

// Função para formatar data sem problemas de timezone
function formatarData(dataString) {
  if (!dataString) return '-';

  // Se já é string YYYY-MM-DD, extrai diretamente
  if (typeof dataString === 'string') {
    // Remove parte de hora se existir (2026-02-14T00:00:00.000Z -> 2026-02-14)
    const dataLimpa = dataString.split('T')[0];

    // Se está no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataLimpa)) {
      const [ano, mes, dia] = dataLimpa.split('-');
      return `${dia}/${mes}/${ano}`;
    }
  }

  // Fallback: usa UTC para evitar problemas
  const data = new Date(dataString);
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function getStatusPill(status) {
  let classe = "bg-gray-200 text-muted";
  if (status === "Em Andamento") classe = "bg-green-soft text-green";
  if (status === "Agendado") classe = "bg-blue-soft text-blue";
  return `<span class="status-pill ${classe}">${status}</span>`;
}


function getPagamentoPill(status) {
  if (status === "Pago") return `<span class="pill-green">Pago</span>`;
  if (status === "Pendente") return `<span class="pill-yellow">Pendente</span>`;
  return `<span class="pill-red">${status}</span>`;
}


/* =============================================================
   GESTÃO DE CONTRATOS (COM PAGINAÇÃO)
   ============================================================= */

let paginaAtual = 1;
const ITENS_POR_PAGINA = 6; // Mesmo padrão dos clientes
window.todosOsJobsCache = []; // Guarda os dados para não buscar toda hora (GLOBAL)
let jobsFiltrados = []; // <--- NOVA VARIÁVEL
// --- VARIÁVEIS DE CONTROLE DE ESTADO (SWITCH) ---
let estadoViewJobs = 'ativos';
let estadoViewFinanceiro = 'pendentes';
let estadoViewFaturamento = 'previsao';

function carregarGestaoContratos() {
  fetch(`${API_URL}/jobs`)
    .then(res => res.json())
    .then(jobs => {
      // 1. Atualiza o Cache Global com dados novos
      window.todosOsJobsCache = jobs.sort((a, b) => b.id - a.id);
      jobsFiltrados = [...window.todosOsJobsCache];

      // === ADICIONE ESTA LINHA AQUI ===
      atualizarSugestoesBusca(jobs);
      // ================================

      // Atualiza cache de busca global
      if (typeof updateSearchCache === 'function') {
        updateSearchCache();
      }

      // 2. ATUALIZA OS CARDS (Lógica Visual)
      // =====================================

      // --- CARD 1: JOBS ---
      const elTituloJobs = document.getElementById('titulo-jobs');
      const elValorJobs = document.getElementById('kpi-contratos-ativos');
      const elIconBgJobs = document.getElementById('icon-bg-jobs');
      const elIconJobs = document.getElementById('icon-jobs');
      let countJobs = 0;

      if (estadoViewJobs === 'ativos') {
        countJobs = jobs.filter(j => j.status === 'Agendado' || j.status === 'Confirmado' || j.status === 'Em Andamento').length;
        if (elTituloJobs) elTituloJobs.innerText = "Jobs em Aberto";
        if (elValorJobs) elValorJobs.className = "fs-3 fw-bold text-dark sensitive-value";
        if (elIconBgJobs) elIconBgJobs.className = "fin-icon-box bg-green-soft mb-0";
        if (elIconJobs) elIconJobs.className = "bi bi-camera-reels";
      } else if (estadoViewJobs === 'finalizados') {
        countJobs = jobs.filter(j => j.status === 'Finalizado').length;
        if (elTituloJobs) elTituloJobs.innerText = "Jobs Finalizados";
        if (elValorJobs) elValorJobs.className = "fs-3 fw-bold text-primary sensitive-value";
        if (elIconBgJobs) elIconBgJobs.className = "fin-icon-box bg-blue-soft mb-0";
        if (elIconJobs) elIconJobs.className = "bi bi-check-circle-fill";
      } else {
        countJobs = jobs.filter(j => j.status === 'Cancelado').length;
        if (elTituloJobs) elTituloJobs.innerText = "Jobs Cancelados";
        if (elValorJobs) elValorJobs.className = "fs-3 fw-bold text-danger sensitive-value";
        if (elIconBgJobs) elIconBgJobs.className = "fin-icon-box bg-red-soft mb-0";
        if (elIconJobs) elIconJobs.className = "bi bi-x-circle";
      }
      if (elValorJobs) elValorJobs.innerText = countJobs;

      // --- CARD 2: FATURAMENTO ---
      const elTituloFat = document.getElementById('titulo-faturamento');
      const elValorFat = document.getElementById('kpi-contratos-valor');
      const elIconBgFat = document.getElementById('icon-bg-fat');
      const elIconFat = document.getElementById('icon-fat');
      let valorExibir = 0;

      if (estadoViewFaturamento === 'previsao') {
        const jobsPrevisao = jobs.filter(j => j.status === 'Agendado' || j.status === 'Confirmado' || j.status === 'Em Andamento');
        valorExibir = jobsPrevisao.reduce((acc, curr) => acc + Number(curr.valor), 0);
        if (elTituloFat) elTituloFat.innerText = "Previsão Faturamento";
        if (elValorFat) elValorFat.className = "fs-3 fw-bold text-green sensitive-value";
        if (elIconBgFat) elIconBgFat.className = "fin-icon-box bg-green-soft mb-0";
        if (elIconFat) elIconFat.className = "bi bi-currency-dollar";
      } else if (estadoViewFaturamento === 'finalizado') {
        const jobsFinalizados = jobs.filter(j => j.status === 'Finalizado');
        valorExibir = jobsFinalizados.reduce((acc, curr) => acc + Number(curr.valor), 0);
        if (elTituloFat) elTituloFat.innerText = "Faturamento Finalizado";
        if (elValorFat) elValorFat.className = "fs-3 fw-bold text-primary sensitive-value";
        if (elIconBgFat) elIconBgFat.className = "fin-icon-box bg-blue-soft mb-0";
        if (elIconFat) elIconFat.className = "bi bi-check-circle-fill";
      } else {
        const jobsCancelados = jobs.filter(j => j.status === 'Cancelado');
        valorExibir = jobsCancelados.reduce((acc, curr) => acc + Number(curr.valor), 0);
        if (elTituloFat) elTituloFat.innerText = "Valor Perdido (Cancelados)";
        if (elValorFat) elValorFat.className = "fs-3 fw-bold text-danger sensitive-value";
        if (elIconBgFat) elIconBgFat.className = "fin-icon-box bg-red-soft mb-0";
        if (elIconFat) elIconFat.className = "bi bi-graph-down-arrow";
      }
      if (elValorFat) elValorFat.innerText = formatarMoedaK(valorExibir);

      // --- CARD 3: FINANCEIRO ---
      const elTituloFin = document.getElementById('titulo-pendentes');
      const elValorFin = document.getElementById('kpi-contratos-pendentes');
      const elIconBgFin = document.getElementById('icon-bg-fin');
      const elIconFin = document.getElementById('icon-fin');
      let countFin = 0;

      if (estadoViewFinanceiro === 'pendentes') {
        countFin = jobs.filter(j => j.pagamento === 'Pendente').length;
        if (elTituloFin) elTituloFin.innerText = "Faturas Pendentes";
        if (elValorFin) elValorFin.className = "fs-3 fw-bold text-orange sensitive-value";
        if (elIconBgFin) elIconBgFin.className = "fin-icon-box bg-orange-soft mb-0";
        if (elIconFin) elIconFin.className = "bi bi-file-earmark-text";
      } else if (estadoViewFinanceiro === 'vencidas') {
        countFin = jobs.filter(j => j.pagamento === 'Vencido').length;
        if (elTituloFin) elTituloFin.innerText = "Faturas Vencidas";
        if (elValorFin) elValorFin.className = "fs-3 fw-bold text-danger sensitive-value";
        if (elIconBgFin) elIconBgFin.className = "fin-icon-box bg-red-soft mb-0";
        if (elIconFin) elIconFin.className = "bi bi-exclamation-triangle-fill";
      } else {
        countFin = jobs.filter(j => j.pagamento === 'Cancelado').length;
        if (elTituloFin) elTituloFin.innerText = "Faturas Canceladas";
        if (elValorFin) elValorFin.className = "fs-3 fw-bold text-secondary sensitive-value";
        if (elIconBgFin) elIconBgFin.className = "fin-icon-box bg-gray-200 mb-0";
        if (elIconFin) elIconFin.className = "bi bi-x-octagon";
      }
      if (elValorFin) elValorFin.innerText = countFin;


      // =========================================================
      // A CORREÇÃO MÁGICA ESTÁ AQUI EMBAIXO:
      // =========================================================

      // Em vez de desenhar a tabela direto (o que resetaria o filtro),
      // chamamos a função que APLICA os filtros que já estão nos inputs.

      // Vamos usar uma pequena lógica para manter a página atual se possível,
      // mas o mais importante é manter o filtro.

      aplicarFiltrosContratos(paginaAtual);

      // Atualiza indicadores de status no header
      updateStatusIndicators();

    })
    .catch(err => console.error("Erro ao carregar contratos:", err));
}




// Alternar Card Jobs (Aberto -> Finalizado -> Cancelado)
function alternarViewJobs() {
  if (estadoViewJobs === 'ativos') {
    estadoViewJobs = 'finalizados'; // NOVO ESTADO
  } else if (estadoViewJobs === 'finalizados') {
    estadoViewJobs = 'cancelados';
  } else {
    estadoViewJobs = 'ativos'; // Volta ao início
  }
  carregarGestaoContratos();
}

// Alternar Card Faturamento (Previsão -> Finalizado -> Perda)
function alternarViewFaturamento() {
  if (estadoViewFaturamento === 'previsao') {
    estadoViewFaturamento = 'finalizado'; // NOVO ESTADO
  } else if (estadoViewFaturamento === 'finalizado') {
    estadoViewFaturamento = 'perda';
  } else {
    estadoViewFaturamento = 'previsao'; // Volta ao início
  }
  carregarGestaoContratos();
}

// Alternar Card Financeiro (3 Estados: Pendentes -> Vencidas -> Canceladas -> Volta)
function alternarViewFinanceiro() {
  if (estadoViewFinanceiro === 'pendentes') {
    estadoViewFinanceiro = 'vencidas';
  } else if (estadoViewFinanceiro === 'vencidas') {
    estadoViewFinanceiro = 'canceladas'; // NOVO ESTADO
  } else {
    estadoViewFinanceiro = 'pendentes'; // Volta ao início
  }
  carregarGestaoContratos();
}


// Função que roda quando você digita ou muda o select
// Função que roda quando você digita ou muda o select
function aplicarFiltrosContratos() {
  // 1. Pega os valores dos campos
  const texto = document.getElementById('filtro-busca')?.value.trim().toLowerCase() || '';
  const statusSelecionado = document.getElementById('filtro-status')?.value || '';
  const pagamentoSelecionado = document.getElementById('filtro-pagamento')?.value || '';

  console.log('🔍 [FILTRO] Aplicando:', { texto, statusSelecionado, pagamentoSelecionado });
  console.log('🔍 [FILTRO] Jobs no cache:', window.todosOsJobsCache?.length);

  // 2. Filtra a lista
  jobsFiltrados = (window.todosOsJobsCache || []).filter(job => {
    // A) VERIFICAÇÃO DE TEXTO (Nome do Job, Cliente, ID ou Número do Pedido)
    const desc = (job.descricao || "").toLowerCase();      // Nome do Job
    const cliente = (job.nome_cliente || "").toLowerCase(); // Nome do Cliente
    const idString = String(job.id);                        // Número do ID
    const numeroPedido = (job.numero_pedido || "").toLowerCase(); // Número customizado do pedido

    // O texto digitado existe em ALGUM desses 4 lugares?
    const bateuTexto = !texto || desc.includes(texto) ||
      cliente.includes(texto) ||
      idString.includes(texto) ||
      numeroPedido.includes(texto);

    // B) Verifica Status
    let bateuStatus = true;
    if (statusSelecionado && statusSelecionado !== "") {
      bateuStatus = job.status === statusSelecionado;
      // Debug
      if (!bateuStatus) {
        console.log(`❌ Job ${job.id} (${job.descricao}): status "${job.status}" != filtro "${statusSelecionado}"`);
      }
    }

    // C) Verifica Pagamento
    let bateuPagamento = true;
    if (pagamentoSelecionado && pagamentoSelecionado !== "") {
      bateuPagamento = job.pagamento === pagamentoSelecionado;
    }

    // O Job só aparece se passar em TODOS os testes (Texto E Status E Pagamento)
    return bateuTexto && bateuStatus && bateuPagamento;
  });

  console.log('🔍 [FILTRO] Jobs filtrados:', jobsFiltrados.length);

  // 3. Atualiza a tabela começando da página 1
  renderizarTabelaContratos(1);
}
// Função para zerar tudo
function limparFiltros() {
  // Limpa os 3 campos
  document.getElementById('filtro-busca').value = "";
  document.getElementById('filtro-status').value = "";
  document.getElementById('filtro-pagamento').value = ""; // NOVO

  // Reseta a lista
  jobsFiltrados = [...window.todosOsJobsCache];

  renderizarTabelaContratos(1);
}


/* =============================================================
   FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO (TABELA CONTRATOS)
   ============================================================= */
function renderizarTabelaContratos(pagina) {
  const tabela = document.getElementById('tabela-contratos');
  const divPaginacao = document.getElementById('paginacao-contratos');
  const mobileContainer = document.getElementById('contratos-mobile-cards');

  console.log('📊 renderizarTabelaContratos:', {
    pagina,
    totalJobs: jobsFiltrados.length,
    itensPorPagina: ITENS_POR_PAGINA
  });

  if (!tabela) {
    console.error('❌ Tabela não encontrada!');
    return;
  }

  tabela.innerHTML = "";
  if (mobileContainer) mobileContainer.innerHTML = "";
  paginaAtual = pagina;

  // CORREÇÃO: NÃO resetar jobsFiltrados quando vazio!
  // Se está vazio é porque o filtro não encontrou nada.
  // Só inicializa se ainda não existir (null ou undefined)
  if (jobsFiltrados === null || jobsFiltrados === undefined) {
    jobsFiltrados = [...window.todosOsJobsCache];
    console.log('🔄 Inicializou jobsFiltrados:', jobsFiltrados.length);
  }

  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  const fim = inicio + ITENS_POR_PAGINA;

  // Corta a lista para a página atual
  const jobsDaPagina = jobsFiltrados.slice(inicio, fim);

  console.log('📄 Jobs na página:', { inicio, fim, quantidade: jobsDaPagina.length });

  // Calcula páginas baseado no filtro atual
  const totalPaginas = Math.ceil(jobsFiltrados.length / ITENS_POR_PAGINA) || 1;

  console.log('📖 Total de páginas:', totalPaginas);

  // === MENSAGEM DE "NADA ENCONTRADO" ===
  if (jobsDaPagina.length === 0) {
    tabela.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">
                    <div class="text-muted">
                        <i class="bi bi-search fs-1 d-block mb-2"></i>
                        Nenhum contrato encontrado com esses filtros.
                    </div>
                </td>
            </tr>`;
    if (mobileContainer) {
      mobileContainer.innerHTML = `<div class="text-center py-4 text-muted"><i class="bi bi-search fs-1 d-block mb-2"></i>Nenhum contrato encontrado.</div>`;
    }
  } else {
    jobsDaPagina.forEach(job => {
      // --- LÓGICA DE DATA ---
      const dInicio = new Date(job.data_inicio || job.data_job);
      dInicio.setHours(dInicio.getHours() + 3);
      let textoData = "";
      const diaIni = dInicio.getDate();
      const mesIni = dInicio.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

      if (job.data_fim) {
        const dFim = new Date(job.data_fim);
        dFim.setHours(dFim.getHours() + 3);
        if (dFim.toDateString() !== dInicio.toDateString()) {
          const diaFim = dFim.getDate();
          const mesFim = dFim.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
          if (mesIni === mesFim) textoData = `${diaIni} a ${diaFim} ${mesIni}`;
          else textoData = `${diaIni} ${mesIni} - ${diaFim} ${mesFim}`;
        } else textoData = `${diaIni} ${mesIni}`;
      } else textoData = `${diaIni} ${mesIni}`;
      // ---------------------

      // Desktop: table row
      const tr = document.createElement('tr');
      const numeroPedidoDisplay = job.numero_pedido || `PED-${job.id}`;
      tr.innerHTML = `
                <td>
                    <div class="fw-bold text-dark text-truncate" style="max-width: 250px;">${job.descricao}</div>
                    <div class="small text-muted d-flex align-items-center" style="max-width: 250px;">
                        <span class="text-truncate">${job.nome_cliente || 'Cliente'}</span>
                        <span class="badge bg-secondary ms-1 flex-shrink-0" style="font-size:10px;">${numeroPedidoDisplay}</span>
                    </div>
                </td>
                <td>
                    <div class="text-dark small fw-bold">${textoData}</div>
                    <div class="text-muted small" style="font-size: 11px;">Vigência</div>
                </td>
                <td class="fw-bold text-dark">${formatarMoeda(job.valor)}</td>
                <td style="position: relative;"> 
                    <span class="${getStatusPill(job.status, true)} cursor-pointer" 
                          style="display: inline-block; width: 100%; text-align: center;"
                          onclick="abrirMenuStatus(this, ${job.id}, 'status', '${job.status}')">
                          ${job.status}
                    </span>
                </td>
                <td style="position: relative;">
                    <span class="${getPagamentoPill(job.pagamento, true)} cursor-pointer" 
                          style="display: inline-block; width: 100%; text-align: center;"
                          onclick="abrirMenuStatus(this, ${job.id}, 'pagamento', '${job.pagamento}')">
                          ${job.pagamento}
                    </span>
                </td>

<td class="text-end pe-4">
    <div class="dropdown">
        <button class="btn btn-light btn-sm border shadow-sm" 
                type="button" 
                title="Ações"
                onclick="abrirMenuAcoes(event, ${job.id})"
                style="width: 32px; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
            <i class="bi bi-three-dots-vertical text-muted"></i>
        </button>
    </div>
</td>

            `;
      tabela.appendChild(tr);

      // Mobile: card
      if (mobileContainer) {
        const card = document.createElement('div');
        card.className = 'contrato-card-mobile';
        card.innerHTML = `
          <div class="contrato-action">
            <button class="btn btn-light btn-sm border" onclick="abrirMenuAcoes(event, ${job.id})" style="width:32px;height:32px;padding:0;display:inline-flex;align-items:center;justify-content:center;">
              <i class="bi bi-three-dots-vertical text-muted"></i>
            </button>
          </div>
          <div class="contrato-header">
            <div class="contrato-title">${job.descricao}</div>
            <div class="contrato-client d-flex align-items-center">
                <span class="text-truncate">${job.nome_cliente || 'Cliente'}</span>
                <span class="badge bg-secondary ms-1 flex-shrink-0" style="font-size:10px;">${numeroPedidoDisplay}</span>
            </div>
          </div>
          <div class="contrato-meta">
            <span class="contrato-date">${textoData}</span>
            <span class="contrato-valor">${formatarMoeda(job.valor)}</span>
          </div>
          <div class="contrato-pills">
            <span class="${getStatusPill(job.status, true)} cursor-pointer" onclick="abrirMenuStatus(this, ${job.id}, 'status', '${job.status}')">${job.status}</span>
            <span class="${getPagamentoPill(job.pagamento, true)} cursor-pointer" onclick="abrirMenuStatus(this, ${job.id}, 'pagamento', '${job.pagamento}')">${job.pagamento}</span>
          </div>
        `;
        mobileContainer.appendChild(card);
      }
    });
  }

  
  renderizarBotoesPaginacaoContratos(divPaginacao, pagina, totalPaginas);

  // Atualiza visibilidade table/cards conforme tela
  if (typeof toggleMobileCards === 'function') toggleMobileCards();
}


// ===============================
// MENU FLUTUANTE DE AÇÕES (não cria scroll)
// ===============================
(function () {
  function fecharMenuAcoes() {
    const existing = document.getElementById("menu-acoes-flutuante");
    if (existing) existing.remove();
    document.removeEventListener("click", onClickFora, true);
    window.removeEventListener("scroll", fecharMenuAcoes, true);
    window.removeEventListener("resize", fecharMenuAcoes, true);
  }

  function onClickFora(e) {
    const menu = document.getElementById("menu-acoes-flutuante");
    if (!menu) return;
    if (!menu.contains(e.target)) fecharMenuAcoes();
  }

  window.abrirMenuAcoes = function (ev, jobId) {
    try {
      ev.preventDefault();
      ev.stopPropagation();
    } catch { }

    // fecha se já estiver aberto
    fecharMenuAcoes();

    const btn = ev.currentTarget;
    const rect = btn.getBoundingClientRect();

    const menu = document.createElement("div");
    menu.id = "menu-acoes-flutuante";
    menu.className = "menu-acoes-flutuante";
    menu.innerHTML = `
  <button type="button" class="menu-item item-gray" onclick="event.stopPropagation(); window.setJobOrigin('contratos'); abrirDetalhesJob(${jobId}); document.getElementById('menu-acoes-flutuante')?.remove();">
    <i class="bi bi-eye"></i>
    <span>Detalhes</span>
  </button>
  <button type="button" class="menu-item item-blue" onclick="event.stopPropagation(); window.setJobOrigin('contratos'); window.editarJob(${jobId}); document.getElementById('menu-acoes-flutuante')?.remove();">
    <i class="bi bi-pencil-square"></i>
    <span>Editar</span>
  </button>
  <button type="button" class="menu-item item-green" onclick="event.stopPropagation(); abrirModalInvoice(${jobId}); document.getElementById('menu-acoes-flutuante')?.remove();">
    <i class="bi bi-file-earmark-text"></i>
    <span>Gerar Invoice</span>
  </button>
  <div class="divider"></div>
  <button type="button" class="menu-item item-red" onclick="event.stopPropagation(); excluirJob(${jobId}); document.getElementById('menu-acoes-flutuante')?.remove();">
    <i class="bi bi-trash3"></i>
    <span>Apagar</span>
  </button>
`;

    document.body.appendChild(menu);

    // posiciona sem estourar viewport
    const menuRect = menu.getBoundingClientRect();
    let top = rect.bottom + 6;
    let left = rect.right - menuRect.width;

    // se estourar para baixo, sobe
    if (top + menuRect.height > window.innerHeight - 8) {
      top = rect.top - menuRect.height - 6;
    }
    // limites laterais
    left = Math.max(8, Math.min(left, window.innerWidth - menuRect.width - 8));

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;

    // fecha ao clicar fora / scroll / resize
    document.addEventListener("click", onClickFora, true);
    window.addEventListener("scroll", fecharMenuAcoes, true);
    window.addEventListener("resize", fecharMenuAcoes, true);
  };
})();


// Função auxiliar para desenhar os botões de paginação (padrão idêntico aos clientes)
function renderizarBotoesPaginacaoContratos(div, pagina, total) {
  if (!div) return;

  div.innerHTML = '';

  // Se houver apenas 1 página, mostra info mas sem botões (igual aos clientes)
  if (total <= 1) {
    div.innerHTML = `<div class="text-center text-muted small mt-2">Total: ${jobsFiltrados.length} contrato(s)</div>`;
    return;
  }

  let botoesHTML = '<div class="d-flex justify-content-center align-items-center gap-2">';

  // Botão Anterior
  const desabilitarAnterior = pagina === 1;
  botoesHTML += `
    <button class="btn btn-sm btn-outline-secondary" 
            onclick="mudarPaginaContratos(${pagina - 1})" 
            ${desabilitarAnterior ? 'disabled' : ''}>
      <i class="bi bi-chevron-left"></i> Anterior
    </button>
  `;

  // Botões numéricos (máximo 5 páginas visíveis)
  let paginaInicio = Math.max(1, pagina - 2);
  let paginaFim = Math.min(total, paginaInicio + 4);

  // Ajusta início se estiver próximo ao fim
  if (paginaFim - paginaInicio < 4) {
    paginaInicio = Math.max(1, paginaFim - 4);
  }

  for (let i = paginaInicio; i <= paginaFim; i++) {
    const ativo = i === pagina ? 'btn-primary' : 'btn-outline-secondary';
    botoesHTML += `
      <button class="btn btn-sm ${ativo}" 
              onclick="mudarPaginaContratos(${i})" 
              style="min-width: 40px;">
        ${i}
      </button>
    `;
  }

  // Botão Próximo
  const desabilitarProximo = pagina === total;
  botoesHTML += `
    <button class="btn btn-sm btn-outline-secondary" 
            onclick="mudarPaginaContratos(${pagina + 1})" 
            ${desabilitarProximo ? 'disabled' : ''}>
      Próximo <i class="bi bi-chevron-right"></i>
    </button>
  `;

  botoesHTML += `</div>
    <div class="text-center text-muted small mt-2">
      Página ${pagina} de ${total} • Total: ${jobsFiltrados.length} contrato(s)
    </div>`;

  div.innerHTML = botoesHTML;
}

// Função para mudar de página nos contratos
window.mudarPaginaContratos = function (novaPagina) {
  const totalPaginas = Math.ceil(jobsFiltrados.length / ITENS_POR_PAGINA) || 1;

  if (novaPagina < 1 || novaPagina > totalPaginas) return;

  renderizarTabelaContratos(novaPagina);

  // Scroll suave para o topo da tabela
  const tabelaContratos = document.getElementById('tabela-contratos');
  if (tabelaContratos) {
    tabelaContratos.closest('.table-responsive')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}


/* =============================================================
   1. FUNÇÃO DE NAVEGAÇÃO (BOTÃO VER AGENDA)
   ============================================================= */
function navegarParaContratos(event) {
  if (event) event.preventDefault(); // Não deixa o link recarregar a página

  // 1. Esconde todas as telas
  document.querySelectorAll('.view-section').forEach(view => {
    view.classList.remove('active');
  });

  // 2. Mostra a tela de Contratos
  const viewContratos = document.getElementById('view-contratos');
  if (viewContratos) viewContratos.classList.add('active');

  // 3. (Opcional) Atualiza o Menu Lateral para ficar Azul no item certo
  // Remove ativo de todos os links do menu
  document.querySelectorAll('.sidebar .nav-link').forEach(link => link.classList.remove('active'));
  // Tenta achar o link que aponta para contratos (ajuste o seletor se precisar)
  // Exemplo genérico: Pega o link que tem texto "Contratos Ativos" ou similar
  // Se não funcionar o menu lateral, não tem problema, a tela muda igual.
}

/* =============================================================
   2. MENU DE STATUS "BLINDADO" (POSITION FIXED)
   ============================================================= */

let menuAbertoAtual = null;

function abrirMenuStatus(elemento, id, tipo, valorAtual) {
  fecharMenuStatus();

  let opcoes = [];

  // === AQUI ESTÁ A MUDANÇA ===
  if (tipo === 'status') {
    opcoes = [
      { texto: 'Agendado', cor: 'dot-blue' },
      { texto: 'Em Andamento', cor: 'dot-green' },
      { texto: 'Confirmado', cor: 'dot-yellow' },
      { texto: 'Finalizado', cor: 'dot-gray' },
      // REMOVIDO: { texto: 'Entregue', cor: 'dot-gray' },
      { texto: 'Cancelado', cor: 'dot-red' }
    ];
  } else {
    // Opções de Pagamento continuam iguais
    opcoes = [
      { texto: 'Pendente', cor: 'dot-yellow' },
      { texto: 'Pago', cor: 'dot-green' },
      { texto: 'Faturado', cor: 'dot-green' },
      { texto: 'Vencido', cor: 'dot-red' },
      { texto: 'Cancelado', cor: 'dot-gray' }
    ];
  }
  // Cria o Menu
  const menuDiv = document.createElement('div');
  menuDiv.className = 'status-popover';

  // Preenche
  opcoes.forEach(op => {
    const item = document.createElement('div');
    item.className = 'popover-item';
    if (op.texto === valorAtual) item.style.fontWeight = 'bold';
    item.innerHTML = `<span class="dot ${op.cor}"></span> ${op.texto}`;
    item.onclick = (e) => {
      e.stopPropagation();
      // --- TRAVA DE SEGURANÇA ---
      // Pergunta antes de fazer besteira
      const mensagem = `Deseja realmente alterar para "${op.texto}"?`;
      if (!confirm(mensagem)) {
        fecharMenuStatus(); // Se a pessoa cancelar, só fecha o menu e não faz nada
        return;
      }

      // Se a pessoa disse "OK", aí sim salva
      salvarEdicaoPremium(id, tipo, op.texto);
      fecharMenuStatus();

      salvarEdicaoPremium(id, tipo, op.texto);
      fecharMenuStatus();
    };
    menuDiv.appendChild(item);
  });

  // Adiciona ao Body
  document.body.appendChild(menuDiv);

  // --- LÓGICA DE POSIÇÃO FIXA (RESOLVE O PROBLEMA DE ROLAGEM) ---
  const rect = elemento.getBoundingClientRect(); // Posição em relação à JANELA visível
  const windowHeight = window.innerHeight;

  // Reseta estilos para medir
  menuDiv.style.position = 'fixed'; // O PULO DO GATO
  menuDiv.style.left = rect.left + 'px';
  menuDiv.style.width = rect.width + 'px';
  menuDiv.style.maxHeight = '300px'; // Garante que nunca fique gigante

  // Mede altura do menu
  const menuHeight = menuDiv.offsetHeight || 200; // Estima se ainda não renderizou

  // Espaço disponível em baixo vs em cima
  const espacoEmbaixo = windowHeight - rect.bottom;
  const espacoEmcima = rect.top;

  if (espacoEmbaixo > menuHeight || espacoEmbaixo > espacoEmcima) {
    // Abre para BAIXO (tem espaço ou é maior que em cima)
    menuDiv.style.top = (rect.bottom + 5) + 'px';
    menuDiv.style.transformOrigin = "top left";
    // Limita altura se precisar
    if (espacoEmbaixo < menuHeight) {
      menuDiv.style.maxHeight = (espacoEmbaixo - 10) + 'px';
    }
  } else {
    // Abre para CIMA
    menuDiv.style.top = (rect.top - menuHeight - 5) + 'px';
    menuDiv.style.transformOrigin = "bottom left";
    // Recalcula top se tivermos mudado a altura dinâmica no CSS, mas fixed geralmente ok.
    // Se precisar forçar a posição correta após renderizar:
    setTimeout(() => {
      const finalHeight = menuDiv.offsetHeight;
      menuDiv.style.top = (rect.top - finalHeight - 5) + 'px';
    }, 0);
  }

  menuAbertoAtual = menuDiv;

  // Eventos para fechar
  setTimeout(() => {
    document.addEventListener('click', fecharNoCliqueFora);
    window.addEventListener('scroll', fecharMenuStatus, true); // Fecha se rolar a página
    window.addEventListener('resize', fecharMenuStatus);
  }, 50);
}

// (Mantenha as funções fecharMenuStatus, fecharNoCliqueFora e salvarEdicaoPremium iguais)
function fecharMenuStatus() {
  if (menuAbertoAtual) {
    menuAbertoAtual.remove();
    menuAbertoAtual = null;
    document.removeEventListener('click', fecharNoCliqueFora);
    window.removeEventListener('scroll', fecharMenuStatus, true);
    window.removeEventListener('resize', fecharMenuStatus);
  }
}
function fecharMenuStatus() {
  if (menuAbertoAtual) {
    menuAbertoAtual.remove();
    menuAbertoAtual = null;
    document.removeEventListener('click', fecharNoCliqueFora);
    window.removeEventListener('scroll', fecharMenuStatus, true);
  }
}

function fecharNoCliqueFora(e) {
  if (menuAbertoAtual && !menuAbertoAtual.contains(e.target)) {
    fecharMenuStatus();
  }
}

// =============================================================
// FUNÇÃO MESTRA: GERENCIA O CICLO DE VIDA DO PEDIDO
// =============================================================
window.isProcessandoSalvar = false; // Trava de segurança
window.salvarEdicaoPremium = async function (id, tipo, novoValor) {

  // 1. TRAVA DE CLIQUE DUPLO
  if (window.isProcessandoSalvar) return;
  window.isProcessandoSalvar = true;
  document.body.style.cursor = 'wait';

  console.log(`🔄 Analisando mudança do Job ${id}: Tipo=${tipo}, Novo=${novoValor}`);

  try {
    // ✅ OTIMIZAÇÃO: Salva IMEDIATAMENTE mudanças simples (sem validação de estoque)
    // Só faz validação complexa se mudar entre ativo/inativo
    let statusAntigo = null;
    let pularValidacaoEstoque = false;

    if (tipo === 'status') {
      // LISTAS DE DEFINIÇÃO
      const ativos = ['Agendado', 'Confirmado', 'Em Andamento'];
      const inativos = ['Cancelado', 'Finalizado'];

      // Busca status atual do CACHE (mais rápido que servidor)
      if (window.todosOsJobsCache && Array.isArray(window.todosOsJobsCache)) {
        const jobNoCache = window.todosOsJobsCache.find(j => j.id == id);
        if (jobNoCache) {
          statusAntigo = jobNoCache.status;
        }
      }

      // Se não achou no cache, busca do servidor
      if (!statusAntigo) {
        const resJob = await fetch(`${API_URL}/jobs`);
        const todosJobs = await resJob.json();
        const jobAtual = todosJobs.find(j => j.id == id);
        if (jobAtual) statusAntigo = jobAtual.status;
      }

      console.log(`📊 Status: De [${statusAntigo}] para [${novoValor}]`);

      // ✅ DETECTA SE É MUDANÇA NEUTRA (não mexe com estoque)
      const ambosAtivos = ativos.includes(statusAntigo) && ativos.includes(novoValor);
      const ambosInativos = inativos.includes(statusAntigo) && inativos.includes(novoValor);

      if (ambosAtivos || ambosInativos) {
        console.log("⚡ Mudança neutra detectada - pulando validação de estoque");
        pularValidacaoEstoque = true;
      }
    }

    // ⚡ SE FOR MUDANÇA SIMPLES, SALVA DIRETO (RÁPIDO!)
    if (tipo === 'pagamento' || pularValidacaoEstoque) {
      console.log("⚡ Salvando mudança rápida...");

      await fetch(`${API_URL}/jobs/update/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campo: tipo, valor: novoValor })
      });

      // Automação: Se Cancelou status, cancela pagamento
      if (tipo === 'status' && novoValor === 'Cancelado') {
        await fetch(`${API_URL}/jobs/update/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campo: 'pagamento', valor: 'Cancelado' })
        });
      }

      // Notificações de mudança de status
      if (tipo === 'status') {
        let descricaoPedido = 'Pedido';
        if (window.todosOsJobsCache && Array.isArray(window.todosOsJobsCache)) {
          const jobNoCache = window.todosOsJobsCache.find(j => j.id == id);
          if (jobNoCache && jobNoCache.descricao) {
            descricaoPedido = jobNoCache.descricao;
          }
        }

        if (window.notificarMudancaStatus && statusAntigo !== novoValor) {
          window.notificarMudancaStatus(descricaoPedido, statusAntigo, novoValor);
        }

        if (novoValor === 'Cancelado' && window.notificarPedidoCancelado) {
          window.notificarPedidoCancelado(descricaoPedido);
        }
      }

      console.log("✅ Atualização rápida concluída!");

      // Atualiza cache e interface
      atualizarCacheEInterface(id, tipo, novoValor);

      return; // ⚡ SAI AQUI - NÃO EXECUTA O RESTO
    }

    // 🔄 APENAS PARA MUDANÇAS COMPLEXAS (Ativo ↔ Inativo)
    if (tipo === 'status') {

      // LISTAS DE DEFINIÇÃO
      const ativos = ['Agendado', 'Confirmado', 'Em Andamento'];
      const inativos = ['Cancelado', 'Finalizado'];

      // B) BUSCA OS ITENS (Precisamos deles tanto para devolver quanto para baixar)
      const timestamp = new Date().getTime();
      const resItens = await fetch(`${API_URL}/jobs/${id}/itens?t=${timestamp}`);
      const dadosItens = await resItens.json();
      const itens = dadosItens.itens || [];

      console.log(`📦 Total de itens no pedido: ${itens.length}`);
      console.log(`📦 Itens detalhados:`, itens);

      // Conta quantos têm equipamento_id
      const itensComEquipamento = itens.filter(i => i.equipamento_id);
      console.log(`📦 Itens COM equipamento_id: ${itensComEquipamento.length}`);
      console.log(`⏭️ Itens SEM equipamento_id: ${itens.length - itensComEquipamento.length}`);

      // =================================================================
      // CENÁRIO 1: ERA ATIVO -> VIROU INATIVO (DEVOLVER ESTOQUE)
      // =================================================================
      if (ativos.includes(statusAntigo) && inativos.includes(novoValor)) {
        console.log("↩️ Modo Devolução ativado - Tentando devolver estoque...");

        if (itensComEquipamento.length > 0) {
          console.log(`📦 Enviando ${itensComEquipamento.length} itens para devolução...`);

          const resDev = await fetch(`${API_URL}/jobs/${id}/devolver-estoque`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itens: itens })
          });

          const jsonDev = await resDev.json();
          console.log("📦 Resposta da devolução:", jsonDev);

          if (!jsonDev.sucesso) {
            throw new Error("Falha ao devolver estoque: " + jsonDev.mensagem);
          }

          console.log(`✅ Estoque devolvido com sucesso!`);
        } else {
          console.log(`⚠️ Nenhum item com equipamento_id - nada para devolver`);
        }
      }

      // =================================================================
      // CENÁRIO 2: ERA INATIVO -> VIROU ATIVO (BAIXAR ESTOQUE NOVAMENTE)
      // =================================================================
      else if (inativos.includes(statusAntigo) && ativos.includes(novoValor)) {
        if (itens.length > 0) {
          console.log("🔽 Modo Re-ativação (Baixar Estoque) ativado");

          // 1. Primeiro valida se tem estoque suficiente
          const resVal = await fetch(`${API_URL}/jobs/validar-estoque`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itens: itens })
          });
          const jsonVal = await resVal.json();

          if (!jsonVal.valido) {
            alert("⚠️ NÃO É POSSÍVEL REATIVAR ESTE PEDIDO!\n\nMotivo:\n" + jsonVal.mensagem);
            window.isProcessandoSalvar = false;
            document.body.style.cursor = 'default';
            return; // PARA TUDO AQUI
          }

          // 2. Se tem estoque, baixa
          const resBaixa = await fetch(`${API_URL}/jobs/${id}/baixar-estoque`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itens: itens })
          });

          const jsonBaixa = await resBaixa.json();
          if (!jsonBaixa.sucesso) {
            throw new Error("Erro ao baixar estoque: " + jsonBaixa.mensagem);
          }
        }
      }

      // =================================================================
      // CENÁRIO 3: MUDANÇA NEUTRA (Ativo->Ativo ou Inativo->Inativo)
      // =================================================================
      else {
        console.log("😐 Mudança neutra de estoque. Apenas atualizando status.");
      }
    }

    // C) SE PASSOU POR TUDO, SALVA O NOVO STATUS NO BANCO
    await fetch(`${API_URL}/jobs/update/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campo: tipo, valor: novoValor })
    });

    // Automação: Se Cancelou, cancela pagamento
    if (tipo === 'status' && novoValor === 'Cancelado') {
      await fetch(`${API_URL}/jobs/update/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campo: 'pagamento', valor: 'Cancelado' })
      });
    }

    // Notificações de mudança de status
    if (tipo === 'status') {
      // Busca a descrição do pedido do cache local
      let descricaoPedido = 'Pedido';
      if (window.todosOsJobsCache && Array.isArray(window.todosOsJobsCache)) {
        const jobNoCache = window.todosOsJobsCache.find(j => j.id == id);
        if (jobNoCache && jobNoCache.descricao) {
          descricaoPedido = jobNoCache.descricao;
        }
      }

      // Notifica mudança de status (exceto se já vamos notificar cancelamento)
      if (window.notificarMudancaStatus && statusAntigo !== novoValor) {
        window.notificarMudancaStatus(descricaoPedido, statusAntigo, novoValor);
      }

      // Notificação específica para cancelamento
      if (novoValor === 'Cancelado' && window.notificarPedidoCancelado) {
        window.notificarPedidoCancelado(descricaoPedido);
      }
    }

    console.log("✅ Atualização concluída!");

    // Atualiza cache e interface
    atualizarCacheEInterface(id, tipo, novoValor);

  } catch (err) {
    console.error("❌ Erro:", err);
    alert("Erro: " + err.message);
  } finally {
    window.isProcessandoSalvar = false;
    document.body.style.cursor = 'default';
  }
};

// --- SALVA NO BANCO QUANDO MUDAR ---
async function salvarEdicao(selectElem, id, tipo, valorOriginal) {
  const novoValor = selectElem.value;

  // 1) Se está cancelando agora (e antes NÃO era cancelado), devolve estoque
  const virouCancelado = (novoValor === 'Cancelado' && valorOriginal !== 'Cancelado');

  if (virouCancelado) {
    // 1) Busca itens reais do pedido no banco
    const r = await fetch(`${API_URL}/jobs/${id}/itens`);
    const j = await r.json();
    const itens = j.itens || [];

    // 2) Devolve estoque
    const ok = await window.devolverEstoqueAoEditar(id, itens);
    if (!ok) {
      alert("⚠️ Não foi possível devolver o estoque. Cancelamento não aplicado.");
      selectElem.value = valorOriginal;
      return;
    }
  }

  // 2) Atualiza status/pagamento no banco
  try {
    const res = await fetch(`${API_URL}/jobs/update/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campo: tipo, valor: novoValor })
    });

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Erro ao atualizar");

    // Notificações de mudança de status
    if (tipo === 'status') {
      // Busca o job para obter a descrição
      try {
        const resJobs = await fetch(`${API_URL}/jobs`);
        const todosJobs = await resJobs.json();
        const jobAtual = todosJobs.find(j => j.id == id);

        if (jobAtual && jobAtual.descricao) {
          // Notifica mudança de status
          if (window.notificarMudancaStatus && valorOriginal !== novoValor) {
            window.notificarMudancaStatus(jobAtual.descricao, valorOriginal, novoValor);
          }

          // Notificação específica para cancelamento
          if (novoValor === 'Cancelado' && window.notificarPedidoCancelado) {
            window.notificarPedidoCancelado(jobAtual.descricao);
          }
        }
      } catch (errNotif) {
        console.warn('Erro ao criar notificação:', errNotif);
      }
    }

    // 3) ✅ ATUALIZAR O CACHE LOCAL PRIMEIRO
    // Garante que quando recarregarmos a tabela, os dados já estão corretos
    if (window.todosOsJobsCache && Array.isArray(window.todosOsJobsCache)) {
      const jobNoCache = window.todosOsJobsCache.find(j => j.id == id);
      if (jobNoCache) {
        if (tipo === 'status') {
          jobNoCache.status = novoValor;
        } else if (tipo === 'pagamento') {
          jobNoCache.pagamento = novoValor;
        }
        console.log(`✅ Cache local atualizado: ${tipo} = ${novoValor}`);
      }

      // Atualiza também jobsFiltrados se existir
      if (window.jobsFiltrados && Array.isArray(window.jobsFiltrados)) {
        const jobNoFiltro = window.jobsFiltrados.find(j => j.id == id);
        if (jobNoFiltro) {
          if (tipo === 'status') {
            jobNoFiltro.status = novoValor;
          } else if (tipo === 'pagamento') {
            jobNoFiltro.pagamento = novoValor;
          }
        }
      }
    }

    // 4) Atualiza telas + recarrega estoque (pra você ver na hora)
    if (typeof atualizarDashboard === 'function') atualizarDashboard();
    if (typeof renderizarTabelaContratos === 'function') {
      // Renderiza a tabela com o cache atualizado (não busca do servidor)
      renderizarTabelaContratos(window.paginaAtual || 1);
    }
    if (typeof carregarEstoque === 'function') carregarEstoque();

    // 5) Força atualização imediata das notificações
    if (typeof window.forcarAtualizacaoNotificacoes === 'function') {
      setTimeout(() => {
        window.forcarAtualizacaoNotificacoes();
      }, 300);
    }

  } catch (err) {
    console.error("Erro ao salvar:", err);
    alert("Erro ao salvar: " + err.message);
    selectElem.value = valorOriginal; // volta o select
  }
}



// ========================================================
// FUNÇÃO AUXILIAR: Atualiza Cache e Interface
// ========================================================
function atualizarCacheEInterface(id, tipo, novoValor) {
  // Atualiza cache local
  if (window.todosOsJobsCache && Array.isArray(window.todosOsJobsCache)) {
    const jobNoCache = window.todosOsJobsCache.find(j => j.id == id);
    if (jobNoCache) {
      if (tipo === 'status') {
        jobNoCache.status = novoValor;
      } else if (tipo === 'pagamento') {
        jobNoCache.pagamento = novoValor;
      }
      console.log(`✅ Cache local atualizado: ${tipo} = ${novoValor}`);
    }

    // Atualiza também jobsFiltrados
    if (window.jobsFiltrados && Array.isArray(window.jobsFiltrados)) {
      const jobNoFiltro = window.jobsFiltrados.find(j => j.id == id);
      if (jobNoFiltro) {
        if (tipo === 'status') {
          jobNoFiltro.status = novoValor;
        } else if (tipo === 'pagamento') {
          jobNoFiltro.pagamento = novoValor;
        }
      }
    }
  }

  // Força notificações
  if (typeof window.forcarAtualizacaoNotificacoes === 'function') {
    setTimeout(() => window.forcarAtualizacaoNotificacoes(), 300);
  }

  // Renderiza tabela com dados atualizados
  setTimeout(() => {
    if (typeof recarregarCalendario === 'function') recarregarCalendario();
    if (typeof atualizarDashboard === 'function') atualizarDashboard();
    if (typeof renderizarTabelaContratos === 'function') {
      renderizarTabelaContratos(window.paginaAtual || 1);
    }
    if (typeof carregarEstoque === 'function') carregarEstoque();
    alert(`✅ Pedido atualizado para: ${novoValor}`);
  }, 200);
}

function cancelarEdicao(selectElem, valorOriginal, tipo) {
  // Dá um tempinho curto caso o usuário tenha clicado em uma opção
  setTimeout(() => {
    // Se o elemento ainda existir (não foi substituído pelo salvar), recarrega
    if (selectElem.parentNode) {
      carregarGestaoContratos();
    }
  }, 200);
}

// Pequeno ajuste nas funções de cor para retornar classes limpas se precisar
// (Certifique-se que getStatusPill e getPagamentoPill já existem no seu código, 
// vou colocar uma versão segura aqui caso precise atualizar)

function getStatusPill(status, returnClassOnly = false) {
  let classe = 'bg-secondary text-white badge'; // Padrão Cinza

  if (status === 'Agendado') classe = 'status-pill pill-blue';     // Azul
  if (status === 'Em Andamento') classe = 'status-pill pill-green'; // Verde

  // === MUDANÇA AQUI ===
  if (status === 'Confirmado') classe = 'status-pill pill-yellow';  // Amarelo
  // ====================

  if (status === 'Finalizado') classe = 'status-pill pill-gray';    // Cinza
  if (status === 'Cancelado') classe = 'status-pill pill-red';      // Vermelho

  if (returnClassOnly) return classe;
  return `<span class="${classe}">${status}</span>`;
}

function getPagamentoPill(status, returnClassOnly = false) {
  let classe = 'badge bg-light text-dark'; // Padrão

  if (status === 'Pendente') classe = 'pill-yellow';
  if (status === 'Pago') classe = 'pill-green';
  if (status === 'Faturado') classe = 'pill-green';
  if (status === 'Vencido') classe = 'pill-red';

  // === AQUI ESTÁ A MUDANÇA ===
  // Antes estava: 'badge bg-secondary text-white' (Cinza escuro)
  // Agora fica: 'pill-red' (Vermelho suave, igual ao Vencido/Status Cancelado)
  if (status === 'Cancelado') classe = 'pill-red';

  if (returnClassOnly) return classe;
  return `<span class="${classe}">${status}</span>`;
}


function alternarCardJobs() {
  const frente = document.getElementById('job-card-frente');
  const verso = document.getElementById('job-card-verso');

  if (frente.classList.contains('d-none')) {
    frente.classList.remove('d-none');
    verso.classList.add('d-none');
  } else {
    frente.classList.add('d-none');
    verso.classList.remove('d-none');
  }
}



function atualizarSugestoesBusca(jobs) {
  const datalist = document.getElementById('lista-clientes-busca');
  if (!datalist) return;

  datalist.innerHTML = ''; // Limpa a lista anterior

  // 1. Pega todos os nomes de clientes
  const todosClientes = jobs.map(job => job.nome_cliente);

  // 2. Remove duplicados (Cria um Set e volta para Array)
  const clientesUnicos = [...new Set(todosClientes)];

  // 3. Cria as opções na lista
  clientesUnicos.sort().forEach(cliente => {
    if (cliente) { // Só adiciona se não for vazio
      const option = document.createElement('option');
      option.value = cliente;
      datalist.appendChild(option);
    }
  });
}


function exportarParaExcel() {
  // 1. Pega a lista atual (filtrada ou completa)
  let listaBase = (typeof jobsFiltrados !== 'undefined' && jobsFiltrados.length > 0)
    ? jobsFiltrados
    : window.todosOsJobsCache;

  if (!listaBase || listaBase.length === 0) {
    alert("Não há dados para exportar!");
    return;
  }

  // 2. CRIA UMA CÓPIA E ORDENA DO 1 AO ÚLTIMO (Crescente: a.id - b.id)
  // O [...listaBase] serve para não bagunçar a ordem da tabela na tela
  const listaParaExportar = [...listaBase].sort((a, b) => a.id - b.id);

  // 3. Cabeçalho do Excel
  let csvContent = "ID;CLIENTE;DESCRIÇÃO;DATA INÍCIO;DATA FIM;VALOR;STATUS;PAGAMENTO\n";

  // 4. Preenche as linhas
  listaParaExportar.forEach(job => {
    const id = job.id;
    const cliente = (job.nome_cliente || "").replace(/;/g, " ");
    const descricao = (job.descricao || "").replace(/;/g, " ");

    // Datas (usando UTC para evitar problema de timezone)
    const dIni = job.data_job ? formatarData(job.data_job) : "";
    const dFim = job.data_fim ? formatarData(job.data_fim) : "";

    // Valor
    let valor = parseFloat(job.valor || 0).toFixed(2).replace('.', ',');

    const status = job.status || "";
    const pagamento = job.pagamento || "";

    csvContent += `${id};${cliente};${descricao};${dIni};${dFim};R$ ${valor};${status};${pagamento}\n`;
  });

  // 5. Download
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "Relatorio_Contratos.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Busca endereço pelo CEP usando ViaCEP
function buscarEnderecoPorCEP(cep) {
  cep = cep.replace(/\D/g, ""); // Remove caracteres não numéricos
  if (cep.length !== 8) {
    mostrarErroCEP("CEP inválido. Informe 8 dígitos.");
    return;
  }
  fetch(`https://viacep.com.br/ws/${cep}/json/`)
    .then(res => res.json())
    .then(data => {
      if (data.erro) {
        mostrarErroCEP("CEP não encontrado.");
        return;
      }
      document.getElementById('jobLogradouro').value = data.logradouro || "";
      document.getElementById('jobBairro').value = data.bairro || "";
      document.getElementById('jobCidade').value = data.localidade || "";
      document.getElementById('jobEstado').value = data.uf || "";
      limparErroCEP();
    })
    .catch(() => {
      mostrarErroCEP("Erro ao buscar CEP. Tente novamente.");
    });
}

function mostrarErroCEP(msg) {
  let el = document.getElementById('cep-erro');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cep-erro';
    el.className = 'text-danger small mt-1';
    document.getElementById('jobCep').parentElement.appendChild(el);
  }
  el.innerText = msg;
}

function limparErroCEP() {
  const el = document.getElementById('cep-erro');
  if (el) el.remove();
}

function adicionarLinhaItem() {
  const tbody = document.getElementById('lista-itens-job');
  const idx = tbody.children.length;
  const tr = document.createElement('tr');
  tr.innerHTML = `
        <td style="padding-left: 20px;">
            <input type="text" class="form-control" name="itemDescricao[]" placeholder="Descrição do Equipamento ou Serviço" required>
        </td>
        <td style="text-align: center;">
            <input type="number" class="form-control text-center" name="itemQtd[]" min="1" value="1" style="width: 70px;" required>
        </td>
        <td>
            <input type="number" class="form-control" name="itemValor[]" min="0" step="0.01" placeholder="R$" required>
        </td>
        <td>
            <input type="number" class="form-control" name="itemDesconto[]" min="0" max="100" value="0" placeholder="% Desconto">
        </td>
        <td style="text-align: center;">
            <button type="button" class="btn btn-sm btn-danger" onclick="removerLinhaItem(this)"><i class="bi bi-trash"></i></button>
        </td>
    `;
  tbody.appendChild(tr);
}

function removerLinhaItem(btn) {
  btn.closest('tr').remove();
}

// Adiciona uma linha inicial ao abrir o formulário
if (document.getElementById('lista-itens-job')) {
  if (document.getElementById('lista-itens-job').children.length === 0) {
    adicionarLinhaItem();
  }
}

// Atualiza o valor total do pedido em tempo real conforme os itens são preenchidos ou alterados.
function atualizarValorTotalPedido() {
  const linhas = document.querySelectorAll('#lista-itens-job tr');
  if (!linhas || linhas.length === 0) {
    
    return;
  }

  const itens = Array.from(linhas).map(tr => {
    const qtdInput = tr.querySelector('input[name="itemQtd[]"]');
    const valorInput = tr.querySelector('input[name="itemValor[]"]');
    const descontoInput = tr.querySelector('input[name="itemDesconto[]"]');

    // Verificação null-safe
    if (!qtdInput || !valorInput) return 0;

    const qtd = parseFloat(qtdInput.value) || 0;
    const valor = parseFloat(valorInput.value) || 0;
    const desconto = descontoInput ? (parseFloat(descontoInput.value) || 0) : 0;
    const valorComDesconto = valor * (1 - (desconto / 100));
    return qtd * valorComDesconto;
  });

  // Subtotal dos itens
  let subtotal = itens.reduce((soma, v) => soma + v, 0);

  // Desconto global em PERCENTUAL (%)
  const descontoTotalPorcent = parseFloat(document.getElementById('descontoTotal')?.value) || 0;

  // Valida se o percentual está entre 0 e 100
  const descPorcentoValido = Math.max(0, Math.min(100, descontoTotalPorcent));

  // Calcula o total com desconto
  let total = subtotal * (1 - (descPorcentoValido / 100));

  // Garante que nunca fica negativo
  total = Math.max(0, total);

  console.log("DEBUG atualizarValorTotal - Subtotal:", subtotal, "Desconto %:", descPorcentoValido, "Total:", total);

  const el = document.getElementById('displayValorTotal');
  if (el) {
    el.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}

// Adiciona eventos para atualizar o valor total ao digitar
function ativarEventosValorTotal() {
  document.getElementById('lista-itens-job').addEventListener('input', atualizarValorTotalPedido);
  const descontoTotalInput = document.getElementById('descontoTotal');
  if (descontoTotalInput) {
    descontoTotalInput.addEventListener('input', atualizarValorTotalPedido);
  }
}

// Chama ao carregar a tela
if (document.getElementById('lista-itens-job')) {
  ativarEventosValorTotal();
  atualizarValorTotalPedido();
}

// Ao adicionar nova linha, garantir eventos
const _oldAdicionarLinhaItem = adicionarLinhaItem;
adicionarLinhaItem = function () {
  _oldAdicionarLinhaItem();
  ativarEventosValorTotal();
  atualizarValorTotalPedido();
};

// Função para abrir modal do PDF Invoice
// Função atualizada no main.js

// SUBSTITUA A FUNÇÃO abrirModalInvoice NO MAIN.JS
async function abrirModalInvoice(jobId) {
  const id = Number(jobId);

  // Pega dados básicos do Cache
  let job = window.todosOsJobsCache.find(j => Number(j.id) === id);
  if (!job) {
    alert("Pedido não encontrado. Recarregue a página.");
    return;
  }

  try {
    // 1. FAZ AS BUSCAS NECESSÁRIAS (Template + Equipe + Lista de Funcionários + Empresa)
    const [resTemplate, resEquipe, resFuncionarios, resEmpresa] = await Promise.all([
      fetch(`${API_URL}/invoice`),
      fetch(`${API_URL}/jobs/${id}/equipe`),
      fetch(`${API_URL}/funcionarios`), // Buscamos a lista para encontrar o nome do Operador pelo ID
      fetch(`${API_URL}/empresa`) // Busca dados da empresa
    ]);

    let template = await resTemplate.text();
    const equipe = await resEquipe.json();
    const todosFuncionarios = await resFuncionarios.json();
    const empresa = await resEmpresa.json();

    // 2. Lógica para achar o Nome do Operador Responsável
    let nomeOperador = "Não informado";

    // Tenta achar na lista de funcionários usando o ID que está no Job
    if (job.operador_id) {
      const opEncontrado = todosFuncionarios.find(f => f.id == job.operador_id);
      if (opEncontrado) nomeOperador = opEncontrado.nome;
    }
    // Se não tiver ID no job, tenta pegar o primeiro da equipe marcada como 'Operador Principal'
    else {
      const opDaEquipe = equipe.find(m => m.funcao === 'Operador Principal' || m.funcao === 'Técnico Líder');
      if (opDaEquipe) nomeOperador = opDaEquipe.nome;
    }

    // 3. Cálculos de Valores
    const subTotalItens = (job.itens || []).reduce((acc, i) => acc + (i.qtd * i.valor_unitario), 0);
    const valorFinal = parseFloat(job.valor);
    const totalDesconto = subTotalItens - valorFinal;

    // 4. Formatação de Endereço
    const endFat = job.pagador_logradouro
      ? `${job.pagador_logradouro}, ${job.pagador_numero} - ${job.pagador_bairro}, ${job.pagador_cidade}/${job.pagador_uf}`
      : "Endereço não informado";

    // 5. Formatação de Horário
    const fmtHora = (h) => h ? h.substring(0, 5) : '--:--';

    // 6. Montar HTML da Equipe (Excluindo o operador principal se quiser não repetir, ou mostrando todos)
    let htmlEquipe = '';
    if (equipe.length === 0) {
      htmlEquipe = '<li style="color: #94a3b8; font-style: italic;">Equipe auxiliar não designada.</li>';
    } else {
      equipe.forEach(m => {
        htmlEquipe += `
                    <li style="margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed #e2e8f0; display: flex; justify-content: space-between;">
                        <span style="font-weight: 500; color: #334155;">${m.nome}</span>
                        <span style="color: #64748b; font-size: 0.85em;">(${m.funcao || m.cargo})</span>
                    </li>`;
      });
    }

    // 7. SUBSTITUIÇÕES NO TEMPLATE
    // Usa numero_pedido customizado se existir, senão usa ID formatado
    const numeroPedidoDisplay = job.numero_pedido || `PED-${String(job.id).padStart(4, '0')}`;

    template = template
      // Dados Básicos
      .replace('{{ID_JOB}}', numeroPedidoDisplay)
      .replace('{{DATA_HOJE}}', new Date().toLocaleDateString('pt-BR'))
      .replace('{{NOME_CLIENTE}}', job.nome_cliente || 'Não informado')
      .replace('{{DOC_CLIENTE}}', job.cliente_documento || '')
      .replace('{{NOME_SOLICITANTE}}', job.solicitante_nome || '-')
      .replace('{{EMAIL_SOLICITANTE}}', job.solicitante_email || '')
      .replace('{{TEL_SOLICITANTE}}', job.solicitante_telefone || 'Tel não informado')
      .replace('{{DESCRICAO_JOB}}', job.descricao)
      .replace('{{DATA_INICIO}}', formatarData(job.data_inicio))
      .replace('{{DATA_FIM}}', formatarData(job.data_fim))

      // Contatos
      .replace('{{APOIO_NOME}}', job.solicitante_nome || 'Não informado')
      .replace('{{APOIO_EMAIL}}', job.solicitante_email || 'Não informado')
      .replace('{{APOIO_FONE}}', job.solicitante_telefone || 'Não informado')

      // Endereços
      .replace('{{ENDERECO_LOGRADOURO}}', job.logradouro || '')
      .replace('{{ENDERECO_NUMERO}}', job.numero || '')
      .replace('{{ENDERECO_BAIRRO}}', job.bairro || '')
      .replace('{{ENDERECO_CIDADE}}', job.cidade || '')
      .replace('{{ENDERECO_UF}}', job.uf || '')
      .replace('{{NOME_PAGADOR}}', job.pagador_nome || job.nome_cliente)
      .replace('{{DOC_PAGADOR}}', job.pagador_cnpj || job.cliente_documento || '')
      .replace('{{ENDERECO_FATURAMENTO}}', endFat)

      // Financeiro
      .replace('{{FORMA_PAGAMENTO}}', job.forma_pagamento || 'Pix')
      .replace('{{TIPO_DOC}}', job.tipo_documento || 'NF')
      .replace('{{DATA_VENCIMENTO}}', (job.vencimento_texto && job.vencimento_texto !== 'null') ? job.vencimento_texto : 'À vista')
      .replace('{{OBSERVACOES}}', job.observacoes || '')
      .replace('{{VALOR_SUBTOTAL}}', subTotalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
      .replace('R$ 0,00', `R$ ${totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
      .replace('{{VALOR_TOTAL}}', valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))

      // === NOVOS CAMPOS ===
      .replace('{{HORA_CHEGADA}}', fmtHora(job.hora_chegada_prevista))
      .replace('{{HORA_INICIO}}', fmtHora(job.hora_inicio_evento))
      .replace('{{HORA_FIM}}', fmtHora(job.hora_fim_evento))
      .replace('{{NOME_OPERADOR}}', nomeOperador)  // <-- AQUI ENTRA O NOME DO OPERADOR
      .replace('{{LISTA_EQUIPE}}', htmlEquipe);

    // 7.1 SUBSTITUIÇÕES DA EMPRESA
    const logoEmpresaHtml = empresa && empresa.logo
      ? `<img src="${empresa.logo}" alt="Logo" style="max-width: 60px; max-height: 60px; border-radius: 8px;">`
      : 'LOGO';
    const nomeEmpresaDisplay = empresa && empresa.nome_fantasia
      ? empresa.nome_fantasia
      : (empresa && empresa.razao_social ? empresa.razao_social : 'Nome da Empresa');

    template = template
      .replace('{{LOGO_EMPRESA}}', logoEmpresaHtml)
      .replace('{{NOME_EMPRESA}}', nomeEmpresaDisplay)
      .replace('{{SLOGAN_EMPRESA}}', ''); // Pode adicionar campo de slogan no futuro


    // 8. Tabela de Itens
    const linhasTabela = (job.itens || []).map(item => `
            <tr>
                <td>${item.descricao}</td>
                <td style="text-align: center;">${item.qtd}</td>
                <td style="text-align: right;">R$ ${parseFloat(item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td style="text-align: right; font-weight: bold;">R$ ${(item.qtd * item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr>
        `).join('');

    template = template.replace('{{LINHAS_TABELA}}', linhasTabela);

    // 9. Renderiza Modal
    const oldModal = document.getElementById('modalInvoice');
    if (oldModal) oldModal.remove();

    document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="modalInvoice" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg" style="max-width: 900px;">
                    <div class="modal-content">
                        <div class="modal-body p-0" id="invoice-pdf-content">${template}</div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                            <button class="btn btn-primary" onclick="downloadPDFInvoice(${id})">
                                <i class="bi bi-file-earmark-pdf me-1"></i> Baixar PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);

    new bootstrap.Modal(document.getElementById('modalInvoice')).show();

  } catch (erro) {
    console.error("Erro ao gerar invoice:", erro);
    alert("Erro ao gerar documento. Tente novamente.");
  }
}

// NO ARQUIVO MAIN.JS - SUBSTITUA A FUNÇÃO renderizarInvoiceHTML POR ESTA:
function renderizarInvoiceHTML(job) {

  // --- DEBUG: O QUE TEM DENTRO DO JOB? ---
  console.log("=== DADOS CHEGANDO NO INVOICE ===");
  console.log("Operador:", job.nome_operador);
  console.log("Telefone Solicitante:", job.solicitante_telefone);
  console.log("Rua Pagador:", job.pagador_logradouro);
  console.log("OBJETO COMPLETO:", job);
  // ---------------------------------------



  const el = document.getElementById('invoice-pdf-content');
  if (!el) return;

  // --- CÁLCULOS ---
  const subTotal = (job.itens || []).reduce((acc, i) => acc + (i.qtd * i.valor_unitario), 0);
  const totalFinal = parseFloat(job.valor);
  const desconto = subTotal - totalFinal;

  // --- FORMATAÇÃO ---
  const fmtMoeda = (val) => parseFloat(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  // --- MONTAGEM DOS TEXTOS (COM PROTEÇÃO CONTRA VAZIO) ---

  // 1. Operador
  const operadorHTML = job.nome_operador
    ? `<span style="color:#0f172a; font-weight:bold;">${job.nome_operador}</span>`
    : `<span style="color:red;">(Técnico não selecionado)</span>`;

  // 2. Solicitante Telefone
  const telSolicitante = job.solicitante_telefone || 'Tel não informado';

  // 3. Endereço Faturamento (Montagem Inteligente)
  let endFaturamento = "";
  if (job.pagador_logradouro) {
    // Se tem o endereço novo separado
    endFaturamento = `
            ${job.pagador_logradouro}, ${job.pagador_numero}<br>
            ${job.pagador_bairro} - ${job.pagador_cidade}/${job.pagador_uf}<br>
            CEP: ${job.pagador_cep}
        `;
  } else if (job.pagador_endereco) {
    // Se tem o antigo
    endFaturamento = job.pagador_endereco;
  } else {
    // Se não tem nada (usa o do cliente como fallback ou avisa)
    endFaturamento = `<span style="color:#94a3b8; font-style:italic;">Mesmo endereço do evento ou não informado.</span>`;
  }

  // --- HTML DO PDF ---
  el.innerHTML = `
        <div style="font-family: 'Inter', sans-serif; max-width: 900px; margin: auto; background: #fff; padding: 40px; color: #333;">
            
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 25px;">
                <div style="display: flex; gap: 15px; align-items: center;">
                    <div style="width: 50px; height: 50px; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; border-radius: 6px;">LOGO</div>
                    <div>
                        <div style="font-size: 1.3rem; font-weight: 800; color: #0f172a;">Cia ADM Eventos</div>
                        <div style="font-size: 0.8rem;">Soluções em Teleprompt</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.8rem; font-weight: 900; color: #cbd5e1;">PEDIDO #${job.id}</div>
                    <div style="font-size: 0.8rem; color: #64748b;">Emissão: ${new Date().toLocaleDateString('pt-BR')}</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <strong style="color: #64748b; font-size: 0.7rem; text-transform: uppercase;">Cliente / Solicitante</strong>
                    <div style="font-weight: 700; color: #0f172a; margin-top: 5px;">${job.nome_cliente || 'Cliente'}</div>
                    <div style="font-size: 0.8rem; color: #475569; margin-bottom: 8px;">${job.cliente_documento || ''}</div>
                    <hr style="border-top: 1px dashed #cbd5e1;">
                    <div style="font-size: 0.8rem;"><b>Resp:</b> ${job.solicitante_nome || '-'}</div>
                    <div style="font-size: 0.8rem; color: #475569;">${job.solicitante_email || ''}</div>
                    <div style="font-size: 0.8rem; color: #475569;">${telSolicitante}</div>
                </div>

                <div style="background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <strong style="color: #64748b; font-size: 0.7rem; text-transform: uppercase;">Dados do Job</strong>
                    <div style="font-weight: 700; color: #0f172a; margin-top: 5px;">${job.descricao}</div>
                    <div style="font-size: 0.8rem; margin: 5px 0;">
                        ${formatarData(job.data_inicio)} até ${formatarData(job.data_fim)}
                    </div>
                    <div style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; display: inline-block;">
                        Técnico: ${operadorHTML}
                    </div>
                </div>

                <div style="background: #fffbeb; padding: 15px; border-radius: 6px; border: 1px solid #fcd34d;">
                    <strong style="color: #d97706; font-size: 0.7rem; text-transform: uppercase;">Faturamento</strong>
                    <div style="font-weight: 700; color: #0f172a; margin-top: 5px;">${job.pagador_nome || job.nome_cliente}</div>
                    <div style="font-size: 0.8rem; margin-bottom: 8px;">CNPJ: ${job.pagador_cnpj || job.cliente_documento || ''}</div>
                    <hr style="border-top: 1px dashed #fcd34d;">
                    <div style="font-size: 0.8rem; line-height: 1.3; color: #444;">
                        ${endFaturamento}
                    </div>
                </div>
            </div>

            <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse; font-size: 0.85rem;">
                <thead>
                    <tr style="background: #0f172a; color: white;">
                        <th style="padding: 8px; text-align: left;">Descrição</th>
                        <th style="padding: 8px; text-align: center;">Qtd</th>
                        <th style="padding: 8px; text-align: right;">Unitário</th>
                        <th style="padding: 8px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${(job.itens || []).map((item, idx) => `
                        <tr style="background: ${idx % 2 == 0 ? '#fff' : '#f8fafc'}; border-bottom: 1px solid #eee;">
                            <td style="padding: 8px;">${item.descricao}</td>
                            <td style="padding: 8px; text-align: center;">${item.qtd}</td>
                            <td style="padding: 8px; text-align: right;">R$ ${fmtMoeda(item.valor_unitario)}</td>
                            <td style="padding: 8px; text-align: right; font-weight: bold;">R$ ${fmtMoeda(item.qtd * item.valor_unitario)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="display: flex; justify-content: flex-end;">
                <div style="width: 250px; background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                        <span>Subtotal:</span> <span>R$ ${fmtMoeda(subTotal)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: #ef4444; font-size: 0.9rem; margin: 5px 0;">
                        <span>Desconto:</span> <span>- R$ ${fmtMoeda(desconto)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.2rem; border-top: 1px solid #ddd; padding-top: 5px;">
                        <span>TOTAL:</span> <span>R$ ${fmtMoeda(totalFinal)}</span>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 20px; font-size: 0.8rem; color: #666;">
                <b>Condições:</b> ${job.forma_pagamento || '-'} | Vencimento: ${job.vencimento_texto || 'À vista'}
            </div>
        </div>
    `;
}



function salvarInvoicePDF(jobId) {
  const job = window.todosOsJobsCache.find(j => j.id === jobId);
  if (!job) return alert('Pedido não encontrado!');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text(`Pedido #${job.id}\nCliente: ${job.nome_cliente || ''}\nDescrição: ${job.descricao}\nPeríodo: ${job.data_inicio || job.data_job} a ${job.data_fim || job.data_inicio || job.data_job}\nValor: R$ ${parseFloat(job.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nStatus: ${job.status}\nPagamento: ${job.pagamento}`, 10, 10);
  // Itens
  let y = 60;
  (job.itens || []).forEach(i => {
    doc.text(`${i.qtd}x ${i.descricao} - R$ ${parseFloat(i.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 10, y);
    y += 10;
  });
  doc.save(`invoice_pedido_${job.id}.pdf`);
}

// === FUNÇÕES DE IMPRESSÃO E PDF ===

// Imprimir Invoice (usa window.print com CSS de impressão)
window.imprimirInvoice = function () {
  window.print();
}

// Download PDF do Invoice usando html2canvas
window.downloadPDFInvoice = async function (jobId) {
  const element = document.getElementById('invoice-pdf-content');
  if (!element) {
    alert('Erro: Conteúdo do invoice não encontrado.');
    return;
  }

  try {
    // Mostra loading
    const btnPDF = event.target.closest('button');
    const originalHTML = btnPDF.innerHTML;
    btnPDF.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Gerando...';
    btnPDF.disabled = true;

    // Esconde o backdrop e elementos que atrapalham a captura
    const backdrop = document.querySelector('.modal-backdrop');
    const modalFooter = document.querySelector('#modalInvoice .modal-footer');
    if (backdrop) backdrop.style.display = 'none';
    if (modalFooter) modalFooter.style.display = 'none';

    // Garante fundo branco no elemento
    const originalBg = element.style.background;
    element.style.background = '#ffffff';

    // Pequeno delay para garantir renderização
    await new Promise(resolve => setTimeout(resolve, 100));

    // Gera canvas do elemento
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      removeContainer: true
    });

    // Restaura elementos
    if (backdrop) backdrop.style.display = '';
    if (modalFooter) modalFooter.style.display = '';
    element.style.background = originalBg;

    // Converte para PDF
    const { jsPDF } = window.jspdf;
    const imgData = canvas.toDataURL('image/png');

    // Calcula dimensões do PDF (A4)
    const pageWidth = 210; // mm (A4)
    const pageHeight = 297; // mm (A4)
    const imgWidth = pageWidth - 20; // margens de 10mm cada lado
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');

    // Se a imagem for maior que uma página, ajusta
    let heightLeft = imgHeight;
    let position = 10;
    let page = 1;

    // Adiciona a primeira página
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - 20);

    // Adiciona páginas extras se necessário
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 20);
      page++;
    }

    // Baixa o arquivo
    const nomeArquivo = `invoice_pedido_${jobId || 'sem_id'}.pdf`;
    pdf.save(nomeArquivo);

    // Restaura botão
    btnPDF.innerHTML = originalHTML;
    btnPDF.disabled = false;

  } catch (erro) {
    console.error('Erro ao gerar PDF:', erro);
    alert('Erro ao gerar PDF. Tente novamente.');

    // Restaura elementos em caso de erro
    const backdrop = document.querySelector('.modal-backdrop');
    const modalFooter = document.querySelector('#modalInvoice .modal-footer');
    if (backdrop) backdrop.style.display = '';
    if (modalFooter) modalFooter.style.display = '';

    // Restaura botão em caso de erro
    const btnPDF = event.target.closest('button');
    if (btnPDF) {
      btnPDF.innerHTML = '<i class="bi bi-file-earmark-pdf me-1"></i> Baixar PDF';
      btnPDF.disabled = false;
    }
  }
}

// Imprimir Ficha do Cliente
window.imprimirFichaCliente = function () {
  window.print();
}

// Download PDF da Ficha do Cliente
window.downloadPDFCliente = async function () {
  // Pega a section do perfil do cliente
  const element = document.getElementById('view-perfil-cliente');
  if (!element) {
    alert('Erro: Perfil do cliente não encontrado.');
    return;
  }

  try {
    // Encontra o botão que foi clicado
    const btnPDF = event.target.closest('button');
    const originalHTML = btnPDF.innerHTML;
    btnPDF.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Gerando...';
    btnPDF.disabled = true;

    // Pega dados do cliente para o nome do arquivo
    const nomeCliente = document.getElementById('tituloPerfilNome')?.innerText || 'cliente';
    const docCliente = document.getElementById('tituloPerfilDoc')?.innerText || '';

    // Esconde sidebar e elementos que não devem aparecer no PDF
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (sidebar) sidebar.style.display = 'none';
    if (mainContent) mainContent.style.marginLeft = '0';

    const elementosOcultar = element.querySelectorAll('.d-print-none, .nav-tabs, .btn');
    elementosOcultar.forEach(el => el.style.visibility = 'hidden');

    // Pega apenas a aba de dados cadastrais (primeira aba)
    const abaDados = element.querySelector('#aba-dados');
    if (abaDados) abaDados.classList.add('show', 'active');

    // Garante fundo branco
    const originalBg = element.style.background;
    element.style.background = '#ffffff';

    // Pequeno delay para garantir renderização
    await new Promise(resolve => setTimeout(resolve, 100));

    // Gera canvas do elemento
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      windowWidth: 1200,
      removeContainer: true
    });

    // Restaura elementos ocultos
    if (sidebar) sidebar.style.display = '';
    if (mainContent) mainContent.style.marginLeft = '';
    elementosOcultar.forEach(el => el.style.visibility = 'visible');
    element.style.background = originalBg;

    // Converte para PDF
    const { jsPDF } = window.jspdf;
    const imgData = canvas.toDataURL('image/png');

    // Calcula dimensões do PDF (A4)
    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');

    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - 20);

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 20);
    }

    // Limpa nome para arquivo
    const nomeArquivoLimpo = nomeCliente
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);

    const nomeArquivo = `ficha_cliente_${nomeArquivoLimpo}.pdf`;
    pdf.save(nomeArquivo);

    // Restaura botão
    btnPDF.innerHTML = originalHTML;
    btnPDF.disabled = false;

  } catch (erro) {
    console.error('Erro ao gerar PDF:', erro);
    alert('Erro ao gerar PDF. Tente novamente.');

    // Restaura elementos em caso de erro
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (sidebar) sidebar.style.display = '';
    if (mainContent) mainContent.style.marginLeft = '';

    const btnPDF = event.target.closest('button');
    if (btnPDF) {
      btnPDF.innerHTML = '<i class="bi bi-file-earmark-pdf me-2"></i>Baixar PDF';
      btnPDF.disabled = false;
    }
  }
}

function imprimirInvoicePDF(jobId) {
  window.print(); // Simples: imprime o modal
}


// Função para buscar CEP do Pagador (igual a do evento)
window.buscarEnderecoPagador = function (cep) {
  cep = cep.replace(/\D/g, "");
  if (cep.length !== 8) return;

  fetch(`https://viacep.com.br/ws/${cep}/json/`)
    .then(res => res.json())
    .then(data => {
      if (!data.erro) {
        document.getElementById('jobPagadorLogradouro').value = data.logradouro || "";
        document.getElementById('jobPagadorBairro').value = data.bairro || "";
        document.getElementById('jobPagadorCidade').value = data.localidade || "";
        document.getElementById('jobPagadorUf').value = data.uf || "";
        document.getElementById('jobPagadorNumero').focus();
      }
    });
}

/* =============================================================
   CORREÇÃO: EXIBIR DATA DE VENCIMENTO CORRETA NO INVOICE
   Substitua a função 'verInvoice' antiga por esta
   ============================================================= */

window.verInvoice = function (id) {
  // 1. Acha o job na lista que já carregamos (window.todosOsJobs)
  const job = window.todosOsJobs.find(j => j.id == id);

  if (!job) return alert("Erro: Job não encontrado na memória.");

  // 2. Preenche os dados básicos
  document.getElementById('invNumero').innerText = String(job.id).padStart(4, '0');
  document.getElementById('invDataEmissao').innerText = formatarData(job.data_job || new Date());

  // Dados do Cliente (Se o cliente foi apagado, usa texto padrão)
  document.getElementById('invClienteNome').innerText = job.nome_cliente || "Cliente não identificado";
  document.getElementById('invClienteDoc').innerText = job.cliente_documento || "";

  // Endereço do Cliente (Pegando das colunas novas do Job ou do Cliente)
  // Prioriza o endereço salvo no JOB (Pagador), se não tiver, tenta do cliente
  const endereco = job.pagador_logradouro
    ? `${job.pagador_logradouro}, ${job.pagador_numero} - ${job.pagador_bairro} - ${job.pagador_cidade}/${job.pagador_uf}`
    : "Endereço não informado";
  document.getElementById('invClienteEndereco').innerText = endereco;

  // 3. CORREÇÃO DO VENCIMENTO E CONDIÇÕES
  // Aqui estava o problema: ele não estava lendo o 'vencimento_texto'
  const formaPag = job.forma_pagamento || "Não informado";
  const tipoDoc = job.tipo_documento || "Recibo/NF";

  // Pega o texto exato do banco (ex: "02/02/2026" ou "30 dias")
  // Se estiver vazio no banco, aí sim mostra "À vista"
  const textoVencimento = job.vencimento_texto && job.vencimento_texto !== "null"
    ? job.vencimento_texto
    : "À vista";

  // Atualiza o HTML
  const divCondicoes = document.getElementById('invCondicoes');
  if (divCondicoes) {
    divCondicoes.innerHTML = `
            <strong>Forma:</strong> ${formaPag} &nbsp;|&nbsp; 
            <strong>Doc:</strong> ${tipoDoc} <br>
            <strong>Vencimento:</strong> ${textoVencimento}
        `;
  }

  // 4. Preenche os Itens da Tabela
  const tbody = document.getElementById('invListaItens');
  tbody.innerHTML = '';
  let total = 0;

  if (job.itens && job.itens.length > 0) {
    job.itens.forEach(item => {
      const valorTotalItem = item.qtd * item.valor_unitario;
      total += valorTotalItem;
      tbody.innerHTML += `
                <tr>
                    <td>${item.descricao}</td>
                    <td class="text-center">${item.qtd}</td>
                    <td class="text-end">R$ ${parseFloat(item.valor_unitario).toFixed(2)}</td>
                    <td class="text-end">R$ ${valorTotalItem.toFixed(2)}</td>
                </tr>
            `;
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum item lançado.</td></tr>';
  }

  // 5. Totais e Descontos
  const desconto = parseFloat(job.desconto_valor) || 0; // Se tiver coluna de desconto
  const valorFinal = total - desconto;

  document.getElementById('invTotal').innerText = "R$ " + valorFinal.toFixed(2);

  // 6. Mostra o Modal
  const modal = new bootstrap.Modal(document.getElementById('modalInvoice'));
  modal.show();
}

// Função formatarData já definida globalmente no início do arquivo

/* =============================================================
   CADASTRO DE CLIENTES (TELA CHEIA)
   ============================================================= */

// 1. Navegar para a Tela
window.abrirTelaNovoCliente = function () {
  // Limpa o formulário anterior
  const form = document.getElementById('formClienteFull');
  if (form) form.reset();

  // Troca a visão para a tela nova
  switchView('cadastro-cliente');
}

// 2. Salvar Cliente Completo
window.salvarClienteFull = function () {
  // Função auxiliar para pegar valor pelo ID
  const val = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  };

  // Validação obrigatória
  if (!val('cadCliNome')) {
    alert("O Nome/Razão Social é obrigatório!");
    return;
  }

  // Monta o objeto para enviar pro servidor
  const dados = {
    nome: val('cadCliNome'),
    nome_fantasia: val('cadCliFantasia'),
    documento: val('cadCliDoc'),
    inscricao_estadual: val('cadCliIE'),
    status: val('cadCliStatus') || 'Ativo',
    site: val('cadCliSite'),

    // Endereço
    cep: val('cadCliCep'),
    logradouro: val('cadCliLogradouro'),
    numero: val('cadCliNumero'),
    bairro: val('cadCliBairro'),
    cidade: val('cadCliCidade'),
    uf: val('cadCliUf'),

    // === CONTATOS - PEGAR OS DADOS CORRETAMENTE ===
    contato1_nome: val('cadCliContato1Nome'),
    contato1_cargo: val('cadCliContato1Cargo'),
    contato1_email: val('cadCliContato1Email'),
    contato1_telefone: val('cadCliContato1Tel'),

    contato2_nome: val('cadCliContato2Nome'),
    contato2_cargo: val('cadCliContato2Cargo'),
    contato2_email: val('cadCliContato2Email'),
    contato2_telefone: val('cadCliContato2Tel'),

    observacoes: val('cadCliObs')
  };

  console.log("Dados a enviar:", dados); // DEBUG

  // Envia para o Back-end
  fetch(`${API_URL}/clientes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  })
    .then(res => {
      if (!res.ok) {
        return res.text().then(text => {
          console.error("Erro servidor:", text);
          throw new Error(`HTTP ${res.status}: ${text}`);
        });
      }
      return res.json();
    })
    .then(() => {
      alert("Cliente cadastrado com sucesso!");

      // Limpa o formulário
      const form = document.getElementById('formClienteFull');
      if (form) form.reset();

      // Volta para lista de clientes
      switchView('clientes');

      // Recarrega a lista
      carregarListaClientes();

      // Também recarrega opções dos selects em outros forms
      if (typeof carregarOpcoesDoFormulario === 'function') {
        carregarOpcoesDoFormulario();
      }
    })
    .catch(err => {
      console.error("Erro:", err);
      alert("Erro ao salvar: " + err.message);
    });
};




// 3. Função de CEP Genérica (Funciona pra qualquer ID que comece com o prefixo)
// Ex: prefixo 'cadCli' procura IDs 'cadCliLogradouro', 'cadCliBairro' etc.
window.buscarCepGenerico = function (cep, prefixo) {
  cep = cep.replace(/\D/g, "");
  if (cep.length !== 8) return;

  fetch(`https://viacep.com.br/ws/${cep}/json/`)
    .then(res => res.json())
    .then(data => {
      if (!data.erro) {
        if (document.getElementById(`${prefixo}Logradouro`)) document.getElementById(`${prefixo}Logradouro`).value = data.logradouro;
        if (document.getElementById(`${prefixo}Bairro`)) document.getElementById(`${prefixo}Bairro`).value = data.bairro;
        if (document.getElementById(`${prefixo}Cidade`)) document.getElementById(`${prefixo}Cidade`).value = data.localidade;
        if (document.getElementById(`${prefixo}Uf`)) document.getElementById(`${prefixo}Uf`).value = data.uf;

        const numEl = document.getElementById(`${prefixo}Numero`);
        if (numEl) numEl.focus();
      }
    });
}



/* =============================================================
   NOVA TELA DE CADASTRO DE CLIENTES
   ============================================================= */

// 1. Função que o botão "+ Novo Cliente" chama
window.abrirTelaNovoCliente = function () {
  // Limpa o formulário para não aparecer dados antigos
  const form = document.getElementById('formClienteFull');
  if (form) form.reset();

  // Troca a tela atual pela tela de cadastro
  // O switchView já existe no seu código, só estamos usando ele
  switchView('cadastro-cliente');
}

// 2. Função para salvar os dados (Botão Verde "Salvar Cadastro")
window.salvarClienteFull = function () {
  const val = (id) => document.getElementById(id) ? document.getElementById(id).value.trim() : "";

  if (!val('cadCliNome')) {
    alert("O Nome/Razão Social é obrigatório!");
    return;
  }

  const novoStatus = val('cadCliStatus');
  const isEdit = window.idClienteEdicao !== null;

  // Se está editando e MUDANDO o status para algo diferente de Ativo
  if (isEdit && novoStatus !== 'Ativo') {
    // Valida se pode mudar o status
    fetch(`${API_URL}/clientes/${window.idClienteEdicao}/pode-alterar-status`, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ novo_status: novoStatus })
    })
      .then(res => res.json())
      .then(data => {
        if (!data.permitido) {
          alert(data.error);
          return; // Para a execução aqui
        }
        // Se permitido, continua salvando
        executarSalvarCliente();
      })
      .catch(err => {
        console.error("Erro na validação:", err);
        alert("Erro ao validar status: " + err.message);
      });
  } else {
    // Se é novo cliente ou status é Ativo, salva direto
    executarSalvarCliente();
  }

  // === FUNÇÃO INTERNA: Executa o salvamento ===
  function executarSalvarCliente() {
    // Coleta os contatos dinâmicos
    const contatos = coletarContatosDoFormulario();

    const dados = {
      nome: val('cadCliNome'),
      nome_fantasia: val('cadCliFantasia'),
      documento: val('cadCliDoc'),
      inscricao_estadual: val('cadCliIE'),
      status: novoStatus,
      site: val('cadCliSite'),
      cep: val('cadCliCep'),
      logradouro: val('cadCliLogradouro'),
      numero: val('cadCliNumero'),
      bairro: val('cadCliBairro'),
      cidade: val('cadCliCidade'),
      uf: val('cadCliUf'),
      observacoes: val('cadCliObs'),
      // Adiciona os contatos dinâmicos
      contatos: contatos
    };

    const url = isEdit ? `${API_URL}/clientes/${window.idClienteEdicao}` : `${API_URL}/clientes`;
    const method = isEdit ? "PUT" : "POST";

    fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    })
      .then(res => res.json())
      .then(() => {
        alert(isEdit ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
        document.getElementById('formClienteFull').reset();
        window.idClienteEdicao = null;
        limparListaContatos();
        switchView('clientes');  // Vai restaurar a página automaticamente
        carregarListaClientes();
        if (typeof carregarOpcoesDoFormulario === 'function') carregarOpcoesDoFormulario();
      })
      .catch(err => alert("Erro ao salvar: " + err));
  }
};


// 3. Busca de CEP Genérica (Funciona na tela de cliente e na de jobs)
/**
 * =============================================================
 * BUSCA AUTOMÁTICA DE CEP (ViaCEP) - VERSÃO UNIVERSAL
 * =============================================================
 * Função genérica que funciona com qualquer campo de CEP
 * 
 * @param {string} cep - CEP a ser buscado
 * @param {string} prefixo - Prefixo dos IDs dos campos (ex: 'cadCli', 'job', 'config')
 * @param {HTMLElement} inputElement - Elemento do input CEP (para feedback visual)
 * 
 * Exemplo de uso:
 * buscarCepGenerico('01310100', 'cadCli', document.getElementById('cadCliCep'))
 * 
 * IDs esperados: {prefixo}Logradouro, {prefixo}Bairro, {prefixo}Cidade, {prefixo}Uf, {prefixo}Numero
 */
window.buscarCepGenerico = async function (cep, prefixo, inputElement = null) {
  cep = cep.replace(/\D/g, "");

  if (cep.length !== 8) {
    if (inputElement) {
      inputElement.style.borderColor = '';
      inputElement.style.boxShadow = '';
    }
    return;
  }

  try {
    // ⚠️ Feedback visual: Buscando...
    if (inputElement) {
      inputElement.style.borderColor = '#ffc107';
      inputElement.style.boxShadow = '0 0 0 0.2rem rgba(255, 193, 7, 0.25)';
    }

    console.log(`🔍 Buscando CEP: ${cep} com prefixo: ${prefixo}`);

    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (data.erro) {
      // ❌ CEP inválido
      if (inputElement) {
        inputElement.style.borderColor = '#dc3545';
        inputElement.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
        setTimeout(() => {
          inputElement.style.borderColor = '';
          inputElement.style.boxShadow = '';
        }, 3000);
      }
      alert('❌ CEP não encontrado!');
      console.error('❌ CEP não encontrado:', cep);
      return;
    }

    // ✅ CEP encontrado - Preenche os campos
    const setVal = (suffix, val) => {
      const el = document.getElementById(`${prefixo}${suffix}`);
      if (el) {
        el.value = val || '';
        console.log(`✅ Preenchido ${prefixo}${suffix}:`, val);
      } else {
        console.warn(`⚠️ Campo não encontrado: ${prefixo}${suffix}`);
      }
    };

    setVal('Logradouro', data.logradouro);
    setVal('Bairro', data.bairro);
    setVal('Cidade', data.localidade);
    setVal('Uf', data.uf);
    setVal('Estado', data.uf); // Alternativa para 'Estado' ao invés de 'Uf'

    // ✅ Feedback visual: Sucesso!
    if (inputElement) {
      inputElement.style.borderColor = '#28a745';
      inputElement.style.boxShadow = '0 0 0 0.2rem rgba(40, 167, 69, 0.25)';
      setTimeout(() => {
        inputElement.style.borderColor = '';
        inputElement.style.boxShadow = '';
      }, 2000);
    }

    // Foca no campo número
    const numEl = document.getElementById(`${prefixo}Numero`);
    if (numEl) {
      setTimeout(() => numEl.focus(), 100);
    }

    console.log('✅ Endereço preenchido com sucesso!', data);
  } catch (error) {
    console.error('❌ Erro ao buscar CEP:', error);
    alert('⚠️ Erro ao buscar CEP. Verifique sua conexão.');

    if (inputElement) {
      inputElement.style.borderColor = '#dc3545';
      inputElement.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
      setTimeout(() => {
        inputElement.style.borderColor = '';
        inputElement.style.boxShadow = '';
      }, 3000);
    }
  }
};




/* =============================================================
   GERADOR DE CLIENTES (CARDS + LISTA)
   ============================================================= */

// Função para alternar entre Card e Lista
window.alternarViewCliente = function (modo) {
  const containerCards = document.getElementById('lista-clientes-cards');
  const containerLista = document.getElementById('lista-clientes-tabela-container');

  // Botões desktop
  const btnCard = document.getElementById('btn-view-card');
  const btnList = document.getElementById('btn-view-list');

  // Botões mobile
  const btnCardMobile = document.getElementById('btn-view-card-mobile');
  const btnListMobile = document.getElementById('btn-view-list-mobile');

  if (modo === 'card') {
    containerCards.classList.remove('d-none');
    containerLista.classList.add('d-none');

    // Desktop
    if (btnCard && btnList) {
      btnCard.classList.add('active');
      btnList.classList.remove('active');
    }

    // Mobile
    if (btnCardMobile && btnListMobile) {
      btnCardMobile.classList.add('active');
      btnListMobile.classList.remove('active');
    }

  } else {
    containerCards.classList.add('d-none');
    containerLista.classList.remove('d-none');

    // Desktop
    if (btnCard && btnList) {
      btnCard.classList.remove('active');
      btnList.classList.add('active');
    }

    // Mobile
    if (btnCardMobile && btnListMobile) {
      btnCardMobile.classList.remove('active');
      btnListMobile.classList.add('active');
    }

    // Re-renderizar imediatamente se estiver em mobile para garantir que apareça
    const isMobile = window.innerWidth <= 767.98;
    console.log('📱 Alternando para lista - Mobile detectado:', isMobile);

    if (isMobile && window.paginacaoClientes && window.paginacaoClientes.listaTotalFiltrada && window.paginacaoClientes.listaTotalFiltrada.length > 0) {
      
      setTimeout(() => {
        renderizarPaginaClientes();
        // Força exibição do container
        containerLista.style.display = 'block';
        const tbody = document.getElementById('lista-clientes-tabela-body');
        if (tbody) {
          tbody.style.display = 'block';
          tbody.style.width = '100%';
        }
      }, 50);
    }
  }
}

// Listener para redimensionamento da janela
window.addEventListener('resize', function () {
  // Re-renderizar apenas se estivermos na visualização de lista
  const containerLista = document.getElementById('lista-clientes-tabela-container');
  const isListView = !containerLista.classList.contains('d-none');

  if (isListView && window.paginacaoClientes && window.paginacaoClientes.listaTotalFiltrada && window.paginacaoClientes.listaTotalFiltrada.length > 0) {
    // Aguardar um pouco para a transição de tamanho terminar
    setTimeout(() => {
      renderizarPaginaClientes();
    }, 150);
  }
});

// Função Principal de Carregamento
/* SUBSTITUA A FUNÇÃO carregarListaClientes NO main.js */

/* SUBSTITUA A FUNÇÃO carregarListaClientes NO main.js */

// --- VERSÃO CORRIGIDA: CORES DE STATUS DINÂMICAS NOS CARDS E LISTA ---
// =============================================================
//  GESTÃO DE CLIENTES (COM BUSCA AVANÇADA)
// =============================================================

// Variável global para guardar a lista original
window.cacheClientes = [];

// Variáveis de controle de paginação
window.paginacaoClientes = {
  paginaAtual: 1,
  itensPorPagina: 6,
  listaTotalFiltrada: [],
  paginaSalva: 1  // Guarda a página antes de sair da lista
};

// 1. Função Principal: Busca do Servidor e guarda no Cache
async function carregarListaClientes() {
  try {
    const res = await fetch(`${API_URL}/clientes`);
    const clientes = await res.json();

    // MODIFICAÇÃO: Ordenar para que INATIVOS e BLOQUEADOS vão para o final da lista
    clientes.sort((a, b) => {
      if (a.status === 'Ativo' && b.status !== 'Ativo') return -1;
      if (a.status !== 'Ativo' && b.status === 'Ativo') return 1;
      return 0;
    });

    // Guarda na memória para filtrar rápido sem ir no servidor
    window.cacheClientes = clientes;
    window.listaClientes = clientes; // Para busca global

    // Desenha a tela com todos os clientes (COM PAGINAÇÃO)
    renderizarClientesComPaginacao(window.cacheClientes);

    // Atualiza cache de busca
    if (typeof updateSearchCache === 'function') {
      updateSearchCache();
    }
  } catch (err) {
    console.error("Erro ao carregar clientes:", err);
  }
}

// 2. Função de Filtragem (O que você pediu!)
// 2. Função de Filtragem (Texto + Tipo PF/PJ + Status)
window.filtrarClientes = function () {
  // Pega o texto digitado (minúsculo)
  const texto = document.getElementById('inputBuscaCliente').value.toLowerCase().trim();
  // Pega o tipo selecionado no dropdown (PF, PJ ou Vazio)
  const tipoSelecionado = document.getElementById('filtroTipoCliente').value;
  // Pega o status selecionado (Ativo, Inativo, Bloqueado ou Vazio)
  const statusSelecionado = document.getElementById('filtroStatusCliente').value;

  console.log('🔍 Filtros aplicados:', { texto, tipoSelecionado, statusSelecionado });

  // Se não tiver nenhum filtro, mostra tudo
  if (texto === "" && tipoSelecionado === "" && statusSelecionado === "") {
    console.log('📋 Mostrando todos os clientes:', window.cacheClientes.length);
    renderizarClientesComPaginacao(window.cacheClientes);
    return;
  }

  const filtrados = window.cacheClientes.filter(cli => {
    // --- 1. FILTRO DE TIPO (PF ou PJ) ---
    // Consideramos PJ se o documento formatado tiver mais de 14 caracteres (CNPJ tem 18, CPF tem 14)
    const isPJ = cli.documento && cli.documento.length > 14;

    if (tipoSelecionado === "PF" && isPJ) return false; // Se quer PF mas é PJ, esconde
    if (tipoSelecionado === "PJ" && !isPJ) return false; // Se quer PJ mas é PF, esconde

    // --- 2. FILTRO DE STATUS ---
    if (statusSelecionado !== "" && cli.status !== statusSelecionado) return false;

    // --- 3. FILTRO DE TEXTO (Nome, Doc, Email, etc) ---
    if (texto !== "") {
      const nomeEmpresa = (cli.nome || "").toLowerCase();
      const nomeFantasia = (cli.nome_fantasia || "").toLowerCase();
      const doc = (cli.documento || "").replace(/\D/g, ""); // Só números
      const docFormatado = (cli.documento || "").toLowerCase();
      const responsavel = (cli.contato1_nome || "").toLowerCase();
      const email = (cli.email || cli.contato1_email || "").toLowerCase();

      // Retorna VERDADEIRO se achar o texto em algum lugar
      return nomeEmpresa.includes(texto) ||
        nomeFantasia.includes(texto) ||
        doc.includes(texto) ||
        docFormatado.includes(texto) ||
        responsavel.includes(texto) ||
        email.includes(texto);
    }

    // Se passou pelos filtros e não tem texto digitado, mostra o cliente
    return true;
  });

  console.log('✅ Clientes filtrados:', filtrados.length);
  renderizarClientesComPaginacao(filtrados);
}


// 3. Função que Desenha a Tela COM PAGINAÇÃO (Cards e Lista)
function renderizarClientesComPaginacao(lista) {
  console.log('📄 Renderizando com paginação:', lista.length, 'clientes');

  // Guarda a lista filtrada total
  window.paginacaoClientes.listaTotalFiltrada = lista;

  // Renderiza a primeira página
  window.paginacaoClientes.paginaAtual = 1;
  renderizarPaginaClientes();
  renderizarBotoesPaginacao();
}

// Função auxiliar para renderizar apenas uma página específica
function renderizarPaginaClientes() {
  const lista = window.paginacaoClientes.listaTotalFiltrada;
  const paginaAtual = window.paginacaoClientes.paginaAtual;
  const itensPorPagina = window.paginacaoClientes.itensPorPagina;

  const containerCards = document.getElementById('lista-clientes-cards');
  const containerLista = document.getElementById('lista-clientes-tabela-body');

  if (!containerCards || !containerLista) return;

  containerCards.innerHTML = "";
  containerLista.innerHTML = "";

  if (lista.length === 0) {
    containerCards.innerHTML = '<div class="col-12 text-center text-muted py-5">Nenhum cliente encontrado com esse filtro.</div>';

    // Verificar se é mobile para a mensagem da lista
    const isMobile = window.innerWidth <= 767.98;
    if (isMobile) {
      containerLista.innerHTML = '<div class="text-center py-4 text-muted">Nenhum cliente encontrado com esse filtro.</div>';
    } else {
      containerLista.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum cliente encontrado.</td></tr>';
    }
    return;
  }

  // Calcula os índices de início e fim da página atual
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const clientesDaPagina = lista.slice(inicio, fim);

  clientesDaPagina.forEach(cli => {
    const isPJ = cli.documento && cli.documento.length > 14;
    const avatarClass = isPJ ? "bg-blue-soft text-blue" : "bg-purple-soft text-purple";
    const icon = isPJ ? "bi-building" : "bi-person";

    // Dados de Contato
    const nomeContato = cli.contato1_nome || 'Nome não inf.';
    const email = cli.contato1_email || cli.email || 'Email não inf.';
    const telefone = cli.contato1_telefone || cli.telefone || 'Tel não inf.';

    // Lógica de Cor do Status
    let classeStatus = 'pill-green'; // Ativo
    if (cli.status === 'Inativo') classeStatus = 'pill-red';
    else if (cli.status === 'Bloqueado') classeStatus = 'pill-yellow';

    // HTML do Menu (Dropdown)
    const menuDropdownHTML = `
            <ul class="dropdown-menu dropdown-menu-end dropdown-menu-modern">
                <li>
                    <a class="dropdown-item-modern item-gray" href="#" onclick="abrirPerfilCliente(${cli.id}); event.stopPropagation()">
                        <i class="bi bi-eye"></i> Detalhes
                    </a>
                </li>
                <li>
                    <a class="dropdown-item-modern item-blue" href="#" onclick="editarCliente(${cli.id}); event.stopPropagation()">
                        <i class="bi bi-pencil-square"></i> Editar
                    </a>
                </li>
                <li>
                    <a class="dropdown-item-modern item-red" href="#" onclick="excluirCliente(${cli.id}); event.stopPropagation()">
                        <i class="bi bi-trash3"></i> Excluir
                    </a>
                </li>
            </ul>
        `;

    // --- RENDERIZAÇÃO DO CARD ---
    const cardHTML = `
        <div class="col-md-6 col-xl-4">
            <div class="card-custom h-100 p-3 shadow-sm border-0 bg-white position-relative card-hover-effect" 
                 onclick="abrirPerfilCliente(${cli.id})" 
                 style="cursor: pointer; transition: transform 0.2s;">
                
                <div class="position-absolute top-0 end-0 p-3" style="z-index: 5;">
                    <div class="dropdown">
                        <button class="btn btn-sm" 
                                type="button" 
                                data-bs-toggle="dropdown" 
                                onclick="event.stopPropagation()" 
                                style="width: 32px; height: 32px;">
                            <i class="bi bi-three-dots-vertical text-muted"></i>
                        </button>
                        ${menuDropdownHTML}
                    </div>
                </div>

                <div class="d-flex align-items-center mb-3">
                    <div class="client-avatar ${avatarClass} me-3" style="width:45px; height:45px; display:flex; align-items:center; justify-content:center; border-radius:8px;">
                        <i class="bi ${icon}"></i>
                    </div>
                    <div style="max-width: 70%;">
                        <h6 class="fw-bold mb-0 text-dark text-truncate" title="${cli.nome}">${cli.nome}</h6>
                        <span class="badge ${isPJ ? 'bg-light text-primary' : 'bg-light text-purple'} border">${isPJ ? 'PJ' : 'PF'}</span>
                    </div>
                </div>
                
                <div class="mt-3 small border-top pt-3">
                    <div class="text-dark fw-bold mb-1 text-truncate" title="Responsável"><i class="bi bi-person-fill me-2 text-muted"></i>${nomeContato}</div>
                    <div class="text-muted mb-1 text-truncate"><i class="bi bi-envelope me-2"></i>${email}</div>
                    <div class="text-muted mb-1"><i class="bi bi-telephone me-2"></i>${telefone}</div>
                </div>

                <div class="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                    <span class="font-monospace text-muted small" style="font-size: 0.75rem;">${cli.documento || '---'}</span>
                    <span class="status-pill ${classeStatus} small">${cli.status || 'Ativo'}</span>
                </div>
            </div>
        </div>`;
    containerCards.insertAdjacentHTML('beforeend', cardHTML);

    // --- RENDERIZAÇÃO DA LISTA (TABELA) ---

    // Verificar se é mobile
    const isMobile = window.innerWidth <= 767.98;
    console.log('📱 Mobile detectado:', isMobile, 'Largura:', window.innerWidth);

    if (isMobile) {
      // Renderizar cards lineares para mobile
      const cardLinearHTML = `
        <div class="cliente-row-mobile" onclick="abrirPerfilCliente(${cli.id})">
          <div class="row align-items-center">
            <div class="col-auto">
              <div class="client-avatar ${avatarClass}">
                <i class="bi ${icon}"></i>
              </div>
            </div>
            <div class="col">
              <div class="cliente-info">
                <h6 class="text-truncate" title="${cli.nome}">${cli.nome}</h6>
                <span class="small">${isPJ ? 'PJ' : 'PF'} • ${cli.documento || 'Documento não informado'}</span>
                <div class="contact-info">
                  <span class="contact-item">
                    <i class="bi bi-person-fill"></i>
                    ${nomeContato.length > 15 ? nomeContato.substring(0, 13) + '...' : nomeContato}
                  </span>
                  <span class="contact-item">
                    <i class="bi bi-envelope"></i>
                    ${email.length > 18 ? email.substring(0, 16) + '...' : email}
                  </span>
                </div>
              </div>
            </div>
            <div class="col-auto">
              <div class="cliente-actions">
                <span class="status-pill ${classeStatus}">${cli.status || 'Ativo'}</span>
                <div class="dropdown">
                  <button class="btn-actions" 
                          type="button" 
                          data-bs-toggle="dropdown" 
                          onclick="event.stopPropagation()">
                    <i class="bi bi-three-dots-vertical"></i>
                  </button>
                  ${menuDropdownHTML}
                </div>
              </div>
            </div>
          </div>
        </div>`;

      containerLista.insertAdjacentHTML('beforeend', cardLinearHTML);
      console.log('✅ Card linear adicionado para:', cli.nome);

      // Garantir que o container esteja visível
      const container = document.getElementById('lista-clientes-tabela-container');
      if (container) {
        container.style.display = 'block';
        container.classList.remove('d-none');
      }

    } else {
      // Renderizar tabela tradicional para desktop
      const rowHTML = `
        <tr class="align-middle bg-white border-bottom table-row-hover" 
            onclick="abrirPerfilCliente(${cli.id})" 
            style="cursor: pointer;">
            
            <td class="ps-4 py-3">
                <div class="d-flex align-items-center">
                    <div class="client-avatar ${avatarClass} me-2" style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:6px; font-size: 0.9rem;">
                        <i class="bi ${icon}"></i>
                    </div>
                    <div>
                        <div class="fw-bold text-dark text-truncate" style="max-width: 200px;" title="${cli.nome}">${cli.nome}</div>
                        <div class="small text-muted" style="font-size: 0.75rem;">${cli.nome_fantasia || ''}</div>
                    </div>
                </div>
            </td>
            <td class="font-monospace small text-muted">${cli.documento || '---'}</td>
            <td>
                <div class="fw-bold text-dark small">${nomeContato}</div>
                <div class="text-muted" style="font-size: 0.75rem;">${email}</div>
            </td>
            <td class="small text-muted">${cli.cidade || ''}/${cli.uf || ''}</td>
            <td><span class="status-pill ${classeStatus} small">${cli.status || 'Ativo'}</span></td>
            
            <td class="text-end pe-4">
                <div class="dropdown">
                    <button class="btn btn-light btn-sm border shadow-sm" 
                            type="button" 
                            data-bs-toggle="dropdown" 
                            onclick="event.stopPropagation()"
                            style="width: 32px; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                        <i class="bi bi-three-dots-vertical text-muted"></i>
                    </button>
                    ${menuDropdownHTML}
                </div>
            </td>
        </tr>`;
      containerLista.insertAdjacentHTML('beforeend', rowHTML);
      console.log('✅ Linha de tabela adicionada para:', cli.nome);
    }
  });
}

// Função para renderizar os botões de paginação
function renderizarBotoesPaginacao() {
  const lista = window.paginacaoClientes.listaTotalFiltrada;
  const paginaAtual = window.paginacaoClientes.paginaAtual;
  const itensPorPagina = window.paginacaoClientes.itensPorPagina;

  const totalPaginas = Math.ceil(lista.length / itensPorPagina);

  console.log('📖 Paginação:', { total: lista.length, porPagina: itensPorPagina, totalPaginas });

  // Encontrar container de paginação
  const containerPaginacao = document.getElementById('paginacao-clientes');
  if (!containerPaginacao) {
    console.error('❌ Container de paginação não encontrado!');
    return;
  }

  containerPaginacao.innerHTML = '';

  if (totalPaginas <= 1) {
    // Se houver apenas 1 página, mostra info mas sem botões
    containerPaginacao.innerHTML = `<div class="text-center text-muted small mt-2">Total: ${lista.length} cliente(s)</div>`;
    return;
  }

  let botoesHTML = '<div class="d-flex justify-content-center align-items-center gap-2">';

  // Botão Anterior
  const desabilitarAnterior = paginaAtual === 1;
  botoesHTML += `
    <button class="btn btn-sm btn-outline-secondary" 
            onclick="mudarPaginaClientes(${paginaAtual - 1})" 
            ${desabilitarAnterior ? 'disabled' : ''}>
      <i class="bi bi-chevron-left"></i> Anterior
    </button>
  `;

  // Botões numéricos (máximo 5 páginas visíveis)
  let paginaInicio = Math.max(1, paginaAtual - 2);
  let paginaFim = Math.min(totalPaginas, paginaInicio + 4);

  // Ajusta início se estiver próximo ao fim
  if (paginaFim - paginaInicio < 4) {
    paginaInicio = Math.max(1, paginaFim - 4);
  }

  for (let i = paginaInicio; i <= paginaFim; i++) {
    const ativo = i === paginaAtual ? 'btn-primary' : 'btn-outline-secondary';
    botoesHTML += `
      <button class="btn btn-sm ${ativo}" 
              onclick="mudarPaginaClientes(${i})" 
              style="min-width: 40px;">
        ${i}
      </button>
    `;
  }

  // Botão Próximo
  const desabilitarProximo = paginaAtual === totalPaginas;
  botoesHTML += `
    <button class="btn btn-sm btn-outline-secondary" 
            onclick="mudarPaginaClientes(${paginaAtual + 1})" 
            ${desabilitarProximo ? 'disabled' : ''}>
      Próximo <i class="bi bi-chevron-right"></i>
    </button>
  `;

  botoesHTML += `</div>
    <div class="text-center text-muted small mt-2">
      Página ${paginaAtual} de ${totalPaginas} • Total: ${lista.length} cliente(s)
    </div>`;

  containerPaginacao.innerHTML = botoesHTML;
}

// Função para mudar de página
window.mudarPaginaClientes = function (novaPagina) {
  const totalPaginas = Math.ceil(window.paginacaoClientes.listaTotalFiltrada.length / window.paginacaoClientes.itensPorPagina);

  if (novaPagina < 1 || novaPagina > totalPaginas) return;

  window.paginacaoClientes.paginaAtual = novaPagina;
  window.paginacaoClientes.paginaSalva = novaPagina;  // Salva automaticamente ao mudar

  renderizarPaginaClientes();
  renderizarBotoesPaginacao();

  // Scroll suave para o topo da lista
  const listaCards = document.getElementById('lista-clientes-cards');
  if (listaCards) {
    listaCards.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Função para voltar à lista de clientes mantendo a página
window.voltarParaListaClientes = function () {
  
  switchView('clientes');
}

// --- FUNÇÃO DE EXCLUIR ---
// --- FUNÇÃO DE EXCLUIR (COM LEITURA DE ERRO) ---
window.excluirCliente = function (id) {
  if (confirm("Tem certeza que deseja excluir este cliente?")) {
    fetch(`${API_URL}/clientes/${id}`, {
      method: 'DELETE'
    })
      .then(async res => {
        // Se a resposta não for OK (ex: erro 400 de bloqueio), pega o texto do erro
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Erro desconhecido ao excluir.");
        }
        return data;
      })
      .then(() => {
        alert("Cliente excluído com sucesso!");
        // Atualiza a lista sem recarregar a página
        // Mantém a página atual salva
        carregarListaClientes();
        setTimeout(() => {
          if (window.paginacaoClientes.paginaSalva > 1) {
            window.paginacaoClientes.paginaAtual = window.paginacaoClientes.paginaSalva;
            renderizarPaginaClientes();
            renderizarBotoesPaginacao();
          }
        }, 100);
      })
      .catch(err => {
        // Mostra o alerta com o motivo do bloqueio
        alert("❌ " + err.message);
      });
  }
}

// --- FUNÇÃO DE EDITAR (Carrega dados e abre tela) ---
window.editarCliente = function (id) {
  // Salva a página atual antes de sair
  window.paginacaoClientes.paginaSalva = window.paginacaoClientes.paginaAtual;
  console.log('💾 Salvando página atual:', window.paginacaoClientes.paginaSalva);

  // 1. Busca os dados do cliente no banco
  fetch(`${API_URL}/clientes/${id}`)
    .then(res => res.json())
    .then(cli => {
      if (!cli) return alert("Cliente não encontrado.");

      // 2. Marca que estamos editando este ID
      window.idClienteEdicao = id;

      // 3. Abre a tela de cadastro
      switchView('cadastro-cliente');

      // Inicializa máscaras nos campos do formulário
      setTimeout(inicializarTodasAsMascaras, 100);

      // 4. Preenche os campos (Função auxiliar interna)
      const setVal = (idCampo, valor) => {
        const el = document.getElementById(idCampo);
        if (el) el.value = valor || "";
      };

      setVal('cadCliNome', cli.nome);
      setVal('cadCliFantasia', cli.nome_fantasia);
      setVal('cadCliDoc', cli.documento);
      setVal('cadCliIE', cli.inscricao_estadual);
      setVal('cadCliStatus', cli.status);
      setVal('cadCliSite', cli.site);

      setVal('cadCliCep', cli.cep);
      setVal('cadCliLogradouro', cli.logradouro);
      setVal('cadCliNumero', cli.numero);
      setVal('cadCliBairro', cli.bairro);
      setVal('cadCliCidade', cli.cidade);
      setVal('cadCliUf', cli.uf);

      setVal('cadCliObs', cli.observacoes);

      // Muda o texto do botão para indicar edição
      const btnSalvar = document.querySelector('#view-cadastro-cliente .btn-success');
      if (btnSalvar) btnSalvar.innerHTML = '<i class="bi bi-check-lg me-2"></i> Atualizar Cliente';

      // 5. Carrega os contatos dinâmicos do cliente
      fetch(`${API_URL}/clientes/${id}/contatos`)
        .then(res => res.json())
        .then(contatos => {
          console.log('📝 Contatos carregados para edição:', contatos);
          preencherListaContatos(contatos);
        })
        .catch(err => {
          console.error("Erro ao carregar contatos:", err);
          // Se der erro, adiciona um contato vazio
          limparListaContatos();
          adicionarNovoContato();
        });
    })
    .catch(err => {
      console.error("Erro ao carregar cliente:", err);
      alert("Erro ao carregar dados do cliente.");
    });
}

// --- FUNÇÃO PARA LIMPAR EDIÇÃO AO CRIAR NOVO ---
// Atualize sua função abrirTelaNovoCliente para limpar a variável de edição
window.abrirTelaNovoCliente = function () {
  window.idClienteEdicao = null; // Zera a edição
  const form = document.getElementById('formClienteFull');
  if (form) form.reset();

  // Volta texto do botão ao normal
  const btnSalvar = document.querySelector('#view-cadastro-cliente .btn-success');
  if (btnSalvar) btnSalvar.innerHTML = '<i class="bi bi-check-lg me-2"></i> Salvar Cadastro';

  // Limpa e adiciona um contato vazio na lista
  limparListaContatos();
  adicionarNovoContato();

  switchView('cadastro-cliente');

  // Inicializa máscaras nos campos do formulário
  setTimeout(inicializarTodasAsMascaras, 100);
}

/* =============================================================
   GESTÃO DINÂMICA DE CONTATOS
   ============================================================= */

// Contador global para IDs únicos de contatos
window.contadorContatos = 0;

// Função para adicionar um novo contato à lista
window.adicionarNovoContato = function () {
  const listaContatos = document.getElementById('lista-contatos-dinamica');
  if (!listaContatos) return;

  window.contadorContatos++;
  const idContato = window.contadorContatos;

  const contatoHTML = `
    <div class="contato-item mb-3 pb-3 border-bottom" id="contato-${idContato}" data-contato-id="${idContato}">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="small fw-bold text-muted mb-0">
          <i class="bi bi-person-circle me-1"></i>Contato #${idContato}
        </h6>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removerContato(${idContato})" title="Remover">
          <i class="bi bi-trash"></i>
        </button>
      </div>
      
      <div class="mb-2">
        <label class="small text-muted">Nome Completo</label>
        <input type="text" class="form-control form-control-sm contato-nome" 
               placeholder="Ex: João Silva">
      </div>
      
      <div class="mb-2">
        <label class="small text-muted">Cargo/Departamento</label>
        <input type="text" class="form-control form-control-sm contato-cargo" 
               placeholder="Ex: Gerente Comercial">
      </div>
      
      <div class="mb-2">
        <label class="small text-muted">E-mail</label>
        <input type="email" class="form-control form-control-sm contato-email" 
               placeholder="exemplo@email.com">
      </div>
      
      <div class="mb-0">
        <label class="small text-muted">Telefone/Celular</label>
        <input type="text" class="form-control form-control-sm contato-telefone" 
               placeholder="(00) 00000-0000">
      </div>
    </div>
  `;

  listaContatos.insertAdjacentHTML('beforeend', contatoHTML);

  // Aplica máscara de telefone no campo recém-criado
  const novoContato = document.getElementById(`contato-${idContato}`);
  if (novoContato) {
    const campoTelefone = novoContato.querySelector('.contato-telefone');
    if (campoTelefone) {
      campoTelefone.addEventListener('input', function () {
        let valor = this.value.replace(/\D/g, '');

        if (valor.length > 11) valor = valor.substring(0, 11);

        if (valor.length > 10) {
          // Celular: (00) 00000-0000
          valor = '(' + valor.substring(0, 2) + ') ' + valor.substring(2, 7) + '-' + valor.substring(7);
        } else if (valor.length > 6) {
          // Fixo: (00) 0000-0000
          valor = '(' + valor.substring(0, 2) + ') ' + valor.substring(2, 6) + '-' + valor.substring(6);
        } else if (valor.length > 2) {
          valor = '(' + valor.substring(0, 2) + ') ' + valor.substring(2);
        } else if (valor.length > 0) {
          valor = '(' + valor;
        }

        this.value = valor;
      });
    }
  }
}

// Função para remover um contato da lista
window.removerContato = function (idContato) {
  const contatoElement = document.getElementById(`contato-${idContato}`);
  if (contatoElement) {
    contatoElement.remove();

    // Verifica se ficou sem contatos, adiciona um vazio
    const listaContatos = document.getElementById('lista-contatos-dinamica');
    if (listaContatos && listaContatos.children.length === 0) {
      adicionarNovoContato();
    }
  }
}

// Função para limpar toda a lista de contatos
function limparListaContatos() {
  const listaContatos = document.getElementById('lista-contatos-dinamica');
  if (listaContatos) {
    listaContatos.innerHTML = '';
    window.contadorContatos = 0;
  }
}

// Função para coletar todos os contatos do formulário
function coletarContatosDoFormulario() {
  const listaContatos = document.getElementById('lista-contatos-dinamica');
  if (!listaContatos) return [];

  const contatosItens = listaContatos.querySelectorAll('.contato-item');
  const contatos = [];

  contatosItens.forEach(item => {
    const nome = item.querySelector('.contato-nome').value.trim();
    const cargo = item.querySelector('.contato-cargo').value.trim();
    const email = item.querySelector('.contato-email').value.trim();
    const telefone = item.querySelector('.contato-telefone').value.trim();

    // Só adiciona se tiver pelo menos o nome preenchido
    if (nome) {
      contatos.push({
        nome: nome,
        cargo: cargo,
        email: email,
        telefone: telefone
      });
    }
  });

  return contatos;
}

// Função para preencher a lista de contatos (usado na edição)
function preencherListaContatos(contatos) {
  limparListaContatos();

  if (!contatos || contatos.length === 0) {
    adicionarNovoContato();
    return;
  }

  contatos.forEach(contato => {
    adicionarNovoContato();

    // Preenche os campos do último contato adicionado
    const listaContatos = document.getElementById('lista-contatos-dinamica');
    const ultimoContato = listaContatos.lastElementChild;

    if (ultimoContato) {
      const inputNome = ultimoContato.querySelector('.contato-nome');
      const inputCargo = ultimoContato.querySelector('.contato-cargo');
      const inputEmail = ultimoContato.querySelector('.contato-email');
      const inputTelefone = ultimoContato.querySelector('.contato-telefone');

      if (inputNome) inputNome.value = contato.nome || '';
      if (inputCargo) inputCargo.value = contato.cargo || '';
      if (inputEmail) inputEmail.value = contato.email || '';
      if (inputTelefone) inputTelefone.value = contato.telefone || '';
    }
  });
}

// Função para exibir contatos no perfil de visualização (somente leitura)
function exibirContatosPerfil(contatos) {
  const container = document.getElementById('perfil-lista-contatos');
  if (!container) return;

  container.innerHTML = '';

  if (!contatos || contatos.length === 0) {
    container.innerHTML = '<div class="col-12 text-muted text-center py-3"><i class="bi bi-info-circle me-2"></i>Nenhum contato cadastrado.</div>';
    return;
  }

  contatos.forEach((contato, index) => {
    const contatoHTML = `
      <div class="col-md-6">
        <div class="p-3 border rounded bg-white h-100">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="badge bg-primary text-white">
              <i class="bi bi-person-circle me-1"></i>Contato #${index + 1}
            </div>
            ${contato.cargo ? `<span class="badge bg-light text-dark border">${contato.cargo}</span>` : ''}
          </div>
          
          <div class="mb-2">
            <label class="small text-muted fw-bold"><i class="bi bi-person me-1"></i>Nome</label>
            <div class="form-control form-control-sm bg-light">${contato.nome || 'Não informado'}</div>
          </div>
          
          <div class="mb-2">
            <label class="small text-muted fw-bold"><i class="bi bi-envelope me-1"></i>E-mail</label>
            <div class="form-control form-control-sm bg-light">${contato.email || 'Não informado'}</div>
          </div>
          
          <div>
            <label class="small text-muted fw-bold"><i class="bi bi-telephone me-1"></i>Telefone</label>
            <div class="form-control form-control-sm bg-light">${contato.telefone || 'Não informado'}</div>
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', contatoHTML);
  });
}

// Função para Excluir Pedido com segurança
window.excluirJob = function (id) {
  if (confirm("Tem certeza que deseja apagar este pedido? Esta ação não pode ser desfeita.")) {
    fetch(`${API_URL}/jobs/${id}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Remove da interface sem recarregar a página inteira
          carregarGestaoContratos();
          // Atualiza indicadores de status
          updateStatusIndicators();
        } else {
          alert("Erro ao excluir: " + (data.message || "Erro desconhecido"));
        }
      })
      .catch(err => {
        console.error("Erro na exclusão:", err);
        alert("Não foi possível conectar ao servidor para excluir.");
      });
  }
};

// --- FUNÇÃO PARA LIMPAR O FORMULÁRIO (EVITA DADOS DO PEDIDO ANTERIOR) ---
function limparFormularioJob() {
  // 1. Reseta o formulário HTML (limpa inputs simples)
  const form = document.getElementById('form-novo-job'); // Certifique-se que seu <form> tem esse ID ou use document.querySelector('#view-novo-job input')
  if (form) form.reset();

  // 2. Limpa campos manuais específicos
  const camposParaZerar = [
    'jobClienteFull', 'jobOperadorFull', 'jobDescricaoFull',
    'jobDataInicio', 'jobDataFim', 'jobSolicitanteNome',
    'jobSolicitanteEmail', 'jobSolicitanteTelefone',
    'jobPagador', 'jobPagadorCNPJ', 'descontoTotal', 'motivoDesconto',
    'jobObservacoes'
  ];

  camposParaZerar.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  // 3. Reseta a tabela de itens
  const tbody = document.getElementById('lista-itens-job');
  if (tbody) tbody.innerHTML = "";

  // 4. Reseta variáveis de controle
  window.__jobEditandoId = null;

  // 5. Reseta visualização de vencimento
  if (document.getElementById('modoData')) {
    document.getElementById('modoData').checked = true;
    toggleModoVencimento(); // Força voltar ao padrão
  }
}

// ===============================
// AÇÕES (EDITAR / APAGAR) - CONTRATOS
// ===============================
window.__jobEditandoId = null;

/* SUBSTITUA A FUNÇÃO editarJob NO main.js */
/* =============================================================
   FUNÇÃO DE EDITAR (BUSCA DADOS REAIS DO BANCO DE DADOS)
   ============================================================= */
window.editarJob = async function (jobId) {
  // 1. PREPARAÇÃO
  window.resetJobViewState();
  window.jobViewState.mode = 'edit';
  window.jobViewState.jobId = jobId;

  console.log(`✏️ [EDITARJOB] Abrindo Job ${jobId} (Buscando dados frescos...)`);

  if (typeof limparFormularioJob === 'function') {
    limparFormularioJob();
  } else {
    const form = document.getElementById('formNovoJobFull');
    if (form) form.reset();
    const listaItens = document.getElementById('lista-itens-job');
    if (listaItens) listaItens.innerHTML = "";
  }

  const id = Number(jobId);

  // =================================================================================
  // 2. BUSCA O PEDIDO (CORREÇÃO: FORÇAR BUSCA NO SERVIDOR)
  // =================================================================================
  // Alteramos aqui para NÃO confiar no cache antigo. Buscamos sempre o dado novo.
  let job = null;
  try {
    const res = await fetch(`${API_URL}/jobs/${id}`);
    if (res.ok) {
      job = await res.json();
    }
  } catch (e) {
    console.error("⚠️ Erro ao buscar dados frescos, tentando cache...", e);
  }

  // Fallback: Se a busca falhar (ou servidor offline), tenta usar o que tem na memória
  if (!job) {
    job = (Array.isArray(window.todosOsJobsCache) && window.todosOsJobsCache.find(j => Number(j.id) === id)) ||
      (Array.isArray(jobsFiltrados) && jobsFiltrados.find(j => Number(j.id) === id));
  }

  if (!job) { alert("Pedido não encontrado."); return; }
  // =================================================================================


  // 3. DEFINE VARIÁVEIS GLOBAIS
  window.__statusJobAtual = job.status;
  window.__jobEditandoId = id;

  // 4. === NOVO: BUSCA A LISTA DE EQUIPAMENTOS FRESQUINHA DO BANCO ===
  let equipamentosDoBanco = [];
  try {
    const resEquip = await fetch(`${API_URL}/equipamentos`);
    if (resEquip.ok) {
      equipamentosDoBanco = await resEquip.json();
      window.cacheEquipamentosSelect = equipamentosDoBanco;
    }
  } catch (err) {
    console.error("Erro ao buscar equipamentos frescos:", err);
    equipamentosDoBanco = window.cacheEquipamentosSelect || [];
  }

  // Troca a tela (se a função existir)
  if (typeof switchView === 'function') {
    switchView('novo-job');
  }

  // 5. PREENCHIMENTO DOS CAMPOS (COMPLETO)
  const set = (idCampo, valor) => {
    const el = document.getElementById(idCampo);
    if (el) el.value = (valor === null || valor === undefined) ? "" : valor;
  };

  // -- DADOS GERAIS --
  set('jobClienteFull', job.cliente_id);
  set('jobClienteDocumento', job.cliente_documento);
  set('jobOperadorFull', job.operador_id);
  set('jobDescricaoFull', job.descricao);
  set('jobDataInicio', (job.data_inicio || job.data_job || "").substring(0, 10));
  set('jobDataFim', (job.data_fim || "").substring(0, 10));

  // -- ENDEREÇO --
  set('jobCep', job.cep);
  set('jobLogradouro', job.logradouro);
  set('jobNumeroLocal', job.numero);
  set('jobBairro', job.bairro);
  set('jobCidade', job.cidade);
  set('jobUf', job.uf);

  // -- CONTATOS --
  set('jobSolicitanteNome', job.solicitante_nome);
  set('jobSolicitanteEmail', job.solicitante_email);
  set('jobSolicitanteTelefone', job.solicitante_telefone);
  set('jobProducaoLocal', job.producao_local);
  set('jobProducaoContato', job.producao_contato);
  set('jobProducaoEmail', job.producao_email);

  // -- FINANCEIRO --
  set('jobPagador', job.pagador_nome);
  set('jobPagadorCNPJ', job.pagador_cnpj);
  set('jobPagadorEmail', job.pagador_email);
  set('jobPagadorCep', job.pagador_cep);
  set('jobPagadorLogradouro', job.pagador_logradouro);
  set('jobPagadorNumero', job.pagador_numero);
  set('jobPagadorBairro', job.pagador_bairro);
  set('jobPagadorCidade', job.pagador_cidade);
  set('jobPagadorUf', job.pagador_uf);

  set('jobFormaPagamento', job.forma_pagamento);
  set('jobTipoDocumento', job.tipo_documento);
  set('jobObservacoes', job.observacoes);
  set('motivoDesconto', job.motivo_desconto);
  set('descontoTotal', job.desconto_porcentagem || 0);

  // === AQUI ESTÁ A CORREÇÃO DOS HORÁRIOS ===
  const formatarHora = (h) => (h && h.length >= 5) ? h.substring(0, 5) : '';

  set('jobHoraChegada', formatarHora(job.hora_chegada_prevista));
  set('jobHoraInicio', formatarHora(job.hora_inicio_evento));
  set('jobHoraFim', formatarHora(job.hora_fim_evento));

  // -- VENCIMENTO --
  let v = (job.vencimento_texto || '').trim();
  const boxData = document.getElementById('boxVencimentoData');
  const boxPrazo = document.getElementById('boxVencimentoPrazo');

  if (v.includes('/')) {
    if (document.getElementById('modoData')) document.getElementById('modoData').checked = true;
    if (boxData) boxData.classList.remove('d-none');
    if (boxPrazo) boxPrazo.classList.add('d-none');
    const [d, m, a] = v.split('/');
    set('jobVencimento', `${a}-${m}-${d}`);
    set('jobVencimentoPrazo', '');
  } else if (v && v !== 'null' && v !== 'À vista') {
    if (document.getElementById('modoPrazo')) document.getElementById('modoPrazo').checked = true;
    if (boxData) boxData.classList.add('d-none');
    if (boxPrazo) boxPrazo.classList.remove('d-none');
    set('jobVencimentoPrazo', v);
    set('jobVencimento', '');
  } else {
    if (document.getElementById('modoData')) document.getElementById('modoData').checked = true;
    if (boxData) boxData.classList.remove('d-none');
    if (boxPrazo) boxPrazo.classList.add('d-none');
  }

  // === CARREGAR EQUIPE DO BANCO ===
  window.equipeDoJob = [];
  try {
    const resEq = await fetch(`${API_URL}/jobs/${jobId}/equipe`);
    const equipeBanco = await resEq.json();

    window.equipeDoJob = equipeBanco.map(e => ({
      funcionario_id: e.funcionario_id,
      nome: e.nome,
      cargo: e.cargo,
      funcao: e.funcao
    }));

    if (typeof renderizarTabelaEquipe === 'function') {
      renderizarTabelaEquipe();
    }
  } catch (err) {
    console.error("Erro ao carregar equipe:", err);
    window.equipeDoJob = [];
    if (typeof renderizarTabelaEquipe === 'function') {
      renderizarTabelaEquipe();
    }
  }

  // 6. PREENCHIMENTO DOS ITENS (USANDO DADOS DO BANCO)
  const tbody = document.getElementById('lista-itens-job');
  if (tbody) {
    tbody.innerHTML = "";

    if (job.itens && job.itens.length > 0) {
      job.itens.forEach(item => {

        let equipReal = null;
        if (item.equipamento_id && equipamentosDoBanco.length > 0) {
          equipReal = equipamentosDoBanco.find(e => e.id == item.equipamento_id);
        }

        const dadosParaLinha = {
          id: item.equipamento_id,
          nome: item.descricao,
          marca: equipReal ? equipReal.marca : '',
          modelo: equipReal ? equipReal.modelo : '',
          qtd_disponivel: equipReal ? equipReal.qtd_disponivel : item.qtd,
          valor_diaria: item.valor_unitario
        };

        if (typeof window.adicionarLinhaItemComValidacao === 'function') {
          window.adicionarLinhaItemComValidacao(dadosParaLinha);
        }

        const lastTr = tbody.lastElementChild;
        if (lastTr) {
          const setCampo = (sel, val) => {
            const input = lastTr.querySelector(sel);
            if (input) input.value = val;
          };

          setCampo('[data-campo="descricao"]', item.descricao);
          setCampo('[data-campo="qtd"]', item.qtd);
          setCampo('[data-campo="valor"]', item.valor_unitario);
          setCampo('[data-campo="desconto"]', item.desconto_item || 0);

          if (item.equipamento_id) {
            let divId = lastTr.querySelector('[data-equipamento-id]');
            if (!divId) {
              divId = document.createElement('div');
              divId.style.display = 'none';
              lastTr.firstElementChild.prepend(divId);
            }
            divId.setAttribute('data-equipamento-id', item.equipamento_id);
          }
        }
      });
    }
  }

  // 7. FINALIZAÇÃO
  if (typeof window.guardarItensOriginais === 'function') {
    window.guardarItensOriginais();
  }

  // Usar atualizarValorTotal (que busca data-campo) pois os itens são criados com adicionarLinhaItemComValidacao
  if (typeof window.atualizarValorTotal === 'function') {
    window.atualizarValorTotal();
  }

  // 8. GARANTIR QUE ESTÁ EM MODO EDIÇÃO (REABILITAR INPUTS)
  // Isso é importante caso tenha entrado em modo visualização antes
  const inputsEditar = document.querySelectorAll('#view-novo-job input, #view-novo-job select, #view-novo-job textarea');
  inputsEditar.forEach(el => {
    el.disabled = false;
    el.style.backgroundColor = '';
    el.style.cursor = '';
  });

  // Garantir botões visíveis
  const btnSalvar = document.querySelector('#view-novo-job .btn-success');
  const btnAdicionar = document.querySelector('#view-novo-job button[onclick*="adicionarLinhaItem"]');
  const btnsRemover = document.querySelectorAll('#view-novo-job .btn-danger');

  if (btnSalvar) {
    btnSalvar.style.display = 'inline-block';
    btnSalvar.innerHTML = '<i class="bi bi-check-lg me-2"></i> Atualizar Pedido';
  }
  if (btnAdicionar) btnAdicionar.style.display = 'inline-block';
  btnsRemover.forEach(btn => btn.style.display = 'inline-block');

  // Restaurar botão cancelar
  const btnCancelar = document.querySelector('#view-novo-job .btn-outline-secondary');
  if (btnCancelar) {
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.onclick = () => window.voltarDoJob();
  }

  // REMOVER BADGE "MODO VISUALIZAÇÃO" se existir
  const badgeModoView = document.getElementById('badge-modo-visualizacao');
  if (badgeModoView) {
    badgeModoView.remove();
    
  }

  // ====================================================================
  // 9. PREENCHER NÚMERO DO PEDIDO E CARREGAR LOGO/NOME DA EMPRESA
  // ====================================================================
  // Preenche o número do pedido
  const campoNumeroPedido = document.getElementById('jobNumber');
  if (campoNumeroPedido) {
    const numeroPedido = job.numero_pedido || `PED-${String(job.id).padStart(4, '0')}`;
    campoNumeroPedido.value = numeroPedido;
    console.log('📋 Número do pedido carregado:', numeroPedido);
  }

  // Carrega logo e nome da empresa no cabeçalho do pedido
  if (typeof carregarLogoNoPedido === 'function') {
    await carregarLogoNoPedido();
  }

  

  window.scrollTo({ top: 0, behavior: 'smooth' });
};



window.excluirJob = function (jobId) {
  const ok = confirm("Tem certeza que deseja apagar este pedido? Essa ação não pode ser desfeita.");
  if (!ok) return;

  fetch(`${API_URL}/jobs/${jobId}`, { method: "DELETE" })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("❌ Erro ao excluir job:", data);
        throw new Error(data.error || data.message || data.sqlMessage || "Falha ao excluir.");
      }
      return data;
    })
    .then(() => {
      alert("Pedido excluído com sucesso!");
      // Recarrega lista e cards sem mexer na lógica atual
      if (typeof atualizarDashboard === "function") atualizarDashboard();
      if (typeof carregarGestaoContratos === "function") carregarGestaoContratos();
      // Atualiza indicadores de status
      if (typeof updateStatusIndicators === "function") updateStatusIndicators();
    })
    .catch(err => {
      console.error("❌ Erro completo:", err);
      alert("Não foi possível apagar o pedido: " + err.message);
    });
};




// --- NOVA LÓGICA: PERFIL DO CLIENTE 360º ---
window.idPerfilAtual = null;

window.abrirPerfilCliente = function (id) {
  // Salva a página atual antes de sair
  window.paginacaoClientes.paginaSalva = window.paginacaoClientes.paginaAtual;
  console.log('💾 Salvando página atual:', window.paginacaoClientes.paginaSalva);

  fetch(`${API_URL}/clientes`)
    .then(res => res.json())
    .then(lista => {
      const cli = lista.find(c => c.id == id);
      if (!cli) return alert("Erro: Cliente não encontrado.");

      window.idPerfilAtual = id;

      // Cabeçalho
      document.getElementById('tituloPerfilNome').innerText = cli.nome;
      document.getElementById('tituloPerfilDoc').innerText = cli.documento || '---';

      // Status com cores
      const elStatus = document.getElementById('tituloPerfilStatus');
      elStatus.innerText = cli.status;
      elStatus.className = 'badge border';

      if (cli.status === 'Ativo') {
        elStatus.classList.add('bg-success', 'text-white');
      } else if (cli.status === 'Inativo') {
        elStatus.classList.add('bg-danger', 'text-white');
      } else if (cli.status === 'Bloqueado') {
        elStatus.classList.add('bg-warning', 'text-dark');
      } else {
        elStatus.classList.add('bg-light', 'text-dark');
      }

      // Função auxiliar
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
      };

      // Dados Empresariais
      setVal('perfil_nome', cli.nome);
      setVal('perfil_fantasia', cli.nome_fantasia);
      setVal('perfil_doc', cli.documento);
      setVal('perfil_ie', cli.inscricao_estadual);
      setVal('perfil_status', cli.status);

      // Endereço
      setVal('perfil_cep', cli.cep);
      setVal('perfil_logradouro', `${cli.logradouro || ''}, ${cli.numero || ''} - ${cli.bairro || ''}`);
      setVal('perfil_cidade_uf', `${cli.cidade || ''}/${cli.uf || ''}`);

      setVal('perfil_obs', cli.observacoes);

      // Carrega os contatos dinâmicos do banco
      fetch(`${API_URL}/clientes/${id}/contatos`)
        .then(res => res.json())
        .then(contatos => {
          console.log('📞 Contatos carregados do perfil:', contatos);
          exibirContatosPerfil(contatos);
        })
        .catch(err => {
          console.error("Erro ao carregar contatos do perfil:", err);
          document.getElementById('perfil-lista-contatos').innerHTML =
            '<div class="col-12 text-muted text-center py-3">Nenhum contato cadastrado.</div>';
        });

      // Carrega outras abas
      carregarHistoricoPerfil(id);

      // Abre a tela
      switchView('perfil-cliente');

      // === MODO VISUALIZAÇÃO: APENAS aba Dados Cadastrais ===
      setTimeout(() => {
        // Desabilita campos da aba "Dados Cadastrais"
        const abaDados = document.getElementById('aba-dados');
        if (abaDados) {
          const inputs = abaDados.querySelectorAll('input, select, textarea');
          inputs.forEach(el => {
            el.disabled = true;
            el.style.backgroundColor = '#f8fafc';
            el.style.cursor = 'not-allowed';
          });
        }

        // Adiciona badge NO TOPO (fora das abas)
        const headerCliente = document.querySelector('#view-perfil-cliente .d-flex');
        if (headerCliente && !document.getElementById('badge-perfil-visualizacao')) {
          const badge = document.createElement('span');
          badge.id = 'badge-perfil-visualizacao';
          badge.className = 'badge bg-info text-white ms-2';
          badge.textContent = '👁️ MODO VISUALIZAÇÃO';
          headerCliente.appendChild(badge);
        }

        // === NOVO: Adiciona eventos aos tabs para mostrar/esconder badge ===
        const abasCliente = document.getElementById('abasCliente');
        if (abasCliente) {
          const tabs = abasCliente.querySelectorAll('.nav-link');
          tabs.forEach(tab => {
            tab.addEventListener('click', function () {
              const badge = document.getElementById('badge-perfil-visualizacao');
              if (!badge) return;

              // Pega qual aba foi clicada
              const targetTab = this.getAttribute('data-bs-target');

              // Se clicou em "Dados Cadastrais", mostra badge
              if (targetTab === '#aba-dados') {
                badge.style.display = 'inline-block';
              } else {
                // Em qualquer outra aba, esconde badge
                badge.style.display = 'none';
              }
            });
          });
        }
      }, 100);
    });
}
// =============================================================
//  NOVA LÓGICA DE PERFIL COM FILTROS (COLE ISTO NO MAIN.JS)
// =============================================================

// Variável Global para guardar os dados na memória
window.cacheJobsPerfil = [];

// 1. Função Principal (Carrega do Banco ao abrir o perfil)
// =============================================================
//  LÓGICA DE PERFIL DO CLIENTE (COM FILTROS E BUSCA AVANÇADA)
// =============================================================

// Variável Global para guardar os dados na memória (Cache)
window.cacheJobsPerfil = [];

// 1. Função Principal: Carrega dados do Banco ao abrir o perfil
function carregarHistoricoPerfil(idCliente) {
  // Limpa visualmente os campos de filtro para não confundir
  const idsParaLimpar = ['filtroPedStatus', 'filtroFinStatus', 'filtroPedInicio',
    'filtroFinInicio', 'filtroPedBusca', 'filtroFinBusca'];

  idsParaLimpar.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  // Busca TODOS os jobs no servidor
  fetch(`${API_URL}/jobs`)
    .then(res => res.json())
    .then(todosJobs => {
      // 1. Filtra apenas os jobs deste cliente e guarda na memória
      window.cacheJobsPerfil = todosJobs.filter(j => j.cliente_id == idCliente);

      // 2. Ordena (Mais recente primeiro)
      window.cacheJobsPerfil.sort((a, b) => b.id - a.id);

      // 3. Desenha as tabelas pela primeira vez (mostrando tudo)
      renderizarTabelaPedidosPerfil(window.cacheJobsPerfil);
      renderizarFinanceiroPerfil(window.cacheJobsPerfil);
    })
    .catch(err => console.error("Erro ao carregar histórico:", err));
}

// 2. Função que Desenha a Tabela de Pedidos (HTML)
// Função que Desenha a Tabela de Pedidos (CORRIGIDA COM CORES)
// =============================================================
// FUNÇÃO CORRIGIDA: DESENHAR TABELA DE PEDIDOS NO PERFIL
// =============================================================
function renderizarTabelaPedidosPerfil(listaJobs) {
  const tbody = document.getElementById('tabela-perfil-pedidos');
  const mobileContainer = document.getElementById('pedidos-perfil-mobile-cards');
  if (!tbody) return;

  tbody.innerHTML = ""; // Limpa a tabela antes de desenhar
  if (mobileContainer) mobileContainer.innerHTML = "";

  if (listaJobs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum pedido encontrado.</td></tr>';
    if (mobileContainer) mobileContainer.innerHTML = '<div class="text-center py-4 text-muted">Nenhum pedido encontrado.</div>';
    return;
  }

  listaJobs.forEach(job => {
    // Formatações
    const valorFmt = parseFloat(job.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Tratamento de data para não dar erro se vier nula
    let dataFmt = "---";
    if (job.data_job) {
      const d = new Date(job.data_job);
      d.setHours(d.getHours() + 3); // Ajuste fuso se necessário
      dataFmt = d.toLocaleDateString('pt-BR');
    }

    // Pega o badge de status (usando sua função existente)
    const badgeStatus = getStatusPill(job.status);

    // Desktop: table row
    const trJob = document.createElement('tr');
    trJob.innerHTML = `
            <td class="ps-4 fw-bold">#${job.id}</td>
            <td>${job.descricao}</td>
            <td>${dataFmt}</td>
            <td>${valorFmt}</td>
            <td>${badgeStatus}</td> 
            <td class="text-end pe-4">
              <button class="btn btn-sm btn-light border" onclick="window.abrirHistoricoJob(${job.id}, ${window.idPerfilAtual})">
                <i class="bi bi-eye"></i> Ver
              </button>
            </td>
        `;
    tbody.appendChild(trJob);

    // Mobile: card
    if (mobileContainer) {
      const card = document.createElement('div');
      card.className = 'pedido-card-mobile';
      card.innerHTML = `
        <div class="pedido-header">
          <span class="pedido-id">#${job.id}</span>
          <span class="pedido-date">${dataFmt}</span>
        </div>
        <div class="pedido-desc">${job.descricao}</div>
        <div class="pedido-meta">
          <span class="pedido-valor">${valorFmt}</span>
        </div>
        <div class="pedido-footer">
          ${badgeStatus}
          <button class="btn btn-sm btn-light border" onclick="window.abrirHistoricoJob(${job.id}, ${window.idPerfilAtual})">
            <i class="bi bi-eye"></i> Ver
          </button>
        </div>
      `;
      mobileContainer.appendChild(card);
    }
  });

  // Atualiza visibilidade table/cards conforme tela
  if (typeof toggleMobileCards === 'function') toggleMobileCards();
}

// =============================================================
// FUNÇÃO SEPARADA (Fica FORA do loop para não travar)
// =============================================================
window.abrirHistoricoJob = function (jobId, clientId) {
  console.log(`🔍 [HISTORICO] Abrindo Job ${jobId} do Cliente ${clientId}`);

  // 1. Define a origem para o botão "Voltar" saber retornar ao Perfil
  window.setJobOrigin('client_history', clientId);

  // 2. Abre em modo visualização
  window.abrirDetalhesJob(jobId);
};


// 3. Função que Desenha o Financeiro (Tabela + Cards de Totais)
function renderizarFinanceiroPerfil(listaJobs) {
  const tbody = document.getElementById('tabela-perfil-financeiro');
  if (!tbody) return;
  tbody.innerHTML = "";

  let totalPago = 0;
  let totalAberto = 0;
  let totalCancelado = 0;

  if (listaJobs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Nenhum registro financeiro.</td></tr>';
  } else {
    listaJobs.forEach(job => {
      const valor = parseFloat(job.valor);

      // --- CÁLCULO DOS TOTAIS (Baseado na lista filtrada) ---
      if (job.pagamento === 'Pago') totalPago += valor;
      else if (job.pagamento === 'Cancelado') totalCancelado += valor;
      else totalAberto += valor; // Pendente, Vencido, etc.

      // Define cor do badge usando sua função existente ou fallback
      let classeBadge = 'badge bg-light text-dark';
      if (typeof getPagamentoPill === 'function') {
        classeBadge = getPagamentoPill(job.pagamento, true);
      } else {
        if (job.pagamento === 'Pago') classeBadge = 'badge bg-success text-white';
        else if (job.pagamento === 'Cancelado') classeBadge = 'badge bg-secondary text-white';
        else classeBadge = 'badge bg-warning text-dark';
      }

      const trFin = document.createElement('tr');
      trFin.innerHTML = `
                <td class="ps-3">${job.vencimento_texto || 'À vista'}</td>
                <td>Job #${job.id}</td>
                <td>${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>
                    <span class="${classeBadge}">
                        ${job.pagamento}
                    </span>
                </td>
            `;
      tbody.appendChild(trFin);
    });
  }

  // --- ATUALIZA OS CARDS LÁ EM CIMA ---
  const elPago = document.getElementById('resumo_pago');
  const elAberto = document.getElementById('resumo_aberto');
  const elCancelado = document.getElementById('resumo_cancelado');

  if (elPago) elPago.innerText = totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (elAberto) elAberto.innerText = totalAberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (elCancelado) elCancelado.innerText = totalCancelado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// 4. Lógica do Botão "FILTRAR" da aba PEDIDOS
window.aplicarFiltroPedidosPerfil = function () {
  const dtInicio = document.getElementById('filtroPedInicio').value;
  const dtFim = document.getElementById('filtroPedFim').value;
  const status = document.getElementById('filtroPedStatus').value;

  // Pega o texto e converte para minúsculo para facilitar a busca
  const textoBusca = document.getElementById('filtroPedBusca').value.trim().toLowerCase();

  const filtrados = window.cacheJobsPerfil.filter(job => {
    // A) Filtro de Texto (Nome do Job ou ID)
    if (textoBusca) {
      const idString = String(job.id);
      const descString = (job.descricao || "").toLowerCase();

      // Se o texto NÃO estiver nem no ID nem na Descrição, descarta
      if (!idString.includes(textoBusca) && !descString.includes(textoBusca)) {
        return false;
      }
    }

    // B) Filtro de Data
    const dataJob = new Date(job.data_job).toISOString().split('T')[0]; // YYYY-MM-DD
    if (dtInicio && dataJob < dtInicio) return false;
    if (dtFim && dataJob > dtFim) return false;

    // C) Filtro de Status
    if (status && job.status !== status) return false;

    return true;
  });

  renderizarTabelaPedidosPerfil(filtrados);
}

// 5. Botão Limpar Pedidos
window.limparFiltroPedidosPerfil = function () {
  document.getElementById('filtroPedInicio').value = "";
  document.getElementById('filtroPedFim').value = "";
  document.getElementById('filtroPedStatus').value = "";
  document.getElementById('filtroPedBusca').value = "";
  renderizarTabelaPedidosPerfil(window.cacheJobsPerfil);
}

// 6. Lógica do Botão "FILTRAR" da aba FINANCEIRO
window.aplicarFiltroFinanceiroPerfil = function () {
  const dtInicio = document.getElementById('filtroFinInicio').value;
  const dtFim = document.getElementById('filtroFinFim').value;
  const status = document.getElementById('filtroFinStatus').value;
  const textoBusca = document.getElementById('filtroFinBusca').value.trim().toLowerCase();

  const filtrados = window.cacheJobsPerfil.filter(job => {

    // A) Filtro de Texto (ID ou Nome do Job - Referência)
    if (textoBusca) {
      const idString = String(job.id);
      const descString = (job.descricao || "").toLowerCase();
      if (!idString.includes(textoBusca) && !descString.includes(textoBusca)) {
        return false;
      }
    }

    // B) Lógica de Data (Tenta pegar Vencimento Real, senão Data do Job)
    let dataRef = null;
    // Tenta ler dd/mm/yyyy
    if (job.vencimento_texto && job.vencimento_texto.includes('/')) {
      const partes = job.vencimento_texto.split('/');
      if (partes.length === 3) dataRef = `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
    // Fallback
    if (!dataRef && job.data_job) {
      dataRef = String(job.data_job).substring(0, 10);
    }

    if (dtInicio && dataRef < dtInicio) return false;
    if (dtFim && dataRef > dtFim) return false;

    // C) Status Pagamento
    if (status && job.pagamento !== status) return false;

    return true;
  });

  renderizarFinanceiroPerfil(filtrados);
}


// 7. Botão Limpar Financeiro
window.limparFiltroFinanceiroPerfil = function () {
  document.getElementById('filtroFinInicio').value = "";
  document.getElementById('filtroFinFim').value = "";
  document.getElementById('filtroFinStatus').value = "";
  document.getElementById('filtroFinBusca').value = "";
  renderizarFinanceiroPerfil(window.cacheJobsPerfil);
}


// --- FUNÇÃO PARA ALTERNAR ENTRE DATA E PRAZO (NOVO JOB) ---
window.toggleModoVencimento = function () {
  const isModoData = document.getElementById('modoData').checked;

  const boxData = document.getElementById('boxVencimentoData');
  const boxPrazo = document.getElementById('boxVencimentoPrazo');

  if (isModoData) {
    // Mostra o campo de Data, esconde o Select de Prazo
    boxData.classList.remove('d-none');
    boxPrazo.classList.add('d-none');
  } else {
    // Mostra o Select de Prazo, esconde o campo de Data
    boxData.classList.add('d-none');
    boxPrazo.classList.remove('d-none');
  }
}


/* === MODO VISUALIZAÇÃO (READ-ONLY) === */
window.abrirDetalhesJob = async function (jobId) {
  // 🔴 PASSO 1: RESETAR ESTADO ANTERIOR
  window.resetJobViewState();

  // 🟢 PASSO 2: DEFINIR MODO E ORIGEM
  window.jobViewState.mode = 'view'; // Modo visualização
  window.jobViewState.jobId = jobId;
  // origin já foi definido pela função que chamou este método

  console.log(`👁️ [ABRIRDETALHES] Job ${jobId} - Modo: ${window.jobViewState.mode} - Origem: ${window.jobViewState.origin}`);

  const id = Number(jobId);

  let job = (Array.isArray(window.todosOsJobsCache) && window.todosOsJobsCache.find(j => Number(j.id) === id)) ||
    (Array.isArray(jobsFiltrados) && jobsFiltrados.find(j => Number(j.id) === id));

  if (!job) {
    try {
      const res = await fetch(`${API_URL}/jobs`);
      if (!res.ok) throw new Error("Falha ao recarregar jobs");
      const jobs = await res.json();
      window.todosOsJobsCache = jobs;
      jobsFiltrados = [...jobs];
      job = jobs.find(j => Number(j.id) === id);
    } catch (e) {
      console.error(e);
      alert("Erro ao carregar pedido: " + e.message);
      return;
    }
  }

  if (!job) {
    alert("Pedido não encontrado.");
    return;
  }

  // 🔵 PASSO 3: NÃO DEFINIR VARIÁVEL DE EDIÇÃO
  // Deixa claro que estamos em VISUALIZAÇÃO, não em edição
  window.__jobEditandoId = null;
  window.__jobVisandoId = null;

  switchView('novo-job');

  // 🟡 PASSO 4: DESABILITAR TODOS OS INPUTS
  const inputs = document.querySelectorAll('#view-novo-job input, #view-novo-job select, #view-novo-job textarea');
  inputs.forEach(el => {
    el.disabled = true;
    el.style.backgroundColor = '#f8fafc';
    el.style.cursor = 'not-allowed';
  });

  // 🟠 PASSO 5: OCULTAR BOTÕES DE AÇÃO
  const btnSalvar = document.querySelector('#view-novo-job .btn-success');
  const btnAdicionar = document.querySelector('#view-novo-job button[onclick*="adicionarLinhaItem"]');
  const btnRemover = document.querySelectorAll('#view-novo-job .btn-danger');
  const btnCancelar = document.querySelector('#view-novo-job .btn-outline-secondary');

  if (btnSalvar) btnSalvar.style.display = 'none';
  if (btnAdicionar) btnAdicionar.style.display = 'none';
  btnRemover.forEach(btn => btn.style.display = 'none');

  if (btnCancelar) {
    // Muda o evento do botão para chamar voltarDoJob()
    btnCancelar.textContent = '← Voltar';
    btnCancelar.onclick = () => window.voltarDoJob();
  }

  // 🟢 PASSO 6: PREENCHER OS CAMPOS (mesmo código anterior)
  const set = (idCampo, valor) => {
    const el = document.getElementById(idCampo);
    if (el) el.value = valor ?? "";
  };

  // Função auxiliar para formatar hora
  const formatarHora = (h) => (h && h.length >= 5) ? h.substring(0, 5) : '';

  set('jobClienteFull', job.cliente_id);
  set('jobClienteDocumento', job.cliente_documento);
  set('jobOperadorFull', job.operador_id);
  set('jobDescricaoFull', job.descricao);
  set('jobDataInicio', (job.data_inicio || job.data_job || "").slice(0, 10));
  set('jobDataFim', (job.data_fim || "").slice(0, 10));

  // Horários
  set('jobHoraChegada', formatarHora(job.hora_chegada_prevista));
  set('jobHoraInicio', formatarHora(job.hora_inicio_evento));
  set('jobHoraFim', formatarHora(job.hora_fim_evento));

  // Contatos
  set('jobSolicitanteNome', job.solicitante_nome);
  set('jobSolicitanteEmail', job.solicitante_email);
  set('jobSolicitanteTelefone', job.solicitante_telefone);
  set('jobCep', job.cep);
  set('jobLogradouro', job.logradouro);
  set('jobNumeroLocal', job.numero);
  set('jobBairro', job.bairro);
  set('jobCidade', job.cidade);
  set('jobUf', job.uf);
  set('jobProducaoLocal', job.producao_local);
  set('jobProducaoContato', job.producao_contato);
  set('jobProducaoEmail', job.producao_email);

  // Financeiro
  set('jobPagador', job.pagador_nome);
  set('jobPagadorCNPJ', job.pagador_cnpj);
  set('jobPagadorEmail', job.pagador_email);
  set('jobPagadorCep', job.pagador_cep);
  set('jobPagadorLogradouro', job.pagador_logradouro);
  set('jobPagadorNumero', job.pagador_numero);
  set('jobPagadorBairro', job.pagador_bairro);
  set('jobPagadorCidade', job.pagador_cidade);
  set('jobPagadorUf', job.pagador_uf);
  set('jobFormaPagamento', job.forma_pagamento);
  set('jobTipoDocumento', job.tipo_documento);
  set('jobObservacoes', job.observacoes);
  set('descontoTotal', job.desconto_porcentagem || job.desconto_valor || 0);
  set('motivoDesconto', job.motivo_desconto);

  // === VENCIMENTO ===
  let vencimentoTratado = job.vencimento_texto || '';
  vencimentoTratado = vencimentoTratado.trim();

  if (vencimentoTratado && vencimentoTratado !== 'null' && vencimentoTratado !== '') {
    if (vencimentoTratado.includes('/')) {
      document.getElementById('modoData').checked = true;
      document.getElementById('modoPrazo').checked = false;

      const [d, m, a] = vencimentoTratado.split('/');
      set('jobVencimento', `${a}-${m}-${d}`);
      set('jobVencimentoPrazo', '');
    } else {
      document.getElementById('modoPrazo').checked = true;
      document.getElementById('modoData').checked = false;

      set('jobVencimentoPrazo', vencimentoTratado);
      set('jobVencimento', '');
    }

    if (typeof toggleModoVencimento === 'function') {
      toggleModoVencimento();
    }
  } else {
    document.getElementById('modoData').checked = true;
    document.getElementById('modoPrazo').checked = false;
    set('jobVencimento', '');
    set('jobVencimentoPrazo', '');

    if (typeof toggleModoVencimento === 'function') {
      toggleModoVencimento();
    }
  }

  // 🟡 PASSO 7: PREENCHER ITENS
  if (job.itens && job.itens.length > 0) {
    const tbody = document.getElementById('lista-itens-job');
    tbody.innerHTML = "";

    job.itens.forEach(item => {
      let descontoItem = 0;
      if (item.desconto_item !== undefined && item.desconto_item !== null) {
        descontoItem = parseFloat(item.desconto_item) || 0;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding-left: 20px;">
          <input type="text" class="form-control" name="itemDescricao[]" value="${item.descricao || ''}" required>
        </td>
        <td style="text-align: center;">
          <input type="number" class="form-control text-center" name="itemQtd[]" min="1" value="${item.qtd || 1}" style="width: 70px;" required>
        </td>
        <td>
          <input type="number" class="form-control" name="itemValor[]" min="0" step="0.01" value="${item.valor_unitario || 0}" required>
        </td>
        <td>
          <input type="number" class="form-control" name="itemDesconto[]" min="0" max="100" value="${descontoItem}" placeholder="% Desconto">
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-sm btn-danger" onclick="removerLinhaItem(this)"><i class="bi bi-trash"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // � PASSO 8: CARREGAR EQUIPE DO BANCO
  window.equipeDoJob = [];
  try {
    const resEq = await fetch(`${API_URL}/jobs/${jobId}/equipe`);
    const equipeBanco = await resEq.json();

    window.equipeDoJob = equipeBanco.map(e => ({
      funcionario_id: e.funcionario_id,
      nome: e.nome,
      cargo: e.cargo,
      funcao: e.funcao
    }));

    if (typeof renderizarTabelaEquipe === 'function') {
      renderizarTabelaEquipe();
    }
    console.log('👥 [DETALHES] Equipe carregada:', window.equipeDoJob.length, 'membros');
  } catch (err) {
    console.error("Erro ao carregar equipe:", err);
    window.equipeDoJob = [];
    if (typeof renderizarTabelaEquipe === 'function') {
      renderizarTabelaEquipe();
    }
  }

  // 🟣 PASSO 9: BADGE DE VISUALIZAÇÃO
  const header = document.querySelector('#view-novo-job .d-flex');
  const badgeAntigo = document.getElementById('badge-modo-visualizacao');
  if (badgeAntigo) badgeAntigo.remove();

  if (header) {
    const badge = document.createElement('span');
    badge.id = 'badge-modo-visualizacao';
    badge.className = 'badge bg-info text-white ms-2';
    badge.textContent = '👁️ MODO VISUALIZAÇÃO';
    header.appendChild(badge);
  }

  if (typeof atualizarValorTotalPedido === 'function') {
    atualizarValorTotalPedido();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
};




/* =============================================================
   GESTÃO DE ESTOQUE (NOVO)
   ============================================================= */
/* Substitua a função salvarNovoItem inteira por esta */
window.salvarNovoItem = function () {
  console.log("=== SALVANDO ITEM ===");

  // ============================================
  // 1. PEGAR VALORES DOS CAMPOS
  // ============================================
  const nome = document.getElementById('cadItemNome').value.trim();
  const categoria = document.getElementById('cadItemCategoria').value;
  const qtd = document.getElementById('cadItemQtd').value || 0;
  const valor = document.getElementById('cadItemValor').value || 0;
  const status = document.getElementById('cadItemStatus').value;
  const marca = document.getElementById('cadItemMarca').value;
  const modelo = document.getElementById('cadItemModelo').value;
  const serie = document.getElementById('cadItemSerie').value;
  const obs = document.getElementById('cadItemObs').value;

  // Validação básica
  if (!nome) {
    alert("❌ Nome é obrigatório!");
    return;
  }

  // ============================================
  // 2. CRIAR FormData (não JSON!)
  // ============================================
  const formData = new FormData();

  formData.append('nome', nome);
  formData.append('categoria', categoria);
  formData.append('qtd_total', parseInt(qtd) || 0);
  formData.append('qtd_disponivel', parseInt(qtd) || 0);
  formData.append('valor_diaria', parseFloat(valor) || 0);
  formData.append('status', status);
  formData.append('marca', marca);
  formData.append('modelo', modelo);
  formData.append('n_serie', serie);
  formData.append('observacoes', obs);

  // ============================================
  // 3. ADICIONAR ARQUIVO (SE EXISTIR)
  // ============================================
  const inputFile = document.getElementById('cadItemInputFoto');
  if (inputFile && inputFile.files[0]) {
    const arquivo = inputFile.files[0];
    console.log("📁 Arquivo selecionado:", arquivo.name, arquivo.size, "bytes");
    formData.append('foto', arquivo); // ⭐ AQUI TÁ A MÁGICA
  } else {
    console.log("⚠️ Nenhum arquivo selecionado");
  }

  // ============================================
  // 4. VERIFICAR SE É EDIÇÃO OU NOVO
  // ============================================
  const isEdit = window.idItemEditando !== null;
  const url = isEdit ? `${API_URL}/equipamentos/${window.idItemEditando}` : `${API_URL}/equipamentos`;
  const method = isEdit ? 'PUT' : 'POST';

  console.log(`[${method}] Enviando para: ${url}`);

  // ============================================
  // 5. ENVIAR FormData (SEM headers Content-Type!)
  // ============================================
  fetch(url, {
    method: method,
    body: formData
    // ⭐ NÃO COLOQUE headers! O navegador detecta automaticamente
  })
    .then(res => {
      console.log("[RESPOSTA] Status:", res.status);
      if (!res.ok) {
        return res.text().then(text => {
          console.error("[RESPOSTA] Erro:", text);
          throw new Error(`HTTP ${res.status}: ${text}`);
        });
      }
      return res.json();
    })
    .then(data => {
      console.log("[SUCESSO] Resposta:", data);
      alert(isEdit ? "✅ Item atualizado!" : "✅ Item cadastrado com foto!");

      // Limpa formulário
      document.getElementById('formNovoItem').reset();
      removerFotoPreview();
      window.idItemEditando = null;

      // Volta para estoque
      switchView('estoque');
      carregarEstoque();
    })
    .catch(err => {
      console.error("[ERRO] Erro completo:", err);
      alert("❌ Erro ao salvar: " + err.message);
    });
}



/* =============================================================
   LÓGICA DE FOTOS E UPLOAD
   ============================================================= */

// 1. Mostrar Preview quando seleciona arquivo
window.mostrarPreviewFoto = function (input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById('previewFoto').src = e.target.result;
      document.getElementById('previewFoto').style.display = 'block';
      document.getElementById('placeholderFoto').style.display = 'none';
    }
    reader.readAsDataURL(input.files[0]);
  }
}

// 2. Limpar foto
window.removerFotoPreview = function () {
  document.getElementById('cadItemInputFoto').value = ""; // Limpa input
  document.getElementById('previewFoto').src = "";
  document.getElementById('previewFoto').style.display = 'none';
  document.getElementById('placeholderFoto').style.display = 'block';
}

// 3. PREENCHER FORMULÁRIO (Atualizado para carregar foto existente)
// Substitua sua função antiga 'preencherFormularioItem' por esta:
function preencherFormularioItem(item) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };

  set('cadItemNome', item.nome);
  set('cadItemCategoria', item.categoria);
  set('cadItemQtd', item.qtd_total);
  set('cadItemValor', item.valor_diaria);
  set('cadItemStatus', item.status);
  set('cadItemMarca', item.marca);
  set('cadItemModelo', item.modelo);
  set('cadItemSerie', item.n_serie); // <--- NOVO
  set('cadItemObs', item.observacoes);

  // CORREÇÃO DA FOTO NA EDIÇÃO
  if (item.imagem) {
    const preview = document.getElementById('previewFoto');
    const placeholder = document.getElementById('placeholderFoto');

    // Define o caminho completo da imagem
    preview.src = `${API_URL}/uploads/${item.imagem}`;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    removerFotoPreview();
  }
}



/* =============================================================
   GESTÃO DE ESTOQUE - LÓGICA COMPLETA
   (Copie este bloco inteiro para substituir o antigo)
   ============================================================= */

// Variáveis Globais do Estoque
window.cacheEstoque = [];
window.modoExibicaoEstoque = 'grid'; // Começa como 'grid' ou 'lista'

// Estado de paginação do Estoque
window.paginacaoEstoque = {
  paginaAtual: 1,
  itensPorPagina: 6,
  listaTotalFiltrada: [],
  paginaSalva: null
};
window.idItemEditando = null;

// 1. CARREGAR ESTOQUE (Com proteção contra travamento)
async function carregarEstoque() {
  console.log("Iniciando carregamento do estoque...");

  // Mostra spinner caso não esteja lá
  const container = document.getElementById('grid-estoque-real');
  if (container) {
    container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="mt-2 text-muted">Buscando dados...</div>
            </div>`;
  }

  try {
    const res = await fetch(`${API_URL}/equipamentos`);
    if (!res.ok) throw new Error("Erro na resposta do servidor");
    const itens = await res.json();

    console.log("Itens carregados:", itens.length);
    window.cacheEstoque = itens; // Salva no cache

    // Atualiza cache de busca global
    if (typeof updateSearchCache === 'function') {
      updateSearchCache();
    }

    // Atualiza os números lá em cima (KPIs)
    atualizarKPIsEstoque(itens);

    // Aplica os filtros e desenha na tela
    filtrarEstoque();
  } catch (err) {
    console.error("Erro fatal ao carregar estoque:", err);
    if (container) {
      container.innerHTML = `
                  <div class="col-12 text-center py-5 text-danger">
                      <i class="bi bi-exclamation-triangle fs-1"></i>
                      <p class="mt-2 fw-bold">Erro ao carregar itens.</p>
                      <small>${err.message}</small>
                  </div>`;
    }
  }
}

// 2. ATUALIZAR OS INDICADORES (KPIs)
function atualizarKPIsEstoque(itens) {
  try {
    // Total de Itens (Soma das quantidades totais)
    const totalPecas = itens.reduce((acc, i) => acc + (parseInt(i.qtd_total) || 0), 0);
    const elTotal = document.getElementById('kpi-estoque-total');
    if (elTotal) elTotal.innerText = totalPecas;

    // Valor Patrimônio (Qtd * Valor Unitário Aproximado)
    // Nota: Usando valor_diaria * 10 como estimativa de valor do bem, ou use 0 se não tiver campo de custo
    const valorTotal = itens.reduce((acc, i) => acc + ((parseFloat(i.valor_diaria) || 0) * (parseInt(i.qtd_total) || 0)), 0);
    const elValor = document.getElementById('kpi-estoque-valor');
    if (elValor) elValor.innerText = "R$ " + valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 });

    // Em Manutenção
    const totalManutencao = itens.filter(i => i.status === 'Manutenção').length;
    const elManut = document.getElementById('kpi-estoque-manutencao');
    if (elManut) elManut.innerText = totalManutencao;
  } catch (e) {
    console.error("Erro ao calcular KPIs:", e);
  }
}

// 3. FILTRAGEM E BUSCA
window.filtrarEstoque = function () {
  // Verifica se o cache existe
  if (!window.cacheEstoque || !Array.isArray(window.cacheEstoque)) {
    console.warn('⚠️ cacheEstoque não carregado ainda');
    return;
  }

  // Pegamos os elementos com segurança (se não existirem, usa valor padrão)
  const inputBusca = document.getElementById('buscaEstoque');
  const inputCat = document.getElementById('filtroCategoriaEstoque');
  const inputStatus = document.getElementById('filtroStatusEstoque');

  const termo = inputBusca ? inputBusca.value.toLowerCase() : "";
  const catFiltro = inputCat ? inputCat.value : "";
  const statusFiltro = inputStatus ? inputStatus.value : "";

  console.log('🔍 [FILTRO ESTOQUE] Aplicando:', { termo, catFiltro, statusFiltro });
  console.log('🔍 [FILTRO ESTOQUE] Itens no cache:', window.cacheEstoque.length);

  const filtrados = window.cacheEstoque.filter(item => {
    const nome = (item.nome || "").toLowerCase();
    const marca = (item.marca || "").toLowerCase();
    const modelo = (item.modelo || "").toLowerCase();
    const categoria = (item.categoria || "");
    const status = (item.status || "");

    // Filtro de Texto
    const bateuTexto = !termo || nome.includes(termo) || marca.includes(termo) || modelo.includes(termo);

    // Filtro de Categoria
    const bateuCat = catFiltro === "" || categoria === catFiltro;

    // Filtro de Status
    const bateuStatus = statusFiltro === "" || status === statusFiltro;

    return bateuTexto && bateuCat && bateuStatus;
  });

  console.log('🔍 [FILTRO ESTOQUE] Itens filtrados:', filtrados.length);

  // Salva lista filtrada e reseta para página 1
  window.paginacaoEstoque.listaTotalFiltrada = filtrados;
  window.paginacaoEstoque.paginaAtual = 1;

  // Renderiza primeira página
  renderizarEstoquePaginado();
}

// Nova função para renderizar com paginação
window.renderizarEstoquePaginado = function (pagina = null) {
  if (pagina) window.paginacaoEstoque.paginaAtual = pagina;

  const { paginaAtual, itensPorPagina, listaTotalFiltrada } = window.paginacaoEstoque;
  const totalItens = listaTotalFiltrada.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);

  // Calcula índices da página atual
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const itensPagina = listaTotalFiltrada.slice(inicio, fim);

  // Renderiza a página atual no modo escolhido
  if (window.modoExibicaoEstoque === 'grid') {
    renderizarEstoqueCards(itensPagina);
  } else {
    renderizarEstoqueLista(itensPagina);
  }

  // Renderiza botões de paginação
  renderizarBotoesPaginacaoEstoque(totalPaginas, totalItens);
}

// Função para mudar de página
window.mudarPaginaEstoque = function (novaPagina) {
  renderizarEstoquePaginado(novaPagina);
}

// Renderizar botões de paginação (padrão moderno)
function renderizarBotoesPaginacaoEstoque(totalPaginas, totalItens) {
  const container = document.getElementById('paginacao-estoque');
  if (!container) return;

  const paginaAtual = window.paginacaoEstoque.paginaAtual;

  // Se não há itens, não mostra nada
  if (totalItens === 0) {
    container.innerHTML = '';
    return;
  }

  // Se só tem 1 página, mostra apenas o total
  if (totalPaginas <= 1) {
    container.innerHTML = `<div class="text-center text-muted small mt-2">Total: ${totalItens} item(ns)</div>`;
    return;
  }

  // Múltiplas páginas - mostra paginação completa
  let html = '<div class="d-flex justify-content-center align-items-center gap-2">';

  // Botão Anterior
  const desabilitarAnterior = paginaAtual === 1;
  html += `
    <button class="btn btn-sm btn-outline-secondary" 
            onclick="mudarPaginaEstoque(${paginaAtual - 1})" 
            ${desabilitarAnterior ? 'disabled' : ''}>
      <i class="bi bi-chevron-left"></i> Anterior
    </button>
  `;

  // Botões numéricos (máximo 5 páginas visíveis)
  let paginaInicio = Math.max(1, paginaAtual - 2);
  let paginaFim = Math.min(totalPaginas, paginaInicio + 4);

  // Ajusta início se estiver próximo ao fim
  if (paginaFim - paginaInicio < 4) {
    paginaInicio = Math.max(1, paginaFim - 4);
  }

  for (let i = paginaInicio; i <= paginaFim; i++) {
    const ativo = i === paginaAtual ? 'btn-primary' : 'btn-outline-secondary';
    html += `
      <button class="btn btn-sm ${ativo}" 
              onclick="mudarPaginaEstoque(${i})" 
              style="min-width: 40px;">
        ${i}
      </button>
    `;
  }

  // Botão Próximo
  const desabilitarProximo = paginaAtual === totalPaginas;
  html += `
    <button class="btn btn-sm btn-outline-secondary" 
            onclick="mudarPaginaEstoque(${paginaAtual + 1})" 
            ${desabilitarProximo ? 'disabled' : ''}>
      Próximo <i class="bi bi-chevron-right"></i>
    </button>
  `;

  html += `</div>
    <div class="text-center text-muted small mt-2">
      Página ${paginaAtual} de ${totalPaginas} • Total: ${totalItens} item(ns)
    </div>`;

  container.innerHTML = html;
}

// 4. LIMPAR FILTROS
window.limparFiltrosEstoque = function () {
  const ids = ['buscaEstoque', 'filtroCategoriaEstoque', 'filtroStatusEstoque'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  filtrarEstoque();
}

// LIMPAR FILTROS CLIENTES
window.limparFiltrosClientes = function () {
  const ids = ['inputBuscaCliente', 'filtroTipoCliente', 'filtroStatusCliente'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  filtrarClientes();
}

// LIMPAR FILTROS FUNCIONÁRIOS
window.limparFiltrosFuncionarios = function () {
  const ids = ['buscaFuncionarios', 'filtroStatusFuncionario', 'filtroDepartamentoFuncionario'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  filtrarFuncionarios();
}

// 5. ALTERNAR MODO DE VISUALIZAÇÃO (GRID / LISTA)
window.alternarModoEstoque = function (modo) {
  window.modoExibicaoEstoque = modo;

  const containerGrid = document.getElementById('grid-estoque-real');
  const containerLista = document.getElementById('lista-estoque-tabela-container');
  const btnGrid = document.getElementById('btn-view-grid');
  const btnLista = document.getElementById('btn-view-lista');

  if (modo === 'grid') {
    if (containerGrid) containerGrid.classList.remove('d-none');
    if (containerLista) containerLista.classList.add('d-none');
    if (btnGrid) btnGrid.classList.add('active');
    if (btnLista) btnLista.classList.remove('active');
  } else {
    if (containerGrid) containerGrid.classList.add('d-none');
    if (containerLista) containerLista.classList.remove('d-none');
    if (btnGrid) btnGrid.classList.remove('active');
    if (btnLista) btnLista.classList.add('active');
  }

  // Redesenha mantendo a página atual
  renderizarEstoquePaginado();
}

// 6. RENDERIZADORES (DESENHAR NA TELA)

// 1. Função Inteligente de Cores (Centralizada)
function getCorStatusEstoque(status) {
  const s = (status || "").toLowerCase().trim();

  // Status Verde (Liberado)
  if (s === 'disponível' || s === 'ativo') {
    return "bg-green-soft text-green";
  }

  // Status Vermelho (Problema/Parado)
  if (s === 'manutenção' || s === 'avaria' || s === 'quebrado') {
    return "bg-red-soft text-red";
  }

  // Status Azul/Laranja (Em Operação)
  if (s === 'em uso' || s === 'alugado' || s === 'job') {
    return "bg-blue-soft text-blue";
  }

  // Padrão (Cinza)
  return "bg-light text-dark border";
}

// A) MODO CARD
// 2. Renderizador de CARDS (Atualizado com cores)
// 2. Renderizador de CARDS (Atualizado com Barra Colorida)
/* =============================================================
   LÓGICA DE FOTOS E UPLOAD
   ============================================================= */

// 1. Mostrar Preview quando seleciona arquivo
window.mostrarPreviewFoto = function (input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById('previewFoto').src = e.target.result;
      document.getElementById('previewFoto').style.display = 'block';
      document.getElementById('placeholderFoto').style.display = 'none';
    }
    reader.readAsDataURL(input.files[0]);
  }
}

// 2. Limpar foto
window.removerFotoPreview = function () {
  document.getElementById('cadItemInputFoto').value = ""; // Limpa input
  document.getElementById('previewFoto').src = "";
  document.getElementById('previewFoto').style.display = 'none';
  document.getElementById('placeholderFoto').style.display = 'block';
}


// ============================================
// FUNÇÃO: Calcular Cor da Barra de Estoque
// INSIRA EXATAMENTE ANTES DE: function renderizarEstoqueCards
// ============================================

function calcularCorEstoque(qtdDisponivel, qtdTotal) {
  // Se qtdTotal é 0, retorna vermelho
  if (!qtdTotal || qtdTotal === 0) {
    return {
      classe: "bg-danger",
      percentual: 0
    };
  }

  const percentual = (qtdDisponivel / qtdTotal) * 100;

  // Verde: >= 60%
  if (percentual >= 60) {
    return {
      classe: "bg-success",
      percentual: percentual
    };
  }

  // Amarelo: 30% até 59%
  if (percentual >= 30) {
    return {
      classe: "bg-warning",
      percentual: percentual
    };
  }

  // Vermelho: < 30%
  return {
    classe: "bg-danger",
    percentual: percentual
  };
}

/* =============================================================
   MOSTRAR FOTO NO CARD
   Atualize o 'renderizarEstoqueCards' para usar a imagem se existir
   ============================================================= */
function renderizarEstoqueCards(lista) {
  const container = document.getElementById('grid-estoque-real');
  if (!container) return;
  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = '<div class="col-12 text-center text-muted py-5">Nenhum item.</div>';
    return;
  }

  lista.forEach(item => {
    const total = parseInt(item.qtd_total) || 0;
    const disponivel = parseInt(item.qtd_disponivel) || 0;
    const valor = parseFloat(item.valor_diaria) || 0;

    const corInfo = window.calcularCorEstoque(disponivel, total);
    const corBarra = corInfo.classe;
    const pct = corInfo.percentual;
    const classeStatus = getCorStatusEstoque(item.status);

    // --- MUDANÇA: SEMPRE MOSTRAR ÍCONE NO CARD (PEDIDO 4) ---
    let icone = "bi-box-seam";
    let corIcone = "bg-blue-soft text-blue";
    if ((item.categoria || '').includes('Vídeo')) { icone = "bi-camera-video"; corIcone = "bg-purple-soft text-purple"; }
    if ((item.categoria || '').includes('Informática')) { icone = "bi-laptop"; corIcone = "bg-cyan-soft text-cyan"; }

    const areaIconeHTML = `
            <div class="item-icon ${corIcone} mb-0"><i class="bi ${icone}"></i></div>
        `;

    const card = `
        <div class="col-xl-4 col-md-6">
          <div class="card-custom h-100" 
               onclick="visualizarItem(${item.id})" 
               style="cursor: pointer;">
            <div class="d-flex justify-content-between align-items-start mb-2">
                ${areaIconeHTML}
                
                <div class="dropdown ms-auto" onclick="event.stopPropagation();"> 
                    <button class="btn btn-sm btn-light border-0 rounded-circle shadow-sm" 
                            type="button" 
                            data-bs-toggle="dropdown"
                            style="width: 32px; height: 32px;">
                        <i class="bi bi-three-dots-vertical text-muted"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end dropdown-menu-modern">
                        <li>
                            <a class="dropdown-item-modern item-gray" href="#" onclick="visualizarItem(${item.id})">
                                <i class="bi bi-eye"></i> Detalhes
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item-modern item-blue" href="#" onclick="editarItem(${item.id})">
                                <i class="bi bi-pencil-square"></i> Editar
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item-modern item-red" href="#" onclick="excluirItem(${item.id})">
                                <i class="bi bi-trash3"></i> Excluir
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            <h6 class="fw-bold mb-1 text-truncate" title="${item.nome}">${item.nome}</h6>
            <div class="text-muted small mb-3 text-truncate">
                ${item.marca || ''} ${item.modelo || ''}
            </div>
            
            <div class="d-flex justify-content-between small fw-bold mb-1 text-muted">
                <span>Disp: ${disponivel}</span> <span>Total: ${total}</span>
            </div>
            
            <div class="progress mb-3" style="height: 6px;">
                <div class="progress-bar ${corBarra}" role="progressbar" style="width: ${pct}%"></div>
            </div>
            
            <div class="d-flex justify-content-between align-items-center mt-3">
               <span class="badge ${classeStatus} border-0">${item.status}</span>
               <span class="fw-bold small">R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', card);
  });
}


// B) MODO LISTA
// 3. Renderizador de LISTA (Atualizado com cores)
function renderizarEstoqueLista(lista) {
  const tbody = document.getElementById('lista-estoque-tabela-body');
  if (!tbody) return;
  tbody.innerHTML = "";

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted">Nenhum item encontrado.</td></tr>';
    return;
  }

  lista.forEach(item => {
    const valor = parseFloat(item.valor_diaria) || 0;

    // PEGA A COR DO STATUS AQUI TAMBÉM!
    const classeStatus = getCorStatusEstoque(item.status);

    // Menu Ações
    const menuAcoes = `
            <div class="dropdown">
                <button class="btn btn-sm btn-light border-0 rounded-circle shadow-sm" 
                        type="button" 
                        data-bs-toggle="dropdown"
                        style="width: 32px; height: 32px;">
                    <i class="bi bi-three-dots-vertical text-muted"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end dropdown-menu-modern">
                    <li>
                        <a class="dropdown-item-modern item-gray" href="#" onclick="visualizarItem(${item.id})">
                            <i class="bi bi-eye"></i> Detalhes
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item-modern item-blue" href="#" onclick="editarItem(${item.id})">
                            <i class="bi bi-pencil-square"></i> Editar
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item-modern item-red" href="#" onclick="excluirItem(${item.id})">
                            <i class="bi bi-trash3"></i> Excluir
                        </a>
                    </li>
                </ul>
            </div>`;

    const tr = `
        <tr>
            <td class="ps-4 fw-bold text-dark">${item.nome}</td>
            <td class="small">${item.categoria || '-'}</td>
            <td class="small text-muted">${item.marca || ''} ${item.modelo || ''}</td>
            <td class="text-center">${item.qtd_disponivel} / ${item.qtd_total}</td>
            <td class="fw-bold">R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td><span class="badge ${classeStatus}">${item.status}</span></td>
            <td class="text-end pe-4">${menuAcoes}</td>
        </tr>`;
    tbody.insertAdjacentHTML('beforeend', tr);
  });
}


// 7. FUNÇÕES DE AÇÃO (VISUALIZAR, EDITAR, EXCLUIR)

// Visualizar
// 1. VISUALIZAR (MODO LEITURA - IGUAL JOB/CLIENTE)
window.visualizarItem = function (id) {
  const item = window.cacheEstoque.find(i => i.id === id);
  if (!item) return;

  preencherFormularioItem(item);

  // Bloqueia todos os campos
  document.querySelectorAll('#formNovoItem input, #formNovoItem select, #formNovoItem textarea').forEach(el => {
    el.disabled = true;
    el.style.backgroundColor = '#f8fafc'; // Fundo cinza claro igual ao sistema
    el.style.cursor = 'not-allowed';
  });

  // Esconde botões de ação (Salvar/Cancelar)
  const btnSalvar = document.querySelector('#view-novo-item .btn-success');
  if (btnSalvar) btnSalvar.style.display = 'none';

  // --- AQUI ESTÁ A CORREÇÃO (CÓPIA FIEL DO PADRÃO) ---
  // Pega o título "Cadastrar Equipamento"
  const tituloH4 = document.querySelector('#view-novo-item h4');

  // Remove badge antigo se existir para não duplicar
  const badgeAntigo = document.getElementById('badge-estoque-visualizacao');
  if (badgeAntigo) badgeAntigo.remove();

  // Cria o badge idêntico ao da imagem
  if (tituloH4) {
    const badge = document.createElement('span');
    badge.id = 'badge-estoque-visualizacao';

    // Classes Bootstrap: bg-info (Azul Ciano), text-white (Texto Branco), rounded-pill (Borda redonda)
    badge.className = 'badge bg-info text-white rounded-pill ms-3';

    // Ajuste de tamanho e alinhamento
    badge.style.fontSize = '0.75rem';
    badge.style.verticalAlign = 'middle';
    badge.style.letterSpacing = '0.5px';

    // O CONTEÚDO EXATO COM EMOJI
    badge.textContent = '👁️ MODO VISUALIZAÇÃO';

    tituloH4.appendChild(badge);
  }

  switchView('novo-item');
}

// Editar
// 2. EDITAR (LIMPEZA DO MODO VISUALIZAÇÃO)
window.editarItem = function (id) {
  const item = window.cacheEstoque.find(i => i.id === id);
  if (!item) return;
  window.idItemEditando = id;

  preencherFormularioItem(item);

  // Libera campos e reseta estilo
  document.querySelectorAll('#formNovoItem input, #formNovoItem select, #formNovoItem textarea').forEach(el => {
    el.disabled = false;
    el.style.backgroundColor = '';
    el.style.cursor = '';
  });

  // Mostra botão atualizar
  const btn = document.querySelector('#view-novo-item .btn-success');
  if (btn) {
    btn.style.display = 'inline-block';
    btn.innerHTML = '<i class="bi bi-check-lg me-2"></i> Atualizar Item';
  }

  // --- REMOVE O BADGE DE VISUALIZAÇÃO SE EXISTIR ---
  const badgeAntigo = document.getElementById('badge-estoque-visualizacao');
  if (badgeAntigo) badgeAntigo.remove();

  switchView('novo-item');
}

// Excluir
window.excluirItem = function (id) {
  if (!confirm("Tem certeza que deseja apagar este item?")) return;
  fetch(`${API_URL}/equipamentos/${id}`, { method: 'DELETE' })
    .then(() => {
      carregarEstoque();
    })
    .catch(err => alert("Erro ao excluir: " + err));
}




// Variável global para guardar o estoque carregado na memória
window.cacheEquipamentosSelect = [];

window.carregarEquipamentosParaPedido = function () {
  fetch(`${API_URL}/equipamentos`)
    .then(res => res.json())
    .then(itens => {
      window.cacheEquipamentosSelect = itens; // Guarda na memória

      const select = document.getElementById('selectEquipamentoPedido');
      if (!select) return;

      select.innerHTML = '<option value="">-- Selecione um equipamento --</option>';

      itens.forEach(item => {
        // Só mostra se for Ativo/Disponível (opcional)
        const qtdDisp = item.qtd_disponivel;
        const textoEstoque = qtdDisp > 0 ? `(Disp: ${qtdDisp})` : `(SEM ESTOQUE)`;
        const disabled = qtdDisp <= 0 ? 'disabled' : ''; // Bloqueia se zerado

        // Ex: "Teleprompter 19 pol (Disp: 3) - R$ 250,00"
        const textoOpcao = `${item.nome} ${textoEstoque} - R$ ${parseFloat(item.valor_diaria).toFixed(2)}`;

        // Cria a option
        const option = document.createElement('option');
        option.value = item.id;
        option.text = textoOpcao;
        if (qtdDisp <= 0) option.disabled = true;

        select.appendChild(option);
      });
    })
    .catch(err => console.error("Erro ao carregar equipamentos para select:", err));
};


window.adicionarEquipamentoPedido = async function () {
  const select = document.getElementById('selectEquipamentoPedido');
  const equipamento_id = select.value;

  if (!equipamento_id) {
    alert('⛔ Selecione um equipamento!');
    return;
  }

  try {
    // Buscar dados do equipamento
    const response = await fetch(`${API_URL}/equipamentos`);
    const equipamentos = await response.json();
    const equipamento = equipamentos.find(e => e.id == equipamento_id);

    if (!equipamento) {
      alert('⛔ Equipamento não encontrado!');
      return;
    }

    console.log("📦 Equipamento selecionado:", equipamento);

    // Verificar se já foi adicionado
    const tabela = document.getElementById('lista-itens-job');
    const jáExiste = Array.from(tabela.querySelectorAll('tr')).some(
      tr => {
        const elem = tr.querySelector('[data-equipamento-id]');
        return elem && elem.getAttribute('data-equipamento-id') == equipamento_id;
      }
    );

    if (jáExiste) {
      alert('⚠️ Este equipamento já foi adicionado!');
      return;
    }

    // Adicionar linha com validação
    window.adicionarLinhaItemComValidacao(equipamento);

    // Resetar select
    select.value = '';

  } catch (erro) {
    console.error("❌ Erro ao buscar equipamento:", erro);
    alert("❌ Erro ao buscar equipamento. Tente novamente.");
  }
};






// ============================================
// 5. FUNÇÃO: Adicionar linha COM validação
// ============================================
window.adicionarLinhaItemComValidacao = function (equipamento) {
  const tabela = document.getElementById('lista-itens-job');
  const novaLinha = document.createElement('tr');
  const isEdit = Number.isInteger(window.__jobEditandoId);

  // Se for edição, buscar a quantidade original
  let qtdOriginalAlocada = 0;
  if (isEdit && window.__itensOriginais && window.__itensOriginais.length > 0) {
    const itemOriginal = window.__itensOriginais.find(o => o.equipamento_id === equipamento.id);
    if (itemOriginal) {
      qtdOriginalAlocada = itemOriginal.qtd;
    }
  }

  // Calcular máximo permitido
  const qtdMaxima = qtdOriginalAlocada + equipamento.qtd_disponivel;

  const equipamentoHtml = equipamento
    ? `
            <div data-equipamento-id="${equipamento.id}" style="display: none;"></div>
            <strong>${equipamento.nome}</strong><br>
            <small class="text-muted">${equipamento.marca} ${equipamento.modelo}</small><br>
            <small class="text-success">
                ${isEdit && qtdOriginalAlocada > 0
      ? `Alocado: <strong>${qtdOriginalAlocada} un.</strong> + Disponível: <strong>${equipamento.qtd_disponivel} un.</strong> = Máximo: <strong>${qtdMaxima} un.</strong>`
      : `Disponível: <strong>${equipamento.qtd_disponivel} un.</strong>`
    }
            </small>
        `
    : '';

  novaLinha.innerHTML = `
        <td style="padding-left: 20px;">
            ${equipamentoHtml}
            <input type="text" data-campo="descricao" class="form-control form-control-sm mt-2" 
                   placeholder="Descrição do Item" value="${equipamento?.nome || ''}" 
                   style="font-weight: 500;">
        </td>
        <td style="text-align: center;">
            <input type="number" data-campo="qtd" class="form-control form-control-sm" 
                   value="1" min="1" max="${qtdMaxima}"
                   onchange="window.validarQuantidadeEstoque(this, ${equipamento?.id}, ${equipamento?.qtd_disponivel})"
                   onkeyup="window.validarQuantidadeEstoque(this, ${equipamento?.id}, ${equipamento?.qtd_disponivel})">
            <small class="text-danger" id="erro-qtd-${equipamento?.id}" style="display: none;">
                ❌ Máximo: ${qtdMaxima}
            </small>
        </td>
        <td>
            <div class="input-group input-group-sm">
                <span class="input-group-text">R$</span>
                <input type="number" data-campo="valor" class="form-control" 
                       value="${equipamento?.valor_diaria || 0}" step="0.01" 
                       onchange="window.atualizarValorTotal()">
            </div>
        </td>
        <td>
            <input type="number" data-campo="desconto" class="form-control form-control-sm" 
                   value="0" step="0.01" min="0" 
                   onchange="window.atualizarValorTotal()">
        </td>
        <td style="text-align: center;">
            <button type="button" class="btn btn-sm btn-outline-danger" 
                    onclick="window.removerLinhaItem(this)">
                <i class="bi bi-trash"></i>
            </button>
        </td>
    `;

  tabela.appendChild(novaLinha);
  window.atualizarValorTotal();
};


// ============================================
// 7. FUNÇÃO: Remover linha de item
// ============================================
window.removerLinhaItem = function (btn) {
  btn.closest('tr').remove();
  window.atualizarValorTotal();
};



// ============================================
// 8. FUNÇÃO: Atualizar valor total exibido
// ============================================
window.atualizarValorTotal = function () {
  const tabela = document.getElementById('lista-itens-job');
  const linhas = tabela.querySelectorAll('tr');
  let subtotal = 0;

  linhas.forEach(linha => {
    const qtd = parseInt(linha.querySelector('[data-campo="qtd"]')?.value) || 0;
    const valor = parseFloat(linha.querySelector('[data-campo="valor"]')?.value) || 0;
    const desconto = parseFloat(linha.querySelector('[data-campo="desconto"]')?.value) || 0;

    const valorLinha = (qtd * valor) - ((qtd * valor * desconto) / 100);
    subtotal += valorLinha;
  });

  // Aplicar desconto global
  const descontoGlobal = parseFloat(document.getElementById('descontoTotal')?.value) || 0;
  const descontoValor = (subtotal * descontoGlobal) / 100;
  const total = subtotal - descontoValor;

  const displayElement = document.getElementById('displayValorTotal');
  if (displayElement) {
    displayElement.textContent = `R$ ${total.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  console.log(`💰 Subtotal: R$ ${subtotal.toFixed(2)} | Desconto: R$ ${descontoValor.toFixed(2)} | Total: R$ ${total.toFixed(2)}`);
};


// ============================================
// 9. FUNÇÃO: Calcular desconto com validação
// ============================================
window.calcularValorTotalComDesconto = function () {
  window.atualizarValorTotal();
};

window.validarQuantidadeEstoque = async function (inputQtd, equipamentoId, qtdDisponivel) {
  const qtdSolicitada = parseInt(inputQtd.value) || 0;
  const erroElement = document.getElementById(`erro-qtd-${equipamentoId}`);
  const isEdit = Number.isInteger(window.__jobEditandoId);

  console.log(`🔍 Validando: Solicitado=${qtdSolicitada}, Disponível=${qtdDisponivel}, É Edição=${isEdit}`);

  let qtdPermitida = qtdDisponivel; // Padrão: novo pedido

  if (isEdit && window.__itensOriginais && window.__itensOriginais.length > 0) {
    // === MODO EDIÇÃO: Precisa considerar o que já foi alocado ===
    const itemOriginal = window.__itensOriginais.find(
      o => o.equipamento_id == equipamentoId
    );

    if (itemOriginal) {
      // Quantidade original do item + o que está disponível agora
      // Exemplo: Se tinha 5 alocados e agora tem 2 disponíveis = pode usar até 7
      qtdPermitida = itemOriginal.qtd + qtdDisponivel;
      console.log(`📊 EDIÇÃO: Qtd Original=${itemOriginal.qtd}, Disp Agora=${qtdDisponivel}, Permitida=${qtdPermitida}`);
    }
  }

  console.log(`✅ Quantidade máxima permitida: ${qtdPermitida}`);

  if (qtdSolicitada > qtdPermitida) {
    // ❌ ERRO: Ultrapassou o limite
    inputQtd.value = qtdPermitida;
    inputQtd.classList.add('is-invalid');

    if (erroElement) {
      erroElement.style.display = 'block';

      if (isEdit && window.__itensOriginais.length > 0) {
        const itemOriginal = window.__itensOriginais.find(o => o.equipamento_id == equipamentoId);
        const msgEdit = itemOriginal
          ? `Você tinha alocado ${itemOriginal.qtd} un. + ${qtdDisponivel} un. disponível = ${qtdPermitida} un. máximo`
          : `Máximo disponível: ${qtdPermitida} un.`;
        erroElement.textContent = `❌ ${msgEdit}`;
      } else {
        erroElement.textContent = `❌ Máximo disponível: ${qtdPermitida} un.`;
      }
    }

    alert(`⛔ ESTOQUE INSUFICIENTE!\n\nQuantidade solicitada: ${qtdSolicitada}\nQuantidade máxima permitida: ${qtdPermitida}\n\nAjustando para o máximo permitido...`);
  } else {
    // ✅ OK: Quantidade válida
    inputQtd.classList.remove('is-invalid');
    if (erroElement) {
      erroElement.style.display = 'none';
    }
  }

  window.atualizarValorTotal();
};

window.extrairItensComEquipamento = function () {
  const tabela = document.getElementById('lista-itens-job');
  if (!tabela) {
    console.warn("⚠️ Tabela 'lista-itens-job' não encontrada!");
    return [];
  }

  const linhas = tabela.querySelectorAll('tr');
  const itens = [];

  linhas.forEach((linha, index) => {
    const descricao = linha.querySelector('[data-campo="descricao"]')?.value?.trim();
    const qtd = parseInt(linha.querySelector('[data-campo="qtd"]')?.value) || 0;
    const valor = parseFloat(linha.querySelector('[data-campo="valor"]')?.value) || 0;
    const desconto = parseFloat(linha.querySelector('[data-campo="desconto"]')?.value) || 0;

    // Procura o data-equipamento-id em qualquer elemento da linha
    let equipamento_id = null;
    const elemComEquip = linha.querySelector('[data-equipamento-id]');
    if (elemComEquip) {
      equipamento_id = elemComEquip.getAttribute('data-equipamento-id');
    }

    if (descricao && qtd > 0) {
      itens.push({
        descricao: descricao,
        qtd: qtd,
        valor: valor,
        desconto_item: desconto,
        equipamento_id: equipamento_id ? parseInt(equipamento_id) : null
      });

      console.log(`📦 Item ${index}: ${descricao} | Qtd: ${qtd} | Equip ID: ${equipamento_id}`);
    }
  });

  console.log("✅ Total de itens extraídos:", itens.length);
  return itens;
};



/* =============================================================
   GESTÃO DE RH (FUNCIONÁRIOS)
   ============================================================= */

window.idFuncionarioEditando = null;

// Estado de paginação e cache
if (!window.cacheFuncionarios) window.cacheFuncionarios = [];
if (!window.modoExibicaoFuncionarios) window.modoExibicaoFuncionarios = 'card'; // 'card' ou 'list'

if (!window.paginacaoFuncionarios) {
  window.paginacaoFuncionarios = {
    paginaAtual: 1,
    itensPorPagina: 6,
    listaTotalFiltrada: [],
    paginaSalva: null
  };
}

// 1. CARREGAR LISTA DE FUNCIONÁRIOS
window.carregarFuncionarios = async function () {
  

  try {
    const res = await fetch(`${API_URL}/funcionarios/todos`);
    const lista = await res.json();

    console.log('✅ Funcionários carregados:', lista.length, 'items');
    window.cacheFuncionarios = lista;

    // Atualiza cache de busca global
    if (typeof updateSearchCache === 'function') {
      updateSearchCache();
    }

    // --- CÁLCULO DOS CARDS KPI ---
    const total = lista.length;
    const ativos = lista.filter(f => f.status === 'Ativo').length;
    const ferias = lista.filter(f => f.status === 'Férias').length;
    const inativos = lista.filter(f => f.status === 'Inativo').length;

    console.log('📊 KPIs calculados:', { total, ativos, ferias, inativos });

    // Atualiza o HTML dos Cards
    const elTotal = document.getElementById('kpi-rh-total');
    const elAtivos = document.getElementById('kpi-rh-ativos');
    const elFerias = document.getElementById('kpi-rh-ferias');
    const elInativos = document.getElementById('kpi-rh-inativos');

    if (elTotal) {
      elTotal.innerText = total;
      console.log('✅ KPI Total atualizado:', total);
    }
    if (elAtivos) {
      elAtivos.innerText = ativos;
      console.log('✅ KPI Ativos atualizado:', ativos);
    }
    if (elFerias) {
      elFerias.innerText = ferias;
      console.log('✅ KPI Férias atualizado:', ferias);
    }
    if (elInativos) {
      elInativos.innerText = inativos;
      console.log('✅ KPI Inativos atualizado:', inativos);
    }
    // ----------------------------------------------

    // Aplica filtros inicialmente
    await window.filtrarFuncionarios();

    // Atualiza indicadores de status no header
    updateStatusIndicators();
  } catch (err) {
    console.error("Erro ao carregar funcionários:", err);
  }
};

// 2. FILTRAR FUNCIONÁRIOS
window.filtrarFuncionarios = function () {
  // Validação: se não tem cache, não faz nada
  if (!window.cacheFuncionarios || window.cacheFuncionarios.length === 0) {
    console.warn('⚠️ Cache de funcionários vazio. Aguardando carregamento...');
    return;
  }

  console.log('🔍 Filtrando funcionários. Cache tem:', window.cacheFuncionarios.length, 'items');

  const inputBusca = document.getElementById('buscaFuncionarios');
  const inputStatus = document.getElementById('filtroStatusFuncionario');
  const inputDepartamento = document.getElementById('filtroDepartamentoFuncionario');

  const termo = inputBusca ? inputBusca.value.toLowerCase() : "";
  const statusFiltro = inputStatus ? inputStatus.value : "";
  const deptoFiltro = inputDepartamento ? inputDepartamento.value : "";

  console.log('🎯 Filtros aplicados:', { termo, statusFiltro, deptoFiltro });

  const filtrados = window.cacheFuncionarios.filter(func => {
    const nome = (func.nome || "").toLowerCase();
    const cargo = (func.cargo || "").toLowerCase();
    const email = (func.email || "").toLowerCase();
    const status = (func.status || "");
    const departamento = (func.departamento || "");

    // Filtro de Texto
    const bateuTexto = nome.includes(termo) || cargo.includes(termo) || email.includes(termo);

    // Filtro de Status
    const bateuStatus = statusFiltro === "" || status === statusFiltro;

    // Filtro de Departamento
    const bateuDepto = deptoFiltro === "" || departamento === deptoFiltro;

    return bateuTexto && bateuStatus && bateuDepto;
  });

  console.log('✅ Filtrados:', filtrados.length, 'de', window.cacheFuncionarios.length, 'funcionários');

  // Salva lista filtrada e reseta para página 1
  window.paginacaoFuncionarios.listaTotalFiltrada = filtrados;
  window.paginacaoFuncionarios.paginaAtual = 1;

  // Renderiza primeira página
  window.renderizarFuncionariosPaginado();
};

// 3. RENDERIZAR COM PAGINAÇÃO
window.renderizarFuncionariosPaginado = function (pagina = null) {
  if (!window.paginacaoFuncionarios) {
    console.error('❌ paginacaoFuncionarios não inicializado!');
    return;
  }

  if (pagina) window.paginacaoFuncionarios.paginaAtual = pagina;

  const { paginaAtual, itensPorPagina, listaTotalFiltrada } = window.paginacaoFuncionarios;
  const totalItens = listaTotalFiltrada.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);

  console.log('📄 Paginação Funcionários:', { paginaAtual, itensPorPagina, totalItens, totalPaginas });

  // Calcula índices da página atual
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const itensPagina = listaTotalFiltrada.slice(inicio, fim);

  console.log('📦 Items carregados:', itensPagina.length, 'de', inicio, 'até', fim);

  // Renderiza a página atual no modo escolhido
  if (window.modoExibicaoFuncionarios === 'card') {
    window.renderizarFuncionariosCards(itensPagina);
  } else {
    window.renderizarFuncionariosLista(itensPagina);
  }

  // Renderiza botões de paginação
  window.renderizarBotoesPaginacaoFuncionarios(totalPaginas, totalItens);
};

// 4. RENDERIZAR CARDS
window.renderizarFuncionariosCards = function (lista) {
  const container = document.getElementById('lista-funcionarios-real');
  if (!container) {
    console.error('❌ Container lista-funcionarios-real não encontrado!');
    return;
  }

  console.log('🎴 Renderizando', lista.length, 'cards de funcionários');
  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = '<div class="col-12 text-center text-muted py-5">Nenhum funcionário encontrado.</div>';
    return;
  }

  lista.forEach(func => {
    // Iniciais do Nome (Ex: Roberto Alves -> RA)
    const iniciais = func.nome.split(" ").map((n, i, a) => i === 0 || i === a.length - 1 ? n[0] : null).join("").toUpperCase().substring(0, 2);

    // Cores por departamento (Visual)
    let corAvatar = "#0f172a"; // Padrão - Administrativo
    if (func.departamento === 'Operações') corAvatar = "#299cdb"; // Azul
    if (func.departamento === 'Vendas' || func.departamento === 'Comercial') corAvatar = "#0ab39c"; // Teal
    if (func.departamento === 'Logística') corAvatar = "#db2777"; // Rosa
    if (func.departamento === 'Financeiro') corAvatar = "#10b981"; // Verde
    if (func.departamento === 'Tecnologia' || func.departamento === 'TI') corAvatar = "#06b6d4"; // Cyan
    if (func.departamento === 'Produção') corAvatar = "#8b5cf6"; // Roxo
    if (func.departamento === 'Administrativo') corAvatar = "#f7b84b"; // Amarelo

    // Badge Departamento
    let badgeClass = "badge-dept badge-admin";
    if (func.departamento === 'Operações') badgeClass = "badge-dept badge-operacoes";
    if (func.departamento === 'Logística') badgeClass = "badge-dept badge-logistica";
    if (func.departamento === 'Vendas' || func.departamento === 'Comercial') badgeClass = "badge-dept badge-comercial";
    if (func.departamento === 'Financeiro') badgeClass = "badge-dept badge-financeiro";
    if (func.departamento === 'Administrativo') badgeClass = "badge-dept badge-administrativo";
    if (func.departamento === 'Tecnologia' || func.departamento === 'TI') badgeClass = "badge-dept badge-tecnologia";
    if (func.departamento === 'Produção') badgeClass = "badge-dept badge-producao";

    // Status
    let statusClass = "bg-green-soft text-green";
    if (func.status === 'Inativo') statusClass = "bg-gray-100 text-muted";
    if (func.status === 'Férias') statusClass = "bg-orange-soft text-orange";

    const cardHTML = `
            <div class="col-xl-4 col-md-6">
                <div class="card-custom h-100 position-relative" 
                     onclick="visualizarFuncionario(${func.id})" 
                     style="cursor: pointer;">
                    
                    <div class="dropdown position-absolute top-0 end-0 mt-3 me-3" onclick="event.stopPropagation();">
                        <button class="btn btn-sm btn-light border-0 rounded-circle shadow-sm" 
                                type="button" 
                                data-bs-toggle="dropdown"
                                style="width: 32px; height: 32px;">
                            <i class="bi bi-three-dots-vertical text-muted"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end dropdown-menu-modern">
                            <li>
                                <a class="dropdown-item-modern" href="#" onclick="visualizarFuncionario(${func.id})">
                                    <i class="bi bi-eye"></i> Visualizar
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item-modern item-blue" href="#" onclick="editarFuncionario(${func.id})">
                                    <i class="bi bi-pencil-square"></i> Editar
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item-modern item-red" href="#" onclick="excluirFuncionario(${func.id})">
                                    <i class="bi bi-trash3"></i> Excluir
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="d-flex align-items-center">
                            <div class="avatar-square avatar-upload-container" 
                                 style="background-color: ${corAvatar}; ${getAvatarUrl(func) ? `background-image: url(${getAvatarUrl(func)}); background-size: cover; background-position: center;` : ''}"
                                 onclick="event.stopPropagation(); abrirUploadAvatarFuncionario(${func.id})"
                                 title="Clique para alterar foto">
                                ${getAvatarUrl(func) ? '' : iniciais}
                                <div class="avatar-upload-overlay-card">
                                    <i class="bi bi-camera-fill"></i>
                                </div>
                            </div>
                            <div>
                                <h6 class="fw-bold mb-0 text-dark">${func.nome}</h6>
                                <span class="text-muted small">${func.cargo || 'Sem cargo'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-2 mb-3">
                        <div class="contact-info text-truncate">
                            <i class="bi bi-envelope"></i> ${func.email || '-'}
                        </div>
                        <div class="contact-info">
                            <i class="bi bi-telephone"></i> ${func.telefone || '-'}
                        </div>
                        <div class="contact-info">
                            <i class="bi bi-calendar"></i> Adm: ${func.data_admissao ? new Date(func.data_admissao).toLocaleDateString('pt-BR') : '-'}
                        </div>
                    </div>

                    <div class="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                        <span class="${badgeClass}">${func.departamento || 'Geral'}</span>
                        <span class="status-pill ${statusClass}">${func.status}</span>
                    </div>
                </div>
            </div>`;

    container.insertAdjacentHTML('beforeend', cardHTML);
  });
}

// 5. RENDERIZAR LISTA (Tabela)
window.renderizarFuncionariosLista = function (lista) {
  console.log('📋 Renderizando lista tabela:', lista.length, 'funcionários');
  const tbody = document.getElementById('lista-funcionarios-tabela-body');
  if (!tbody) {
    console.error('❌ Elemento #lista-funcionarios-tabela-body não encontrado!');
    return;
  }
  tbody.innerHTML = "";

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">Nenhum funcionário encontrado.</td></tr>';
    return;
  }

  lista.forEach(func => {
    // Badge Departamento
    let badgeClass = "badge-dept badge-admin";
    if (func.departamento === 'Operações') badgeClass = "badge-dept badge-operacoes";
    if (func.departamento === 'Logística') badgeClass = "badge-dept badge-logistica";
    if (func.departamento === 'Vendas' || func.departamento === 'Comercial') badgeClass = "badge-dept badge-comercial";
    if (func.departamento === 'Financeiro') badgeClass = "badge-dept badge-financeiro";
    if (func.departamento === 'Administrativo') badgeClass = "badge-dept badge-administrativo";
    if (func.departamento === 'Tecnologia' || func.departamento === 'TI') badgeClass = "badge-dept badge-tecnologia";
    if (func.departamento === 'Produção') badgeClass = "badge-dept badge-producao";

    // Status
    let statusClass = "bg-green-soft text-green";
    if (func.status === 'Inativo') statusClass = "bg-gray-100 text-muted";
    if (func.status === 'Férias') statusClass = "bg-orange-soft text-orange";

    const menuDropdownHTML = `
            <ul class="dropdown-menu dropdown-menu-end dropdown-menu-modern">
                <li>
                    <a class="dropdown-item-modern" href="#" onclick="visualizarFuncionario(${func.id})">
                        <i class="bi bi-eye"></i> Visualizar
                    </a>
                </li>
                <li>
                    <a class="dropdown-item-modern item-blue" href="#" onclick="editarFuncionario(${func.id})">
                        <i class="bi bi-pencil-square"></i> Editar
                    </a>
                </li>
                <li>
                    <a class="dropdown-item-modern item-red" href="#" onclick="excluirFuncionario(${func.id})">
                        <i class="bi bi-trash3"></i> Excluir
                    </a>
                </li>
            </ul>`;

    const tr = `
        <tr style="cursor: pointer;" onclick="visualizarFuncionario(${func.id})">
            <td class="ps-4">
                <div class="fw-bold text-dark">${func.nome}</div>
                <div class="text-muted small">${func.cargo || 'Sem cargo'}</div>
            </td>
            <td><span class="${badgeClass}">${func.departamento || 'Geral'}</span></td>
            <td class="small">
                <div>${func.email || '-'}</div>
                <div class="text-muted">${func.telefone || '-'}</div>
            </td>
            <td class="small">${func.data_admissao ? new Date(func.data_admissao).toLocaleDateString('pt-BR') : '-'}</td>
            <td><span class="status-pill ${statusClass}">${func.status}</span></td>
            <td class="text-end pe-4" onclick="event.stopPropagation();">
                <div class="dropdown">
                    <button class="btn btn-light btn-sm border-0 rounded-circle shadow-sm" 
                            type="button" 
                            data-bs-toggle="dropdown"
                            style="width: 32px; height: 32px;">
                        <i class="bi bi-three-dots-vertical text-muted"></i>
                    </button>
                    ${menuDropdownHTML}
                </div>
            </td>
        </tr>`;
    tbody.insertAdjacentHTML('beforeend', tr);
  });
}

// 6. ALTERNAR VISUALIZAÇÃO (Cards/Lista)
window.alternarViewFuncionarios = function (modo) {
  window.modoExibicaoFuncionarios = modo;

  const containerCards = document.getElementById('lista-funcionarios-real');
  const containerLista = document.getElementById('lista-funcionarios-tabela-container');
  const btnCard = document.getElementById('btn-view-func-card');
  const btnList = document.getElementById('btn-view-func-list');

  if (modo === 'card') {
    if (containerCards) containerCards.classList.remove('d-none');
    if (containerLista) containerLista.classList.add('d-none');
    if (btnCard) btnCard.classList.add('active');
    if (btnList) btnList.classList.remove('active');
  } else {
    if (containerCards) containerCards.classList.add('d-none');
    if (containerLista) containerLista.classList.remove('d-none');
    if (btnCard) btnCard.classList.remove('active');
    if (btnList) btnList.classList.add('active');
  }

  // Redesenha mantendo a página atual
  window.renderizarFuncionariosPaginado();
};

// 7. MUDAR DE PÁGINA
window.mudarPaginaFuncionarios = function (novaPagina) {
  window.renderizarFuncionariosPaginado(novaPagina);
};

// 8. RENDERIZAR BOTÕES DE PAGINAÇÃO
window.renderizarBotoesPaginacaoFuncionarios = function (totalPaginas, totalItens) {
  const container = document.getElementById('paginacao-funcionarios');
  if (!container) {
    console.error('❌ Container paginacao-funcionarios não encontrado!');
    return;
  }

  const paginaAtual = window.paginacaoFuncionarios.paginaAtual;

  console.log('📊 Renderizando paginação:', { totalPaginas, totalItens, paginaAtual });

  // Se não há itens, não mostra nada
  if (totalItens === 0) {
    container.innerHTML = '';
    return;
  }

  // Se só tem 1 página, mostra apenas o total
  if (totalPaginas <= 1) {
    container.innerHTML = `<div class="text-center text-muted small mt-2">Total: ${totalItens} funcionário(s)</div>`;
    return;
  }

  // Múltiplas páginas - mostra paginação completa
  let html = '<div class="d-flex justify-content-center align-items-center gap-2">';

  // Botão Anterior
  const desabilitarAnterior = paginaAtual === 1;
  html += `
    <button class="btn btn-sm btn-outline-secondary" 
            onclick="mudarPaginaFuncionarios(${paginaAtual - 1})" 
            ${desabilitarAnterior ? 'disabled' : ''}>
      <i class="bi bi-chevron-left"></i> Anterior
    </button>
  `;

  // Botões numéricos (máximo 5 páginas visíveis)
  let paginaInicio = Math.max(1, paginaAtual - 2);
  let paginaFim = Math.min(totalPaginas, paginaInicio + 4);

  // Ajusta início se estiver próximo ao fim
  if (paginaFim - paginaInicio < 4) {
    paginaInicio = Math.max(1, paginaFim - 4);
  }

  for (let i = paginaInicio; i <= paginaFim; i++) {
    const ativo = i === paginaAtual ? 'btn-primary' : 'btn-outline-secondary';
    html += `
      <button class="btn btn-sm ${ativo}" 
              onclick="mudarPaginaFuncionarios(${i})" 
              style="min-width: 40px;">
        ${i}
      </button>
    `;
  }

  // Botão Próximo
  const desabilitarProximo = paginaAtual === totalPaginas;
  html += `
    <button class="btn btn-sm btn-outline-secondary" 
            onclick="mudarPaginaFuncionarios(${paginaAtual + 1})" 
            ${desabilitarProximo ? 'disabled' : ''}>
      Próximo <i class="bi bi-chevron-right"></i>
    </button>
  `;

  html += `</div>
    <div class="text-center text-muted small mt-2">
      Página ${paginaAtual} de ${totalPaginas} • Total: ${totalItens} funcionário(s)
    </div>`;

  container.innerHTML = html;
}


// 9. EDITAR (PREENCHER MODAL)
window.editarFuncionario = function (id) {
  // Busca os dados atuais para preencher
  // Como já carregamos a lista, podemos buscar do HTML ou fazer um fetch. 
  // Vamos fazer fetch simples para garantir dados frescos.
  fetch(`${API_URL}/funcionarios/todos`) // Ideal seria /funcionarios/:id mas usamos a lista
    .then(r => r.json())
    .then(lista => {
      const func = lista.find(f => f.id == id);
      if (!func) return;

      window.idFuncionarioEditando = id;

      // Preenche campos
      const set = (id, val) => document.getElementById(id).value = val || '';
      set('rhNome', func.nome);
      set('rhCargo', func.cargo);
      set('rhDepartamento', func.departamento);
      set('rhEmail', func.email);
      set('rhTelefone', func.telefone);
      set('rhCpf', func.cpf);
      set('rhAdmissao', func.data_admissao ? func.data_admissao.substring(0, 10) : '');
      set('rhStatus', func.status);
      set('rhSalario', func.salario);
      set('rhEndereco', func.endereco);

      // Muda título do modal
      document.getElementById('tituloModalFuncionario').innerText = "Editar Funcionário";

      // Abre modal
      const el = document.getElementById('modalNovoFuncionario');
      const modal = new bootstrap.Modal(el);
      modal.show();
    });
};

// 4. EXCLUIR
window.excluirFuncionario = function (id) {
  if (!confirm("Tem certeza que deseja excluir este funcionário?")) return;

  fetch(`${API_URL}/funcionarios/${id}`, { method: 'DELETE' })
    .then(() => carregarFuncionarios())
    .catch(err => alert("Erro ao excluir: " + err));
};

/* =============================================================
   UPLOAD DE AVATAR DE FUNCIONÁRIO
   ============================================================= */

/**
 * Abre o seletor de arquivo para upload de avatar do funcionário
 * @param {number} funcionarioId - ID do funcionário
 */
window.abrirUploadAvatarFuncionario = function (funcionarioId) {
  // Cria input file dinamicamente
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';

  input.onchange = function (e) {
    handleAvatarFuncionarioUpload(e, funcionarioId);
  };

  document.body.appendChild(input);
  input.click();

  // Remove input após uso
  setTimeout(() => document.body.removeChild(input), 1000);
};

/**
 * Processa o upload de avatar do funcionário
 * @param {Event} event - Evento do input file
 * @param {number} funcionarioId - ID do funcionário
 */
async function handleAvatarFuncionarioUpload(event, funcionarioId) {
  const file = event.target.files[0];

  if (!file) return;

  // Valida se é imagem
  if (!file.type.startsWith('image/')) {
    alert('⚠️ Por favor, selecione apenas arquivos de imagem (JPG, PNG, etc.)');
    return;
  }

  // Valida tamanho (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    alert('⚠️ A imagem deve ter no máximo 5MB');
    return;
  }

  // Cria preview da imagem
  const reader = new FileReader();

  reader.onload = async function (e) {
    const imageUrl = e.target.result;

    // Atualiza avatar visualmente no cache e na tela (usa avatar_base64 para consistência)
    const funcionario = window.cacheFuncionarios.find(f => f.id === funcionarioId);
    if (funcionario) {
      funcionario.avatar_base64 = imageUrl;
      funcionario.avatar = null; // Limpa avatar antigo
    }

    // Re-renderiza os cards para mostrar a nova foto
    window.renderizarFuncionariosPaginado();

    

    // Envia imagem para o servidor
    await uploadAvatarFuncionarioToServer(file, funcionarioId);
  };

  reader.readAsDataURL(file);
}

/**
 * Envia a foto do funcionário para o servidor (para implementação futura)
 * @param {File} file - Arquivo de imagem
 * @param {number} funcionarioId - ID do funcionário
 */
async function uploadAvatarFuncionarioToServer(file, funcionarioId) {
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('funcionarioId', funcionarioId);

    const response = await fetch(`${API_URL}/funcionarios/${funcionarioId}/avatar`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Avatar salvo no servidor:', data);

      // Recarrega lista de funcionários para pegar URL real do servidor
      await carregarFuncionarios();

      // Atualiza perfil do usuário logado (dropdown e configurações)
      loadUserProfileData();
      if (typeof carregarDadosPerfil === 'function') {
        carregarDadosPerfil();
      }

      alert('✅ Foto de perfil atualizada com sucesso!');
    } else {
      throw new Error('Erro ao salvar avatar');
    }
  } catch (error) {
    console.error('❌ Erro ao fazer upload do avatar:', error);
    alert('❌ Erro ao salvar foto. Tente novamente.');
  }
}

// Resetar modal ao fechar (para voltar a ser "Novo")
document.getElementById('modalNovoFuncionario').addEventListener('hidden.bs.modal', function () {
  document.getElementById('formFuncionario').reset();
  window.idFuncionarioEditando = null;
  document.getElementById('tituloModalFuncionario').innerText = "Novo Funcionário";
})



/* =============================================================
   GESTÃO DE RH - FUNÇÕES DE TELA CHEIA (Editar/Visualizar)
   ============================================================= */

// ABRIR TELA DE NOVO CADASTRO
window.abrirTelaNovoFuncionario = function () {
  window.idFuncionarioEditando = null;
  document.getElementById('formFuncionarioFull').reset();
  document.getElementById('tituloPaginaFuncionario').innerText = "Novo Funcionário";

  // REMOVE O BADGE DE VISUALIZAÇÃO SE EXISTIR
  const badgeAntigo = document.getElementById('badgeModoVisualizacao');
  if (badgeAntigo) badgeAntigo.remove();

  const badgeNovo = document.getElementById('badge-funcionario-visualizacao');
  if (badgeNovo) badgeNovo.remove();

  toggleCamposFuncionario(false);

  const btn = document.querySelector('#view-cadastro-funcionario .btn-success');
  if (btn) { btn.style.display = 'inline-block'; btn.innerHTML = 'Salvar Ficha'; }

  switchView('cadastro-funcionario');

  // Inicializa máscaras nos campos do formulário
  setTimeout(inicializarTodasAsMascaras, 100);
};

// FUNÇÃO AUXILIAR: PREENCHER FORMULÁRIO
async function preencherFormularioFuncionario(id) {
  try {
    const res = await fetch(`${API_URL}/funcionarios/todos?t=${new Date().getTime()}`);
    const lista = await res.json();
    const func = lista.find(f => f.id == id);

    if (!func) throw new Error("Funcionário não encontrado.");

    function set(idCampo, valor) {
      const el = document.getElementById(idCampo);
      if (el) el.value = valor || '';
    }

    set('rhNome', func.nome);
    set('rhCargo', func.cargo);
    set('rhDepartamento', func.departamento);
    set('rhEmail', func.email);
    set('rhTelefone', func.telefone);
    set('rhCpf', func.cpf);
    set('rhAdmissao', func.data_admissao ? func.data_admissao.substring(0, 10) : '');
    set('rhStatus', func.status);
    set('rhSalario', func.salario);
    set('rhEndereco', func.endereco);

    return true;
  } catch (error) {
    alert(error.message);
    return false;
  }
}

// SALVAR / ATUALIZAR FUNCIONÁRIO
window.salvarFuncionario = function () {
  const dados = {
    nome: document.getElementById('rhNome').value,
    cargo: document.getElementById('rhCargo').value,
    departamento: document.getElementById('rhDepartamento').value,
    email: document.getElementById('rhEmail').value,
    telefone: document.getElementById('rhTelefone').value,
    cpf: document.getElementById('rhCpf').value,
    data_admissao: document.getElementById('rhAdmissao').value,
    status: document.getElementById('rhStatus').value,
    salario: document.getElementById('rhSalario').value || null,
    endereco: document.getElementById('rhEndereco').value
  };

  if (!dados.nome || !dados.cargo) {
    alert("Preencha Nome e Cargo obrigatórios.");
    return;
  }

  const url = window.idFuncionarioEditando
    ? `${API_URL}/funcionarios/${window.idFuncionarioEditando}`
    : `${API_URL}/funcionarios`;

  const method = window.idFuncionarioEditando ? 'PUT' : 'POST';
  const isNovoFuncionario = !window.idFuncionarioEditando;

  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  })
    .then(response => response.json())
    .then(async (resultado) => {
      alert("Funcionário salvo com sucesso!");

      // Se é um novo funcionário e tem email, tentar enviar email de boas-vindas
      if (isNovoFuncionario && dados.email && resultado.senha_temporaria) {
        try {
          

          if (window.emailService) {
            const emailEnviado = await window.emailService.notificarNovoFuncionario({
              nome: dados.nome,
              email: dados.email,
              senha_temporaria: resultado.senha_temporaria
            });

            if (emailEnviado) {
              
            } else {
              
            }
          } else {
            
          }
        } catch (error) {
          console.error('❌ Erro ao enviar email de boas-vindas:', error);
        }
      }

      switchView('funcionarios');
      carregarFuncionarios();
    })
    .catch(err => alert("Erro ao salvar: " + err));
};

// VER DETALHES E HISTÓRICO DO FUNCIONÁRIO
async function verDetalhesFuncionario(id) {
  const container = document.getElementById('historico-funcionario-body');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>';

  try {
    const res = await fetch(`${API_URL}/funcionarios/${id}/historico`);
    const historico = await res.json();

    container.innerHTML = '';

    if (!historico || historico.length === 0) {
      container.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum job executado ainda.</td></tr>';
      return;
    }

    historico.forEach(job => {
      const tr = `
        <tr>
          <td class="small fw-bold text-primary">#${job.id}</td>
          <td class="small">${job.nome_cliente || 'N/A'}</td>
          <td class="small">${job.equipamento || 'N/A'}</td>
          <td class="small">${job.data_job ? formatarData(job.data_job) : '-'}</td>
          <td class="small"><span class="badge bg-${job.status === 'Finalizado' ? 'success' : 'warning'}">${job.status}</span></td>
          <td class="small text-end fw-bold">R$ ${parseFloat(job.valor || 0).toFixed(2)}</td>
        </tr>`;
      container.insertAdjacentHTML('beforeend', tr);
    });
  } catch (err) {
    container.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Erro ao carregar histórico.</td></tr>`;
  }
}

// ABRIR TELA DE NOVO CADASTRO
window.abrirTelaNovoFuncionario = function () {
  window.idFuncionarioEditando = null;
  document.getElementById('formFuncionarioFull').reset();
  document.getElementById('tituloPaginaFuncionario').innerText = "Novo Funcionário";

  // REMOVE O BADGE DE VISUALIZAÇÃO SE EXISTIR
  const badgeAntigo = document.getElementById('badgeModoVisualizacao');
  if (badgeAntigo) badgeAntigo.remove();

  const badgeNovo = document.getElementById('badge-funcionario-visualizacao');
  if (badgeNovo) badgeNovo.remove();

  toggleCamposFuncionario(false);

  const btn = document.querySelector('#view-cadastro-funcionario .btn-success');
  if (btn) { btn.style.display = 'inline-block'; btn.innerHTML = 'Salvar Ficha'; }

  switchView('cadastro-funcionario');
};


// 3. EDITAR
window.editarFuncionario = async function (id) {
  const sucesso = await preencherFormularioFuncionario(id);
  if (sucesso) {
    window.idFuncionarioEditando = id;
    document.getElementById('tituloPaginaFuncionario').innerText = "Editar Cadastro";

    // REMOVE O BADGE DE VISUALIZAÇÃO SE EXISTIR
    const badgeAntigo = document.getElementById('badgeModoVisualizacao');
    if (badgeAntigo) badgeAntigo.remove();

    const badgeNovo = document.getElementById('badge-funcionario-visualizacao');
    if (badgeNovo) badgeNovo.remove();

    // Libera campos e ajusta botão
    toggleCamposFuncionario(false);
    const btn = document.querySelector('#view-cadastro-funcionario .btn-success');
    if (btn) { btn.style.display = 'inline-block'; btn.innerHTML = 'Atualizar Dados'; }

    switchView('cadastro-funcionario');

    // Inicializa máscaras nos campos do formulário
    setTimeout(inicializarTodasAsMascaras, 100);
  }
};

// 5. FUNÇÃO DE PREENCHIMENTO
// 5. FUNÇÃO DE PREENCHIMENTO (ATUALIZADA)
// FUNÇÃO AUXILIAR: PREENCHER FORMULÁRIO (Usada no Editar e Visualizar)
async function preencherFormularioFuncionario(id) {
  try {
    // 1. Busca a lista atualizada do servidor
    // Usamos ?t=... para evitar cache e pegar dados frescos
    const res = await fetch(`${API_URL}/funcionarios/todos?t=${new Date().getTime()}`);
    const lista = await res.json();

    // 2. Encontra o funcionário clicado
    const func = lista.find(f => f.id == id);

    if (!func) throw new Error("Funcionário não encontrado na lista.");

    // 3. Funçãozinha para preencher sem dar erro se o campo faltar
    const set = (elementId, value) => {
      const el = document.getElementById(elementId);
      if (el) {
        // Se for data, precisamos cortar a parte do tempo (yyyy-mm-dd)
        if (elementId === 'rhAdmissao' || elementId === 'rhDemissao') {
          el.value = value ? value.substring(0, 10) : '';
        } else {
          el.value = value || '';
        }
      }
    };

    // --- PREENCHIMENTO DOS DADOS ---
    set('rhNome', func.nome);
    set('rhCpf', func.cpf);
    set('rhEmail', func.email);
    set('rhTelefone', func.telefone); // Campo novo

    // Endereço (Campos novos)
    set('rhCep', func.cep);
    set('rhLogradouro', func.logradouro);
    set('rhNumero', func.numero);
    set('rhBairro', func.bairro);
    set('rhCidade', func.cidade);
    set('rhUf', func.uf);
    // O campo antigo 'rhEndereco' usamos para compatibilidade se quiser, 
    // mas o foco agora são os campos separados.
    set('rhEndereco', func.endereco);

    // Outros
    set('rhObs', func.observacoes); // Campo novo
    set('rhStatus', func.status);
    set('rhDepartamento', func.departamento);
    set('rhCargo', func.cargo);
    set('rhAdmissao', func.data_admissao);
    set('rhDemissao', func.data_demissao); // Campo novo

    return true; // Deu tudo certo!
  } catch (e) {
    console.error(e);
    alert("Erro ao buscar dados: " + e.message);
    return false;
  }
}

// 6. SALVAR
// NO main.js -> Substitua a função salvarFuncionario inteira por esta:
window.salvarFuncionario = function () {

  // Função segura: Se o campo não existir, retorna vazio e não trava o sistema
  const val = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };

  const dados = {
    nome: val('rhNome'),
    cpf: val('rhCpf'),
    email: val('rhEmail'),
    telefone: val('rhTelefone'),
    cep: val('rhCep'),
    logradouro: val('rhLogradouro'),
    numero: val('rhNumero'),
    bairro: val('rhBairro'),
    cidade: val('rhCidade'),
    uf: val('rhUf'),
    observacoes: val('rhObs'),
    status: val('rhStatus'),
    departamento: val('rhDepartamento'),
    cargo: val('rhCargo'),
    data_admissao: val('rhAdmissao') || null,
    data_demissao: val('rhDemissao') || null
  };

  if (!dados.nome) return alert("O Nome é obrigatório!");

  const isEdit = window.idFuncionarioEditando !== null;
  const url = isEdit ? `${API_URL}/funcionarios/${window.idFuncionarioEditando}` : `${API_URL}/funcionarios`;
  const method = isEdit ? 'PUT' : 'POST';

  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  })
    .then(res => res.json())
    .then(() => {
      alert("Salvo com sucesso!");
      switchView('funcionarios');
      carregarFuncionarios();
    })
    .catch(err => alert("Erro ao salvar: " + err));
};


// 7. EXCLUIR
window.excluirFuncionario = function (id) {
  if (!confirm("Tem certeza que deseja excluir?")) return;
  fetch(`${API_URL}/funcionarios/${id}`, { method: 'DELETE' })
    .then(() => carregarFuncionarios())
    .catch(err => alert("Erro: " + err));
};

// HELPER DEFINITIVO: BLOQUEIA OU LIBERA OS CAMPOS (TELA CHEIA)
function toggleCamposFuncionario(bloquear) {
  // Atenção ao ID: #formFuncionarioFull (que é o da sua tela nova)
  const inputs = document.querySelectorAll('#formFuncionarioFull input, #formFuncionarioFull select, #formFuncionarioFull textarea');

  inputs.forEach(el => {
    el.disabled = bloquear;

    if (bloquear) {
      el.style.backgroundColor = '#e9ecef'; // Cinza (Bloqueado)
      el.style.cursor = 'not-allowed';      // Ícone de "Proibido"
    } else {
      el.style.backgroundColor = '#fff';    // Branco (Editável)
      el.style.cursor = 'text';
    }
  });
}
// 2. FUNÇÃO AUXILIAR: PREENCHER FORMULÁRIO (Usada no Editar e Visualizar)
async function preencherModalFuncionario(id) {
  try {
    const res = await fetch(`${API_URL}/funcionarios/todos`);
    const lista = await res.json();
    const func = lista.find(f => f.id == id);

    if (!func) throw new Error("Funcionário não encontrado");

    // Preenche os campos
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    set('rhNome', func.nome);
    set('rhCargo', func.cargo);
    set('rhDepartamento', func.departamento);
    set('rhEmail', func.email);
    set('rhTelefone', func.telefone);
    set('rhCpf', func.cpf);
    // Formata data para o input type="date" (yyyy-mm-dd)
    set('rhAdmissao', func.data_admissao ? func.data_admissao.substring(0, 10) : '');
    set('rhStatus', func.status);
    set('rhSalario', func.salario);
    set('rhEndereco', func.endereco);

    return true; // Sucesso
  } catch (error) {
    alert(error.message);
    return false;
  }
}

// 3. EDITAR FUNCIONÁRIO (Modo Edição)
// AÇÃO DO BOTÃO EDITAR (LÁPIS)
window.editarFuncionario = async function (id) {
  // 1. Tenta preencher os dados. Se conseguir, continua...
  const sucesso = await preencherFormularioFuncionario(id);

  if (sucesso) {
    // 2. Marca que estamos editando este ID
    window.idFuncionarioEditando = id;

    // 3. Muda o título da página
    document.getElementById('tituloPaginaFuncionario').innerText = "Editar Cadastro";

    // REMOVE O BADGE DE VISUALIZAÇÃO SE EXISTIR
    const badgeAntigo = document.getElementById('badgeModoVisualizacao');
    if (badgeAntigo) badgeAntigo.remove();

    const badgeNovo = document.getElementById('badge-funcionario-visualizacao');
    if (badgeNovo) badgeNovo.remove();

    // 4. Garante que os campos estão desbloqueados (editáveis)
    toggleCamposFuncionario(false);

    // 5. Configura o botão verde para "Atualizar"
    const btnSalvar = document.querySelector('#view-cadastro-funcionario .btn-success');
    if (btnSalvar) {
      btnSalvar.style.display = 'inline-block';
      btnSalvar.innerHTML = '<i class="bi bi-check-lg me-2"></i> Atualizar Dados';
    }

    // 6. Troca a tela para o formulário
    switchView('cadastro-funcionario');

    // Inicializa máscaras nos campos do formulário
    setTimeout(inicializarTodasAsMascaras, 100);
  }
};




// 4. VISUALIZAR FUNCIONÁRIO (Modo Leitura - Bloqueado)
// 4. VISUALIZAR FUNCIONÁRIO (COM PROTEÇÃO CONTRA ERRO)
window.visualizarFuncionario = async function (id) {
  const sucesso = await preencherFormularioFuncionario(id);
  if (sucesso) {
    window.idFuncionarioEditando = null;

    // Bloqueia campos e esconde botão salvar
    toggleCamposFuncionario(true);
    const btn = document.querySelector('#view-cadastro-funcionario .btn-success');
    if (btn) btn.style.display = 'none';

    switchView('cadastro-funcionario');

    // ADICIONA BADGE "MODO VISUALIZAÇÃO" NO H2 (DEPOIS DO SWITCHVIEW)
    setTimeout(() => {
      const tituloH2 = document.getElementById('tituloPaginaFuncionario');

      // Remove badge antigo se existir
      const badgeAntigo = document.getElementById('badge-funcionario-visualizacao');
      if (badgeAntigo) badgeAntigo.remove();

      if (tituloH2) {
        tituloH2.innerText = "Visualizar Funcionário";

        const badge = document.createElement('span');
        badge.id = 'badge-funcionario-visualizacao';
        badge.className = 'badge bg-info text-white rounded-pill ms-3';
        badge.style.fontSize = '0.75rem';
        badge.style.verticalAlign = 'middle';
        badge.style.letterSpacing = '0.5px';
        badge.textContent = '👁️ MODO VISUALIZAÇÃO';
        tituloH2.appendChild(badge);
      }
    }, 100);

    await verDetalhesFuncionario(id);
  }
};



// 6. EXCLUIR
window.excluirFuncionario = function (id) {
  if (!confirm("Tem certeza que deseja excluir este funcionário?")) return;

  fetch(`${API_URL}/funcionarios/${id}`, { method: 'DELETE' })
    .then(() => {
      carregarFuncionarios();
    })
    .catch(err => alert("Erro ao excluir: " + err));
};

// 7. RESET AUTOMÁTICO AO FECHAR O MODAL
// Isso garante que quando você clicar em "Novo" depois de "Visualizar", tudo volte ao normal
document.getElementById('modalNovoFuncionario').addEventListener('hidden.bs.modal', function () {
  // 1. Limpa o formulário
  document.getElementById('formFuncionario').reset();

  // 2. Reseta a variável de edição
  window.idFuncionarioEditando = null;

  // 3. Reseta textos e botões
  document.getElementById('tituloModalFuncionario').innerText = "Novo Funcionário";
  const btnSalvar = document.querySelector('#modalNovoFuncionario .btn-dark');
  btnSalvar.innerText = "Salvar Funcionário";
  btnSalvar.style.display = 'block'; // Garante que reapareça se estava oculto

  // 4. Desbloqueia os campos (caso viesse do modo visualizar)
  toggleCamposFuncionario(false);
});


/* =============================================================
   CALENDÁRIO DE ESCALAS (CORRIGIDO)
   ============================================================= */

let calendar = null; // Variável global do calendário

// 1. INICIALIZAR CALENDÁRIO MELHORADO
window.initCalendar = function () {
  const calendarEl = document.getElementById('calendar');

  // 1. Evita recriar o calendário se já existe
  if (calendar) {
    console.log("🔄 Calendário já existe, atualizando eventos e tamanho...");
    calendar.refetchEvents();
    // Pequeno delay para garantir que o layout se ajuste se a tela mudou
    setTimeout(() => calendar.updateSize(), 200);
    return;
  }

  // Detecta se é celular (tela menor que 768px)
  const isMobile = window.innerWidth < 768;

  console.log("📅 Inicializando FullCalendar...");

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'pt-br',

    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,listYear'
    },

    buttonText: {
      today: 'Hoje',
      month: 'Mês',
      year: 'Lista'
    },

    height: 'auto',

    firstDay: 0,
    navLinks: true,
    editable: false,
    dayMaxEvents: 3,


    // 🎨 EVENTOS VÊM DO SERVIDOR (SUA LÓGICA MANTIDA)
    events: function (info, successCallback, failureCallback) {
      console.log("🔍 Buscando eventos do servidor...");

      fetch(`${API_URL}/agenda`)
        .then(res => res.json())
        .then(eventos => {
          console.log("✅ Eventos recebidos:", eventos.length);

          // Transforma os dados para o FullCalendar
          const eventosFormatados = eventos.map(e => ({
            id: e.id,
            title: e.title,
            start: e.start,
            end: e.end || e.start,
            backgroundColor: e.backgroundColor,
            borderColor: e.borderColor,
            extendedProps: {
              operador: e.operador_nome,
              localizacao: e.localizacao,
              status: e.description,
              tipo: e.tipo_evento,
              operador_id: e.operador_id,
              data_inicio_real: e.data_inicio_real,
              data_fim_real: e.data_fim_real,
              is_manual: e.is_manual,
              servico_nome: e.servico_nome
            }
          }));

          successCallback(eventosFormatados);
        })
        .catch(err => {
          console.error("❌ Erro ao buscar eventos:", err);
          failureCallback(err);
        });
    },

    // 📍 AO CLICAR EM UM EVENTO
    eventClick: function (info) {
      const dados = info.event.extendedProps;
      const status = dados.status || 'Sem status';
      const operador = dados.operador || 'Não informado';
      const localizacao = dados.localizacao || 'Não informado';

      // Define o tipo baseado em tipo_evento E is_manual:
      // - Jobs (tipo='job') sempre são PEDIDO DE SERVIÇO
      // - Escalas (tipo='escala') com is_manual=0 são PEDIDO DE SERVIÇO (criadas automaticamente pela equipe)
      // - Escalas (tipo='escala') com is_manual=1 são ESCALA MANUAL (criadas manualmente pelo usuário)
      let tipo;
      if (dados.tipo === 'job') {
        tipo = '📋 PEDIDO DE SERVIÇO';
      } else if (dados.is_manual === 1) {
        tipo = '✋ ESCALA MANUAL';
      } else {
        tipo = '📋 PEDIDO DE SERVIÇO';  // Escala automática (da equipe)
      }

      // 📅 Usa datas reais do job (se houver) ou datas do evento (se for escala sem job)
      let dataInicio, dataFim;

      // Se tem data_inicio_real (jobs e escalas vinculadas a jobs), usa ela
      if (dados.data_inicio_real) {
        const dtInicio = new Date(dados.data_inicio_real + ' 00:00:00');
        const dtFim = new Date((dados.data_fim_real || dados.data_inicio_real) + ' 00:00:00');

        dataInicio = dtInicio.toLocaleDateString('pt-BR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        dataFim = dtFim.toLocaleDateString('pt-BR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
      } else {
        // Para escalas sem job (avulsas), usa a data do evento clicado
        dataInicio = info.event.start ? new Date(info.event.start).toLocaleDateString('pt-BR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }) : 'Não informado';
        dataFim = info.event.end ? new Date(new Date(info.event.end).getTime() - 86400000).toLocaleDateString('pt-BR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }) : dataInicio;
      }

      // Nome do serviço/evento (preferencialmente vindo do backend)
      let nomeServico = dados.servico_nome;

      if (!nomeServico) {
        nomeServico = info.event.title || '';

        // Remove o ícone inicial (📋/✋/📅)
        nomeServico = nomeServico.replace(/^[📋✋📅]\s*/, '');

        // Remove o nome do funcionário (parte antes do primeiro " - ")
        const primeiroDash = nomeServico.indexOf(' - ');
        if (primeiroDash !== -1) {
          nomeServico = nomeServico.substring(primeiroDash + 3);

          // Para escalas manuais, remove o tipo no final " - Tipo"
          if (dados.is_manual === 1) {
            const segundoDash = nomeServico.lastIndexOf(' - ');
            if (segundoDash !== -1) {
              nomeServico = nomeServico.substring(0, segundoDash);
            }
          }
        }
      }

      nomeServico = (nomeServico || '').trim() || 'Não informado';

      // Formata localização para não mostrar valores vazios
      let localFormatado = localizacao || '';
      localFormatado = localFormatado.replace(/^[,\s-]+|[,\s-]+$/g, '').replace(/,\s*,/g, ',').trim();
      if (!localFormatado || localFormatado === ',' || localFormatado === '-') {
        localFormatado = 'Não informado';
      }

      // Monta o conteúdo HTML do modal com layout melhorado
      const conteudo = `
        <div class="mb-3 p-3 rounded" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); border-left: 4px solid #6366f1;">
          <h5 class="mb-0 fw-bold" style="color: #4f46e5;">${tipo}</h5>
        </div>
        <table class="w-100" style="border-collapse: separate; border-spacing: 0 8px;">
          <tr>
            <td style="width: 100px; vertical-align: top; white-space: nowrap;">
              <span class="text-muted small">📝 Serviço</span>
            </td>
            <td><strong>${nomeServico}</strong></td>
          </tr>
          <tr>
            <td style="vertical-align: top; white-space: nowrap;">
              <span class="text-muted small">🎯 Status</span>
            </td>
            <td>${status}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; white-space: nowrap;">
              <span class="text-muted small">👤 Operador</span>
            </td>
            <td>${operador}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; white-space: nowrap;">
              <span class="text-muted small">📍 Local</span>
            </td>
            <td style="word-break: break-word;">${localFormatado}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; white-space: nowrap;">
              <span class="text-muted small">📅 Período</span>
            </td>
            <td>
              <div><strong>Início:</strong> ${dataInicio}</div>
              <div><strong>Fim:</strong> ${dataFim}</div>
            </td>
          </tr>
        </table>
      `;

      // Preenche e exibe o modal
      const modalElemento = document.getElementById('modalEventoConteudo');
      const modalContainer = document.getElementById('modalDetalhesEvento');
      const modalFooter = document.getElementById('modalEventoFooter');

      if (modalElemento && modalContainer) {
        // Se o modal existe, usa ele
        modalElemento.innerHTML = conteudo;

        // Monta o footer com botões
        let footerHTML = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>';

        // Se for escala manual, adiciona botão de deletar
        if (dados.is_manual === 1 && dados.tipo === 'escala') {
          // Extrai o ID real da escala do ID do evento (formato: "escala-123-2026-02-17" ou "123-2026-02-17")
          const eventoId = info.event.id;
          let escalaId = null;

          if (eventoId.startsWith('escala-')) {
            // Formato: "escala-123-2026-02-17" -> pegar "123"
            const partes = eventoId.replace('escala-', '').split('-');
            escalaId = partes[0];
          } else {
            // Formato: "123-2026-02-17" -> pegar "123"
            const partes = eventoId.split('-');
            escalaId = partes[0];
          }

          if (escalaId && !isNaN(escalaId)) {
            footerHTML = `<button type="button" class="btn btn-danger" onclick="deletarEscalaManual(${escalaId})">
              🗑️ Apagar Escala
            </button>` + footerHTML;
          }
        }

        if (modalFooter) {
          modalFooter.innerHTML = footerHTML;
        }

        const modal = new bootstrap.Modal(modalContainer);
        modal.show();
      } else {
        // Fallback: usa alert se o modal não existir (cache antigo)
        const mensagem = `${tipo}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n📝 Serviço: ${nomeServico}\n🎯 Status: ${status}\n👤 Operador: ${operador}\n📍 Local: ${localizacao}\n📅 Início: ${dataInicio}\n📅 Fim: ${dataFim}\n━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        alert(mensagem);
      }
    }
  });

  calendar.render();
  console.log("✅ FullCalendar (Feed) inicializado com sucesso!");
};

// Função para deletar escala manual
window.deletarEscalaManual = function (escalaId) {
  if (!confirm('Tem certeza que deseja apagar esta escala manual?\n\nO funcionário também será removido da equipe do evento.')) {
    return;
  }

  fetch(`${API_URL}/escalas/${escalaId}`, {
    method: 'DELETE'
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert('Erro ao deletar escala: ' + data.error);
        return;
      }

      // Fecha o modal
      const modalContainer = document.getElementById('modalDetalhesEvento');
      if (modalContainer) {
        const modal = bootstrap.Modal.getInstance(modalContainer);
        if (modal) modal.hide();
      }

      // Recarrega o calendário
      if (typeof recarregarCalendario === 'function') {
        recarregarCalendario();
      }

      alert('✅ Escala deletada com sucesso!');
    })
    .catch(err => {
      console.error('Erro ao deletar escala:', err);
      alert('Erro ao deletar escala: ' + err.message);
    });
};


// 2. FUNÇÃO QUE TROCA AS ABAS E CHAMA O CALENDÁRIO
window.toggleFuncView = function (modo) {
  const divLista = document.getElementById('container-lista');
  const divCalendario = document.getElementById('container-calendario');
  const btnLista = document.getElementById('btn-tab-lista');
  const btnCalendario = document.getElementById('btn-tab-calendario');

  if (modo === 'lista') {
    // MOSTRAR LISTA
    divLista.style.display = 'block';
    divCalendario.style.display = 'none';

    // Estilo dos botões (Lista Ativa)
    btnLista.className = 'btn-tab-dark'; // Escuro
    btnCalendario.className = 'btn btn-white border'; // Branco
  }
  else if (modo === 'calendario') {
    // MOSTRAR CALENDÁRIO
    divLista.style.display = 'none';
    divCalendario.style.display = 'block';

    // Estilo dos botões (Calendário Ativo)
    btnCalendario.className = 'btn-tab-dark'; // Escuro
    btnLista.className = 'btn btn-white border'; // Branco

    // INICIA O CALENDÁRIO COM UM PEQUENO DELAY 
    // (Necessário porque o FullCalendar precisa que a div esteja visível para calcular altura)
    setTimeout(() => {
      initCalendar();
      if (calendar) {
        calendar.updateSize();
        // Se tinha recarga pendente, executa agora
        if (window.calendarioPendenteRecarga) {
          window.calendarioPendenteRecarga = false;
          calendar.refetchEvents();
          console.log("✅ Recarga pendente executada ao exibir calendário");
        }
      }
    }, 50);
  }
};

// 3. ABRIR MODAL MANUAL (para clique no calendário)
window.abrirModalEscalaManual = async function (data) {
  const campoData = document.getElementById('escalaData');
  if (campoData) campoData.value = data;

  const select = document.getElementById('escalaFuncionarioManual');
  select.innerHTML = '<option>Carregando...</option>';

  try {
    // Carregar funcionários
    const resFuncionarios = await fetch(`${API_URL}/funcionarios/todos`);
    const lista = await resFuncionarios.json();

    select.innerHTML = '';
    lista.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.text = f.nome;
      select.appendChild(opt);
    });

    // Carregar jobs ativos para vincular
    const selectJob = document.getElementById('escalaJobManual');
    if (selectJob) {
      selectJob.innerHTML = '<option value="">Carregando jobs...</option>';

      const resJobs = await fetch(`${API_URL}/jobs/ativos`);
      const jobs = await resJobs.json();

      selectJob.innerHTML = '<option value="">Nenhum - Escala avulsa</option>';
      jobs.forEach(job => {
        const opt = document.createElement('option');
        opt.value = job.id;
        const dataFormatada = job.data_inicio ? formatarData(job.data_inicio) : '';
        opt.text = `#${job.numero_pedido || job.id} - ${job.descricao || 'Sem descrição'} (${dataFormatada})`;
        selectJob.appendChild(opt);
      });
    }

    const modalEl = document.getElementById('modalNovaEscalaManual');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
    alert("Erro ao carregar dados");
  }
};

// 4. SALVAR ESCALA MANUAL (do modal antigo - clique no calendário)
window.salvarEscalaManual = async function () {
  const funcionarioId = document.getElementById('escalaFuncionarioManual').value;
  const tipo = document.getElementById('escalaTipoManual').value;
  const jobId = document.getElementById('escalaJobManual')?.value || null;

  try {
    // NÃO adiciona à job_equipe - escala manual usa apenas a tabela escalas
    // Isso evita duplicação de eventos no calendário

    const dados = {
      data: document.getElementById('escalaData').value,
      funcionario_id: funcionarioId,
      tipo: tipo,
      obs: document.getElementById('escalaObsManual').value,
      job_id: jobId || null,
      is_manual: 1  // Marca como escala manual
    };

    await fetch(`${API_URL}/escalas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    alert("Escala salva!");

    // Fecha modal
    const el = document.getElementById('modalNovaEscalaManual');
    const modal = bootstrap.Modal.getInstance(el);
    if (modal) modal.hide();

    // Recarrega calendário de forma segura
    recarregarCalendario();
  } catch (err) {
    console.error("Erro ao salvar escala:", err);
    alert("Erro ao salvar: " + err);
  }
};

// 5. SALVAR NOVA ESCALA (do modal principal - botão Nova Escala)
window.salvarNovaEscala = async function () {
  const funcionarioId = document.getElementById('escalaFuncionario').value;
  const dataInicio = document.getElementById('escalaDataInicio').value;
  const dataFim = document.getElementById('escalaDataFim').value;
  const tipo = document.getElementById('escalaTipo').value;
  const obs = document.getElementById('escalaObs').value;
  const jobId = document.getElementById('escalaJob').value;

  // Validação
  if (!funcionarioId || !dataInicio || !dataFim || !tipo) {
    alert("Preencha todos os campos obrigatórios!");
    return;
  }

  try {
    // NÃO adiciona à job_equipe - escala manual usa apenas a tabela escalas
    // Isso evita duplicação de eventos no calendário (job_equipe expande para todas as datas do job)

    // Cria a escala com as datas selecionadas pelo usuário
    const dados = {
      funcionario_id: funcionarioId,
      data_inicio: dataInicio,
      data_fim: dataFim,
      tipo: tipo,
      obs: obs,
      job_id: jobId || null,
      is_manual: 1  // Marca como escala manual
    };

    console.log('📤 Enviando escala manual:', dados);

    const res = await fetch(`${API_URL}/escalas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Erro na resposta:', res.status, errorText);
      throw new Error(`Erro ${res.status}: ${errorText}`);
    }

    const resultado = await res.json();
    console.log('✅ Resposta do servidor:', resultado);
    alert("Escala salva com sucesso!");

    // Fecha modal
    const el = document.getElementById('modalNovaEscala');
    const modal = bootstrap.Modal.getInstance(el);
    if (modal) modal.hide();

    // Limpa formulário
    document.getElementById('formNovaEscala').reset();

    // Recarrega calendário de forma segura
    recarregarCalendario();

  } catch (err) {
    console.error("Erro ao salvar escala:", err);
    alert("Erro ao salvar: " + err);
  }
};

// 6. Carregar funcionários e jobs quando modal de escala abrir
document.addEventListener('DOMContentLoaded', function () {
  const modalEscala = document.getElementById('modalNovaEscala');
  if (modalEscala) {
    modalEscala.addEventListener('show.bs.modal', function () {
      // Carregar funcionários
      const select = document.getElementById('escalaFuncionario');
      select.innerHTML = '<option value="">Carregando...</option>';

      fetch(`${API_URL}/funcionarios/todos`)
        .then(r => r.json())
        .then(lista => {
          select.innerHTML = '<option value="">Selecione o funcionário...</option>';
          lista.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.text = f.nome + (f.cargo ? ` (${f.cargo})` : '');
            select.appendChild(opt);
          });
        })
        .catch(err => {
          console.error("Erro ao carregar funcionários:", err);
          select.innerHTML = '<option value="">Erro ao carregar</option>';
        });

      // Carregar jobs ativos (Agendado, Em Andamento, Confirmado)
      const selectJob = document.getElementById('escalaJob');
      selectJob.innerHTML = '<option value="">Carregando jobs...</option>';

      fetch(`${API_URL}/jobs/ativos`)
        .then(r => r.json())
        .then(jobs => {
          selectJob.innerHTML = '<option value="">Nenhum - Escala avulsa</option>';
          jobs.forEach(job => {
            const opt = document.createElement('option');
            opt.value = job.id;
            const dataFormatada = job.data_inicio ? formatarData(job.data_inicio) : '';
            opt.text = `#${job.numero_pedido || job.id} - ${job.descricao || 'Sem descrição'} (${dataFormatada})`;
            selectJob.appendChild(opt);
          });
          // NÃO preenche datas automaticamente - usuário escolhe manualmente
        })
        .catch(err => {
          console.error("Erro ao carregar jobs:", err);
          selectJob.innerHTML = '<option value="">Nenhum - Escala avulsa</option>';
        });

      // Define data início como hoje
      const hoje = new Date().toISOString().split('T')[0];
      document.getElementById('escalaDataInicio').value = hoje;
      document.getElementById('escalaDataFim').value = hoje;
    });
  }
});

window.recarregarCalendario = function () {
  console.log("🔄 Recarregando calendário...");

  if (calendar) {
    // Verifica se o container do calendário está visível
    const container = document.getElementById('container-calendario');
    const isVisible = container && container.style.display !== 'none' && container.offsetParent !== null;

    if (isVisible) {
      // Se estiver visível, recarrega imediatamente
      calendar.refetchEvents();
      // Aguarda um pouco e atualiza o tamanho para garantir renderização correta
      setTimeout(() => {
        if (calendar) {
          calendar.updateSize();
        }
      }, 100);
      console.log("✅ Eventos recarregados!");
    } else {
      // Se não estiver visível, marca para recarregar quando ficar visível
      window.calendarioPendenteRecarga = true;
      console.log("⏳ Calendário não visível, marcado para recarga posterior");
    }
  } else {
    console.warn("⚠️ Calendário não está inicializado ainda");
  }
};



// --- LÓGICA DE EQUIPE DO JOB ---
window.equipeDoJob = []; // Array temporário para guardar a equipe

// 1. Carregar Funcionários no Select da Equipe (Chame isso dentro de carregarOpcoesDoFormulario)
function carregarSelectEquipe(listaFuncionarios) {
  console.log('🟡 carregarSelectEquipe chamada com', listaFuncionarios?.length, 'funcionários');

  const select = document.getElementById('selectFuncionarioEquipe');

  // Se o elemento não existir no HTML, para a execução para não dar erro
  if (!select) {
    
    return;
  }

  select.innerHTML = '<option value="">-- Selecione o Técnico/Produtor --</option>';

  listaFuncionarios.forEach(f => {
    // AQUI ESTAVA O ERRO PROVÁVEL: Tem que ser f.nome e f.cargo
    // Se estiver undefined, usamos "Técnico" como padrão
    const nome = f.nome || "Sem Nome";
    const cargo = f.cargo || "Técnico";

    const option = document.createElement('option');
    option.value = f.id;
    option.textContent = nome; // Exibe o NOME do funcionário

    // Guardamos dados extras para usar na tabela visual depois
    option.setAttribute('data-nome', nome);
    option.setAttribute('data-cargo', cargo);

    select.appendChild(option);
  });

  console.log('🟡 Select populado com', select.options.length - 1, 'funcionários');
}
// 2. Adicionar Funcionário na Tabela Visual
window.adicionarFuncionarioEquipe = function () {
  

  const select = document.getElementById('selectFuncionarioEquipe');
  const inputFuncao = document.getElementById('inputFuncaoEquipe');

  console.log('🔵 Select encontrado:', select);
  console.log('🔵 Select value:', select?.value);

  const id = select.value;
  const funcao = inputFuncao?.value?.trim() || 'Técnico';

  if (!id) return alert("Selecione um funcionário!");

  // Evitar duplicados
  if (window.equipeDoJob.some(m => String(m.funcionario_id) === String(id))) {
    return alert("Este funcionário já está na equipe!");
  }

  const option = select.options[select.selectedIndex];
  // Usar o texto da opção se data-nome não estiver disponível
  const nome = option.getAttribute('data-nome') || option.textContent || 'Sem Nome';
  const cargo = option.getAttribute('data-cargo') || 'Técnico';

  console.log('🔵 Dados do funcionário:', { id, nome, cargo, funcao });

  // Adiciona ao array
  window.equipeDoJob.push({
    funcionario_id: id,
    nome: nome,
    cargo: cargo,
    funcao: funcao
  });

  console.log('🔵 Array equipeDoJob APÓS adicionar:', JSON.stringify(window.equipeDoJob, null, 2));
  console.log('🔵 Total de membros na equipe:', window.equipeDoJob.length);

  renderizarTabelaEquipe();

  // Limpa campos
  select.value = "";
  if (inputFuncao) inputFuncao.value = "Técnico";
};

// 3. Renderizar Tabela
function renderizarTabelaEquipe() {
  const tbody = document.getElementById('tabela-equipe-job');
  if (!tbody) return;

  tbody.innerHTML = "";

  window.equipeDoJob.forEach((membro, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
            <td>${membro.nome}</td>
            <td class="text-muted small">${membro.cargo}</td>
            <td><span class="badge bg-light text-dark border">${membro.funcao}</span></td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-link text-danger p-0" onclick="removerMembroEquipe(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

// 4. Remover Membro
window.removerMembroEquipe = function (index) {
  window.equipeDoJob.splice(index, 1);
  renderizarTabelaEquipe();
};





/* =============================================================
   FUNÇÃO PRINCIPAL: CARREGAR DETALHES E HISTÓRICO DO FUNCIONÁRIO
   ============================================================= */
window.verDetalhesFuncionario = async function (id) {
  const elSpinner = document.getElementById('loadingHistorico');
  const elContainerTabela = document.getElementById('tabelaHistoricoContainer');

  try {
    console.log(`🚀 Abrindo funcionário ID: ${id}`);

    // === ADICIONE ESTA LINHA AQUI ===
    window.idFuncionarioAtual = id;
    // Isso garante que sabemos para quem voltar depois
    // ================================

    // 1. Prepara Tela
    // 1. Prepara Tela - SWITCH PARA SEÇÃO CORRETA
    if (typeof switchView === 'function') {
      switchView('cadastro-funcionario');
    }

    // 2. Aguarda um pouco para o DOM ser atualizado
    await new Promise(resolve => setTimeout(resolve, 100));

    // 3. Clica na aba de histórico de forma mais robusta
    const historicoTab = document.getElementById('historico-tab');
    if (historicoTab) {
      
      // Usa Bootstrap Tab corretamente
      const tab = new bootstrap.Tab(historicoTab);
      tab.show();
    } else {
      console.warn('⚠️ Tab de histórico NÃO encontrada com ID historico-tab');
    }

    // 4. Trava o modo de leitura
    if (typeof toggleModoLeituraFuncionario === 'function') {
      toggleModoLeituraFuncionario(true);
    }

    // 2. Controla o Carregamento (Mostra Spinner, Esconde Tabela)
    if (elSpinner) elSpinner.classList.remove('d-none');
    if (elContainerTabela) {
      elContainerTabela.classList.add('d-none');
      elContainerTabela.innerHTML = ''; // Limpa dados antigos
    }

    // 3. Faz as Buscas
    const [resFunc, resHist] = await Promise.all([
      fetch(`${API_URL}/funcionarios/${id}`),
      fetch(`${API_URL}/funcionarios/${id}/historico`)
    ]);

    // 4. Preenche Cadastro
    if (resFunc.ok) {
      const funcData = await resFunc.json();
      const f = Array.isArray(funcData) ? funcData[0] : funcData;

      const setVal = (eid, val) => { const el = document.getElementById(eid); if (el) el.value = val || ''; }
      setVal('rhNome', f.nome);
      setVal('rhCpf', f.cpf);
      setVal('rhEmail', f.email);
      setVal('rhTelefone', f.telefone);
      setVal('rhCargo', f.cargo);
      setVal('rhDepartamento', f.departamento);
      setVal('rhStatus', f.status);
      setVal('rhCep', f.cep);
      setVal('rhLogradouro', f.logradouro);
      setVal('rhNumero', f.numero || f.numerocasa);
      setVal('rhBairro', f.bairro);
      setVal('rhCidade', f.cidade);
      setVal('rhUf', f.uf);
      setVal('rhObs', f.observacoes);
      if (f.data_admissao) setVal('rhAdmissao', f.data_admissao.split('T')[0]);
      if (f.data_demissa) setVal('rhDemissao', f.data_demissa.split('T')[0]);
    }

    // 5. Preenche Histórico
    let lista = [];
    if (resHist.ok) {
      lista = await resHist.json();
    } else {
      console.warn("Erro ao buscar histórico ou rota inexistente.");
    }

    // === NOVO: Salva no cache global para o calendário usar depois ===
    window.historicoCacheFuncionario = lista;

    // === CORREÇÃO: SÓ RESETA PARA LISTA SE NÃO ESTIVER VOLTANDO DE UM JOB ===
    // Se a gente veio do botão "Voltar", a outra função já arrumou a tela. Não mexemos.
    if (!window.retornandoDoJob) {
      const btnLista = document.getElementById('btnRadioLista');
      if (btnLista) btnLista.checked = true;

      // Garante que começa na lista (comportamento padrão ao abrir funcionário)
      if (typeof alternarModoHistoricoFunc === 'function') {
        alternarModoHistoricoFunc('lista');
      }
    }

    // Chama a função que desenha a tabela (Sempre desenha, por garantia)
    renderizarTabelaHistorico(lista);

  } catch (err) {
    console.error("Erro fatal:", err);
    alert("Erro ao carregar dados: " + err.message);
  } finally {
    // 6. FINALMENTE: ESCONDE SPINNER E MOSTRA TABELA
    if (elSpinner) elSpinner.classList.add('d-none');
    if (elContainerTabela) elContainerTabela.classList.remove('d-none');
  }
};

/* =============================================================
   FUNÇÃO AUXILIAR: DESENHAR A TABELA HTML DO HISTÓRICO
   ============================================================= */
// Função Auxiliar para Desenhar a Tabela
function renderizarTabelaHistorico(lista) {
  const container = document.getElementById('tabelaHistoricoContainer');
  if (!container) return;

  if (!lista || lista.length === 0) {
    container.innerHTML = `
            <div class="text-center py-5 text-muted border rounded bg-light">
                <i class="bi bi-clipboard-x fs-1 mb-2"></i>
                <h6>Nenhum histórico encontrado</h6>
            </div>`;
    return;
  }

  // Usa UTC para evitar problema de timezone (dia 14 virando dia 13)
  const fmtData = d => d ? formatarData(d) : '-';

  // HTML da tabela
  let html = `
        <div class="table-responsive border rounded" style="max-height: 400px; overflow-y: auto;">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light small text-muted sticky-top">
                    <tr>
                        <th class="ps-3">Data</th>
                        <th>Job / Evento</th>
                        <th>Função</th>
                        <th>Status</th>
                        <th class="text-end pe-3">Ação</th> </tr>
                </thead>
                <tbody>`;

  lista.forEach(item => {
    // Badge de status
    let badgeClass = 'bg-secondary';
    if (item.status === 'Agendado') badgeClass = 'bg-primary';
    if (item.status === 'Em Andamento') badgeClass = 'bg-success';
    if (item.status === 'Confirmado') badgeClass = 'bg-warning text-dark';
    if (item.status === 'Cancelado') badgeClass = 'bg-danger';

    // Para escalas vinculadas a jobs, usa 'job' como tipo para abrir o pedido diretamente
    // O id já é o job_id devido ao COALESCE na query
    const tipoRegistro = item.tipo_registro || 'job';
    let eventoId;

    // Se for escala com job_id vinculado, trata como job para abrir direto
    if (tipoRegistro === 'escala' && item.job_id) {
      eventoId = `job-${item.job_id}`;
    } else {
      eventoId = `${tipoRegistro}-${item.id}`;
    }

    // Botão de excluir só aparece para escalas avulsas (sem job_id)
    const isEscalaAvulsa = tipoRegistro === 'escala' && !item.job_id;
    const btnExcluir = isEscalaAvulsa
      ? `<button class="btn btn-sm btn-outline-danger ms-1" 
                onclick="excluirEscalaAvulsa(${item.id})" title="Excluir escala avulsa">
            <i class="bi bi-trash"></i>
         </button>`
      : '';

    html += `
            <tr>
                <td class="ps-3 fw-bold">${fmtData(item.data_inicio)}</td>
                <td>
                    <span class="fw-bold text-dark">#${item.id} - ${item.descricao || 'Sem descrição'}</span>
                </td>
                <td><span class="badge bg-light text-dark border">${item.funcao || 'Técnico'}</span></td>
                <td><span class="badge ${badgeClass}">${item.status}</span></td>
                
                <td class="text-end pe-3">
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="abrirJobVisualizacaoPeloHistorico('${eventoId}')">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                    ${btnExcluir}
                </td>
            </tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

/* =============================================================
   FUNÇÃO AUXILIAR: TRAVAR/DESTRAVAR FORMULÁRIO
   ============================================================= */
function toggleModoLeituraFuncionario(ativo) {
  const inputs = document.querySelectorAll('#formFuncionarioFull input, #formFuncionarioFull select, #formFuncionarioFull textarea');
  const btnSalvar = document.getElementById('btnSalvarFuncionario');
  const titulo = document.getElementById('tituloPaginaFuncionario');

  // Trava ou Destrava os campos
  inputs.forEach(input => input.disabled = ativo);

  // Esconde ou Mostra o botão Salvar
  if (btnSalvar) btnSalvar.style.display = ativo ? 'none' : 'block';

  // Muda o título da página
  if (titulo) titulo.innerText = ativo ? "Detalhes do Funcionário" : "Editar Funcionário";
}


// =============================================================
//  NOVA LÓGICA: HISTÓRICO HÍBRIDO (LISTA + CALENDÁRIO)
// =============================================================

// Variável global para guardar o calendário do funcionário e não criar duplicados
let calendarFuncionarioInstance = null;
let historicoCacheFuncionario = []; // Para não precisar buscar no banco ao trocar de aba

// 1. Função para alternar visualização
window.alternarModoHistoricoFunc = function (modo) {
  // 1. SALVA O ESTADO ATUAL (ADICIONE ESTA LINHA)
  window.modoHistoricoAtual = modo;

  // ... (o resto do código continua igual)
  const divLista = document.getElementById('containerHistoricoLista');
  const divCal = document.getElementById('containerHistoricoCalendario');

  if (modo === 'lista') {
    divLista.classList.remove('d-none');
    divCal.classList.add('d-none');
  } else {
    divLista.classList.add('d-none');
    divCal.classList.remove('d-none');
    // Renderiza o calendário...
    if (window.historicoCacheFuncionario) {
      setTimeout(() => {
        if (typeof renderizarCalendarioFuncionario === 'function') {
          renderizarCalendarioFuncionario(window.historicoCacheFuncionario);
        }
      }, 50);
    }
  }
};

// 2. Renderizador do Calendário (Cópia simplificada do FullCalendar)
function renderizarCalendarioFuncionario(listaJobs) {
  const calendarEl = document.getElementById('calendarFuncionario');

  // Se já existe, apenas atualiza e ajusta tamanho
  if (calendarFuncionarioInstance) {
    calendarFuncionarioInstance.destroy(); // Destroi para recriar limpo com novos eventos
  }

  // Função auxiliar para extrair data YYYY-MM-DD sem problema de timezone
  const extrairDataStr = (data) => {
    if (!data) return null;

    // Se já é string no formato YYYY-MM-DD, usa direto
    if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return data;
    }

    // Se é string com T (ISO), extrai só a parte da data
    if (typeof data === 'string' && data.includes('T')) {
      return data.split('T')[0];
    }

    // Se é objeto Date, converte para string UTC
    const d = new Date(data);
    return d.toISOString().split('T')[0];
  };

  // Filtra e formata os eventos para o calendário
  const eventos = listaJobs.map(job => {
    // Define cor baseada no status
    let cor = '#6c757d'; // Cinza
    if (job.status === 'Agendado') cor = '#0d6efd'; // Azul
    if (job.status === 'Em Andamento') cor = '#198754'; // Verde
    if (job.status === 'Confirmado') cor = '#ffc107'; // Amarelo
    if (job.status === 'Cancelado') cor = '#dc3545'; // Vermelho
    if (job.status === 'Escala') cor = '#3b82f6'; // Azul para escalas avulsas

    // Extrai datas como strings YYYY-MM-DD
    const dataInicioStr = extrairDataStr(job.data_inicio);
    const dataFimStr = extrairDataStr(job.data_fim) || dataInicioStr;

    // Função para combinar data e hora
    const combinarDataHora = (dataStr, hora) => {
      if (!dataStr) return null;
      if (!hora) return dataStr; // Se não tem hora, retorna só a data (all-day)

      // Pega só os primeiros 5 caracteres da hora (HH:MM)
      const horaFormatada = hora.substring(0, 5);
      return `${dataStr}T${horaFormatada}:00`; // Formato ISO com segundos
    };

    // Calcula data/hora início
    const dataHoraInicio = combinarDataHora(dataInicioStr, job.hora_inicio_evento);

    // Calcula data/hora fim
    let dataHoraFim = null;
    if (dataFimStr) {
      if (job.hora_fim_evento) {
        dataHoraFim = combinarDataHora(dataFimStr, job.hora_fim_evento);
      } else if (job.hora_inicio_evento) {
        dataHoraFim = combinarDataHora(dataFimStr, job.hora_inicio_evento);
      } else {
        // Para eventos all-day, FullCalendar precisa de data_fim + 1 dia
        const [ano, mes, dia] = dataFimStr.split('-').map(Number);
        const fimDate = new Date(ano, mes - 1, dia + 1);
        const y = fimDate.getFullYear();
        const m = String(fimDate.getMonth() + 1).padStart(2, '0');
        const d = String(fimDate.getDate()).padStart(2, '0');
        dataHoraFim = `${y}-${m}-${d}`;
      }
    }

    // Determina se é evento de dia inteiro
    const isAllDay = !job.hora_inicio_evento && !job.hora_fim_evento;

    // Monta o título baseado no tipo de registro e campo is_manual
    console.log(`🔍 Job #${job.id}:`, {
      tipo_registro: job.tipo_registro,
      job_id: job.job_id,
      is_manual: job.is_manual,
      descricao: job.descricao
    });

    let icone = '📋'; // Padrão para jobs

    if (job.tipo_registro === 'escala') {
      if (!job.job_id) {
        // Escala standalone (sem job associado)
        icone = '📅';
        
      } else if (job.is_manual === 1) {
        // Escala manual criada pelo usuário
        icone = '✋';
        
      } else {
        // Escala automática da equipe
        icone = '📋';
        
      }
    } else {
      
    }

    const titulo = `📋 #${job.id} - ${job.descricao || 'Sem descrição'}`;

    console.log('  → Título final:', titulo);

    return {
      id: `${job.tipo_registro || 'job'}-${job.id}`,
      title: titulo,
      start: dataHoraInicio,
      end: dataHoraFim,
      allDay: isAllDay,
      backgroundColor: cor,
      borderColor: cor,
      extendedProps: {
        status: job.status,
        funcao: job.funcao,
        tipo_registro: job.tipo_registro || 'job',
        is_manual: job.is_manual,
        job_id: job.job_id,
        descricao: job.descricao,
        data_inicio: dataInicioStr,
        data_fim: dataFimStr,
        operador: job.operador_nome || 'Não informado',
        localizacao: job.localizacao || 'Não informado'
      }
    };
  });

  calendarFuncionarioInstance = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'pt-br',

    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,listYear'
    },

    buttonText: {
      today: 'Hoje',
      month: 'Mês',
      year: 'Lista'
    },

    height: 'auto',

    navLinks: true,
    editable: false,
    dayMaxEvents: 3,
    events: eventos,

    // AÇÃO AO CLICAR NO CALENDÁRIO DO FUNCIONÁRIO
    eventClick: function (info) {
      const dados = info.event.extendedProps;
      const status = dados.status || 'Sem status';
      const operador = dados.operador || 'Não informado';
      const localizacao = dados.localizacao || 'Não informado';

      // Define o tipo baseado no registro
      let tipo;
      if (dados.tipo_registro === 'escala') {
        tipo = dados.is_manual === 1 ? '✋ ESCALA MANUAL' : '📋 PEDIDO DE SERVIÇO';
      } else {
        tipo = '📋 PEDIDO DE SERVIÇO';
      }

      // Nome do serviço
      const nomeServico = dados.descricao || 'Não informado';

      // Formata localização para não mostrar valores vazios
      let localFormatado = localizacao || '';
      localFormatado = localFormatado.replace(/^[,\s-]+|[,\s-]+$/g, '').replace(/,\s*,/g, ',').trim();
      if (!localFormatado || localFormatado === ',' || localFormatado === '-') {
        localFormatado = 'Não informado';
      }

      // Datas
      const formatarData = (dataStr) => {
        if (!dataStr) return 'Não informado';
        const [ano, mes, dia] = dataStr.split('-').map(Number);
        const d = new Date(ano, mes - 1, dia);
        return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      };

      const dataInicio = formatarData(dados.data_inicio);
      const dataFim = formatarData(dados.data_fim);

      // Monta o conteúdo HTML do modal igual ao calendário principal
      const conteudo = `
        <div class="mb-3 p-3 rounded" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); border-left: 4px solid #6366f1;">
          <h5 class="mb-0 fw-bold" style="color: #4f46e5;">${tipo}</h5>
        </div>
        <table class="w-100" style="border-collapse: separate; border-spacing: 0 8px;">
          <tr>
            <td style="width: 100px; vertical-align: top; white-space: nowrap;">
              <span class="text-muted small">📝 Serviço</span>
            </td>
            <td><strong>${nomeServico}</strong></td>
          </tr>
          <tr>
            <td style="vertical-align: top; white-space: nowrap;">
              <span class="text-muted small">🎯 Status</span>
            </td>
            <td>${status}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; white-space: nowrap;">
              <span class="text-muted small">👤 Operador</span>
            </td>
            <td>${operador}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; white-space: nowrap;">
              <span class="text-muted small">📍 Local</span>
            </td>
            <td style="word-break: break-word;">${localFormatado}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; white-space: nowrap;">
              <span class="text-muted small">📅 Período</span>
            </td>
            <td>
              <div><strong>Início:</strong> ${dataInicio}</div>
              <div><strong>Fim:</strong> ${dataFim}</div>
            </td>
          </tr>
        </table>
      `;

      // Preenche e exibe o modal
      const modalElemento = document.getElementById('modalEventoConteudo');
      const modalContainer = document.getElementById('modalDetalhesEvento');
      const modalFooter = document.getElementById('modalEventoFooter');

      if (modalElemento && modalContainer) {
        modalElemento.innerHTML = conteudo;

        // Monta o footer com botões
        let footerHTML = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>';

        // Se for escala manual, adiciona botão de deletar
        if (dados.is_manual === 1 && dados.tipo_registro === 'escala') {
          const eventoId = info.event.id;
          let escalaId = null;

          if (eventoId.startsWith('escala-')) {
            const partes = eventoId.replace('escala-', '').split('-');
            escalaId = partes[0];
          } else {
            const partes = eventoId.split('-');
            escalaId = partes[0];
          }

          if (escalaId && !isNaN(escalaId)) {
            footerHTML = `<button type="button" class="btn btn-danger" onclick="deletarEscalaManualFuncionario(${escalaId})">
              🗑️ Apagar Escala
            </button>` + footerHTML;
          }
        }

        if (modalFooter) {
          modalFooter.innerHTML = footerHTML;
        }

        const modal = new bootstrap.Modal(modalContainer);
        modal.show();
      } else {
        // Fallback para comportamento antigo
        abrirJobVisualizacaoPeloHistorico(info.event.id);
      }
    }
  });

  calendarFuncionarioInstance.render();
}

// Função para deletar escala manual do calendário do funcionário
window.deletarEscalaManualFuncionario = function (escalaId) {
  if (!confirm('Tem certeza que deseja apagar esta escala manual?\n\nO funcionário também será removido da equipe do evento.')) {
    return;
  }

  fetch(`${API_URL}/escalas/${escalaId}`, {
    method: 'DELETE'
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert('Erro ao deletar escala: ' + data.error);
        return;
      }

      // Fecha o modal
      const modalContainer = document.getElementById('modalDetalhesEvento');
      if (modalContainer) {
        const modal = bootstrap.Modal.getInstance(modalContainer);
        if (modal) modal.hide();
      }

      // Recarrega o histórico do funcionário
      const idFuncionario = window.idClienteEdicao || window.idFuncionarioAtual;
      if (idFuncionario && typeof carregarHistoricoJobs === 'function') {
        carregarHistoricoJobs(idFuncionario);
      }

      alert('✅ Escala deletada com sucesso!');
    })
    .catch(err => {
      console.error('Erro ao deletar escala:', err);
      alert('Erro ao deletar escala: ' + err.message);
    });
};

window.abrirJobVisualizacaoPeloHistorico = function (eventoId) {
  // Converte para string caso seja número
  const eventoIdStr = String(eventoId);

  // Verifica se o ID veio no formato "tipo-id" (do calendário) ou apenas número (da tabela)
  let tipoRegistro = 'job'; // Padrão é job
  let idNumerico = eventoIdStr;

  // Se contém hífen e começa com 'escala' ou 'job', extrai o tipo
  if (eventoIdStr.includes('-') && (eventoIdStr.startsWith('escala-') || eventoIdStr.startsWith('job-'))) {
    const partes = eventoIdStr.split('-');
    tipoRegistro = partes[0]; // 'escala' ou 'job'
    idNumerico = partes.slice(1).join('-'); // Pega o resto
  }

  // Variável para guardar o ID do job a ser aberto
  let jobId = idNumerico;

  // Se for escala manual, busca o job_id vinculado à escala
  if (tipoRegistro === 'escala') {
    // Busca a escala no cache do histórico
    const escala = window.historicoCacheFuncionario?.find(e =>
      e.tipo_registro === 'escala' && String(e.id) === String(idNumerico)
    );

    if (escala && escala.job_id) {
      // Pega o job_id da escala para abrir o pedido vinculado
      jobId = escala.job_id;
    } else if (escala) {
      // Se não tem job_id vinculado, mostra mensagem
      alert('Esta escala não está vinculada a nenhum pedido.');
      return;
    } else {
      alert('Escala não encontrada.');
      return;
    }
  }

  // 1. Identifica qual funcionário estamos editando
  const idFuncionario = window.idClienteEdicao || window.idFuncionarioAtual;

  // 2. Configura o Estado Global (COM A CORREÇÃO DO MODO)
  window.jobViewState = {
    jobId: jobId,
    mode: 'view',
    origin: 'historico_funcionario',
    returnId: idFuncionario,
    // === SALVA O MODO AQUI (Lista ou Calendario) ===
    savedViewMode: window.modoHistoricoAtual || 'lista'
  };

  console.log("Navegando via Histórico. Modo salvo:", window.jobViewState.savedViewMode);

  // 3. Abre os detalhes do job
  window.abrirDetalhesJob(jobId);

  // 4. Força o botão de voltar a usar nossa lógica
  // Tenta pegar o botão pelo ID ou pela classe
  const btnVoltar = document.getElementById('btnVoltarJob') || document.querySelector('#view-novo-job .btn-light') || document.querySelector('.btn-voltar-job');

  if (btnVoltar) {
    // Remove eventos antigos (cloneNode limpa listeners)
    const novoBtn = btnVoltar.cloneNode(true);
    btnVoltar.parentNode.replaceChild(novoBtn, btnVoltar);

    novoBtn.onclick = function (e) {
      e.preventDefault();
      processarVoltarDoJob();
    }
  }
}


// Função para excluir escala avulsa (sem job_id vinculado)
window.excluirEscalaAvulsa = async function (escalaId) {
  if (!confirm('Tem certeza que deseja excluir esta escala avulsa? Esta ação não pode ser desfeita.')) {
    return;
  }

  try {
    const response = await fetch(`/escalas/${escalaId}`, { method: 'DELETE' });
    const data = await response.json();

    if (response.ok) {
      alert('Escala excluída com sucesso!');

      // Recarrega o histórico do funcionário atual
      const idFuncionario = window.idClienteEdicao || window.idFuncionarioAtual;
      if (idFuncionario) {
        carregarHistoricoJobsFuncionario(idFuncionario);
      }

      // Também atualiza o calendário se existir
      if (typeof recarregarCalendario === 'function') {
        recarregarCalendario();
      }
    } else {
      alert('Erro ao excluir escala: ' + (data.error || 'Erro desconhecido'));
    }
  } catch (error) {
    console.error('Erro ao excluir escala:', error);
    alert('Erro ao excluir escala: ' + error.message);
  }
}


window.processarVoltarDoJob = function () {
  console.log("Processando voltar...", window.jobViewState);

  // 1. Fecha Modal do Job
  const modalElement = document.getElementById('modalJob') || document.getElementById('modalCadastroJob');
  if (modalElement) {
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) modalInstance.hide();
    else { const btnClose = modalElement.querySelector('[data-bs-dismiss="modal"]'); if (btnClose) btnClose.click(); }
  }

  // 2. Recupera Estado
  const state = window.jobViewState || {};
  const modoSalvo = state.savedViewMode || 'lista';

  if (state.origin === 'historico_funcionario' && state.returnId) {

    // === AQUI ESTÁ O TRUQUE PARA NÃO PULAR ===
    window.retornandoDoJob = true; // Avisa a outra função para não resetar nada

    switchView('cadastro-funcionario');

    // PREPARA O VISUAL IMEDIATAMENTE (Sem esperar o banco de dados)
    if (modoSalvo === 'calendario') {
      document.getElementById('containerHistoricoLista').classList.add('d-none');
      document.getElementById('containerHistoricoCalendario').classList.remove('d-none');
      const radioCal = document.getElementById('btnRadioCal');
      if (radioCal) radioCal.checked = true;
    } else {
      document.getElementById('containerHistoricoLista').classList.remove('d-none');
      document.getElementById('containerHistoricoCalendario').classList.add('d-none');
      const radioLista = document.getElementById('btnRadioLista');
      if (radioLista) radioLista.checked = true;
    }

    // Agora carrega os dados em segundo plano
    verDetalhesFuncionario(state.returnId).then(() => {

      // Se for calendário, renderiza os eventos agora que os dados chegaram
      if (modoSalvo === 'calendario') {
        setTimeout(() => {
          // Usa os dados que acabaram de chegar no cache
          if (window.historicoCacheFuncionario) {
            renderizarCalendarioFuncionario(window.historicoCacheFuncionario);
          }
        }, 50);
      }

      // Abaixa a bandeira para o próximo uso normal
      window.retornandoDoJob = false;

      // Garante que a aba está ativa
      const abaHist = document.querySelector('button[data-bs-target="#tab-historico-func"]');
      if (abaHist) bootstrap.Tab.getOrCreateInstance(abaHist).show();
    });

  } else if (state.origin === 'client_history' && state.returnId) {
    abrirPerfilCliente(state.returnId);
    setTimeout(() => {
      const aba = document.querySelector('button[data-bs-target="#aba-pedidos"]');
      if (aba) bootstrap.Tab.getOrCreateInstance(aba).show();
    }, 200);
  } else {
    switchView('contratos');
    carregarGestaoContratos();
  }

  // 3. Limpa
  window.jobViewState = {};
};



/* =============================================================
   CONTROLE DE VISIBILIDADE DOS VALORES (OLHO)
   Similar aos apps de banco para esconder saldos
   ============================================================= */

window.toggleHideValues = function () {
  const body = document.body;
  const icon = document.getElementById('iconHideValues');
  const isHidden = body.classList.toggle('hide-values');

  // Atualiza o ícone
  if (icon) {
    if (isHidden) {
      icon.className = 'bi bi-eye-slash-fill fs-5 text-secondary';
      icon.title = 'Mostrar valores';
    } else {
      icon.className = 'bi bi-eye-fill fs-5 text-secondary';
      icon.title = 'Esconder valores';
    }
  }

  // Salva preferência
  localStorage.setItem('hideValuesPreference', isHidden ? 'hidden' : 'visible');

  console.log(`👁️ Valores ${isHidden ? 'escondidos' : 'visíveis'}`);
}

// Carregar preferência de valores escondidos ao iniciar
function carregarPreferenciaValores() {
  const preferencia = localStorage.getItem('hideValuesPreference');
  const body = document.body;
  const icon = document.getElementById('iconHideValues');

  if (preferencia === 'hidden') {
    body.classList.add('hide-values');
    if (icon) {
      icon.className = 'bi bi-eye-slash-fill fs-5 text-secondary';
    }
  }
}

// Inicializa quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', carregarPreferenciaValores);


/* =============================================================
   CONTROLE DE TEMA (LIGHT / DARK MODE) - VERSÃO ÍCONE
   ============================================================= */

window.toggleDarkMode = function () {
  const html = document.documentElement;
  const icon = document.getElementById('iconTheme');
  const temaAtual = html.getAttribute('data-bs-theme');

  if (temaAtual === 'dark') {
    // MUDAR PARA LIGHT
    html.setAttribute('data-bs-theme', 'light');
    localStorage.setItem('themePreference', 'light');

    // Ícone vira Lua (para sugerir modo escuro)
    if (icon) {
      icon.className = 'bi bi-moon-stars-fill fs-5 text-secondary';
    }
  } else {
    // MUDAR PARA DARK
    html.setAttribute('data-bs-theme', 'dark');
    localStorage.setItem('themePreference', 'dark');

    // Ícone vira Sol (para sugerir modo claro)
    if (icon) {
      icon.className = 'bi bi-sun-fill fs-5 text-white'; // Sol branco fica melhor no escuro
    }
  }
}

// Carregar ao iniciar
function carregarTemaSalvo() {
  const temaSalvo = localStorage.getItem('themePreference');
  const icon = document.getElementById('iconTheme');
  const html = document.documentElement;

  if (temaSalvo === 'dark') {
    html.setAttribute('data-bs-theme', 'dark');
    if (icon) icon.className = 'bi bi-sun-fill fs-5 text-white';
  } else {
    html.setAttribute('data-bs-theme', 'light');
    if (icon) icon.className = 'bi bi-moon-stars-fill fs-5 text-secondary';
  }
}

carregarTemaSalvo();


/* =============================================================
   SISTEMA DE CONTROLE DE ACESSO E PERMISSÕES
   ============================================================= */

// Variável global para armazenar permissões do usuário logado
window.usuarioLogado = null;
window.permissoesUsuario = null;

/**
 * Carrega a lista de funcionários com permissões para a aba Sistema
 */
async function carregarControleAcesso() {
  const tbody = document.getElementById('listaControleAcesso');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted py-4">
        <i class="bi bi-arrow-clockwise spin me-2"></i>Carregando funcionários...
      </td>
    </tr>
  `;

  try {
    const response = await fetch(`${API_URL}/permissoes`);
    if (!response.ok) throw new Error('Erro ao buscar permissões');

    const funcionarios = await response.json();

    if (funcionarios.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted py-4">
            Nenhum funcionário cadastrado
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = funcionarios.map(f => {
      const iniciais = (f.nome || '??').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const statusClass = f.status === 'Ativo' ? 'bg-success' : f.status === 'Férias' ? 'bg-warning' : 'bg-secondary';
      const temAcesso = f.acesso_sistema || f.login_email;
      const isMaster = f.is_master;

      return `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-2">
              <div class="avatar-mini" style="width:35px;height:35px;background:${isMaster ? '#ffc107' : '#0d6efd'};color:#fff;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:0.75rem;font-weight:bold;">
                ${getAvatarUrl(f) ? `<img src="${getAvatarUrl(f)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : iniciais}
              </div>
              <div>
                <strong>${f.nome}</strong>
                ${isMaster ? '<span class="badge bg-warning text-dark ms-1" title="Usuário Master"><i class="bi bi-crown"></i></span>' : ''}
                ${f.login_email ? `<br><small class="text-muted">${f.login_email}</small>` : ''}
              </div>
            </div>
          </td>
          <td>${f.cargo || '-'}</td>
          <td><span class="badge ${statusClass}">${f.status || 'Ativo'}</span></td>
          <td class="text-center">
            <div class="form-check form-switch d-flex justify-content-center">
              <input class="form-check-input" type="checkbox" 
                     ${temAcesso ? 'checked' : ''} 
                     onchange="toggleAcessoSistema(${f.id}, this.checked)"
                     style="width: 2.5em; height: 1.25em;">
            </div>
          </td>
          <td class="text-center">
            <button class="btn btn-outline-primary btn-sm" onclick="abrirModalPermissoes(${f.id})" title="Configurar Permissões">
              <i class="bi bi-shield-lock"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Erro ao carregar controle de acesso:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger py-4">
          <i class="bi bi-exclamation-triangle me-2"></i>Erro ao carregar. 
          <a href="#" onclick="carregarControleAcesso()">Tentar novamente</a>
        </td>
      </tr>
    `;
  }
}

/**
 * Toggle rápido de acesso ao sistema
 */
window.toggleAcessoSistema = async function (funcionarioId, temAcesso) {
  try {
    const response = await fetch(`${API_URL}/permissoes/${funcionarioId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acesso_sistema: temAcesso })
    });

    if (!response.ok) throw new Error('Erro ao atualizar');

    console.log(`✅ Acesso do funcionário ${funcionarioId} ${temAcesso ? 'ativado' : 'desativado'}`);

    // Se ativou, abre modal para configurar detalhes
    if (temAcesso) {
      abrirModalPermissoes(funcionarioId);
    }

  } catch (error) {
    console.error('Erro ao toggle acesso:', error);
    alert('❌ Erro ao atualizar acesso: ' + error.message);
    carregarControleAcesso(); // Recarrega para reverter
  }
};

/**
 * Abre modal de configuração de permissões
 */
window.abrirModalPermissoes = async function (funcionarioId) {
  const modal = new bootstrap.Modal(document.getElementById('modalPermissoesFuncionario'));

  // Limpa dados anteriores
  document.getElementById('permFuncionarioId').value = funcionarioId;
  document.getElementById('permFuncionarioEmail').value = '';
  document.getElementById('permFuncionarioSenha').value = '';
  document.getElementById('permIsMaster').checked = false;

  try {
    const response = await fetch(`${API_URL}/permissoes/${funcionarioId}`);
    if (!response.ok) throw new Error('Erro ao buscar dados');

    const dados = await response.json();

    // Preenche informações básicas
    const iniciais = (dados.nome || '??').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('permFuncionarioAvatar').innerHTML = getAvatarUrl(dados)
      ? `<img src="${getAvatarUrl(dados)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
      : iniciais;
    document.getElementById('permFuncionarioNome').textContent = dados.nome || 'Nome não informado';
    document.getElementById('permFuncionarioCargo').textContent = dados.cargo || 'Cargo não informado';

    // Preenche email de login
    document.getElementById('permFuncionarioEmail').value = dados.login_email || dados.email || '';

    // Preenche permissões
    document.getElementById('permIsMaster').checked = dados.is_master == 1;
    document.getElementById('permDashboard').checked = dados.acesso_dashboard == 1;
    document.getElementById('permClientes').checked = dados.acesso_clientes == 1;
    document.getElementById('permFuncionarios').checked = dados.acesso_funcionarios == 1;
    document.getElementById('permContratos').checked = dados.acesso_contratos == 1;
    document.getElementById('permEstoque').checked = dados.acesso_estoque == 1;
    document.getElementById('permFinanceiro').checked = dados.acesso_financeiro == 1;
    document.getElementById('permConfiguracoes').checked = dados.acesso_configuracoes == 1;

    // Se é master, esconde card de permissões específicas
    toggleCardPermissoes(dados.is_master == 1);

    modal.show();

  } catch (error) {
    console.error('Erro ao abrir modal:', error);
    alert('❌ Erro ao carregar dados do funcionário');
  }
};

/**
 * Mostra/esconde card de permissões baseado em is_master
 */
function toggleCardPermissoes(isMaster) {
  const card = document.getElementById('cardPermissoes');
  if (card) {
    card.style.opacity = isMaster ? '0.5' : '1';
    card.style.pointerEvents = isMaster ? 'none' : 'auto';
  }
}

// Event listener para checkbox is_master
document.addEventListener('DOMContentLoaded', () => {
  const checkMaster = document.getElementById('permIsMaster');
  if (checkMaster) {
    checkMaster.addEventListener('change', (e) => {
      toggleCardPermissoes(e.target.checked);
    });
  }
});

/**
 * Salva permissões do funcionário
 */
window.salvarPermissoesFuncionario = async function () {
  const funcionarioId = document.getElementById('permFuncionarioId').value;

  const dados = {
    acesso_sistema: true,
    email: document.getElementById('permFuncionarioEmail').value,
    senha: document.getElementById('permFuncionarioSenha').value,
    is_master: document.getElementById('permIsMaster').checked,
    acesso_dashboard: document.getElementById('permDashboard').checked,
    acesso_clientes: document.getElementById('permClientes').checked,
    acesso_funcionarios: document.getElementById('permFuncionarios').checked,
    acesso_contratos: document.getElementById('permContratos').checked,
    acesso_estoque: document.getElementById('permEstoque').checked,
    acesso_financeiro: document.getElementById('permFinanceiro').checked,
    acesso_configuracoes: document.getElementById('permConfiguracoes').checked
  };

  if (!dados.email) {
    alert('⚠️ O email de login é obrigatório');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/permissoes/${funcionarioId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Erro ao salvar');
    }

    alert('✅ Permissões salvas com sucesso!');

    // Fecha modal e recarrega lista
    bootstrap.Modal.getInstance(document.getElementById('modalPermissoesFuncionario')).hide();
    carregarControleAcesso();

  } catch (error) {
    console.error('Erro ao salvar permissões:', error);
    alert('❌ Erro: ' + error.message);
  }
};

/**
 * Gera senha temporária
 */
window.gerarSenhaTemporaria = function () {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let senha = '';
  for (let i = 0; i < 8; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  document.getElementById('permFuncionarioSenha').value = senha;
  document.getElementById('permFuncionarioSenha').type = 'text';

  setTimeout(() => {
    document.getElementById('permFuncionarioSenha').type = 'password';
  }, 3000);
};

/**
 * Gera senha temporária no modal (alias)
 */
window.gerarSenhaTemporariaModal = function () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let senha = '';
  for (let i = 0; i < 8; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const input = document.getElementById('permFuncionarioSenha');
  input.value = senha;
  input.type = 'text'; // Mostra a senha gerada

  // Atualiza ícone
  const icon = document.getElementById('iconToggleSenha');
  if (icon) icon.className = 'bi bi-eye-slash';
};

/**
 * Alterna visibilidade da senha no modal
 */
window.toggleSenhaVisivel = function () {
  const input = document.getElementById('permFuncionarioSenha');
  const icon = document.getElementById('iconToggleSenha');

  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.className = 'bi bi-eye-slash';
  } else {
    input.type = 'password';
    if (icon) icon.className = 'bi bi-eye';
  }
};

/**
 * Reseta senha do funcionário
 */
window.resetarSenhaFuncionario = async function () {
  const funcionarioId = document.getElementById('permFuncionarioId').value;
  const nome = document.getElementById('permFuncionarioNome').textContent;

  if (!confirm(`Resetar senha de ${nome}? Uma nova senha temporária será gerada.`)) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/usuarios/${funcionarioId}/resetar-senha`, {
      method: 'POST'
    });

    if (!response.ok) throw new Error('Erro ao resetar');

    const result = await response.json();

    alert(`✅ Senha resetada!\n\nNova senha temporária: ${result.senha_temporaria}\n\n⚠️ Anote esta senha! Ela só será exibida uma vez.`);

    // Tentar enviar email de senha resetada se possível
    if (result.email && result.senha_temporaria) {
      try {
        

        if (window.emailService) {
          const emailEnviado = await window.emailService.notificarResetSenha({
            nome: nome,
            email: result.email,
            senha_nova: result.senha_temporaria
          });

          if (emailEnviado) {
            

            // Adicionar informação visual se possível
            setTimeout(() => {
              if (window.mostrarNotificacao) {
                window.mostrarNotificacao('📧 Email com nova senha enviado!', 'success');
              }
            }, 1000);
          } else {
            
          }
        } else {
          
        }
      } catch (error) {
        console.error('❌ Erro ao enviar email de senha resetada:', error);
      }
    }

  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    alert('❌ Erro: ' + error.message);
  }
};

/* =============================================================
   CONFIGURAÇÃO DO NÚMERO DO PEDIDO
   ============================================================= */

/**
 * Carrega configuração do número do pedido
 */
async function carregarConfigNumeroPedido() {
  try {
    const response = await fetch(`${API_URL}/configuracoes/proximo-numero-pedido`);
    if (!response.ok) {
      // Se falhar, usa valores padrão
      atualizarPreviewNumeroPedido();
      return;
    }

    const config = await response.json();

    document.getElementById('configPedidoPrefixo').value = config.prefixo || 'PED';
    document.getElementById('configPedidoNumeroInicial').value = config.numero_atual || 1000;
    document.getElementById('configPedidoIncremento').value = config.incremento || 1;

    atualizarPreviewNumeroPedido();

  } catch (error) {
    console.error('Erro ao carregar config número pedido:', error);
    atualizarPreviewNumeroPedido();
  }
}

/**
 * Atualiza preview do número do pedido
 */
function atualizarPreviewNumeroPedido() {
  const prefixo = document.getElementById('configPedidoPrefixo')?.value || 'PED';
  const numero = document.getElementById('configPedidoNumeroInicial')?.value || 1000;

  const preview = document.getElementById('previewNumeroPedido');
  if (preview) {
    preview.textContent = `${prefixo}-${numero}`;
  }
}

/**
 * Carrega o próximo número do pedido no formulário de criação
 */
async function carregarProximoNumeroPedido() {
  const campoNumeroPedido = document.getElementById('jobNumber');
  if (!campoNumeroPedido) return;

  try {
    const response = await fetch(`${API_URL}/configuracoes/proximo-numero-pedido`);
    if (!response.ok) {
      campoNumeroPedido.value = 'PED-1000';
      return;
    }

    const config = await response.json();
    const proximoNumero = `${config.prefixo || 'PED'}-${config.numero_atual || 1000}`;
    campoNumeroPedido.value = proximoNumero;

    console.log('📋 Próximo número do pedido:', proximoNumero);

  } catch (error) {
    console.error('Erro ao carregar próximo número do pedido:', error);
    campoNumeroPedido.value = 'PED-1000';
  }
}

// Event listeners para atualizar preview em tempo real
document.addEventListener('DOMContentLoaded', () => {
  const inputPrefixo = document.getElementById('configPedidoPrefixo');
  const inputNumero = document.getElementById('configPedidoNumeroInicial');

  if (inputPrefixo) inputPrefixo.addEventListener('input', atualizarPreviewNumeroPedido);
  if (inputNumero) inputNumero.addEventListener('input', atualizarPreviewNumeroPedido);
});

/**
 * Salva configuração do número do pedido
 */
window.salvarConfigNumeroPedido = async function () {
  const prefixo = document.getElementById('configPedidoPrefixo').value.trim().toUpperCase() || 'PED';
  const numero = parseInt(document.getElementById('configPedidoNumeroInicial').value) || 1000;
  const incremento = parseInt(document.getElementById('configPedidoIncremento').value) || 1;

  console.log('📝 Salvando config:', { prefixo, numero, incremento });

  try {
    const response = await fetch(`${API_URL}/configuracoes/numero-pedido`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prefixo,
        numero_inicial: numero,
        incremento
      })
    });

    const data = await response.json();
    console.log('📥 Resposta do servidor:', data);

    if (!response.ok) throw new Error(data.error || 'Erro ao salvar');

    alert('✅ Configuração do número de pedido salva com sucesso!');

    // Recarrega a configuração para garantir sincronização
    await carregarConfigNumeroPedido();

  } catch (error) {
    console.error('Erro ao salvar config:', error);
    alert('❌ Erro: ' + error.message);
  }
};

/* =============================================================
   CONTROLE DE VISIBILIDADE DO MENU BASEADO EM PERMISSÕES
   ============================================================= */

/**
 * Aplica permissões de visibilidade ao menu lateral
 */
function aplicarPermissoesMenu(permissoes) {
  if (!permissoes) return;

  // Se é master, mostra tudo
  if (permissoes.is_master) {
    document.querySelectorAll('.sidebar .nav-item, .sidebar .submenu-link').forEach(el => {
      el.style.display = '';
    });
    return;
  }

  // Mapeia links do menu para permissões
  const mapeamento = {
    'link-principal': permissoes.dashboard,
    'link-financeiro': permissoes.financeiro,
    'link-clientes': permissoes.clientes,
    'menuComercial': permissoes.clientes,
    'link-contratos': permissoes.contratos
  };

  // Aplica visibilidade
  Object.entries(mapeamento).forEach(([id, permitido]) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = permitido ? '' : 'none';
    }
  });

  // Links de menu por onclick/data
  if (!permissoes.funcionarios) {
    document.querySelectorAll('[onclick*="funcionarios"]').forEach(el => {
      el.closest('.nav-item, .submenu-link')?.style.setProperty('display', 'none');
    });
  }

  if (!permissoes.estoque) {
    document.querySelectorAll('[onclick*="estoque"]').forEach(el => {
      el.closest('.nav-item, .submenu-link')?.style.setProperty('display', 'none');
    });
  }

  if (!permissoes.configuracoes) {
    document.querySelectorAll('[onclick*="configuracoes"], [onclick*="settings"]').forEach(el => {
      el.closest('.nav-item, .submenu-link')?.style.setProperty('display', 'none');
    });
  }
}

/**
 * Verifica se usuário tem permissão para acessar uma view
 */
function verificarPermissaoView(viewId) {
  const permissoes = window.permissoesUsuario;

  // Se não há sistema de login ativo, permite tudo
  if (!permissoes) return true;

  // Master tem acesso total
  if (permissoes.is_master) return true;

  // Mapeia views para permissões
  const mapeamento = {
    'principal': 'dashboard',
    'financeiro': 'financeiro',
    'clientes': 'clientes',
    'cadastro-cliente': 'clientes',
    'contratos': 'contratos',
    'novo-job': 'contratos',
    'visualizar-job': 'contratos',
    'funcionarios': 'funcionarios',
    'cadastro-funcionario': 'funcionarios',
    'estoque': 'estoque',
    'novo-item': 'estoque',
    'configuracoes': 'configuracoes'
  };

  const permissaoNecessaria = mapeamento[viewId];

  if (!permissaoNecessaria) return true; // Views não mapeadas são permitidas

  return permissoes[permissaoNecessaria];
}

/**
 * Exibe mensagem de acesso negado
 */
function exibirAcessoNegado() {
  const content = document.querySelector('.main-content');
  if (content) {
    content.innerHTML = `
      <div class="d-flex flex-column align-items-center justify-content-center" style="min-height: 60vh;">
        <i class="bi bi-shield-x text-danger" style="font-size: 5rem;"></i>
        <h3 class="mt-4 text-danger">Acesso Negado</h3>
        <p class="text-muted">Você não tem permissão para acessar esta área.</p>
        <button class="btn btn-primary" onclick="switchView('principal')">
          <i class="bi bi-house me-2"></i>Voltar ao Dashboard
        </button>
      </div>
    `;
  }
}

/* =============================================================
   INICIALIZAÇÃO DO CONTROLE DE ACESSO
   ============================================================= */

// Carrega configurações quando a aba Sistema é aberta
document.addEventListener('DOMContentLoaded', () => {
  // Observer para detectar quando a aba Sistema é ativada
  const tabSistema = document.querySelector('[data-bs-target="#tab-sistema"]');
  if (tabSistema) {
    tabSistema.addEventListener('shown.bs.tab', () => {
      
      carregarConfigNumeroPedido();
      carregarControleAcesso();
    });
  }

  // Também carrega ao abrir configurações pela primeira vez
  const viewConfiguracoes = document.getElementById('view-configuracoes');
  if (viewConfiguracoes) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('active')) {
          setTimeout(() => {
            carregarConfigNumeroPedido();
            carregarControleAcesso();
          }, 300);
        }
      });
    });

    observer.observe(viewConfiguracoes, { attributes: true, attributeFilter: ['class'] });
  }
});

// =======================================================
//          FUNÇÕES DA EMPRESA
// =======================================================

// Variável global para armazenar o logo da empresa
window.logoEmpresa = null;

// CARREGAR DADOS DA EMPRESA
async function carregarDadosEmpresa() {
  
  
  

  try {
    console.log('📡 Buscando dados de:', `${API_URL}/empresa`);
    const res = await fetch(`${API_URL}/empresa`);
    console.log('📨 Status da resposta:', res.status);

    const empresa = await res.json();
    console.log('📦 Dados recebidos:', empresa);

    if (empresa) {
      // Preenche os campos do formulário
      document.getElementById('configRazaoSocial').value = empresa.razao_social || '';
      document.getElementById('configNomeFantasia').value = empresa.nome_fantasia || '';
      document.getElementById('configCNPJ').value = empresa.cnpj || '';
      document.getElementById('configIE').value = empresa.ie || '';
      document.getElementById('configIM').value = empresa.im || '';
      document.getElementById('configEmailEmpresa').value = empresa.email || '';
      document.getElementById('configTelefoneEmpresa').value = empresa.telefone || '';
      document.getElementById('configWebsite').value = empresa.website || '';
      document.getElementById('configLinkedIn').value = empresa.linkedin || '';
      document.getElementById('configCEP').value = empresa.cep || '';
      // IDs corrigidos para corresponder ao HTML
      document.getElementById('configLogradouroEmpresa').value = empresa.logradouro || '';
      document.getElementById('configNumeroEmpresa').value = empresa.numero || '';
      document.getElementById('configComplemento').value = empresa.complemento || '';
      document.getElementById('configBairroEmpresa').value = empresa.bairro || '';
      document.getElementById('configCidadeEmpresa').value = empresa.cidade || '';
      document.getElementById('configEstadoEmpresa').value = empresa.estado || '';

      // Carrega o logo
      if (empresa.logo) {
        window.logoEmpresa = empresa.logo;
        const preview = document.getElementById('configLogoPreview');
        preview.innerHTML = `<img src="${empresa.logo}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
      }

      
      
    } else {
      console.warn('⚠️ Nenhum dado de empresa encontrado no servidor');
    }
  } catch (err) {
    console.error('❌ ========================================');
    console.error('❌ ERRO AO CARREGAR DADOS DA EMPRESA!');
    console.error('❌ Erro:', err);
    console.error('❌ ========================================');
  }
}

// SALVAR DADOS DA EMPRESA
async function salvarDadosEmpresa(e) {
  if (e) e.preventDefault();

  
  
  

  // IDs corrigidos para corresponder ao HTML
  const dados = {
    razao_social: document.getElementById('configRazaoSocial')?.value || '',
    nome_fantasia: document.getElementById('configNomeFantasia')?.value || '',
    cnpj: document.getElementById('configCNPJ')?.value || '',
    ie: document.getElementById('configIE')?.value || '',
    im: document.getElementById('configIM')?.value || '',
    email: document.getElementById('configEmailEmpresa')?.value || '',
    telefone: document.getElementById('configTelefoneEmpresa')?.value || '',
    website: document.getElementById('configWebsite')?.value || '',
    linkedin: document.getElementById('configLinkedIn')?.value || '',
    cep: document.getElementById('configCEP')?.value || '',
    logradouro: document.getElementById('configLogradouroEmpresa')?.value || '',
    numero: document.getElementById('configNumeroEmpresa')?.value || '',
    complemento: document.getElementById('configComplemento')?.value || '',
    bairro: document.getElementById('configBairroEmpresa')?.value || '',
    cidade: document.getElementById('configCidadeEmpresa')?.value || '',
    estado: document.getElementById('configEstadoEmpresa')?.value || '',
    logo: window.logoEmpresa
  };

  
  console.table(dados);
  console.log('🌐 API_URL:', API_URL);
  console.log('🔗 URL completa:', `${API_URL}/empresa`);

  try {
    

    const res = await fetch(`${API_URL}/empresa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    });

    
    console.log('📨 Status HTTP:', res.status);
    console.log('📨 Status Text:', res.statusText);
    console.log('📨 Headers:', Object.fromEntries(res.headers.entries()));

    const result = await res.json();
    console.log('📦 Resultado parseado:', result);

    if (result.success) {
      
      
      

      // Exibe modal de sucesso (com fallback se Swal não estiver disponível)
      if (typeof window.Swal !== 'undefined') {
        const Toast = window.Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          didOpen: (toast) => {
            toast.addEventListener('mouseenter', window.Swal.stopTimer)
            toast.addEventListener('mouseleave', window.Swal.resumeTimer)
          }
        });

        Toast.fire({
          icon: 'success',
          title: 'Dados da empresa salvos com sucesso!'
        });
      } else {
        alert('✅ Dados da empresa salvos com sucesso!');
      }

      // Recarrega os dados para confirmar
      setTimeout(() => {
        
        carregarDadosEmpresa();
      }, 500);
    } else {
      const errorMsg = result.error || 'Erro desconhecido';
      alert('❌ Erro ao salvar: ' + errorMsg);
      console.error('❌ ========================================');
      console.error('❌ ERRO NO SALVAMENTO!');
      console.error('❌ Mensagem:', errorMsg);
      console.error('❌ Resposta completa:', result);
      console.error('❌ ========================================');
    }
  } catch (err) {
    console.error('❌ ========================================');
    console.error('❌ ERRO CRÍTICO NO CATCH!');
    console.error('❌ Tipo do erro:', err.name);
    console.error('❌ Mensagem:', err.message);
    console.error('❌ Stack:', err.stack);
    console.error('❌ ========================================');
    alert('❌ Erro ao salvar dados da empresa: ' + err.message);
  }
}

// UPLOAD DO LOGO
function setupLogoUpload() {
  const inputLogo = document.getElementById('configLogoInput');
  if (!inputLogo) return;

  inputLogo.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    // Verifica tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('⚠️ Imagem muito grande! Máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async function (event) {
      const base64 = event.target.result;

      // Atualiza preview
      const preview = document.getElementById('configLogoPreview');
      preview.innerHTML = `<img src="${base64}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;

      // Salva no banco
      try {
        const res = await fetch(`${API_URL}/empresa/logo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logo: base64 })
        });

        const result = await res.json();
        if (result.success) {
          window.logoEmpresa = base64;
          
        }
      } catch (err) {
        console.error('Erro ao salvar logo:', err);
      }
    };
    reader.readAsDataURL(file);
  });
}

// REMOVER LOGO
window.removerLogoEmpresa = async function () {
  if (!confirm('Tem certeza que deseja remover o logo?')) return;

  try {
    await fetch(`${API_URL}/empresa/logo`, { method: 'DELETE' });

    window.logoEmpresa = null;
    const preview = document.getElementById('configLogoPreview');
    preview.innerHTML = '<i class="bi bi-image text-muted" style="font-size: 2rem;"></i>';

    
  } catch (err) {
    console.error('Erro ao remover logo:', err);
  }
};

// OBTER LOGO DA EMPRESA (para usar em pedidos)
async function obterLogoEmpresa() {
  if (window.logoEmpresa) return window.logoEmpresa;

  try {
    const res = await fetch(`${API_URL}/empresa`);
    const empresa = await res.json();
    if (empresa && empresa.logo) {
      window.logoEmpresa = empresa.logo;
      return empresa.logo;
    }
  } catch (err) {
    console.error('Erro ao obter logo:', err);
  }
  return null;
}

// CARREGAR LOGO E NOME DA EMPRESA NO PEDIDO
async function carregarLogoNoPedido() {
  try {
    const res = await fetch(`${API_URL}/empresa`);
    const empresa = await res.json();

    // Preenche o logo no pedido
    const logoContainer = document.getElementById('logoPreviewPedido');
    if (logoContainer) {
      if (empresa && empresa.logo) {
        logoContainer.innerHTML = `<img src="${empresa.logo}" alt="Logo" class="img-fluid" style="max-height: 60px;">`;
      } else {
        logoContainer.innerHTML = '<i class="bi bi-image text-muted" style="font-size: 2rem;"></i>';
      }
    }

    // Preenche o nome da empresa no pedido
    const nomeEmpresa = document.getElementById('nomeEmpresaPedido');
    if (nomeEmpresa) {
      if (empresa && empresa.nome_fantasia) {
        nomeEmpresa.textContent = empresa.nome_fantasia;
      } else if (empresa && empresa.razao_social) {
        nomeEmpresa.textContent = empresa.razao_social;
      } else {
        nomeEmpresa.textContent = 'Nome da Empresa';
      }
    }

    
  } catch (err) {
    console.error('Erro ao carregar logo no pedido:', err);
  }
}

// Inicialização - Carrega dados da empresa quando abrir aba Empresa
document.addEventListener('DOMContentLoaded', function () {
  // Form de empresa
  const formEmpresa = document.getElementById('formEditarEmpresa');
  if (formEmpresa) {
    formEmpresa.addEventListener('submit', salvarDadosEmpresa);
  }

  // Setup do upload de logo
  setupLogoUpload();

  // Setup da busca automática de CEP em TODOS os campos
  setupTodosCamposCEP();

  // Setup das máscaras de formatação
  setupMascarasEmpresa();

  // Observer para carregar dados quando abrir aba Empresa
  const tabEmpresa = document.querySelector('[data-bs-target="#tab-empresa"]');
  if (tabEmpresa) {
    tabEmpresa.addEventListener('click', function () {
      setTimeout(() => {
        carregarDadosEmpresa();
      }, 100);
    });
  }
});

// =============================================================
// CONFIGURAÇÃO UNIVERSAL DE BUSCA DE CEP
// Aplica busca automática em TODOS os campos de CEP do sistema
// =============================================================

function setupTodosCamposCEP() {
  

  // Lista de TODOS os campos de CEP do sistema
  const camposCEP = [
    { id: 'configCEP', prefixo: 'config' },        // Empresa (Configurações)
    { id: 'configCep', prefixo: 'config' },        // Perfil (Configurações)
    { id: 'cadCliCep', prefixo: 'cadCli' },        // Cliente
    { id: 'jobCep', prefixo: 'job' },              // Job/Pedido
    { id: 'jobPagadorCep', prefixo: 'jobPagador' } // Pagador
  ];

  camposCEP.forEach(campo => {
    const input = document.getElementById(campo.id);
    if (!input) {
      console.warn(`⚠️ Campo ${campo.id} não encontrado`);
      return;
    }

    console.log(`✅ Configurado: ${campo.id} com prefixo ${campo.prefixo}`);

    // Máscara de CEP (00000-000)
    input.addEventListener('input', function () {
      let valor = this.value.replace(/\D/g, '');
      if (valor.length > 8) valor = valor.substring(0, 8);
      if (valor.length > 5) {
        valor = valor.substring(0, 5) + '-' + valor.substring(5);
      }
      this.value = valor;
    });

    // Busca automática ao sair do campo
    input.addEventListener('blur', function () {
      const cep = this.value.replace(/\D/g, '');
      if (cep.length === 8) {
        console.log(`🔍 Disparando busca de CEP para: ${campo.id}`);
        buscarCepGenerico(cep, campo.prefixo, this);
      }
    });
  });

  
}


// =============================================================
// MÁSCARAS DE FORMATAÇÃO (CNPJ, Telefone, etc)
// =============================================================

function setupMascarasEmpresa() {
  // Máscara de CNPJ: 00.000.000/0000-00
  const inputCNPJ = document.getElementById('configCNPJ');
  if (inputCNPJ) {
    inputCNPJ.addEventListener('input', function () {
      let valor = this.value.replace(/\D/g, '');

      if (valor.length > 14) valor = valor.substring(0, 14);

      if (valor.length > 12) {
        valor = valor.substring(0, 2) + '.' + valor.substring(2, 5) + '.' + valor.substring(5, 8) + '/' + valor.substring(8, 12) + '-' + valor.substring(12);
      } else if (valor.length > 8) {
        valor = valor.substring(0, 2) + '.' + valor.substring(2, 5) + '.' + valor.substring(5, 8) + '/' + valor.substring(8);
      } else if (valor.length > 5) {
        valor = valor.substring(0, 2) + '.' + valor.substring(2, 5) + '.' + valor.substring(5);
      } else if (valor.length > 2) {
        valor = valor.substring(0, 2) + '.' + valor.substring(2);
      }

      this.value = valor;
    });
  }

  // Máscara de Telefone: (00) 00000-0000 ou (00) 0000-0000
  const inputTelefone = document.getElementById('configTelefoneEmpresa');
  if (inputTelefone) {
    inputTelefone.addEventListener('input', function () {
      let valor = this.value.replace(/\D/g, '');

      if (valor.length > 11) valor = valor.substring(0, 11);

      if (valor.length > 10) {
        valor = '(' + valor.substring(0, 2) + ') ' + valor.substring(2, 7) + '-' + valor.substring(7);
      } else if (valor.length > 6) {
        valor = '(' + valor.substring(0, 2) + ') ' + valor.substring(2, 6) + '-' + valor.substring(6);
      } else if (valor.length > 2) {
        valor = '(' + valor.substring(0, 2) + ') ' + valor.substring(2);
      }

      this.value = valor;
    });
  }

  // Máscara de CEP (Empresa): 00000-000
  const inputCEPEmpresa = document.getElementById('configCEP');
  if (inputCEPEmpresa) {
    inputCEPEmpresa.addEventListener('input', function () {
      let valor = this.value.replace(/\D/g, '');

      if (valor.length > 8) valor = valor.substring(0, 8);

      if (valor.length > 5) {
        valor = valor.substring(0, 5) + '-' + valor.substring(5);
      }

      this.value = valor;
    });
  }

  // Máscara de CEP (Funcionário): 00000-000
  const inputCEPFunc = document.getElementById('configCep');
  if (inputCEPFunc) {
    inputCEPFunc.addEventListener('input', function () {
      let valor = this.value.replace(/\D/g, '');

      if (valor.length > 8) valor = valor.substring(0, 8);

      if (valor.length > 5) {
        valor = valor.substring(0, 5) + '-' + valor.substring(5);
      }

      this.value = valor;
    });
  }

  // Máscara de CEP (Cadastro RH): 00000-000
  const inputCEPRH = document.getElementById('rhCep');
  if (inputCEPRH) {
    inputCEPRH.addEventListener('input', function () {
      let valor = this.value.replace(/\D/g, '');

      if (valor.length > 8) valor = valor.substring(0, 8);

      if (valor.length > 5) {
        valor = valor.substring(0, 5) + '-' + valor.substring(5);
      }

      this.value = valor;
    });
  }
}


// =============================================================
// MÓDULO FINANCEIRO - Funções de gestão financeira
// =============================================================

let financeiroCarregado = false;
let transacoesCache = [];
let transacoesFiltradas = [];
let paginaAtualTransacoes = 1;
const itensPorPaginaTransacoes = 5;
let financeChartInstance = null;

// Inicializa o módulo financeiro
function inicializarFinanceiro() {
  // Sempre recarrega quando entrar na view (removido check de financeiroCarregado)
  financeiroCarregado = true;

  

  // Verifica se Chart.js está carregado
  if (typeof Chart === 'undefined') {
    console.error('❌ Chart.js não está carregado!');
    return;
  } else {
    console.log('✅ Chart.js está carregado:', Chart.version);
  }

  carregarResumoFinanceiro();
  carregarTransacoes();

  // Pequeno delay para garantir que o canvas já está renderizado
  setTimeout(() => {
    
    carregarGraficoFluxoCaixa();
    carregarGraficoDespesasCategoria();
  }, 100);
}

// Carrega os cards de resumo
async function carregarResumoFinanceiro() {
  try {
    const response = await fetch(`${API_URL}/financeiro/resumo`);
    const dados = await response.json();

    // Formata valores - Sempre mostra o valor real sem arredondamento
    const formatarValor = (v) => {
      const num = parseFloat(v) || 0;
      return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Formata variação percentual
    const formatarVariacao = (variacao) => {
      const num = parseFloat(variacao) || 0;
      const sinal = num >= 0 ? '+' : '';
      return sinal + num.toFixed(1) + '%';
    };

    // Atualiza nome do mês atual nos KPIs
    const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesAtual = mesesNomes[new Date().getMonth()];
    ['finMesRecebido', 'finMesDespesas', 'finMesSaldo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = mesAtual;
    });

    // Atualiza valores dos cards
    document.getElementById('finAReceber').textContent = formatarValor(dados.aReceber);
    document.getElementById('finRecebido').textContent = formatarValor(dados.recebidoMes);
    document.getElementById('finDespesas').textContent = formatarValor(dados.despesasMes);

    // Saldo com cor
    const saldoEl = document.getElementById('finSaldo');
    saldoEl.textContent = formatarValor(dados.saldo);
    saldoEl.classList.remove('text-success', 'text-danger');
    saldoEl.classList.add(dados.saldo >= 0 ? 'text-success' : 'text-danger');

    // Quantidade de vencidas
    const qtdEl = document.getElementById('finQtdVencidas');
    if (qtdEl) {
      qtdEl.textContent = dados.qtdVencidas + ' vencida' + (dados.qtdVencidas !== 1 ? 's' : '');
      qtdEl.classList.remove('bg-success-subtle', 'text-success', 'bg-danger-subtle', 'text-danger');
      if (dados.qtdVencidas > 0) {
        qtdEl.classList.add('bg-danger-subtle', 'text-danger');
      } else {
        qtdEl.classList.add('bg-success-subtle', 'text-success');
      }
    }

    // ========== VARIAÇÕES PERCENTUAIS ==========

    // Badge de variação do Recebido
    const varRecebidoEl = document.getElementById('finVarRecebido');
    if (varRecebidoEl) {
      const varRecebido = dados.variacaoRecebido || 0;
      varRecebidoEl.innerHTML = `<i class="bi bi-${varRecebido >= 0 ? 'graph-up-arrow' : 'graph-down-arrow'}"></i> ${formatarVariacao(varRecebido)}`;
      varRecebidoEl.classList.remove('bg-success-subtle', 'text-success', 'bg-danger-subtle', 'text-danger');
      if (varRecebido >= 0) {
        varRecebidoEl.classList.add('bg-success-subtle', 'text-success');
      } else {
        varRecebidoEl.classList.add('bg-danger-subtle', 'text-danger');
      }
    }

    // Badge de variação das Despesas (invertido: aumento é ruim)
    const varDespesasEl = document.getElementById('finVarDespesas');
    if (varDespesasEl) {
      const varDespesas = dados.variacaoDespesas || 0;
      varDespesasEl.innerHTML = `<i class="bi bi-${varDespesas >= 0 ? 'graph-up-arrow' : 'graph-down-arrow'}"></i> ${formatarVariacao(varDespesas)}`;
      varDespesasEl.classList.remove('bg-success-subtle', 'text-success', 'bg-danger-subtle', 'text-danger');
      // Para despesas, aumento é RUIM (vermelho), diminuição é BOM (verde)
      if (varDespesas <= 0) {
        varDespesasEl.classList.add('bg-success-subtle', 'text-success');
      } else {
        varDespesasEl.classList.add('bg-danger-subtle', 'text-danger');
      }
    }

    // Badge de variação do Saldo
    const varSaldoEl = document.getElementById('finVarSaldo');
    if (varSaldoEl) {
      const varSaldo = dados.variacaoSaldo || 0;
      varSaldoEl.innerHTML = `<i class="bi bi-${varSaldo >= 0 ? 'graph-up-arrow' : 'graph-down-arrow'}"></i> ${formatarVariacao(varSaldo)}`;
      varSaldoEl.classList.remove('bg-success-subtle', 'text-success', 'bg-danger-subtle', 'text-danger');
      if (varSaldo >= 0) {
        varSaldoEl.classList.add('bg-success-subtle', 'text-success');
      } else {
        varSaldoEl.classList.add('bg-danger-subtle', 'text-danger');
      }
    }

    console.log('✅ Resumo financeiro carregado', dados);
  } catch (error) {
    console.error('❌ Erro ao carregar resumo financeiro:', error);
  }
}

// Carrega transações
async function carregarTransacoes() {
  const tipo = document.getElementById('finFiltroTipo')?.value || 'todos';
  const status = document.getElementById('finFiltroStatus')?.value || 'todos';
  const busca = document.getElementById('finBusca')?.value || '';
  const categoria = document.getElementById('finFiltroCategoria')?.value || 'todos';
  const dataInicio = document.getElementById('finFiltroDataInicio')?.value || '';
  const dataFim = document.getElementById('finFiltroDataFim')?.value || '';

  const params = new URLSearchParams();
  if (tipo !== 'todos') params.append('tipo', tipo);
  if (status !== 'todos') params.append('status', status);
  if (busca) params.append('busca', busca);
  if (dataInicio) params.append('dataInicio', dataInicio);
  if (dataFim) params.append('dataFim', dataFim);

  try {
    const response = await fetch(`${API_URL}/financeiro/transacoes?${params}`);
    const data = await response.json();

    // Verifica se há erro na resposta
    if (data && data.error) {
      console.error('❌ Erro da API:', data.error);
      transacoesCache = [];
    } else {
      transacoesCache = Array.isArray(data) ? data : [];
    }

    // Aplica filtro de categoria localmente (client-side)
    transacoesFiltradas = transacoesCache;
    if (categoria !== 'todos') {
      transacoesFiltradas = transacoesFiltradas.filter(t => t.categoria === categoria);
    }

    console.log('💰 Transações recebidas:', transacoesCache.length, '| Filtradas:', transacoesFiltradas.length);

    // Reseta para primeira página ao aplicar novos filtros
    paginaAtualTransacoes = 1;
    renderizarTransacoesPaginadas();
  } catch (error) {
    console.error('❌ Erro ao carregar transações:', error);
    transacoesFiltradas = [];
    renderizarTransacoesPaginadas();
  }
}

// Renderiza transações com paginação
function renderizarTransacoesPaginadas() {
  const tbody = document.getElementById('tabelaTransacoesBody');
  if (!tbody) return;

  // Garante que transacoesFiltradas é um array
  if (!Array.isArray(transacoesFiltradas)) {
    console.error('❌ Transações filtradas não é array:', transacoesFiltradas);
    transacoesFiltradas = [];
  }

  if (!transacoesFiltradas || transacoesFiltradas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          <i class="bi bi-inbox me-2"></i>Nenhuma transação encontrada
        </td>
      </tr>
    `;
    atualizarInfoPaginacao(0);
    atualizarResumoTransacoesFiltradas(); // Esconde o resumo
    return;
  }

  // Calcular índices da página atual
  const totalPaginas = Math.ceil(transacoesFiltradas.length / itensPorPaginaTransacoes);
  const inicio = (paginaAtualTransacoes - 1) * itensPorPaginaTransacoes;
  const fim = inicio + itensPorPaginaTransacoes;
  const transacoesPagina = transacoesFiltradas.slice(inicio, fim);

  const formatarData = (d) => {
    if (!d) return '-';
    const data = new Date(d);
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatarValor = (v, tipo) => {
    const num = parseFloat(v) || 0;
    const sinal = tipo === 'receita' ? '+' : '-';
    return `${sinal} R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const getBadgeStatus = (status) => {
    switch (status) {
      case 'pago': return '<span class="pill-green">Pago</span>';
      case 'pendente': return '<span class="pill-yellow">Pendente</span>';
      case 'atrasado': return '<span class="pill-red">Vencido</span>';
      case 'cancelado': return '<span class="pill-secondary">Cancelado</span>';
      default: return '<span class="badge bg-secondary">' + status + '</span>';
    }
  };

  let html = '';
  transacoesPagina.forEach(t => {
    const tipoClass = t.tipo === 'receita' ? 'text-income' : 'text-expense';
    const isJob = t.origem === 'job';

    html += `
      <tr>
        <td>
          <span class="fw-bold text-dark">${t.descricao || 'Sem descrição'}</span>
          ${t.cliente_nome ? `<div class="small text-muted">${t.cliente_nome}</div>` : ''}
        </td>
        <td class="${tipoClass}">${t.tipo === 'receita' ? 'Receita' : 'Despesa'}</td>
        <td>${t.categoria || '-'}</td>
        <td class="fw-bold ${tipoClass}">${formatarValor(t.valor, t.tipo)}</td>
        <td>${formatarData(t.data_vencimento)}</td>
        <td>${getBadgeStatus(t.status)}</td>
        <td class="text-end">
          ${isJob ? `
            <button class="btn btn-sm btn-outline-primary" onclick="window.setJobOrigin('financeiro'); abrirDetalhesJob(${t.id})" title="Ver pedido completo">
              <i class="bi bi-eye"></i> Ver Pedido
            </button>
            <small class="d-block text-muted mt-1" style="font-size: 10px;">Altere o status em Gestão de Contratos</small>
          ` : `
            <button class="btn btn-sm btn-outline-info me-1" onclick="visualizarTransacao(${t.id})" title="Visualizar">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="editarTransacao(${t.id})" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            ${t.status !== 'pago' ? `
              <button class="btn btn-sm btn-success me-1" onclick="marcarTransacaoPaga(${t.id})" title="Marcar como pago">
                <i class="bi bi-check2"></i>
              </button>
            ` : ''}
            <button class="btn btn-sm btn-outline-danger" onclick="excluirTransacao(${t.id})" title="Excluir">
              <i class="bi bi-trash"></i>
            </button>
          `}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  renderizarBotoesPaginacaoTransacoes(transacoesFiltradas.length);
  atualizarResumoTransacoesFiltradas();
}

// Atualiza o resumo das transações filtradas
function atualizarResumoTransacoesFiltradas() {
  const resumoContainer = document.getElementById('resumoTransacoesFiltradas');

  if (!Array.isArray(transacoesFiltradas) || transacoesFiltradas.length === 0) {
    if (resumoContainer) resumoContainer.style.display = 'none';
    return;
  }

  // Mostra o container de resumo
  if (resumoContainer) resumoContainer.style.display = 'flex';

  let totalAReceber = 0;
  let totalAPagar = 0;
  let totalRecebido = 0;
  let totalPago = 0;

  transacoesFiltradas.forEach(t => {
    const valor = parseFloat(t.valor) || 0;
    if (t.tipo === 'receita') {
      if (t.status === 'pendente' || t.status === 'atrasado') {
        totalAReceber += valor;
      } else if (t.status === 'pago') {
        totalRecebido += valor;
      }
    } else if (t.tipo === 'despesa') {
      if (t.status === 'pendente' || t.status === 'atrasado') {
        totalAPagar += valor;
      } else if (t.status === 'pago') {
        totalPago += valor;
      }
    }
  });

  // Novo cálculo: (Total Recebido - Total Pago) + (Total a Receber - Total a Pagar)
  const balancoFiltrado = (totalRecebido - totalPago) + (totalAReceber - totalAPagar);
  const jaEfetivado = totalRecebido - totalPago; // Saldo já pago/recebido (receitas pagas - despesas pagas)

  // Formata valores
  const formatarValor = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Atualiza os elementos
  const elemAReceber = document.getElementById('totalAReceber');
  const elemAPagar = document.getElementById('totalAPagar');
  const elemRecebido = document.getElementById('totalPagoRecebido');
  const elemBalanco = document.getElementById('balancoFiltrado');

  if (elemAReceber) elemAReceber.textContent = formatarValor(totalAReceber);
  if (elemAPagar) elemAPagar.textContent = formatarValor(totalAPagar);
  // CORREÇÃO: Mostra Receitas Pagas - Despesas Pagas
  if (elemRecebido) {
    elemRecebido.textContent = formatarValor(jaEfetivado);
    elemRecebido.className = 'h5 mb-0 fw-bold ' + (jaEfetivado >= 0 ? 'text-primary' : 'text-danger');
  }

  if (elemBalanco) {
    elemBalanco.textContent = formatarValor(balancoFiltrado);
    elemBalanco.className = 'h5 mb-0 fw-bold ' + (balancoFiltrado >= 0 ? 'text-success' : 'text-danger');
  }
}

// Renderiza tabela de transações (mantido para compatibilidade)
function renderizarTransacoes(transacoes) {
  transacoesFiltradas = Array.isArray(transacoes) ? transacoes : [];
  paginaAtualTransacoes = 1;
  renderizarTransacoesPaginadas();
}

// Renderiza botões de paginação (padrão do site)
function renderizarBotoesPaginacaoTransacoes(totalItens) {
  const totalPaginas = totalItens > 0 ? Math.ceil(totalItens / itensPorPaginaTransacoes) : 0;

  const containerPaginacao = document.getElementById('paginacao-transacoes');
  if (!containerPaginacao) {
    console.error('❌ Container de paginação não encontrado!');
    return;
  }

  containerPaginacao.innerHTML = '';

  if (totalPaginas <= 1) {
    // Se houver apenas 1 página ou nenhuma, mostra info mas sem botões
    if (totalItens > 0) {
      containerPaginacao.innerHTML = `<div class="text-center text-muted small mt-2">Total: ${totalItens} transação(ões)</div>`;
    }
    return;
  }

  let botoesHTML = '<div class="d-flex justify-content-center align-items-center gap-2">';

  // Botão Anterior
  const desabilitarAnterior = paginaAtualTransacoes === 1;
  botoesHTML += `
    <button class="btn btn-sm btn-outline-secondary" 
            onclick="mudarPaginaTransacoes(${paginaAtualTransacoes - 1})" 
            ${desabilitarAnterior ? 'disabled' : ''}>
      <i class="bi bi-chevron-left"></i> Anterior
    </button>
  `;

  // Botões numéricos (máximo 5 páginas visíveis)
  let paginaInicio = Math.max(1, paginaAtualTransacoes - 2);
  let paginaFim = Math.min(totalPaginas, paginaInicio + 4);

  // Ajusta início se estiver próximo ao fim
  if (paginaFim - paginaInicio < 4) {
    paginaInicio = Math.max(1, paginaFim - 4);
  }

  for (let i = paginaInicio; i <= paginaFim; i++) {
    const ativo = i === paginaAtualTransacoes ? 'btn-primary' : 'btn-outline-secondary';
    botoesHTML += `
      <button class="btn btn-sm ${ativo}" 
              onclick="mudarPaginaTransacoes(${i})" 
              style="min-width: 40px;">
        ${i}
      </button>
    `;
  }

  // Botão Próximo
  const desabilitarProximo = paginaAtualTransacoes === totalPaginas;
  botoesHTML += `
    <button class="btn btn-sm btn-outline-secondary" 
            onclick="mudarPaginaTransacoes(${paginaAtualTransacoes + 1})" 
            ${desabilitarProximo ? 'disabled' : ''}>
      Próximo <i class="bi bi-chevron-right"></i>
    </button>
  `;

  botoesHTML += `</div>
    <div class="text-center text-muted small mt-2">
      Página ${paginaAtualTransacoes} de ${totalPaginas} • Total: ${totalItens} transação(ões)
    </div>`;

  containerPaginacao.innerHTML = botoesHTML;
}

// Muda página (função global para ser chamada pelo onclick)
window.mudarPaginaTransacoes = function (novaPagina) {
  const totalPaginas = Math.ceil(transacoesFiltradas.length / itensPorPaginaTransacoes);

  if (novaPagina < 1 || novaPagina > totalPaginas) return;

  paginaAtualTransacoes = novaPagina;
  renderizarTransacoesPaginadas();
};

// Filtrar transações
function filtrarTransacoes() {
  carregarTransacoes();
}

// Atualiza categorias baseado no tipo selecionado
function atualizarCategoriasTransacao() {
  const tipo = document.getElementById('transacaoTipo').value;
  const select = document.getElementById('transacaoCategoria');

  const categoriasDespesa = [
    'Combustível', 'Manutenção', 'Logística', 'Folha de Pagamento',
    'Aluguel', 'Materiais', 'Marketing', 'Impostos', 'Fornecedores',
    'Energia/Água', 'Internet/Telefone', 'Outros'
  ];

  const categoriasReceita = [
    'Locação', 'Serviço', 'Locação + Serviço', 'Consultoria',
    'Venda de Equipamento', 'Reembolso', 'Outros'
  ];

  const categorias = tipo === 'receita' ? categoriasReceita : categoriasDespesa;

  select.innerHTML = categorias.map(cat =>
    `<option value="${cat}">${cat}</option>`
  ).join('');
}

// Abrir modal nova transação
function abrirModalNovaTransacao() {
  document.getElementById('transacaoId').value = '';
  document.getElementById('modalTransacaoTitulo').textContent = 'Nova Transação';
  document.getElementById('transacaoTipo').value = 'despesa';
  atualizarCategoriasTransacao(); // Atualiza categorias
  document.getElementById('transacaoCategoria').value = 'Outros';
  document.getElementById('transacaoDescricao').value = '';
  document.getElementById('transacaoValor').value = '';
  document.getElementById('transacaoVencimento').value = new Date().toISOString().split('T')[0];
  document.getElementById('transacaoStatus').value = 'pendente';
  document.getElementById('transacaoFormaPgto').value = '';
  document.getElementById('transacaoCliente').value = '';
  document.getElementById('transacaoObs').value = '';

  // Carrega clientes no dropdown
  carregarClientesDropdownTransacao();

  // Habilita todos os campos
  const campos = [
    'transacaoTipo',
    'transacaoCategoria',
    'transacaoDescricao',
    'transacaoValor',
    'transacaoVencimento',
    'transacaoStatus',
    'transacaoFormaPgto',
    'transacaoCliente',
    'transacaoObs'
  ];

  campos.forEach(campo => {
    const elemento = document.getElementById(campo);
    if (elemento) {
      elemento.disabled = false;
      elemento.style.backgroundColor = '';
    }
  });

  // Mostra botão Salvar e esconde botão Editar
  const btnSalvar = document.querySelector('#modalNovaTransacao .btn-primary:not(#btnEditarTransacao)');
  const btnEditar = document.getElementById('btnEditarTransacao');

  if (btnSalvar) {
    btnSalvar.style.display = 'inline-block';
  }

  if (btnEditar) {
    btnEditar.style.display = 'none';
  }

  const modal = new bootstrap.Modal(document.getElementById('modalNovaTransacao'));
  modal.show();
}

// Carrega clientes para dropdown
async function carregarClientesDropdownTransacao() {
  try {
    const response = await fetch(`${API_URL}/clientes`);
    const clientes = await response.json();

    const select = document.getElementById('transacaoCliente');
    select.innerHTML = '<option value="">Nenhum</option>' +
      clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  } catch (error) {
    console.error('Erro ao carregar clientes:', error);
  }
}

// Salvar transação
async function salvarTransacao() {
  const id = document.getElementById('transacaoId').value;
  const tipo = document.getElementById('transacaoTipo').value;
  const status = document.getElementById('transacaoStatus').value;
  const dataVencimento = document.getElementById('transacaoVencimento').value;

  const dados = {
    tipo: tipo,
    categoria: document.getElementById('transacaoCategoria').value,
    descricao: document.getElementById('transacaoDescricao').value.trim(),
    valor: Math.abs(parseFloat(document.getElementById('transacaoValor').value) || 0),
    data_vencimento: dataVencimento,
    status: status,
    forma_pagamento: document.getElementById('transacaoFormaPgto').value || null,
    cliente_id: document.getElementById('transacaoCliente').value || null,
    observacoes: document.getElementById('transacaoObs').value.trim() || null
  };

  // Se status for pago, adiciona data_pagamento automaticamente
  if (status === 'pago') {
    dados.data_pagamento = dataVencimento; // Usa data de vencimento como fallback
  }

  // Validação no frontend
  if (!dados.descricao) {
    alert('Descrição é obrigatória!');
    document.getElementById('transacaoDescricao').focus();
    return;
  }
  if (!dados.valor || dados.valor <= 0) {
    alert('Valor deve ser maior que zero!');
    document.getElementById('transacaoValor').focus();
    return;
  }
  if (!dados.data_vencimento) {
    alert('Data de vencimento é obrigatória!');
    document.getElementById('transacaoVencimento').focus();
    return;
  }

  try {
    const url = id ? `${API_URL}/financeiro/transacoes/${id}` : `${API_URL}/financeiro/transacoes`;
    const method = id ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (response.ok) {
      // Toast de sucesso
      const tipoTexto = tipo === 'receita' ? 'Receita' : 'Despesa';
      alert(id ? `${tipoTexto} atualizada com sucesso!` : `${tipoTexto} cadastrada com sucesso!`);
      bootstrap.Modal.getInstance(document.getElementById('modalNovaTransacao'))?.hide();

      // Recarrega tudo
      carregarTransacoes();
      carregarResumoFinanceiro();
      carregarGraficoFluxoCaixa();
      carregarGraficoDespesasCategoria();
    } else {
      const erro = await response.json();
      alert('Erro: ' + (erro.error || 'Erro desconhecido'));
    }
  } catch (error) {
    console.error('Erro ao salvar transação:', error);
    alert('Erro ao salvar transação!');
  }
}

// Função para visualizar transação em modo somente leitura
function visualizarTransacao(id) {
  const transacao = transacoesCache.find(t => t.id === id && t.origem === 'transacao');
  if (!transacao) return;

  // Preenche os campos
  document.getElementById('transacaoId').value = id;
  document.getElementById('modalTransacaoTitulo').textContent = 'Detalhes da Transação';
  document.getElementById('transacaoTipo').value = transacao.tipo;
  document.getElementById('transacaoCategoria').value = transacao.categoria || 'Outros';
  document.getElementById('transacaoDescricao').value = transacao.descricao || '';
  document.getElementById('transacaoValor').value = transacao.valor;
  document.getElementById('transacaoVencimento').value = transacao.data_vencimento?.split('T')[0] || '';
  document.getElementById('transacaoStatus').value = transacao.status;
  document.getElementById('transacaoFormaPgto').value = transacao.forma_pagamento || '';
  document.getElementById('transacaoObs').value = transacao.observacoes || '';

  // Carrega clientes e seleciona o correto
  carregarClientesDropdownTransacao();
  setTimeout(() => {
    if (transacao.cliente_id) {
      document.getElementById('transacaoCliente').value = transacao.cliente_id;
    }
  }, 100);

  // Desabilita todos os campos (modo somente leitura)
  const campos = [
    'transacaoTipo',
    'transacaoCategoria',
    'transacaoDescricao',
    'transacaoValor',
    'transacaoVencimento',
    'transacaoStatus',
    'transacaoFormaPgto',
    'transacaoCliente',
    'transacaoObs'
  ];

  campos.forEach(campo => {
    const elemento = document.getElementById(campo);
    if (elemento) {
      elemento.disabled = true;
      elemento.style.backgroundColor = '#f8f9fa';
    }
  });

  // Esconde botão Salvar e mostra botão Editar
  const btnSalvar = document.querySelector('#modalNovaTransacao .btn-primary:not(#btnEditarTransacao)');
  const btnCancelar = document.querySelector('#modalNovaTransacao .btn-light');

  if (btnSalvar) {
    btnSalvar.style.display = 'none';
  }

  // Adiciona botão de Editar se não existir
  let btnEditar = document.getElementById('btnEditarTransacao');
  if (!btnEditar) {
    btnEditar = document.createElement('button');
    btnEditar.id = 'btnEditarTransacao';
    btnEditar.type = 'button';
    btnEditar.className = 'btn btn-primary';
    btnEditar.innerHTML = '<i class="bi bi-pencil me-2"></i>Editar';
    btnEditar.onclick = () => habilitarEdicaoTransacao(id);
    btnCancelar.parentNode.appendChild(btnEditar);
  } else {
    btnEditar.style.display = 'inline-block';
    btnEditar.onclick = () => habilitarEdicaoTransacao(id);
  }

  const modal = new bootstrap.Modal(document.getElementById('modalNovaTransacao'));
  modal.show();
}

// Função para habilitar edição a partir do modo visualização
function habilitarEdicaoTransacao(id) {
  // Habilita todos os campos
  const campos = [
    'transacaoTipo',
    'transacaoCategoria',
    'transacaoDescricao',
    'transacaoValor',
    'transacaoVencimento',
    'transacaoStatus',
    'transacaoFormaPgto',
    'transacaoCliente',
    'transacaoObs'
  ];

  campos.forEach(campo => {
    const elemento = document.getElementById(campo);
    if (elemento) {
      elemento.disabled = false;
      elemento.style.backgroundColor = '';
    }
  });

  // Mostra botão Salvar e esconde botão Editar
  const btnSalvar = document.querySelector('#modalNovaTransacao .btn-primary:not(#btnEditarTransacao)');
  const btnEditar = document.getElementById('btnEditarTransacao');

  document.getElementById('modalTransacaoTitulo').textContent = 'Editar Transação';

  if (btnSalvar) {
    btnSalvar.style.display = 'inline-block';
  }

  if (btnEditar) {
    btnEditar.style.display = 'none';
  }
}

// Editar transação
function editarTransacao(id) {
  const transacao = transacoesCache.find(t => t.id === id && t.origem === 'transacao');
  if (!transacao) return;

  document.getElementById('transacaoId').value = id;
  document.getElementById('modalTransacaoTitulo').textContent = 'Editar Transação';
  document.getElementById('transacaoTipo').value = transacao.tipo;
  document.getElementById('transacaoCategoria').value = transacao.categoria || 'Outros';
  document.getElementById('transacaoDescricao').value = transacao.descricao || '';
  document.getElementById('transacaoValor').value = transacao.valor;
  document.getElementById('transacaoVencimento').value = transacao.data_vencimento?.split('T')[0] || '';
  document.getElementById('transacaoStatus').value = transacao.status;
  document.getElementById('transacaoFormaPgto').value = transacao.forma_pagamento || '';
  document.getElementById('transacaoObs').value = transacao.observacoes || '';

  carregarClientesDropdownTransacao();
  setTimeout(() => {
    if (transacao.cliente_id) {
      document.getElementById('transacaoCliente').value = transacao.cliente_id;
    }
  }, 100);

  // Garante que todos os campos estão habilitados
  const campos = [
    'transacaoTipo',
    'transacaoCategoria',
    'transacaoDescricao',
    'transacaoValor',
    'transacaoVencimento',
    'transacaoStatus',
    'transacaoFormaPgto',
    'transacaoCliente',
    'transacaoObs'
  ];

  campos.forEach(campo => {
    const elemento = document.getElementById(campo);
    if (elemento) {
      elemento.disabled = false;
      elemento.style.backgroundColor = '';
    }
  });

  // Garante que botão Salvar está visível e botão Editar escondido
  const btnSalvar = document.querySelector('#modalNovaTransacao .btn-primary:not(#btnEditarTransacao)');
  const btnEditar = document.getElementById('btnEditarTransacao');

  if (btnSalvar) {
    btnSalvar.style.display = 'inline-block';
  }

  if (btnEditar) {
    btnEditar.style.display = 'none';
  }

  const modal = new bootstrap.Modal(document.getElementById('modalNovaTransacao'));
  modal.show();
}

// Marcar transação como paga
async function marcarTransacaoPaga(id) {
  if (!confirm('Marcar esta transação como paga?')) return;

  try {
    const response = await fetch(`${API_URL}/financeiro/transacoes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] })
    });

    if (response.ok) {
      alert('Transação marcada como paga!');
      carregarTransacoes();
      carregarResumoFinanceiro();
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao marcar como paga!');
  }
}

// Marcar job como pago
async function marcarJobPago(jobId) {
  if (!confirm('Marcar este job como PAGO?')) return;

  try {
    const response = await fetch(`${API_URL}/financeiro/jobs/${jobId}/pagar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_pagamento: new Date().toISOString().split('T')[0] })
    });

    if (response.ok) {
      alert('Job marcado como pago!');
      carregarTransacoes();
      carregarResumoFinanceiro();
      carregarGraficoFluxoCaixa();
      carregarGraficoDespesasCategoria();
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao marcar job como pago!');
  }
}

// Excluir transação
async function excluirTransacao(id) {
  if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

  try {
    const response = await fetch(`${API_URL}/financeiro/transacoes/${id}`, { method: 'DELETE' });

    if (response.ok) {
      alert('Transação excluída!');
      carregarTransacoes();
      carregarResumoFinanceiro();
      carregarGraficoFluxoCaixa();
      carregarGraficoDespesasCategoria();
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao excluir transação!');
  }
}

// Carregar gráfico de fluxo de caixa
async function carregarGraficoFluxoCaixa() {
  const canvas = document.getElementById('financeChart');
  if (!canvas) {
    
    return;
  }

  try {
    
    const response = await fetch(`${API_URL}/financeiro/grafico-fluxo`);
    const dados = await response.json();

    console.log('📊 Dados recebidos do gráfico:', dados);
    console.log('📊 Estrutura completa:', JSON.stringify(dados, null, 2));
    console.log('📊 Entradas:', dados.entradas);
    console.log('📊 Saídas:', dados.saidas);

    const ctx = canvas.getContext('2d');

    // Destrói gráfico anterior se existir
    if (financeChartInstance) {
      financeChartInstance.destroy();
    }

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    financeChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: meses,
        datasets: [
          {
            label: 'Entradas',
            data: dados.entradas,
            backgroundColor: 'rgba(34, 197, 94, 0.8)', // Verde vibrante
            borderRadius: 4
          },
          {
            label: 'Saídas',
            data: dados.saidas,
            backgroundColor: 'rgba(239, 68, 68, 0.8)', // Vermelho
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return context.dataset.label + ': R$ ' + context.raw.toLocaleString('pt-BR');
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                if (value === 0) return 'R$ 0';

                // Se for 1 milhão ou mais, mostra em milhões
                if (value >= 1000000) {
                  return 'R$ ' + (value / 1000000).toFixed(1) + 'M';
                }

                // Se for 1 mil ou mais, mostra em milhares
                if (value >= 1000) {
                  return 'R$ ' + (value / 1000).toFixed(1) + 'K';
                }

                // Se for menos de 1 mil, mostra o valor inteiro
                return 'R$ ' + value.toFixed(0);
              }
            },
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });

    
  } catch (error) {
    console.error('❌ Erro ao carregar gráfico:', error);
  }
}

// Exportar financeiro (placeholder)
function exportarFinanceiro() {
  alert('Funcionalidade de exportação em desenvolvimento!');
}

// Variável para o gráfico de despesas por categoria
let despesasCategoriaChartInstance = null;

// Carregar gráfico de despesas por categoria (pizza/doughnut)
async function carregarGraficoDespesasCategoria() {
  const canvas = document.getElementById('despesasCategoriaChart');
  if (!canvas) {
    
    return;
  }

  try {
    
    const response = await fetch(`${API_URL}/financeiro/despesas-por-categoria`);
    const dados = await response.json();

    console.log('🍰 Dados recebidos:', dados);
    console.log('🍰 Estrutura completa:', JSON.stringify(dados, null, 2));
    console.log('🍰 Labels:', dados.labels);
    console.log('🍰 Valores:', dados.valores);
    console.log('🍰 Total:', dados.total);

    const ctx = canvas.getContext('2d');

    // Destrói gráfico anterior se existir
    if (despesasCategoriaChartInstance) {
      despesasCategoriaChartInstance.destroy();
    }

    // Cores para as categorias
    const cores = [
      '#0ab39c', // Verde
      '#f06548', // Vermelho
      '#405189', // Azul escuro
      '#f7b84b', // Amarelo
      '#299cdb', // Azul claro
      '#6559cc', // Roxo
      '#e83e8c', // Rosa
      '#50a5f1', // Azul
      '#74788d', // Cinza
      '#34c38f'  // Verde claro
    ];

    // Se não houver dados, mostra mensagem
    if (!dados.labels || dados.labels.length === 0) {
      
      const legendaEl = document.getElementById('despesasCategoriaLegenda');
      if (legendaEl) {
        legendaEl.innerHTML = '<span class="text-muted">Nenhuma despesa cadastrada este mês</span>';
      }
      return;
    }

    console.log('✅ Renderizando gráfico com', dados.labels.length, 'categorias');

    despesasCategoriaChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: dados.labels,
        datasets: [{
          data: dados.valores,
          backgroundColor: cores.slice(0, dados.labels.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                const valor = context.raw || 0;
                const porcentagem = dados.total > 0 ? ((valor / dados.total) * 100).toFixed(1) : 0;
                return `${context.label}: R$ ${valor.toLocaleString('pt-BR')} (${porcentagem}%)`;
              }
            }
          }
        }
      }
    });

    // Renderiza legenda customizada
    const legendaEl = document.getElementById('despesasCategoriaLegenda');
    if (legendaEl) {
      let legendaHtml = '';
      dados.labels.forEach((label, i) => {
        const valor = dados.valores[i] || 0;
        const porcentagem = dados.total > 0 ? ((valor / dados.total) * 100).toFixed(0) : 0;
        legendaHtml += `
          <div class="d-flex align-items-center gap-1">
            <span style="width: 10px;height: 10px;background: ${cores[i]};border-radius: 2px;"></span>
            <span>${label} (${porcentagem}%)</span>
          </div>
        `;
      });
      legendaEl.innerHTML = legendaHtml;
    }

    
  } catch (error) {
    console.error('❌ Erro ao carregar gráfico de despesas:', error);
  }
}

// Expor funções globalmente
window.inicializarFinanceiro = inicializarFinanceiro;
window.abrirModalNovaTransacao = abrirModalNovaTransacao;
window.atualizarCategoriasTransacao = atualizarCategoriasTransacao;
window.salvarTransacao = salvarTransacao;
window.editarTransacao = editarTransacao;
window.marcarTransacaoPaga = marcarTransacaoPaga;
window.marcarJobPago = marcarJobPago;
window.excluirTransacao = excluirTransacao;
window.filtrarTransacoes = filtrarTransacoes;
window.exportarFinanceiro = exportarFinanceiro;

// ============================================
// FUNÇÕES DE CONFIGURAÇÃO DE EMAIL
// ============================================

/**
 * Verifica status do email na aba sistema
 */
async function verificarStatusEmailSistema() {
  const container = document.getElementById('emailStatusContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="alert alert-info d-flex align-items-center">
      <div class="spinner-border spinner-border-sm me-2" role="status">
        <span class="visually-hidden">Verificando...</span>
      </div>
      <div>Verificando configuração de email...</div>
    </div>
  `;

  try {
    if (!window.emailService) {
      throw new Error('Serviço de email não carregado');
    }

    const status = await window.emailService.verificarStatus(true);

    if (status.success) {
      const alertClass = status.configurado ? 'alert-success' : 'alert-warning';
      const icon = status.configurado ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';

      container.innerHTML = `
        <div class="alert ${alertClass} d-flex align-items-center">
          <i class="bi ${icon} me-2 fs-5"></i>
          <div>
            <strong>${status.message}</strong><br>
            <small>${status.configurado ?
          'Email funcionando! Boas-vindas e notificações serão enviadas automaticamente.' :
          'Configure as variáveis de ambiente no Railway para habilitar emails automáticos.'
        }</small>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="alert alert-danger d-flex align-items-center">
          <i class="bi bi-x-circle-fill me-2 fs-5"></i>
          <div>
            <strong>❌ Erro ao verificar email</strong><br>
            <small>${status.message || 'Erro desconhecido'}</small>
          </div>
        </div>
      `;
    }
  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger d-flex align-items-center">
        <i class="bi bi-exclamation-octagon-fill me-2 fs-5"></i>
        <div>
          <strong>❌ Falha na conexão</strong><br>
          <small>${error.message}</small>
        </div>
      </div>
    `;
  }
}

/**
 * Abre ferramenta de teste de email
 */
function abrirTesteEmail() {
  if (window.emailService) {
    window.emailService.abrirTesteEmail();
  } else {
    const url = window.location.origin + '/email-teste.html';
    window.open(url, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
  }
}

// Auto-verificar status do email quando a aba Sistema for aberta
document.addEventListener('DOMContentLoaded', function () {
  // Observer para detectar quando a aba sistema é ativada
  const tabSistema = document.querySelector('[data-bs-target="#tab-sistema"]');
  if (tabSistema) {
    tabSistema.addEventListener('shown.bs.tab', function () {
      // Verificar status automaticamente quando a aba for aberta
      setTimeout(verificarStatusEmailSistema, 100);
    });
  }
});

// Expor funções globalmente
window.verificarStatusEmailSistema = verificarStatusEmailSistema;
window.abrirTesteEmail = abrirTesteEmail;

// ============================================
// FUNÇÕES DE DEBUG DE NOTIFICAÇÕES
// ============================================

/**
 * Testa sistema de notificações via interface
 */
async function testarSistemaNotificacoes() {
  const container = document.getElementById('notificacaoStatusContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="alert alert-info d-flex align-items-center">
      <div class="spinner-border spinner-border-sm me-2" role="status">
        <span class="visually-hidden">Testando...</span>
      </div>
      <div>Executando teste completo do sistema de notificações...</div>
    </div>
  `;

  try {
    // Executar teste via console e capturar resultado
    if (typeof window.debugNotificacoes === 'function') {
      
      await window.debugNotificacoes();

      container.innerHTML = `
        <div class="alert alert-success d-flex align-items-center">
          <i class="bi bi-check-circle-fill me-2 fs-5"></i>
          <div>
            <strong>✅ Teste executado com sucesso!</strong><br>
            <small>Verifique o console do navegador (F12) para ver detalhes completos.</small>
          </div>
        </div>
      `;
    } else {
      throw new Error('Função de debug não encontrada');
    }
  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger d-flex align-items-center">
        <i class="bi bi-exclamation-octagon-fill me-2 fs-5"></i>
        <div>
          <strong>❌ Erro no teste</strong><br>
          <small>${error.message}</small>
        </div>
      </div>
    `;
  }
}

/**
 * Força criação das tabelas de notificação
 */
async function criarTabelasNotificacoes() {
  const container = document.getElementById('notificacaoStatusContainer');
  if (!container) return;

  if (!confirm('Criar tabelas de notificação no banco? Esta operação é segura e não afeta dados existentes.')) {
    return;
  }

  container.innerHTML = `
    <div class="alert alert-info d-flex align-items-center">
      <div class="spinner-border spinner-border-sm me-2" role="status">
        <span class="visually-hidden">Criando...</span>
      </div>
      <div>Criando tabelas de notificação no banco de dados...</div>
    </div>
  `;

  try {
    const response = await fetch('/debug/criar-tabelas-notificacoes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (result.success) {
      container.innerHTML = `
        <div class="alert alert-success d-flex align-items-center">
          <i class="bi bi-check-circle-fill me-2 fs-5"></i>
          <div>
            <strong>✅ ${result.message}</strong><br>
            <small>${result.detalhes || 'Tabelas criadas/verificadas com sucesso!'}</small>
          </div>
        </div>
      `;
    } else {
      throw new Error(result.message || 'Erro desconhecido');
    }
  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger d-flex align-items-center">
        <i class="bi bi-x-circle-fill me-2 fs-5"></i>
        <div>
          <strong>❌ Erro ao criar tabelas</strong><br>
          <small>${error.message}</small>
        </div>
      </div>
    `;
  }
}

/**
 * Diagnóstica configurações SMTP via interface principal
 */
async function diagnosticarSMTPSistema() {
  const container = document.getElementById('emailStatusContainer');
  if (!container) return;

  if (!confirm('Diagnosticar configurações SMTP? Este teste pode levar até 2 minutos.')) {
    return;
  }

  container.innerHTML = `
    <div class="alert alert-info d-flex align-items-center">
      <div class="spinner-border spinner-border-sm me-2" role="status">
        <span class="visually-hidden">Diagnosticando...</span>
      </div>
      <div>Testando diferentes configurações SMTP... Aguarde até 2 minutos.</div>
    </div>
  `;

  try {
    const response = await fetch('/debug/testar-smtp-configs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success && data.configs) {
      const working = data.configs.filter(c => c.status === 'success');
      const failed = data.configs.filter(c => c.status === 'error');

      let alertClass = 'alert-success';
      let icon = 'bi-check-circle-fill';
      let title = '✅ Diagnóstico concluído!';

      if (working.length === 0) {
        alertClass = 'alert-danger';
        icon = 'bi-x-circle-fill';
        title = '❌ Nenhuma configuração funcionou';
      } else if (failed.length > 0) {
        alertClass = 'alert-warning';
        icon = 'bi-exclamation-triangle-fill';
        title = '⚠️ Algumas configurações funcionaram';
      }

      let html = `
        <div class="alert ${alertClass} d-flex align-items-start">
          <i class="bi ${icon} me-2 fs-5 mt-1"></i>
          <div class="flex-grow-1">
            <strong>${title}</strong><br>
            <small>${data.message}</small>
      `;

      if (working.length > 0) {
        html += `
            <div class="mt-2">
              <strong>✅ Funcionando:</strong><br>
        `;
        working.forEach(config => {
          html += `<span class="badge bg-success me-1">${config.name}</span>`;
        });
        html += '</div>';
      }

      if (failed.length > 0 && working.length > 0) {
        html += `
            <div class="mt-2">
              <strong>❌ Com problema:</strong><br>
        `;
        failed.forEach(config => {
          html += `<span class="badge bg-danger me-1">${config.name}</span>`;
        });
        html += '</div>';
      }

      if (data.recommendation) {
        html += `
            <div class="mt-3 p-2 bg-light rounded">
              <strong>🎯 Recomendação:</strong> Use <strong>${data.recommendation.name}</strong><br>
              <small>EMAIL_HOST=${data.recommendation.host}, EMAIL_PORT=${data.recommendation.port}</small>
            </div>
        `;
      }

      html += '</div></div>';
      container.innerHTML = html;

    } else {
      container.innerHTML = `
        <div class="alert alert-danger d-flex align-items-center">
          <i class="bi bi-exclamation-octagon-fill me-2 fs-5"></i>
          <div>
            <strong>❌ Erro no diagnóstico</strong><br>
            <small>${data.message || data.error || 'Erro desconhecido'}</small>
          </div>
        </div>
      `;
    }
  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger d-flex align-items-center">
        <i class="bi bi-wifi-off me-2 fs-5"></i>
        <div>
          <strong>❌ Falha na conexão</strong><br>
          <small>${error.message}</small>
        </div>
      </div>
    `;
  }
}

// Expor funções globalmente  
window.testarSistemaNotificacoes = testarSistemaNotificacoes;
window.criarTabelasNotificacoes = criarTabelasNotificacoes;
window.diagnosticarSMTPSistema = diagnosticarSMTPSistema;

// ============================================
// MÁSCARAS DE ENTRADA - FORMULÁRIO DE PEDIDO
// ============================================

/**
 * Aplica máscara de CEP: 00000-000
 */
function aplicarMascaraCEP(valor) {
  valor = valor.replace(/\D/g, "");
  if (valor.length <= 8) {
    valor = valor.replace(/^(\d{5})(\d)/, "$1-$2");
  }
  return valor;
}

/**
 * Aplica máscara de CPF ou CNPJ automaticamente
 * Detecta se é CPF (11 dígitos) ou CNPJ (14 dígitos)
 */
function aplicarMascaraCPFouCNPJ(valor) {
  valor = valor.replace(/\D/g, "");

  if (valor.length <= 11) {
    // CPF: 000.000.000-00
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    // CNPJ: 00.000.000/0000-00
    valor = valor.substring(0, 14); // Limita a 14 dígitos
    valor = valor.replace(/^(\d{2})(\d)/, "$1.$2");
    valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    valor = valor.replace(/\.(\d{3})(\d)/, ".$1/$2");
    valor = valor.replace(/(\d{4})(\d)/, "$1-$2");
  }

  return valor;
}

/**
 * Aplica máscara de telefone: (00) 00000-0000 ou (00) 0000-0000
 */
function aplicarMascaraTelefoneJob(valor) {
  valor = valor.replace(/\D/g, "");

  if (valor.length <= 10) {
    // Telefone fixo: (00) 0000-0000
    valor = valor.replace(/^(\d{2})(\d)/, "($1) $2");
    valor = valor.replace(/(\d{4})(\d)/, "$1-$2");
  } else {
    // Celular: (00) 00000-0000
    valor = valor.replace(/^(\d{2})(\d)/, "($1) $2");
    valor = valor.replace(/(\d{5})(\d)/, "$1-$2");
  }

  return valor;
}

/**
 * Inicializa as máscaras nos campos do formulário de pedido
 */
function inicializarMascarasFormularioJob() {
  

  // CEP
  const cepInput = document.getElementById('jobCep');
  if (cepInput) {
    cepInput.addEventListener('input', function () {
      this.value = aplicarMascaraCEP(this.value);
    });
    
  }

  // CNPJ/CPF do Pagador
  const cnpjCpfInput = document.getElementById('jobPagadorCNPJ');
  if (cnpjCpfInput) {
    cnpjCpfInput.addEventListener('input', function () {
      this.value = aplicarMascaraCPFouCNPJ(this.value);
    });
    
  }

  // Telefone do Solicitante
  const telSolicitante = document.getElementById('jobSolicitanteTelefone');
  if (telSolicitante) {
    telSolicitante.addEventListener('input', function () {
      this.value = aplicarMascaraTelefoneJob(this.value);
    });
    
  }

  // Telefone da Produção Local
  const telProducao = document.getElementById('jobProducaoContato');
  if (telProducao) {
    telProducao.addEventListener('input', function () {
      this.value = aplicarMascaraTelefoneJob(this.value);
    });
    
  }

  // CEP do Pagador (se existir)
  const cepPagador = document.getElementById('jobPagadorCep');
  if (cepPagador) {
    cepPagador.addEventListener('input', function () {
      this.value = aplicarMascaraCEP(this.value);
    });
    
  }

  
}

/**
 * Inicializa máscaras em TODOS os campos do sistema
 * Inclui: modais, formulários de cadastro, RH, etc.
 */
function inicializarTodasAsMascaras() {
  

  // 1. Máscaras de CEP
  const camposCep = [
    'cadCliCep',      // Cadastro de cliente
    'rhCep',          // RH
    'configCEP',      // Empresa (Configurações)
    'configCep'       // Funcionário (Configurações)
  ];

  camposCep.forEach(id => {
    const campo = document.getElementById(id);
    if (campo && !campo.dataset.mascaraAplicada) {
      campo.addEventListener('input', function () {
        this.value = aplicarMascaraCEP(this.value);
      });
      campo.dataset.mascaraAplicada = 'true';
      console.log(`  ✓ Máscara CEP aplicada em ${id}`);
    }
  });

  // 2. Máscaras de CPF/CNPJ
  const camposCpfCnpj = [
    'cadCliDoc',           // Cadastro de cliente
    'modalClienteCpfCnpj', // Modal novo cliente
    'modalFuncCpf',        // Modal novo funcionário
    'rhCpf'                // RH
  ];

  camposCpfCnpj.forEach(id => {
    const campo = document.getElementById(id);
    if (campo && !campo.dataset.mascaraAplicada) {
      campo.addEventListener('input', function () {
        this.value = aplicarMascaraCPFouCNPJ(this.value);
      });
      campo.dataset.mascaraAplicada = 'true';
      console.log(`  ✓ Máscara CPF/CNPJ aplicada em ${id}`);
    }
  });

  // 3. Máscaras de Telefone
  const camposTelefone = [
    'modalClienteTelefone', // Modal novo cliente
    'modalFuncTelefone',    // Modal novo funcionário
    'rhTelefone'            // RH
  ];

  camposTelefone.forEach(id => {
    const campo = document.getElementById(id);
    if (campo && !campo.dataset.mascaraAplicada) {
      campo.addEventListener('input', function () {
        this.value = aplicarMascaraTelefoneJob(this.value);
      });
      campo.dataset.mascaraAplicada = 'true';
      console.log(`  ✓ Máscara Telefone aplicada em ${id}`);
    }
  });

  // 4. Reinicializa máscaras do formulário de pedido
  inicializarMascarasFormularioJob();

  
}

// Inicializa as máscaras quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function () {
  inicializarMascarasFormularioJob();
  inicializarTodasAsMascaras();

  // Também reinicializa quando o modal de pedido é aberto
  const modalElement = document.getElementById('modalNovoJob');
  if (modalElement) {
    modalElement.addEventListener('shown.bs.modal', function () {
      setTimeout(inicializarMascarasFormularioJob, 100);
    });
  }

  // Reinicializa quando modal de novo cliente é aberto
  const modalCliente = document.getElementById('modalNovoCliente');
  if (modalCliente) {
    modalCliente.addEventListener('shown.bs.modal', function () {
      setTimeout(inicializarTodasAsMascaras, 100);
    });
  }

  // Reinicializa quando modal de novo funcionário é aberto
  const modalFunc = document.getElementById('modalNovoFuncionario');
  if (modalFunc) {
    modalFunc.addEventListener('shown.bs.modal', function () {
      setTimeout(inicializarTodasAsMascaras, 100);
    });
  }
});

// Expõe as funções globalmente
window.aplicarMascaraCEP = aplicarMascaraCEP;
window.aplicarMascaraCPFouCNPJ = aplicarMascaraCPFouCNPJ;
window.aplicarMascaraTelefoneJob = aplicarMascaraTelefoneJob;
window.inicializarMascarasFormularioJob = inicializarMascarasFormularioJob;
window.inicializarTodasAsMascaras = inicializarTodasAsMascaras;
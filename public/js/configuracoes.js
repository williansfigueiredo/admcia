/**
 * ============================================
 * CONFIGURAÇÕES - Perfil e Segurança
 * Integra front-end com dados do funcionário logado
 * ============================================
 */

// Detecta API URL
const CONFIG_API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : window.location.origin;

// Usuário logado (carregado via API)
let usuarioLogado = null;

/**
 * Carrega dados do usuário logado ao abrir Configurações
 */
async function carregarDadosPerfil() {
  const token = sessionStorage.getItem('auth_token');

  if (!token) {
    console.log('⚠️ Usuário não autenticado');
    return;
  }

  try {
    // 🔄 FORÇA BUSCAR DADOS FRESCOS DO SERVIDOR (ignora cache)
    const response = await fetch(`${CONFIG_API_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      credentials: 'include',
      cache: 'no-store' // Força não usar cache
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
      throw new Error('Erro ao carregar perfil');
    }

    const data = await response.json();

    if (data.success && data.usuario) {
      usuarioLogado = data.usuario;

      // 🐛 DEBUG: Mostra o que chegou do servidor
      console.log('📥 Dados recebidos do servidor:', {
        nome: data.usuario.nome,
        temAvatar: !!data.usuario.avatar,
        temAvatarBase64: !!data.usuario.avatar_base64,
        avatar_base64_preview: data.usuario.avatar_base64 ? data.usuario.avatar_base64.substring(0, 50) + '...' : 'NULO'
      });

      // Atualiza sessionStorage com dados frescos
      sessionStorage.setItem('usuario', JSON.stringify(data.usuario));

      preencherFormularioPerfil(usuarioLogado);
      controlarAbaSeguranca(usuarioLogado.is_master);

      console.log('✅ Perfil carregado:', usuarioLogado.nome);
    }
  } catch (error) {
    console.error('❌ Erro ao carregar perfil:', error);
  }
}

/**
 * Preenche o formulário de perfil com os dados do funcionário
 */
function preencherFormularioPerfil(usuario) {
  console.log('📝 Preenchendo formulário com:', usuario);

  // Avatar
  const avatarPreview = document.getElementById('configAvatarPreview');
  if (avatarPreview) {
    // Prioriza avatar_base64 (persiste no Railway) sobre avatar (arquivo local)
    let avatarUrl = null;

    if (usuario.avatar_base64) {
      avatarUrl = usuario.avatar_base64; // Já é uma data URL completa
      console.log('🖼️ Usando avatar_base64 (Railway)');
    } else if (usuario.avatar) {
      avatarUrl = usuario.avatar;
      // Se não começar com /, adiciona o caminho completo
      if (!avatarUrl.startsWith('/')) {
        avatarUrl = `/uploads/avatars/${avatarUrl}`;
      }
      // Adiciona timestamp para evitar cache
      avatarUrl += `?t=${Date.now()}`;
      console.log('🖼️ Usando avatar (caminho):', avatarUrl);
    } else {
      console.log('⚠️ Nenhum avatar encontrado!');
    }

    if (avatarUrl) {
      avatarPreview.innerHTML = `<img src="${avatarUrl}" alt="" class="config-avatar-img" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=config-avatar-initials>${usuario.nome ? usuario.nome.charAt(0).toUpperCase() : '?'}</div>';">`;
    } else {
      const iniciais = usuario.nome ? usuario.nome.charAt(0).toUpperCase() : '?';
      avatarPreview.innerHTML = `<div class="config-avatar-initials">${iniciais}</div>`;
    }
  }

  // Função auxiliar para formatar data
  const formatarData = (dataISO) => {
    if (!dataISO) return '';

    // Ignora datas inválidas comuns
    if (dataISO === '0000-00-00' || dataISO.startsWith('1901-') || dataISO.startsWith('1900-')) {
      return '';
    }

    const data = new Date(dataISO);
    // Verifica se é uma data válida
    if (isNaN(data.getTime())) return '';

    const ano = data.getFullYear();
    // Ignora anos muito antigos (provavelmente dados inválidos)
    if (ano < 1950) return '';

    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  // Campos do formulário
  const campos = {
    'configNome': usuario.nome || '',
    'configCpf': usuario.cpf || '',
    'configEmail': usuario.email || '',
    'configTelefone': usuario.telefone || '',
    'configCargo': usuario.cargo || '',
    'configDepartamento': usuario.departamento || '',
    'configStatus': usuario.status || 'Ativo',
    'configDataAdmissao': formatarData(usuario.data_admissao),
    'configDataDemissao': formatarData(usuario.data_demissao),
    'configCep': usuario.cep || '',
    'configLogradouro': usuario.logradouro || '',
    'configNumero': usuario.numero || '',
    'configBairro': usuario.bairro || '',
    'configCidade': usuario.cidade || '',
    'configUf': usuario.uf || '',
    'configObservacoes': usuario.observacoes || ''
  };

  for (const [id, valor] of Object.entries(campos)) {
    const el = document.getElementById(id);
    if (el) {
      el.value = valor;
      console.log(`  ${id}: "${valor}"`);
    }
  }

  // Email é somente leitura (não pode ser alterado)
  const emailInput = document.getElementById('configEmail');
  if (emailInput) {
    emailInput.readOnly = true;
    emailInput.classList.add('bg-light');
  }

  // Cargo é somente leitura (alterado via cadastro de funcionário)
  const cargoInput = document.getElementById('configCargo');
  if (cargoInput) {
    cargoInput.readOnly = true;
    cargoInput.classList.add('bg-light');
  }
}

/**
 * Controla visibilidade da aba Segurança (apenas Master)
 */
function controlarAbaSeguranca(isMaster) {
  // Seção de gerenciamento de acesso (dentro da tab-seguranca)
  const secaoGerenciamento = document.getElementById('secaoGerenciamentoAcesso');

  if (isMaster) {
    // Mostra seção de gerenciamento para Master
    if (secaoGerenciamento) {
      secaoGerenciamento.style.display = '';
    }

    // Carrega lista de funcionários para gerenciamento
    carregarFuncionariosParaAcesso();
  } else {
    // Esconde seção de gerenciamento para não-Masters
    if (secaoGerenciamento) {
      secaoGerenciamento.style.display = 'none';
    }
  }
}

/**
 * Salva alterações do perfil
 */
async function salvarPerfil() {
  const token = sessionStorage.getItem('auth_token');

  if (!token) {
    alert('Sessão expirada. Faça login novamente.');
    window.location.href = '/login';
    return;
  }

  // Função auxiliar para obter valor de data ou null se vazio
  const getDateValue = (id) => {
    const value = document.getElementById(id)?.value;
    return (value && value.trim() !== '') ? value.trim() : null;
  };

  const dados = {
    nome: document.getElementById('configNome')?.value?.trim(),
    cpf: document.getElementById('configCpf')?.value?.trim() || null,
    telefone: document.getElementById('configTelefone')?.value?.trim() || null,
    cargo: document.getElementById('configCargo')?.value?.trim() || null,
    departamento: document.getElementById('configDepartamento')?.value?.trim() || null,
    status: document.getElementById('configStatus')?.value || 'Ativo',
    data_admissao: getDateValue('configDataAdmissao'),
    data_demissao: getDateValue('configDataDemissao'),
    cep: document.getElementById('configCep')?.value?.trim() || null,
    logradouro: document.getElementById('configLogradouro')?.value?.trim() || null,
    numero: document.getElementById('configNumero')?.value?.trim() || null,
    bairro: document.getElementById('configBairro')?.value?.trim() || null,
    cidade: document.getElementById('configCidade')?.value?.trim() || null,
    uf: document.getElementById('configUf')?.value || null,
    observacoes: document.getElementById('configObservacoes')?.value?.trim() || null
  };

  if (!dados.nome) {
    alert('O nome é obrigatório.');
    return;
  }

  try {
    const response = await fetch(`${CONFIG_API_URL}/api/funcionarios/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify(dados)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert('✅ Perfil atualizado com sucesso!');

      // Atualiza dados locais
      usuarioLogado = { ...usuarioLogado, ...dados };
      sessionStorage.setItem('usuario', JSON.stringify(usuarioLogado));

      // Atualiza header
      if (typeof loadUserProfileData === 'function') {
        loadUserProfileData();
      }
    } else {
      alert('❌ ' + (result.error || 'Erro ao salvar perfil'));
    }
  } catch (error) {
    console.error('Erro ao salvar perfil:', error);
    alert('❌ Erro de conexão ao salvar perfil');
  }
}

/**
 * Upload de avatar
 */
async function uploadAvatar(file) {
  const token = sessionStorage.getItem('auth_token');

  if (!token) {
    alert('Sessão expirada. Faça login novamente.');
    return;
  }

  if (!file) return;

  // Validação de tamanho (2MB)
  if (file.size > 2 * 1024 * 1024) {
    alert('❌ Arquivo muito grande. Máximo 2MB.');
    return;
  }

  // Validação de tipo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    alert('❌ Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou GIF.');
    return;
  }

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const response = await fetch(`${CONFIG_API_URL}/api/funcionarios/me/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: formData
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert('✅ Foto atualizada!');

      // Atualiza preview com caminho completo
      const avatarPreview = document.getElementById('configAvatarPreview');
      if (avatarPreview && result.avatar) {
        // result.avatar já vem com caminho completo agora
        const avatarUrl = result.avatar.startsWith('/') ? result.avatar : `/uploads/avatars/${result.avatar}`;
        avatarPreview.innerHTML = `<img src="${avatarUrl}?t=${Date.now()}" alt="Avatar" class="config-avatar-img">`;
      }

      // Atualiza usuário local
      usuarioLogado.avatar = result.avatar;
      sessionStorage.setItem('usuario', JSON.stringify(usuarioLogado));

      // Atualiza header
      if (typeof loadUserProfileData === 'function') {
        loadUserProfileData();
      }
    } else {
      alert('❌ ' + (result.error || 'Erro ao fazer upload'));
    }
  } catch (error) {
    console.error('Erro no upload:', error);
    alert('❌ Erro de conexão ao fazer upload');
  }
}

/**
 * Remove avatar
 */
async function removerAvatar() {
  const token = sessionStorage.getItem('auth_token');

  if (!confirm('Tem certeza que deseja remover sua foto?')) return;

  try {
    const response = await fetch(`${CONFIG_API_URL}/api/funcionarios/me/avatar`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert('✅ Foto removida!');

      // Atualiza preview com iniciais
      const avatarPreview = document.getElementById('configAvatarPreview');
      const iniciais = usuarioLogado?.nome?.charAt(0)?.toUpperCase() || '?';
      if (avatarPreview) {
        avatarPreview.innerHTML = `<div class="config-avatar-initials">${iniciais}</div>`;
      }

      // Atualiza usuário local
      usuarioLogado.avatar = null;
      sessionStorage.setItem('usuario', JSON.stringify(usuarioLogado));

      // Atualiza header
      if (typeof loadUserProfileData === 'function') {
        loadUserProfileData();
      }
    } else {
      alert('❌ ' + (result.error || 'Erro ao remover foto'));
    }
  } catch (error) {
    console.error('Erro ao remover avatar:', error);
    alert('❌ Erro de conexão');
  }
}

/**
 * Altera a própria senha
 */
async function alterarSenha() {
  const token = sessionStorage.getItem('auth_token');

  const senhaAtual = document.getElementById('configSenhaAtual')?.value;
  const novaSenha = document.getElementById('configNovaSenha')?.value;
  const confirmarSenha = document.getElementById('configConfirmarSenha')?.value;

  if (!senhaAtual || !novaSenha || !confirmarSenha) {
    alert('Preencha todos os campos de senha.');
    return;
  }

  if (novaSenha !== confirmarSenha) {
    alert('A nova senha e a confirmação não conferem.');
    return;
  }

  if (novaSenha.length < 6) {
    alert('A nova senha deve ter pelo menos 6 caracteres.');
    return;
  }

  try {
    const response = await fetch(`${CONFIG_API_URL}/api/auth/alterar-senha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({ senhaAtual, novaSenha })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Limpa campos
      document.getElementById('configSenhaAtual').value = '';
      document.getElementById('configNovaSenha').value = '';
      document.getElementById('configConfirmarSenha').value = '';

      // Faz logout completo - limpa TODOS os dados de sessão local
      sessionStorage.clear();
      sessionStorage.clear();

      alert('✅ Senha alterada com sucesso! Você será redirecionado para fazer login novamente.');

      // Redireciona para a rota de logout do servidor (que limpa o cookie e redireciona para login)
      window.location.href = '/auth/logout';
    } else {
      alert('❌ ' + (result.error || 'Erro ao alterar senha'));
    }
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    alert('❌ Erro de conexão');
  }
}

// ============================================
// FUNÇÕES MASTER - GERENCIAMENTO DE ACESSO
// ============================================

/**
 * Carrega lista de funcionários para gerenciamento de acesso
 */
async function carregarFuncionariosParaAcesso() {
  const token = sessionStorage.getItem('auth_token');
  const container = document.getElementById('listaControleAcessoMaster');

  if (!container) return;

  try {
    const response = await fetch(`${CONFIG_API_URL}/api/funcionarios/lista-acesso`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 403) {
        container.innerHTML = `
          <tr>
            <td colspan="5" class="text-center text-muted py-4">
              <i class="bi bi-shield-lock me-2"></i>Acesso restrito a administradores
            </td>
          </tr>
        `;
        return;
      }
      throw new Error('Erro ao carregar funcionários');
    }

    const data = await response.json();

    if (data.success && data.funcionarios) {
      renderizarTabelaAcesso(data.funcionarios);
    }
  } catch (error) {
    console.error('Erro ao carregar funcionários:', error);
    container.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger py-4">
          <i class="bi bi-exclamation-circle me-2"></i>Erro ao carregar funcionários
        </td>
      </tr>
    `;
  }
}

/**
 * Renderiza tabela de controle de acesso
 */
function renderizarTabelaAcesso(funcionarios) {
  const container = document.getElementById('listaControleAcessoMaster');
  if (!container) return;

  if (funcionarios.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">
          Nenhum funcionário cadastrado
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = funcionarios.map(f => {
    // Status badge
    let statusBadge = '';
    if (f.data_demissao) {
      statusBadge = '<span class="badge bg-danger">Demitido</span>';
    } else if (!f.acesso_ativo) {
      statusBadge = '<span class="badge bg-secondary">Bloqueado</span>';
    } else if (!f.tem_senha) {
      statusBadge = '<span class="badge bg-warning text-dark">Sem senha</span>';
    } else {
      statusBadge = '<span class="badge bg-success">Ativo</span>';
    }

    // Master badge
    const masterBadge = f.is_master
      ? '<span class="badge bg-purple ms-1" title="Administrador"><i class="bi bi-star-fill"></i></span>'
      : '';

    // Avatar - lidar com caminho completo ou só nome
    const avatarSrc = f.avatar
      ? (f.avatar.startsWith('/') ? f.avatar : `/uploads/avatars/${f.avatar}`)
      : null;
    const avatar = avatarSrc
      ? `<img src="${avatarSrc}" class="rounded-circle me-2" width="32" height="32" style="object-fit:cover;">`
      : `<div class="rounded-circle bg-secondary text-white d-inline-flex align-items-center justify-content-center me-2" style="width:32px;height:32px;font-size:0.8rem;">${f.nome?.charAt(0)?.toUpperCase() || '?'}</div>`;

    // Botões de ação
    let acoes = '';

    // Não permite editar a si mesmo (algumas ações)
    const isCurrentUser = usuarioLogado && f.id === usuarioLogado.id;

    if (!isCurrentUser) {
      // Botão ativar/desativar acesso
      if (!f.data_demissao) {
        if (f.acesso_ativo) {
          acoes += `<button class="btn btn-sm btn-outline-danger me-1" onclick="toggleAcesso(${f.id}, false)" title="Bloquear acesso"><i class="bi bi-lock"></i></button>`;
        } else {
          acoes += `<button class="btn btn-sm btn-outline-success me-1" onclick="toggleAcesso(${f.id}, true)" title="Liberar acesso"><i class="bi bi-unlock"></i></button>`;
        }
      }

      // Botão definir/resetar senha
      if (!f.tem_senha) {
        acoes += `<button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalDefinirSenha(${f.id}, '${f.nome}')" title="Definir senha"><i class="bi bi-key"></i></button>`;
      } else {
        acoes += `<button class="btn btn-sm btn-outline-warning me-1" onclick="resetarSenha(${f.id}, '${f.nome}')" title="Resetar senha"><i class="bi bi-arrow-clockwise"></i></button>`;
      }

      // Botão Master
      if (f.is_master) {
        acoes += `<button class="btn btn-sm btn-outline-secondary" onclick="toggleMaster(${f.id}, false, '${f.nome}')" title="Remover Admin"><i class="bi bi-star"></i></button>`;
      } else {
        acoes += `<button class="btn btn-sm btn-purple" onclick="toggleMaster(${f.id}, true, '${f.nome}')" title="Tornar Admin"><i class="bi bi-star-fill"></i></button>`;
      }
    } else {
      acoes = '<span class="text-muted small">Você</span>';
    }

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            ${avatar}
            <div>
              <div class="fw-bold">${f.nome}${masterBadge}</div>
              <small class="text-muted">${f.email || 'Sem email'}</small>
            </div>
          </div>
        </td>
        <td>${f.cargo || '-'}</td>
        <td>${statusBadge}</td>
        <td class="text-center">
          ${f.acesso_ativo && !f.data_demissao
        ? '<i class="bi bi-check-circle text-success"></i>'
        : '<i class="bi bi-x-circle text-danger"></i>'}
        </td>
        <td class="text-center">${acoes}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Ativa/desativa acesso de um funcionário
 */
async function toggleAcesso(id, ativar) {
  const token = sessionStorage.getItem('auth_token');

  try {
    const response = await fetch(`${CONFIG_API_URL}/api/funcionarios/${id}/acesso`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({ acesso_ativo: ativar })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      carregarFuncionariosParaAcesso(); // Recarrega tabela
    } else {
      alert('❌ ' + (result.error || 'Erro ao alterar acesso'));
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('❌ Erro de conexão');
  }
}

/**
 * Promove/rebaixa Master
 */
async function toggleMaster(id, promover, nome) {
  const token = sessionStorage.getItem('auth_token');

  const acao = promover ? 'promover a Administrador' : 'remover permissão de Administrador';
  if (!confirm(`Tem certeza que deseja ${acao} o funcionário ${nome}?`)) return;

  try {
    console.log('🔄 Iniciando toggle master para ID:', id, 'Promover:', promover);

    const response = await fetch(`${CONFIG_API_URL}/api/funcionarios/${id}/master`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({ is_master: promover })
    });

    console.log('📩 Status da resposta:', response.status);
    console.log('📩 Headers da resposta:', response.headers.get('content-type'));

    const result = await response.json();
    console.log('📦 Resultado:', result);

    if (response.ok && result.success) {
      carregarFuncionariosParaAcesso(); // Recarrega tabela
    } else {
      console.error('❌ Erro na resposta:', result);
      alert('❌ ' + (result.error || 'Erro ao alterar permissão'));
    }
  } catch (error) {
    console.error('❌ Erro no catch:', error);
    alert('❌ Erro de conexão');
  }
}

/**
 * Abre modal para definir senha
 */
function abrirModalDefinirSenha(id, nome) {
  const senha = prompt(`Digite a senha inicial para ${nome}:\n(mínimo 6 caracteres)`);

  if (!senha) return;

  if (senha.length < 6) {
    alert('A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  definirSenhaFuncionario(id, senha);
}

/**
 * Define senha para um funcionário
 */
async function definirSenhaFuncionario(id, senha) {
  const token = sessionStorage.getItem('auth_token');

  try {
    const response = await fetch(`${CONFIG_API_URL}/api/funcionarios/${id}/definir-senha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({ senha })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert('✅ Senha definida com sucesso!');
      carregarFuncionariosParaAcesso(); // Recarrega tabela
    } else {
      alert('❌ ' + (result.error || 'Erro ao definir senha'));
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('❌ Erro de conexão');
  }
}

/**
 * Reseta senha de um funcionário
 */
async function resetarSenha(id, nome) {
  const token = sessionStorage.getItem('auth_token');

  if (!confirm(`Resetar senha de ${nome}?\n\nUma senha temporária será gerada.`)) return;

  try {
    console.log('🔄 Iniciando reset de senha para ID:', id);

    const response = await fetch(`${CONFIG_API_URL}/api/funcionarios/${id}/reset-senha`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });

    console.log('📩 Status da resposta:', response.status);
    console.log('📩 Headers da resposta:', response.headers.get('content-type'));

    const result = await response.json();
    console.log('📦 Resultado:', result);

    if (response.ok && result.success) {
      alert(`✅ Senha resetada!\n\nSenha temporária: ${result.senha_temporaria}\n\nInforme ao funcionário para trocar no primeiro acesso.`);
      carregarFuncionariosParaAcesso(); // Recarrega tabela
    } else {
      console.error('❌ Erro na resposta:', result);
      alert('❌ ' + (result.error || 'Erro ao resetar senha'));
    }
  } catch (error) {
    console.error('❌ Erro no catch:', error);
    alert('❌ Erro de conexão');
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', function () {
  // Input de avatar
  const avatarInput = document.getElementById('configAvatarInput');
  if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        uploadAvatar(e.target.files[0]);
      }
    });
  }

  // Formulário de perfil
  const formPerfil = document.getElementById('formEditarPerfil');
  if (formPerfil) {
    formPerfil.addEventListener('submit', (e) => {
      e.preventDefault();
      salvarPerfil();
    });
  }

  // Carrega perfil quando a aba de configurações é mostrada
  const tabConfiguracoes = document.getElementById('view-configuracoes');
  if (tabConfiguracoes) {
    // Observer para detectar quando as configurações ficam visíveis
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (tabConfiguracoes.classList.contains('active')) {
            carregarDadosPerfil();
            inicializarListenersConfiguracao(); // Inicializa listeners quando a aba é aberta
          }
        }
      });
    });

    observer.observe(tabConfiguracoes, { attributes: true });
  }

  // Se já estiver na página de configurações, carrega
  if (document.getElementById('view-configuracoes')?.classList.contains('active')) {
    carregarDadosPerfil();
    inicializarListenersConfiguracao(); // Inicializa listeners se já estiver aberto
  }

  // Também tenta carregar após pequeno delay (fallback)
  setTimeout(() => {
    if (document.getElementById('view-configuracoes')?.classList.contains('active')) {
      carregarDadosPerfil();
    }
  }, 500);
});

/**
 * ============================================
 * BUSCA DE ENDEREÇO POR CEP
 * ============================================
 */

/**
 * Busca endereço pelo CEP usando ViaCEP (para perfil de funcionário)
 */
async function buscarEnderecoPorCEP(cep, tipo = 'perfil') {
  const cepLimpo = cep.replace(/\D/g, "");
  
  if (cepLimpo.length !== 8) {
    return;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response.json();
    
    if (data.erro) {
      console.warn('CEP não encontrado');
      return;
    }

    // Preenche os campos de acordo com o tipo (perfil ou empresa)
    if (tipo === 'perfil') {
      document.getElementById('configLogradouro').value = data.logradouro || "";
      document.getElementById('configBairro').value = data.bairro || "";
      document.getElementById('configCidade').value = data.localidade || "";
      document.getElementById('configUf').value = data.uf || "";
    } else if (tipo === 'empresa') {
      // Para empresa, os IDs são únicos
      const logradouroEmpresa = document.getElementById('configLogradouroEmpresa');
      const bairroEmpresa = document.getElementById('configBairroEmpresa');
      const cidadeEmpresa = document.getElementById('configCidadeEmpresa');
      const estadoEmpresa = document.getElementById('configEstadoEmpresa');
      
      if (logradouroEmpresa) logradouroEmpresa.value = data.logradouro || "";
      if (bairroEmpresa) bairroEmpresa.value = data.bairro || "";
      if (cidadeEmpresa) cidadeEmpresa.value = data.localidade || "";
      if (estadoEmpresa) estadoEmpresa.value = data.uf || "";
    }
    
    console.log('✅ Endereço preenchido via CEP');
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
  }
}

/**
 * ============================================
 * MÁSCARAS E VALIDAÇÃO - CPF/CNPJ
 * ============================================
 */

/**
 * Aplica máscara de CPF: 000.000.000-00
 */
function aplicarMascaraCPF(valor) {
  valor = valor.replace(/\D/g, "");
  if (valor.length <= 11) {
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return valor;
}

/**
 * Aplica máscara de CNPJ: 00.000.000/0000-00
 */
function aplicarMascaraCNPJ(valor) {
  valor = valor.replace(/\D/g, "");
  if (valor.length <= 14) {
    valor = valor.replace(/^(\d{2})(\d)/, "$1.$2");
    valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    valor = valor.replace(/\.(\d{3})(\d)/, ".$1/$2");
    valor = valor.replace(/(\d{4})(\d)/, "$1-$2");
  }
  return valor;
}

/**
 * Valida CPF
 */
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, "");
  
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  
  let soma = 0;
  let resto;
  
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  
  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
}

/**
 * Valida CNPJ
 */
function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, "");
  
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }
  
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != digitos.charAt(0)) return false;
  
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != digitos.charAt(1)) return false;
  
  return true;
}

/**
 * Aplica validação visual ao campo CPF/CNPJ
 */
function validarEVisualizarDocumento(input, tipo) {
  const valor = input.value.replace(/\D/g, "");
  
  // Remove classes anteriores
  input.classList.remove('is-valid', 'is-invalid', 'border-warning');
  
  if (valor.length === 0) {
    return; // Campo vazio, sem validação
  }
  
  let valido = false;
  
  if (tipo === 'cpf') {
    if (valor.length < 11) {
      input.classList.add('border-warning');
    } else {
      valido = validarCPF(valor);
      input.classList.add(valido ? 'is-valid' : 'is-invalid');
    }
  } else if (tipo === 'cnpj') {
    if (valor.length < 14) {
      input.classList.add('border-warning');
    } else {
      valido = validarCNPJ(valor);
      input.classList.add(valido ? 'is-valid' : 'is-invalid');
    }
  }
}

/**
 * ============================================
 * MÁSCARAS - TELEFONE
 * ============================================
 */

/**
 * Aplica máscara de telefone: (00) 00000-0000 ou (00) 0000-0000
 */
function aplicarMascaraTelefone(valor) {
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
 * ============================================
 * INICIALIZAÇÃO DOS LISTENERS
 * ============================================
 */

/**
 * Inicializa os listeners para os campos de configuração
 */
function inicializarListenersConfiguracao() {
  // CEP - Perfil do funcionário
  const cepPerfil = document.getElementById('configCep');
  if (cepPerfil) {
    cepPerfil.addEventListener('blur', function() {
      buscarEnderecoPorCEP(this.value, 'perfil');
    });
  }
  
  // CEP - Empresa
  const cepEmpresa = document.getElementById('configCEP');
  if (cepEmpresa) {
    cepEmpresa.addEventListener('blur', function() {
      buscarEnderecoPorCEP(this.value, 'empresa');
    });
  }
  
  // CPF - Perfil do funcionário
  const cpfInput = document.getElementById('configCpf');
  if (cpfInput) {
    cpfInput.addEventListener('input', function(e) {
      this.value = aplicarMascaraCPF(this.value);
    });
    cpfInput.addEventListener('blur', function() {
      validarEVisualizarDocumento(this, 'cpf');
    });
  }
  
  // CNPJ - Empresa
  const cnpjInput = document.getElementById('configCNPJ');
  if (cnpjInput) {
    cnpjInput.addEventListener('input', function(e) {
      this.value = aplicarMascaraCNPJ(this.value);
    });
    cnpjInput.addEventListener('blur', function() {
      validarEVisualizarDocumento(this, 'cnpj');
    });
  }
  
  // Telefone - Perfil do funcionário
  const telefonePerfil = document.getElementById('configTelefone');
  if (telefonePerfil) {
    telefonePerfil.addEventListener('input', function(e) {
      this.value = aplicarMascaraTelefone(this.value);
    });
  }
  
  // Telefone - Empresa
  const telefoneEmpresa = document.getElementById('configTelefoneEmpresa');
  if (telefoneEmpresa) {
    telefoneEmpresa.addEventListener('input', function(e) {
      this.value = aplicarMascaraTelefone(this.value);
    });
  }
  
  console.log('✅ Listeners de configuração inicializados');
}

// Inicializa os listeners quando a configuração é aberta
document.addEventListener('DOMContentLoaded', function() {
  // Aguarda um pouco para garantir que os elementos estão no DOM
  setTimeout(inicializarListenersConfiguracao, 100);
});

// Expõe funções globalmente
window.carregarDadosPerfil = carregarDadosPerfil;
window.salvarPerfil = salvarPerfil;
window.uploadAvatar = uploadAvatar;
window.removerAvatar = removerAvatar;
window.alterarSenha = alterarSenha;
window.carregarFuncionariosParaAcesso = carregarFuncionariosParaAcesso;
window.toggleAcesso = toggleAcesso;
window.toggleMaster = toggleMaster;
window.abrirModalDefinirSenha = abrirModalDefinirSenha;
window.definirSenhaFuncionario = definirSenhaFuncionario;
window.resetarSenha = resetarSenha;
window.buscarEnderecoPorCEP = buscarEnderecoPorCEP;
window.inicializarListenersConfiguracao = inicializarListenersConfiguracao;


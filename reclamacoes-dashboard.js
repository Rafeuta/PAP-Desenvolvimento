// Gestão de reclamações — FindIT School
(function () {
  const table = document.getElementById('tabela-reclamacoes');
  if (!table) return;

  let reclamacoes = [];
  const msg = document.getElementById('reclamacoes-mensagem');
  const search = document.getElementById('pesquisa-reclamacoes');
  const filter = document.getElementById('filtro-reclamacoes');

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  const dataFormatada = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-PT');
  };

  function render() {
    const termo = (search?.value || '').trim().toLocaleLowerCase('pt-PT');
    const estado = filter?.value || 'Todas';
    const rows = reclamacoes.filter(r => {
      const correspondeEstado = estado === 'Todas' || r.estado === estado;
      const texto = [r.nome, r.email, r.turma, r.objeto_titulo, r.justificacao].join(' ').toLocaleLowerCase('pt-PT');
      return correspondeEstado && (!termo || texto.includes(termo));
    });

    if (!rows.length) {
      table.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">Não existem reclamações para apresentar.</td></tr>';
      return;
    }

    table.innerHTML = rows.map(r => {
      const badge = r.estado === 'Aprovado'
        ? 'bg-green-100 text-green-700'
        : r.estado === 'Rejeitado'
          ? 'bg-red-100 text-red-700'
          : 'bg-orange-100 text-orange-700';
      const actions = r.estado === 'Pendente'
        ? '<div class="flex justify-end gap-2"><button type="button" data-decision="Aprovado" data-id="' + esc(r.id) + '" class="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700">Aprovar</button><button type="button" data-decision="Rejeitado" data-id="' + esc(r.id) + '" class="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700">Rejeitar</button></div>'
        : '<span class="text-xs text-gray-400">Decidido em ' + esc(dataFormatada(r.decidido_em)) + '</span>';
      return '<tr>' +
        '<td class="px-4 py-3 whitespace-nowrap text-xs text-gray-500">' + esc(dataFormatada(r.data_pedido)) + '</td>' +
        '<td class="px-4 py-3 min-w-[170px]"><p class="font-semibold text-gray-800">' + esc(r.nome) + '</p><p class="text-xs text-gray-500">' + esc(r.email) + '</p><p class="text-xs text-gray-400">' + esc(r.turma) + '</p></td>' +
        '<td class="px-4 py-3 font-semibold text-gray-800 min-w-[130px]">' + esc(r.objeto_titulo) + '</td>' +
        '<td class="px-4 py-3 min-w-[220px] max-w-sm"><p class="text-gray-600 whitespace-pre-wrap break-words" title="' + esc(r.justificacao) + '">' + esc(r.justificacao) + '</p>' +
        (r.observacoes_decisao ? '<p class="mt-1 text-xs text-gray-400">Nota: ' + esc(r.observacoes_decisao) + '</p>' : '') + '</td>' +
        '<td class="px-4 py-3"><span class="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ' + badge + '">' + esc(r.estado || 'Pendente') + '</span></td>' +
        '<td class="px-4 py-3 text-right whitespace-nowrap">' + actions + '</td>' +
        '</tr>';
    }).join('');
  }

  async function carregar() {
    msg.textContent = 'A carregar reclamações...';
    table.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">A carregar...</td></tr>';
    const { data, error } = await supabaseClient
      .from('reclamacoes')
      .select('*')
      .order('data_pedido', { ascending: false });

    if (error) {
      console.error('Erro ao carregar reclamações:', error);
      msg.textContent = 'Não foi possível carregar as reclamações. Confirma as permissões da conta e a configuração da tabela no Supabase.';
      table.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-red-500">Erro ao carregar os pedidos.</td></tr>';
      return;
    }
    reclamacoes = data || [];
    msg.textContent = reclamacoes.length + (reclamacoes.length === 1 ? ' reclamação registada.' : ' reclamações registadas.');
    render();
  }

  table.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-decision]');
    if (!button) return;
    const id = button.dataset.id;
    const estado = button.dataset.decision;
    const pedido = reclamacoes.find(r => String(r.id) === String(id));
    if (!pedido || pedido.estado !== 'Pendente') return;

    const pergunta = estado === 'Aprovado'
      ? 'Confirma que a escola analisou o pedido e pretende marcá-lo como aprovado? Isto não confirma por si só a propriedade do objeto.'
      : 'Indica o motivo da rejeição do pedido:';
    const nota = window.prompt(pergunta, '');
    if (nota === null) return;
    if (estado === 'Rejeitado' && !nota.trim()) {
      alert('Indica um motivo para rejeitar o pedido.');
      return;
    }
    if (!window.confirm('Registar a decisão «' + estado + '»?')) return;

    button.disabled = true;
    button.textContent = 'A guardar...';
    const { data: authData } = await supabaseClient.auth.getUser();
    const { error } = await supabaseClient
      .from('reclamacoes')
      .update({
        estado,
        decidido_em: new Date().toISOString(),
        decidido_por: authData?.user?.id || null,
        observacoes_decisao: nota.trim() || null
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao guardar decisão:', error);
      alert('Não foi possível guardar a decisão. Verifica as permissões e tenta novamente.');
      button.disabled = false;
      button.textContent = estado === 'Aprovado' ? 'Aprovar' : 'Rejeitar';
      return;
    }
    if (typeof mostrarNotificacao === 'function') {
      mostrarNotificacao('Decisão registada', 'O pedido foi marcado como ' + estado.toLowerCase() + '.');
    }
    await carregar();
  });

  search?.addEventListener('input', render);
  filter?.addEventListener('change', render);
  document.getElementById('btn-atualizar-reclamacoes')?.addEventListener('click', carregar);
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error || !data?.session) {
      msg.textContent = 'Inicia sessão com uma conta de funcionário para consultar as reclamações.';
      table.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">Sessão necessária.</td></tr>';
      return;
    }
    carregar();
  });
})();

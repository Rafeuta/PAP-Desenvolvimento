/* FindIT School — melhorias progressivas do painel administrativo */
(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const safeText = (value) => String(value ?? '').toLocaleLowerCase('pt-PT');

  function addToolbar(sectionId, tableId, options = {}) {
    const section = byId(sectionId);
    const table = byId(tableId);
    if (!section || !table || section.querySelector('.fit-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'fit-toolbar';
    toolbar.innerHTML = `
      <label class="sr-only" for="${options.searchId}">${options.placeholder}</label>
      <input id="${options.searchId}" type="search" placeholder="${options.placeholder}" autocomplete="off">
      ${options.status ? '<label class="sr-only" for="fit-object-status">Filtrar por estado</label><select id="fit-object-status"><option value="">Todos os estados</option><option value="Achado">Achados</option><option value="Devolvido">Devolvidos</option></select>' : ''}
      <span class="text-xs text-slate-500" id="${options.countId}" aria-live="polite"></span>
    `;
    table.parentElement.parentElement.insertBefore(toolbar, table.parentElement);
    const search = byId(options.searchId);
    const status = options.status ? byId('fit-object-status') : null;
    const count = byId(options.countId);

    const filter = () => {
      const query = safeText(search.value).trim();
      const selectedStatus = status?.value || '';
      let visible = 0;
      table.querySelectorAll('tbody tr').forEach((row) => {
        const text = safeText(row.textContent);
        const statusMatches = !selectedStatus || text.includes(safeText(selectedStatus));
        const matches = (!query || text.includes(query)) && statusMatches;
        row.hidden = !matches;
        if (matches) visible++;
      });
      if (count) count.textContent = `${visible} registo(s)`;
    };
    search.addEventListener('input', filter);
    status?.addEventListener('change', filter);
    new MutationObserver(filter).observe(table.querySelector('tbody') || table, {childList:true,subtree:true});
  }

  function addStatistics() {
    const main = document.querySelector('.main-content main');
    if (!main || byId('fit-statistics')) return;
    const grid = document.createElement('section');
    grid.id = 'fit-statistics';
    grid.className = 'fit-stat-grid';
    grid.setAttribute('aria-label','Resumo do sistema');
    grid.innerHTML = [
      ['Objetos registados','—','Total de registos','OBJ'],
      ['Por devolver','—','Aguardam recuperação','AB'],
      ['Devolvidos','—','Recuperações concluídas','OK'],
      ['Contactos','—','Destinatários na lista','@']
    ].map((item,i)=>`<article class="fit-stat"><div class="flex items-center justify-between gap-3"><span class="fit-stat-label">${item[0]}</span><span class="fit-stat-mark" aria-hidden="true">${item[3]}</span></div><div class="fit-stat-value" id="fit-stat-${i}">${item[1]}</div><p class="fit-stat-note">${item[2]}</p></article>`).join('');
    main.insertBefore(grid, main.firstElementChild);
    refreshStatistics();
  }

  async function refreshStatistics() {
    if (typeof supabaseClient === 'undefined') return;
    try {
      const [objectsResult, contactsResult] = await Promise.all([
        supabaseClient.from('objetos').select('estado'),
        supabaseClient.from('contactos_email').select('id',{count:'exact',head:true})
      ]);
      if (objectsResult.error) throw objectsResult.error;
      const objects = objectsResult.data || [];
      const found = objects.filter(o => o.estado === 'Achado').length;
      const returned = objects.filter(o => o.estado === 'Devolvido').length;
      const values = [objects.length,found,returned,contactsResult.count ?? '—'];
      values.forEach((value,i)=>{const el=byId('fit-stat-'+i);if(el)el.textContent=String(value)});
    } catch (error) {
      console.warn('Não foi possível atualizar os indicadores do FindIT:',error);
    }
  }

  function improveSelectionModal() {
    const container = byId('lista-checkboxes-container');
    const selectAll = byId('check-todos');
    if (!container || !selectAll) return;
    const sync = () => {
      const boxes = [...container.querySelectorAll('.email-checkbox')];
      const checked = boxes.filter(box=>box.checked).length;
      selectAll.checked = boxes.length > 0 && checked === boxes.length;
      selectAll.indeterminate = checked > 0 && checked < boxes.length;
    };
    container.addEventListener('change',(event)=>{
      if(event.target.matches('.email-checkbox')) sync();
    });
    const observer = new MutationObserver(sync);
    observer.observe(container,{childList:true,subtree:true});
  }

  function closeModalWithEscape() {
    document.addEventListener('keydown',(event)=>{
      if(event.key !== 'Escape') return;
      document.querySelectorAll('[id^="modal-"]:not(.hidden)').forEach(modal=>{
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      });
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{
    addStatistics();
    addToolbar('objetos','tabela-corpo',{searchId:'fit-search-objects',placeholder:'Pesquisar objeto, categoria ou local…',status:true,countId:'fit-object-count'});
    addToolbar('contactos','tabela-contactos',{searchId:'fit-search-contacts',placeholder:'Pesquisar nome, email ou turma…',countId:'fit-contact-count'});
    improveSelectionModal();
    closeModalWithEscape();
  });
})();

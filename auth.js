// auth.js

const SUPABASE_URL = 'https://kswqakffuudugnfudizg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XM9rWUkcESRXVrKFFlgNDA_VZ8XgXJl';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let categoriaAtiva = 'Todos';

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

const modal = document.getElementById('modal-login');

function abrirModal() {
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const content = document.getElementById('modal-content');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        if (content) {
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }
    }, 10);
}

function fecharModal() {
    if (!modal) return;
    const content = document.getElementById('modal-content');
    modal.classList.add('opacity-0');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        const msgErro = document.getElementById('msg-erro');
        if (msgErro) msgErro.classList.add('hidden');
    }, 300);
}

function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
}

document.addEventListener('click', function(event) {
    const userMenu = document.getElementById('user-menu-container');
    const dropdown = document.getElementById('user-dropdown');
    if (userMenu && !userMenu.contains(event.target) && dropdown) {
        dropdown.classList.add('hidden');
    }
});

async function fazerLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msgErro = document.getElementById('msg-erro');
    const msgTexto = document.getElementById('msg-erro-texto');

    if (!email || !password) {
        if (msgTexto) msgTexto.textContent = "Preenche o email e a password.";
        else if (msgErro) msgErro.textContent = "Preenche o email e a password.";
        msgErro?.classList.remove('hidden');
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        if (msgTexto) msgTexto.textContent = "Erro: Credenciais inválidas. Tenta novamente.";
        else if (msgErro) msgErro.textContent = "Erro: Credenciais inválidas. Tenta novamente.";
        msgErro?.classList.remove('hidden');
        return;
    }

    const { data: perfil, error: perfilError } = await supabaseClient
        .from('utilizadores')
        .select('cargo')
        .eq('id', data.user.id)
        .maybeSingle();

    if (perfilError || !perfil || !['admin', 'funcionario'].includes(perfil.cargo)) {
        await supabaseClient.auth.signOut();
        const aviso = 'A conta ainda não tem um perfil de acesso válido. Contacta o responsável pelo FindIT School.';
        if (msgTexto) msgTexto.textContent = aviso;
        else if (msgErro) msgErro.textContent = aviso;
        msgErro?.classList.remove('hidden');
        return;
    }

    window.location.href = perfil.cargo === 'admin' ? 'admin.html' : 'dashboard.html';
}

async function fazerLogout() {
    await supabaseClient.auth.signOut();
    window.location.reload();
}

function atualizarInterface(user) {
    const btnLogin = document.getElementById('btn-login-nav');
    const userMenu = document.getElementById('user-menu-container');

    if (user) {
        if (btnLogin) {
            btnLogin.classList.add('hidden');
            btnLogin.classList.remove('flex');
            btnLogin.classList.remove('md:flex');
            btnLogin.style.display = 'none';
        }
        if (userMenu) userMenu.classList.remove('hidden');
    } else {
        if (btnLogin) {
            btnLogin.classList.remove('hidden');
            btnLogin.classList.add('flex');
            btnLogin.classList.add('md:flex');
            btnLogin.style.display = '';
        }
        if (userMenu) userMenu.classList.add('hidden');
    }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
        atualizarInterface(session.user);
    } else {
        atualizarInterface(null);
    }
});

function filtrarPorCategoria(categoria) {
    categoriaAtiva = categoria;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.categoria === categoria);
    });

    carregarObjetos();
}

function atualizarContagem(n, total) {
    const el = document.getElementById('total-objetos');
    if (!el) return;
    if (n === total) {
        el.textContent = n === 1 ? '1 item no catálogo' : `${n} itens no catálogo`;
    } else {
        el.textContent = `${n} de ${total} itens`;
    }
}

function estadoVazio(grid, titulo, texto) {
    grid.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <h3 class="text-lg font-bold text-gray-700">${esc(titulo)}</h3>
            <p class="text-gray-500 mt-1 text-sm">${esc(texto)}</p>
        </div>
    `;
}

async function carregarObjetos() {
    const grid = document.getElementById('catalogo-grid');
    if (!grid) return;

    const termoPesquisa = (document.getElementById('pesquisa')?.value || '').toLowerCase().trim();
    const ordem = document.getElementById('ordenar')?.value || 'recentes';

    grid.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-20">
            <svg class="animate-spin h-8 w-8 text-brand-blue mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p class="text-gray-500 font-medium text-sm">A carregar catálogo...</p>
        </div>
    `;

    const { data: objetos, error } = await supabaseClient
        .from('objetos')
        .select('*')
        .order('criado_em', { ascending: false });

    if (error) {
        estadoVazio(grid, 'Não foi possível carregar', error.message);
        return;
    }

    if (!objetos || objetos.length === 0) {
        atualizarContagem(0, 0);
        estadoVazio(grid, 'O catálogo está vazio', 'Ainda não foram registados objetos perdidos na escola.');
        return;
    }

    const filtrados = objetos.filter(obj => {
        const titulo = (obj.titulo || '').toLowerCase();
        const categoria = (obj.categoria || '').toLowerCase();
        const sala = (obj.sala || '').toLowerCase();
        const matchTexto = !termoPesquisa || titulo.includes(termoPesquisa) || categoria.includes(termoPesquisa) || sala.includes(termoPesquisa);
        const matchCategoria = categoriaAtiva === 'Todos' || obj.categoria === categoriaAtiva;
        return matchTexto && matchCategoria;
    });

    filtrados.sort((a, b) => {
        if (ordem === 'titulo') return (a.titulo || '').localeCompare(b.titulo || '', 'pt');
        if (ordem === 'sala') return (a.sala || '').localeCompare(b.sala || '', 'pt');
        const da = new Date(a.criado_em || 0).getTime();
        const db = new Date(b.criado_em || 0).getTime();
        return ordem === 'antigos' ? da - db : db - da;
    });

    atualizarContagem(filtrados.length, objetos.length);

    if (filtrados.length === 0) {
        estadoVazio(grid, 'Sem resultados', 'Não encontrámos nada com esses filtros.');
        return;
    }

    grid.innerHTML = filtrados.map((obj) => {
        const foto = obj.foto_url || 'https://via.placeholder.com/600x450?text=Sem+Foto';
        const isDevolvido = (obj.estado || '').toLowerCase() === 'devolvido';
        const badgeClass = isDevolvido
            ? 'bg-green-600 text-white'
            : 'bg-brand-orange text-white';
        const dataTxt = obj.criado_em
            ? new Date(obj.criado_em).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
            : '';

        return `
            <article class="card-objeto animate-fade-in flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden h-full">
                <a href="reclamar.html?id=${encodeURIComponent(String(obj.id))}" class="relative aspect-[4/3] bg-gray-100 overflow-hidden block">
                    <img src="${esc(foto)}" alt="${esc(obj.titulo || "Objeto")}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105">
                    <span class="absolute top-3 left-3 bg-white/95 text-brand-blue text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wide">${esc(obj.categoria || "Outro")}</span>
                    <span class="absolute top-3 right-3 ${badgeClass} text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wide">${esc(obj.estado || "Achado")}</span>
                </a>
                <div class="p-5 flex flex-col flex-grow">
                    <h3 class="text-lg font-extrabold text-gray-900 leading-snug mb-3 line-clamp-2">${esc(obj.titulo || "Sem título")}</h3>
                    <div class="space-y-1.5 text-sm text-gray-600 mb-4">
                        <p class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            <span>Sala ${esc(obj.sala || '—')}</span>
                        </p>
                        ${dataTxt ? `<p class="flex items-center gap-2"><svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span>${dataTxt}</span></p>` : ''}
                    </div>
                    <a href="reclamar.html?id=${encodeURIComponent(String(obj.id))}" class="mt-auto block text-center bg-brand-blue text-white font-bold py-2.5 rounded-xl hover:bg-blue-900 transition-colors text-sm">
                        Ver objeto
                    </a>
                </div>
            </article>
        `;
    }).join('');
}

const pesquisaInput = document.getElementById('pesquisa');
if (pesquisaInput) {
    pesquisaInput.addEventListener('input', () => carregarObjetos());
}

window.onload = () => {
    if (document.getElementById('catalogo-grid')) {
        carregarObjetos();
    }
};

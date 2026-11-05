// auth.js

// 1. Importar o cliente Supabase (a biblioteca já está no index.html via CDN)
// 2. Configurar as credenciais (SUBSTITUI PELOS TEUS VALORES)
const SUPABASE_URL = 'https://kswqakffuudugnfudizg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XM9rWUkcESRXVrKFFlgNDA_VZ8XgXJl';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variável global para guardar o filtro de categoria ativo
let categoriaAtiva = 'Todos';

// ==========================================
// LÓGICA DO MODAL (ABRIR/FECHAR)
// ==========================================
const modal = document.getElementById('modal-login');

function abrirModal() {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function fecharModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    const msgErro = document.getElementById('msg-erro');
    if (msgErro) msgErro.classList.add('hidden');
}

// ==========================================
// LÓGICA DE AUTENTICAÇÃO (LOGIN / LOGOUT)
// ==========================================
async function fazerLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msgErro = document.getElementById('msg-erro');

    if (!email || !password) {
        msgErro.textContent = "Preenche o email e a password.";
        msgErro.classList.remove('hidden');
        return;
    }

    // 1. Tentar autenticar no Supabase
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        msgErro.textContent = "Erro: Credenciais inválidas. Tenta novamente.";
        msgErro.classList.remove('hidden');
    } else {
        // 2. Verificar o cargo do utilizador na tabela 'utilizadores'
        const { data: perfil, error: perfilError } = await supabaseClient
            .from('utilizadores')
            .select('cargo')
            .eq('id', data.user.id)
            .single();
        
        // 3. Redirecionar com base no cargo
        if (perfil && perfil.cargo === 'admin') {
            window.location.href = 'admin.html'; // Vai para o painel de Admin
        } else {
            window.location.href = 'dashboard.html'; // Vai para o painel de Funcionário
        }
    }
}

async function fazerLogout() {
    await supabaseClient.auth.signOut();
    window.location.reload(); // Recarrega a página para limpar a interface
}

// ==========================================
// ATUALIZAR O ECRÃ (Muda os botões)
// ==========================================
function atualizarInterface(user) {
    const btnLogin = document.getElementById('btn-login-nav');
    const btnLogout = document.getElementById('btn-logout-nav');
    const btnDashboard = document.getElementById('btn-dashboard-nav');

    if (user) {
        // Se estiver logado
        if (btnLogin) btnLogin.classList.add('hidden');
        if (btnLogout) btnLogout.classList.remove('hidden');
        if (btnDashboard) btnDashboard.classList.remove('hidden');
    } else {
        // Se não estiver logado
        if (btnLogin) btnLogin.classList.remove('hidden');
        if (btnLogout) btnLogout.classList.add('hidden');
        if (btnDashboard) btnDashboard.classList.add('hidden');
    }
}

// Verificar o estado da sessão ao carregar a página
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
        atualizarInterface(session.user);
    } else {
        atualizarInterface(null);
    }
});

// ==========================================
// LÓGICA DOS FILTROS E CATÁLOGO PÚBLICO
// ==========================================
function filtrarPorCategoria(categoria) {
    categoriaAtiva = categoria;
    
    const botoes = document.querySelectorAll('.filter-btn');
    botoes.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.trim() === categoria) {
            btn.classList.add('active');
        }
    });

    carregarObjetos();
}

async function carregarObjetos() {
    const catalogoDiv = document.getElementById('catalogo');
    if (!catalogoDiv) return; // Se não estiver na index, não faz nada

    const termoPesquisa = document.getElementById('pesquisa') ? document.getElementById('pesquisa').value.toLowerCase() : '';
    
    // Estado de carregamento
    catalogoDiv.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-20">
            <svg class="animate-spin h-10 w-10 text-marca-laranja mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p class="text-gray-500 font-medium">A carregar catálogo...</p>
        </div>
    `;

    // Ir buscar os dados à tabela 'objetos'
    const { data: objetos, error } = await supabaseClient
        .from('objetos')
        .select('*')
        .order('criado_em', { ascending: false });

    if (error) {
        catalogoDiv.innerHTML = `<div class="col-span-full text-center py-10"><p class="text-red-500 font-bold">Erro: ${error.message}</p></div>`;
        return;
    }

    // Empty State (Nenhum objeto na base de dados)
    if (objetos.length === 0) {
        catalogoDiv.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                <svg class="empty-state-icon w-20 h-20 text-gray-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <h3 class="text-2xl font-extrabold text-gray-700">O catálogo está vazio</h3>
                <p class="text-gray-500 mt-2 font-medium">Ainda não foram registados objetos perdidos na escola.</p>
            </div>
        `;
        return;
    }

    // Filtrar por texto e por categoria
    const objetosFiltrados = objetos.filter(obj => {
        const matchTexto = obj.titulo.toLowerCase().includes(termoPesquisa) || obj.categoria.toLowerCase().includes(termoPesquisa);
        const matchCategoria = categoriaAtiva === 'Todos' || obj.categoria === categoriaAtiva;
        return matchTexto && matchCategoria;
    });

    if (objetosFiltrados.length === 0) {
        catalogoDiv.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
                <h3 class="text-xl font-bold text-gray-700">Sem resultados</h3>
                <p class="text-gray-500 mt-2">Não encontrámos nada com esses termos.</p>
            </div>
        `;
        return;
    }

    catalogoDiv.innerHTML = ''; 

    // Desenhar os cartões
    objetosFiltrados.forEach((obj, index) => {
        const foto = obj.foto_url ? obj.foto_url : 'https://via.placeholder.com/400x300?text=Sem+Foto';
        const animationDelay = (index * 0.08) + 's';
        const isDevolvido = obj.estado.toLowerCase() === 'devolvido';
        const badgeClass = isDevolvido ? 'bg-green-500/90 text-white' : 'bg-marca-laranja/90 text-white';

        catalogoDiv.innerHTML += `
            <div class="card-objeto flex flex-col group" style="animation-delay: ${animationDelay}">
                <div class="h-52 overflow-hidden bg-gray-100 flex items-center justify-center relative">
                    <img src="${foto}" class="w-full h-full object-cover">
                    <div class="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-extrabold shadow-md backdrop-blur-md uppercase tracking-wide ${badgeClass}">
                        ${obj.estado}
                    </div>
                </div>
                <div class="p-5 flex-grow flex flex-col bg-white">
                    <span class="text-[11px] font-extrabold text-marca-azul bg-blue-50 px-2.5 py-1 rounded-md self-start mb-3 uppercase tracking-wider">${obj.categoria}</span>
                    <h3 class="text-lg font-extrabold text-gray-900 leading-tight mb-2 group-hover:text-marca-azul transition-colors line-clamp-2">${obj.titulo}</h3>
                    <div class="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                        <p class="text-sm text-gray-500 flex items-center gap-1.5 font-medium">
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> 
                            Sala ${obj.sala}
                        </p>
                    </div>
                </div>
            </div>
        `;
    });
}

// Iniciar a página
window.onload = () => {
    carregarObjetos();
};

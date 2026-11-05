// auth.js

// 1. Importar o cliente Supabase (a biblioteca já está no index.html via CDN)
// 2. Configurar as credenciais (SUBSTITUI PELOS TEUS VALORES)
const SUPABASE_URL = 'https://kswqakffuudugnfudizg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XM9rWUkcESRXVrKFFlgNDA_VZ8XgXJl';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variável global para guardar o filtro ativo
let categoriaAtiva = 'Todos';

// ==========================================
// LÓGICA DO MODAL
// ==========================================
const modal = document.getElementById('modal-login');

function abrirModal() {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function fecharModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('msg-erro').classList.add('hidden');
}

// ==========================================
// LÓGICA DE LOGIN E LOGOUT
// ==========================================
async function fazerLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msgErro = document.getElementById('msg-erro');

    if(!email || !password) {
        msgErro.textContent = "Preenche o email e a password.";
        msgErro.classList.remove('hidden');
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        msgErro.textContent = "Erro: " + error.message;
        msgErro.classList.remove('hidden');
    } else {
        fecharModal();
        atualizarInterface(data.user);
    }
}

async function fazerLogout() {
    await supabaseClient.auth.signOut();
    atualizarInterface(null);
}

function atualizarInterface(user) {
    const btnLogin = document.getElementById('btn-login-nav');
    const btnLogout = document.getElementById('btn-logout-nav');

    if (user) {
        btnLogin.classList.add('hidden');
        btnLogout.classList.remove('hidden');
    } else {
        btnLogin.classList.remove('hidden');
        btnLogout.classList.add('hidden');
    }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
    atualizarInterface(session ? session.user : null);
});

// ==========================================
// LÓGICA DOS FILTROS E CATÁLOGO
// ==========================================
function filtrarPorCategoria(categoria) {
    categoriaAtiva = categoria;
    
    // Atualizar visual dos botões
    const botoes = document.querySelectorAll('.filter-btn');
    botoes.forEach(btn => {
        if(btn.textContent === categoria) {
            btn.className = "filter-btn bg-marca-azul text-white px-4 py-2 rounded-full text-sm font-semibold shadow-sm transition-colors";
        } else {
            btn.className = "filter-btn bg-white text-gray-600 border border-gray-300 px-4 py-2 rounded-full text-sm font-semibold shadow-sm hover:bg-gray-100 transition-colors";
        }
    });

    // Recarregar os objetos com o novo filtro
    carregarObjetos();
}

async function carregarObjetos() {
    const catalogoDiv = document.getElementById('catalogo');
    const termoPesquisa = document.getElementById('pesquisa').value.toLowerCase();
    
    // Mostrar loading
    catalogoDiv.innerHTML = '<div class="col-span-full text-center py-10"><p class="text-gray-500 text-lg">A carregar...</p></div>';

    const { data: objetos, error } = await supabaseClient
        .from('objetos')
        .select('*')
        .order('criado_em', { ascending: false });

    if (error) {
        catalogoDiv.innerHTML = `<div class="col-span-full text-center py-10"><p class="text-red-500 font-bold">Erro: ${error.message}</p></div>`;
        return;
    }

    // Se não houver objetos (Empty State Melhorado)
    if (objetos.length === 0) {
        catalogoDiv.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <h3 class="text-xl font-bold text-gray-700">Nenhum objeto encontrado</h3>
                <p class="text-gray-500 mt-2">O catálogo está vazio ou a pesquisa não retornou resultados.</p>
            </div>
        `;
        return;
    }

    // Filtrar por pesquisa de texto E por categoria selecionada
    const objetosFiltrados = objetos.filter(obj => {
        const matchTexto = obj.titulo.toLowerCase().includes(termoPesquisa) || obj.categoria.toLowerCase().includes(termoPesquisa);
        const matchCategoria = categoriaAtiva === 'Todos' || obj.categoria === categoriaAtiva;
        return matchTexto && matchCategoria;
    });

    // Se a pesquisa/filtro não der resultados
    if (objetosFiltrados.length === 0) {
        catalogoDiv.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <h3 class="text-xl font-bold text-gray-700">Sem resultados</h3>
                <p class="text-gray-500 mt-2">Tenta pesquisar por outro termo ou mudar a categoria.</p>
            </div>
        `;
        return;
    }

    catalogoDiv.innerHTML = ''; // Limpar

    // Desenhar os cartões
    objetosFiltrados.forEach(obj => {
        const foto = obj.foto_url ? obj.foto_url : 'https://via.placeholder.com/300x200?text=Sem+Foto';
        
        catalogoDiv.innerHTML += `
            <div class="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden border border-gray-100 flex flex-col">
                <div class="h-48 overflow-hidden bg-gray-100 flex items-center justify-center">
                    <img src="${foto}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
                </div>
                <div class="p-4 flex-grow flex flex-col">
                    <span class="text-xs font-bold text-marca-azul bg-blue-50 px-2 py-1 rounded self-start">${obj.categoria}</span>
                    <h3 class="text-lg font-bold text-gray-900 mt-2">${obj.titulo}</h3>
                    <div class="mt-auto pt-3">
                        <p class="text-sm text-gray-600 flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> Sala: ${obj.sala}</p>
                        <p class="text-sm text-gray-600 mt-1 flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Estado: <span class="font-bold ${obj.estado === 'Devolvido' ? 'text-green-600' : 'text-marca-laranja'}">${obj.estado}</span></p>
                    </div>
                </div>
            </div>
        `;
    });
}

// Iniciar
window.onload = () => {
    carregarObjetos();
};

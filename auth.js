// auth.js

// 1. Importar o cliente Supabase (a biblioteca já está no index.html via CDN)
// 2. Configurar as credenciais (SUBSTITUI PELOS TEUS VALORES)
const SUPABASE_URL = 'https://kswqakffuudugnfudizg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XM9rWUkcESRXVrKFFlgNDA_VZ8XgXJl';

// 2. Iniciar o Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

    // Tentar fazer login no Supabase
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

// ==========================================
// ATUALIZAR O ECRÃ (Muda os botões)
// ==========================================
function atualizarInterface(user) {
    const btnLogin = document.getElementById('btn-login-nav');
    const btnLogout = document.getElementById('btn-logout-nav');

    if (user) {
        // Se o utilizador estiver logado
        btnLogin.classList.add('hidden');
        btnLogout.classList.remove('hidden');
        // Aqui podes redirecionar para o dashboard no futuro:
        // window.location.href = 'dashboard.html'; 
    } else {
        // Se não estiver logado
        btnLogin.classList.remove('hidden');
        btnLogout.classList.add('hidden');
    }
}

// Verificar se o utilizador já está logado ao carregar a página
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
        atualizarInterface(session.user);
    } else {
        atualizarInterface(null);
    }
});

// ==========================================
// CARREGAR O CATÁLOGO PÚBLICO
// ==========================================
async function carregarObjetos() {
    const catalogoDiv = document.getElementById('catalogo');
    const termoPesquisa = document.getElementById('pesquisa').value.toLowerCase();
    
    catalogoDiv.innerHTML = '<p class="text-gray-500 col-span-full">A carregar...</p>';

    // Ir buscar os dados à tabela 'objetos'
    const { data: objetos, error } = await supabaseClient
        .from('objetos')
        .select('*')
        .order('criado_em', { ascending: false });

    if (error) {
        catalogoDiv.innerHTML = `<p class="text-red-500 col-span-full">Erro ao carregar o catálogo: ${error.message}</p>`;
        return;
    }

    if (objetos.length === 0) {
        catalogoDiv.innerHTML = '<p class="text-gray-500 col-span-full">Nenhum objeto registado ainda.</p>';
        return;
    }

    // Filtrar localmente se houver pesquisa
    const objetosFiltrados = objetos.filter(obj => 
        obj.titulo.toLowerCase().includes(termoPesquisa) || 
        obj.categoria.toLowerCase().includes(termoPesquisa)
    );

    catalogoDiv.innerHTML = ''; // Limpar

    // Criar os cartões
    objetosFiltrados.forEach(obj => {
        // Se não houver foto, usa uma de placeholder
        const foto = obj.foto_url ? obj.foto_url : 'https://via.placeholder.com/300x200?text=Sem+Foto';
        
        catalogoDiv.innerHTML += `
            <div class="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden border border-gray-100">
                <img src="${foto}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <span class="text-xs font-bold text-marca-azul bg-blue-50 px-2 py-1 rounded">${obj.categoria}</span>
                    <h3 class="text-lg font-bold text-gray-900 mt-2">${obj.titulo}</h3>
                    <p class="text-sm text-gray-500 mt-1"><b>Sala:</b> ${obj.sala}</p>
                    <p class="text-sm text-gray-500"><b>Estado:</b> ${obj.estado}</p>
                </div>
            </div>
        `;
    });
}

// Carregar os objetos quando a página abre
window.onload = () => {
    carregarObjetos();
};

// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://kswqakffuudugnfudizg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XM9rWUkcESRXVrKFFlgNDA_VZ8XgXJl';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variável para guardar o utilizador atual
let currentUser = null;

// ==========================================
// VERIFICAÇÃO DE SEGURANÇA E CARREGAMENTO
// ==========================================
async function verificarSessao() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (!session) {
        // Se não estiver logado, chuta para a página inicial
        window.location.href = 'index.html';
        return;
    }

    currentUser = session.user;
    document.getElementById('user-email').textContent = currentUser.email;

    // Verificar se o utilizador é Admin (para proteger a página admin.html)
    const { data: perfil } = await supabaseClient.from('utilizadores').select('cargo').eq('id', currentUser.id).single();
    
    if (window.location.pathname.includes('admin.html') && perfil?.cargo !== 'admin') {
        alert("Acesso negado. Apenas administradores podem ver esta página.");
        window.location.href = 'dashboard.html'; // Manda para o dashboard normal
        return;
    }

    carregarTabelaObjetos();
}

// Logout
document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
});

// ==========================================
// INSERIR OBJETO (COM UPLOAD DE FOTO)
// ==========================================
document.getElementById('form-objeto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit');
    btnSubmit.textContent = "A guardar...";
    btnSubmit.disabled = true;

    const titulo = document.getElementById('titulo').value;
    const categoria = document.getElementById('categoria').value;
    const sala = document.getElementById('sala').value;
    const fotoFile = document.getElementById('foto').files[0];

    try {
        // 1. Fazer Upload da Imagem para o Supabase Storage
        const fileExt = fotoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`; // Nome único (Data atual + extensão)
        const filePath = `${fileName}`;

        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('objetos')
            .upload(filePath, fotoFile);

        if (uploadError) throw uploadError;

        // 2. Obter o URL Público da Imagem
        const { data: { publicUrl } } = supabaseClient.storage
            .from('objetos')
            .getPublicUrl(filePath);

        // 3. Inserir os dados na tabela 'objetos'
        const { error: insertError } = await supabaseClient
            .from('objetos')
            .insert([
                {
                    titulo: titulo,
                    categoria: categoria,
                    sala: sala,
                    foto_url: publicUrl,
                    estado: 'Achado',
                    registado_por: currentUser.id
                }
            ]);

        if (insertError) throw insertError;

        // Sucesso
        alert("Objeto registado com sucesso!");
        document.getElementById('form-objeto').reset();
        carregarTabelaObjetos();

    } catch (error) {
        alert("Erro ao guardar: " + error.message);
    } finally {
        btnSubmit.textContent = "Guardar Objeto";
        btnSubmit.disabled = false;
    }
});

// ==========================================
// CARREGAR TABELA DE OBJETOS
// ==========================================
async function carregarTabelaObjetos() {
    const tbody = document.getElementById('tabela-corpo');
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">A carregar dados...</td></tr>';

    // Vai buscar os objetos (Mais recentes primeiro)
    const { data: objetos, error } = await supabaseClient
        .from('objetos')
        .select('*')
        .order('criado_em', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Erro: ${error.message}</td></tr>`;
        return;
    }

    if (objetos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Nenhum objeto registado ainda.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    objetos.forEach(obj => {
        const foto = obj.foto_url || 'https://via.placeholder.com/50';
        
        // Lógica para mudar a cor do botão de estado
        const btnEstadoClass = obj.estado === 'Devolvido' ? 'bg-green-500 text-white' : 'bg-orange-100 text-orange-600';
        const btnEstadoTexto = obj.estado === 'Devolvido' ? 'Devolvido' : 'Marcar Devolvido';

        tbody.innerHTML += `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="p-4"><img src="${foto}" class="w-12 h-12 object-cover rounded-md shadow-sm"></td>
                <td class="p-4 font-bold text-gray-800">${obj.titulo}</td>
                <td class="p-4 text-gray-600">${obj.sala}</td>
                <td class="p-4">
                    <button onclick="alterarEstado(${obj.id}, '${obj.estado}')" class="px-3 py-1 rounded-full text-xs font-bold ${btnEstadoClass}">
                        ${btnEstadoTexto}
                    </button>
                </td>
                <td class="p-4 text-center">
                    <button onclick="apagarObjeto(${obj.id})" class="text-red-500 hover:text-red-700 p-2">
                        <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
        `;
    });
}

// ==========================================
// AÇÕES DA TABELA (Alterar Estado e Apagar)
// ==========================================
async function alterarEstado(id, estadoAtual) {
    const novoEstado = estadoAtual === 'Achado' ? 'Devolvido' : 'Achado';
    
    const { error } = await supabaseClient
        .from('objetos')
        .update({ estado: novoEstado })
        .eq('id', id);

    if (error) {
        alert("Erro ao alterar estado: " + error.message);
    } else {
        carregarTabelaObjetos(); // Recarrega a tabela para mostrar a alteração
    }
}

async function apagarObjeto(id) {
    if (!confirm("Tens a certeza que queres apagar este objeto? Esta ação não pode ser desfeita.")) return;

    const { error } = await supabaseClient
        .from('objetos')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Erro ao apagar: " + error.message);
    } else {
        carregarTabelaObjetos(); // Recarrega a tabela
    }
}

// Iniciar a página assim que ela carregar
window.onload = () => {
    verificarSessao();
};

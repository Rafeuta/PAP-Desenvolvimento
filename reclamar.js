// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://kswqakffuudugnfudizg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XM9rWUkcESRXVrKFFlgNDA_VZ8XgXJl';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let objetoAtual = null;

// ==========================================
// SISTEMA DE NOTIFICAÇÃO TOAST
// ==========================================
function mostrarNotificacao(titulo, mensagem, tipo = 'sucesso') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    toastTitle.textContent = titulo;
    toastMessage.textContent = mensagem;
    
    if (tipo === 'sucesso') {
        toast.classList.remove('border-red-500');
        toast.classList.add('border-brand-blue');
        toastIcon.innerHTML = `<svg class="w-6 h-6 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else {
        toast.classList.remove('border-brand-blue');
        toast.classList.add('border-red-500');
        toastIcon.innerHTML = `<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }

    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 4000);
}

// ==========================================
// CARREGAR DADOS DO OBJETO (via URL ?id=X)
// ==========================================
async function carregarDadosObjeto() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        document.getElementById('loading-state').innerHTML = `
            <div class="text-center">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <p class="text-gray-900 font-bold text-lg mb-2">Objeto não identificado</p>
                <p class="text-gray-500 mb-4">O link que usaste é inválido ou expirou.</p>
                <a href="index.html" class="text-brand-blue font-semibold hover:underline">← Voltar ao catálogo</a>
            </div>
        `;
        return;
    }

    const { data: objeto, error } = await supabaseClient.from('objetos').select('*').eq('id', id).single();

    if (error || !objeto) {
        document.getElementById('loading-state').innerHTML = `
            <div class="text-center">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <p class="text-gray-900 font-bold text-lg mb-2">Objeto não encontrado</p>
                <p class="text-gray-500 mb-4">Este objeto pode já ter sido removido do sistema.</p>
                <a href="index.html" class="text-brand-blue font-semibold hover:underline">← Voltar ao catálogo</a>
            </div>
        `;
        return;
    }

    // Verificar se o objeto já foi devolvido
    if (objeto.estado.toLowerCase() === 'devolvido') {
        document.getElementById('loading-state').innerHTML = `
            <div class="text-center">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <p class="text-gray-900 font-bold text-lg mb-2">Este objeto já foi devolvido!</p>
                <p class="text-gray-500 mb-4">O proprietário já o levantou na secretaria.</p>
                <a href="index.html" class="text-brand-blue font-semibold hover:underline">← Ver outros objetos</a>
            </div>
        `;
        return;
    }

    // Preencher os dados do objeto
    objetoAtual = objeto;
    document.getElementById('obj-foto').src = objeto.foto_url || 'https://via.placeholder.com/600x400?text=Sem+Foto';
    document.getElementById('obj-titulo').textContent = objeto.titulo;
    document.getElementById('obj-categoria').textContent = objeto.categoria;
    document.getElementById('obj-sala-texto').textContent = objeto.sala;
    
    // Formatar data
    const dataFormatada = new Date(objeto.criado_em).toLocaleDateString('pt-PT', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
    document.getElementById('obj-data').textContent = dataFormatada;

    // Mostrar conteúdo
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('claim-content').classList.remove('hidden');
}

// ==========================================
// SUBMETER RECLAMAÇÃO
// ==========================================
document.getElementById('form-reclamacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btnSubmit = document.getElementById('btn-submit-claim');
    const originalText = btnSubmit.innerHTML;
    
    btnSubmit.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> A enviar...`;
    btnSubmit.disabled = true;

    const dados = {
        objeto_id: objetoAtual.id,
        objeto_titulo: objetoAtual.titulo,
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        turma: document.getElementById('turma').value,
        justificacao: document.getElementById('justificacao').value,
        estado: 'Pendente',
        data_pedido: new Date().toISOString()
    };

    try {
        // 1. Inserir reclamação na tabela 'reclamacoes'
        const { error: insertError } = await supabaseClient.from('reclamacoes').insert([dados]);
        if (insertError) throw insertError;

        // 2. Simulação de envio de email (para a defesa da PAP)
        console.log('=== SIMULAÇÃO DE EMAIL PARA A SECRETARIA ===');
        console.log(`Para: secretaria@etpc.pt`);
        console.log(`Assunto: Nova Reclamação - ${dados.objeto_titulo}`);
        console.log(`De: ${dados.nome} (${dados.email}) - ${dados.turma}`);
        console.log(`Justificação: ${dados.justificacao}`);
        console.log('=============================================');

        // 3. Mostrar sucesso
        mostrarNotificacao('Pedido Enviado!', 'A tua reclamação foi submetida. A secretaria irá analisar e contactar-te por email.');

        // 4. Redirecionar após 3 segundos
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);

    } catch (error) {
        console.error('Erro ao submeter reclamação:', error);
        mostrarNotificacao('Erro', 'Não foi possível enviar o pedido. Tenta novamente.', 'erro');
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;
    }
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================
window.onload = carregarDadosObjeto;

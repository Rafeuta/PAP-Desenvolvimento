// ==========================================
// 1. CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://kswqakffuudugnfudizg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XM9rWUkcESRXVrKFFlgNDA_VZ8XgXJl';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. CONFIGURAÇÃO DO WEB3FORMS
// ==========================================
// ⚠️ SUBSTITUI PELA TUA CHAVE REAL AQUI (mantém as plicas '')
const WEB3FORMS_ACCESS_KEY = 'd7697e7b-29d7-4933-a5c6-72a68d2c77b8'; 

let objetoAtual = null;

// ==========================================
// 3. SISTEMA DE NOTIFICAÇÃO TOAST
// ==========================================
function mostrarNotificacao(titulo, mensagem, tipo = 'sucesso') {
    const toast = document.getElementById('toast');
    document.getElementById('toast-title').textContent = titulo;
    document.getElementById('toast-message').textContent = mensagem;
    
    if (tipo === 'sucesso') {
        toast.classList.remove('border-red-500');
        toast.classList.add('border-brand-blue');
        document.getElementById('toast-icon').innerHTML = `<svg class="w-6 h-6 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else {
        toast.classList.remove('border-brand-blue');
        toast.classList.add('border-red-500');
        document.getElementById('toast-icon').innerHTML = `<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }

    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 4000);
}

// ==========================================
// 4. CARREGAR DADOS DO OBJETO
// ==========================================
async function carregarDadosObjeto() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        window.location.href = 'index.html';
        return;
    }

    const { data: objeto, error } = await supabaseClient.from('objetos').select('*').eq('id', id).single();

    if (error || !objeto) {
        document.getElementById('loading-state').innerHTML = `
            <div class="text-center">
                <p class="text-red-500 font-bold text-lg mb-2">Objeto não encontrado</p>
                <a href="index.html" class="text-brand-blue font-semibold hover:underline">← Voltar ao catálogo</a>
            </div>`;
        return;
    }

    if (objeto.estado.toLowerCase() === 'devolvido') {
        document.getElementById('loading-state').innerHTML = `
            <div class="text-center">
                <p class="text-green-600 font-bold text-lg mb-2">Este objeto já foi devolvido!</p>
                <a href="index.html" class="text-brand-blue font-semibold hover:underline">← Ver outros objetos</a>
            </div>`;
        return;
    }

    objetoAtual = objeto;
    document.getElementById('obj-foto').src = objeto.foto_url || 'https://via.placeholder.com/600x400?text=Sem+Foto';
    document.getElementById('obj-titulo').textContent = objeto.titulo;
    document.getElementById('obj-categoria').textContent = objeto.categoria;
    document.getElementById('obj-sala-texto').textContent = objeto.sala;
    document.getElementById('obj-data').textContent = new Date(objeto.criado_em).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });

    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('claim-content').classList.remove('hidden');
}

// ==========================================
// 5. SUBMETER RECLAMAÇÃO (SUPABASE + WEB3FORMS)
// ==========================================
document.getElementById('form-reclamacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btnSubmit = document.getElementById('btn-submit-claim');
    const originalText = btnSubmit.innerHTML;
    
    btnSubmit.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> A enviar...`;
    btnSubmit.disabled = true;

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const turma = document.getElementById('turma').value;
    const justificacao = document.getElementById('justificacao').value;

    const dadosReclamacao = {
        objeto_id: objetoAtual.id,
        objeto_titulo: objetoAtual.titulo,
        nome: nome,
        email: email,
        turma: turma,
        justificacao: justificacao,
        estado: 'Pendente',
        data_pedido: new Date().toISOString()
    };

    try {
        // 1. Guardar na Base de Dados Supabase
        const { error: insertError } = await supabaseClient.from('reclamacoes').insert([dadosReclamacao]);
        if (insertError) throw insertError;

        // 2. Preparar dados para o Web3Forms
        const formData = new FormData();
        formData.append('access_key', WEB3FORMS_ACCESS_KEY);
        formData.append('subject', `Nova Reclamação: ${objetoAtual.titulo}`);
        formData.append('from_name', nome);
        formData.append('email', email);
        formData.append('message', `
NOVA RECLAMAÇÃO DE OBJETO
-------------------------
Objeto: ${objetoAtual.titulo}
Categoria: ${objetoAtual.categoria}
Local: ${objetoAtual.sala}

DADOS DO ALUNO:
Nome: ${nome}
Turma: ${turma}
Email de Contacto: ${email}

JUSTIFICAÇÃO DO ALUNO:
${justificacao}
-------------------------
Enviado via FindIT School - ETPC
        `);

        // 3. Enviar Email via Web3Forms
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            mostrarNotificacao('Sucesso!', 'Reclamação enviada. A secretaria foi notificada por email.');
            setTimeout(() => { window.location.href = 'index.html'; }, 3000);
        } else {
            throw new Error(result.message || 'Erro no envio do email');
        }

    } catch (error) {
        console.error('Erro:', error);
        mostrarNotificacao('Erro', 'Falha ao enviar a reclamação. Tenta novamente.', 'erro');
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;
    }
});

// Iniciar
window.onload = carregarDadosObjeto;

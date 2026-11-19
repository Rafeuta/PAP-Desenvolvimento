// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://kswqakffuudugnfudizg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XM9rWUkcESRXVrKFFlgNDA_VZ8XgXJl';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// CONFIGURAÇÃO DO WEB3FORMS
// ==========================================
const WEB3FORMS_ACCESS_KEY = 'd7697e7b-29d7-4933-a5c6-72a68d2c77b8';

let listaContactos = [];

// ==========================================
// SISTEMA DE NOTIFICAÇÃO TOAST
// ==========================================
function mostrarNotificacao(titulo, mensagem, tipo = 'sucesso') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 bg-white border-l-4 ${tipo === 'sucesso' ? 'border-green-500' : 'border-red-500'} shadow-2xl rounded-lg p-4 flex items-center gap-3 max-w-sm z-50 transform transition-all duration-300 translate-y-20 opacity-0`;
    toast.innerHTML = `
        <div>
            <h4 class="font-bold text-gray-900 text-sm">${titulo}</h4>
            <p class="text-gray-600 text-xs mt-0.5">${mensagem}</p>
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-20', 'opacity-0');
    }, 100);
    
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================
// FUNÇÕES DE MODAL
// ==========================================
function abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function fecharModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// ==========================================
// CARREGAR CONTACTOS
// ==========================================
async function carregarContactos() {
    const tbody = document.getElementById('tabela-contactos');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center"><svg class="animate-spin h-6 w-6 text-brand-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></td></tr>`;

    try {
        const { data, error } = await supabaseClient
            .from('contactos_email')
            .select('*')
            .order('criado_em', { ascending: false });

        if (error) {
            console.error('Erro ao carregar contactos:', error);
            tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-500">Erro: ${error.message}</td></tr>`;
            return;
        }

        listaContactos = data || [];

        if (listaContactos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-12 text-center text-gray-500">Nenhum contacto na lista. Adiciona emails de delegados de turma.</td></tr>`;
        } else {
            tbody.innerHTML = listaContactos.map(c => `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="p-4 font-semibold text-gray-900">${c.nome}</td>
                    <td class="p-4 text-gray-600">${c.email}</td>
                    <td class="p-4 text-gray-600">${c.turma || '—'}</td>
                    <td class="p-4 text-center">
                        <button onclick="apagarContacto(${c.id})" class="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        const totalEl = document.getElementById('total-contactos');
        if (totalEl) {
            totalEl.textContent = `Total: ${listaContactos.length} contacto${listaContactos.length !== 1 ? 's' : ''}`;
        }
    } catch (error) {
        console.error('Erro inesperado:', error);
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-500">Erro inesperado: ${error.message}</td></tr>`;
    }
}

// ==========================================
// ADICIONAR CONTACTO
// ==========================================
async function adicionarContacto(e) {
    e.preventDefault();
    
    const nome = document.getElementById('contacto-nome')?.value.trim();
    const email = document.getElementById('contacto-email')?.value.trim();
    const turma = document.getElementById('contacto-turma')?.value.trim();

    if (!nome || !email) {
        mostrarNotificacao('Erro', 'Nome e email são obrigatórios.', 'erro');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('contactos_email')
            .insert([{ nome, email, turma }]);

        if (error) {
            console.error('Erro ao inserir contacto:', error);
            if (error.code === '23505') {
                mostrarNotificacao('Erro', 'Este email já está na lista.', 'erro');
            } else {
                mostrarNotificacao('Erro', error.message, 'erro');
            }
            return;
        }

        mostrarNotificacao('Sucesso', `${nome} foi adicionado à lista.`);
        fecharModal('modal-adicionar-email');
        
        const form = document.getElementById('form-adicionar-contacto');
        if (form) form.reset();
        
        await carregarContactos();
    } catch (error) {
        console.error('Erro inesperado:', error);
        mostrarNotificacao('Erro', 'Erro inesperado ao adicionar contacto.', 'erro');
    }
}

// ==========================================
// APAGAR CONTACTO
// ==========================================
async function apagarContacto(id) {
    if (!confirm('Remover este contacto da lista?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('contactos_email')
            .delete()
            .eq('id', id);

        if (error) {
            mostrarNotificacao('Erro', error.message, 'erro');
            return;
        }

        mostrarNotificacao('Removido', 'Contacto eliminado com sucesso.');
        await carregarContactos();
    } catch (error) {
        console.error('Erro ao apagar:', error);
        mostrarNotificacao('Erro', 'Erro ao eliminar contacto.', 'erro');
    }
}

// ==========================================
// ENVIAR EMAIL EM MASSA
// ==========================================
function abrirModalEnvioMassa() {
    if (listaContactos.length === 0) {
        mostrarNotificacao('Lista Vazia', 'Adiciona contactos antes de enviares emails.', 'erro');
        return;
    }
    const contador = document.getElementById('contador-destinatarios');
    if (contador) {
        contador.textContent = `${listaContactos.length} destinatário${listaContactos.length !== 1 ? 's' : ''}`;
    }
    abrirModal('modal-envio-massa');
}

async function enviarEmailMassa(e) {
    e.preventDefault();
    
    const assunto = document.getElementById('massa-assunto')?.value;
    const mensagem = document.getElementById('massa-mensagem')?.value;
    const btn = document.getElementById('btn-enviar-massa');
    
    if (!assunto || !mensagem) {
        mostrarNotificacao('Erro', 'Assunto e mensagem são obrigatórios.', 'erro');
        return;
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> A enviar...`;
    btn.disabled = true;

    let enviados = 0;
    let erros = 0;

    for (const contacto of listaContactos) {
        try {
            const formData = new FormData();
            formData.append('access_key', WEB3FORMS_ACCESS_KEY);
            formData.append('subject', assunto);
            formData.append('from_name', 'FindIT School');
            formData.append('Nome', contacto.nome);
            formData.append('Turma', contacto.turma || 'N/A');
            formData.append('Mensagem', mensagem);

            const res = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                body: formData
            });
            const result = await res.json();
            
            if (result.success) {
                enviados++;
            } else {
                erros++;
            }
        } catch (error) {
            console.error(`Erro ao enviar para ${contacto.email}:`, error);
            erros++;
        }
    }

    btn.innerHTML = originalText;
    btn.disabled = false;

    if (erros === 0) {
        mostrarNotificacao('Enviados!', `${enviados} email${enviados !== 1 ? 's' : ''} enviado${enviados !== 1 ? 's' : ''} com sucesso.`);
    } else {
        mostrarNotificacao('Envio Parcial', `${enviados} enviados, ${erros} falharam.`, 'erro');
    }

    fecharModal('modal-envio-massa');
    const form = document.getElementById('form-envio-massa');
    if (form) form.reset();
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Carregar contactos ao iniciar
    carregarContactos();

    // Adicionar event listener ao formulário de adicionar contacto
    const formAdicionar = document.getElementById('form-adicionar-contacto');
    if (formAdicionar) {
        formAdicionar.addEventListener('submit', adicionarContacto);
    }

    // Adicionar event listener ao formulário de envio em massa
    const formMassa = document.getElementById('form-envio-massa');
    if (formMassa) {
        formMassa.addEventListener('submit', enviarEmailMassa);
    }
});

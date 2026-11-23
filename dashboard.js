// ==========================================
// CONFIGURAÇÃO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://kswqakffuudugnfudizg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XM9rWUkcESRXVrKFFlgNDA_VZ8XgXJl';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// CONFIGURAÇÃO EMAILJS (COLOCA AS TUAS CHAVES AQUI!)
// ==========================================
const EMAILJS_PUBLIC_KEY = 'COLOCA_AQUI_A_TUA_PUBLIC_KEY';
const EMAILJS_SERVICE_ID = 'COLOCA_AQUI_O_TEU_SERVICE_ID'; // Ex: service_gmail_findit
const EMAILJS_TEMPLATE_ID = 'COLOCA_AQUI_O_TEU_TEMPLATE_ID'; // Ex: template_notificacao

// Inicializar EmailJS
if (typeof emailjs !== 'undefined') {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

let currentUser = null;
let listaContactos = [];
let objetoEditando = null; // Para saber se estamos a editar ou criar

// ==========================================
// SISTEMA TOAST (NOTIFICAÇÕES BONITAS)
// ==========================================
function mostrarNotificacao(titulo, mensagem, tipo = 'sucesso') {
    // Remove toast anterior se existir
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    const bgClass = tipo === 'sucesso' ? 'bg-green-500' : 'bg-red-500';
    
    toast.className = `fixed bottom-6 right-6 ${bgClass} text-white px-6 py-4 rounded-lg shadow-2xl z-[100] flex items-center gap-3 transform transition-all duration-300 translate-y-0 opacity-100 max-w-sm`;
    toast.innerHTML = `
        <div class="font-bold">${titulo}</div>
        <div class="text-sm opacity-90">${mensagem}</div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================
// FUNÇÃO GENÉRICA DE ENVIO DE EMAIL (EMAILJS)
// ==========================================
async function enviarEmail(destinatarioEmail, nomeDestinatario, dadosObjeto, assuntoPersonalizado, msgIntro, msgFinal) {
    try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_email: destinatarioEmail,
            nome_destinatario: nomeDestinatario,
            assunto_email: assuntoPersonalizado,
            titulo_objeto: dadosObjeto.titulo,
            categoria: dadosObjeto.categoria,
            localizacao: dadosObjeto.sala,
            estado: dadosObjeto.estado,
            justificacao: dadosObjeto.justificacao || '', // Pode vir vazio
            mensagem_introducao: msgIntro,
            mensagem_final: msgFinal
        });
        return true;
    } catch (error) {
        console.error("Erro EmailJS:", error);
        return false;
    }
}

// ==========================================
// VERIFICAÇÃO DE SESSÃO
// ==========================================
async function verificarSessao() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }
    currentUser = session.user;
    
    const userEmailEl = document.getElementById('user-email');
    if (userEmailEl) userEmailEl.textContent = currentUser.email;
    
    carregarTabelaObjetos();
    carregarContactos();
}

document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
});

// ==========================================
// GESTÃO DE OBJETOS (CRIAR / EDITAR)
// ==========================================
const formObjeto = document.getElementById('form-objeto');
if (formObjeto) {
    formObjeto.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = document.getElementById('btn-submit');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = 'A processar...';

        const titulo = document.getElementById('titulo').value;
        const categoria = document.getElementById('categoria').value;
        const sala = document.getElementById('sala').value;
        const fotoInput = document.getElementById('foto');
        const fotoFile = fotoInput.files[0];

        try {
            let foto_url = objetoEditando ? objetoEditando.foto_url : '';

            // Se houver ficheiro novo, faz upload
            if (fotoFile) {
                const fileExt = fotoFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabaseClient.storage.from('objetos').upload(fileName, fotoFile);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabaseClient.storage.from('objetos').getPublicUrl(fileName);
                foto_url = publicUrl;
            }

            if (objetoEditando) {
                // ATUALIZAR
                const { error } = await supabaseClient.from('objetos').update({
                    titulo, categoria, sala, foto_url
                }).eq('id', objetoEditando.id);
                if (error) throw error;
                mostrarNotificacao('Sucesso', 'Objeto atualizado!');
                objetoEditando = null; // Reset modo edição
                btnSubmit.textContent = 'Guardar Objeto';
            } else {
                // INSERIR NOVO
                const { error } = await supabaseClient.from('objetos').insert([{
                    titulo, categoria, sala, foto_url, estado: 'Achado', registado_por: currentUser.id
                }]);
                if (error) throw error;
                mostrarNotificacao('Sucesso', 'Objeto registado!');
            }

            formObjeto.reset();
            // Reset visual preview
            const previewDiv = document.getElementById('image-preview');
            const placeholderDiv = document.getElementById('upload-placeholder');
            if(previewDiv) previewDiv.classList.add('hidden');
            if(placeholderDiv) placeholderDiv.classList.remove('hidden');
            
            carregarTabelaObjetos();
        } catch (error) {
            mostrarNotificacao('Erro', error.message, 'erro');
        } finally {
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    });
}

// Função para carregar dados no formulário (Editar)
async function editarObjeto(id) {
    const { data: obj } = await supabaseClient.from('objetos').select('*').eq('id', id).single();
    if (!obj) return;

    objetoEditando = obj;
    document.getElementById('titulo').value = obj.titulo;
    document.getElementById('categoria').value = obj.categoria;
    document.getElementById('sala').value = obj.sala;
    
    // Mostrar imagem atual
    const previewImg = document.getElementById('preview-img');
    const previewDiv = document.getElementById('image-preview');
    const placeholderDiv = document.getElementById('upload-placeholder');
    
    if (previewImg && obj.foto_url) {
        previewImg.src = obj.foto_url;
        if(previewDiv) previewDiv.classList.remove('hidden');
        if(placeholderDiv) placeholderDiv.classList.add('hidden');
    }

    const btnSubmit = document.getElementById('btn-submit');
    if(btnSubmit) btnSubmit.textContent = 'Atualizar Objeto';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarNotificacao('Modo Edição', 'Altera os campos e clica em Atualizar.');
}

// ==========================================
// TABELA DE OBJETOS
// ==========================================
async function carregarTabelaObjetos() {
    const tbody = document.getElementById('tabela-corpo');
    if (!tbody) return;

    const { data: objetos } = await supabaseClient.from('objetos').select('*').order('criado_em', { ascending: false });
    
    if (!objetos || objetos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-500">Sem objetos.</td></tr>';
        return;
    }

    tbody.innerHTML = objetos.map(obj => {
        const isDevolvido = obj.estado === 'Devolvido';
        const badge = isDevolvido 
            ? '<span class="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Devolvido</span>'
            : '<span class="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">Achado</span>';

        return `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-4"><img src="${obj.foto_url}" class="w-12 h-12 object-cover rounded-lg"></td>
            <td class="p-4 font-bold text-gray-800">${obj.titulo}<br><span class="text-xs font-normal text-gray-500">${obj.categoria}</span></td>
            <td class="p-4 text-gray-600">${obj.sala}</td>
            <td class="p-4">${badge}</td>
            <td class="p-4 text-right space-x-2">
                <button onclick="editarObjeto(${obj.id})" class="text-blue-600 hover:text-blue-800 font-semibold text-sm">Editar</button>
                <button onclick="notificarSobreObjeto(${obj.id})" class="text-orange-600 hover:text-orange-800 font-semibold text-sm" title="Enviar Email">✉️</button>
                <button onclick="apagarObjeto(${obj.id})" class="text-red-500 hover:text-red-700 font-semibold text-sm">Apagar</button>
            </td>
        </tr>`;
    }).join('');
}

async function alterarEstado(id, estadoAtual) {
    const novo = estadoAtual === 'Achado' ? 'Devolvido' : 'Achado';
    await supabaseClient.from('objetos').update({ estado: novo }).eq('id', id);
    carregarTabelaObjetos();
}

async function apagarObjeto(id) {
    if(confirm('Eliminar objeto?')) {
        await supabaseClient.from('objetos').delete().eq('id', id);
        carregarTabelaObjetos();
    }
}

// ==========================================
// NOTIFICAR (ENVIAR EMAIL EM MASSA VIA EMAILJS)
// ==========================================
async function notificarSobreObjeto(objetoId) {
    const { data: obj } = await supabaseClient.from('objetos').select('*').eq('id', objetoId).single();
    if(!obj) return;

    if(listaContactos.length === 0) {
        mostrarNotificacao('Atenção', 'Adiciona emails na lista de contactos primeiro.', 'erro');
        return;
    }

    if(!confirm(`Enviar email para ${listaContactos.length} contactos sobre "${obj.titulo}"?`)) return;

    mostrarNotificacao('A enviar...', `A processar ${listaContactos.length} emails.`);

    let sucessos = 0;
    for (const contacto of listaContactos) {
        const sucesso = await enviarEmail(
            contacto.email, 
            contacto.nome, 
            obj, 
            `Objeto Encontrado: ${obj.titulo}`,
            `Informamos que foi encontrado o seguinte objeto na escola.`,
            `Se reconhecer este objeto como seu, por favor dirija-se à secretaria.`
        );
        if(sucesso) sucessos++;
    }

    mostrarNotificacao('Concluído', `${sucessos} emails enviados com sucesso!`);
}

// ==========================================
// GESTÃO DE CONTACTOS (LISTA)
// ==========================================
async function carregarContactos() {
    const tbody = document.getElementById('tabela-contactos');
    if(!tbody) return;
    const { data } = await supabaseClient.from('contactos_email').select('*');
    listaContactos = data || [];
    
    if(listaContactos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Sem contactos.</td></tr>';
        return;
    }

    tbody.innerHTML = listaContactos.map(c => `
        <tr class="border-b">
            <td class="p-3 font-semibold">${c.nome}</td>
            <td class="p-3 text-gray-600">${c.email}</td>
            <td class="p-3 text-gray-500">${c.turma || '-'}</td>
            <td class="p-3 text-right">
                <button onclick="apagarContacto(${c.id})" class="text-red-500 text-sm">Remover</button>
            </td>
        </tr>
    `).join('');
    
    const totalEl = document.getElementById('total-contactos');
    if(totalEl) totalEl.textContent = `Total: ${listaContactos.length} contactos`;
}

// Adicionar Contacto
document.getElementById('form-adicionar-contacto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('contacto-nome').value;
    const email = document.getElementById('contacto-email').value;
    const turma = document.getElementById('contacto-turma').value;

    const { error } = await supabaseClient.from('contactos_email').insert([{nome, email, turma}]);
    if(error) {
        mostrarNotificacao('Erro', 'Email já existe ou erro na base de dados.', 'erro');
    } else {
        mostrarNotificacao('Sucesso', 'Contacto adicionado!');
        e.target.reset();
        // Fechar modal se existir
        const modal = document.getElementById('modal-adicionar-email');
        if(modal) modal.classList.add('hidden');
        carregarContactos();
    }
});

async function apagarContacto(id) {
    await supabaseClient.from('contactos_email').delete().eq('id', id);
    carregarContactos();
}

// Modal Logic
function abrirModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function fecharModal(id) { document.getElementById(id)?.classList.add('hidden'); }

window.onload = verificarSessao;

// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://kswqakffuudugnfudizg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XM9rWUkcESRXVrKFFlgNDA_VZ8XgXJl';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// ==========================================
// LÓGICA DE PRÉ-VISUALIZAÇÃO DA FOTO E MB
// ==========================================
const inputFoto = document.getElementById('foto');
const previewImg = document.getElementById('preview-img');
const imagePreviewDiv = document.getElementById('image-preview');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const fileSizeInfo = document.getElementById('file-size-info');
const fileSizeText = document.getElementById('file-size-text');

if (inputFoto) {
    inputFoto.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                imagePreviewDiv.classList.remove('hidden');
                uploadPlaceholder.classList.add('hidden');
            }
            reader.readAsDataURL(file);

            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            fileSizeText.textContent = fileSizeMB;
            fileSizeInfo.classList.remove('hidden');
        } else {
            imagePreviewDiv.classList.add('hidden');
            uploadPlaceholder.classList.remove('hidden');
            fileSizeInfo.classList.add('hidden');
            previewImg.src = '';
        }
    });
}

// ==========================================
// VERIFICAÇÃO DE SEGURANÇA
// ==========================================
async function verificarSessao() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = session.user;
    document.getElementById('user-email').textContent = currentUser.email;

    const { data: perfil } = await supabaseClient.from('utilizadores').select('cargo').eq('id', currentUser.id).single();
    
    if (window.location.pathname.includes('admin.html') && perfil?.cargo !== 'admin') {
        alert("Acesso negado.");
        window.location.href = 'dashboard.html';
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
// INSERIR OBJETO E FAZER UPLOAD
// ==========================================
document.getElementById('form-objeto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit');
    const originalText = btnSubmit.innerHTML;
    
    btnSubmit.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> A guardar...`;
    btnSubmit.disabled = true;

    const titulo = document.getElementById('titulo').value;
    const categoria = document.getElementById('categoria').value;
    const sala = document.getElementById('sala').value;
    const fotoFile = document.getElementById('foto').files[0];

    try {
        const fileExt = fotoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;

        // 1. Upload da Foto
        const { data: uploadData, error: uploadError } = await supabaseClient.storage.from('objetos').upload(fileName, fotoFile);
        if (uploadError) throw uploadError;

        // 2. Obter URL da Foto
        const { data: { publicUrl } } = supabaseClient.storage.from('objetos').getPublicUrl(fileName);

        // 3. Inserir na Tabela
        const { error: insertError } = await supabaseClient.from('objetos').insert([{
            titulo: titulo,
            categoria: categoria,
            sala: sala,
            foto_url: publicUrl,
            estado: 'Achado',
            registado_por: currentUser.id
        }]);

        if (insertError) throw insertError;

        alert("Objeto registado com sucesso!");
        document.getElementById('form-objeto').reset();
        
        // Reset visual da imagem
        imagePreviewDiv.classList.add('hidden');
        uploadPlaceholder.classList.remove('hidden');
        fileSizeInfo.classList.add('hidden');
        
        carregarTabelaObjetos();

    } catch (error) {
        alert("Erro ao guardar: " + error.message);
    } finally {
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;
    }
});

// ==========================================
// CARREGAR TABELA COM BOTÃO NOTIFICAR
// ==========================================
async function carregarTabelaObjetos() {
    const tbody = document.getElementById('tabela-corpo');
    tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center"><svg class="animate-spin h-8 w-8 text-brand-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></td></tr>';

    const { data: objetos, error } = await supabaseClient.from('objetos').select('*').order('criado_em', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500 font-bold">Erro: ${error.message}</td></tr>`;
        return;
    }

    if (objetos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="p-12 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                        </div>
                        <h3 class="text-gray-900 font-bold text-lg">Sem objetos registados</h3>
                        <p class="text-gray-500 text-sm mt-1 max-w-sm mx-auto">Utiliza o formulário acima para adicionar o primeiro objeto perdido ao catálogo.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    
    objetos.forEach(obj => {
        const foto = obj.foto_url || 'https://via.placeholder.com/100';
        const isDevolvido = obj.estado === 'Devolvido';
        
        const statusBadge = isDevolvido 
            ? `<span class="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200"><span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Devolvido</span>`
            : `<span class="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200"><span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Achado</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition-colors group">
                <td class="p-5">
                    <img src="${foto}" class="w-14 h-14 object-cover rounded-xl shadow-sm border border-gray-100 group-hover:scale-105 transition-transform">
                </td>
                <td class="p-5">
                    <p class="font-bold text-gray-900 text-base">${obj.titulo}</p>
                    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-0.5">${obj.categoria}</p>
                </td>
                <td class="p-5 text-sm text-gray-600 font-medium">
                    <div class="flex items-center gap-1.5">
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        ${obj.sala}
                    </div>
                </td>
                <td class="p-5">
                    <button onclick="alterarEstado(${obj.id}, '${obj.estado}')" class="hover:opacity-80 transition-opacity" title="Clique para alterar o estado">
                        ${statusBadge}
                    </button>
                </td>
                <td class="p-5 text-center flex items-center justify-center gap-2">
                    <!-- Botão Notificar -->
                    <button onclick="abrirModalNotificar('${obj.titulo}', '${obj.sala}')" class="text-brand-blue hover:text-blue-800 hover:bg-blue-50 p-2.5 rounded-lg transition-all" title="Notificar Alunos por Email">
                        <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    </button>
                    
                    <!-- Botão Apagar -->
                    <button onclick="apagarObjeto(${obj.id})" class="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-lg transition-all" title="Eliminar Objeto">
                        <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
        `;
    });
}

// ==========================================
// AÇÕES (NOTIFICAR, MUDAR ESTADO, APAGAR)
// ==========================================
function abrirModalNotificar(titulo, sala) {
    const emails = prompt(`Notificar alunos sobre: ${titulo} (Sala: ${sala})\n\nInsere os emails separados por vírgula:`);
    if (!emails) return;

    const listaEmails = emails.split(',').map(e => e.trim());
    
    // Simulação de envio para a consola (Para a PAP, mostras que a função foi chamada)
    console.log(`A enviar emails para: ${listaEmails.join(', ')}`);
    console.log(`Assunto: Objeto Encontrado: ${titulo}`);
    console.log(`Mensagem: Encontrámos um(a) ${titulo} na sala ${sala}. Dirige-te à secretaria.`);
    
    alert(`Notificações simuladas com sucesso para: ${listaEmails.length} alunos.\n\n(Verifica a consola F12 para veres os detalhes ou o Mailtrap se configurado).`);
}

async function alterarEstado(id, estadoAtual) {
    const novoEstado = estadoAtual === 'Achado' ? 'Devolvido' : 'Achado';
    await supabaseClient.from('objetos').update({ estado: novoEstado }).eq('id', id);
    carregarTabelaObjetos(); 
}

async function apagarObjeto(id) {
    if (!confirm("Tem a certeza que deseja eliminar este objeto permanentemente?")) return;
    await supabaseClient.from('objetos').delete().eq('id', id);
    carregarTabelaObjetos(); 
}

window.onload = () => { verificarSessao(); };

// ==========================================
// GESTÃO DE CONTACTOS + ENVIO EM MASSA (WEB3FORMS)
// ==========================================
const WEB3FORMS_ACCESS_KEY = 'd7697e7b-29d7-4933-a5c6-72a68d2c77b8';
let listaContactos = [];

function abrirModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function fecharModal(id) {
    const modal = document.getElementById(id);
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function carregarContactos() {
    const tbody = document.getElementById('tabela-contactos');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center"><svg class="animate-spin h-6 w-6 text-brand-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></td></tr>`;

    const { data, error } = await supabaseClient.from('contactos_email').select('*').order('criado_em', { ascending: false });

    if (error) {
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
            </tr>`).join('');
    }

    document.getElementById('total-contactos').textContent = `Total: ${listaContactos.length} contacto${listaContactos.length !== 1 ? 's' : ''}`;
}

document.getElementById('form-adicionar-contacto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('contacto-nome').value.trim();
    const email = document.getElementById('contacto-email').value.trim();
    const turma = document.getElementById('contacto-turma').value.trim();

    const { error } = await supabaseClient.from('contactos_email').insert([{ nome, email, turma }]);

    if (error) {
        mostrarNotificacao('Erro', error.code === '23505' ? 'Este email já está na lista.' : error.message, 'erro');
    } else {
        mostrarNotificacao('Sucesso', `${nome} adicionado à lista.`);
        fecharModal('modal-adicionar-email');
        document.getElementById('form-adicionar-contacto').reset();
        carregarContactos();
    }
});

async function apagarContacto(id) {
    if (!confirm('Remover este contacto?')) return;
    await supabaseClient.from('contactos_email').delete().eq('id', id);
    mostrarNotificacao('Removido', 'Contacto eliminado.');
    carregarContactos();
}

function abrirModalEnvioMassa() {
    if (listaContactos.length === 0) {
        mostrarNotificacao('Lista Vazia', 'Adiciona contactos antes de enviares emails.', 'erro');
        return;
    }
    document.getElementById('contador-destinatarios').textContent = `${listaContactos.length} destinatário${listaContactos.length !== 1 ? 's' : ''}`;
    abrirModal('modal-envio-massa');
}

document.getElementById('form-envio-massa')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const assunto = document.getElementById('massa-assunto').value;
    const mensagem = document.getElementById('massa-mensagem').value;
    const btn = document.getElementById('btn-enviar-massa');
    const originalText = btn.innerHTML;

    btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> A enviar...`;
    btn.disabled = true;

    let enviados = 0, erros = 0;

    for (const contacto of listaContactos) {
        try {
            const formData = new FormData();
            formData.append('access_key', WEB3FORMS_ACCESS_KEY);
            formData.append('subject', assunto);
            formData.append('from_name', 'FindIT School');
            formData.append('Nome', contacto.nome);
            formData.append('Turma', contacto.turma || 'N/A');
            formData.append('Mensagem', mensagem);

            const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) enviados++;
            else erros++;
        } catch {
            erros++;
        }
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
    mostrarNotificacao(
        erros === 0 ? 'Enviados!' : 'Envio Parcial',
        `${enviados} enviados, ${erros} falharam.`,
        erros === 0 ? 'sucesso' : 'erro'
    );
    fecharModal('modal-envio-massa');
    document.getElementById('form-envio-massa').reset();
});

// Adicionar ao window.onload existente
const onloadAnterior = window.onload;
window.onload = async () => {
    if (onloadAnterior) await onloadAnterior();
    carregarContactos();
};

// ==========================================
// GESTÃO DE CONTACTOS (EMAILS)
// ==========================================
const WEB3FORMS_ACCESS_KEY = 'd7697e7b-29d7-4933-a5c6-72a68d2c77b8';
let listaContactos = [];

// Sistema de Notificação Toast
function mostrarNotificacao(titulo, mensagem, tipo = 'sucesso') {
    const toast = document.getElementById('toast');
    if (!toast) {
        // Criar toast se não existir
        const novoToast = document.createElement('div');
        novoToast.id = 'toast';
        novoToast.className = 'fixed bottom-6 right-6 transform translate-y-20 opacity-0 transition-all duration-300 z-50 bg-white border-l-4 border-brand-blue shadow-2xl rounded-lg p-4 flex items-center gap-3 max-w-sm';
        novoToast.innerHTML = `
            <div id="toast-icon"></div>
            <div>
                <h4 id="toast-title" class="font-bold text-gray-900 text-sm"></h4>
                <p id="toast-message" class="text-gray-600 text-xs mt-0.5"></p>
            </div>
        `;
        document.body.appendChild(novoToast);
        return mostrarNotificacao(titulo, mensagem, tipo);
    }
    
    document.getElementById('toast-title').textContent = titulo;
    document.getElementById('toast-message').textContent = mensagem;
    
    if (tipo === 'sucesso') {
        toast.className = 'fixed bottom-6 right-6 transform translate-y-0 opacity-100 transition-all duration-300 z-50 bg-white border-l-4 border-green-500 shadow-2xl rounded-lg p-4 flex items-center gap-3 max-w-sm';
        document.getElementById('toast-icon').innerHTML = '<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    } else {
        toast.className = 'fixed bottom-6 right-6 transform translate-y-0 opacity-100 transition-all duration-300 z-50 bg-white border-l-4 border-red-500 shadow-2xl rounded-lg p-4 flex items-center gap-3 max-w-sm';
        document.getElementById('toast-icon').innerHTML = '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    }
    
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 4000);
}

// Funções de Modal
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

// Carregar contactos da base de dados
async function carregarContactos() {
    const tbody = document.getElementById('tabela-contactos');
    if (!tbody) {
        console.log('Tabela de contactos não encontrada no HTML');
        return;
    }

    tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center"><svg class="animate-spin h-6 w-6 text-brand-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></td></tr>';

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
            tbody.innerHTML = '<tr><td colspan="4" class="p-12 text-center text-gray-500">Nenhum contacto na lista. Adiciona emails de delegados de turma.</td></tr>';
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
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-500">Erro: ${error.message}</td></tr>`;
    }
}

// Adicionar contacto
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
            console.error('Erro ao inserir:', error);
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
        console.error('Erro:', error);
        mostrarNotificacao('Erro', 'Erro ao adicionar contacto.', 'erro');
    }
}

// Apagar contacto
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
        console.error('Erro:', error);
        mostrarNotificacao('Erro', 'Erro ao eliminar contacto.', 'erro');
    }
}

// Abrir modal de envio em massa
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

// Enviar email em massa
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
    btn.innerHTML = '<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> A enviar...';
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

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    carregarContactos();

    const formAdicionar = document.getElementById('form-adicionar-contacto');
    if (formAdicionar) {
        formAdicionar.addEventListener('submit', adicionarContacto);
    }

    const formMassa = document.getElementById('form-envio-massa');
    if (formMassa) {
        formMassa.addEventListener('submit', enviarEmailMassa);
    }
});

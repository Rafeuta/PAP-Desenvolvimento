// ==========================================
// 1. CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://kswqakffuudugnfudizg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XM9rWUkcESRXVrKFFlgNDA_VZ8XgXJl';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. CONFIGURAÇÃO DO EMAILJS
// ==========================================
// Estas são as chaves que configurámos. 
// NOTA: Se a Public Key falhar, verifica no site do EmailJS se é esta mesma.
const EMAILJS_SERVICE_ID = 'service_vr8m9ms';
const EMAILJS_TEMPLATE_ID = 'template_sfue4jf';
const EMAILJS_PUBLIC_KEY = '2DOZgWNakRCfg9ZNd'; 

// Inicializar EmailJS
if (typeof emailjs !== 'undefined') {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

// ==========================================
// 3. MODO DE TESTE (TEMP MAIL)
// ==========================================
// true = Envia tudo para o EMAIL_TESTE (seguro para testes)
// false = Envia para os emails reais da lista de contactos
const MODO_TESTE = true; 
const EMAIL_TESTE = 'vigixoh963@dvdee.com'; // O teu Temp Mail atual

let currentUser = null;
let listaContactos = [];
let objetoEditando = null; // Guarda o ID do objeto em edição

// Variável global para guardar o objeto atual que está a ser enviado
let objetoParaEnviar = null;
/* Escapa valores provenientes da base de dados antes de os inserir no HTML. */
function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}


// ==========================================
// 4. SISTEMA DE NOTIFICAÇÃO (TOAST)
// ==========================================
function mostrarNotificacao(titulo, mensagem, tipo = 'sucesso') {
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    
    const bgClass = tipo === 'sucesso' ? 'bg-green-600' : 'bg-red-600';
    const icon = tipo === 'sucesso' 
        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';

    toast.className = `fixed bottom-6 right-6 ${bgClass} text-white px-6 py-4 rounded-lg shadow-2xl z-[100] flex items-center gap-3 transform transition-all duration-300 translate-y-0 opacity-100 max-w-md border-l-4 border-white/20`;
    toast.innerHTML = `
        <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icon}</svg>
        <div>
            <h4 class="toast-title font-bold text-sm uppercase tracking-wide"></h4>
            <p class="toast-message text-xs opacity-90 mt-0.5"></p>
        </div>
    `;
    toast.querySelector('.toast-title').textContent = String(titulo ?? '');
    toast.querySelector('.toast-message').textContent = String(mensagem ?? '');
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================
// 5. VERIFICAÇÃO DE SESSÃO
// ==========================================
async function verificarSessao() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.replace('index.html');
        return;
    }

    const { data: perfil, error: perfilError } = await supabaseClient
        .from('utilizadores')
        .select('cargo')
        .eq('id', session.user.id)
        .maybeSingle();

    const paginaAdmin = /\/admin\.html$/i.test(window.location.pathname);
    const cargoValido = perfil && ['admin', 'funcionario'].includes(perfil.cargo);
    const acessoPermitido = cargoValido && (!paginaAdmin || perfil.cargo === 'admin');

    if (perfilError || !acessoPermitido) {
        await supabaseClient.auth.signOut();
        window.location.replace('index.html');
        return;
    }

    currentUser = session.user;
    const userEmailEl = document.getElementById('user-email');
    if (userEmailEl) userEmailEl.textContent = currentUser.email;

    await Promise.all([carregarTabelaObjetos(), carregarContactos()]);
}

document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
});

// ==========================================
// 6. GESTÃO DE OBJETOS (CRIAR / EDITAR)
// ==========================================
const formObjeto = document.getElementById('form-objeto');
if (formObjeto) {
    formObjeto.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSubmit = document.getElementById('btn-submit');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> A processar...`;

        const titulo = document.getElementById('titulo').value.trim();
        const categoria = document.getElementById('categoria').value;
        const sala = document.getElementById('sala').value.trim();
        const fotoFile = document.getElementById('foto').files[0];
        let uploadedPath = null;

        try {
            let foto_url = objetoEditando ? objetoEditando.foto_url : '';

            // Aceitar apenas imagens comuns até 5 MB.
            if (fotoFile) {
                const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
                if (!extensions[fotoFile.type]) throw new Error('Formato inválido. Utiliza JPG, PNG ou WebP.');
                if (fotoFile.size > 5 * 1024 * 1024) throw new Error('A fotografia não pode ultrapassar 5 MB.');
                const uniqueId = window.crypto && typeof window.crypto.randomUUID === 'function' ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const fileName = `${uniqueId}.${extensions[fotoFile.type]}`;
                uploadedPath = fileName;

                const { error: uploadError } = await supabaseClient.storage.from('objetos').upload(fileName, fotoFile, {
                    contentType: fotoFile.type,
                    upsert: false
                });
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabaseClient.storage.from('objetos').getPublicUrl(fileName);
                foto_url = publicUrl;
            } else if (!objetoEditando) {
                throw new Error("A fotografia é obrigatória.");
            }

            if (objetoEditando) {
                // ATUALIZAR
                const { error } = await supabaseClient.from('objetos').update({
                    titulo, categoria, sala, foto_url
                }).eq('id', objetoEditando.id);
                
                if (error) throw error;
                mostrarNotificacao('Sucesso', 'Objeto atualizado!');
                objetoEditando = null;
                btnSubmit.textContent = 'Guardar Objeto';
                btnSubmit.classList.remove('bg-orange-600', 'hover:bg-orange-700');
                btnSubmit.classList.add('bg-brand-blue', 'hover:bg-blue-900');
            } else {
                // INSERIR
                const { error } = await supabaseClient.from('objetos').insert([{
                    titulo, categoria, sala, foto_url, 
                    estado: 'Achado', 
                    registado_por: currentUser.id
                }]);
                
                if (error) throw error;
                mostrarNotificacao('Sucesso', 'Objeto registado!');
            }

            formObjeto.reset();
            resetImagePreview();
            carregarTabelaObjetos();

        } catch (error) {
            if (uploadedPath) {
                await supabaseClient.storage.from('objetos').remove([uploadedPath]).catch(() => {});
            }
            console.error(error);
            mostrarNotificacao('Erro', error.message || 'Não foi possível guardar o objeto.', 'erro');
        } finally {
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    });
}

function resetImagePreview() {
    const previewDiv = document.getElementById('image-preview');
    const placeholderDiv = document.getElementById('upload-placeholder');
    const fileInfo = document.getElementById('file-size-info');
    
    if (previewDiv) previewDiv.classList.add('hidden');
    if (placeholderDiv) placeholderDiv.classList.remove('hidden');
    if (fileInfo) fileInfo.classList.add('hidden');
}

const inputFoto = document.getElementById('foto');
if (inputFoto) {
    inputFoto.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewImg = document.getElementById('preview-img');
                const previewDiv = document.getElementById('image-preview');
                const placeholderDiv = document.getElementById('upload-placeholder');
                const fileInfo = document.getElementById('file-size-info');
                const fileSizeText = document.getElementById('file-size-text');

                if (previewImg) previewImg.src = e.target.result;
                if (previewDiv) previewDiv.classList.remove('hidden');
                if (placeholderDiv) placeholderDiv.classList.add('hidden');
                
                if (fileSizeText) fileSizeText.textContent = (file.size / (1024 * 1024)).toFixed(2);
                if (fileInfo) fileInfo.classList.remove('hidden');
            }
            reader.readAsDataURL(file);
        }
    });
}

// ==========================================
// 7. TABELA DE OBJETOS
// ==========================================
async function carregarTabelaObjetos() {
    const tbody = document.getElementById('tabela-corpo');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center"><svg class="animate-spin h-8 w-8 text-brand-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></td></tr>`;

    const { data: objetos, error } = await supabaseClient.from('objetos').select('*').order('criado_em', { ascending: false });
    
    if (error) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-red-500">Não foi possível carregar os objetos.</td></tr>';
        mostrarNotificacao('Erro', 'Não foi possível carregar os objetos. Verifica as permissões e a ligação à base de dados.', 'erro');
        console.error(error);
        return;
    }

    if (!objetos || objetos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-12 text-center text-gray-500">Nenhum objeto encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    objetos.forEach(obj => {
        const estadoAtual = obj.estado === 'Devolvido' ? 'Devolvido' : 'Achado';
        const isDevolvido = estadoAtual === 'Devolvido';
        const badgeClass = isDevolvido ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200';
        const badgeText = estadoAtual;

        tbody.innerHTML += `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="p-4">
                    <img src="${escapeHTML(obj.foto_url)}" class="w-12 h-12 object-cover rounded-lg border border-gray-200 shadow-sm">
                </td>
                <td class="p-4">
                    <div class="font-bold text-gray-900">${escapeHTML(obj.titulo)}</div>
                    <div class="text-xs text-gray-500 uppercase font-semibold mt-1">${escapeHTML(obj.categoria)}</div>
                </td>
                <td class="p-4 text-sm text-gray-600 font-medium">${escapeHTML(obj.sala)}</td>
                <td class="p-4">
                    <button onclick="alterarEstado(${Number(obj.id)})" class="px-3 py-1 rounded-full text-xs font-bold border ${badgeClass} hover:opacity-80 transition-opacity cursor-pointer">
                        ${badgeText}
                    </button>
                </td>
                <td class="p-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button onclick="prepararEdicao(${obj.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button onclick="enviarNotificacaoObjeto(${obj.id})" class="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Enviar Email">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        </button>
                        <button onclick="apagarObjeto(${obj.id})" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

async function prepararEdicao(id) {
    const { data: obj } = await supabaseClient.from('objetos').select('*').eq('id', id).single();
    if (!obj) return;

    objetoEditando = obj;
    document.getElementById('titulo').value = obj.titulo;
    document.getElementById('categoria').value = obj.categoria;
    document.getElementById('sala').value = obj.sala;

    const previewImg = document.getElementById('preview-img');
    const previewDiv = document.getElementById('image-preview');
    const placeholderDiv = document.getElementById('upload-placeholder');

    if (previewImg && obj.foto_url) {
        previewImg.src = obj.foto_url;
        if (previewDiv) previewDiv.classList.remove('hidden');
        if (placeholderDiv) placeholderDiv.classList.add('hidden');
    }

    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) {
        btnSubmit.textContent = 'Atualizar Objeto';
        btnSubmit.classList.remove('bg-brand-blue', 'hover:bg-blue-900');
        btnSubmit.classList.add('bg-orange-600', 'hover:bg-orange-700');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarNotificacao('Modo Edição', `A editar: ${escapeHTML(obj.titulo)}`);
}

async function alterarEstado(id) {
    try {
        const { data: objeto, error: leituraErro } = await supabaseClient
            .from('objetos').select('estado').eq('id', id).single();
        if (leituraErro) throw leituraErro;
        const novoEstado = objeto.estado === 'Achado' ? 'Devolvido' : 'Achado';
        const { error } = await supabaseClient.from('objetos').update({ estado: novoEstado }).eq('id', id);
        if (error) throw error;
        mostrarNotificacao('Estado atualizado', `Marcado como ${novoEstado}.`);
        await carregarTabelaObjetos();
    } catch (error) {
        console.error(error);
        mostrarNotificacao('Erro', error.message || 'Não foi possível alterar o estado.', 'erro');
    }
}

async function apagarObjeto(id) {
    if (!confirm('Eliminar este objeto?')) return;
    try {
        const { error } = await supabaseClient.from('objetos').delete().eq('id', id);
        if (error) throw error;
        mostrarNotificacao('Eliminado', 'Objeto removido.');
        await carregarTabelaObjetos();
    } catch (error) {
        console.error(error);
        mostrarNotificacao('Erro', error.message || 'Não foi possível eliminar o objeto.', 'erro');
    }
}

// ==========================================
// 8. ENVIO DE EMAILS (COM MODAL DE SELEÇÃO)
// ==========================================

// Função chamada pelo botão na tabela
async function enviarNotificacaoObjeto(objetoId) {
    // 1. Buscar dados do objeto
    const { data: obj } = await supabaseClient.from('objetos').select('*').eq('id', objetoId).single();
    if (!obj) return;

    // 2. Verificar se há contactos
    if (listaContactos.length === 0) {
        mostrarNotificacao('Lista Vazia', 'Adiciona emails na lista primeiro.', 'erro');
        return;
    }

    // 3. Guardar objeto e abrir modal
    objetoParaEnviar = obj;
    gerarListaCheckboxes();
    abrirModal('modal-selecao-emails');
}

// Gera os checkboxes dinamicamente
function gerarListaCheckboxes() {
    const container = document.getElementById('lista-checkboxes-container');
    if (!container) return;

    container.innerHTML = '';

    listaContactos.forEach((c, index) => {
        // Se MODO_TESTE estiver ativo, mostramos um aviso visual mas mantemos o email real na label
        const isTestMode = MODO_TESTE;
        const badgeTeste = isTestMode ? '<span class="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full border border-yellow-200">TESTE → Temp Mail</span>' : '';

        const div = document.createElement('div');
        div.className = "flex items-center p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors";
        div.innerHTML = `
            <input type="checkbox" id="chk-${index}" value="${escapeHTML(c.email)}" class="email-checkbox w-5 h-5 text-brand-blue rounded focus:ring-brand-blue cursor-pointer" checked>
            <label for="chk-${index}" class="ml-3 flex-grow cursor-pointer flex flex-col">
                <span class="font-bold text-gray-900 text-sm">${escapeHTML(c.nome)} ${badgeTeste}</span>
                <span class="text-xs text-gray-500">${escapeHTML(c.email)} • ${escapeHTML(c.turma || 'Sem Turma')}</span>
            </label>
        `;
        container.appendChild(div);
    });

    // Marcar "Selecionar Todos" como true por defeito
    const checkTodos = document.getElementById('check-todos');
    if (checkTodos) checkTodos.checked = true;
}

// Função para o checkbox "Selecionar Todos"
function toggleTodosCheckboxes(estado) {
    const checkboxes = document.querySelectorAll('.email-checkbox');
    checkboxes.forEach(chk => chk.checked = estado);
}

// Função final que envia os emails
let envioEmailsEmCurso = false;

async function confirmarEnvioEmails() {
    if (!objetoParaEnviar || envioEmailsEmCurso) return;

    const emailsSelecionados = Array.from(document.querySelectorAll('.email-checkbox:checked'))
        .map(chk => listaContactos.find(c => c.email === chk.value))
        .filter(Boolean);

    if (emailsSelecionados.length === 0) {
        mostrarNotificacao('Atenção', 'Seleciona pelo menos um destinatário.', 'erro');
        return;
    }
    if (typeof emailjs === 'undefined' || typeof emailjs.send !== 'function') {
        mostrarNotificacao('Erro', 'O serviço de email não está disponível. Atualiza a página e tenta novamente.', 'erro');
        return;
    }

    const btnEnviar = document.querySelector('#modal-selecao-emails button[onclick="confirmarEnvioEmails()"]');
    const textoOriginal = btnEnviar ? btnEnviar.textContent : '';
    const obj = objetoParaEnviar;

    if (!MODO_TESTE && !confirm('Confirmas o envio de ' + emailsSelecionados.length + ' notificações para os endereços selecionados?')) return;

    envioEmailsEmCurso = true;
    if (btnEnviar) {
        btnEnviar.disabled = true;
        btnEnviar.textContent = 'A enviar…';
    }

    let sucessos = 0;
    let falhas = 0;

    try {
        fecharModal('modal-selecao-emails');
        for (const dest of emailsSelecionados) {
            try {
                const templateParams = {
                    to_email: MODO_TESTE ? EMAIL_TESTE : dest.email,
                    name: MODO_TESTE ? '[TESTE] ' + dest.nome : dest.nome,
                    assunto: 'Objeto Encontrado: ' + obj.titulo,
                    mensagem: 'Informamos que foi encontrado um objeto nas instalações da escola.',
                    titulo_objeto: obj.titulo,
                    categoria: obj.categoria,
                    localizacao: obj.sala,
                    estado: obj.estado,
                    foto_url: obj.foto_url || ''
                };
                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
                sucessos++;
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                falhas++;
                console.error('Falha no envio para ' + dest.email, error);
            }
        }

        if (falhas === 0) {
            const destino = MODO_TESTE ? 'para o endereço de teste (' + EMAIL_TESTE + ')' : 'para os destinatários selecionados';
            mostrarNotificacao('Envio concluído', sucessos + ' email(s) enviado(s) ' + destino + '.');
        } else {
            mostrarNotificacao('Envio parcial', sucessos + ' enviado(s); ' + falhas + ' falharam. Consulta a consola para detalhes.', 'erro');
        }
    } finally {
        envioEmailsEmCurso = false;
        if (btnEnviar) {
            btnEnviar.disabled = false;
            btnEnviar.textContent = textoOriginal || 'Enviar';
        }
        objetoParaEnviar = null;
    }
}

// ==========================================
// 9. GESTÃO DE CONTACTOS
// ==========================================
async function carregarContactos() {
    const tbody = document.getElementById('tabela-contactos');
    if (!tbody) return;

    const { data, error } = await supabaseClient.from('contactos_email').select('*').order('nome');
    if (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-red-500">Não foi possível carregar os contactos.</td></tr>';
        mostrarNotificacao('Erro', 'Não foi possível carregar os contactos.', 'erro');
        return;
    }
    listaContactos = data || [];

    if (listaContactos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-gray-500 italic">Nenhum contacto.</td></tr>`;
    } else {
        tbody.innerHTML = listaContactos.map(c => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
                <td class="p-3 font-semibold text-gray-800">${escapeHTML(c.nome)}</td>
                <td class="p-3 text-gray-600 text-sm">${escapeHTML(c.email)}</td>
                <td class="p-3 text-gray-500 text-sm">${c.turma || '-'}</td>
                <td class="p-3 text-right">
                    <button onclick="removerContacto(${c.id})" class="text-red-400 hover:text-red-600 text-xs font-bold uppercase">Remover</button>
                </td>
            </tr>
        `).join('');
    }

    const counter = document.getElementById('total-contactos');
    if (counter) counter.textContent = `Total: ${listaContactos.length} contactos`;
}

document.getElementById('form-adicionar-contacto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('contacto-nome').value.trim();
    const email = document.getElementById('contacto-email').value.trim().toLowerCase();
    const turma = document.getElementById('contacto-turma').value.trim();

    if (!nome || !email) {
        mostrarNotificacao('Atenção', 'Preenche o nome e um email válido.', 'erro');
        return;
    }
    if (listaContactos.some(contacto => contacto.email.toLowerCase() === email)) {
        mostrarNotificacao('Contacto existente', 'Este endereço já está na lista.', 'erro');
        return;
    }

    const { error } = await supabaseClient.from('contactos_email').insert([{ nome, email, turma }]);

    if (error) {
        mostrarNotificacao('Erro', 'Email já existe ou erro na BD.', 'erro');
    } else {
        mostrarNotificacao('Sucesso', 'Contacto adicionado!');
        e.target.reset();
        fecharModal('modal-adicionar-email');
        carregarContactos();
    }
});

async function removerContacto(id) {
    if (!confirm('Remover contacto?')) return;
    try {
        const { error } = await supabaseClient.from('contactos_email').delete().eq('id', id);
        if (error) throw error;
        mostrarNotificacao('Contacto removido', 'O contacto foi retirado da lista.');
        await carregarContactos();
    } catch (error) {
        console.error(error);
        mostrarNotificacao('Erro', error.message || 'Não foi possível remover o contacto.', 'erro');
    }
}

// ==========================================
// 10. MODAIS
// ==========================================
function abrirModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('hidden'); el.classList.add('flex'); }
}

function fecharModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
}

window.onclick = function(event) {
    if (event.target.classList.contains('fixed') && event.target.classList.contains('inset-0')) {
        event.target.classList.add('hidden');
        event.target.classList.remove('flex');
    }
}

window.onload = () => { verificarSessao(); };


// ==========================================
// 11. CONVITES TEMPORÁRIOS PARA FUNCIONÁRIOS (ADMIN)
// ==========================================
(() => {
  const button = document.getElementById('btn-gerar-codigo-funcionario');
  if (!button) return;
  const panel = document.getElementById('painel-codigo-funcionario');
  const codeEl = document.getElementById('codigo-funcionario-gerado');
  const timerEl = document.getElementById('contador-codigo-funcionario');
  const statusEl = document.getElementById('estado-codigo-funcionario');
  const copyButton = document.getElementById('btn-copiar-codigo-funcionario');
  let interval = null;
  let currentCode = '';

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'A gerar…';
    statusEl.textContent = '';
    try {
      const { data, error } = await supabaseClient.rpc('generate_staff_registration_code');
      if (error) throw error;
      if (typeof data !== 'string' || !data) throw new Error('O servidor não devolveu um código válido.');
      currentCode = data;
      codeEl.textContent = currentCode;
      panel.classList.remove('hidden');
      let remaining = 180;
      const update = () => {
        const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
        const seconds = String(remaining % 60).padStart(2, '0');
        timerEl.textContent = remaining > 0 ? 'Expira em ' + minutes + ':' + seconds : 'Código expirado. Gera um novo.';
        if (remaining <= 0) {
          clearInterval(interval);
          currentCode = '';
          codeEl.textContent = '—— —— ——';
          copyButton.disabled = true;
        }
      };
      copyButton.disabled = false;
      if (interval) clearInterval(interval);
      update();
      interval = setInterval(() => { remaining--; update(); }, 1000);
      statusEl.textContent = 'Código criado. Partilha-o apenas com o funcionário autorizado.';
    } catch (error) {
      console.error(error);
      statusEl.textContent = error.message || 'Não foi possível gerar o código.';
    } finally {
      button.disabled = false;
      button.textContent = 'Gerar novo código';
    }
  });

  copyButton?.addEventListener('click', async () => {
    if (!currentCode) return;
    try {
      await navigator.clipboard.writeText(currentCode);
      statusEl.textContent = 'Código copiado.';
    } catch {
      statusEl.textContent = 'Não foi possível copiar automaticamente. Seleciona o código.';
    }
  });
})();

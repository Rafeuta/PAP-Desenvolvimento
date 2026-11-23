// ==========================================
// 1. CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://kswqakffuudugnfudizg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XM9rWUkcESRXVrKFFlgNDA_VZ8XgXJl';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. CONFIGURAÇÃO DO EMAILJS (JÁ PREENCHIDA)
// ==========================================
// Estas são as chaves que me deste. 
// NOTA: Verifica se a Public Key está completa no site do EmailJS (geralmente é maior).
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
// Se true, TODOS os emails vão para o EMAIL_TESTE (para não spamar ninguém)
// Se false, envia para os emails reais da lista de contactos
const MODO_TESTE = true; 
const EMAIL_TESTE = 'vigixoh963@dvdee.com'; // O teu Temp Mail atual

let currentUser = null;
let listaContactos = [];
let objetoEditando = null; // Guarda o objeto que está a ser editado

// ==========================================
// 4. SISTEMA DE NOTIFICAÇÃO (TOAST)
// ==========================================
function mostrarNotificacao(titulo, mensagem, tipo = 'sucesso') {
    // Remove toast anterior se existir
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    
    // Cores baseadas no tipo
    const bgClass = tipo === 'sucesso' ? 'bg-green-600' : 'bg-red-600';
    const icon = tipo === 'sucesso' 
        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';

    toast.className = `fixed bottom-6 right-6 ${bgClass} text-white px-6 py-4 rounded-lg shadow-2xl z-[100] flex items-center gap-3 transform transition-all duration-300 translate-y-0 opacity-100 max-w-md border-l-4 border-white/20`;
    toast.innerHTML = `
        <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icon}</svg>
        <div>
            <h4 class="font-bold text-sm uppercase tracking-wide">${titulo}</h4>
            <p class="text-xs opacity-90 mt-0.5">${mensagem}</p>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animação de saída
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================
// 5. VERIFICAÇÃO DE SESSÃO E INICIALIZAÇÃO
// ==========================================
async function verificarSessao() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = session.user;
    
    const userEmailEl = document.getElementById('user-email');
    if (userEmailEl) userEmailEl.textContent = currentUser.email;
    
    // Carregar dados iniciais
    carregarTabelaObjetos();
    carregarContactos();
}

// Logout
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    });
}

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
            } else if (!objetoEditando) {
                throw new Error("A fotografia é obrigatória para novos objetos.");
            }

            if (objetoEditando) {
                // --- MODO EDIÇÃO ---
                const { error } = await supabaseClient.from('objetos').update({
                    titulo, categoria, sala, foto_url
                }).eq('id', objetoEditando.id);
                
                if (error) throw error;
                mostrarNotificacao('Sucesso', 'Objeto atualizado com sucesso!');
                
                // Reset modo edição
                objetoEditando = null;
                btnSubmit.textContent = 'Guardar Objeto';
                btnSubmit.classList.remove('bg-orange-600', 'hover:bg-orange-700');
                btnSubmit.classList.add('bg-brand-blue', 'hover:bg-blue-900');

            } else {
                // --- MODO CRIAÇÃO ---
                const { error } = await supabaseClient.from('objetos').insert([{
                    titulo, categoria, sala, foto_url, 
                    estado: 'Achado', 
                    registado_por: currentUser.id
                }]);
                
                if (error) throw error;
                mostrarNotificacao('Sucesso', 'Objeto registado no sistema!');
            }

            // Limpar formulário
            formObjeto.reset();
            resetImagePreview();
            carregarTabelaObjetos();

        } catch (error) {
            console.error(error);
            mostrarNotificacao('Erro', error.message, 'erro');
        } finally {
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    });
}

// Função auxiliar para limpar preview da imagem
function resetImagePreview() {
    const previewDiv = document.getElementById('image-preview');
    const placeholderDiv = document.getElementById('upload-placeholder');
    const fileInfo = document.getElementById('file-size-info');
    
    if (previewDiv) previewDiv.classList.add('hidden');
    if (placeholderDiv) placeholderDiv.classList.remove('hidden');
    if (fileInfo) fileInfo.classList.add('hidden');
}

// Pré-visualização da imagem ao selecionar
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
// 7. TABELA DE OBJETOS (LER / APAGAR / EDITAR)
// ==========================================
async function carregarTabelaObjetos() {
    const tbody = document.getElementById('tabela-corpo');
    if (!tbody) return;

    // Loading state
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center"><svg class="animate-spin h-8 w-8 text-brand-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></td></tr>`;

    const { data: objetos, error } = await supabaseClient.from('objetos').select('*').order('criado_em', { ascending: false });
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-500">Erro ao carregar: ${error.message}</td></tr>`;
        return;
    }

    if (!objetos || objetos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-12 text-center text-gray-500">Nenhum objeto encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    objetos.forEach(obj => {
        const isDevolvido = obj.estado === 'Devolvido';
        const badgeClass = isDevolvido ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200';
        const badgeText = isDevolvido ? 'Devolvido' : 'Achado';

        const row = `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="p-4">
                    <img src="${obj.foto_url}" alt="${obj.titulo}" class="w-12 h-12 object-cover rounded-lg border border-gray-200 shadow-sm">
                </td>
                <td class="p-4">
                    <div class="font-bold text-gray-900">${obj.titulo}</div>
                    <div class="text-xs text-gray-500 uppercase font-semibold mt-1">${obj.categoria}</div>
                </td>
                <td class="p-4 text-sm text-gray-600 font-medium">${obj.sala}</td>
                <td class="p-4">
                    <button onclick="alterarEstado(${obj.id}, '${obj.estado}')" class="px-3 py-1 rounded-full text-xs font-bold border ${badgeClass} hover:opacity-80 transition-opacity cursor-pointer" title="Clica para alterar o estado">
                        ${badgeText}
                    </button>
                </td>
                <td class="p-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button onclick="prepararEdicao(${obj.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Objeto">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button onclick="enviarNotificacaoObjeto(${obj.id})" class="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Notificar Alunos (Email)">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        </button>
                        <button onclick="apagarObjeto(${obj.id})" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Objeto">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// --- Ações da Tabela ---

async function prepararEdicao(id) {
    const { data: obj } = await supabaseClient.from('objetos').select('*').eq('id', id).single();
    if (!obj) return;

    objetoEditando = obj;

    // Preencher formulário
    document.getElementById('titulo').value = obj.titulo;
    document.getElementById('categoria').value = obj.categoria;
    document.getElementById('sala').value = obj.sala;

    // Mostrar imagem atual
    const previewImg = document.getElementById('preview-img');
    const previewDiv = document.getElementById('image-preview');
    const placeholderDiv = document.getElementById('upload-placeholder');

    if (previewImg && obj.foto_url) {
        previewImg.src = obj.foto_url;
        if (previewDiv) previewDiv.classList.remove('hidden');
        if (placeholderDiv) placeholderDiv.classList.add('hidden');
    }

    // Mudar botão para "Atualizar"
    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) {
        btnSubmit.textContent = 'Atualizar Objeto';
        btnSubmit.classList.remove('bg-brand-blue', 'hover:bg-blue-900');
        btnSubmit.classList.add('bg-orange-600', 'hover:bg-orange-700');
    }

    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarNotificacao('Modo Edição', `A editar: ${obj.titulo}. Faz as alterações e clica em Atualizar.`);
}

async function alterarEstado(id, estadoAtual) {
    const novoEstado = estadoAtual === 'Achado' ? 'Devolvido' : 'Achado';
    const { error } = await supabaseClient.from('objetos').update({ estado: novoEstado }).eq('id', id);
    
    if (error) {
        mostrarNotificacao('Erro', 'Falha ao atualizar estado.', 'erro');
    } else {
        mostrarNotificacao('Estado Atualizado', `Objeto marcado como ${novoEstado}.`);
        carregarTabelaObjetos();
    }
}

async function apagarObjeto(id) {
    if (!confirm("Tem a certeza que deseja eliminar este objeto permanentemente?")) return;
    
    const { error } = await supabaseClient.from('objetos').delete().eq('id', id);
    if (error) {
        mostrarNotificacao('Erro', 'Falha ao eliminar.', 'erro');
    } else {
        mostrarNotificacao('Eliminado', 'Objeto removido do sistema.');
        carregarTabelaObjetos();
    }
}

// ==========================================
// 8. ENVIO DE EMAILS (EMAILJS + MODO TESTE)
// ==========================================
async function enviarNotificacaoObjeto(objetoId) {
    // 1. Verificar contactos
    if (listaContactos.length === 0) {
        mostrarNotificacao('Lista Vazia', 'Adiciona emails na lista de contactos primeiro.', 'erro');
        return;
    }

    // 2. Buscar dados do objeto
    const { data: obj } = await supabaseClient.from('objetos').select('*').eq('id', objetoId).single();
    if (!obj) return;

    // 3. Confirmar
    const destinoReal = listaContactos.length === 1 ? listaContactos[0].email : `${listaContactos.length} contactos`;
    const destinoTeste = EMAIL_TESTE;
    const msgConfirm = MODO_TESTE 
        ? `MODO DE TESTE ATIVO!\n\nO email será enviado para: ${destinoTeste}\n(em vez de ir para ${destinoReal})\n\nDeseja continuar?`
        : `Enviar email para ${destinoReal} sobre "${obj.titulo}"?`;

    if (!confirm(msgConfirm)) return;

    mostrarNotificacao('A Enviar...', `A processar ${listaContactos.length} emails...`);

    let sucessos = 0;
    let falhas = 0;

    // 4. Loop de Envio
    for (const contacto of listaContactos) {
        try {
            // Definir destinatário final (Teste vs Real)
            const emailFinal = MODO_TESTE ? EMAIL_TESTE : contacto.email;
            const nomeFinal = MODO_TESTE ? `[TESTE] ${contacto.nome}` : contacto.nome;

            // Parâmetros para o Template do EmailJS
// ESTES NOMES TÊM DE SER IGUAIS AOS DO TEMPLATE!
const templateParams = {
    to_email: emailFinal,          // Vai para o campo "To Email"
    name: nomeFinal,               // Vai para {{name}}
    assunto: `Objeto Encontrado: ${obj.titulo}`, // Vai para {{assunto}}
    mensagem: `Informamos que foi encontrado um objeto na escola.`, // Vai para {{mensagem}}
    
    // Dados do objeto
    titulo_objeto: obj.titulo,     // Vai para {{titulo_objeto}}
    categoria: obj.categoria,      // Vai para {{categoria}}
    localizacao: obj.sala,         // Vai para {{localizacao}}
    estado: obj.estado             // Vai para {{estado}}
};

// Enviar via EmailJS
await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
            
            // Pequena pausa para não sobrecarregar a API
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error(`Erro ao enviar para ${contacto.email}:`, error);
            falhas++;
        }
    }

    // 5. Resultado
    if (sucessos > 0) {
        const msg = MODO_TESTE 
            ? `${sucessos} email(s) de teste enviado(s) para ${EMAIL_TESTE}!`
            : `${sucessos} email(s) enviado(s) com sucesso!`;
        mostrarNotificacao('Sucesso', msg);
    }
    
    if (falhas > 0) {
        mostrarNotificacao('Atenção', `${falhas} email(s) falharam. Verifica a consola (F12).`, 'erro');
    }
}

// ==========================================
// 9. GESTÃO DE CONTACTOS (LISTA)
// ==========================================
async function carregarContactos() {
    const tbody = document.getElementById('tabela-contactos');
    if (!tbody) return;

    const { data, error } = await supabaseClient.from('contactos_email').select('*').order('nome');
    
    if (error) {
        console.error("Erro contactos:", error);
        return;
    }

    listaContactos = data || [];

    if (listaContactos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-gray-500 italic">Nenhum contacto guardado.</td></tr>`;
    } else {
        tbody.innerHTML = listaContactos.map(c => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
                <td class="p-3 font-semibold text-gray-800">${c.nome}</td>
                <td class="p-3 text-gray-600 text-sm">${c.email}</td>
                <td class="p-3 text-gray-500 text-sm">${c.turma || '-'}</td>
                <td class="p-3 text-right">
                    <button onclick="removerContacto(${c.id})" class="text-red-400 hover:text-red-600 text-xs font-bold uppercase">Remover</button>
                </td>
            </tr>
        `).join('');
    }

    // Atualizar contador se existir
    const counter = document.getElementById('total-contactos');
    if (counter) counter.textContent = `Total: ${listaContactos.length} contactos`;
}

// Adicionar Contacto (Modal)
const formContacto = document.getElementById('form-adicionar-contacto');
if (formContacto) {
    formContacto.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('contacto-nome').value;
        const email = document.getElementById('contacto-email').value;
        const turma = document.getElementById('contacto-turma').value;

        const { error } = await supabaseClient.from('contactos_email').insert([{ nome, email, turma }]);

        if (error) {
            mostrarNotificacao('Erro', 'Falha ao guardar. O email já existe?', 'erro');
        } else {
            mostrarNotificacao('Sucesso', 'Contacto adicionado à lista!');
            formContacto.reset();
            fecharModal('modal-adicionar-email');
            carregarContactos();
        }
    });
}

async function removerContacto(id) {
    if(!confirm('Remover este contacto?')) return;
    await supabaseClient.from('contactos_email').delete().eq('id', id);
    carregarContactos();
}

// ==========================================
// 10. FUNÇÕES AUXILIARES (MODAIS)
// ==========================================
function abrirModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('hidden');
        el.classList.add('flex');
    }
}

function fecharModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('hidden');
        el.classList.remove('flex');
    }
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    if (event.target.classList.contains('fixed') && event.target.classList.contains('inset-0')) {
        event.target.classList.add('hidden');
        event.target.classList.remove('flex');
    }
}

// ==========================================
// INICIAR TUDO
// ==========================================
window.onload = () => {
    verificarSessao();
};

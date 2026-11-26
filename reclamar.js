// ==========================================
// reclamar.js - FindIT School
// Página pública de reclamação de objetos
// ==========================================

// ==========================================
// 1. CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://kswqakffuudugnfudizg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XM9rWUkcESRXVrKFFlgNDA_VZ8XgXJl';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. CONFIGURAÇÃO DO EMAILJS
// ⚠️ SUBSTITUI ESTES 3 VALORES PELAS TUAS CHAVES REAIS!
// ==========================================
const EMAILJS_PUBLIC_KEY  = '2DOZgWNakRCfg9ZNd';
const EMAILJS_SERVICE_ID  = 'service_vr8m9ms';   // ex: service_abc123
const EMAILJS_TEMPLATE_ID = 'template_sfue4jf';  // ex: template_xyz789

// Email da secretaria (para onde vão todas as reclamações)
const EMAIL_SECRETARIA = 'rafaelrodrigues.164049@etpc.pt';

// Inicializar o EmailJS (apenas se o script estiver carregado no HTML)
if (typeof emailjs !== 'undefined') {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

// Objeto que está a ser reclamado
let objetoAtual = null;

// ==========================================
// 3. SISTEMA DE NOTIFICAÇÕES (TOAST)
// ==========================================
function mostrarNotificacao(titulo, mensagem, tipo = 'sucesso') {
    const existente = document.getElementById('toast-notification');
    if (existente) existente.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    const cor = tipo === 'sucesso' ? 'bg-green-600' : 'bg-red-600';
    toast.className = `fixed bottom-6 right-6 ${cor} text-white px-6 py-4 rounded-xl shadow-2xl z-[100] max-w-sm transform transition-all duration-300`;
    toast.innerHTML = `
        <p class="font-bold text-sm">${titulo}</p>
        <p class="text-xs opacity-90 mt-0.5">${mensagem}</p>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================
// 4. CARREGAR OS DADOS DO OBJETO (?id=X)
// ==========================================
async function carregarDadosObjeto() {
    const loadingState = document.getElementById('loading-state');
    const claimContent = document.getElementById('claim-content');

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    // Sem ID na URL → volta ao catálogo
    if (!id) {
        window.location.href = 'index.html';
        return;
    }

    const { data: objeto, error } = await supabaseClient
        .from('objetos')
        .select('*')
        .eq('id', id)
        .single();

    // Objeto não encontrado
    if (error || !objeto) {
        if (loadingState) {
            loadingState.innerHTML = `
                <div class="text-center">
                    <p class="text-red-500 font-bold text-lg mb-2">Objeto não encontrado</p>
                    <p class="text-gray-500 mb-4">Este objeto pode já ter sido removido do sistema.</p>
                    <a href="index.html" class="text-brand-blue font-semibold hover:underline">← Voltar ao catálogo</a>
                </div>`;
        }
        return;
    }

    // Objeto já devolvido → não pode ser reclamado
    if (String(objeto.estado).toLowerCase() === 'devolvido') {
        if (loadingState) {
            loadingState.innerHTML = `
                <div class="text-center">
                    <p class="text-green-600 font-bold text-lg mb-2">Este objeto já foi devolvido!</p>
                    <p class="text-gray-500 mb-4">O proprietário já o levantou na secretaria.</p>
                    <a href="index.html" class="text-brand-blue font-semibold hover:underline">← Ver outros objetos</a>
                </div>`;
        }
        return;
    }

    // Guardar o objeto atual
    objetoAtual = objeto;

    // Preencher os detalhes do objeto (com verificação de segurança)
    const elFoto = document.getElementById('obj-foto');
    const elTitulo = document.getElementById('obj-titulo');
    const elCategoria = document.getElementById('obj-categoria');
    const elSala = document.getElementById('obj-sala-texto') || document.getElementById('obj-sala');
    const elData = document.getElementById('obj-data');

    if (elFoto) elFoto.src = objeto.foto_url || 'https://via.placeholder.com/600x400?text=Sem+Foto';
    if (elTitulo) elTitulo.textContent = objeto.titulo;
    if (elCategoria) elCategoria.textContent = objeto.categoria;
    if (elSala) elSala.textContent = objeto.sala;
    if (elData) {
        elData.textContent = new Date(objeto.criado_em).toLocaleDateString('pt-PT', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    }

    // Mostrar o conteúdo e esconder o spinner
    if (loadingState) loadingState.classList.add('hidden');
    if (claimContent) claimContent.classList.remove('hidden');
}

// ==========================================
// 5. SUBMETER A RECLAMAÇÃO (EMAILJS + SUPABASE)
// ==========================================
const formReclamacao = document.getElementById('form-reclamacao');

if (formReclamacao) {
    formReclamacao.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSubmit = document.getElementById('btn-submit-claim');
        const originalText = btnSubmit ? btnSubmit.innerHTML : '';
        if (btnSubmit) {
            btnSubmit.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> A enviar...`;
            btnSubmit.disabled = true;
        }

        // Ler os campos do formulário (turma é opcional)
        const nome = (document.getElementById('nome')?.value || '').trim();
        const email = (document.getElementById('email')?.value || '').trim();
        const turma = (document.getElementById('turma')?.value || '').trim() || 'Não indicada';
        const justificacao = (document.getElementById('justificacao')?.value || '').trim();

        if (!nome || !email || !justificacao) {
            mostrarNotificacao('Campos em falta', 'Preenche o nome, o email e a justificação.', 'erro');
            if (btnSubmit) { btnSubmit.innerHTML = originalText; btnSubmit.disabled = false; }
            return;
        }

        try {
            // -----------------------------------------
            // PASSO 1: Enviar o email para a secretaria (EmailJS)
            // -----------------------------------------
            if (typeof emailjs === 'undefined') {
                throw new Error('A biblioteca EmailJS não foi carregada. Verifica a ligação à Internet e tenta novamente.');
            }

            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                to_email: EMAIL_SECRETARIA,
                nome_destinatario: 'Secretaria ETPC',
                assunto_email: `RECLAMAÇÃO: ${objetoAtual.titulo}`,
                titulo_objeto: objetoAtual.titulo,
                categoria: objetoAtual.categoria,
                localizacao: objetoAtual.sala,
                estado: `Reclamado por ${nome}`,
                justificacao: justificacao,
                mensagem_introducao: `O aluno ${nome} (Turma: ${turma}) submeteu uma reclamação de posse deste objeto.`,
                mensagem_final: `Contacto do aluno para resposta: ${email}`
            });

            // -----------------------------------------
            // PASSO 2: Guardar o histórico na base de dados
            // (não bloqueia o envio se a tabela falhar)
            // -----------------------------------------
            try {
                const { error: insertError } = await supabaseClient.from('reclamacoes').insert([{
                    objeto_id: objetoAtual.id,
                    objeto_titulo: objetoAtual.titulo,
                    nome: nome,
                    email: email,
                    turma: turma,
                    justificacao: justificacao,
                    estado: 'Pendente',
                    data_pedido: new Date().toISOString()
                }]);
                if (insertError) console.warn('Aviso: histórico não guardado →', insertError.message);
            } catch (erroBD) {
                console.warn('Aviso: tabela reclamacoes indisponível →', erroBD);
            }

            // -----------------------------------------
            // PASSO 3: Sucesso + redirecionamento
            // -----------------------------------------
            mostrarNotificacao('Pedido Enviado!', 'A secretaria foi notificada por email. Aguarda a resposta.');
            formReclamacao.reset();

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);

        } catch (error) {
            console.error('Erro ao enviar reclamação:', error);
            mostrarNotificacao('Erro no envio', 'Não foi possível enviar o email. Tenta novamente.', 'erro');
            if (btnSubmit) {
                btnSubmit.innerHTML = originalText;
                btnSubmit.disabled = false;
            }
        }
    });
}

// ==========================================
// 6. INICIALIZAÇÃO
// ==========================================
window.onload = carregarDadosObjeto;

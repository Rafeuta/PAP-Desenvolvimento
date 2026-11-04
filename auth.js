// auth.js

// 1. Importar o cliente Supabase (a biblioteca já está no index.html via CDN)
// 2. Configurar as credenciais (SUBSTITUI PELOS TEUS VALORES)
const SUPABASE_URL = 'O_TEU_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'A_TUA_SUPABASE_ANON_KEY';

// Inicializar o cliente Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 3. Selecionar os elementos do DOM (o modal e os formulários)
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authMessage = document.getElementById('auth-message');
const logoutButton = document.getElementById('logout-button');
const userEmailSpan = document.getElementById('user-email');

// 4. Função para abrir e fechar o modal
window.openAuthModal = function() {
    authModal.classList.remove('hidden');
    authModal.classList.add('flex');
};

window.closeAuthModal = function() {
    authModal.classList.add('hidden');
    authModal.classList.remove('flex');
    // Limpar mensagens de erro e formulários
    authMessage.textContent = '';
    loginForm.reset();
    registerForm.reset();
};

// 5. Lógica de Registo (Sign Up)
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Impedir o recarregamento da página
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    // Chamar a API do Supabase para criar o utilizador
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        authMessage.textContent = 'Erro ao registar: ' + error.message;
        authMessage.className = 'text-red-500 text-sm text-center font-semibold';
    } else {
        authMessage.textContent = 'Registo efetuado! Verifica o teu email para confirmar a conta.';
        authMessage.className = 'text-green-500 text-sm text-center font-semibold';
        // Opcional: Fechar o modal após alguns segundos
        setTimeout(() => closeAuthModal(), 3000);
    }
});

// 6. Lógica de Login (Sign In)
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Chamar a API do Supabase para autenticar
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        authMessage.textContent = 'Erro ao entrar: ' + error.message;
        authMessage.className = 'text-red-500 text-sm text-center font-semibold';
    } else {
        authMessage.textContent = 'Login efetuado com sucesso!';
        authMessage.className = 'text-green-500 text-sm text-center font-semibold';
        updateUI(data.user); // Atualizar a interface
        setTimeout(() => closeAuthModal(), 1500);
    }
});

// 7. Lógica de Logout
logoutButton.addEventListener('click', async () => {
    await supabase.auth.signOut();
    updateUI(null); // Limpar a interface
});

// 8. Atualizar a UI consoante o estado de autenticação
function updateUI(user) {
    if (user) {
        // Utilizador com sessão iniciada
        userEmailSpan.textContent = user.email;
        logoutButton.classList.remove('hidden');
        // Esconder o botão de "Entrar / Registar" (podes adicionar um ID a ele)
        document.getElementById('auth-btn').classList.add('hidden'); 
    } else {
        // Utilizador com sessão terminada
        userEmailSpan.textContent = '';
        logoutButton.classList.add('hidden');
        document.getElementById('auth-btn').classList.remove('hidden');
    }
}

// 9. Verificar se o utilizador já tem uma sessão ativa ao carregar a página
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        updateUI(session.user);
    } else {
        updateUI(null);
    }
});

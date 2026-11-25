'use strict';
const SUPABASE_URL = 'https://kswqakffuudugnfudizg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XM9rWUkcESRXVrKFFlgNDA_VZ8XgXJl';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

document.getElementById('codigo').addEventListener('input', event => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 12);
});

document.getElementById('form-registo-funcionario').addEventListener('submit', async event => {
  event.preventDefault();
  const button = document.getElementById('btn-registar-funcionario');
  const message = document.getElementById('mensagem-registo-funcionario');
  const code = document.getElementById('codigo').value.trim();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  message.textContent = '';
  if (password !== confirmPassword) { message.textContent = 'As palavras-passe não coincidem.'; return; }
  if (!/^[A-F0-9]{12}$/.test(code)) { message.textContent = 'Introduz um código válido de 12 caracteres.'; return; }

  button.disabled = true;
  button.textContent = 'A criar conta…';
  try {
    const inviteHash = await sha256Hex(code);
    const { data, error } = await supabaseClient.auth.signUp({
      email, password,
      options: { data: { staff_invite_hash: inviteHash } }
    });
    if (error) throw error;
    if (!data.user) throw new Error('Não foi possível criar a conta.');
    message.textContent = data.session
      ? 'Conta criada. Já podes iniciar sessão.'
      : 'Pedido aceite. Confirma o endereço de email se o Supabase solicitar confirmação.';
    event.target.reset();
  } catch (error) {
    message.textContent = error.message || 'Não foi possível concluir o registo. Confirma se o código ainda está válido.';
  } finally {
    button.disabled = false;
    button.textContent = 'Criar conta';
  }
});
import { supabase } from './supabaseClient.js';

const statusEl = document.getElementById('status');

async function checkConnection() {
  // Chamada leve so para confirmar que a URL/chave do Supabase estao
  // corretas. Nao depende de estar logado (RLS pode bloquear os dados,
  // mas a chamada em si deve responder sem erro de rede/config).
  const { error } = await supabase.auth.getSession();

  if (error) {
    statusEl.textContent = `Erro ao conectar no Supabase: ${error.message}`;
    statusEl.classList.add('error');
    return;
  }

  statusEl.textContent = 'Conexao com Supabase OK. Proxima fase: tela de login.';
  statusEl.classList.add('ok');
}

checkConnection();

import { supabase } from '../supabaseClient.js';

/**
 * Retorna a sessao atual (ou null se nao houver usuario logado).
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Erro ao obter sessao:', error.message);
    return null;
  }
  return data.session;
}

/**
 * Faz login com email e senha. Retorna { session, error }.
 * error e null em caso de sucesso; caso contrario, contem a mensagem
 * ja pronta para exibir ao usuario.
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { session: null, error: traduzErro(error.message) };
  }

  return { session: data.session, error: null };
}

/**
 * Encerra a sessao atual.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Erro ao sair:', error.message);
  }
}

/**
 * Escuta mudancas de autenticacao (login/logout em outra aba, expiracao
 * de token etc). Recebe um callback(session).
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}

function traduzErro(mensagem) {
  if (mensagem.includes('Invalid login credentials')) {
    return 'Email ou senha incorretos.';
  }
  return 'Nao foi possivel entrar. Tente novamente.';
}

import { signIn } from '../auth/authGuard.js';

/**
 * Renderiza a tela de login dentro do elemento informado.
 * onSuccess e chamado apos login bem-sucedido (sem argumentos;
 * quem chama deve re-verificar a sessao).
 */
export function renderLogin(container, onSuccess) {
  container.innerHTML = `
    <div class="login-box">
      <h1>QuemFaz</h1>
      <form id="login-form">
        <label for="email">Email</label>
        <input type="email" id="email" required autocomplete="username" />

        <label for="password">Senha</label>
        <input type="password" id="password" required autocomplete="current-password" />

        <button type="submit">Entrar</button>
        <p id="login-error" class="error" hidden></p>
      </form>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const errorEl = container.querySelector('#login-error');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    const email = form.querySelector('#email').value.trim();
    const password = form.querySelector('#password').value;

    const { session, error } = await signIn(email, password);

    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';

    if (error) {
      errorEl.textContent = error;
      errorEl.hidden = false;
      return;
    }

    if (session) {
      onSuccess();
    }
  });
}

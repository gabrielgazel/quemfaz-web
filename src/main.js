import { getSession, onAuthStateChange, signOut } from './auth/authGuard.js';
import { renderLogin } from './pages/login.js';

const appEl = document.getElementById('app');

function renderAuthenticated() {
  appEl.innerHTML = `
    <div class="authenticated-box">
      <p>Login realizado com sucesso.</p>
      <p>Proxima fase: tela de consulta de exames.</p>
      <button id="logout-btn">Sair</button>
    </div>
  `;

  appEl.querySelector('#logout-btn').addEventListener('click', async () => {
    await signOut();
    render();
  });
}

async function render() {
  const session = await getSession();

  if (session) {
    renderAuthenticated();
  } else {
    renderLogin(appEl, render);
  }
}

// Re-renderiza automaticamente se a sessao mudar (ex: token expirar,
// logout em outra aba).
onAuthStateChange(() => {
  render();
});

render();
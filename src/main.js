import { getSession, onAuthStateChange, signOut } from './auth/authGuard.js';
import { renderLogin } from './pages/login.js';
import { renderExamesImagem } from './pages/examesImagem.js';

const appEl = document.getElementById('app');

function renderAuthenticated() {
  appEl.innerHTML = `
    <header class="app-header">
      <button id="logout-btn">Sair</button>
    </header>
    <div id="conteudo"></div>
  `;

  appEl.querySelector('#logout-btn').addEventListener('click', async () => {
    await signOut();
    render();
  });

  renderExamesImagem(appEl.querySelector('#conteudo'));
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
import { getSession, onAuthStateChange, signOut } from './auth/authGuard.js';
import { renderLogin } from './pages/login.js';
import { renderHome } from './pages/home.js';
import { renderExamesImagem } from './pages/examesImagem.js';
import { renderMedicos } from './pages/medicos.js';
import { registrarRota, definirRotaPadrao, iniciarRouter, navegarPara } from './router.js';

const appEl = document.getElementById('app');

function renderAuthenticated() {
  appEl.innerHTML = `
    <header class="app-header">
      <button id="home-btn" class="link-btn">QuemFaz</button>
      <button id="logout-btn">Sair</button>
    </header>
    <div id="conteudo"></div>
  `;

  appEl.querySelector('#home-btn').addEventListener('click', () => navegarPara('home'));
  appEl.querySelector('#logout-btn').addEventListener('click', async () => {
    await signOut();
    render();
  });

  const conteudoEl = appEl.querySelector('#conteudo');

  registrarRota('home', renderHome, { titulo: 'Início' });
  registrarRota('exames', renderExamesImagem, { titulo: 'Exames de imagem' });
  registrarRota('medicos', renderMedicos, { titulo: 'Médicos' });
  definirRotaPadrao('home');

  iniciarRouter(conteudoEl);
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
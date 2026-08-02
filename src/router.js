/**
 * Roteador minimo baseado em window.location.hash.
 * Cada rota e uma funcao render(container) que desenha a pagina.
 */

const rotas = new Map();
let containerAtual = null;
let rotaPadrao = '';

export function registrarRota(hash, render, { titulo } = {}) {
  rotas.set(hash, { render, titulo });
}

export function definirRotaPadrao(hash) {
  rotaPadrao = hash;
}

export function iniciarRouter(container) {
  containerAtual = container;
  window.addEventListener('hashchange', renderizarRotaAtual);
  renderizarRotaAtual();
}

export function navegarPara(hash) {
  if (window.location.hash === `#${hash}`) {
    renderizarRotaAtual();
  } else {
    window.location.hash = hash;
  }
}

function renderizarRotaAtual() {
  const hashAtual = window.location.hash.replace('#', '') || rotaPadrao;
  const rota = rotas.get(hashAtual) ?? rotas.get(rotaPadrao);

  if (!rota) {
    containerAtual.innerHTML = '<p>Página não encontrada.</p>';
    return;
  }

  if (rota.titulo) {
    document.title = `QuemFaz — ${rota.titulo}`;
  }

  rota.render(containerAtual);
}

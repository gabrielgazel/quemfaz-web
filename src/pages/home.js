import { navegarPara } from '../router.js';

/**
 * Cada entrada representa um card na home. `disponivel: false` marca
 * paginas que ainda nao foram construidas (aparecem desabilitadas com
 * a tag "Em breve"), para o card ja existir no roadmap visual mesmo
 * antes da fase correspondente ser implementada.
 */
const PAGINAS = [
  {
    titulo: 'Exames de imagem',
    descricao: 'Consultar exames de imagem, qual médico realiza e preparo necessário.',
    hash: 'exames',
    disponivel: true,
  },
  {
    titulo: 'Médicos',
    descricao: 'Cadastro de médicos, agenda e local de atendimento.',
    hash: 'medicos',
    disponivel: false,
  },
  {
    titulo: 'Avisos',
    descricao: 'Mural de avisos e comunicados da equipe.',
    hash: 'avisos',
    disponivel: false,
  },
  {
    titulo: 'Fluxos de trabalho',
    descricao: 'Fluxos que orientam o atendimento por especialidade.',
    hash: 'fluxos',
    disponivel: false,
  },
  {
    titulo: 'Especialidades',
    descricao: 'Especialidades médicas e seus fluxos vinculados.',
    hash: 'especialidades',
    disponivel: false,
  },
];

export function renderHome(container) {
  const cardsHtml = PAGINAS.map((pagina) => `
    <button
      class="home-card ${pagina.disponivel ? '' : 'home-card-disabled'}"
      data-hash="${pagina.hash}"
      ${pagina.disponivel ? '' : 'disabled'}
    >
      <h2>${pagina.titulo}</h2>
      <p>${pagina.descricao}</p>
      ${pagina.disponivel ? '' : '<span class="badge badge-em-breve">Em breve</span>'}
    </button>
  `).join('');

  container.innerHTML = `
    <div class="home-page">
      <h1>QuemFaz</h1>
      <div class="home-grid">${cardsHtml}</div>
    </div>
  `;

  container.querySelectorAll('.home-card[data-hash]:not([disabled])').forEach((card) => {
    card.addEventListener('click', () => {
      navegarPara(card.dataset.hash);
    });
  });
}

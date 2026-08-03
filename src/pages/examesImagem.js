import { buscarExames } from '../data/exames.js';
import { sanitizarTermoBusca } from '../utils/validacao.js';

const DEBOUNCE_MS = 300;

/**
 * Renderiza a pagina "Exames de imagem" dentro do elemento informado.
 * A busca agora é feita ao vivo na API pública da ANS (código/nome
 * oficiais); "Quem faz" e "Tem preparo?" vêm do overlay local.
 */
export function renderExamesImagem(container) {
  container.innerHTML = `
    <div class="exames-page">
      <h1>Exames de imagem</h1>

      <div class="exames-filtros">
        <input
          type="search"
          id="busca-exame"
          maxlength="100"
          placeholder="Buscar por código TUSS ou nome (ex: mamas)..."
        />
        <select id="filtro-preparo">
          <option value="todos">Todos</option>
          <option value="com">Com preparo</option>
          <option value="sem">Sem preparo</option>
        </select>
      </div>

      <p id="exames-status" class="exames-status"></p>
      <div id="exames-lista"></div>
    </div>
  `;

  const inputBusca = container.querySelector('#busca-exame');
  const selectPreparo = container.querySelector('#filtro-preparo');
  const statusEl = container.querySelector('#exames-status');
  const listaEl = container.querySelector('#exames-lista');

  let debounceTimer = null;

  async function carregar() {
    const termo = sanitizarTermoBusca(inputBusca.value);

    if (termo.length < 2) {
      statusEl.textContent = 'Digite ao menos 2 caracteres para buscar.';
      statusEl.classList.remove('error');
      listaEl.innerHTML = '';
      return;
    }

    statusEl.textContent = 'Consultando a ANS...';
    statusEl.classList.remove('error');

    const { dados, error } = await buscarExames({
      termoBusca: termo,
      filtroPreparo: selectPreparo.value,
    });

    if (error) {
      statusEl.textContent = error;
      statusEl.classList.add('error');
      listaEl.innerHTML = '';
      return;
    }

    statusEl.textContent = `${dados.length} exame(s) encontrado(s).`;
    renderResultados(listaEl, dados);
  }

  inputBusca.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(carregar, DEBOUNCE_MS);
  });

  selectPreparo.addEventListener('change', carregar);

  carregar();
}

function renderResultados(container, exames) {
  if (exames.length === 0) {
    container.innerHTML = '<p>Nenhum exame encontrado.</p>';
    return;
  }

  container.innerHTML = exames
    .map((e) => {
      const preparoTexto = e.preparoDefinido ? (e.temPreparo ? 'Sim' : 'Não') : 'Não informado';
      const statusVigencia = e.vigente
        ? ''
        : '<span class="badge badge-descontinuado">Código descontinuado na ANS</span>';

      return `
        <article class="exame-resultado-card">
          <div class="exame-resultado-topo">
            <code>${escapeHtml(e.codigo)}</code>
            <h3>${escapeHtml(e.nome)}</h3>
            ${statusVigencia}
          </div>
          <p><strong>Quem faz:</strong> ${escapeHtml(e.quemFaz || 'Nenhum médico vinculado ainda')}</p>
          <p><strong>Tem preparo?</strong> ${preparoTexto}</p>
          ${e.observacoes ? `<p class="exame-obs">${escapeHtml(e.observacoes)}</p>` : ''}
        </article>
      `;
    })
    .join('');
}

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}
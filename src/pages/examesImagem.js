import { buscarExames } from '../data/exames.js';

const DEBOUNCE_MS = 300;

/**
 * Renderiza a pagina "Exames de imagem" dentro do elemento informado.
 */
export function renderExamesImagem(container) {
  container.innerHTML = `
    <div class="exames-page">
      <h1>Exames de imagem</h1>

      <div class="exames-filtros">
        <input
          type="search"
          id="busca-exame"
          placeholder="Buscar por código ou nome..."
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
    statusEl.textContent = 'Carregando...';
    statusEl.classList.remove('error');

    const { dados, error } = await buscarExames({
      termoBusca: inputBusca.value,
      filtroPreparo: selectPreparo.value,
    });

    if (error) {
      statusEl.textContent = error;
      statusEl.classList.add('error');
      listaEl.innerHTML = '';
      return;
    }

    statusEl.textContent = `${dados.length} exame(s) encontrado(s).`;
    renderTabela(listaEl, dados);
  }

  inputBusca.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(carregar, DEBOUNCE_MS);
  });

  selectPreparo.addEventListener('change', carregar);

  carregar();
}

function renderTabela(container, exames) {
  if (exames.length === 0) {
    container.innerHTML = '<p>Nenhum exame encontrado.</p>';
    return;
  }

  const linhas = exames
    .map(
      (e) => `
        <tr>
          <td>${escapeHtml(e.codigo)}</td>
          <td>${escapeHtml(e.nome)}</td>
          <td>${escapeHtml(e.quemFaz || '—')}</td>
          <td>${e.temPreparo ? '<span class="badge badge-preparo">Sim</span>' : 'Não'}</td>
          <td>${escapeHtml(e.observacoes || '—')}</td>
        </tr>
      `
    )
    .join('');

  container.innerHTML = `
    <table class="exames-tabela">
      <thead>
        <tr>
          <th>Código</th>
          <th>Nome</th>
          <th>Quem faz</th>
          <th>Preparo</th>
          <th>Observações</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

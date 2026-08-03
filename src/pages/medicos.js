import {
  listarMedicos,
  adicionarMedico,
  atualizarMedico,
  removerMedico,
  vincularExame,
  desvincularExame,
  listarExamesDoMedico,
  atualizarInfoExame,
} from '../data/medicos.js';
import { buscarProcedimentosAns } from '../data/ansApi.js';
import { validarTexto, validarInteiro, validarSelecaoMinima, sanitizarTermoBusca, primeiroErro } from '../utils/validacao.js';

const ORDENS = ['Hora marcada', 'Ordem de chegada'];
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DEBOUNCE_BUSCA_EXAME_MS = 300;

export function renderMedicos(container) {
  container.innerHTML = `
    <div class="medicos-page">
      <div class="medicos-header">
        <h1>Médicos</h1>
        <button id="novo-medico-btn" class="btn-primary">Novo médico</button>
      </div>
      <p class="medicos-caption">Gerencie os médicos, sua agenda e os exames que cada um realiza.</p>

      <p id="medicos-status" class="exames-status"></p>
      <div id="medicos-grid" class="medicos-grid"></div>

      <dialog id="medico-dialog">
        <form id="medico-form" method="dialog">
          <h2 id="medico-form-titulo">Médico</h2>

          <label for="m-nome">Nome</label>
          <input type="text" id="m-nome" maxlength="120" required />

          <label>Agenda</label>
          <div id="m-agenda" class="dias-agenda">
            ${DIAS_SEMANA.map(
              (dia) => `
                <label class="dia-chip">
                  <input type="checkbox" value="${dia}" />
                  <span>${dia}</span>
                </label>
              `
            ).join('')}
          </div>

          <label for="m-local">Local de atendimento</label>
          <input type="text" id="m-local" maxlength="120" />

          <label for="m-horario">Horário de atendimento</label>
          <input type="text" id="m-horario" maxlength="60" placeholder="Ex: 08:00 às 12:00" />

          <label>Ordem de atendimento</label>
          <div class="ordem-radios">
            ${ORDENS.map(
              (ordem, i) => `
                <label>
                  <input type="radio" name="m-ordem" value="${ordem}" ${i === 1 ? 'checked' : ''} />
                  ${ordem}
                </label>
              `
            ).join('')}
          </div>

          <div class="campos-lado-a-lado">
            <div>
              <label for="m-idade-minima">Idade mínima (anos)</label>
              <input type="number" id="m-idade-minima" min="0" max="120" value="0" />
            </div>
            <div>
              <label for="m-exames-dia">Exames por dia (0 = sem limite)</label>
              <input type="number" id="m-exames-dia" min="0" max="500" value="0" />
            </div>
          </div>

          <label for="m-observacoes">Observações</label>
          <textarea id="m-observacoes" rows="3" maxlength="500"></textarea>

          <p id="medico-form-erro" class="error" hidden></p>

          <div class="exames-vinculo-section">
            <label>Exames vinculados (busca ao vivo na ANS)</label>
            <input
              type="search"
              id="m-exames-busca"
              maxlength="100"
              placeholder="Buscar exame por código TUSS ou nome..."
              disabled
            />
            <div id="m-exames-resultados-busca" class="exames-busca-resultados" hidden></div>

            <ul id="m-exames-vinculados-lista" class="exames-vinculados-lista"></ul>
            <p id="m-exames-vinculo-msg" class="exames-vinculo-msg" hidden></p>
          </div>

          <div class="medico-form-acoes">
            <button type="button" id="m-excluir-btn" class="btn-secondary" hidden>Excluir</button>
            <button type="button" id="m-cancelar-btn" class="btn-secondary">Cancelar</button>
            <button type="submit" id="m-salvar-btn" class="btn-primary">Salvar</button>
          </div>
        </form>
      </dialog>
    </div>
  `;

  const statusEl = container.querySelector('#medicos-status');
  const gridEl = container.querySelector('#medicos-grid');
  const dialogEl = container.querySelector('#medico-dialog');
  const formEl = container.querySelector('#medico-form');
  const erroEl = container.querySelector('#medico-form-erro');
  const excluirBtn = container.querySelector('#m-excluir-btn');
  const tituloFormEl = container.querySelector('#medico-form-titulo');

  const buscaExameInput = container.querySelector('#m-exames-busca');
  const resultadosBuscaEl = container.querySelector('#m-exames-resultados-busca');
  const vinculadosListaEl = container.querySelector('#m-exames-vinculados-lista');
  const vinculoMsgEl = container.querySelector('#m-exames-vinculo-msg');

  let medicoEmEdicao = null; // null = criando novo (ainda sem id -> não pode vincular exame)
  let debounceExameTimer = null;

  async function carregar() {
    statusEl.textContent = 'Carregando...';
    statusEl.classList.remove('error');

    const { dados, error } = await listarMedicos();

    if (error) {
      statusEl.textContent = error;
      statusEl.classList.add('error');
      gridEl.innerHTML = '';
      return;
    }

    statusEl.textContent = dados.length === 0 ? 'Nenhum médico cadastrado ainda.' : '';
    renderGrid(gridEl, dados, abrirParaEditar);
  }

  function abrirParaNovo() {
    medicoEmEdicao = null;
    tituloFormEl.textContent = 'Novo médico';
    excluirBtn.hidden = true;
    preencherForm(null);
    erroEl.hidden = true;
    resetSecaoExames({ habilitada: false });
    dialogEl.showModal();
  }

  function abrirParaEditar(medico) {
    medicoEmEdicao = medico;
    tituloFormEl.textContent = medico.nome;
    excluirBtn.hidden = false;
    preencherForm(medico);
    erroEl.hidden = true;
    resetSecaoExames({ habilitada: true });
    carregarExamesVinculados();
    dialogEl.showModal();
  }

  function resetSecaoExames({ habilitada }) {
    buscaExameInput.disabled = !habilitada;
    buscaExameInput.value = '';
    resultadosBuscaEl.hidden = true;
    resultadosBuscaEl.innerHTML = '';
    vinculadosListaEl.innerHTML = habilitada
      ? ''
      : '<li class="exames-vinculo-aviso">Salve o médico para poder vincular exames.</li>';
    vinculoMsgEl.hidden = true;
  }

  function preencherForm(medico) {
    formEl.querySelector('#m-nome').value = medico?.nome ?? '';
    formEl.querySelector('#m-local').value = medico?.local_atendimento ?? '';
    formEl.querySelector('#m-horario').value = medico?.horario ?? '';
    formEl.querySelector('#m-idade-minima').value = medico?.idade_minima ?? 0;
    formEl.querySelector('#m-exames-dia').value = medico?.exames_por_dia ?? 0;
    formEl.querySelector('#m-observacoes').value = medico?.observacoes ?? '';

    const ordemDesejada = medico?.ordem_atendimento ?? 'Ordem de chegada';
    formEl.querySelectorAll('input[name="m-ordem"]').forEach((radio) => {
      radio.checked = radio.value === ordemDesejada;
    });

    const agendaAtual = new Set(medico?.agenda ?? []);
    formEl.querySelectorAll('#m-agenda input[type="checkbox"]').forEach((cb) => {
      cb.checked = agendaAtual.has(cb.value);
    });
  }

  function lerForm() {
    const ordemSelecionada = formEl.querySelector('input[name="m-ordem"]:checked')?.value
      ?? 'Ordem de chegada';

    const agenda = DIAS_SEMANA.filter((dia) =>
      formEl.querySelector(`#m-agenda input[value="${dia}"]`).checked
    );

    return {
      nome: formEl.querySelector('#m-nome').value,
      local_atendimento: formEl.querySelector('#m-local').value,
      horario: formEl.querySelector('#m-horario').value,
      ordem_atendimento: ordemSelecionada,
      idade_minima_bruto: formEl.querySelector('#m-idade-minima').value,
      exames_dia_bruto: formEl.querySelector('#m-exames-dia').value,
      observacoes: formEl.querySelector('#m-observacoes').value,
      agenda,
    };
  }

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    erroEl.hidden = true;

    const bruto = lerForm();

    const erroValidacao = primeiroErro(
      validarTexto(bruto.nome, { campo: 'Nome', max: 120 }),
      validarInteiro(bruto.idade_minima_bruto, { campo: 'Idade mínima', min: 0, max: 120 }),
      validarInteiro(bruto.exames_dia_bruto, { campo: 'Exames por dia', min: 0, max: 500 }),
      validarSelecaoMinima(bruto.agenda, { campo: 'Agenda', minimo: 1 }),
    );

    if (erroValidacao) {
      erroEl.textContent = erroValidacao;
      erroEl.hidden = false;
      return;
    }

    const examesPorDia = Number(bruto.exames_dia_bruto);
    const dadosForm = {
      nome: bruto.nome,
      local_atendimento: bruto.local_atendimento,
      horario: bruto.horario,
      ordem_atendimento: bruto.ordem_atendimento,
      idade_minima: Number(bruto.idade_minima_bruto),
      exames_por_dia: examesPorDia > 0 ? examesPorDia : null,
      observacoes: bruto.observacoes,
      agenda: bruto.agenda,
    };

    if (medicoEmEdicao) {
      const resultado = await atualizarMedico(medicoEmEdicao.id, dadosForm);
      if (!resultado.sucesso) {
        erroEl.textContent = resultado.mensagem;
        erroEl.hidden = false;
        return;
      }
      dialogEl.close();
      await carregar();
      return;
    }

    const resultado = await adicionarMedico(dadosForm);
    if (!resultado.sucesso) {
      erroEl.textContent = resultado.mensagem;
      erroEl.hidden = false;
      return;
    }

    // Médico recém-criado: mantém o dialog aberto para permitir vincular
    // exames na hora, em vez de forçar reabrir a tela.
    medicoEmEdicao = { id: resultado.id, nome: dadosForm.nome };
    tituloFormEl.textContent = dadosForm.nome;
    excluirBtn.hidden = false;
    resetSecaoExames({ habilitada: true });
    vinculoMsgEl.textContent = 'Médico cadastrado. Vincule os exames abaixo, se quiser, e feche quando terminar.';
    vinculoMsgEl.hidden = false;
    await carregar();
  });

  excluirBtn.addEventListener('click', async () => {
    if (!medicoEmEdicao) return;
    const confirmou = window.confirm(`Remover "${medicoEmEdicao.nome}"? Essa ação não pode ser desfeita.`);
    if (!confirmou) return;

    const resultado = await removerMedico(medicoEmEdicao.id);
    if (!resultado.sucesso) {
      erroEl.textContent = resultado.mensagem;
      erroEl.hidden = false;
      return;
    }

    dialogEl.close();
    await carregar();
  });

  container.querySelector('#novo-medico-btn').addEventListener('click', abrirParaNovo);
  container.querySelector('#m-cancelar-btn').addEventListener('click', () => dialogEl.close());

  // Evita que Enter no campo de busca de exame dispare o submit do
  // <form method="dialog"> (que fecharia o modal).
  buscaExameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') event.preventDefault();
  });

  buscaExameInput.addEventListener('input', () => {
    clearTimeout(debounceExameTimer);
    debounceExameTimer = setTimeout(buscarExamesParaVincular, DEBOUNCE_BUSCA_EXAME_MS);
  });

  async function buscarExamesParaVincular() {
    const termo = sanitizarTermoBusca(buscaExameInput.value);
    if (termo.length < 2) {
      resultadosBuscaEl.hidden = true;
      resultadosBuscaEl.innerHTML = '';
      return;
    }

    const { dados, error } = await buscarProcedimentosAns({ termoBusca: termo });

    if (error) {
      resultadosBuscaEl.hidden = false;
      resultadosBuscaEl.innerHTML = `<p class="exames-busca-erro">${escapeHtml(error)}</p>`;
      return;
    }

    renderResultadosBusca(dados);
  }

  function renderResultadosBusca(dados) {
    if (dados.length === 0) {
      resultadosBuscaEl.hidden = false;
      resultadosBuscaEl.innerHTML = '<p class="exames-busca-vazio">Nenhum resultado na ANS.</p>';
      return;
    }

    resultadosBuscaEl.hidden = false;
    resultadosBuscaEl.innerHTML = dados
      .slice(0, 6)
      .map(
        (item) => `
          <button
            type="button"
            class="exame-busca-item"
            data-codigo="${escapeHtml(item.codigo)}"
            data-nome="${escapeHtml(item.nome)}"
          >
            <code>${escapeHtml(item.codigo)}</code> ${escapeHtml(item.nome)}
          </button>
        `
      )
      .join('');

    resultadosBuscaEl.querySelectorAll('.exame-busca-item').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!medicoEmEdicao) return;

        const resultado = await vincularExame(medicoEmEdicao.id, {
          codigoTuss: btn.dataset.codigo,
          nomeOficial: btn.dataset.nome,
        });

        if (!resultado.sucesso) {
          vinculoMsgEl.textContent = resultado.mensagem;
          vinculoMsgEl.hidden = false;
          return;
        }

        buscaExameInput.value = '';
        resultadosBuscaEl.hidden = true;
        vinculoMsgEl.hidden = true;
        await carregarExamesVinculados();
      });
    });
  }

  async function carregarExamesVinculados() {
    if (!medicoEmEdicao) return;

    const { dados, error } = await listarExamesDoMedico(medicoEmEdicao.id);

    if (error) {
      vinculoMsgEl.textContent = error;
      vinculoMsgEl.hidden = false;
      return;
    }

    if (dados.length === 0) {
      vinculadosListaEl.innerHTML = '<li class="exames-vinculo-aviso">Nenhum exame vinculado ainda.</li>';
      return;
    }

    vinculadosListaEl.innerHTML = dados
      .map(
        (e) => `
          <li>
            <code>${escapeHtml(e.codigoTuss)}</code>
            <span>${escapeHtml(e.nome)}</span>
            <label class="exame-preparo-toggle">
              <input type="checkbox" class="m-exame-preparo-cb" data-codigo="${escapeHtml(e.codigoTuss)}" ${e.temPreparo ? 'checked' : ''} />
              Tem preparo?
            </label>
            <button type="button" class="exame-remover-btn" data-codigo="${escapeHtml(e.codigoTuss)}" title="Remover vínculo">×</button>
          </li>
        `
      )
      .join('');

    vinculadosListaEl.querySelectorAll('.exame-remover-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const resultado = await desvincularExame(medicoEmEdicao.id, btn.dataset.codigo);
        if (!resultado.sucesso) {
          vinculoMsgEl.textContent = resultado.mensagem;
          vinculoMsgEl.hidden = false;
          return;
        }
        vinculoMsgEl.hidden = true;
        await carregarExamesVinculados();
      });
    });

    vinculadosListaEl.querySelectorAll('.m-exame-preparo-cb').forEach((cb) => {
      cb.addEventListener('change', async () => {
        const resultado = await atualizarInfoExame(cb.dataset.codigo, { temPreparo: cb.checked });
        if (!resultado.sucesso) {
          vinculoMsgEl.textContent = resultado.mensagem;
          vinculoMsgEl.hidden = false;
          cb.checked = !cb.checked;
        }
      });
    });
  }

  carregar();
}

function renderGrid(container, medicos, onEditar) {
  if (medicos.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = '';

  medicos.forEach((medico) => {
    const card = document.createElement('div');
    card.className = 'medico-card';
    card.innerHTML = `
      <h3>${escapeHtml(medico.nome)}</h3>
      <p><strong>Agenda:</strong> ${medico.agenda.length ? escapeHtml(medico.agenda.join(', ')) : '—'}</p>
      <p><strong>Local:</strong> ${escapeHtml(medico.local_atendimento || '—')}</p>
      <p><strong>Horário:</strong> ${escapeHtml(medico.horario || '—')}</p>
      <p><strong>Atendimento:</strong> ${escapeHtml(medico.ordem_atendimento)}</p>
      <p><strong>Idade mínima:</strong> ${medico.idade_minima} anos</p>
      <p><strong>Exames/dia:</strong> ${medico.exames_por_dia ?? 'sem limite'}</p>
      ${medico.observacoes ? `<p class="medico-obs">${escapeHtml(medico.observacoes)}</p>` : ''}
      <button class="btn-secondary medico-editar-btn">Editar</button>
    `;
    card.querySelector('.medico-editar-btn').addEventListener('click', () => onEditar(medico));
    container.appendChild(card);
  });
}

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}
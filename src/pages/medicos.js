import { listarMedicos, adicionarMedico, atualizarMedico, removerMedico } from '../data/medicos.js';

const ORDENS = ['Hora marcada', 'Ordem de chegada'];
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function renderMedicos(container) {
  container.innerHTML = `
    <div class="medicos-page">
      <div class="medicos-header">
        <h1>Médicos</h1>
        <button id="novo-medico-btn" class="btn-primary">Novo médico</button>
      </div>
      <p class="medicos-caption">Gerencie os médicos que realizam os exames.</p>

      <p id="medicos-status" class="exames-status"></p>
      <div id="medicos-grid" class="medicos-grid"></div>

      <dialog id="medico-dialog">
        <form id="medico-form" method="dialog">
          <h2 id="medico-form-titulo">Médico</h2>

          <label for="m-nome">Nome</label>
          <input type="text" id="m-nome" required />

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
          <input type="text" id="m-local" />

          <label for="m-horario">Horário de atendimento</label>
          <input type="text" id="m-horario" placeholder="Ex: 08:00 às 12:00" />

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
              <input type="number" id="m-exames-dia" min="0" value="0" />
            </div>
          </div>

          <label for="m-observacoes">Observações</label>
          <textarea id="m-observacoes" rows="3"></textarea>

          <p id="medico-form-erro" class="error" hidden></p>

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

  let medicoEmEdicao = null; // null = criando novo

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
    dialogEl.showModal();
  }

  function abrirParaEditar(medico) {
    medicoEmEdicao = medico;
    tituloFormEl.textContent = medico.nome;
    excluirBtn.hidden = false;
    preencherForm(medico);
    erroEl.hidden = true;
    dialogEl.showModal();
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

    const exames = Number(formEl.querySelector('#m-exames-dia').value) || 0;

    return {
      nome: formEl.querySelector('#m-nome').value,
      local_atendimento: formEl.querySelector('#m-local').value,
      horario: formEl.querySelector('#m-horario').value,
      ordem_atendimento: ordemSelecionada,
      idade_minima: Number(formEl.querySelector('#m-idade-minima').value) || 0,
      exames_por_dia: exames > 0 ? exames : null,
      observacoes: formEl.querySelector('#m-observacoes').value,
      agenda,
    };
  }

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    erroEl.hidden = true;

    const dadosForm = lerForm();
    const resultado = medicoEmEdicao
      ? await atualizarMedico(medicoEmEdicao.id, dadosForm)
      : await adicionarMedico(dadosForm);

    if (!resultado.sucesso) {
      erroEl.textContent = resultado.mensagem;
      erroEl.hidden = false;
      return;
    }

    dialogEl.close();
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

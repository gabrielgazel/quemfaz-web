import { supabase } from '../supabaseClient.js';

const COLUNAS =
  'id, nome, local_atendimento, horario, ordem_atendimento, ' +
  'idade_minima, exames_por_dia, observacoes, agenda';

function ehErroDeDuplicidade(mensagem) {
  const m = mensagem.toLowerCase();
  return m.includes('duplicate') || m.includes('unique');
}

/**
 * Lista todos os medicos ordenados por nome.
 */
export async function listarMedicos() {
  const { data, error } = await supabase
    .from('medicos')
    .select(COLUNAS)
    .order('nome');

  if (error) {
    console.error('Erro ao listar medicos:', error.message);
    return { dados: [], error: 'Não foi possível carregar os médicos.' };
  }

  const dados = data.map((m) => ({
    ...m,
    local_atendimento: m.local_atendimento ?? '',
    horario: m.horario ?? '',
    observacoes: m.observacoes ?? '',
    agenda: m.agenda ?? [],
  }));

  return { dados, error: null };
}

/**
 * Cadastra um novo medico. `medico` deve conter:
 * nome, local_atendimento, horario, ordem_atendimento, idade_minima,
 * exames_por_dia (number|null), observacoes, agenda (string[]).
 */
export async function adicionarMedico(medico) {
  const nome = medico.nome.trim();
  if (!nome) {
    return { sucesso: false, mensagem: 'Nome não pode ser vazio.' };
  }

  const { error } = await supabase.from('medicos').insert({
    nome,
    local_atendimento: medico.local_atendimento.trim(),
    horario: medico.horario.trim(),
    ordem_atendimento: medico.ordem_atendimento,
    idade_minima: medico.idade_minima,
    exames_por_dia: medico.exames_por_dia,
    observacoes: medico.observacoes.trim(),
    agenda: medico.agenda ?? [],
  });

  if (error) {
    if (ehErroDeDuplicidade(error.message)) {
      return { sucesso: false, mensagem: `Já existe um médico chamado "${nome}".` };
    }
    return { sucesso: false, mensagem: `Erro ao cadastrar: ${error.message}` };
  }

  return { sucesso: true, mensagem: `Dr(a). "${nome}" cadastrado(a).` };
}

/**
 * Atualiza um medico existente pelo id.
 */
export async function atualizarMedico(id, medico) {
  const nome = medico.nome.trim();
  if (!nome) {
    return { sucesso: false, mensagem: 'Nome não pode ser vazio.' };
  }

  const { error } = await supabase
    .from('medicos')
    .update({
      nome,
      local_atendimento: medico.local_atendimento.trim(),
      horario: medico.horario.trim(),
      ordem_atendimento: medico.ordem_atendimento,
      idade_minima: medico.idade_minima,
      exames_por_dia: medico.exames_por_dia,
      observacoes: medico.observacoes.trim(),
      agenda: medico.agenda ?? [],
    })
    .eq('id', id);

  if (error) {
    if (ehErroDeDuplicidade(error.message)) {
      return { sucesso: false, mensagem: `Já existe um médico chamado "${nome}".` };
    }
    return { sucesso: false, mensagem: `Erro ao atualizar: ${error.message}` };
  }

  return { sucesso: true, mensagem: 'Dados atualizados.' };
}

/**
 * Remove um medico. Vinculos em exame_medico saem em cascata (ON DELETE CASCADE).
 */
export async function removerMedico(id) {
  const { error } = await supabase.from('medicos').delete().eq('id', id);

  if (error) {
    return { sucesso: false, mensagem: `Erro ao remover médico: ${error.message}` };
  }

  return { sucesso: true, mensagem: null };
}

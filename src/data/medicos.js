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

  const { data, error } = await supabase
    .from('medicos')
    .insert({
      nome,
      local_atendimento: medico.local_atendimento.trim(),
      horario: medico.horario.trim(),
      ordem_atendimento: medico.ordem_atendimento,
      idade_minima: medico.idade_minima,
      exames_por_dia: medico.exames_por_dia,
      observacoes: medico.observacoes.trim(),
      agenda: medico.agenda ?? [],
    })
    .select('id')
    .single();

  if (error) {
    if (ehErroDeDuplicidade(error.message)) {
      return { sucesso: false, mensagem: `Já existe um médico chamado "${nome}".` };
    }
    return { sucesso: false, mensagem: `Erro ao cadastrar: ${error.message}` };
  }

  return { sucesso: true, mensagem: `Dr(a). "${nome}" cadastrado(a).`, id: data.id };
}

/**
 * Vincula um código TUSS (vindo da busca na API da ANS) a um médico.
 * Garante que `exames_info` tenha uma linha para o código (criando com
 * um snapshot do nome oficial se ainda não existir) antes de vincular.
 */
export async function vincularExame(medicoId, { codigoTuss, nomeOficial }) {
  const codigo = (codigoTuss ?? '').trim();
  if (!codigo) {
    return { sucesso: false, mensagem: 'Código TUSS inválido.' };
  }

  const { error: erroUpsert } = await supabase
    .from('exames_info')
    .upsert({ codigo_tuss: codigo, nome_snapshot: nomeOficial }, { onConflict: 'codigo_tuss' });

  if (erroUpsert) {
    return { sucesso: false, mensagem: `Erro ao registrar exame: ${erroUpsert.message}` };
  }

  const { error: erroVinculo } = await supabase
    .from('exame_medico')
    .upsert({ medico_id: medicoId, codigo_tuss: codigo }, { onConflict: 'medico_id,codigo_tuss', ignoreDuplicates: true });

  if (erroVinculo) {
    return { sucesso: false, mensagem: `Erro ao vincular exame: ${erroVinculo.message}` };
  }

  return { sucesso: true, mensagem: null };
}

/**
 * Remove o vínculo entre um médico e um código TUSS. Não apaga o
 * `exames_info` (outro médico pode estar vinculado ao mesmo código).
 */
export async function desvincularExame(medicoId, codigoTuss) {
  const { error } = await supabase
    .from('exame_medico')
    .delete()
    .eq('medico_id', medicoId)
    .eq('codigo_tuss', codigoTuss);

  if (error) {
    return { sucesso: false, mensagem: `Erro ao desvincular exame: ${error.message}` };
  }
  return { sucesso: true, mensagem: null };
}

/**
 * Lista os exames vinculados a um médico, com dados do overlay local.
 */
export async function listarExamesDoMedico(medicoId) {
  const { data, error } = await supabase
    .from('exame_medico')
    .select('codigo_tuss, exames_info(nome_snapshot, tem_preparo, observacoes)')
    .eq('medico_id', medicoId);

  if (error) {
    console.error('Erro ao listar exames do médico:', error.message);
    return { dados: [], error: 'Não foi possível carregar os exames vinculados.' };
  }

  const dados = data.map((v) => ({
    codigoTuss: v.codigo_tuss,
    nome: v.exames_info?.nome_snapshot ?? v.codigo_tuss,
    temPreparo: v.exames_info?.tem_preparo ?? false,
    observacoes: v.exames_info?.observacoes ?? '',
  }));

  return { dados, error: null };
}

/**
 * Atualiza preparo/observações de um código TUSS (dado de negócio,
 * não é sobrescrito pela ANS). Aceita atualização parcial.
 */
export async function atualizarInfoExame(codigoTuss, { temPreparo, observacoes } = {}) {
  const patch = {};
  if (temPreparo !== undefined) patch.tem_preparo = temPreparo;
  if (observacoes !== undefined) patch.observacoes = observacoes.trim();

  if (Object.keys(patch).length === 0) {
    return { sucesso: true, mensagem: null };
  }

  const { error } = await supabase.from('exames_info').update(patch).eq('codigo_tuss', codigoTuss);

  if (error) {
    return { sucesso: false, mensagem: `Erro ao atualizar exame: ${error.message}` };
  }
  return { sucesso: true, mensagem: null };
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
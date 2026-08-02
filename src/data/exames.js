import { supabase } from '../supabaseClient.js';

/**
 * Busca exames de imagem (tuss_exames) com filtro de texto e de preparo.
 * Reproduz a mesma logica do fetch_all() do db.py original:
 *  - busca por codigo OU nome (ilike)
 *  - filtro opcional por tem_preparo
 *  - junta os nomes dos medicos responsaveis via exame_medico -> medicos
 *
 * @param {Object} opcoes
 * @param {string} opcoes.termoBusca - texto livre (codigo ou nome)
 * @param {'todos'|'com'|'sem'} opcoes.filtroPreparo
 * @returns {Promise<{dados: Array, error: string|null}>}
 */
export async function buscarExames({ termoBusca = '', filtroPreparo = 'todos' } = {}) {
  let query = supabase
    .from('tuss_exames')
    .select('codigo, nome, tem_preparo, observacoes, exame_medico(medicos(nome))')
    .order('nome');

  const termo = termoBusca.trim().replace(/[%,]/g, '');
  if (termo) {
    query = query.or(`codigo.ilike.%${termo}%,nome.ilike.%${termo}%`);
  }

  if (filtroPreparo === 'com') {
    query = query.eq('tem_preparo', true);
  } else if (filtroPreparo === 'sem') {
    query = query.eq('tem_preparo', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar exames:', error.message);
    return { dados: [], error: 'Nao foi possivel carregar os exames.' };
  }

  const dados = data.map((exame) => ({
    codigo: exame.codigo,
    nome: exame.nome,
    temPreparo: exame.tem_preparo,
    observacoes: exame.observacoes ?? '',
    quemFaz: (exame.exame_medico ?? [])
      .map((v) => v.medicos?.nome)
      .filter(Boolean)
      .sort()
      .join(', '),
  }));

  return { dados, error: null };
}

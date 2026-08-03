import { supabase } from '../supabaseClient.js';
import { buscarProcedimentosAns } from './ansApi.js';

// Abaixo disso não busca: o catálogo TUSS tem ~6 mil registros, evitar
// disparar a API pública em cada tecla digitada com 1 caractere.
const MIN_CHARS_BUSCA = 2;

/**
 * Busca exames combinando duas fontes:
 *  - ANS (fonte oficial do código e do nome do procedimento);
 *  - Supabase `exames_info` (overlay de negócio: quem faz, preparo, observações).
 *
 * O Supabase NÃO é mais a fonte do catálogo — só complementa por código TUSS.
 * Se um código existe na ANS mas nunca foi "ativado" localmente, ele ainda
 * aparece no resultado, só que sem médico e sem preparo definido.
 *
 * @param {Object} opcoes
 * @param {string} opcoes.termoBusca - código TUSS ou nome do exame
 * @param {'todos'|'com'|'sem'} opcoes.filtroPreparo
 * @returns {Promise<{dados: Array, error: string|null}>}
 */
export async function buscarExames({ termoBusca = '', filtroPreparo = 'todos' } = {}) {
  const termo = termoBusca.trim();

  if (termo.length < MIN_CHARS_BUSCA) {
    return { dados: [], error: null };
  }

  const { dados: procedimentosAns, error: erroAns } = await buscarProcedimentosAns({ termoBusca: termo });

  if (erroAns) {
    return { dados: [], error: erroAns };
  }

  if (procedimentosAns.length === 0) {
    return { dados: [], error: null };
  }

  const codigos = procedimentosAns.map((p) => p.codigo);
  const { dados: overlay, error: erroOverlay } = await buscarInfoLocal(codigos);

  if (erroOverlay) {
    return { dados: [], error: erroOverlay };
  }

  const overlayPorCodigo = new Map(overlay.map((o) => [o.codigo_tuss, o]));

  let dados = procedimentosAns.map((p) => {
    const info = overlayPorCodigo.get(p.codigo);
    return {
      codigo: p.codigo,
      nome: p.nome, // sempre o nome oficial vindo da ANS, nunca de cache local
      temPreparo: info?.tem_preparo ?? false,
      preparoDefinido: Boolean(info),
      observacoes: info?.observacoes ?? '',
      quemFaz: (info?.exame_medico ?? [])
        .map((v) => v.medicos?.nome)
        .filter(Boolean)
        .sort()
        .join(', '),
      vigente: !p.vigencia.fim,
    };
  });

  if (filtroPreparo === 'com') {
    dados = dados.filter((e) => e.temPreparo === true);
  } else if (filtroPreparo === 'sem') {
    dados = dados.filter((e) => e.temPreparo === false);
  }

  return { dados, error: null };
}

async function buscarInfoLocal(codigos) {
  const { data, error } = await supabase
    .from('exames_info')
    .select('codigo_tuss, tem_preparo, observacoes, exame_medico(medicos(nome))')
    .in('codigo_tuss', codigos);

  if (error) {
    console.error('Erro ao buscar dados internos dos exames:', error.message);
    return { dados: [], error: 'Não foi possível carregar os dados internos (quem faz / preparo).' };
  }

  return { dados: data, error: null };
}
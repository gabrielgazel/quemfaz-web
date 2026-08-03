/**
 * Cliente para a API pública ANS/OCL (catálogo oficial de tabelas TUSS).
 * Documentação: https://consulta-ocl.apps.sa-1a.mendixcloud.com/rest-doc/rest/oclservice
 *
 * Esta API é a FONTE OFICIAL de código/nome/vigência dos procedimentos
 * TUSS. Ela NÃO contém dados de negócio da clínica (quem faz o exame,
 * preparo, observações) — esses continuam no Supabase (ver data/exames.js).
 * Uso pretendido aqui: autocomplete/validação do código oficial, não
 * substituição da tabela interna.
 */

const BASE_URL = 'https://consulta-ocl.apps.sa-1a.mendixcloud.com/rest/oclservice/ANS';

// tuss-22 = "Procedimentos em saúde" — fonte TUSS equivalente a exames/procedimentos.
const SOURCE_PROCEDIMENTOS = 'tuss-22';

const TIMEOUT_MS = 6000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min: códigos TUSS mudam raramente
const cache = new Map(); // chave -> { valor, expiraEm }

function lerCache(chave) {
  const entrada = cache.get(chave);
  if (!entrada) return undefined;
  if (Date.now() > entrada.expiraEm) {
    cache.delete(chave);
    return undefined;
  }
  return entrada.valor;
}

function gravarCache(chave, valor) {
  cache.set(chave, { valor, expiraEm: Date.now() + CACHE_TTL_MS });
}

async function fetchComTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resposta = await fetch(url, { signal: controller.signal });
    if (!resposta.ok) {
      throw new Error(`ANS API respondeu ${resposta.status}`);
    }
    return await resposta.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Busca procedimentos TUSS oficiais por texto livre (código ou nome).
 * Retorna sempre um array (vazio em caso de erro), nunca lança —
 * chamador decide o que fazer com uma lista vazia.
 *
 * @param {Object} opcoes
 * @param {string} opcoes.termoBusca
 * @param {number} opcoes.pagina
 * @returns {Promise<{dados: Array<{codigo: string, nome: string, vigencia: Object}>, error: string|null}>}
 */
export async function buscarProcedimentosAns({ termoBusca = '', pagina = 1 } = {}) {
  const termo = termoBusca.trim();
  if (!termo) {
    return { dados: [], error: null };
  }

  const chaveCache = `${SOURCE_PROCEDIMENTOS}:${termo}:${pagina}`;
  const doCache = lerCache(chaveCache);
  if (doCache) {
    return { dados: doCache, error: null };
  }

  const url = `${BASE_URL}/concepts/${SOURCE_PROCEDIMENTOS}?page=${pagina}&q=${encodeURIComponent(termo)}`;

  try {
    const bruto = await fetchComTimeout(url);

    const dados = (Array.isArray(bruto) ? bruto : []).map((item) => ({
      codigo: item.id,
      nome: item.display_name,
      vigencia: {
        inicio: item.extras?.inicio_vigencia ?? null,
        fim: item.extras?.fim_vigencia === '-' ? null : (item.extras?.fim_vigencia ?? null),
      },
    }));

    gravarCache(chaveCache, dados);
    return { dados, error: null };
  } catch (err) {
    console.error('Erro ao consultar API ANS:', err.message);
    return { dados: [], error: 'Não foi possível consultar a referência oficial da ANS agora.' };
  }
}

/**
 * Verifica se um código TUSS existe e está vigente na tabela oficial.
 * Usar no cadastro/edição de exames para evitar código inválido ou
 * uma tabela TUSS descontinuada.
 *
 * @param {string} codigo
 * @returns {Promise<{valido: boolean, vigente: boolean, nomeOficial: string|null, error: string|null}>}
 */
export async function validarCodigoAns(codigo) {
  const codigoLimpo = (codigo ?? '').trim();
  if (!codigoLimpo) {
    return { valido: false, vigente: false, nomeOficial: null, error: 'Código vazio.' };
  }

  const { dados, error } = await buscarProcedimentosAns({ termoBusca: codigoLimpo });

  if (error) {
    return { valido: false, vigente: false, nomeOficial: null, error };
  }

  const encontrado = dados.find((d) => d.codigo === codigoLimpo);
  if (!encontrado) {
    return { valido: false, vigente: false, nomeOficial: null, error: null };
  }

  const vigente = !encontrado.vigencia.fim; // sem data de fim = ainda vigente
  return { valido: true, vigente, nomeOficial: encontrado.nome, error: null };
}

/**
 * Validações reutilizáveis de formulários.
 * Cada função retorna null quando o valor é válido, ou uma string
 * com a mensagem de erro pronta para exibir ao usuário.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarEmail(valor) {
  const v = (valor ?? '').trim();
  if (!v) return 'Informe o email.';
  if (v.length > 254) return 'Email muito longo.';
  if (!EMAIL_RE.test(v)) return 'Email em formato inválido.';
  return null;
}

export function validarSenha(valor) {
  if (!valor) return 'Informe a senha.';
  if (valor.length < 8) return 'A senha deve ter ao menos 8 caracteres.';
  return null;
}

export function validarTexto(valor, { campo = 'Campo', min = 1, max = 255, obrigatorio = true } = {}) {
  const v = (valor ?? '').trim();
  if (!v) return obrigatorio ? `${campo} não pode ser vazio.` : null;
  if (v.length < min) return `${campo} deve ter ao menos ${min} caractere(s).`;
  if (v.length > max) return `${campo} deve ter no máximo ${max} caractere(s).`;
  return null;
}

/**
 * Valida um número inteiro dentro de um intervalo, sem mascarar
 * entradas inválidas como zero (diferente do `Number(x) || 0`).
 */
export function validarInteiro(valor, { campo = 'Campo', min = 0, max = Number.MAX_SAFE_INTEGER, obrigatorio = true } = {}) {
  const bruto = String(valor ?? '').trim();
  if (!bruto) return obrigatorio ? `${campo} é obrigatório.` : null;

  const n = Number(bruto);
  if (!Number.isInteger(n)) return `${campo} deve ser um número inteiro.`;
  if (n < min) return `${campo} deve ser maior ou igual a ${min}.`;
  if (n > max) return `${campo} deve ser menor ou igual a ${max}.`;
  return null;
}

export function validarSelecaoMinima(valores, { campo = 'Seleção', minimo = 1 } = {}) {
  if (!Array.isArray(valores) || valores.length < minimo) {
    return `Selecione ao menos ${minimo} opção(ões) em "${campo}".`;
  }
  return null;
}

/**
 * Remove caracteres usados em operadores do PostgREST (ilike/or) para
 * evitar que o usuário quebre a query de busca. Mantém apenas o que
 * é necessário para uma busca por texto legítima.
 */
export function sanitizarTermoBusca(valor, { max = 100 } = {}) {
  return (valor ?? '')
    .trim()
    .slice(0, max)
    .replace(/[%,()]/g, '');
}

/**
 * Roda uma lista de {campo, erro} e retorna o primeiro erro encontrado,
 * ou null se tudo estiver válido. Uso:
 *   const erro = validarFormulario([
 *     validarTexto(nome, { campo: 'Nome' }),
 *     validarInteiro(idade, { campo: 'Idade mínima', min: 0, max: 120 }),
 *   ]);
 */
export function primeiroErro(...validacoes) {
  return validacoes.find((e) => e !== null) ?? null;
}

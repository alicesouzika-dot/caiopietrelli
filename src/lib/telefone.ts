/**
 * Utilitários de Telefonia Brasileira e Normalização E.164
 * Suporta DDDs do Brasil e padrão WhatsApp internacional.
 */

/**
 * Remove qualquer caractere que não seja dígito numérico
 */
export function limparTelefone(telefone: string | null | undefined): string {
  if (!telefone) return '';
  return String(telefone).replace(/\D/g, '');
}

/**
 * Normaliza um telefone brasileiro para o formato internacional E.164 (ex: 5521976397273).
 * Trata casos sem DDD (adiciona DDD 21 de Guapimirim/RJ automaticamente), sem DDI (10 ou 11 dígitos),
 * com DDI (12 ou 13 dígitos) e números com zero à esquerda.
 */
export function normalizarParaE164(telefoneInput: string | null | undefined): string {
  let limpo = limparTelefone(telefoneInput);

  if (!limpo) return '';

  // Remove eventual zero inicial (ex: 021988887777 -> 21988887777)
  while (limpo.startsWith('0')) {
    limpo = limpo.slice(1);
  }

  if (!limpo) return '';

  // Já possui DDI 55 (12 ou 13 dígitos no Brasil)
  if (limpo.startsWith('55') && (limpo.length === 12 || limpo.length === 13)) {
    return limpo;
  }

  // 8 ou 9 dígitos (sem DDD) -> assume DDD 21 (Guapimirim / RJ)
  if (limpo.length === 8 || limpo.length === 9) {
    return `5521${limpo}`;
  }

  // 10 dígitos começando com 99, 98, 97 ou 96 (celular do RJ digitado com 1 dígito extra sem DDD)
  if (limpo.length === 10 && /^9[6-9]/.test(limpo)) {
    return `5521${limpo.slice(0, 9)}`;
  }

  // 10 dígitos (DDD + 8 dígitos) ou 11 dígitos (DDD + 9 dígitos)
  if (limpo.length === 10 || limpo.length === 11) {
    return `55${limpo}`;
  }

  // Qualquer outro número parcial: mantém dígitos para posterior edição
  return limpo;
}

/**
 * Valida se um número normalizado é um telefone brasileiro plausível (aceita com ou sem DDD)
 */
export function validarTelefoneBR(telefoneInput: string | null | undefined): boolean {
  const limpo = limparTelefone(telefoneInput);
  if (!limpo) return false;
  const e164 = normalizarParaE164(telefoneInput);
  return e164.length >= 10 && e164.length <= 13;
}

/**
 * Formata para exibição amigável: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatarTelefoneExibicao(telefoneInput: string | null | undefined): string {
  let limpo = limparTelefone(telefoneInput);
  if (!limpo) return 'Não informado';

  // Se tiver 8 ou 9 dígitos sem DDD, adiciona o DDD 21 para exibição
  if (limpo.length === 8 || limpo.length === 9) {
    limpo = `21${limpo}`;
  }

  // Se começar com 55 e tiver 12 ou 13 dígitos, remove o DDI para formatar visualmente
  if (limpo.startsWith('55') && (limpo.length === 12 || limpo.length === 13)) {
    limpo = limpo.slice(2);
  }

  if (limpo.length === 11) {
    return limpo.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (limpo.length === 10) {
    return limpo.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return telefoneInput || 'Não informado';
}

/**
 * Utilitários de CPF (Cadastro de Pessoas Físicas)
 * Regras de validação com dígitos verificadores oficiais, máscara e formatação LGPD.
 */

/**
 * Remove caracteres não numéricos do CPF
 */
export function limparCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';
  return String(cpf).replace(/\D/g, '');
}

/**
 * Valida se um CPF é matematicamente autêntico através do algoritmo dos dígitos verificadores.
 */
export function validarCPF(cpfInput: string | null | undefined): boolean {
  const cpf = limparCPF(cpfInput);

  // Deve ter exatamente 11 dígitos
  if (cpf.length !== 11) return false;

  // CPFs com todos os dígitos iguais são inválidos segundo a Receita Federal
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Cálculo do 1º dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  let digito1 = resto === 10 || resto === 11 ? 0 : resto;
  if (digito1 !== parseInt(cpf.charAt(9), 10)) {
    return false;
  }

  // Cálculo do 2º dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  let digito2 = resto === 10 || resto === 11 ? 0 : resto;
  if (digito2 !== parseInt(cpf.charAt(10), 10)) {
    return false;
  }

  return true;
}

/**
 * Formata CPF como 000.000.000-00
 */
export function formatarCPF(cpfInput: string | null | undefined): string {
  if (!cpfInput) return '';
  let cpf = limparCPF(cpfInput);
  if (!cpf) return '';
  if (cpf.length === 10) {
    cpf = '0' + cpf;
  }
  if (cpf.length !== 11) return cpf;
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Mascara o CPF para conformidade com a LGPD (ex: ***.456.789-**)
 */
export function mascararCPF(cpfInput: string | null | undefined): string {
  if (!cpfInput || !limparCPF(cpfInput)) return 'Não informado';
  const cpf = formatarCPF(cpfInput);
  if (cpf.length !== 14) return cpf;
  return `***.${cpf.slice(4, 7)}.${cpf.slice(8, 11)}-**`;
}

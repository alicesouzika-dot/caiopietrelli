/**
 * Processamento e interpolação de variáveis em templates de mensagem
 */

import { Pet, Tutor } from '../types/database';

export interface InterpolationContext {
  tutor?: Partial<Tutor>;
  pet?: Partial<Pet>;
  assinatura?: string;
  primeiroNomeApenas?: boolean;
}

/**
 * Substitui as tags dinâmicas no modelo de mensagem:
 * {{nome_tutor}}, {{nome_pet}}, {{especie}}, {{bairro}}, {{assinatura}}
 */
export function interpolarTemplate(
  textoTemplate: string,
  contexto: InterpolationContext
): string {
  if (!textoTemplate) return '';

  let nomeTutor = contexto.tutor?.nome_completo?.trim() || 'Tutor(a)';
  if (contexto.primeiroNomeApenas) {
    nomeTutor = nomeTutor.split(' ')[0] || nomeTutor;
  }

  const nomePet = contexto.pet?.nome?.trim() || 'seu pet';
  const especie = contexto.pet?.especie?.trim() || 'pet';
  const bairro = contexto.tutor?.bairro?.trim() || 'Guapimirim';
  const assinatura = contexto.assinatura?.trim() || 'Gabinete Amigos do Caio';

  return textoTemplate
    .replace(/\{\{\s*nome_tutor\s*\}\}/gi, nomeTutor)
    .replace(/\{\{\s*nome_pet\s*\}\}/gi, nomePet)
    .replace(/\{\{\s*especie\s*\}\}/gi, especie)
    .replace(/\{\{\s*bairro\s*\}\}/gi, bairro)
    .replace(/\{\{\s*assinatura\s*\}\}/gi, assinatura);
}

/**
 * Retorna as variáveis disponíveis para inserção com um clique
 */
export const VARIAVEIS_DISPONIVEIS = [
  { tag: '{{nome_tutor}}', rotulo: 'Nome do Tutor', exemplo: 'Mariana Santos' },
  { tag: '{{nome_pet}}', rotulo: 'Nome do Pet', exemplo: 'Thor' },
  { tag: '{{especie}}', rotulo: 'Espécie', exemplo: 'Cão' },
  { tag: '{{bairro}}', rotulo: 'Bairro', exemplo: 'Centro' },
  { tag: '{{assinatura}}', rotulo: 'Assinatura do Gabinete', exemplo: 'Equipe Amigos do Caio' },
] as const;

/**
 * Validação de tamanho da mensagem para WhatsApp
 */
export function checarTamanhoMensagem(mensagem: string): {
  caracteres: number;
  alerta: boolean;
  critico: boolean;
  mensagemAviso?: string;
} {
  const len = mensagem.length;
  if (len > 1000) {
    return {
      caracteres: len,
      alerta: true,
      critico: true,
      mensagemAviso: 'Mensagem acima de 1.000 caracteres! Textos muito longos aumentam o risco de bloqueio pelo WhatsApp.',
    };
  }
  if (len > 850) {
    return {
      caracteres: len,
      alerta: true,
      critico: false,
      mensagemAviso: 'Mensagem com mais de 850 caracteres. Mantenha mensagens objetivas para melhor leitura.',
    };
  }
  return {
    caracteres: len,
    alerta: false,
    critico: false,
  };
}

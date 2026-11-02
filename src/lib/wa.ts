/**
 * Utilitários de WhatsApp Web e Links wa.me
 */

import { normalizarParaE164 } from './telefone';

/**
 * Gera o link universal oficial do WhatsApp para envio manual:
 * https://wa.me/{telefone_e164}?text={mensagem_urlencoded}
 */
export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  const e164 = normalizarParaE164(telefone);
  const textoCodificado = encodeURIComponent(mensagem);
  return `https://wa.me/${e164}?text=${textoCodificado}`;
}

/**
 * Abre a janela do WhatsApp em nova aba com foco
 */
export function abrirWhatsAppWeb(telefone: string, mensagem: string): Window | null {
  const url = gerarLinkWhatsApp(telefone, mensagem);
  return window.open(url, '_blank', 'noopener,noreferrer');
}

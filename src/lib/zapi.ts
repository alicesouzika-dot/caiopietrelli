/**
 * Integração com a API oficial do Z-API e Edge Functions de envio
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { listarConfiguracoes } from './storageEngine';

export interface ZApiStatusResponse {
  connected: boolean;
  smartphoneConnected: boolean;
  session: 'CONNECTED' | 'DISCONNECTED' | 'PAIRING' | 'WAITING_QR_CODE' | 'ERROR';
  error?: string;
  source?: 'edge_function' | 'direct' | 'simulation';
}

export interface ZApiSendResult {
  ok: boolean;
  messageId?: string;
  erro?: string;
  httpStatus?: number;
}

/**
 * Consulta o status da conexão da instância Z-API
 */
export async function checarStatusZApi(): Promise<ZApiStatusResponse> {
  const configs = listarConfiguracoes();
  const instanceId = configs['zapi_instance_id']?.trim();
  const token = configs['zapi_token']?.trim();
  const clientToken = configs['zapi_client_token']?.trim();
  const baseUrl = (configs['zapi_base_url'] || 'https://api.z-api.io').replace(/\/$/, '');

  // Se o usuário não preencheu instância e token
  if (!instanceId || !token) {
    return {
      connected: false,
      smartphoneConnected: false,
      session: 'DISCONNECTED',
      error: 'ID da Instância ou Token não informados na aba Configurações.',
    };
  }

  // 1. Tenta chamar a Edge Function se Supabase estiver ativo
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('zapi-status');
      if (!error && data) {
        return {
          connected: Boolean(data.connected),
          smartphoneConnected: Boolean(data.smartphoneConnected),
          session: data.session || (data.connected ? 'CONNECTED' : 'DISCONNECTED'),
          error: data.error,
          source: 'edge_function',
        };
      }
    } catch (e) {
      console.warn('Edge function zapi-status indisponível, tentando chamada direta:', e);
    }
  }

  // 2. Chamada direta ao endpoint da Z-API
  try {
    const url = `${baseUrl}/instances/${instanceId}/token/${token}/status`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(clientToken ? { 'Client-Token': clientToken } : {}),
      },
    });

    const data = await res.json().catch(() => null);

    if (res.ok) {
      return {
        connected: Boolean(data?.connected),
        smartphoneConnected: Boolean(data?.smartphoneConnected),
        session: data?.connected ? 'CONNECTED' : 'DISCONNECTED',
        source: 'direct',
      };
    }

    return {
      connected: false,
      smartphoneConnected: false,
      session: 'ERROR',
      error: data?.message || `HTTP ${res.status} ao consultar Z-API`,
      source: 'direct',
    };
  } catch (err: any) {
    return {
      connected: false,
      smartphoneConnected: false,
      session: 'ERROR',
      error: 'Instância inacessível ou bloqueada por CORS no navegador. Em produção, utilize a Edge Function.',
      source: 'direct',
    };
  }
}

/**
 * Dispara uma mensagem via Z-API (Edge Function ou Simulação de Demonstração)
 */
export async function dispararMensagemZApi(
  telefone: string,
  mensagem: string,
  delayTyping: number = 2
): Promise<ZApiSendResult> {
  const configs = listarConfiguracoes();
  const zapiAtivo = configs['zapi_ativo'] === 'true';
  const instanceId = configs['zapi_instance_id']?.trim();
  const token = configs['zapi_token']?.trim();

  // Se o Supabase estiver conectado e configurado, chama a Edge Function oficial
  if (isSupabaseConfigured && supabase && instanceId && token) {
    try {
      const { data, error } = await supabase.functions.invoke('enviar-whatsapp', {
        body: { telefone, mensagem, delayTyping },
      });

      if (error) {
        return { ok: false, erro: error.message };
      }
      return {
        ok: Boolean(data?.ok),
        messageId: data?.messageId,
        erro: data?.erro,
        httpStatus: data?.httpStatus,
      };
    } catch (err: any) {
      return { ok: false, erro: err.message || 'Erro ao invocar Edge Function' };
    }
  }

  // Se Z-API ativo e com credenciais, tenta fetch direto
  if (zapiAtivo && instanceId && token) {
    const baseUrl = (configs['zapi_base_url'] || 'https://api.z-api.io').replace(/\/$/, '');
    const clientToken = configs['zapi_client_token']?.trim();

    try {
      const url = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(clientToken ? { 'Client-Token': clientToken } : {}),
        },
        body: JSON.stringify({
          phone: telefone.replace(/\D/g, ''),
          message: mensagem,
          delayTyping,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok) {
        return {
          ok: true,
          messageId: data?.zaapId || data?.id || `zaap-${Date.now()}`,
        };
      }
      return {
        ok: false,
        erro: data?.message || data?.error || `Erro HTTP ${res.status}`,
        httpStatus: res.status,
      };
    } catch (err: any) {
      return { ok: false, erro: err.message || 'Falha de rede ao conectar à Z-API' };
    }
  }

  // Simulação precisa com atraso de digitação configurado
  await new Promise((r) => setTimeout(r, Math.max(600, delayTyping * 500)));

  if (telefone.endsWith('999')) {
    return {
      ok: false,
      erro: 'Número não possui conta WhatsApp ativa ou está bloqueado.',
      httpStatus: 400,
    };
  }

  return {
    ok: true,
    messageId: `demo-zapi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
}

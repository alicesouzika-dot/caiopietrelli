// Supabase Edge Function: enviar-whatsapp
// Dispara mensagem de texto via API oficial do Z-API com backoff exponencial

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendRequest {
  telefone: string;
  mensagem: string;
  delayTyping?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SendRequest = await req.json();
    const { telefone, mensagem, delayTyping = 2 } = body;

    if (!telefone || !mensagem) {
      return new Response(
        JSON.stringify({ ok: false, erro: "Telefone e mensagem são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca credenciais na tabela configuracoes
    const { data: configs, error: configError } = await supabase
      .from("configuracoes")
      .select("chave, valor");

    if (configError || !configs) {
      return new Response(
        JSON.stringify({ ok: false, erro: "Falha ao carregar configurações do sistema" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const map = Object.fromEntries(configs.map((c) => [c.chave, c.valor]));
    const instanceId = map["zapi_instance_id"];
    const token = map["zapi_token"];
    const clientToken = map["zapi_client_token"];
    const baseUrl = (map["zapi_base_url"] || "https://api.z-api.io").replace(/\/$/, "");

    if (!instanceId || !token) {
      return new Response(
        JSON.stringify({ ok: false, erro: "Instância ou Token Z-API não configurados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limpeza de telefone (apenas números)
    const phoneClean = telefone.replace(/\D/g, "");

    const url = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;
    const delays = [1000, 3000, 8000];
    let lastError = "";
    let lastStatus = 500;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(clientToken ? { "Client-Token": clientToken } : {}),
          },
          body: JSON.stringify({
            phone: phoneClean,
            message: mensagem,
            delayTyping: Number(delayTyping) || 2,
          }),
        });

        const status = response.status;
        const respData = await response.json().catch(() => null);

        if (response.ok) {
          return new Response(
            JSON.stringify({
              ok: true,
              messageId: respData?.zaapId || respData?.id || respData?.messageId || "zapi-" + Date.now(),
              data: respData,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        lastStatus = status;
        lastError = respData?.error || respData?.message || `HTTP ${status}`;

        // Se for erro de autenticação ou parâmetro inválido (400, 401, 403), não adianta retentar
        if (status === 400 || status === 401 || status === 403) {
          break;
        }

        // Se for 429, 500, 502, 503, aguarda com backoff exponencial
        if (attempt < delays.length) {
          await new Promise((r) => setTimeout(r, delays[attempt]));
        }
      } catch (err: any) {
        lastError = err?.message || "Erro de conexão";
        if (attempt < delays.length) {
          await new Promise((r) => setTimeout(r, delays[attempt]));
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: false, erro: lastError, httpStatus: lastStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, erro: err.message || "Erro interno na Edge Function" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

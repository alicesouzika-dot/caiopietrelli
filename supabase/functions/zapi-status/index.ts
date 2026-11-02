// Supabase Edge Function: zapi-status
// Consulta o status real da instância e sessão no Z-API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Carrega credenciais da tabela configuracoes
    const { data: configs } = await supabase.from("configuracoes").select("chave, valor");
    const map = Object.fromEntries((configs || []).map((c) => [c.chave, c.valor]));

    const instanceId = map["zapi_instance_id"];
    const token = map["zapi_token"];
    const clientToken = map["zapi_client_token"];
    const baseUrl = (map["zapi_base_url"] || "https://api.z-api.io").replace(/\/$/, "");

    if (!instanceId || !token) {
      return new Response(
        JSON.stringify({
          connected: false,
          smartphoneConnected: false,
          session: "DISCONNECTED",
          error: "Credenciais Z-API não configuradas (Instance ID e Token vazios).",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `${baseUrl}/instances/${instanceId}/token/${token}/status`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(clientToken ? { "Client-Token": clientToken } : {}),
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          connected: false,
          smartphoneConnected: false,
          session: "ERROR",
          error: data?.message || data?.error || `Falha de conexão com Z-API (HTTP ${response.status})`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        connected: Boolean(data?.connected),
        smartphoneConnected: Boolean(data?.smartphoneConnected),
        session: data?.session || (data?.connected ? "CONNECTED" : "DISCONNECTED"),
        raw: data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        connected: false,
        smartphoneConnected: false,
        session: "ERROR",
        error: err.message || "Erro interno ao consultar Z-API",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

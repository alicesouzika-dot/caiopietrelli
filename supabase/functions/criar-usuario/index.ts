// Supabase Edge Function: criar-usuario
// Cria novo usuário via Supabase Auth Admin e atribui perfil com papel definido (apenas Admin pode invocar)

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, erro: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    // Valida se o usuário que está chamando é Admin
    const clientUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerUser }, error: userError } = await clientUser.auth.getUser();

    if (userError || !callerUser) {
      return new Response(
        JSON.stringify({ ok: false, erro: "Sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Consulta role do solicitante
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, nome")
      .eq("id", callerUser.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return new Response(
        JSON.stringify({ ok: false, erro: "Apenas administradores podem convidar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, nome, role = "moderador" } = await req.json();

    if (!email || !password || !nome) {
      return new Response(
        JSON.stringify({ ok: false, erro: "Nome, e-mail e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cria o usuário com confirmação automática de e-mail
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    });

    if (createError || !newUserData.user) {
      return new Response(
        JSON.stringify({ ok: false, erro: createError?.message || "Falha ao criar usuário" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newUserData.user.id;

    // Atualiza ou insere o perfil com a role especificada
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: newUserId,
      nome,
      email,
      role: role === "admin" ? "admin" : "moderador",
      ativo: true,
    });

    if (profileError) {
      return new Response(
        JSON.stringify({ ok: false, erro: profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Registra no audit_log
    await supabaseAdmin.from("audit_log").insert({
      user_id: callerUser.id,
      user_nome: callerProfile?.nome || "Admin",
      acao: "CRIAR_USUARIO",
      entidade: "profiles",
      entidade_id: newUserId,
      detalhes: { email, nome, role },
    });

    return new Response(
      JSON.stringify({ ok: true, userId: newUserId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, erro: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

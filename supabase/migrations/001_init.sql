-- ============================================================================
-- MIGRATION: 001_init.sql
-- PROJETO: Amigos do Caio — Painel de Comunicação com Tutores
-- Gabinete do Vereador / Secretaria de Bem-Estar e Proteção Animal — Guapimirim/RJ
-- ============================================================================

-- 1. TABELA DE PERFIS / EQUIPE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  role text not null default 'moderador' check (role in ('admin','moderador')),
  ativo boolean default true,
  ultimo_acesso timestamptz,
  criado_em timestamptz default now()
);

-- 2. TABELA DE TUTORES DE PETS
create table if not exists public.tutores (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  cpf text not null unique,
  telefone_original text,
  telefone_e164 text not null,
  bairro text,
  ativo boolean default true,
  observacoes text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- 3. TABELA DE PETS (Relação 1 tutor -> N pets)
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutores(id) on delete cascade,
  nome text,
  sexo text check (sexo in ('Macho','Fêmea','Não informado')),
  idade text,
  especie text,
  raca text,
  criado_em timestamptz default now()
);

-- 4. TABELA DE TEMPLATES DE MENSAGENS
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null check (categoria in ('vacinacao','adocao','evento','castracao','geral')),
  corpo text not null,
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- 5. TABELA DE CAMPANHAS DE DISPARO
create table if not exists public.campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null,
  template_id uuid references public.templates(id) on delete set null,
  metodo text not null default 'manual' check (metodo in ('manual','zapi')),
  filtros_aplicados jsonb,
  total_destinatarios int default 0,
  total_enviados int default 0,
  total_erros int default 0,
  status text default 'rascunho'
    check (status in ('rascunho','em_andamento','pausada','concluida','cancelada')),
  criado_por uuid references auth.users(id),
  criado_em timestamptz default now(),
  concluido_em timestamptz
);

-- 6. TABELA DE ENVIOS (HISTÓRICO INDIVIDUAL DE MENSAGENS)
create table if not exists public.envios (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid references public.campanhas(id) on delete cascade,
  tutor_id uuid references public.tutores(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  telefone_destino text not null,
  mensagem_final text not null,
  metodo text not null check (metodo in ('manual','zapi')),
  status text default 'pendente'
    check (status in ('pendente','enviando','enviado','erro','pulado')),
  zapi_message_id text,
  erro text,
  tentativas int default 0,
  enviado_em timestamptz,
  criado_em timestamptz default now()
);

-- 7. TABELA DE CONFIGURAÇÕES DO SISTEMA (Credenciais Z-API, delays e remetente)
create table if not exists public.configuracoes (
  chave text primary key,
  valor text,
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz default now()
);

-- 8. TABELA DE LOG DE AUDITORIA
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  user_nome text,
  acao text not null,
  entidade text,
  entidade_id text,
  detalhes jsonb,
  criado_em timestamptz default now()
);

-- ÍNDICES PARA PERFORMANCE
create index if not exists idx_tutores_bairro on public.tutores(bairro);
create index if not exists idx_tutores_ativo on public.tutores(ativo);
create index if not exists idx_pets_especie on public.pets(especie);
create index if not exists idx_pets_tutor on public.pets(tutor_id);
create index if not exists idx_envios_campanha on public.envios(campanha_id);
create index if not exists idx_envios_status on public.envios(status);

-- ============================================================================
-- FUNÇÕES AUXILIARES DE SEGURANÇA (SECURITY DEFINER - evitam recursão de RLS)
-- ============================================================================

create or replace function public.meu_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.sou_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_role() = 'admin', false);
$$;

-- TRIGGER DE NOVO USUÁRIO: O primeiro cadastrado vira admin, demais moderador
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare qtd int;
begin
  select count(*) into qtd from public.profiles;
  insert into public.profiles (id, nome, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
    new.email,
    case when qtd = 0 then 'admin' else 'moderador' end
  );
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- PROTEÇÃO CONTRA ESCALADA DE PRIVILÉGIO (somente admin altera role ou status)
create or replace function public.proteger_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.sou_admin() then
    new.role := old.role;
    new.ativo := old.ativo;
  end if;
  return new;
end; $$;

drop trigger if exists trg_proteger_role on public.profiles;
create trigger trg_proteger_role before update on public.profiles
  for each row execute function public.proteger_role();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.profiles      enable row level security;
alter table public.tutores       enable row level security;
alter table public.pets          enable row level security;
alter table public.templates     enable row level security;
alter table public.campanhas     enable row level security;
alter table public.envios        enable row level security;
alter table public.configuracoes enable row level security;
alter table public.audit_log     enable row level security;

-- PROFILES
create policy p_profiles_select on public.profiles for select to authenticated using (true);
create policy p_profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.sou_admin()) with check (true);
create policy p_profiles_delete on public.profiles for delete to authenticated using (public.sou_admin());

-- TUTORES (Moderador pode ver, criar e editar; apenas Admin pode excluir)
create policy p_tutores_select on public.tutores for select to authenticated using (true);
create policy p_tutores_insert on public.tutores for insert to authenticated with check (true);
create policy p_tutores_update on public.tutores for update to authenticated using (true) with check (true);
create policy p_tutores_delete on public.tutores for delete to authenticated using (public.sou_admin());

-- PETS (Moderador pode ver, criar e editar; apenas Admin pode excluir)
create policy p_pets_select on public.pets for select to authenticated using (true);
create policy p_pets_insert on public.pets for insert to authenticated with check (true);
create policy p_pets_update on public.pets for update to authenticated using (true) with check (true);
create policy p_pets_delete on public.pets for delete to authenticated using (public.sou_admin());

-- TEMPLATES
create policy p_tpl_select on public.templates for select to authenticated using (true);
create policy p_tpl_insert on public.templates for insert to authenticated with check (true);
create policy p_tpl_update on public.templates for update to authenticated using (true) with check (true);
create policy p_tpl_delete on public.templates for delete to authenticated using (public.sou_admin());

-- CAMPANHAS
create policy p_camp_select on public.campanhas for select to authenticated using (true);
create policy p_camp_insert on public.campanhas for insert to authenticated with check (true);
create policy p_camp_update on public.campanhas for update to authenticated using (true) with check (true);
create policy p_camp_delete on public.campanhas for delete to authenticated using (public.sou_admin());

-- ENVIOS
create policy p_env_select on public.envios for select to authenticated using (true);
create policy p_env_insert on public.envios for insert to authenticated with check (true);
create policy p_env_update on public.envios for update to authenticated using (true) with check (true);
create policy p_env_delete on public.envios for delete to authenticated using (public.sou_admin());

-- CONFIGURAÇÕES (Todos autenticados leem, somente admin escreve)
create policy p_cfg_select on public.configuracoes for select to authenticated using (true);
create policy p_cfg_write  on public.configuracoes for all to authenticated
  using (public.sou_admin()) with check (public.sou_admin());

-- AUDIT LOG (Admin lê; inserts por funções de sistema ou triggers)
create policy p_log_select on public.audit_log for select to authenticated using (public.sou_admin());
create policy p_log_insert on public.audit_log for insert to authenticated with check (true);

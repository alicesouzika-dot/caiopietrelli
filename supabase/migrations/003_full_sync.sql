-- ============================================================================
-- MIGRATION: 003_full_sync.sql
-- PROJETO: Amigos do Caio — Compatibilidade Completa Desktop + Mobile Offline-First
-- ============================================================================

-- 1. Ajustes de colunas em TUTORES para compatibilidade com Cadastro Rápido Mobile
alter table public.tutores alter column cpf drop not null;
alter table public.tutores add column if not exists client_uuid uuid;
alter table public.tutores add column if not exists nome text;
alter table public.tutores add column if not exists telefone text;
alter table public.tutores add column if not exists origem text default 'desktop';

-- 2. Ajustes de colunas e constraints em PETS
alter table public.pets drop constraint if exists pets_sexo_check;
alter table public.pets add constraint pets_sexo_check
  check (sexo in ('Macho','Fêmea','Não informado','macho','femea','indefinido'));

alter table public.pets add column if not exists client_uuid uuid;
alter table public.pets add column if not exists porte text;
alter table public.pets add column if not exists castrado boolean default false;
alter table public.pets add column if not exists vacinado boolean default false;
alter table public.pets add column if not exists origem text default 'desktop';
alter table public.pets add column if not exists atualizado_em timestamptz default now();

-- 3. Ajustes de colunas e constraints em ENVIOS
alter table public.envios drop constraint if exists envios_status_check;
alter table public.envios add constraint envios_status_check
  check (status in ('pendente','enviando','enviado','erro','pulado','cancelado'));

alter table public.envios add column if not exists telefone text;
alter table public.envios add column if not exists mensagem text;
alter table public.envios add column if not exists canal text;
alter table public.envios add column if not exists erro_mensagem text;
alter table public.envios add column if not exists dispositivo text;

-- 4. Políticas RLS adicionais para permitir sincronização offline-first e modo híbrido (anon + authenticated)
do $$
begin
  -- Profiles
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'p_profiles_anon_all') then
    create policy p_profiles_anon_all on public.profiles for all to anon using (true) with check (true);
  end if;

  -- Tutores
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tutores' and policyname = 'p_tutores_anon_all') then
    create policy p_tutores_anon_all on public.tutores for all to anon using (true) with check (true);
  end if;

  -- Pets
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pets' and policyname = 'p_pets_anon_all') then
    create policy p_pets_anon_all on public.pets for all to anon using (true) with check (true);
  end if;

  -- Templates
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'templates' and policyname = 'p_tpl_anon_all') then
    create policy p_tpl_anon_all on public.templates for all to anon using (true) with check (true);
  end if;

  -- Campanhas
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'campanhas' and policyname = 'p_camp_anon_all') then
    create policy p_camp_anon_all on public.campanhas for all to anon using (true) with check (true);
  end if;

  -- Envios
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'envios' and policyname = 'p_env_anon_all') then
    create policy p_env_anon_all on public.envios for all to anon using (true) with check (true);
  end if;

  -- Configuracoes
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'configuracoes' and policyname = 'p_cfg_anon_all') then
    create policy p_cfg_anon_all on public.configuracoes for all to anon using (true) with check (true);
  end if;

  -- Audit Log
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audit_log' and policyname = 'p_log_anon_all') then
    create policy p_log_anon_all on public.audit_log for all to anon using (true) with check (true);
  end if;
end $$;


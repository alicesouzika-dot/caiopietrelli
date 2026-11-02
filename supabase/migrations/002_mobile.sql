-- ============================================================================
-- MIGRATION: 002_mobile.sql
-- PROJETO: Amigos do Caio — App Mobile (PWA)
-- Adições ao schema existente para suporte mobile, geolocalização, fotos e push
-- ============================================================================

-- 1. TABELA DE INSCRIÇÕES PUSH (Web Push Notifications)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  plataforma text check (plataforma in ('ios', 'android', 'desktop')),
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- RLS de push_subscriptions: cada usuário gerencia apenas as próprias; admin lê todas
alter table public.push_subscriptions enable row level security;

create policy p_push_self on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid() or public.sou_admin())
  with check (user_id = auth.uid() or public.sou_admin());

-- 2. FOTOS DE PETS E MICROCHIP (STORAGE E METADADOS)
alter table public.pets add column if not exists foto_path text;
alter table public.pets add column if not exists microchip text;

-- 3. GEOLOCALIZAÇÃO PARA O MAPA DE CAMPO (GUAPIMIRIM/RJ)
alter table public.tutores add column if not exists latitude numeric(10,7);
alter table public.tutores add column if not exists longitude numeric(10,7);
alter table public.tutores add column if not exists endereco text;

-- 4. RASTREIO DE DISPOSITIVO NAS AÇÕES DO AUDIT_LOG
alter table public.audit_log add column if not exists dispositivo text;

-- 5. ANTI-DUPLICIDADE EM ENVIOS OFFLINE E ORIGEM
alter table public.envios add column if not exists client_uuid uuid unique;
alter table public.envios add column if not exists origem text default 'desktop'
  check (origem in ('desktop','mobile'));

-- 6. BUCKET DE STORAGE PARA FOTOS DE PETS
insert into storage.buckets (id, name, public) 
values ('pets-fotos', 'pets-fotos', false)
on conflict (id) do nothing;

create policy p_fotos_select on storage.objects for select to authenticated
  using (bucket_id = 'pets-fotos');

create policy p_fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pets-fotos');

create policy p_fotos_update on storage.objects for update to authenticated
  using (bucket_id = 'pets-fotos');

-- ÍNDICES ADICIONAIS PARA PERFORMANCE MOBILE
create index if not exists idx_tutores_geo on public.tutores(latitude, longitude);
create index if not exists idx_envios_client_uuid on public.envios(client_uuid);
create index if not exists idx_push_user on public.push_subscriptions(user_id);

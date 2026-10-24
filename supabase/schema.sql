-- =====================================================================
-- BizLink Despacho · Esquema de Supabase (multiempresa con registro abierto)
-- Pegar completo en: Supabase → SQL Editor → New query → Run
--
-- Cada persona que se registra crea automáticamente SU empresa.
-- Los datos de cada empresa están aislados por políticas RLS.
-- =====================================================================

-- ---------- 0. Limpieza de la versión anterior (lista de correos, sin empresas) ----------
-- Solo borra tablas de la versión vieja (sin columna empresa_id). Con la versión actual NO borra nada,
-- así que este archivo se puede volver a ejecutar sin perder datos.
do $$
declare
  t text;
begin
  foreach t in array array['entidades', 'seguimiento', 'miembros'] loop
    if to_regclass('public.' || t) is not null and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'empresa_id'
    ) then
      execute format('drop table public.%I cascade', t);
    end if;
  end loop;
end $$;
drop function if exists public.es_miembro() cascade;

-- ---------- 1. Empresas y miembros ----------
create table if not exists public.empresas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  creado     timestamptz not null default now(),
  creado_por uuid references auth.users (id) on delete set null
);

create table if not exists public.miembros (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  email      text,
  nombre     text,
  rol        text not null default 'miembro' check (rol in ('dueño', 'admin', 'miembro')),
  creado     timestamptz not null default now(),
  primary key (empresa_id, user_id)
);
create index if not exists miembros_user_idx on public.miembros (user_id);

create or replace function public.es_miembro(p_empresa uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.miembros where empresa_id = p_empresa and user_id = auth.uid());
$$;

alter table public.empresas enable row level security;
drop policy if exists "miembros ven su empresa" on public.empresas;
create policy "miembros ven su empresa" on public.empresas
  for select to authenticated using (public.es_miembro(id));
drop policy if exists "miembros renombran su empresa" on public.empresas;
create policy "miembros renombran su empresa" on public.empresas
  for update to authenticated using (public.es_miembro(id)) with check (public.es_miembro(id));

alter table public.miembros enable row level security;
drop policy if exists "miembros ven a su equipo" on public.miembros;
create policy "miembros ven a su equipo" on public.miembros
  for select to authenticated using (public.es_miembro(empresa_id));
-- Altas de miembros solo por las funciones de abajo (no desde el navegador).

-- Al registrarse: crear su empresa y hacerlo dueño
create or replace function public.al_registrar_usuario()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_emp uuid;
begin
  -- Los invitados (inicio de sesión anónimo) no tienen correo
  insert into public.empresas (nombre, creado_por)
  values (coalesce(nullif(trim(new.raw_user_meta_data ->> 'empresa'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Empresa de prueba'), new.id)
  returning id into v_emp;

  insert into public.miembros (empresa_id, user_id, email, nombre, rol)
  values (v_emp, new.id, new.email, nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), 'dueño');
  return new;
end;
$$;

drop trigger if exists al_registrar_usuario on auth.users;
create trigger al_registrar_usuario
  after insert on auth.users
  for each row execute function public.al_registrar_usuario();

-- Para usuarios creados antes de existir el trigger (o desde el panel de Supabase)
create or replace function public.crear_mi_empresa(p_nombre text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_emp uuid;
  v_email text := auth.jwt() ->> 'email';
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  select empresa_id into v_emp from public.miembros where user_id = auth.uid() limit 1;
  if v_emp is not null then return v_emp; end if;

  insert into public.empresas (nombre, creado_por)
  values (coalesce(nullif(trim(p_nombre), ''), nullif(split_part(coalesce(v_email, ''), '@', 1), ''), 'Empresa de prueba'), auth.uid())
  returning id into v_emp;
  insert into public.miembros (empresa_id, user_id, email, rol) values (v_emp, auth.uid(), v_email, 'dueño');
  return v_emp;
end;
$$;
revoke all on function public.crear_mi_empresa(text) from public;
grant execute on function public.crear_mi_empresa(text) to authenticated;

-- ---------- 2. Datos de la app (un documento JSON por registro y empresa) ----------
-- tipo: fichas, clientes, contratistas, proveedores, personal, vehiculos,
--       articulos, movimientos, asistencia, pizarras, config
create table if not exists public.entidades (
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  tipo        text not null,
  id          text not null,
  data        jsonb not null,
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  updated_by  uuid default auth.uid(),
  primary key (empresa_id, tipo, id)
);

alter table public.entidades enable row level security;
drop policy if exists "miembros gestionan entidades" on public.entidades;
create policy "miembros gestionan entidades" on public.entidades
  for all to authenticated
  using (public.es_miembro(empresa_id))
  with check (public.es_miembro(empresa_id));

-- ---------- 3. Seguimiento público de clientes ----------
-- snap: lo que el cliente puede ver de su parada (lo publica la app interna)
-- cliente: lo que escribe el cliente (firma y calificación)
create table if not exists public.seguimiento (
  tok         text primary key,
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  snap        jsonb not null,
  cliente     jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);
create index if not exists seguimiento_empresa_idx on public.seguimiento (empresa_id);

alter table public.seguimiento enable row level security;
drop policy if exists "miembros gestionan seguimiento" on public.seguimiento;
create policy "miembros gestionan seguimiento" on public.seguimiento
  for all to authenticated
  using (public.es_miembro(empresa_id))
  with check (public.es_miembro(empresa_id));
-- Sin políticas para "anon": el cliente solo entra por las funciones de abajo, con su código.

create or replace function public.seguimiento_get(p_tok text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('snap', snap, 'cliente', cliente)
  from public.seguimiento where tok = p_tok;
$$;

create or replace function public.seguimiento_firmar(p_tok text, p_img text, p_nombre text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  ahora timestamp := now() at time zone 'America/Santo_Domingo';
begin
  if p_img is null or p_img not like 'data:image/png;base64,%' or length(p_img) > 400000 then
    raise exception 'Firma inválida';
  end if;
  if coalesce(trim(p_nombre), '') = '' or length(p_nombre) > 120 then
    raise exception 'Nombre inválido';
  end if;

  update public.seguimiento
     set cliente = cliente || jsonb_build_object('firma', jsonb_build_object(
           'img', p_img, 'n', trim(p_nombre),
           'd', to_char(ahora, 'YYYY-MM-DD'), 'h', to_char(ahora, 'HH24:MI'))),
         actualizado = now()
   where tok = p_tok
     and cliente -> 'firma' is null
     and coalesce(snap #> array['par', snap ->> 'i', 'firma'], 'null'::jsonb) = 'null'::jsonb;
  return found;
end;
$$;

create or replace function public.seguimiento_calificar(p_tok text, p_cal int, p_com text)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if p_cal is null or p_cal < 1 or p_cal > 5 then raise exception 'Calificación inválida'; end if;
  update public.seguimiento
     set cliente = cliente || jsonb_build_object('cal', p_cal, 'com', left(coalesce(trim(p_com), ''), 500)),
         actualizado = now()
   where tok = p_tok
     and cliente -> 'cal' is null;
  return found;
end;
$$;

revoke all on function public.seguimiento_get(text) from public;
revoke all on function public.seguimiento_firmar(text, text, text) from public;
revoke all on function public.seguimiento_calificar(text, int, text) from public;
grant execute on function public.seguimiento_get(text) to anon, authenticated;
grant execute on function public.seguimiento_firmar(text, text, text) to anon, authenticated;
grant execute on function public.seguimiento_calificar(text, int, text) to anon, authenticated;

-- ---------- 4. Tiempo real ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'entidades') then
    alter publication supabase_realtime add table public.entidades;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'seguimiento') then
    alter publication supabase_realtime add table public.seguimiento;
  end if;
end $$;

-- ---------- 5. Archivos (fotos de evidencia y logo) ----------
-- Bucket público de solo lectura por URL. Cada empresa sube solo dentro de su carpeta: <empresa_id>/...
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', true)
on conflict (id) do nothing;

drop policy if exists "miembros suben evidencias" on storage.objects;
create policy "miembros suben evidencias" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidencias' and (storage.foldername(name))[1] in
    (select empresa_id::text from public.miembros where user_id = auth.uid()));

drop policy if exists "miembros editan evidencias" on storage.objects;
create policy "miembros editan evidencias" on storage.objects
  for update to authenticated
  using (bucket_id = 'evidencias' and (storage.foldername(name))[1] in
    (select empresa_id::text from public.miembros where user_id = auth.uid()));

drop policy if exists "miembros borran evidencias" on storage.objects;
create policy "miembros borran evidencias" on storage.objects
  for delete to authenticated
  using (bucket_id = 'evidencias' and (storage.foldername(name))[1] in
    (select empresa_id::text from public.miembros where user_id = auth.uid()));

-- ---------- 6. Catálogo & Servicios (también en migraciones/002_catalogo.sql) ----------
create table if not exists public.catalogo_servicios (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  empresa_id           uuid not null references public.empresas (id) on delete cascade,
  nombre               text not null check (length(trim(nombre)) > 0),
  categoria            text not null default 'Servicio'
                       check (categoria in ('Servicio', 'Producto', 'Flete / Logística', 'Paquete / Combo')),
  precio_estandar      numeric(10,2) not null default 0 check (precio_estandar >= 0),
  precio_minimo        numeric(10,2) check (precio_minimo is null or precio_minimo >= 0),
  descripcion_whatsapp text,
  estado               text not null default 'Activo' check (estado in ('Activo', 'Inactivo'))
);
create index if not exists catalogo_servicios_empresa_idx on public.catalogo_servicios (empresa_id);

-- Cada empresa solo ve y edita su propio catálogo
alter table public.catalogo_servicios enable row level security;
drop policy if exists "miembros gestionan catalogo" on public.catalogo_servicios;
create policy "miembros gestionan catalogo" on public.catalogo_servicios
  for all to authenticated
  using (public.es_miembro(empresa_id))
  with check (public.es_miembro(empresa_id));

-- Tiempo real: los cambios de precio llegan al instante a todo el equipo
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'catalogo_servicios') then
    alter publication supabase_realtime add table public.catalogo_servicios;
  end if;
end $$;

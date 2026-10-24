-- =====================================================================
-- Migración 002 · Catálogo & Servicios (lista de precios operativa)
-- Pegar en: Supabase → SQL Editor → New query → Run
-- No borra ni modifica datos existentes. Se puede ejecutar más de una vez.
-- =====================================================================

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

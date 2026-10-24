-- =====================================================================
-- Migración 003 · Comunicaciones: plantillas de mensajes y seguimiento de chats
-- Pegar en: Supabase → SQL Editor → New query → Run
-- No borra ni modifica datos existentes. Se puede ejecutar más de una vez.
-- =====================================================================

-- ---------- Biblioteca de mensajes predeterminados ----------
-- Variables que la app reemplaza al enviar: {nombre} {servicio} {monto} {tecnico} {fecha} {empresa} {link}
create table if not exists public.plantillas_mensajes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  categoria   text not null default 'General'
              check (categoria in ('Ventas', 'Despacho', 'Garantías', 'General')),
  nombre      text not null check (length(trim(nombre)) > 0),
  texto       text not null check (length(trim(texto)) > 0),
  recontacto  boolean not null default false   -- se usa en "Reactivar chat" (leads fríos)
);
create index if not exists plantillas_mensajes_empresa_idx on public.plantillas_mensajes (empresa_id);

alter table public.plantillas_mensajes enable row level security;
drop policy if exists "miembros gestionan plantillas" on public.plantillas_mensajes;
create policy "miembros gestionan plantillas" on public.plantillas_mensajes
  for all to authenticated
  using (public.es_miembro(empresa_id))
  with check (public.es_miembro(empresa_id));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'plantillas_mensajes') then
    alter publication supabase_realtime add table public.plantillas_mensajes;
  end if;
end $$;

-- ---------- Control de interacción por registro (cliente, parada de despacho o garantía) ----------
-- La app los guarda en public.entidades (tipo = 'interacciones'), igual que el resto de sus datos,
-- para que se sincronicen en tiempo real sin código adicional. Esta vista los expone como columnas
-- para reportes y consultas. Respeta las políticas RLS de entidades (security_invoker).
create or replace view public.interacciones
with (security_invoker = true) as
select
  e.empresa_id,
  e.id                                              as clave,            -- ej. cli:l1 · par:s2 · gar:q1
  e.data ->> 'ref'                                  as tipo_registro,    -- cli | par | gar
  e.data ->> 'rid'                                  as registro_id,
  e.data ->> 'estado_interaccion'                   as estado_interaccion, -- por_responder | esperando | al_dia | archivado
  (e.data ->> 'ultimo_mensaje_fecha')::timestamptz  as ultimo_mensaje_fecha,
  e.data ->> 'ultimo_mensaje_plantilla'             as ultimo_mensaje_plantilla,
  (e.data ->> 'por_responder_desde')::timestamptz   as por_responder_desde,
  (e.data ->> 'fecha_recordatorio')::timestamptz    as fecha_recordatorio,
  e.actualizado
from public.entidades e
where e.tipo = 'interacciones';

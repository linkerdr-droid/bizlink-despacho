-- =====================================================================
-- Migración 001 · Permitir entrar como invitado (inicio de sesión anónimo)
-- Pegar en: Supabase → SQL Editor → New query → Run
-- No borra ni modifica datos: solo actualiza dos funciones.
--
-- Además hay que activar en el panel:
--   Authentication → Sign In / Providers → "Allow anonymous sign-ins"
-- =====================================================================

-- Al registrarse (con correo o como invitado): crear su empresa y hacerlo dueño
create or replace function public.al_registrar_usuario()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_emp uuid;
begin
  -- Los invitados no tienen correo
  insert into public.empresas (nombre, creado_por)
  values (coalesce(nullif(trim(new.raw_user_meta_data ->> 'empresa'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Empresa de prueba'), new.id)
  returning id into v_emp;

  insert into public.miembros (empresa_id, user_id, email, nombre, rol)
  values (v_emp, new.id, new.email, nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), 'dueño');
  return new;
end;
$$;

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

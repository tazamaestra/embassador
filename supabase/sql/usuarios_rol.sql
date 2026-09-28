-- ============================================================
-- Rol en `usuarios`: solo quien tenga rol 'admin' entra al panel
-- ============================================================
-- Hasta ahora es_equipo() respondía true para cualquier fila de
-- `usuarios`. Con esto responde true solo si rol = 'admin'. El rol
-- se cambia editando esa columna ('admin' o 'customer') desde el
-- Table Editor de Supabase o con las consultas del final.
--
-- Deja como único admin a maestrataza@gmail.com; el resto de filas
-- queda en 'customer'. Ojo: volver a correrlo baja otra vez a
-- 'customer' a cualquier admin que se haya agregado después.
-- Los suscriptores entran solos como 'customer': ver usuarios_customer.sql.
--
-- Requiere finca_fotos.sql (define es_equipo()).
-- Se puede volver a correr sin romper nada.
-- ============================================================

-- ── Columna ────────────────────────────────────────────────
-- `rol` ya existe (la tabla la comparte el software de gestión) con su
-- propio check, usuarios_rol_check, que no admite 'customer'. Se amplía
-- ese check con 'customer' sin quitarle los valores que ya permitía.
-- Si hay filas con roles distintos de admin/customer, el script se
-- detiene en vez de pisarlas.
do $$
declare
  v_check text;
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'usuarios' and column_name = 'rol'
  ) then
    if exists (select 1 from public.usuarios where rol not in ('admin', 'cliente', 'customer')) then
      raise exception 'usuarios.rol ya existe con otros valores: revisarlo antes de correr este script.';
    end if;

    select pg_get_constraintdef(c.oid) into v_check
      from pg_constraint c
     where c.conrelid = 'public.usuarios'::regclass and c.conname = 'usuarios_rol_check';

    -- pg_get_constraintdef devuelve 'CHECK ((...))': se le quita el
    -- 'CHECK ' y se le suma la opción nueva.
    if v_check is not null and v_check not like '%''customer''%' then
      execute 'alter table public.usuarios drop constraint usuarios_rol_check';
      execute format(
        'alter table public.usuarios add constraint usuarios_rol_check check (%s or rol = %L)',
        regexp_replace(v_check, '^CHECK ', ''), 'customer'
      );
    end if;
  else
    alter table public.usuarios
      add column rol text not null default 'customer'
      constraint usuarios_rol_valido check (rol in ('admin', 'customer'));
  end if;
end $$;

-- ── Un solo admin ──────────────────────────────────────────
update public.usuarios u
   set rol = case
     when u.id = (select a.id from auth.users a where lower(a.email) = 'maestrataza@gmail.com')
       then 'admin'
     else 'customer'
   end;

-- Si esa cuenta no tenía fila en `usuarios`, se crea. Necesita haber
-- entrado al sitio al menos una vez (para existir en auth.users).
-- Si ya tenía fila, el update de arriba la dejó en 'admin'.
insert into public.usuarios (id, rol)
select a.id, 'admin' from auth.users a
 where lower(a.email) = 'maestrataza@gmail.com'
   and not exists (select 1 from public.usuarios u where u.id = a.id);

-- ── es_equipo() mira el rol ────────────────────────────────
create or replace function public.es_equipo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin');
$$;

-- ── Para cambiar el rol después ────────────────────────────
-- Ver quién es qué:
--   select u.id, a.email, u.rol
--     from public.usuarios u join auth.users a on a.id = u.id
--    order by u.rol, a.email;
--
-- Pasar a alguien a customer (o a admin, cambiando el valor):
--   update public.usuarios
--      set rol = 'customer'
--    where id = (select id from auth.users where lower(email) = 'correo@ejemplo.com');

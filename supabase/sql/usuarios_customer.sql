-- ============================================================
-- Suscriptores como 'customer' en `usuarios`
-- ============================================================
-- Cada vez que se crea una suscripción, el cliente queda en
-- `usuarios` con rol 'customer'. Si ya tenía fila (un admin que se
-- suscribe, por ejemplo) no se le toca el rol.
--
-- `usuarios` era la lista del equipo interno: había permisos que se
-- daban con solo tener fila ahí. Con suscriptores adentro, cada uno
-- de esos permisos tiene que mirar rol = 'admin'. Este script:
--   1. Admite 'customer' en el check de rol y pasa 'cliente' a 'customer'.
--   2. Corrige los dos permisos del repo que miraban solo la fila
--      (pedidos_embajador y confirmar_pedido_embajador).
--   3. Busca en la base cualquier otra policy o función que lea
--      `usuarios` sin mirar el rol y, si encuentra, SE DETIENE sin
--      crear el trigger: meter suscriptores ahí les daría ese acceso.
--   4. Crea el trigger y pasa a 'customer' a quienes ya se suscribieron.
--
-- Correr DESPUÉS de usuarios_rol.sql. Se puede volver a correr.
-- ============================================================

-- ── 1. 'customer' en el check ──────────────────────────────
do $$
declare
  v_check text;
begin
  select pg_get_constraintdef(c.oid) into v_check
    from pg_constraint c
   where c.conrelid = 'public.usuarios'::regclass and c.conname = 'usuarios_rol_check';

  if v_check is not null and v_check not like '%''customer''%' then
    execute 'alter table public.usuarios drop constraint usuarios_rol_check';
    execute format(
      'alter table public.usuarios add constraint usuarios_rol_check check (%s or rol = %L)',
      regexp_replace(v_check, '^CHECK ', ''), 'customer'
    );
  end if;
end $$;

update public.usuarios set rol = 'customer' where rol = 'cliente';

-- ── 2. Permisos del repo que miraban solo la fila ─────────
do $$
declare
  v_def text;
begin
  if to_regclass('public.pedidos_embajador') is not null then
    drop policy if exists "Administradores ven todos los pedidos" on public.pedidos_embajador;
    create policy "Administradores ven todos los pedidos"
      on public.pedidos_embajador for select
      using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));
  end if;

  -- Mismo cambio que en confirmar_pedido_embajador.sql, sin volver a
  -- pegar la función entera: se reescribe la definición guardada.
  for v_def in
    select pg_get_functiondef(p.oid)
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'confirmar_pedido_embajador'
  loop
    if v_def !~* '\mrol\M' then
      execute replace(
        v_def,
        'from public.usuarios u where u.id = auth.uid())',
        'from public.usuarios u where u.id = auth.uid() and u.rol = ''admin'')'
      );
    end if;
  end loop;
end $$;

-- ── 3. ¿Queda algo que dé acceso por solo estar en usuarios? ─
do $$
declare
  v_pendientes text;
begin
  select string_agg(x, E'\n  ') into v_pendientes from (
    select format('policy "%s" en %s.%s', policyname, schemaname, tablename) as x
      from pg_policies
     where concat_ws(' ', qual, with_check) ~* '\musuarios\M'
       and concat_ws(' ', qual, with_check) !~* '\mrol\M'
    union all
    select format('función %s.%s', n.nspname, p.proname)
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosrc ~* '\musuarios\M'
       and p.prosrc !~* '\mrol\M'
  ) t;

  if v_pendientes is not null then
    raise exception E'Estos permisos leen `usuarios` sin mirar el rol. Con suscriptores en esa tabla, ellos también pasarían. Agregar "and rol = ''admin''" a cada uno y volver a correr:\n  %', v_pendientes;
  end if;
end $$;

-- ── 4. El trigger ──────────────────────────────────────────
-- Arma el insert con las columnas que `usuarios` tenga (email y
-- nombre salen de `clientes`, que el alta ya llenó).
create or replace function public.registrar_customer(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email  text;
  v_nombre text;
  v_cols   text := 'id, rol';
  v_vals   text;
begin
  if exists (select 1 from public.usuarios where id = p_id) then
    return;
  end if;

  select c.email, c.nombre into v_email, v_nombre from public.clientes c where c.id = p_id;
  v_vals := format('%L, %L', p_id, 'customer');

  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'usuarios' and column_name = 'email') then
    v_cols := v_cols || ', email';
    v_vals := v_vals || format(', %L', v_email);
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'usuarios' and column_name = 'nombre') then
    v_cols := v_cols || ', nombre';
    v_vals := v_vals || format(', %L', coalesce(nullif(v_nombre, ''), v_email));
  end if;

  execute format('insert into public.usuarios (%s) values (%s) on conflict do nothing', v_cols, v_vals);
end;
$$;

-- Si marcar el rol falla, la suscripción se crea igual: queda un
-- aviso en los logs de Postgres.
create or replace function public.suscripcion_marca_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.registrar_customer(new.cliente_id);
  exception when others then
    raise warning 'No se marcó como customer a %: %', new.cliente_id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists suscripcion_marca_customer on public.suscripciones;
create trigger suscripcion_marca_customer
  after insert on public.suscripciones
  for each row execute function public.suscripcion_marca_customer();

-- Nadie las llama desde el navegador.
revoke all on function public.registrar_customer(uuid) from public, anon, authenticated;
revoke all on function public.suscripcion_marca_customer() from public, anon, authenticated;

-- Los que ya se suscribieron antes del trigger.
select public.registrar_customer(s.cliente_id)
  from (select distinct cliente_id from public.suscripciones) s;

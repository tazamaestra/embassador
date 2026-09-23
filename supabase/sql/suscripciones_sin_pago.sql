-- ============================================================
-- Suscripción sin pasarela + libras en el envío
--
-- Dos cosas:
--   1. `suscripcion_envios` gana `libras`, que es lo que hay que
--      tostar y empacar. Antes solo guardaba el total en pesos.
--   2. El servidor necesita poder escribir en `pedidos`, que es la
--      tabla que lee el software de gestión. Su RLS no deja
--      insertar ni al cliente ni al anónimo, y así debe seguir:
--      quien escribe es el route handler con la service key, que
--      ignora RLS. Por eso aquí NO se abre ninguna policy nueva.
--
-- Correr DESPUÉS de suscripciones_niveles.sql.
-- Es idempotente: se puede volver a correr sin romper nada.
-- ============================================================

alter table public.suscripcion_envios
  add column if not exists libras numeric not null default 0;

comment on column public.suscripcion_envios.libras is
  'Libras que van en el envío, incluida la de regalo si toca.';

-- ── Comprobación ───────────────────────────────────────────
-- `pedidos` la crea el software de gestión, no este repo. Si no
-- existe, la suscripción se guarda igual pero el pedido no se
-- carga, y el route handler lo deja anotado en el log.

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'pedidos'
  ) then
    raise warning 'La tabla public.pedidos no existe: los pedidos de suscripción no se van a registrar.';
  end if;
end $$;

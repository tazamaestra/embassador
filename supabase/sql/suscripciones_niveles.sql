-- ============================================================
-- Migración: de planes por frecuencia a niveles por libras
--
-- El modelo cambió. Antes una suscripción era "un café + una
-- frecuencia" y el precio salía del catálogo. Ahora es "un nivel
-- (1, 2 o 3 libras) + una frecuencia", con precio fijo mensual y
-- envío incluido, más tres ejes de preferencia (molienda, método
-- y perfil) y un prepago opcional.
--
-- Columnas nuevas, no destructivas: `plan_id`, `producto_slug` y
-- `cantidad` se quedan por si hay filas viejas que auditar. El
-- código ya no las lee. Cuando confirmes que no queda nada vivo,
-- se pueden borrar con el bloque comentado del final.
--
-- Correr DESPUÉS de suscripciones.sql.
-- Es idempotente: se puede volver a correr sin romper nada.
-- ============================================================

-- ── Suscripciones ──────────────────────────────────────────

alter table public.suscripciones
  add column if not exists nivel_id       text,
  add column if not exists frecuencia_id  text,
  add column if not exists prepago_id     text not null default 'mes-a-mes',
  add column if not exists molienda       text not null default 'grano',
  add column if not exists metodo         text not null default 'filtro',
  add column if not exists perfil         text not null default 'balanceado';

-- Traducción de lo que ya existía: toda suscripción vieja era de
-- una bolsa por envío, que es el nivel de 1 libra. La frecuencia
-- se conserva tal cual (quincenal o mensual).
update public.suscripciones
   set nivel_id = coalesce(nivel_id, case
         when cantidad >= 3 then '3-libras'
         when cantidad = 2  then '2-libras'
         else '1-libra'
       end),
       frecuencia_id = coalesce(frecuencia_id, case
         when plan_id = 'quincenal' then 'mensual'
         else coalesce(plan_id, 'mensual')
       end)
 where nivel_id is null or frecuencia_id is null;

-- Ya con datos, se exigen.
alter table public.suscripciones
  alter column nivel_id set not null,
  alter column frecuencia_id set not null;

-- Las columnas viejas dejan de ser obligatorias para que los
-- insert nuevos, que ya no las mandan, no fallen.
alter table public.suscripciones
  alter column plan_id drop not null,
  alter column producto_slug drop not null;

-- ── Envíos ─────────────────────────────────────────────────
-- El historial del panel muestra qué café llegó cada mes y si
-- ese envío llevó la libra de regalo. `bonos_aplicados` se queda
-- para poder auditar los bonos del modelo anterior.

alter table public.suscripcion_envios
  add column if not exists cafe    text not null default '',
  add column if not exists regalo  boolean not null default false;

-- ── Limpieza, cuando estés listo ───────────────────────────
-- Revisa primero que no quede nada leyendo estas columnas:
--   select count(*) from public.suscripciones where plan_id is not null;
--
-- alter table public.suscripciones
--   drop column plan_id,
--   drop column producto_slug,
--   drop column cantidad;
-- alter table public.suscripcion_envios
--   drop column bonos_aplicados;

-- ============================================================
-- Limpieza del proyecto de Supabase de INVENTARIO
--
-- Quita lo que la web de suscripciones dejó en la base del
-- inventario cuando las dos compartían proyecto. Correr en el SQL
-- Editor del proyecto de inventario, y SOLO cuando la web ya esté
-- funcionando contra su proyecto nuevo (supabase/esquema.sql).
--
-- BORRA DATOS y no se puede deshacer. Antes de correrlo:
--   Database → Backups, o descargar un respaldo.
--
-- Va por pasos. El 1 y el 2 son seguros de correr de una. El 3 y el
-- 4 tocan tablas que también usa el inventario: primero se mira con
-- los select y después se decide.
-- ============================================================

-- ── 1. Registro de clientes de la web ──────────────────────
-- Cada cuenta nueva (también las de inventario) creaba una fila en
-- `clientes` desde este trigger. Se quita.

drop trigger if exists crear_cliente_al_registrarse on auth.users;
drop function if exists public.crear_cliente_al_registrarse();

-- ── 2. Tablas y fotos de la web ────────────────────────────
-- Ninguna la usa el inventario. Con cascade caen también sus índices,
-- llaves y policies.

drop table if exists
  public.wompi_eventos,
  public.suscripcion_eventos,
  public.cancelaciones,
  public.suscripcion_envios,
  public.cobros,
  public.suscripciones,
  public.metodos_pago,
  public.pedidos_unicos,
  public.direcciones,
  public.config_suscripcion,
  public.planes,
  public.prepagos,
  public.perfiles,
  public.moliendas,
  public.frecuencias,
  public.finca_fotos,
  public.cafe_ediciones
cascade;

drop policy if exists fincas_lectura_publica  on storage.objects;
drop policy if exists fincas_escritura_equipo on storage.objects;
drop policy if exists cafes_lectura_publica   on storage.objects;
drop policy if exists cafes_escritura_equipo  on storage.objects;

-- Sin `cascade`: si algo del inventario la usa, esto falla y avisa en
-- vez de llevárselo por delante.
drop function if exists public.es_equipo();

-- El bucket `fincas` no se puede borrar por SQL: Storage → fincas →
-- vaciar y borrar el bucket.

-- ── 3. `clientes` (tabla del inventario) ───────────────────
-- La web le agregó tres columnas del quiz y le metió una fila por cada
-- cuenta que se registró en la web. Las columnas sobran:

alter table public.clientes
  drop column if exists quiz_respuestas,
  drop column if exists quiz_recomendacion,
  drop column if exists quiz_respondido_en;

-- Las filas que llegaron por el registro de la web tienen el mismo id
-- que la cuenta. Revisarlas antes de borrar nada:
--
--   select c.id, c.nombre, c.email, c.tipo, c.creado_en
--     from public.clientes c
--     join auth.users a on a.id = c.id
--    order by c.creado_en;
--
-- Si ninguna es un cliente real del inventario:
--
--   delete from public.clientes c using auth.users a where a.id = c.id;

-- ── 4. `usuarios` (tabla del inventario) ───────────────────
-- La web cambió tres cosas aquí:
--   · amplió el check de `rol` con 'cliente' y lo puso por defecto;
--   · handle_new_user() escribe rol 'cliente' a cada cuenta nueva;
--   · usuarios_rol.sql dejó a TODOS en 'cliente' menos
--     maestrataza@gmail.com. Si en el inventario había otros admins,
--     perdieron el rol.
--
-- Ver quién es qué:
--
--   select u.id, u.email, u.nombre, u.rol, u.creado_en
--     from public.usuarios u
--    order by u.rol, u.email;
--
-- Devolver el rol a quien sea del equipo de inventario (ajustar el rol
-- al que use el inventario):
--
--   update public.usuarios set rol = 'admin' where lower(email) = 'correo@ejemplo.com';
--
-- Las filas 'cliente' que solo existen porque alguien se registró en
-- la web se pueden borrar, y con ellas la cuenta, si no usa el
-- inventario:
--
--   delete from public.usuarios where rol = 'cliente';
--
-- Cómo queda el registro de cuentas nuevas y el default de `rol` es
-- decisión del inventario: este repo ya no lo toca.

-- ── 5. Embajadores ─────────────────────────────────────────
-- La web ya no tiene programa de embajadores. Estas dos piezas las creó
-- este repo; `embajadores`, `productos`, `ventas`, `lotes`… son del
-- inventario y no se tocan. Si el inventario no usa pedidos_embajador:
--
--   drop function if exists public.confirmar_pedido_embajador(uuid);
--   drop table if exists public.pedidos_embajador;

-- ── 6. Pedidos SUB-… ───────────────────────────────────────
-- Los pedidos que la web cargaba en `pedidos` se quedan: son historia
-- del inventario. Para verlos:
--
--   select * from public.pedidos where numero like 'SUB-%' order by fecha;

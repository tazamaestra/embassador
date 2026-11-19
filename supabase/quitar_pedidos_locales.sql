-- ============================================================
-- Quita el respaldo local de pedidos (tabla pedidos_tienda)
--
-- Desde noviembre de 2026 los pedidos viven SOLO en el inventario
-- (docs/contrato-api-inventario.md). Correr en el SQL Editor del
-- proyecto de Supabase de la WEB, después de desplegar el código
-- que ya no usa la tabla.
--
-- BORRA DATOS y no se puede deshacer. Primero mira lo que hay y,
-- si algo sirve, pásalo al inventario a mano:
--
--   select referencia, creado_en, nombre, email, total_cop, estado, items
--   from public.pedidos_tienda order by creado_en desc;
-- ============================================================

drop table if exists public.pedidos_tienda cascade;

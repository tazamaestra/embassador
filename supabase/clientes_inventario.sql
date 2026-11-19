-- ============================================================
-- Vínculo de cada cliente con su cliente del inventario (por ID)
--
-- Correr UNA vez en el SQL Editor del proyecto de Supabase de la WEB.
-- Es idempotente.
--
-- La web guarda el ID del cliente en el inventario. Con eso lee sus
-- compras y pedidos, y toma su NIT, sin depender de que el NIT o el
-- nombre coincidan. Se vincula desde /admin → ficha del cliente →
-- "Cliente en el inventario". Si el NIT ya coincide, se vincula solo.
-- ============================================================

alter table public.clientes
  add column if not exists inventario_id uuid unique;

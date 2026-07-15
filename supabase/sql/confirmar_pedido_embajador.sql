-- ============================================================
-- Función: confirmar_pedido_embajador(p_embajador_id uuid)
--
-- Convierte TODOS los pedidos pendientes de un embajador
-- (tabla pedidos_embajador) en una venta real:
--   1. Por cada línea, busca el lote más antiguo (FIFO) del
--      producto con stock suficiente en stock_lote.
--   2. Descuenta ese stock.
--   3. Crea la venta (cabecera) y un venta_consumo por línea,
--      con el costo real congelado desde lotes.costo_unitario_lb.
--   4. Borra las filas ya confirmadas de pedidos_embajador.
--
-- Si cualquier línea no tiene stock suficiente, TODA la
-- confirmación se revierte (no se descuenta stock a medias).
--
-- Solo puede ejecutarla alguien presente en la tabla `usuarios`
-- (equipo interno) — se valida con auth.uid() dentro de la
-- función, independientemente de quién la invoque.
--
-- Mapeo actual sitio web -> producto real (ver lib/pedidos.ts):
--   afrutado -> TazaMaestra Natural (df499576-64ce-49f1-8dc2-44efa6cdb0d5)
--   dulce    -> TazaMaestra Lavado  (a69a196c-dd8b-4ab1-b745-f24f339113f7)
-- ============================================================

create sequence if not exists public.ventas_numero_seq;

create or replace function public.confirmar_pedido_embajador(p_embajador_id uuid)
returns public.ventas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta         public.ventas;
  v_lote_id       uuid;
  v_costo_lb      numeric;
  v_libras_total  numeric := 0;
  v_ingreso_total numeric := 0;
  v_costo_total   numeric := 0;
  r               record;
begin
  if not exists (select 1 from public.usuarios u where u.id = auth.uid()) then
    raise exception 'No autorizado: solo el equipo interno puede confirmar pedidos.';
  end if;

  if not exists (select 1 from public.embajadores e where e.id = p_embajador_id) then
    raise exception 'Embajador % no existe.', p_embajador_id;
  end if;

  if not exists (select 1 from public.pedidos_embajador where embajador_id = p_embajador_id) then
    raise exception 'El embajador % no tiene pedidos pendientes.', p_embajador_id;
  end if;

  -- Cabecera provisional; los totales se completan al final del loop
  insert into public.ventas (numero, cliente, canal, notas, libras_total, ingreso_total, costo_total, utilidad_total, creado_por)
  select
    'WEB-' || lpad(nextval('public.ventas_numero_seq')::text, 6, '0'),
    e.nombre,
    'web-embajador',
    'Pedido web · código de referido ' || e.codigo_referido,
    0, 0, 0, 0,
    auth.uid()
  from public.embajadores e
  where e.id = p_embajador_id
  returning * into v_venta;

  for r in
    select * from public.pedidos_embajador
    where embajador_id = p_embajador_id
  loop
    if r.producto_id is null then
      raise exception 'El pedido de "%" no tiene producto_id asignado; no se puede confirmar.', r.producto_nombre;
    end if;

    v_lote_id := null;

    select l.id, l.costo_unitario_lb
      into v_lote_id, v_costo_lb
    from public.lotes l
    join public.stock_lote s on s.lote_id = l.id
    where l.producto_id = r.producto_id
      and s.libras_disponibles >= r.libras
    order by l.creado_en asc
    limit 1;

    if v_lote_id is null then
      raise exception 'No hay stock suficiente para "%": se necesitan % lb.', r.producto_nombre, r.libras;
    end if;

    update public.stock_lote
      set libras_disponibles = libras_disponibles - r.libras,
          actualizado_en = now()
      where lote_id = v_lote_id;

    insert into public.venta_consumo (venta_id, lote_id, libras_consumidas, costo_unitario_congelado, pvp_aplicado, utilidad_subtotal)
    values (
      v_venta.id,
      v_lote_id,
      r.libras,
      v_costo_lb,
      r.precio_compra_lb,
      (r.precio_compra_lb - v_costo_lb) * r.libras
    );

    v_libras_total  := v_libras_total + r.libras;
    v_ingreso_total := v_ingreso_total + (r.precio_compra_lb * r.libras);
    v_costo_total   := v_costo_total + (v_costo_lb * r.libras);
  end loop;

  update public.ventas
    set libras_total   = v_libras_total,
        ingreso_total  = v_ingreso_total,
        costo_total    = v_costo_total,
        utilidad_total = v_ingreso_total - v_costo_total
    where id = v_venta.id
    returning * into v_venta;

  delete from public.pedidos_embajador where embajador_id = p_embajador_id;

  return v_venta;
end;
$$;

revoke all on function public.confirmar_pedido_embajador(uuid) from public;
grant execute on function public.confirmar_pedido_embajador(uuid) to authenticated;

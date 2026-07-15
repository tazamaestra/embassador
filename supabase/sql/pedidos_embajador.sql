-- ============================================================
-- Tabla: pedidos_embajador
-- Carrito/pedido web del embajador logueado: una fila por
-- producto, con la utilidad estimada por libra (precio de venta
-- al detal - precio de compra mayorista) y la utilidad total.
-- ============================================================

create table public.pedidos_embajador (
  id                uuid primary key default uuid_generate_v4(),
  embajador_id      uuid not null references public.embajadores(id) on delete cascade,
  producto_id       uuid references public.productos(id) on delete set null,
  producto_slug     text not null,
  producto_nombre   text not null,
  libras            numeric not null check (libras > 0),
  precio_compra_lb  numeric not null check (precio_compra_lb >= 0),
  precio_venta_lb   numeric not null check (precio_venta_lb >= 0),
  utilidad_lb       numeric generated always as (precio_venta_lb - precio_compra_lb) stored,
  utilidad_total    numeric generated always as (libras * (precio_venta_lb - precio_compra_lb)) stored,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  constraint pedidos_embajador_embajador_producto_key unique (embajador_id, producto_slug)
);

comment on table public.pedidos_embajador is
  'Carrito/pedido web persistido de cada embajador: una fila por producto, con la utilidad estimada (venta al detal - compra mayorista) por libra y total.';

create index pedidos_embajador_embajador_id_idx on public.pedidos_embajador (embajador_id);

-- Mantener actualizado_en al día en cada UPDATE
create or replace function public.pedidos_embajador_set_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger trg_pedidos_embajador_actualizado_en
before update on public.pedidos_embajador
for each row execute function public.pedidos_embajador_set_actualizado_en();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.pedidos_embajador enable row level security;

-- El embajador solo ve, crea, actualiza y borra sus propias filas
create policy "Embajadores ven sus propios pedidos"
  on public.pedidos_embajador for select
  using (auth.uid() = embajador_id);

create policy "Embajadores insertan sus propios pedidos"
  on public.pedidos_embajador for insert
  with check (auth.uid() = embajador_id);

create policy "Embajadores actualizan sus propios pedidos"
  on public.pedidos_embajador for update
  using (auth.uid() = embajador_id)
  with check (auth.uid() = embajador_id);

create policy "Embajadores eliminan sus propios pedidos"
  on public.pedidos_embajador for delete
  using (auth.uid() = embajador_id);

-- Los usuarios internos (tabla usuarios = admins/asesores) ven todo,
-- para poder confirmar disponibilidad y pasar el pedido a ventas.
create policy "Administradores ven todos los pedidos"
  on public.pedidos_embajador for select
  using (exists (select 1 from public.usuarios u where u.id = auth.uid()));

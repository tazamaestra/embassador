-- ============================================================
-- Migración: de suscripciones a tienda + clientes con capacitación
--
-- Para la base que YA existe (la que tenía suscripciones). Correr UNA vez
-- en el SQL Editor, completa. Va en una transacción: si algo falla, no
-- queda a medias.
--
-- Qué hace:
--   1. Borra las tablas de suscripción y lo que solo servía a ellas.
--   2. Deja `clientes` con los campos nuevos (negocio, NIT/cédula…).
--   3. Crea `capacitaciones` y `pedidos_tienda` (no toca una tabla `pedidos`
--      vieja, si existe).
--   4. Cambia los precios de suscriptor de cafe_ediciones por los del
--      cuarterón (y descarta los valores viejos: no son el mismo precio).
--   5. Rehace las policies.
--
-- Lo que NO toca: equipo, wompi_eventos, solicitudes_muestra,
-- finca_fotos, cafe_ediciones (salvo el punto 4), Storage, las cuentas.
-- ============================================================

begin;

-- ── 1. Fuera las suscripciones ─────────────────────────────
-- Orden: primero lo que depende de otras tablas.

drop table if exists public.suscripcion_eventos  cascade;
drop table if exists public.cancelaciones        cascade;
drop table if exists public.suscripcion_envios   cascade;
drop table if exists public.cobros               cascade;
drop table if exists public.suscripciones        cascade;
drop table if exists public.metodos_pago         cascade;
drop table if exists public.pedidos_unicos       cascade;
drop table if exists public.direcciones          cascade;
drop table if exists public.frecuencias          cascade;
drop table if exists public.planes               cascade;
drop table if exists public.moliendas            cascade;
drop table if exists public.perfiles             cascade;
drop table if exists public.prepagos             cascade;
drop table if exists public.config_suscripcion   cascade;

-- ── 2. Clientes ────────────────────────────────────────────

alter table public.clientes drop column if exists quiz_respuestas;
alter table public.clientes drop column if exists quiz_recomendacion;
alter table public.clientes drop column if exists quiz_respondido_en;

alter table public.clientes add column if not exists negocio    text not null default '';
alter table public.clientes add column if not exists documento  text;
alter table public.clientes add column if not exists ciudad     text not null default '';
alter table public.clientes add column if not exists notas      text not null default '';
alter table public.clientes add column if not exists activo     boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clientes_documento_key') then
    alter table public.clientes add constraint clientes_documento_key unique (documento);
  end if;
end $$;

-- El trigger ya no lee el teléfono del registro (ya no hay registro público).
create or replace function public.crear_cliente_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clientes (id, email, nombre)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'nombre', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── 3. Capacitaciones y pedidos ────────────────────────────

create table if not exists public.capacitaciones (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.clientes (id) on delete cascade,
  fecha           date not null,
  horas           numeric(4, 1) not null check (horas > 0 and horas <= 12),
  tema            text not null,
  notas           text not null default '',
  registrada_por  uuid references auth.users (id) on delete set null,
  creado_en       timestamptz not null default now()
);
create index if not exists capacitaciones_cliente_idx on public.capacitaciones (cliente_id, fecha desc);

create table if not exists public.pedidos_tienda (
  id                 uuid primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  cliente_id         uuid references public.clientes (id) on delete set null,
  nombre             text not null,
  email              text not null,
  telefono           text not null,
  linea              text not null,
  ciudad             text not null,
  departamento       text not null,
  notas              text not null default '',
  items              jsonb not null,
  total_cop          integer not null check (total_cop > 0),
  estado             text not null default 'pendiente'
                     check (estado in ('pendiente', 'pagado', 'fallido', 'enviado', 'cancelado')),
  referencia         text not null unique,
  wompi_transaccion  text
);
create index if not exists pedidos_tienda_estado_idx on public.pedidos_tienda (estado, creado_en desc);
create index if not exists pedidos_tienda_cliente_idx on public.pedidos_tienda (cliente_id);

-- Muestras: por si no se había corrido su bloque.
create table if not exists public.solicitudes_muestra (
  id              uuid primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  nombre          text not null,
  telefono        text not null,
  email           text,
  ciudad          text not null,
  direccion       text not null,
  tipo            text not null default 'persona' check (tipo in ('persona', 'negocio')),
  negocio         text,
  cafe            text not null,
  mensaje         text,
  estado          text not null default 'pendiente'
                  check (estado in ('pendiente', 'contactado', 'enviada', 'compro', 'descartada')),
  notas           text,
  actualizado_en  timestamptz not null default now()
);
create index if not exists solicitudes_muestra_estado_idx on public.solicitudes_muestra (estado, creado_en desc);
create index if not exists solicitudes_muestra_telefono_idx on public.solicitudes_muestra (telefono);

-- ── 4. Precios del cuarterón en cafe_ediciones ─────────────

alter table public.cafe_ediciones drop column if exists precio_suscriptor_cop;
alter table public.cafe_ediciones drop column if exists precio_suscriptor_usd;
alter table public.cafe_ediciones add column if not exists precio_negocio_cop integer
  check (precio_negocio_cop is null or precio_negocio_cop > 0);
alter table public.cafe_ediciones add column if not exists precio_negocio_usd numeric(8, 2)
  check (precio_negocio_usd is null or precio_negocio_usd > 0);

-- ── 5. RLS ─────────────────────────────────────────────────

alter table public.equipo               enable row level security;
alter table public.clientes             enable row level security;
alter table public.capacitaciones       enable row level security;
alter table public.pedidos_tienda              enable row level security;
alter table public.wompi_eventos        enable row level security;
alter table public.solicitudes_muestra  enable row level security;
alter table public.finca_fotos          enable row level security;
alter table public.cafe_ediciones       enable row level security;

-- El cliente solo lee lo suyo (antes podía editar su ficha).
drop policy if exists clientes_propio on public.clientes;
drop policy if exists clientes_propio_lectura on public.clientes;
create policy clientes_propio_lectura on public.clientes
  for select using (auth.uid() = id);

drop policy if exists capacitaciones_propias_lectura on public.capacitaciones;
create policy capacitaciones_propias_lectura on public.capacitaciones
  for select using (auth.uid() = cliente_id);

drop policy if exists pedidos_tienda_propios_lectura on public.pedidos_tienda;
create policy pedidos_tienda_propios_lectura on public.pedidos_tienda
  for select using (auth.uid() = cliente_id);

do $$
declare t text;
begin
  foreach t in array array['clientes', 'capacitaciones', 'pedidos_tienda', 'solicitudes_muestra',
                           'finca_fotos', 'cafe_ediciones']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_equipo', t);
    execute format('create policy %I on public.%I for all using (public.es_equipo()) with check (public.es_equipo())', t || '_equipo', t);
  end loop;
end $$;

drop policy if exists finca_fotos_lectura on public.finca_fotos;
create policy finca_fotos_lectura on public.finca_fotos for select using (true);
drop policy if exists cafe_ediciones_lectura on public.cafe_ediciones;
create policy cafe_ediciones_lectura on public.cafe_ediciones for select using (true);

commit;

-- Revisión. Las de la web son: capacitaciones, cafe_ediciones, clientes,
-- equipo, finca_fotos, pedidos_tienda, solicitudes_muestra, wompi_eventos.
-- Si salen otras (por ejemplo `pedidos`), son de antes de separar la web
-- del inventario: este script no las toca.
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

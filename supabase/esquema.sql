-- ============================================================
-- Taza Maestra · Tienda y clientes — esquema completo
--
-- Proyecto de Supabase PROPIO de esta web, separado del software de
-- inventario. Las compras de los clientes NO viven aquí: se consultan a la
-- API del inventario con el NIT o cédula (lib/servidor/inventario.ts).
--
-- Tablas:
--   equipo                 Quién entra al panel /admin
--   clientes               Ficha de cada cliente (la cuenta la crea el equipo)
--   capacitaciones         Horas de capacitación ya dadas a cada cliente
--   pedidos_tienda         Compras hechas desde el carrito de la tienda
--   wompi_eventos          Eventos del webhook de pagos (idempotencia)
--   solicitudes_muestra    Muestras gratis de 100 g pedidas en la tienda
--   finca_fotos            Foto de la finca de cada café
--   cafe_ediciones         Lo que el panel cambia de cada café
--
-- Para una base vacía. Es idempotente: se puede volver a correr.
-- Para pasar una base que ya tenía suscripciones, usar
-- supabase/migracion_clientes.sql.
-- ============================================================

-- ── Equipo ─────────────────────────────────────────────────

create table if not exists public.equipo (
  id         uuid primary key references auth.users (id) on delete cascade,
  rol        text not null default 'admin' check (rol in ('admin')),
  creado_en  timestamptz not null default now()
);

create or replace function public.es_equipo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.equipo e where e.id = auth.uid() and e.rol = 'admin');
$$;

-- ── Clientes ───────────────────────────────────────────────
-- La cuenta (auth.users) la crea el equipo desde el panel; esta es su
-- ficha. `documento` (NIT o cédula) es la llave para leer sus compras en
-- el inventario.

create table if not exists public.clientes (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  nombre      text not null default '',
  telefono    text not null default '',
  negocio     text not null default '',
  documento   text unique,
  ciudad      text not null default '',
  notas       text not null default '',
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- Si la cuenta se crea desde el dashboard de Supabase (y no desde el
-- panel), igual nace su ficha. El panel la completa después.
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

drop trigger if exists crear_cliente_al_registrarse on auth.users;
create trigger crear_cliente_al_registrarse
  after insert on auth.users
  for each row execute function public.crear_cliente_al_registrarse();

-- ── Capacitaciones ─────────────────────────────────────────
-- Cada 3 cuarterones comprados dan 1 hora (lib/capacitacion.ts). Aquí se
-- registran las horas que ya se usaron.

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

-- ── Pedidos de la tienda ───────────────────────────────────
-- Compra desde el carrito, con o sin cuenta. `items` guarda cada línea con
-- el precio del momento: {cafe, nombre, presentacion, pesoG, cantidad, precioCop}.

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

-- ── Webhook de Wompi ───────────────────────────────────────
-- Wompi reintenta el mismo evento: el checksum lo identifica.

create table if not exists public.wompi_eventos (
  id              uuid primary key default gen_random_uuid(),
  checksum        text not null unique,
  evento          text not null,
  transaccion_id  text,
  estado          text,
  referencia      text,
  payload         jsonb not null,
  recibido_en     timestamptz not null default now()
);

-- ── Muestras gratis (100 g, el cliente paga el envío) ──────

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

-- ── Fotos de finca y ediciones de café ─────────────────────

create table if not exists public.finca_fotos (
  producto_slug    text primary key,
  storage_path     text not null,
  ancho            integer not null check (ancho > 0),
  alto             integer not null check (alto > 0),
  bytes            integer not null check (bytes > 0),
  alt_es           text not null default '',
  alt_en           text not null default '',
  actualizada_en   timestamptz not null default now(),
  actualizada_por  uuid references auth.users (id) on delete set null
);

-- Lo que el equipo cambia de un café desde el panel. null = se usa el
-- valor de data/content.json. "negocio" = el cuarterón de 2.250 g.
create table if not exists public.cafe_ediciones (
  producto_slug        text primary key,
  nombre               text check (nombre is null or length(trim(nombre)) between 1 and 60),
  precio_cop           integer check (precio_cop is null or precio_cop > 0),
  precio_negocio_cop   integer check (precio_negocio_cop is null or precio_negocio_cop > 0),
  precio_usd           numeric(8, 2) check (precio_usd is null or precio_usd > 0),
  precio_negocio_usd   numeric(8, 2) check (precio_negocio_usd is null or precio_negocio_usd > 0),
  notas_es             text,
  notas_en             text,
  proposito_es         text,
  proposito_en         text,
  foto_path            text,
  foto_ancho           integer check (foto_ancho is null or foto_ancho > 0),
  foto_alto            integer check (foto_alto is null or foto_alto > 0),
  actualizada_en       timestamptz not null default now(),
  actualizada_por      uuid references auth.users (id) on delete set null
);

-- ── RLS ────────────────────────────────────────────────────
-- Toda escritura pasa por los route handlers de app/api con la service
-- key, que ignora RLS. Las policies son la segunda puerta.

alter table public.equipo               enable row level security;
alter table public.clientes             enable row level security;
alter table public.capacitaciones       enable row level security;
alter table public.pedidos_tienda              enable row level security;
alter table public.wompi_eventos        enable row level security;
alter table public.solicitudes_muestra  enable row level security;
alter table public.finca_fotos          enable row level security;
alter table public.cafe_ediciones       enable row level security;

-- El cliente lee su ficha, sus capacitaciones y sus pedidos. No escribe.
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

-- El equipo, todo.
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

-- Catálogo: lectura pública (la tienda muestra precios y fotos).
drop policy if exists finca_fotos_lectura on public.finca_fotos;
create policy finca_fotos_lectura on public.finca_fotos for select using (true);
drop policy if exists cafe_ediciones_lectura on public.cafe_ediciones;
create policy cafe_ediciones_lectura on public.cafe_ediciones for select using (true);

-- equipo y wompi_eventos: sin policies. Solo la service key las toca.

-- ── Storage ────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('fincas', 'fincas', true, 3145728, array['image/webp', 'image/jpeg', 'image/png']),
  ('cafes',  'cafes',  true, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists fincas_lectura_publica on storage.objects;
create policy fincas_lectura_publica on storage.objects
  for select using (bucket_id = 'fincas');

drop policy if exists fincas_escritura_equipo on storage.objects;
create policy fincas_escritura_equipo on storage.objects
  for all
  using (bucket_id = 'fincas' and public.es_equipo())
  with check (bucket_id = 'fincas' and public.es_equipo());

drop policy if exists cafes_lectura_publica on storage.objects;
create policy cafes_lectura_publica on storage.objects
  for select using (bucket_id = 'cafes');

drop policy if exists cafes_escritura_equipo on storage.objects;
create policy cafes_escritura_equipo on storage.objects
  for all
  using (bucket_id = 'cafes' and public.es_equipo())
  with check (bucket_id = 'cafes' and public.es_equipo());

-- ── Dar acceso al panel ────────────────────────────────────
-- Crear la cuenta en Authentication → Users → Add user (con Auto Confirm),
-- y después:
--
--   insert into public.equipo (id)
--   select id from auth.users where lower(email) = 'maestrataza@gmail.com'
--   on conflict (id) do nothing;

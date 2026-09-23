-- ============================================================
-- Suscripciones de Taza Maestra
--
-- Tablas nuevas. No toca `embajadores`, `pedidos_embajador`,
-- `productos`, `lotes` ni `ventas`: el programa de embajadores
-- queda dormido detrás de FEATURE_AMBASSADORS, no borrado.
--
-- Correr una vez contra el proyecto de Supabase.
-- Es idempotente: se puede volver a correr sin romper nada.
-- ============================================================

-- ── Clientes ───────────────────────────────────────────────
-- Un cliente es cualquiera que entra con su correo. El acceso
-- es sin contraseña (código de 6 dígitos), así que la fila se
-- crea la primera vez que el usuario confirma su código.

create table if not exists public.clientes (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  nombre     text not null default '',
  telefono   text not null default '',
  creado_en  timestamptz not null default now()
);

-- ── Direcciones ────────────────────────────────────────────
-- Guardadas para autocompletar el checkout en la siguiente compra.

create table if not exists public.direcciones (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes (id) on delete cascade,
  nombre        text not null,
  telefono      text not null,
  linea         text not null,
  ciudad        text not null,
  departamento  text not null,
  notas         text not null default '',
  es_principal  boolean not null default true,
  creada_en     timestamptz not null default now()
);

create index if not exists direcciones_cliente_idx
  on public.direcciones (cliente_id);

-- Una sola dirección principal por cliente.
create unique index if not exists direcciones_principal_unica
  on public.direcciones (cliente_id)
  where es_principal;

-- ── Suscripciones ──────────────────────────────────────────
-- `plan_id` y `producto_slug` son texto a propósito: los planes
-- y el catálogo viven en data/suscripcion.json y data/content.json,
-- que es donde se configuran precios, descuentos y bonos.
--
-- `estado`:
--   pendiente → creada, esperando que Wompi confirme el primer pago
--   activa    → cobrando y enviando
--   pausada   → sin cobros ni envíos, se puede reanudar
--   cancelada → terminal

create table if not exists public.suscripciones (
  id                        uuid primary key default gen_random_uuid(),
  cliente_id                uuid not null references public.clientes (id) on delete cascade,
  plan_id                   text not null,
  producto_slug             text not null,
  cantidad                  integer not null default 1 check (cantidad > 0),
  estado                    text not null default 'pendiente'
                            check (estado in ('pendiente','activa','pausada','cancelada')),
  proximo_envio             date not null,
  envios_hechos             integer not null default 0 check (envios_hechos >= 0),
  envios_saltados           integer not null default 0 check (envios_saltados >= 0),
  direccion_id              uuid references public.direcciones (id) on delete set null,
  -- Fuente de pago tokenizada de Wompi, para cobrar los envíos siguientes.
  wompi_payment_source_id   text,
  wompi_referencia          text unique,
  creada_en                 timestamptz not null default now(),
  pausada_en                timestamptz,
  cancelada_en              timestamptz
);

create index if not exists suscripciones_cliente_idx
  on public.suscripciones (cliente_id);

-- Para el proceso que cobra los envíos del día.
create index if not exists suscripciones_por_cobrar_idx
  on public.suscripciones (proximo_envio)
  where estado = 'activa';

-- ── Envíos ─────────────────────────────────────────────────
-- Un registro por envío programado. `bonos_aplicados` guarda los
-- ids de data/suscripcion.json que se activaron en ese envío
-- (bolsa-extra, aniversario), para poder auditar qué se regaló.

create table if not exists public.suscripcion_envios (
  id                uuid primary key default gen_random_uuid(),
  suscripcion_id    uuid not null references public.suscripciones (id) on delete cascade,
  numero            integer not null check (numero > 0),
  fecha_programada  date not null,
  estado            text not null default 'programado'
                    check (estado in ('programado','saltado','enviado','cobrado')),
  bonos_aplicados   jsonb not null default '[]'::jsonb,
  total_cop         numeric not null default 0,
  creado_en         timestamptz not null default now(),
  unique (suscripcion_id, numero)
);

create index if not exists suscripcion_envios_suscripcion_idx
  on public.suscripcion_envios (suscripcion_id);

-- ── Compras únicas ─────────────────────────────────────────
-- Quien no quiere suscribirse compra una bolsa suelta. Mismo
-- checkout, misma dirección, sin cobros siguientes.

create table if not exists public.pedidos_unicos (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references public.clientes (id) on delete cascade,
  producto_slug     text not null,
  cantidad          integer not null default 1 check (cantidad > 0),
  total_cop         numeric not null,
  estado            text not null default 'pendiente'
                    check (estado in ('pendiente','pagado','fallido')),
  direccion_id      uuid references public.direcciones (id) on delete set null,
  wompi_referencia  text unique,
  creado_en         timestamptz not null default now()
);

create index if not exists pedidos_unicos_cliente_idx
  on public.pedidos_unicos (cliente_id);

-- ── RLS ────────────────────────────────────────────────────
-- Cada cliente ve y edita solo lo suyo.

alter table public.clientes           enable row level security;
alter table public.direcciones        enable row level security;
alter table public.suscripciones      enable row level security;
alter table public.suscripcion_envios enable row level security;
alter table public.pedidos_unicos     enable row level security;

drop policy if exists clientes_propio on public.clientes;
create policy clientes_propio on public.clientes
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists direcciones_propias on public.direcciones;
create policy direcciones_propias on public.direcciones
  for all using (auth.uid() = cliente_id) with check (auth.uid() = cliente_id);

drop policy if exists suscripciones_propias on public.suscripciones;
create policy suscripciones_propias on public.suscripciones
  for all using (auth.uid() = cliente_id) with check (auth.uid() = cliente_id);

drop policy if exists pedidos_unicos_propios on public.pedidos_unicos;
create policy pedidos_unicos_propios on public.pedidos_unicos
  for all using (auth.uid() = cliente_id) with check (auth.uid() = cliente_id);

-- Los envíos son de solo lectura para el cliente: los crea y actualiza
-- el servidor (route handler del webhook) con la service key, que
-- ignora RLS.
drop policy if exists envios_propios_lectura on public.suscripcion_envios;
create policy envios_propios_lectura on public.suscripcion_envios
  for select using (
    exists (
      select 1 from public.suscripciones s
      where s.id = suscripcion_id and s.cliente_id = auth.uid()
    )
  );

-- ── Alta automática del cliente ────────────────────────────
-- Al confirmar el código de acceso, Supabase crea el auth.users.
-- Este trigger crea la fila de `clientes` en el mismo momento,
-- para que el checkout no tenga que hacerlo desde el navegador.

create or replace function public.crear_cliente_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clientes (id, email, nombre, telefono)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    coalesce(new.raw_user_meta_data ->> 'telefono', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists crear_cliente_al_registrarse on auth.users;
create trigger crear_cliente_al_registrarse
  after insert on auth.users
  for each row execute function public.crear_cliente_al_registrarse();

-- ============================================================
-- Fase 1: suscripciones con cobro recurrente (Wompi)
--
-- Qué hace, en orden:
--   1. Tablas de configuración: planes, frecuencias, moliendas,
--      perfiles, prepagos y reglas. Precios, descuentos y
--      frecuencias dejan de vivir en data/suscripcion.json.
--   2. Tablas de operación: medios de pago, cobros, cancelaciones,
--      bitácora de la suscripción y registro del webhook.
--   3. Migra `suscripciones` al modelo nuevo y pasa las altas sin
--      pago a `pago_pendiente`.
--   4. RLS: el cliente solo LEE lo suyo. Toda escritura pasa por
--      los route handlers de app/api con la service key.
--
-- Correr DESPUÉS de suscripciones.sql, suscripciones_niveles.sql,
-- suscripciones_sin_pago.sql y finca_fotos.sql (usa es_equipo()).
-- Es idempotente: se puede volver a correr sin romper nada. Los
-- datos semilla usan `on conflict do nothing`, así que volver a
-- correrlo no pisa precios que ya se hayan editado.
-- ============================================================

-- ── 1. Configuración ───────────────────────────────────────

create table if not exists public.frecuencias (
  id        text primary key,
  dias      integer not null check (dias > 0),
  label_es  text not null,
  label_en  text not null,
  activo    boolean not null default true,
  orden     integer not null default 0
);

create table if not exists public.planes (
  id                    text primary key,
  label_es              text not null,
  label_en              text not null,
  desc_es               text not null default '',
  desc_en               text not null default '',
  bolsas                integer not null check (bolsas > 0),
  gramos_bolsa          integer not null default 340 check (gramos_bolsa > 0),
  -- Precio de UN envío, con el envío incluido. Igual para toda frecuencia.
  precio_envio_cop      integer not null check (precio_envio_cop > 0),
  incluye_es            text[] not null default '{}',
  incluye_en            text[] not null default '{}',
  frecuencia_defecto_id text references public.frecuencias (id),
  activo                boolean not null default true,
  orden                 integer not null default 0
);

create table if not exists public.moliendas (
  id        text primary key,
  label_es  text not null,
  label_en  text not null,
  desc_es   text not null default '',
  desc_en   text not null default '',
  activo    boolean not null default true,
  orden     integer not null default 0
);

create table if not exists public.perfiles (
  id        text primary key,
  label_es  text not null,
  label_en  text not null,
  desc_es   text not null default '',
  desc_en   text not null default '',
  activo    boolean not null default true,
  orden     integer not null default 0
);

create table if not exists public.prepagos (
  id            text primary key,
  meses         integer not null check (meses > 0),
  descuento_pct numeric not null default 0 check (descuento_pct >= 0 and descuento_pct < 100),
  label_es      text not null,
  label_en      text not null,
  activo        boolean not null default true,
  orden         integer not null default 0
);

-- Reglas sueltas: una fila por clave, valor en jsonb.
create table if not exists public.config_suscripcion (
  clave        text primary key,
  valor        jsonb not null,
  descripcion  text not null default ''
);

-- ── Semilla ────────────────────────────────────────────────

insert into public.frecuencias (id, dias, label_es, label_en, orden) values
  ('semanal',   7,  'Cada semana',    'Every week',     1),
  ('quincenal', 15, 'Cada 15 días',   'Every 2 weeks',  2),
  ('mensual',   30, 'Cada mes',       'Every month',    3)
on conflict (id) do nothing;

insert into public.planes
  (id, label_es, label_en, desc_es, desc_en, bolsas, gramos_bolsa, precio_envio_cop,
   incluye_es, incluye_en, frecuencia_defecto_id, orden) values
  ('ritual', 'Ritual', 'Ritual',
   'Una bolsa de la finca. Para una persona que toma café a diario.',
   'One bag from the farm. For one person who drinks coffee daily.',
   1, 340, 45000,
   array['1 bolsa de 340 g del café de la finca'],
   array['1 bag (340 g) of our farm coffee'],
   'quincenal', 1),
  ('jornada', 'Jornada', 'Jornada',
   'Dos bolsas: la de la finca y un café invitado. Para la casa o para comparar.',
   'Two bags: our farm coffee and a guest coffee. For the household, or to compare.',
   2, 340, 85000,
   array['1 bolsa de 340 g del café de la finca', '1 bolsa de 340 g del café invitado'],
   array['1 bag (340 g) of our farm coffee', '1 bag (340 g) of the guest coffee'],
   'quincenal', 2)
on conflict (id) do nothing;

insert into public.moliendas (id, label_es, label_en, desc_es, desc_en, orden) values
  ('grano',    'En grano',         'Whole bean',   'Muele justo antes de preparar.', 'Grind right before brewing.', 1),
  ('filtro',   'V60 / filtro',     'Pour over',    'Molienda media-fina.',            'Medium-fine grind.',          2),
  ('prensa',   'Prensa francesa',  'French press', 'Molienda gruesa.',                'Coarse grind.',               3),
  ('espresso', 'Espresso',         'Espresso',     'Molienda fina.',                  'Fine grind.',                 4),
  ('moka',     'Moka / greca',     'Moka pot',     'Molienda fina-media.',            'Fine-medium grind.',          5)
on conflict (id) do nothing;

insert into public.perfiles (id, label_es, label_en, desc_es, desc_en, orden) values
  ('achocolatado', 'Achocolatado', 'Chocolatey', 'Cuerpo alto, poca acidez. Cacao y panela.', 'Full body, low acidity. Cocoa and panela.', 1),
  ('frutal',       'Frutal',       'Fruity',     'Acidez viva, cuerpo ligero. Cítricos y frutos rojos.', 'Lively acidity, light body. Citrus and red fruit.', 2),
  ('balanceado',   'Balanceado',   'Balanced',   'Punto medio. Panela, fruta y nuez.', 'Middle ground. Panela, fruit and nut.', 3)
on conflict (id) do nothing;

insert into public.prepagos (id, meses, descuento_pct, label_es, label_en, orden) values
  ('mes-a-mes', 1, 0,  'Pago por envío', 'Pay per shipment', 1),
  ('trimestre', 3, 10, '3 meses',        '3 months',         2),
  ('semestre',  6, 15, '6 meses',        '6 months',         3)
on conflict (id) do nothing;

insert into public.config_suscripcion (clave, valor, descripcion) values
  ('dias_cobro_antes_envio', '3',
   'Días antes del envío en que se cobra. Es también el corte: un cambio hecho después de esa fecha entra en el ciclo siguiente.'),
  ('dias_preparacion', '3',
   'Días entre el pago del alta y el primer envío, para tostar y empacar.'),
  ('reintentos_dias', '[2, 4, 7]',
   'Reintentos tras un cobro fallido, en días desde el fallo anterior. Agotados, la suscripción se cancela.'),
  ('meses_pausa', '[1, 2]',
   'Duraciones de pausa que se ofrecen, en meses.'),
  ('redondeo_cop', '100',
   'Los montos se redondean a este múltiplo.'),
  ('prepago_renovacion', '"mismo"',
   '"mismo": al acabarse el prepago se cobra otro bloque igual. "ciclo": pasa a cobrarse por envío.'),
  ('regalo', '{"cadaEnvios": 6, "bolsas": 1}',
   'Cada tantos envíos seguidos, el siguiente lleva estas bolsas de regalo. cadaEnvios 0 lo apaga.'),
  ('operacion', '{"productoId": "df499576-64ce-49f1-8dc2-44efa6cdb0d5", "productoNombre": "TazaMaestra Natural", "canal": "online", "prefijoPedido": "SUB", "gramosPorLibra": 454}',
   'Puente con el software de gestión (tabla pedidos). canal solo acepta: otro, tienda, mayorista, online.'),
  ('quiz', '{
     "factorCobertura": 1,
     "tazasOpciones": [1, 2, 3, 4],
     "personasOpciones": [1, 2, 3, 4],
     "metodos": [
       {"id": "filtro",   "label_es": "V60 / filtro",    "label_en": "Pour over",    "moliendaId": "filtro",   "gramosPorTaza": 8},
       {"id": "prensa",   "label_es": "Prensa francesa", "label_en": "French press", "moliendaId": "prensa",   "gramosPorTaza": 8},
       {"id": "espresso", "label_es": "Espresso",        "label_en": "Espresso",     "moliendaId": "espresso", "gramosPorTaza": 14},
       {"id": "moka",     "label_es": "Moka / greca",    "label_en": "Moka pot",     "moliendaId": "moka",     "gramosPorTaza": 8},
       {"id": "molino",   "label_es": "Tengo molino",    "label_en": "I grind at home", "moliendaId": "grano", "gramosPorTaza": 8}
     ],
     "perfilConLeche": {"frutal": "balanceado"}
   }',
   'Reglas del quiz. perfilConLeche cambia el perfil elegido cuando el café se toma con leche.')
on conflict (clave) do nothing;

-- ── 2. Operación ───────────────────────────────────────────

create table if not exists public.metodos_pago (
  id                       uuid primary key default gen_random_uuid(),
  cliente_id               uuid not null references public.clientes (id) on delete cascade,
  wompi_payment_source_id  text not null unique,
  tipo                     text not null check (tipo in ('CARD', 'NEQUI')),
  -- Solo lo que sirve para reconocerlo en pantalla. Nunca el número.
  marca                    text not null default '',
  ultimos4                 text not null default '',
  telefono                 text not null default '',
  estado                   text not null default 'AVAILABLE',
  creado_en                timestamptz not null default now()
);

create index if not exists metodos_pago_cliente_idx on public.metodos_pago (cliente_id);

-- ── Suscripciones: modelo nuevo ────────────────────────────

alter table public.suscripciones
  add column if not exists pausada_hasta               date,
  add column if not exists cambios_pendientes          jsonb not null default '{}'::jsonb,
  add column if not exists metodo_pago_id              uuid references public.metodos_pago (id) on delete set null,
  add column if not exists envios_prepagados_restantes integer not null default 0 check (envios_prepagados_restantes >= 0),
  add column if not exists intentos_fallidos           integer not null default 0 check (intentos_fallidos >= 0),
  add column if not exists proximo_reintento           date,
  -- Número del último ciclo resuelto (pagado, prepagado o saltado).
  add column if not exists ciclo                       integer not null default 0 check (ciclo >= 0),
  add column if not exists actualizada_en              timestamptz not null default now();

-- nivel_id y metodo son del modelo anterior: se conservan para auditar.
alter table public.suscripciones alter column nivel_id drop not null;

-- plan_id pasa a apuntar a `planes`. Traduce lo que haya: el nivel de 1
-- libra es Ritual y los de 2 o 3 libras, Jornada.
update public.suscripciones
   set plan_id = case when nivel_id = '1-libra' then 'ritual' else 'jornada' end
 where plan_id is null or plan_id not in (select id from public.planes);

update public.suscripciones
   set frecuencia_id = 'mensual'
 where frecuencia_id not in (select id from public.frecuencias);

update public.suscripciones
   set prepago_id = 'mes-a-mes'
 where prepago_id not in (select id from public.prepagos);

-- Molienda: "molido" se vuelve la molienda de su método.
update public.suscripciones
   set molienda = case metodo
         when 'filtro'   then 'filtro'
         when 'greca'    then 'moka'
         when 'prensa'   then 'prensa'
         when 'espresso' then 'espresso'
         else 'filtro'
       end
 where molienda = 'molido';

update public.suscripciones
   set molienda = 'grano'
 where molienda not in (select id from public.moliendas);

update public.suscripciones
   set perfil = case perfil
         when 'suave'   then 'frutal'
         when 'intenso' then 'achocolatado'
         else 'balanceado'
       end
 where perfil not in (select id from public.perfiles);

alter table public.suscripciones alter column plan_id set not null;
alter table public.suscripciones alter column molienda drop default;
alter table public.suscripciones alter column perfil drop default;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'suscripciones_plan_fk') then
    alter table public.suscripciones
      add constraint suscripciones_plan_fk foreign key (plan_id) references public.planes (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'suscripciones_frecuencia_fk') then
    alter table public.suscripciones
      add constraint suscripciones_frecuencia_fk foreign key (frecuencia_id) references public.frecuencias (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'suscripciones_prepago_fk') then
    alter table public.suscripciones
      add constraint suscripciones_prepago_fk foreign key (prepago_id) references public.prepagos (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'suscripciones_molienda_fk') then
    alter table public.suscripciones
      add constraint suscripciones_molienda_fk foreign key (molienda) references public.moliendas (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'suscripciones_perfil_fk') then
    alter table public.suscripciones
      add constraint suscripciones_perfil_fk foreign key (perfil) references public.perfiles (id);
  end if;
end $$;

-- ── Estados ────────────────────────────────────────────────
-- activa, pausada, pago_pendiente, cancelada. Ver la máquina de
-- estados en lib/suscripcion.ts y en el README.

alter table public.suscripciones drop constraint if exists suscripciones_estado_check;

update public.suscripciones set estado = 'pago_pendiente' where estado = 'pendiente';

-- Las altas hechas sin pasarela no tienen con qué cobrarse: quedan
-- esperando a que el cliente registre un medio de pago desde su cuenta.
update public.suscripciones
   set estado = 'pago_pendiente',
       pausada_hasta = null,
       proximo_reintento = null
 where estado in ('activa', 'pausada')
   and metodo_pago_id is null;

alter table public.suscripciones
  add constraint suscripciones_estado_check
  check (estado in ('activa', 'pausada', 'pago_pendiente', 'cancelada'));

alter table public.suscripciones alter column estado set default 'pago_pendiente';

-- Los envíos ya registrados conservan su número: los ciclos nuevos
-- siguen la cuenta desde ahí.
update public.suscripciones s
   set ciclo = coalesce((select max(e.numero) from public.suscripcion_envios e where e.suscripcion_id = s.id), 0)
 where s.ciclo = 0;

-- Una sola suscripción viva por cliente.
do $$
begin
  if exists (
    select cliente_id from public.suscripciones
     where estado <> 'cancelada'
     group by cliente_id having count(*) > 1
  ) then
    raise warning 'Hay clientes con más de una suscripción viva: no se crea el índice suscripciones_una_viva. Cancela las sobrantes y vuelve a correr este archivo.';
  else
    create unique index if not exists suscripciones_una_viva
      on public.suscripciones (cliente_id) where estado <> 'cancelada';
  end if;
end $$;

drop index if exists public.suscripciones_por_cobrar_idx;
create index if not exists suscripciones_por_procesar_idx
  on public.suscripciones (estado, proximo_envio);

-- ── Cobros ─────────────────────────────────────────────────

create table if not exists public.cobros (
  id                    uuid primary key default gen_random_uuid(),
  suscripcion_id        uuid not null references public.suscripciones (id) on delete cascade,
  cliente_id            uuid not null references public.clientes (id) on delete cascade,
  metodo_pago_id        uuid references public.metodos_pago (id) on delete set null,
  referencia            text not null unique,
  wompi_transaction_id  text unique,
  -- El ciclo que paga. Un reintento repite el ciclo con otra referencia.
  ciclo                 integer not null check (ciclo > 0),
  origen                text not null check (origen in ('alta', 'automatico', 'reintento', 'manual')),
  envios_cubiertos      integer not null default 1 check (envios_cubiertos > 0),
  monto_cop             integer not null check (monto_cop > 0),
  estado                text not null default 'CREANDO'
                        check (estado in ('CREANDO', 'PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR')),
  -- Foto de lo que se cobró: plan, bolsas, frecuencia, molienda, perfil, prepago.
  detalle               jsonb not null default '{}'::jsonb,
  motivo                text,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);

create index if not exists cobros_suscripcion_idx on public.cobros (suscripcion_id);
create index if not exists cobros_pendientes_idx on public.cobros (estado) where estado in ('CREANDO', 'PENDING');

-- Nunca dos cobros en vuelo para la misma suscripción: es lo que impide
-- cobrar dos veces si el cron y el cliente coinciden.
create unique index if not exists cobros_uno_en_curso
  on public.cobros (suscripcion_id) where estado in ('CREANDO', 'PENDING');

-- ── Envíos: foto de lo que sale ────────────────────────────

alter table public.suscripcion_envios
  add column if not exists cobro_id   uuid references public.cobros (id) on delete set null,
  add column if not exists plan_id    text,
  add column if not exists bolsas     integer not null default 0,
  add column if not exists molienda   text not null default '',
  add column if not exists perfil     text not null default '',
  add column if not exists origen     text not null default 'cobro',
  add column if not exists direccion  jsonb;

-- ── Cancelaciones ──────────────────────────────────────────

create table if not exists public.cancelaciones (
  id              uuid primary key default gen_random_uuid(),
  suscripcion_id  uuid not null references public.suscripciones (id) on delete cascade,
  cliente_id      uuid not null references public.clientes (id) on delete cascade,
  motivo          text not null check (motivo in (
                    'precio', 'mucho_cafe', 'sabor', 'envios', 'otra_marca',
                    'temporal', 'pago_fallido', 'otro', 'prefiero_no_decir'
                  )),
  texto           text not null default '',
  ofertas_vistas  text[] not null default '{}',
  creada_en       timestamptz not null default now()
);

create index if not exists cancelaciones_suscripcion_idx on public.cancelaciones (suscripcion_id);

-- ── Bitácora ───────────────────────────────────────────────

create table if not exists public.suscripcion_eventos (
  id               uuid primary key default gen_random_uuid(),
  suscripcion_id   uuid not null references public.suscripciones (id) on delete cascade,
  tipo             text not null,
  estado_anterior  text,
  estado_nuevo     text,
  actor            text not null check (actor in ('cliente', 'sistema', 'wompi', 'admin')),
  datos            jsonb not null default '{}'::jsonb,
  creado_en        timestamptz not null default now()
);

create index if not exists suscripcion_eventos_suscripcion_idx
  on public.suscripcion_eventos (suscripcion_id, creado_en desc);

-- ── Webhook ────────────────────────────────────────────────
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

-- ── Quiz en el perfil ──────────────────────────────────────

alter table public.clientes
  add column if not exists quiz_respuestas     jsonb,
  add column if not exists quiz_recomendacion  jsonb,
  add column if not exists quiz_respondido_en  timestamptz;

-- ── 4. RLS ─────────────────────────────────────────────────

alter table public.frecuencias          enable row level security;
alter table public.planes               enable row level security;
alter table public.moliendas            enable row level security;
alter table public.perfiles             enable row level security;
alter table public.prepagos             enable row level security;
alter table public.config_suscripcion   enable row level security;
alter table public.metodos_pago         enable row level security;
alter table public.cobros               enable row level security;
alter table public.cancelaciones        enable row level security;
alter table public.suscripcion_eventos  enable row level security;
alter table public.wompi_eventos        enable row level security;

-- La configuración se lee en público (la landing muestra precios) y la
-- edita solo el equipo.
do $$
declare t text;
begin
  foreach t in array array['frecuencias','planes','moliendas','perfiles','prepagos','config_suscripcion']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_lectura', t);
    execute format('create policy %I on public.%I for select using (true)', t || '_lectura', t);
    execute format('drop policy if exists %I on public.%I', t || '_equipo', t);
    execute format('create policy %I on public.%I for all using (public.es_equipo()) with check (public.es_equipo())', t || '_equipo', t);
  end loop;
end $$;

-- Antes era `for all`: el navegador podía cambiarse el estado o la fecha
-- de envío. Ahora solo lee; escriben los route handlers.
drop policy if exists suscripciones_propias on public.suscripciones;
drop policy if exists suscripciones_propias_lectura on public.suscripciones;
create policy suscripciones_propias_lectura on public.suscripciones
  for select using (auth.uid() = cliente_id);

drop policy if exists metodos_pago_propios_lectura on public.metodos_pago;
create policy metodos_pago_propios_lectura on public.metodos_pago
  for select using (auth.uid() = cliente_id);

drop policy if exists cobros_propios_lectura on public.cobros;
create policy cobros_propios_lectura on public.cobros
  for select using (auth.uid() = cliente_id);

drop policy if exists cancelaciones_propias_lectura on public.cancelaciones;
create policy cancelaciones_propias_lectura on public.cancelaciones
  for select using (auth.uid() = cliente_id);

drop policy if exists eventos_propios_lectura on public.suscripcion_eventos;
create policy eventos_propios_lectura on public.suscripcion_eventos
  for select using (
    exists (select 1 from public.suscripciones s
             where s.id = suscripcion_id and s.cliente_id = auth.uid())
  );

-- wompi_eventos: sin policies. Solo la service key la toca.

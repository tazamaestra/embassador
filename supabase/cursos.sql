-- ============================================================
-- Cursos en video para los clientes
--
-- Correr UNA vez en el SQL Editor del proyecto de Supabase de la WEB.
-- Es idempotente: se puede volver a correr sin duplicar nada.
--
--   cursos            Un curso (título, descripción, si está publicado y
--                     quién lo ve: todos los clientes o solo los elegidos)
--   curso_videos      Videos de YouTube (no listados) en orden, agrupados
--                     por módulo
--   curso_accesos     Clientes elegidos, para los cursos "seleccionados"
--   curso_progreso    Qué videos marcó como vistos cada cliente
--
-- Los enlaces de YouTube solo los entrega el servidor a clientes con
-- sesión y permiso (app/api/mi-cuenta/cursos). Todo se administra en
-- /admin → Cursos.
-- ============================================================

create table if not exists public.cursos (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null check (length(trim(titulo)) between 1 and 120),
  descripcion  text not null default '',
  publicado    boolean not null default false,
  acceso       text not null default 'todos' check (acceso in ('todos', 'seleccionados')),
  creado_en    timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.curso_videos (
  id           uuid primary key default gen_random_uuid(),
  curso_id     uuid not null references public.cursos (id) on delete cascade,
  orden        integer not null,
  modulo       text not null default '',
  titulo       text not null check (length(trim(titulo)) between 1 and 150),
  descripcion  text not null default '',
  youtube_id   text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$')
);

create index if not exists curso_videos_curso_idx on public.curso_videos (curso_id, orden);

create table if not exists public.curso_accesos (
  curso_id    uuid not null references public.cursos (id) on delete cascade,
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  creado_en   timestamptz not null default now(),
  primary key (curso_id, cliente_id)
);

create index if not exists curso_accesos_cliente_idx on public.curso_accesos (cliente_id);

create table if not exists public.curso_progreso (
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  video_id    uuid not null references public.curso_videos (id) on delete cascade,
  visto_en    timestamptz not null default now(),
  primary key (cliente_id, video_id)
);

-- ── RLS ────────────────────────────────────────────────────
-- Todo pasa por app/api con la service key. Sin policies para clientes:
-- así el youtube_id no se puede leer directo desde el navegador.

alter table public.cursos          enable row level security;
alter table public.curso_videos    enable row level security;
alter table public.curso_accesos   enable row level security;
alter table public.curso_progreso  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['cursos', 'curso_videos', 'curso_accesos', 'curso_progreso']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_equipo', t);
    execute format('create policy %I on public.%I for all using (public.es_equipo()) with check (public.es_equipo())', t || '_equipo', t);
  end loop;
end $$;

-- ── Curso inicial: Introducción al café de especialidad ────
-- Con Hernando Tapasco. Visible para todos los clientes. Solo se crea si
-- todavía no existe un curso con este título.

do $$
declare c uuid;
begin
  if exists (select 1 from public.cursos where titulo = 'Introducción al café de especialidad') then
    return;
  end if;

  insert into public.cursos (titulo, descripcion, publicado, acceso)
  values (
    'Introducción al café de especialidad',
    'Un recorrido del cafeto a la taza con Hernando Tapasco: variedades, cosecha, beneficio, calidad y preparación.',
    true,
    'todos'
  )
  returning id into c;

  insert into public.curso_videos (curso_id, orden, modulo, titulo, youtube_id) values
    (c,  1, 'Bienvenida',            'Presentación',                                  'xQQhGsauRjs'),
    (c,  2, 'Bienvenida',            'Introducción al curso de café de especialidad', 'apr3mhRZQfA'),
    (c,  3, 'El café en la finca',   'Variedades',                                    'qOyAN0tmldY'),
    (c,  4, 'El café en la finca',   'Recolección y escala de maduración',            'y4u4MMbnVrU'),
    (c,  5, 'El café en la finca',   'Clasificación de frutos y despulpado',          'gZ9Brq84hRY'),
    (c,  6, 'Beneficio del café',    'Despulpado',                                    'r0hIA84ayUw'),
    (c,  7, 'Beneficio del café',    'Fermentación',                                  '078liJJU-FU'),
    (c,  8, 'Beneficio del café',    'Fermentación y despulpado',                     'n6mijax8HVY'),
    (c,  9, 'Beneficio del café',    'Métodos de procesamiento',                      'lhoWrg-m0bs'),
    (c, 10, 'Calidad en taza',       'Defectos del café',                             'BH07OqKr0KM'),
    (c, 11, 'Calidad en taza',       'Atributos sensoriales del café',                'kI6rHoPQUk0'),
    (c, 12, 'Calidad en taza',       'Degustación y catación',                        '_Ll8foD4kao'),
    (c, 13, 'Preparación',           'Método de preparación por inmersión',           'Gx5lYr7nIXc');
end $$;

-- ============================================================
-- Fotos de finca
--
-- La foto NO se guarda en Postgres. Va al bucket `fincas` de
-- Supabase Storage y aquí solo queda la ruta: así la sirve la
-- CDN y next/image la convierte a AVIF/WebP al vuelo. Meter la
-- imagen en la tabla obligaría a servirla por un endpoint
-- dinámico, sin caché de CDN, que es justo lo contrario de lo
-- que busca el resto del sitio.
--
-- El peso se controla antes de subir: el navegador redimensiona
-- a 1600 px de lado mayor y la reencoda en WebP (ver
-- lib/imagen.ts). Lo que llega al bucket ya viene comprimido.
--
-- `producto_slug` es texto y apunta a los ids de
-- data/content.json, igual que `suscripciones.producto_slug`.
-- El catálogo sigue viviendo en el JSON; esta tabla solo le
-- cuelga la foto.
--
-- Requiere que ya exista la tabla `usuarios` (la lista del equipo
-- interno), que es contra la que se valida quién puede subir.
--
-- Correr una vez contra el proyecto de Supabase.
-- Es idempotente: se puede volver a correr sin romper nada.
-- ============================================================

-- ── Quién es equipo interno ────────────────────────────────
-- `usuarios` ya existe y es la lista del equipo. Se envuelve en
-- una función para no repetir el subselect en cada policy.

create or replace function public.es_equipo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.usuarios u where u.id = auth.uid());
$$;

-- ── Tabla ──────────────────────────────────────────────────

create table if not exists public.finca_fotos (
  producto_slug    text primary key,
  -- Ruta dentro del bucket `fincas`, p. ej. 'la-esperanza/1736donde.webp'.
  storage_path     text not null,
  -- Dimensiones reales tras comprimir. next/image las necesita para
  -- reservar el espacio y que la página no salte al cargar.
  ancho            integer not null check (ancho > 0),
  alto             integer not null check (alto > 0),
  bytes            integer not null check (bytes > 0),
  -- Texto alternativo. Sin esto la foto no existe para un lector de pantalla.
  alt_es           text not null default '',
  alt_en           text not null default '',
  actualizada_en   timestamptz not null default now(),
  actualizada_por  uuid references auth.users (id) on delete set null
);

-- ── RLS ────────────────────────────────────────────────────
-- La foto se ve en la ficha pública del café, así que leer es
-- libre. Escribir es solo del equipo.

alter table public.finca_fotos enable row level security;

drop policy if exists finca_fotos_lectura_publica on public.finca_fotos;
create policy finca_fotos_lectura_publica on public.finca_fotos
  for select using (true);

drop policy if exists finca_fotos_escritura_equipo on public.finca_fotos;
create policy finca_fotos_escritura_equipo on public.finca_fotos
  for all using (public.es_equipo()) with check (public.es_equipo());

-- ── Bucket ─────────────────────────────────────────────────
-- Público en lectura para que la CDN pueda servir la imagen sin
-- firmar cada URL. El límite de 3 MB es una red de seguridad:
-- lo que sube el panel ya viene comprimido muy por debajo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fincas', 'fincas', true, 3145728, array['image/webp','image/jpeg','image/png'])
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

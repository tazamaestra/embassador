-- ============================================================
-- Ediciones de café desde el panel del equipo
--
-- El catálogo base sigue en data/content.json (finca, región,
-- altura, proceso…). Esta tabla guarda lo que el equipo cambia
-- desde el panel: nombre, precios, notas, propósito y la foto
-- del producto. Un campo en null = se usa el valor del JSON.
--
-- El sitio lee esta tabla (lib/servidor/cafes.ts) y la aplica
-- encima del JSON. El checkout cobra con el precio de aquí:
-- el monto nunca sale del navegador.
--
-- La foto del producto va al bucket `cafes`; aquí queda la ruta.
-- La foto de la finca sigue en `finca_fotos` / bucket `fincas`.
--
-- Requiere public.es_equipo() (ver finca_fotos.sql).
-- Correr una vez contra el proyecto. Es idempotente.
-- ============================================================

create table if not exists public.cafe_ediciones (
  producto_slug          text primary key,
  nombre                 text check (nombre is null or length(trim(nombre)) between 1 and 60),
  precio_cop             integer check (precio_cop is null or precio_cop > 0),
  precio_suscriptor_cop  integer check (precio_suscriptor_cop is null or precio_suscriptor_cop > 0),
  precio_usd             numeric(8, 2) check (precio_usd is null or precio_usd > 0),
  precio_suscriptor_usd  numeric(8, 2) check (precio_suscriptor_usd is null or precio_suscriptor_usd > 0),
  notas_es               text,
  notas_en               text,
  proposito_es           text,
  proposito_en           text,
  -- Ruta dentro del bucket `cafes`, p. ej. 'el-jardin/1736000000.webp'.
  foto_path              text,
  foto_ancho             integer check (foto_ancho is null or foto_ancho > 0),
  foto_alto              integer check (foto_alto is null or foto_alto > 0),
  actualizada_en         timestamptz not null default now(),
  actualizada_por        uuid references auth.users (id) on delete set null
);

-- ── RLS ────────────────────────────────────────────────────
-- Precios, nombres y notas se ven en la tienda pública: leer es
-- libre. Escribir es solo del equipo.

alter table public.cafe_ediciones enable row level security;

drop policy if exists cafe_ediciones_lectura_publica on public.cafe_ediciones;
create policy cafe_ediciones_lectura_publica on public.cafe_ediciones
  for select using (true);

drop policy if exists cafe_ediciones_escritura_equipo on public.cafe_ediciones;
create policy cafe_ediciones_escritura_equipo on public.cafe_ediciones
  for all using (public.es_equipo()) with check (public.es_equipo());

-- ── Bucket de fotos de producto ────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cafes', 'cafes', true, 3145728, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists cafes_lectura_publica on storage.objects;
create policy cafes_lectura_publica on storage.objects
  for select using (bucket_id = 'cafes');

drop policy if exists cafes_escritura_equipo on storage.objects;
create policy cafes_escritura_equipo on storage.objects
  for all
  using (bucket_id = 'cafes' and public.es_equipo())
  with check (bucket_id = 'cafes' and public.es_equipo());

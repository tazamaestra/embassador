# Taza Maestra — tienda y clientes

Sitio de Taza Maestra: café de especialidad de finca propia (Casa Roja y
Chambrana), en bolsa de 340 g o cuarterón de 2.250 g para cafeterías.

- **Tienda** con carrito y checkout de compra única (Wompi Web Checkout, o
  cobro por fuera mientras no haya pasarela).
- **Muestra gratis** de 100 g (el cliente paga el envío).
- **Clientes**: el equipo les crea la cuenta. Cada cliente ve sus compras
  (leídas del software de inventario) y sus **horas de capacitación**:
  cada 3 cuarterones comprados = 1 hora.
- **Panel del equipo** en `/admin`: clientes (con sus pedidos del inventario), muestras y cafés.

Next.js 16 (App Router) + next-intl (es/en) + Supabase + Tailwind 4.

## Puesta en marcha

1. Supabase **propio** de esta web (no el del inventario):
   - Base vacía: correr **`supabase/esquema.sql`** en el SQL Editor.
   - Base que venía de suscripciones: correr **`supabase/migracion_clientes.sql`**
     (borra las tablas de suscripción y crea las nuevas, en una transacción).
2. En Supabase → Authentication → Sign In / Providers: **desactivar
   "Allow new users to sign up"**. Las cuentas solo las crea el equipo.
3. Dar acceso al panel: crear la cuenta del equipo (Authentication → Users →
   Add user, con Auto Confirm) y luego
   `insert into public.equipo (id) select id from auth.users where lower(email) = '…';`
4. Variables de entorno (abajo).
5. Si hay pasarela: en Wompi → Desarrolladores, registrar el webhook
   `https://tudominio.com/api/wompi/webhook`.

## Variables de entorno

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente de Supabase en el navegador |
| `SUPABASE_SERVICE_ROLE_KEY` | Rutas de `/api` (solo servidor) |
| `NEXT_PUBLIC_SITE_URL` | URL pública, para el regreso desde Wompi |
| `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET` | Web Checkout. Sin ellas, los pedidos quedan "pendiente de pago" |
| `WOMPI_EVENTS_SECRET` | Validar el webhook |
| `INVENTARIO_API_URL` | Base de la API del inventario |
| `INVENTARIO_API_TOKEN` | Opcional: va como `Authorization: Bearer …` |
| `INVENTARIO_MOCK=1` | Compras simuladas aunque haya API configurada |

## API del inventario

El inventario es la **fuente de verdad de pedidos y ventas**. El contrato
completo (endpoints, JSON, errores, idempotencia y pruebas con curl) está en
**[docs/contrato-api-inventario.md](docs/contrato-api-inventario.md)**, y en
código en `lib/inventario-contrato.ts`.

- **Con `INVENTARIO_API_URL`:** los pedidos (de la cuenta y de la tienda) se
  crean en el inventario (`POST /pedidos`). "Tus pedidos" y las compras se
  leen de allá, y las horas se calculan con esas compras.
- **Sin ella:** no se pueden hacer pedidos (la web ya no los guarda) y las
  compras son simuladas por NIT, marcadas como "de ejemplo". Los estados de
  los pedidos se cambian en el inventario.

Toda la conexión está en `lib/servidor/inventario.ts` y `lib/servidor/pedidos.ts`.
`lib/servidor/inventario.test.ts` la prueba contra un inventario falso que
cumple el contrato.

## Páginas

| Ruta | Qué es |
|---|---|
| `/[locale]` | Inicio: carrusel, quiz de momento, historias, origen |
| `/[locale]/tienda` | Catálogo, presentaciones y formulario de muestra gratis |
| `/[locale]/producto/[slug]` | Ficha del café |
| `/[locale]/checkout` | Datos de envío y pago del carrito |
| `/[locale]/confirmacion` | Estado del pedido (`?ref=PED-…`) |
| `/[locale]/blog` | Nuestra historia |
| `/[locale]/acceso` | Entrar (correo y contraseña, o código al correo). Sin registro |
| `/[locale]/cuenta` | Cuenta del cliente: horas, compras, capacitaciones, cambiar clave |
| `/[locale]/admin` | Panel del equipo |

## Rutas de la API

| Ruta | Quién | Qué hace |
|---|---|---|
| `POST /api/checkout` | cualquiera | Crea el pedido con precios del catálogo; firma Wompi si está configurado |
| `GET /api/pedidos/:ref` | cualquiera | Estado del pedido para la confirmación |
| `POST /api/muestras` | cualquiera | Solicitud de muestra gratis |
| `GET /api/mi-cuenta` | cliente | Ficha, compras del inventario, capacitaciones y horas |
| `GET, POST /api/admin/clientes` | admin | Lista y alta (crea la cuenta y devuelve la clave una vez) |
| `GET, PATCH, DELETE /api/admin/clientes/:id` | admin | Ficha completa, editar, nueva clave, activar, borrar |
| `POST /api/admin/clientes/:id/capacitaciones` | admin | Registrar una sesión dada |
| `DELETE /api/admin/clientes/:id/capacitaciones/:capId` | admin | Borrar una sesión |
| `GET, POST /api/admin/cursos`, `GET, PUT, DELETE /api/admin/cursos/:id` | admin | Cursos en video: datos, videos en orden y clientes elegidos |
| `GET, PUT /api/admin/clientes/:id/cursos` | admin | Cursos de un cliente: avance y acceso |
| `GET, POST /api/mi-cuenta/cursos` | cliente | Sus cursos con videos; marcar un video como visto |
| `GET /api/admin/muestras`, `PATCH /api/admin/muestras/:id` | admin | Solicitudes de muestra |
| `PATCH /api/admin/cafes/:slug`, `/api/admin/fincas/:slug` | admin | Precios, textos y fotos de cada café |
| `POST /api/wompi/webhook` | Wompi | Informa al inventario el pago (pagado o fallido) |

## Tablas (`supabase/esquema.sql`)

`equipo`, `clientes`, `capacitaciones`, `wompi_eventos`, `cursos`, `curso_videos`,
`curso_accesos`, `curso_progreso` (estas cuatro en `supabase/cursos.sql`),
`solicitudes_muestra`, `finca_fotos`, `cafe_ediciones`.

## Pruebas

```bash
npm test
```

En Windows, correrlas desde `C:\…` con la C en mayúscula: con `c:\…` vitest
carga dos copias de sí mismo y falla al arrancar ("failed to find the runner").

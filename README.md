# Taza Maestra — tienda por suscripción

Taza Maestra no vende café: vende compañía para las horas duras del día. El café es el
vehículo, y la suscripción es lo que permite dar mejor precio, promociones y bonos.

Sitio bilingüe (ES/EN) sobre Next.js 16 (App Router), Tailwind v4, next-intl, Supabase
y Wompi.

---

## Cómo correrlo

```bash
npm install
npm run dev          # http://localhost:3000 (redirige a /es)
npm run build
npm start

npm test             # Vitest
npx tsc --noEmit     # chequeo de tipos
```

Variables en `.env.local` (ver el archivo para la lista completa):

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` | Cliente de Supabase en el navegador |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor: el webhook de Wompi activa suscripciones |
| `NEXT_PUBLIC_FEATURE_AMBASSADORS` | `false` apaga el programa de embajadores |
| `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` / `NEXT_PUBLIC_WOMPI_ENV` | Web Checkout |
| `WOMPI_INTEGRITY_SECRET` | Firma de integridad (nunca sale del servidor) |
| `WOMPI_EVENTS_SECRET` | Validación del webhook |
| `NEXT_PUBLIC_SITE_URL` | Retorno de Wompi tras el pago |

Antes del primer checkout hay que correr `supabase/sql/suscripciones.sql` contra el
proyecto de Supabase, y activar la plantilla de código de acceso (OTP) en el panel.

---

## Rutas

| Ruta | Qué hace |
|---|---|
| `/[locale]` | Home: hero, la pregunta del quiz, historias, tres pasos, orígenes |
| `/[locale]/tienda` | Catálogo, filtrado por momento del día |
| `/[locale]/producto/[slug]` | Ficha del café y comparación única vs. suscriptor |
| `/[locale]/suscripcion` | Planes, beneficios, bonos y dudas |
| `/[locale]/blog` · `/blog/[slug]` | Historias en texto y foto |
| `/[locale]/checkout` | Una sola pantalla: resumen, correo, dirección y pago |
| `/[locale]/confirmacion` | Retorno de Wompi |
| `/[locale]/cuenta` | Panel del suscriptor |
| `/[locale]/acceso` | Código de 6 dígitos al correo |
| `/api/checkout` | Crea el pedido y firma los parámetros de Wompi |
| `/api/wompi/webhook` | Confirma el pago y activa la suscripción |
| `/[locale]/embajadores` | **Dormida.** Con el flag apagado, `proxy.ts` redirige a la home |

---

## Camino hasta pagar: tres pasos

1. El visitante responde **«¿Cuál es tu hora más difícil del día?»** en el home.
2. La recomendación —café y plan— aparece ahí mismo, sin cambiar de página.
3. «Suscribirme» lleva al checkout de una pantalla, donde paga.

La respuesta viaja por query string (`?cafe=…&plan=…&tipo=…`), así que el enlace es
compartible y sobrevive a una recarga.

---

## Dónde se configura cada cosa

Nada de precios, descuentos ni bonos está escrito en el código.

```
data/suscripcion.json     Niveles, frecuencias, prepagos, consumo, regalo, beneficios
data/content.json         Catálogo, momentos, historias del blog, copy de secciones
data/embajadores.json     Contenido del programa dormido
messages/{es,en}.json     Textos de la interfaz
messages/embajadores/     Textos del programa, solo se cargan con el flag encendido
```

La suscripción tiene tres ejes independientes, y los tres son datos:

```
niveles       Cuánto café llega: 1, 2 o 3 libras, con precio mensual fijo
frecuencias   Cada cuánto: mensual o cada 2 meses
prepagos      Cuántos meses se pagan de una, y qué descuento dan
```

El consumo que calcula la landing sale de `metodos[].gramosPorTaza` por
`consumo.diasMes`. Cambiar el gramaje de un método cambia la recomendación
sin tocar una línea de código.

La libra de regalo se configura en `regalo`:

```json
{ "mesesSeguidos": 6, "libras": 1 }
```

Para ocultar un café o un método sin borrarlo, se le pone `"_disabled": true`:
`lib/content.ts` los filtra al importar.

---

## Variables de entorno

Van en `.env.local`, que está en `.gitignore`. Sin las tres marcadas como
**obligatorias para cobrar**, el checkout responde 503 y no se puede completar
una suscripción.

```
NEXT_PUBLIC_SUPABASE_URL          Supabase → Project Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     la misma pantalla → anon public
SUPABASE_SERVICE_ROLE_KEY         la misma pantalla → service_role  ← obligatoria
NEXT_PUBLIC_SITE_URL              https://tudominio.com (sin barra final)
NEXT_PUBLIC_WOMPI_PUBLIC_KEY      Wompi → Desarrolladores → Llave pública
WOMPI_INTEGRITY_SECRET            Wompi → Desarrolladores → Secreto de integridad  ← obligatoria
WOMPI_EVENTS_SECRET               Wompi → Desarrolladores → Secreto de eventos     ← obligatoria
NEXT_PUBLIC_FEATURE_AMBASSADORS   "true" enciende el programa de embajadores
NEXT_PUBLIC_FEATURE_PAGOS         "true" enciende el cobro con Wompi
RESEND_API_KEY                    resend.com → API Keys (correo al suscriptor)
RESEND_FROM                       "Taza Maestra <hola@tudominio.com>", opcional
```

### Suscribirse sin cobrar

Con `NEXT_PUBLIC_FEATURE_PAGOS` apagado —que es como viene— el último paso del
checkout no cobra: llama a `/api/suscribir`, que deja la suscripción **activa**,
registra el primer envío con sus libras, carga el pedido en la tabla `pedidos`
y manda el correo de bienvenida. Todo el código de Wompi sigue intacto; se
vuelve a cobrar poniendo la variable en `"true"`.

Escribir en `pedidos` **exige `SUPABASE_SERVICE_ROLE_KEY`**: su RLS no deja
insertar ni al cliente ni al anónimo, y así debe quedarse. Si la key falta, la
suscripción se guarda igual y el fallo del pedido queda anotado en el log: nunca
se pierde un alta por no poder escribir en la tabla de operación.

El correo tampoco puede tumbar el alta. Sin `RESEND_API_KEY` se anota en el log
y el flujo sigue. Mientras no verifiques tu dominio en Resend, el remitente solo
puede ser `onboarding@resend.dev` y solo llega a la dirección de tu cuenta.

`SUPABASE_SERVICE_ROLE_KEY` **nunca** lleva el prefijo `NEXT_PUBLIC_`: salta RLS
y solo la usan los route handlers del servidor. Si se filtra al navegador,
cualquiera puede leer y escribir toda la base.

`api` está excluido del matcher de `proxy.ts` a propósito: sin esa exclusión
next-intl redirige `/api/...` a `/es/api/...` con un 307, y un POST —el webhook,
el checkout— se encuentra una redirección en vez de la respuesta.

El webhook de Wompi hay que registrarlo apuntando a:

```
https://tudominio.com/api/wompi/webhook
```

## Cuentas y acceso

Tres formas de entrar, todas terminan en una sesión de Supabase:

```
correo + contraseña    signUp / signInWithPassword
Google                 signInWithOAuth, vuelve con el token en el hash
código de 6 dígitos    signInWithOtp, para quien no quiere crear contraseña
```

Para que **registrarse y pagar de una** funcione, en Supabase →
Authentication → Providers → Email hay que dejar **Confirm email apagado**. Con
la confirmación encendida, `signUp` no entrega sesión y el checkout se corta:
el código lo detecta y avisa (`faltaConfirmar`), pero la compra no avanza.

Para Google: Supabase → Authentication → Providers → Google, con el Client ID y
el Client Secret de Google Cloud. En Google Cloud, la URI de redirección
autorizada es la que muestra esa misma pantalla de Supabase. Hasta que esté
configurado, el botón responde «Entrar con Google todavía no está habilitado».

---

## Arquitectura

La regla: **la lógica de la suscripción vive en funciones puras** que reciben y devuelven
objetos planos. La capa de Supabase solo traduce filas. Por eso el precio de suscriptor,
los bonos y las transiciones de estado se prueban sin simular la base ni el navegador.

```
lib/suscripcion.ts       Núcleo puro: precios, bonos, fechas, pausar/saltar/cancelar
lib/suscripcion-db.ts    Supabase: lee y guarda lo que el núcleo ya calculó
lib/content.ts           Datos tipados desde data/*.json
lib/flags.ts             FEATURE_AMBASSADORS y sus ayudas
lib/wompi.ts             SOLO SERVIDOR: firma de integridad y validación de eventos
lib/auth-store.ts        Sesión del cliente (código al correo)
lib/embajador-store.ts   Perfil de embajador, dormido
```

El precio **siempre** se recalcula en `/api/checkout` desde el catálogo. El monto que
mande el navegador no se usa nunca.

---

## El flag de embajadores

`FEATURE_AMBASSADORS=false` apaga el programa sin borrar nada. Siguen en el repo los
componentes, el contenido, las tablas de Supabase y el SQL.

Con el flag apagado:

- `proxy.ts` redirige `/{locale}/embajadores` a la home.
- `visibleNavKeys()` no devuelve la clave del menú.
- `i18n/request.ts` no carga `messages/embajadores/`, así que el copy no llega ni al bundle.
- `ModeContext` fija el modo en `"cliente"`, aunque el navegador tenga `"embajador"`
  guardado de una visita anterior.
- `/cuenta` muestra el panel del suscriptor; el de embajador se importa dinámicamente.
- `lib/pedidos.ts` falla de forma explícita si algo lo llama.

No hay cron ni job de comisiones en la app: `confirmar_pedido_embajador` es una función
SQL que invoca el equipo interno por fuera del repo, y no se llama desde ningún lado del
código (`grep '.rpc('` no encuentra nada).

Para encenderlo de nuevo basta cambiar la variable a `true` y reconstruir.

---

## Blog sin videos

El blog es texto y foto. Los campos `videoId` e `isVideo` siguen en `data/content.json`
—no se borran datos— pero `lib/content.ts` los descarta al exponer los posts:

```ts
export const blogPosts: BlogPost[] = c.blogPosts.map(({ videoId, isVideo, ...post }) => post);
```

Ningún componente puede renderizarlos aunque quiera, y el tipo `BlogPost` ni siquiera los
declara. Hay un test que lo vigila.

---

## Tests

```bash
npm test
```

| Archivo | Cubre |
|---|---|
| `lib/flags.test.ts` | Navegación y rutas con el flag apagado |
| `lib/suscripcion.test.ts` | Precio de suscriptor, ahorro, fechas, bonos, contador de tazas |
| `lib/suscripcion-acciones.test.ts` | Pausar, reanudar, saltar, cambiar y cancelar |
| `data/content.test.ts` | Cero videos, ficha completa del catálogo, tono del copy |

La matemática se prueba contra configuraciones sintéticas, para que un precio escrito a
mano en el código haga fallar el test.

---

## Internacionalización

`localePrefix: "always"`, así que todas las rutas llevan `/es` o `/en`. Hay que importar
`Link`, `useRouter` y `usePathname` desde `@/lib/nav` —**no** desde `next/navigation`—
para que el idioma se inyecte solo.

El middleware de Next 16 se llama `proxy.ts` (antes `middleware.ts`) y vive en la raíz.

---

## Tono del copy

Frases cortas, español de Colombia. Se muestra el esfuerzo, no se celebra con adjetivos.
Datos concretos del café antes que adjetivos. Los personajes base son la oficinista a las
3:00 p.m., el ingeniero esperando la salida a producción y el abuelo que ya hizo su
camino.

Prohibido: «tú puedes», «alcanza tus metas», «al siguiente nivel», «el mejor café» y las
exclamaciones de más. Hay un test en `data/content.test.ts` que lo revisa.

---

## Accesibilidad

- El quiz y los selectores de plan usan `role="radiogroup"` / `role="radio"` con `aria-checked`.
- El carrito usa `role="dialog"`, `aria-modal` e `inert`.
- Los iconos decorativos van con `aria-hidden="true"`.
- Enlace para saltar al contenido en el layout, visible al enfocarlo.
- `prefers-reduced-motion` apaga las animaciones en `app/globals.css`.

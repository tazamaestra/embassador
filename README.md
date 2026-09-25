# Taza Maestra — tienda por suscripción

Taza Maestra no vende café: vende compañía para las horas duras del día. El café es el
vehículo, y la suscripción es lo que permite dar mejor precio, promociones y bonos.

Sitio bilingüe (ES/EN) sobre Next.js 16 (App Router), Tailwind v4, next-intl, Supabase
y Wompi (cobro recurrente con tarjeta o Nequi).

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

### Puesta en marcha, en este orden

1. Correr contra Supabase, en orden: `suscripciones.sql`, `suscripciones_niveles.sql`,
   `suscripciones_sin_pago.sql`, `finca_fotos.sql` y **`fase1_suscripciones.sql`**. Todos
   son idempotentes. Sin el último, `/suscripcion`, `/quiz`, `/checkout` y `/cuenta`
   fallan: los precios viven en la base.
2. Variables de entorno (abajo), incluidas `WOMPI_PRIVATE_KEY` y `CRON_SECRET`.
3. En Wompi → Desarrolladores, registrar el webhook: `https://tudominio.com/api/wompi/webhook`.
4. Desplegar en Vercel. `vercel.json` programa `/api/cron/diario` todos los días a las
   11:00 UTC (6:00 a. m. en Colombia).
5. Probar en sandbox (llaves `pub_test_`/`prv_test_`): la tarjeta `4242 4242 4242 4242`
   aprueba y la `4111 1111 1111 1111` rechaza; en Nequi, `3991111111` aprueba y
   `3992222222` rechaza.

Activar la plantilla de código de acceso (OTP) en el panel de Supabase.

---

## Rutas

| Ruta | Qué hace |
|---|---|
| `/[locale]` | Home: hero, la pregunta del quiz de momentos, historias, tres pasos, orígenes |
| `/[locale]/tienda` | Catálogo, filtrado por momento del día |
| `/[locale]/producto/[slug]` | Ficha del café y comparación única vs. suscriptor |
| `/[locale]/suscripcion` | Planes, cómo funciona, beneficios, café invitado, dudas |
| `/[locale]/quiz` | Quiz de 60 segundos: sale plan, frecuencia, molienda y perfil |
| `/[locale]/blog` · `/blog/[slug]` | Historias en texto y foto |
| `/[locale]/checkout` | Plan, frecuencia, molienda, perfil, prepago, dirección y pago |
| `/[locale]/confirmacion` | Resultado del alta (o retorno del Web Checkout de una compra única) |
| `/[locale]/cuenta` | Panel del suscriptor. Si es admin, enlace al panel del equipo |
| `/[locale]/admin` | Panel del equipo: suscripciones y fotos de finca |
| `/[locale]/acceso` | Entrar: contraseña, Google o código al correo |
| `/[locale]/embajadores` | **Dormida.** Con el flag apagado, `proxy.ts` redirige a la home |

### API

| Ruta | Quién | Qué hace |
|---|---|---|
| `POST /api/suscripciones` | suscriptor | Alta: fuente de pago en Wompi, suscripción y primer cobro |
| `GET /api/suscripciones/mia` | suscriptor | Suscripción, envíos, cobros, medio de pago y dirección |
| `POST /api/suscripciones/:id/:accion` | dueño | `pausar`, `reanudar`, `saltar`, `cambiar`, `direccion`, `metodo-pago`, `reintentar`, `cancelar` |
| `POST /api/quiz` | suscriptor | Guarda las respuestas en el perfil y devuelve la recomendación |
| `GET /api/admin/suscripciones[/:id]` | admin | Resumen, envíos por despachar, listado, detalle |
| `POST /api/wompi/webhook` | Wompi | Estado final de cada transacción |
| `GET /api/cron/diario` | Vercel Cron | Cobros, pausas vencidas, reintentos, conciliación |
| `POST /api/checkout` | suscriptor | Compra única de una bolsa por Web Checkout |

---

## Dónde se configura cada cosa

**Nada que mueva dinero está en el código ni en los JSON.** Vive en Supabase y se edita
desde el Table Editor. Solo el equipo puede escribir; la lectura es pública porque la
landing muestra los precios.

```
planes               Ritual (1 bolsa de 340 g) y Jornada (2 bolsas). Precio por envío,
                     envío incluido, igual para toda frecuencia. activo=false lo oculta.
frecuencias          semanal (7 días), quincenal (15), mensual (30)
moliendas            grano, V60/filtro, prensa francesa, espresso, moka
perfiles             achocolatado, frutal, balanceado
prepagos             pago por envío (1 mes, 0%), 3 meses (10%), 6 meses (15%)
config_suscripcion   dias_cobro_antes_envio   3        el cobro, y el corte de cambios
                     dias_preparacion         3        del alta pagada al primer envío
                     reintentos_dias          [2,4,7]
                     meses_pausa              [1,2]
                     redondeo_cop             100
                     prepago_renovacion       "mismo" | "ciclo"
                     regalo                   {"cadaEnvios":6,"bolsas":1}
                     operacion                puente con la tabla pedidos
                     quiz                     reglas del quiz (ver abajo)
```

Los textos que no mueven dinero siguen en archivos:

```
data/suscripcion.json     Beneficios, café invitado, ciudades, preguntas frecuentes
data/content.json         Catálogo de la tienda, momentos, blog, copy de secciones
messages/{es,en}.json     Textos de la interfaz
```

Para ocultar un café o un método de la tienda sin borrarlo, se le pone `"_disabled": true`
en `data/content.json`.

---

## La suscripción

### Estados

```
(alta) ─────────────► pago_pendiente
pago_pendiente ─────► activa          cobro aprobado
pago_pendiente ─────► cancelada       reintentos agotados, o el cliente cancela
activa ─────────────► pausada         el cliente pausa 1 o 2 meses
activa ─────────────► pago_pendiente  cobro de ciclo rechazado, o sin medio de pago
activa ─────────────► cancelada       el cliente cancela
pausada ────────────► activa          llega la fecha (cron), o el cliente reanuda
pausada ────────────► cancelada       el cliente cancela
cancelada                             terminal
```

Saltar y cambiar no cambian el estado. La tabla vive en `TRANSICIONES`
(`lib/suscripcion.ts`), y hay un test que recorre todos los pares.

### Ciclos

`proximo_envio` apunta siempre al siguiente envío **sin resolver**. El cron lo resuelve
`dias_cobro_antes_envio` días antes: lo cobra o lo descuenta del prepago. Si el cliente
lo salta, se corre al siguiente. Así, "aplica desde el siguiente ciclo" sale solo: un
cambio hecho antes del cobro entra en ese envío, y uno hecho después entra en el
siguiente. Cada envío resuelto guarda su foto (plan, bolsas, molienda, perfil, dirección)
en `suscripcion_envios`.

- **Prepago.** Cobra de una los envíos que caben en los meses pagados (meses × 30 / días:
  3 meses semanal = 12 envíos) con el descuento, y el cron los despacha sin cobrar.
  Mientras queden envíos prepagados, un cambio de plan, frecuencia o forma de pago queda
  en `cambios_pendientes` y entra al renovar; molienda, perfil y dirección entran de una.
  Al acabarse el prepago, con `prepago_renovacion: "mismo"` se cobra otro bloque igual y
  con `"ciclo"` pasa a cobrarse por envío. Pausar un prepago lo alarga. Si cancela, los
  envíos ya pagados se despachan igual.
- **Cobro fallido.** Pasa a `pago_pendiente` y se reintenta a los 2, 4 y 7 días de cada
  fallo. Si el tercer reintento falla, se cancela (motivo `pago_fallido`). Cuando el
  cliente pone otro medio de pago, se cobra de una; ese intento manual no gasta reintentos.
- **Sin medio de pago.** Las altas hechas cuando la pasarela estaba apagada quedan en
  `pago_pendiente` sin reintentos hasta que el cliente registre uno. La cuenta le muestra
  el monto antes de pagar.
- **Nunca dos cobros.** El índice `cobros_uno_en_curso` impide dos cobros en vuelo para la
  misma suscripción, así que el cron y un clic del cliente no pueden cobrar dos veces.
  Además, `resolverCobro` solo actúa si el cobro seguía en vuelo: un webhook repetido no
  hace nada.

### Wompi

- La tarjeta se tokeniza **en el navegador** con la llave pública
  (`lib/wompi-navegador.ts`), así que el número no pasa por el servidor. Nequi también: el
  cliente aprueba en su app y la pantalla consulta el token hasta que pase a `APPROVED`.
- El servidor convierte el token en fuente de pago (`POST /payment_sources`, con la llave
  privada) usando los dos tokens de aceptación que el cliente marcó. Esos tokens vienen de
  `GET /merchants/info`, que reemplaza a `/merchants/:llave`; Wompi retira esa ruta vieja
  el 31 de octubre de 2026.
- Cada cobro es un `POST /transactions` con `payment_source_id` y firma de integridad. Si
  es con tarjeta, lleva además `recurrent: true` e `installments: 1`.
- El estado final llega por el webhook `transaction.updated`. Además, al crear el cobro se
  consulta durante unos segundos para responder en la misma pantalla, y el cron concilia
  los que sigan en `PENDING` después de 30 minutos.
- Un cobro que quedó en `CREANDO` sin transacción (porque el proceso murió a mitad) **no
  se reintenta solo**: no se sabe si Wompi alcanzó a cobrar. Sale en el panel del equipo
  como "cobros sin respuesta", para revisarlo en el panel de Wompi.

### Cancelación

Tres pasos, sin trampas. Primero las ofertas (pausar, espaciar, bajar a una bolsa, otro
perfil): cada una se aplica con un clic, y "No, quiero cancelar" está siempre a la vista.
Luego el motivo, con opciones cerradas (incluida "prefiero no decirlo") y texto libre. Al
final, confirmar. Se guarda en `cancelaciones`, y la bitácora registra qué oferta retuvo
a quién (`retencion`).

### Quiz

Cinco preguntas: método, leche, perfil, tazas al día y personas. `recomendar()`
(`lib/quiz.ts`) calcula el consumo de la casa (tazas × personas × gramos por taza del
método). Entre todas las combinaciones de plan y frecuencia, elige la de menor entrega
diaria que cubra ese consumo (según `factorCobertura`); si ninguna alcanza, la que más
entrega. La molienda sale del método, y `perfilConLeche` ajusta el perfil si el café se
toma con leche. Todas esas reglas están en `config_suscripcion.quiz`. Las respuestas
quedan en `clientes.quiz_respuestas`.

---

## Variables de entorno

Van en `.env.local`, que está en `.gitignore`, y en Vercel → Settings → Environment Variables.

```
NEXT_PUBLIC_SUPABASE_URL          Supabase → Project Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     la misma pantalla → anon public
SUPABASE_SERVICE_ROLE_KEY         la misma pantalla → service_role        ← obligatoria
NEXT_PUBLIC_SITE_URL              https://tudominio.com (sin barra final)
NEXT_PUBLIC_WOMPI_PUBLIC_KEY      Wompi → Desarrolladores → Llave pública (pub_test_/pub_prod_)
WOMPI_PRIVATE_KEY                 Wompi → Desarrolladores → Llave privada  ← obligatoria para cobrar
WOMPI_INTEGRITY_SECRET            Wompi → Desarrolladores → Secreto de integridad ← obligatoria
WOMPI_EVENTS_SECRET               Wompi → Desarrolladores → Secreto de eventos    ← obligatoria
CRON_SECRET                       Una cadena larga al azar; Vercel la manda al cron ← obligatoria
NEXT_PUBLIC_FEATURE_AMBASSADORS   "true" enciende el programa de embajadores
RESEND_API_KEY                    resend.com → API Keys (correo de bienvenida)
RESEND_FROM                       "Taza Maestra <hola@tudominio.com>", opcional
```

El ambiente de Wompi (sandbox o producción) se deduce del prefijo de la llave pública.
Sin la llave privada, `/api/suscripciones` y el cron responden 503 y no se cobra nada.

`SUPABASE_SERVICE_ROLE_KEY`, `WOMPI_PRIVATE_KEY` y los secretos **nunca** llevan el
prefijo `NEXT_PUBLIC_`. La service key salta RLS y solo la usan los route handlers.

El correo no puede tumbar el alta: sin `RESEND_API_KEY`, se anota en el log y el flujo
sigue. Mientras no verifiques tu dominio en Resend, el remitente solo puede ser
`onboarding@resend.dev` y el correo solo llega a la dirección de tu cuenta.

Cada envío pagado se carga en la tabla `pedidos`, que es la que lee el software de
gestión (producto, canal y prefijo están en `config_suscripcion.operacion`). Si esa
escritura falla, el envío se guarda igual y el error va al log.

`api` está excluido del matcher de `proxy.ts` a propósito. Sin esa exclusión, next-intl
redirige `/api/...` a `/es/api/...` con un 307, y un POST (el webhook, el checkout) recibe
una redirección en vez de la respuesta.

---

## Cuentas, acceso y roles

Tres formas de entrar, todas terminan en una sesión de Supabase:

```
correo + contraseña    signUp / signInWithPassword
Google                 signInWithOAuth, vuelve con el token en el hash
código de 6 dígitos    signInWithOtp, para quien no quiere crear contraseña
```

Dos roles:

- **Suscriptor:** cualquiera con sesión. Ve y gestiona solo lo suyo.
- **Admin:** quien esté en la tabla `usuarios` (función `es_equipo()`). Entra a `/admin` y
  ve el enlace al panel desde `/cuenta`.

El rol lo contesta Postgres con el token del usuario. `/api/admin/*` lo comprueba antes de
leer nada, y las tablas de configuración solo aceptan escrituras de `es_equipo()`. El
navegador del suscriptor **solo lee** sus filas; todas las escrituras de la suscripción
pasan por los route handlers.

Para que **registrarse y pagar de una** funcione, en Supabase → Authentication → Providers
→ Email hay que dejar **Confirm email apagado**. Con la confirmación encendida, `signUp`
no entrega sesión y el checkout se corta; el código lo detecta y avisa (`faltaConfirmar`).

Para Google: Supabase → Authentication → Providers → Google, con el Client ID y el Client
Secret de Google Cloud. Hasta que esté configurado, el botón responde «Entrar con Google
todavía no está habilitado».

---

## Arquitectura

La regla: **la lógica vive en funciones puras** que reciben y devuelven objetos planos, y
la capa de Supabase solo traduce filas. Por eso precios, ciclos, transiciones y el quiz se
prueban sin simular la base, Wompi ni el navegador.

```
lib/suscripcion.ts            Núcleo puro: precios, prepago, ciclos, máquina de estados,
                              reintentos, retención
lib/quiz.ts                   Recomendación del quiz (pura)
lib/catalogo.ts               Lee planes, frecuencias, reglas… de Supabase
lib/servidor/suscripciones.ts SOLO SERVIDOR: persiste, cobra, resuelve cobros, crea envíos
lib/servidor/cron.ts          El trabajo diario
lib/servidor/sesion.ts        Quién llama y si es admin
lib/wompi.ts                  SOLO SERVIDOR: firma, webhook, fuentes de pago, transacciones
lib/wompi-navegador.ts        Tokenización con la llave pública
lib/content.ts                Datos editoriales desde data/*.json
lib/flags.ts                  FEATURE_AMBASSADORS y sus ayudas
lib/auth-store.ts             Sesión del cliente
```

El monto **siempre** se calcula en el servidor desde el catálogo de la base. El navegador
no manda precios.

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
| `lib/suscripcion.test.ts` | Fechas, prepago, montos, regalo, decisión diaria del ciclo, renovación |
| `lib/suscripcion-acciones.test.ts` | Máquina de estados, pausar, saltar, cambiar, cancelar, retención, cobro aprobado o rechazado, reintentos |
| `lib/quiz.test.ts` | Recomendación de plan, frecuencia, molienda y perfil; validación |
| `lib/wompi.test.ts` | Firma de integridad contra el ejemplo de la doc, validación del webhook |
| `lib/flags.test.ts` | Navegación y rutas con el flag apagado |
| `data/content.test.ts` | Cero videos, ficha completa del catálogo, tono del copy |

Los tests usan un catálogo sintético (`lib/catalogo.fixture.ts`) con precios distintos a
los reales: un número escrito a mano en el código los hace fallar.

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

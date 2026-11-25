# Contrato de la API del inventario · Taza Maestra

Versión 1 · noviembre de 2026

Este documento define cómo se comunican la **web de Taza Maestra** (tienda y
portal de clientes) y el **software de inventario**. El inventario es la
**fuente de verdad** de pedidos y ventas; la web los crea y los consulta por
esta API.

| Vive en la web | Vive en el inventario |
|---|---|
| Catálogo y **precios** | **Pedidos** (de la tienda y de los clientes) |
| Cuentas de acceso de los clientes | **Ventas** confirmadas |
| Horas de capacitación (las calcula y las registra la web) | Clientes registrados (por NIT o cédula) y compradores ocasionales |

La versión en código de este contrato está en
[`lib/inventario-contrato.ts`](../lib/inventario-contrato.ts). Si cambia uno, debe cambiar el otro.

---

## 1. Conexión

- **Base URL:** la que defina el inventario, por ejemplo
  `https://<proyecto>.supabase.co/functions/v1/api`.
- **Autenticación:** todas las llamadas llevan
  `Authorization: Bearer <INVENTARIO_API_TOKEN>`. El token es un secreto
  compartido entre los dos sistemas. Sin él, o si no es válido, la respuesta es `401`.
- **Quién llama:** siempre el **servidor** de la web, nunca el navegador. El
  token no sale del servidor.
- **Formato:** JSON en UTF-8 (`Content-Type: application/json`).
- **Tiempo máximo:** la web espera **8 segundos**. Si no hay respuesta, trata
  la llamada como fallida.

En la web se configura con:

```env
INVENTARIO_API_URL=https://<proyecto>.supabase.co/functions/v1/api
INVENTARIO_API_TOKEN=<secreto>
```

La web no guarda pedidos. Si `INVENTARIO_API_URL` está vacía, no se pueden
hacer pedidos y las compras que se muestran son de ejemplo.

## 2. Convenciones

| Tema | Regla |
|---|---|
| Dinero | Pesos colombianos, **enteros** (`150000`, no `150000.00` ni `"$150.000"`) |
| Fechas | ISO 8601. `fecha` de solo día: `"2026-11-18"`. Fecha y hora: `"2026-11-18T15:04:05Z"` |
| Documento | NIT o cédula **sin puntos ni espacios**, en mayúsculas, con guion si lo tiene: `"900123456-7"`, `"1088123456"` |
| Presentación | `"bolsa"` (450 g o 220 g) o `"cuarteron"` (2.250 g) |
| Gramos | Siempre se envían: `450`, `220` o `2250` |
| Molienda | Solo en pedidos desde la cuenta, por ítem: `"grano"` o `"molido"` |

### Productos

La web identifica cada café con un código fijo. El inventario debe guardar la
equivalencia con sus propias referencias.

| `producto` (código web) | Nombre | Presentaciones |
|---|---|---|
| `la-esperanza` | Casa Roja | `bolsa` 450 g, `bolsa` 220 g, `cuarteron` 2.250 g |
| `santa-rita` | Chambrana | `bolsa` 450 g, `bolsa` 220 g, `cuarteron` 2.250 g |

Las dos bolsas viajan con `presentacion: "bolsa"`; las distingue `gramos`
(450 o 220). El inventario debe mapear `producto` + `presentacion` + `gramos`
a su referencia.

## 3. Endpoints

### 3.1 Crear un pedido — `POST /pedidos`

La web lo llama cuando un cliente hace un pedido desde su cuenta
(`origen: "cuenta"`) o cuando alguien compra en la tienda (`origen: "tienda"`).

**Cuerpo:**

```json
{
  "referencia_web": "PED-LX3K9A2F-8QZ4M1",
  "origen": "tienda",
  "cliente": { "tipo": "registrado", "documento": "900123456-7" },
  "contacto": {
    "nombre": "Ana Gómez · Café La Esquina",
    "email": "ana@cafelaesquina.co",
    "telefono": "3001234567"
  },
  "entrega": {
    "direccion": "Calle 12 #4-56, local 2",
    "ciudad": "Pereira",
    "departamento": "Risaralda",
    "notas": "Recibir de 8 a 11 a. m."
  },
  "items": [
    { "producto": "santa-rita", "nombre": "Chambrana", "presentacion": "cuarteron", "gramos": 2250, "cantidad": 3, "precio_unitario": 150000 },
    { "producto": "la-esperanza", "nombre": "Casa Roja", "presentacion": "bolsa", "gramos": 450, "cantidad": 2, "precio_unitario": 50000 }
  ],
  "total": 550000,
  "moneda": "COP",
  "creado_en": "2026-11-18T15:04:05Z"
}
```

**El campo `cliente` tiene dos formas:**

| Caso | Valor | Qué hace el inventario |
|---|---|---|
| Cliente con cuenta | `{ "tipo": "registrado", "documento": "900123456-7" }` | Asocia el pedido a ese cliente. Si el documento no existe, responde `404 cliente_no_encontrado`. |
| Comprador de la tienda sin cuenta | `{ "tipo": "ocasional" }` | Lo registra como **cliente ocasional**, con los datos de `contacto`. |

**Entrega:** en compras de la tienda (`origen: "tienda"`) `entrega` viene
siempre. En los pedidos desde la cuenta (`origen: "cuenta"`) es
**opcional**: el cliente va identificado por `cliente.id` o
`cliente.documento`, y si no viene `entrega` el inventario usa la dirección
que ya tiene registrada para él. Solo viene `entrega` cuando el cliente
pidió enviarlo **a otra dirección**. Puede venir también un campo suelto
`notas` (texto, máx. 300, opcional) con indicaciones del cliente (horario de
recibo, quién recibe…). El inventario **no** debe responder
`400 validacion` por falta de `entrega` en un pedido `origen: "cuenta"`.

**Molienda:** en los pedidos desde la cuenta cada ítem trae
`molienda: "grano" | "molido"`. En la tienda no viene (se asume en grano).

```json
{
  "referencia_web": "PED-LX3K9A2F-8QZ4M1",
  "origen": "cuenta",
  "cliente": { "tipo": "registrado", "id": "6f1c2a0e-…", "documento": "900123456-7" },
  "contacto": { "nombre": "Ana Gómez · Café La Esquina", "email": "ana@cafelaesquina.co", "telefono": "3001234567" },
  "notas": "Recibir de 8 a 11 a. m.",
  "items": [
    { "producto": "santa-rita", "nombre": "Chambrana", "presentacion": "cuarteron", "gramos": 2250, "cantidad": 3, "precio_unitario": 150000, "molienda": "molido" },
    { "producto": "la-esperanza", "nombre": "Casa Roja", "presentacion": "bolsa", "gramos": 220, "cantidad": 4, "precio_unitario": 20000, "molienda": "grano" }
  ],
  "total": 530000,
  "moneda": "COP",
  "creado_en": "2026-11-25T15:04:05Z"
}
```

**Precios:** `precio_unitario` y `total` los calcula la web, que es la dueña
de los precios. El inventario los guarda tal cual. Si quiere, puede verificar
que `total` sea la suma de `cantidad × precio_unitario`; si no cuadra,
responde `400 validacion`.

**Respuesta `201 Created`** (pedido nuevo) o **`200 OK`** (ya existía, ver
idempotencia):

```json
{
  "id": "6f1c2a0e-…",
  "numero": "P-000123",
  "referencia_web": "PED-LX3K9A2F-8QZ4M1",
  "origen": "cuenta",
  "estado": "pendiente",
  "creado_en": "2026-11-18T15:04:06Z",
  "total": 530000,
  "entrega": { "direccion": "Calle 12 #4-56, local 2", "ciudad": "Pereira", "departamento": "Risaralda", "notas": "Recibir de 8 a 11 a. m." },
  "items": [
    { "producto": "santa-rita", "nombre": "Chambrana", "presentacion": "cuarteron", "gramos": 2250, "cantidad": 3, "precio_unitario": 150000 },
    { "producto": "la-esperanza", "nombre": "Casa Roja", "presentacion": "bolsa", "gramos": 220, "cantidad": 4, "precio_unitario": 20000, "molienda": "grano" }
  ]
}
```

En un pedido desde la cuenta sin otra dirección, `entrega` puede venir con
la dirección registrada del cliente o no venir.
```

#### Idempotencia (obligatoria)

`referencia_web` es **única**. Si llega un pedido con una referencia que ya
existe, el inventario **no crea otro**: responde `200` con el pedido que ya
tiene. Así un doble clic o un reintento después de un corte de red no duplican
pedidos. En la base del inventario, `referencia_web` debe tener un índice único.

### 3.2 Pedidos de un cliente — `GET /clientes/{documento}/pedidos`

Para la sección **"Tus pedidos"** de la cuenta del cliente y para su ficha en
el panel. Incluye todos los pedidos del cliente, también los creados
directamente en el inventario (`origen: "inventario"`), del más reciente al
más antiguo.

**Parámetros opcionales:** `?limite=50` (por defecto 50).

**Respuesta `200`:**

```json
{
  "pedidos": [
    {
      "id": "6f1c2a0e-…",
      "numero": "P-000123",
      "referencia_web": "PED-LX3K9A2F-8QZ4M1",
      "origen": "cuenta",
      "estado": "enviado",
      "creado_en": "2026-11-18T15:04:06Z",
      "total": 530000,
      "entrega": { "direccion": "…", "ciudad": "Pereira", "departamento": "Risaralda", "notas": "" },
      "items": [ { "producto": "santa-rita", "nombre": "Chambrana", "presentacion": "cuarteron", "gramos": 2250, "cantidad": 3, "precio_unitario": 150000 } ]
    }
  ]
}
```

Si el cliente no existe: `404 cliente_no_encontrado`. La web lo muestra como
"sin pedidos".

### 3.3 Un pedido por su referencia — `GET /pedidos/{referencia_web}`

Para la pantalla de confirmación, después de comprar en la tienda.

**Respuesta `200`:** el pedido, con la misma forma de 3.1.
**`404 pedido_no_encontrado`** si no existe.

### 3.3b Clientes — `GET /clientes?buscar=texto` y `GET /clientes/{clave}`

Para vincular cada cuenta de la web con su cliente del inventario (migración
0041 del inventario). La web guarda el **ID** del cliente; desde entonces
`{clave}` en todas las rutas `/clientes/{clave}/…` es ese ID. También se
acepta el NIT o cédula (clientes sin vincular).

```json
{ "clientes": [ { "id": "6f1c…", "nombre": "Yami Castaño", "negocio": "La Inglesa", "documento": "900555111-2", "email": "…", "telefono": "…", "ciudad": "Pereira" } ] }
```

`GET /clientes/{clave}` devuelve un solo cliente con esa forma, o `404`.
En `POST /pedidos`, un cliente vinculado va como
`{ "tipo": "registrado", "id": "6f1c…" }`.

### 3.4 Compras confirmadas de un cliente — `GET /clientes/{documento}/compras`

Con esto la web calcula las **horas de capacitación**. Debe devolver solo las
**ventas confirmadas** (facturadas o pagadas), no los pedidos pendientes ni
los cancelados.

**Parámetros opcionales:** `?desde=2026-01-01`.

**Respuesta `200`:**

```json
{
  "compras": [
    { "id": "V-0456-1", "fecha": "2026-11-08", "producto": "santa-rita", "presentacion": "cuarteron", "gramos": 2250, "cantidad": 2, "total": 300000 },
    { "id": "V-0431-1", "fecha": "2026-10-20", "producto": "la-esperanza", "presentacion": "bolsa", "gramos": 450, "cantidad": 4, "total": 160000 }
  ]
}
```

- **Solo las ventas de ese cliente, por su ID** (`ventas.cliente_id`, migración 0040 del inventario), no por el texto del nombre.
- **Una fila por producto vendido:** si una factura tiene dos productos, son dos filas.
- **Todos los cafés cuentan** (migración 0042 del inventario): Casa Roja y Chambrana llegan con su código web; los demás, con su nombre del inventario. Un lote de 2250 g es `cuarteron` y suma horas, sea cual sea el café.
- **`fecha` es la de la venta:** la web la usa para el **bono mensual**, así que debe ser la fecha real.
- **Si el cliente no existe:** `404`. La web lo trata como "sin compras".

**Cómo calcula la web las horas** (para que el inventario no tenga que hacerlo):
- 1 hora por cada **3 cuarterones** (`gramos: 2250`), sumando todo.
- 1 hora **de regalo** por cada **8 cuarterones** comprados dentro de un mismo mes calendario.

### 3.5 Resultado del pago — `PATCH /pedidos/{referencia_web}/pago`

Solo aplica cuando la tienda tenga **pasarela de pago** (Wompi). La web
informa el resultado cuando lo recibe.

**Cuerpo:**

```json
{ "estado": "pagado", "pasarela": "wompi", "transaccion": "12345-1668624561-38705", "monto": 530000 }
```

`estado` es `"pagado"` o `"fallido"`.

**Respuesta `200`:** el pedido actualizado.

- **Puede llegar repetido:** Wompi reintenta. Aplicar el mismo pago dos veces no debe cambiar nada.
- **No retrocede estados:** un pedido ya `enviado`, `entregado` o `cancelado` no vuelve a `pagado`.
- **Si el inventario no responde `200`,** la web lo reintenta con el siguiente reintento de Wompi.

## 4. Estados de un pedido

| Estado | Significado | Lo ve el cliente como |
|---|---|---|
| `pendiente` | Recién creado; falta confirmar pago | Pendiente de pago |
| `confirmado` | El equipo lo aceptó (pago por fuera, crédito…) | Confirmado |
| `pagado` | Pago recibido | Pagado |
| `enviado` | Despachado | Enviado |
| `entregado` | Recibido por el cliente | Entregado |
| `cancelado` | Anulado | Cancelado |

Los cambios de estado se hacen **en el inventario**. La web solo los muestra.

## 5. Errores

Todas las respuestas de error tienen esta forma:

```json
{ "error": "validacion", "mensaje": "Falta la dirección", "campos": { "entrega.direccion": "requerido" } }
```

| HTTP | `error` | Cuándo |
|---|---|---|
| 400 | `validacion` | Falta un campo, un tipo no corresponde o el total no cuadra |
| 401 | `no_autorizado` | Falta el token o es inválido |
| 404 | `cliente_no_encontrado` | El documento no existe (en `POST /pedidos` con cliente registrado, y en las consultas por cliente) |
| 404 | `pedido_no_encontrado` | La referencia no existe |
| 500 | `interno` | Error del inventario |

**Qué hace la web en cada caso:**
- **`400`:** muestra "revisa los datos".
- **`404 cliente_no_encontrado` al crear un pedido:** le pide al cliente que escriba al equipo, porque su NIT no está registrado.
- **`401`, `500` o sin respuesta:** dice "no pudimos registrar tu pedido, intenta en un momento". **No** guarda el pedido a medias.

## 6. Lista de verificación para el inventario

- [ ] El token se valida en **todas** las rutas.
- [ ] `referencia_web` tiene índice **único** y un `POST` repetido devuelve el pedido existente con `200`.
- [ ] Los compradores ocasionales quedan registrados con sus datos de `contacto`.
- [ ] Existe la tabla de equivalencias entre productos (`la-esperanza`, `santa-rita`) y referencias del inventario.
- [ ] `GET /compras` devuelve solo ventas confirmadas, con la fecha real de la venta.
- [ ] Los documentos se guardan normalizados (sin puntos ni espacios, en mayúsculas).
- [ ] Los errores usan la forma de la sección 5.
- [ ] Un `POST /pedidos` con `origen: "cuenta"` **sin `entrega`** se acepta y usa la dirección registrada del cliente.
- [ ] Se acepta `notas` suelto (opcional) y `molienda` (`"grano"` / `"molido"`) en cada ítem.
- [ ] La tabla de equivalencias distingue la bolsa de **450 g** y la de **220 g** (por `gramos`).

## 7. Probar con curl

```bash
TOKEN=...; API=https://<proyecto>.supabase.co/functions/v1/api

# Crear (repetirlo debe devolver el mismo pedido con 200)
curl -s -X POST "$API/pedidos" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"referencia_web":"PED-PRUEBA-0001","origen":"tienda","cliente":{"tipo":"ocasional"},
       "contacto":{"nombre":"Prueba","email":"prueba@correo.co","telefono":"3000000000"},
       "entrega":{"direccion":"Calle 1 #2-3","ciudad":"Pereira","departamento":"Risaralda","notas":""},
       "items":[{"producto":"santa-rita","nombre":"Chambrana","presentacion":"bolsa","gramos":450,"cantidad":1,"precio_unitario":40000}],
       "total":40000,"moneda":"COP","creado_en":"2026-11-18T15:00:00Z"}'

curl -s "$API/pedidos/PED-PRUEBA-0001" -H "Authorization: Bearer $TOKEN"
curl -s "$API/clientes/900123456-7/pedidos" -H "Authorization: Bearer $TOKEN"
curl -s "$API/clientes/900123456-7/compras" -H "Authorization: Bearer $TOKEN"
```

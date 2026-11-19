// Conexión con el software de inventario: compras y pedidos. SOLO SERVIDOR.
// El contrato de la API está en docs/contrato-api-inventario.md (y en tipos,
// en lib/inventario-contrato.ts).
//
// Configuración (.env.local / variables de Vercel):
//   INVENTARIO_API_URL     Base de la API, ej. https://xxxx.supabase.co/functions/v1/api
//   INVENTARIO_API_TOKEN   Se manda como "Authorization: Bearer <token>"
//   INVENTARIO_RUTA        Ruta de compras; {documento} se reemplaza por el NIT
//                          o cédula. Por defecto: /clientes/{documento}/compras
//   INVENTARIO_MOCK=1      Compras simuladas aunque haya API configurada.
//
// Sin INVENTARIO_API_URL, las compras son SIMULADAS: cada cliente ve un
// historial de ejemplo propio (sale de su NIT, así que siempre es el mismo)
// y la pantalla lo marca como datos de ejemplo.
//
// La respuesta puede ser un arreglo o { compras | data | items: [...] }.
// Los nombres de campo se aceptan en varias formas (ver `normalizar`), así
// que la API del inventario no tiene que calzar exacto. Si algo no cuadra,
// este es el único archivo que hay que tocar.

import { esLineaCuarteron } from "@/lib/capacitacion";
import { products } from "@/lib/content";
import type { CompraInventario, EstadoPedido, Pedido } from "@/lib/types";
import type {
  ClienteInventario, CrearPedidoInventario, ErrorInventario, EstadoPedidoInventario, PagoPedidoInventario, PedidoInventario,
} from "@/lib/inventario-contrato";

export type EstadoInventario = "ok" | "sin_configurar" | "sin_documento" | "no_registrado" | "error";

const TIEMPO_MAXIMO_MS = 8000;

function primero(f: Record<string, unknown>, claves: string[]): unknown {
  for (const k of claves) if (f[k] !== undefined && f[k] !== null && f[k] !== "") return f[k];
  return undefined;
}

/**
 * Número de la API: acepta 300000, "300000", "$300.000" (formato
 * colombiano, punto de miles) y "1,234.50" (formato en inglés).
 */
function numero(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).replace(/[^\d.,-]/g, "");
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else s = s.replace(",", ".");
  const n = Number(s);
  return s && Number.isFinite(n) ? n : null;
}

/** Una línea cualquiera del inventario → CompraInventario. */
export function normalizar(f: Record<string, unknown>, i: number): CompraInventario {
  const crudo = String(primero(f, ["producto", "nombre", "descripcion", "product", "item", "referencia"]) ?? "Producto");
  // El contrato manda el código del café ("santa-rita"): se muestra su nombre.
  const producto = products.find((p) => p.id === crudo)?.name ?? crudo;
  const presCruda = String(primero(f, ["presentacion", "presentación", "empaque", "unidad"]) ?? "");
  const presentacion = presCruda === "cuarteron" ? "cuarterón" : presCruda;
  const gramos = numero(primero(f, ["gramos", "peso_g", "pesoG", "peso", "gramaje"]));
  const fechaCruda = String(primero(f, ["fecha", "date", "creado_en", "created_at", "fecha_venta"]) ?? "");
  const fecha = Number.isNaN(Date.parse(fechaCruda)) ? "" : new Date(fechaCruda).toISOString().slice(0, 10);
  return {
    id: String(primero(f, ["id", "codigo", "numero", "factura"]) ?? `linea-${i}`),
    fecha,
    producto: presentacion ? `${producto} · ${presentacion}` : producto,
    gramos,
    cantidad: numero(primero(f, ["cantidad", "qty", "unidades", "quantity"])) ?? 1,
    totalCop: numero(primero(f, ["total", "total_cop", "valor", "valor_total", "subtotal"])),
    esCuarteron: esLineaCuarteron(gramos, `${producto} ${presentacion}`),
  };
}

// ── Compras simuladas ──────────────────────────────────────────────────────

/** Generador pseudoaleatorio con semilla: el mismo NIT da siempre lo mismo. */
function semilla(texto: string): () => number {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const CATALOGO_SIMULADO = [
  { producto: "Chambrana cuarterón", gramos: 2250, precio: 150000 },
  { producto: "Casa Roja cuarterón", gramos: 2250, precio: 200000 },
  { producto: "Chambrana bolsa", gramos: 340, precio: 30000 },
  { producto: "Casa Roja bolsa", gramos: 340, precio: 40000 },
];

/**
 * Seis meses de compras de ejemplo, hasta `hoy`. Uno de los meses pasados
 * llega a 8 cuarterones o más, para que se vea la hora de regalo; el mes en
 * curso va a medias, para que se vea cuánto le falta.
 */
export function comprasSimuladas(documento: string, hoy: Date = new Date()): CompraInventario[] {
  const azar = semilla(documento);
  const entero = (min: number, max: number) => min + Math.floor(azar() * (max - min + 1));
  const mesFuerte = entero(1, 4);
  const lineas: Record<string, unknown>[] = [];

  for (let atras = 5; atras >= 0; atras--) {
    const inicio = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - atras, 1));
    const diasDelMes = atras === 0 ? hoy.getUTCDate() : new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 0)).getUTCDate();
    // Cuarterones del mes: uno fuerte (8–10), el actual flojo (1–5), el resto 2–6.
    let cuarterones = atras === mesFuerte ? entero(8, 10) : atras === 0 ? entero(1, 5) : entero(2, 6);
    let n = 0;
    while (cuarterones > 0) {
      const cantidad = Math.min(cuarterones, entero(1, 4));
      cuarterones -= cantidad;
      const item = CATALOGO_SIMULADO[entero(0, 1)];
      const dia = Math.min(diasDelMes, entero(1, diasDelMes));
      const fecha = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), dia)).toISOString().slice(0, 10);
      lineas.push({ id: `SIM-${fecha.replace(/-/g, "")}-${++n}`, fecha, producto: item.producto, gramos: item.gramos, cantidad, total: item.precio * cantidad });
    }
    // De vez en cuando, también bolsas pequeñas (no suman horas).
    if (azar() < 0.4) {
      const item = CATALOGO_SIMULADO[entero(2, 3)];
      const cantidad = entero(2, 6);
      const fecha = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), Math.min(diasDelMes, entero(1, 28)))).toISOString().slice(0, 10);
      lineas.push({ id: `SIM-${fecha.replace(/-/g, "")}-${++n}`, fecha, producto: item.producto, gramos: item.gramos, cantidad, total: item.precio * cantidad });
    }
  }

  return lineas.map(normalizar).sort((a, b) => b.fecha.localeCompare(a.fecha) || a.id.localeCompare(b.id));
}

/**
 * Con qué se busca al cliente en el inventario: su ID si está vinculado
 * (no depende del NIT ni del nombre) o, si no, su NIT o cédula. La API
 * acepta los dos en /clientes/{clave}.
 */
export function claveInventario(cliente: { inventarioId: string | null; documento: string }): string {
  return cliente.inventarioId || cliente.documento;
}

/** `clave`: ID del cliente en el inventario o su NIT (ver claveInventario). */
export async function obtenerCompras(
  clave: string
): Promise<{ estado: EstadoInventario; compras: CompraInventario[]; simuladas: boolean }> {
  if (!clave) return { estado: "sin_documento", compras: [], simuladas: false };

  const base = process.env.INVENTARIO_API_URL;
  if (!base || process.env.INVENTARIO_MOCK === "1") {
    return { estado: "ok", compras: comprasSimuladas(clave), simuladas: true };
  }

  const ruta = (process.env.INVENTARIO_RUTA ?? "/clientes/{documento}/compras")
    .replace("{documento}", encodeURIComponent(clave));
  const token = process.env.INVENTARIO_API_TOKEN;

  try {
    const r = await fetch(`${base.replace(/\/$/, "")}${ruta}`, {
      headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
    // El inventario no conoce ese cliente: sin compras, y el panel lo avisa.
    if (r.status === 404) return { estado: "no_registrado", compras: [], simuladas: false };
    if (!r.ok) return { estado: "error", compras: [], simuladas: false };

    const cuerpo = (await r.json()) as unknown;
    const lista = Array.isArray(cuerpo)
      ? cuerpo
      : ((cuerpo as Record<string, unknown>)?.compras ??
         (cuerpo as Record<string, unknown>)?.data ??
         (cuerpo as Record<string, unknown>)?.items);
    if (!Array.isArray(lista)) return { estado: "error", compras: [], simuladas: false };

    const compras = lista
      .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
      .map(normalizar)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    return { estado: "ok", compras, simuladas: false };
  } catch (e) {
    console.error("[inventario] No se pudo leer compras:", e);
    return { estado: "error", compras: [], simuladas: false };
  }
}

// ── Pedidos (contrato en docs/contrato-api-inventario.md) ─────────────────

/** ¿Hay API de inventario configurada? Sin ella, la web usa su respaldo local. */
export function inventarioConectado(): boolean {
  return Boolean(process.env.INVENTARIO_API_URL);
}

type RespuestaApi<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: ErrorInventario | null };

/** Llamada a la API con la llave, tiempo máximo y JSON. Nunca lanza. */
async function llamarInventario<T>(ruta: string, init: { method?: string; body?: unknown } = {}): Promise<RespuestaApi<T>> {
  const base = (process.env.INVENTARIO_API_URL ?? "").replace(/\/$/, "");
  const token = process.env.INVENTARIO_API_TOKEN;
  try {
    const r = await fetch(`${base}${ruta}`, {
      method: init.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
    const cuerpo = (await r.json().catch(() => null)) as unknown;
    if (!r.ok) return { ok: false, status: r.status, error: (cuerpo as ErrorInventario) ?? null };
    return { ok: true, status: r.status, data: cuerpo as T };
  } catch (e) {
    console.error(`[inventario] ${init.method ?? "GET"} ${ruta} falló:`, e);
    return { ok: false, status: 0, error: null };
  }
}

const ESTADOS_WEB: Record<EstadoPedidoInventario, EstadoPedido> = {
  pendiente: "pendiente",
  confirmado: "confirmado",
  pagado: "pagado",
  enviado: "enviado",
  entregado: "entregado",
  cancelado: "cancelado",
};

/** Pedido del inventario → Pedido de la web (para "Tus pedidos" y la ficha). */
export function aPedidoWeb(p: PedidoInventario, clienteId: string | null): Pedido {
  return {
    id: p.id,
    creadoEn: p.creado_en,
    clienteId,
    email: "",
    nombre: "",
    telefono: "",
    linea: p.entrega?.direccion ?? "",
    ciudad: p.entrega?.ciudad ?? "",
    departamento: p.entrega?.departamento ?? "",
    notas: p.entrega?.notas ?? "",
    items: (p.items ?? []).map((i) => ({
      cafe: i.producto,
      nombre: i.nombre,
      presentacion: i.presentacion === "cuarteron" ? "negocio" : "bolsa",
      pesoG: i.gramos,
      cantidad: i.cantidad,
      precioCop: i.precio_unitario,
    })),
    totalCop: p.total,
    estado: ESTADOS_WEB[p.estado] ?? "pendiente",
    referencia: p.numero || p.referencia_web || p.id,
  };
}

/**
 * POST /pedidos. Idempotente por `referencia_web`: si la web reintenta, el
 * inventario devuelve el mismo pedido en vez de crear otro.
 */
export async function crearPedidoEnInventario(
  pedido: CrearPedidoInventario
): Promise<{ ok: true; pedido: PedidoInventario } | { ok: false; motivo: "validacion" | "cliente_no_encontrado" | "no_disponible"; campos?: Record<string, string> }> {
  const r = await llamarInventario<PedidoInventario>("/pedidos", { method: "POST", body: pedido });
  if (r.ok) return { ok: true, pedido: r.data };
  if (r.error?.error === "validacion") return { ok: false, motivo: "validacion", campos: r.error.campos };
  if (r.error?.error === "cliente_no_encontrado") return { ok: false, motivo: "cliente_no_encontrado" };
  return { ok: false, motivo: "no_disponible" };
}

/** GET /clientes/{clave}/pedidos. null si el inventario no respondió. */
export async function pedidosDeCliente(clave: string): Promise<PedidoInventario[] | null> {
  if (!clave) return [];
  const r = await llamarInventario<{ pedidos: PedidoInventario[] }>(`/clientes/${encodeURIComponent(clave)}/pedidos`);
  if (r.ok) return Array.isArray(r.data?.pedidos) ? r.data.pedidos : [];
  if (r.status === 404) return [];
  return null;
}

/** PATCH /pedidos/{referencia_web}/pago: resultado de la pasarela. */
export async function informarPagoAlInventario(referenciaWeb: string, pago: PagoPedidoInventario): Promise<boolean> {
  const r = await llamarInventario(`/pedidos/${encodeURIComponent(referenciaWeb)}/pago`, { method: "PATCH", body: pago });
  return r.ok;
}

/** GET /pedidos/{referencia_web}: para la pantalla de confirmación. */
export async function pedidoPorReferencia(referenciaWeb: string): Promise<PedidoInventario | null> {
  const r = await llamarInventario<PedidoInventario>(`/pedidos/${encodeURIComponent(referenciaWeb)}`);
  return r.ok ? r.data : null;
}

// ── Clientes del inventario (vincular desde el panel) ─────────────────────

/** GET /clientes?buscar=: para elegir el cliente del inventario. null si no respondió. */
export async function buscarClientesInventario(texto: string): Promise<ClienteInventario[] | null> {
  if (!inventarioConectado()) return null;
  const q = new URLSearchParams({ buscar: texto.slice(0, 100), limite: "20" });
  const r = await llamarInventario<{ clientes: ClienteInventario[] }>(`/clientes?${q}`);
  return r.ok ? (Array.isArray(r.data?.clientes) ? r.data.clientes : []) : null;
}

/** GET /clientes/{clave}: el cliente por su ID o su NIT, leído en vivo. */
export async function clienteDelInventario(
  clave: string
): Promise<{ estado: "ok"; cliente: ClienteInventario } | { estado: "no_encontrado" | "error" }> {
  if (!clave || !inventarioConectado()) return { estado: "error" };
  const r = await llamarInventario<ClienteInventario>(`/clientes/${encodeURIComponent(clave)}`);
  if (r.ok && r.data?.id) return { estado: "ok", cliente: r.data };
  return { estado: r.status === 404 ? "no_encontrado" : "error" };
}

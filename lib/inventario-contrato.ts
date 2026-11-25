// Contrato de la API del inventario: lo que la web envía y lo que espera
// recibir. Es la versión en código de docs/contrato-api-inventario.md; si
// cambia uno, cambia el otro.
//
// Convenciones: JSON en UTF-8, montos en pesos colombianos (enteros), fechas
// ISO 8601, documentos (NIT/cédula) sin puntos ni espacios y en mayúsculas.

/** Estados de un pedido en el inventario. */
export type EstadoPedidoInventario =
  | "pendiente"
  | "confirmado"
  | "pagado"
  | "enviado"
  | "entregado"
  | "cancelado";

export type PresentacionInventario = "bolsa" | "cuarteron";

export interface ItemPedidoInventario {
  /** Código del café en la web: "la-esperanza" (Casa Roja), "santa-rita" (Chambrana). */
  producto: string;
  /** Nombre para mostrar, ej. "Casa Roja". */
  nombre: string;
  /** "bolsa" cubre la de 450 g y la pequeña de 220 g: las distingue `gramos`. */
  presentacion: PresentacionInventario;
  gramos: number;
  cantidad: number;
  /** Precio por unidad que cobró la web (los precios viven en la web). */
  precio_unitario: number;
  /** En grano o molido. Solo en pedidos desde la cuenta. */
  molienda?: "grano" | "molido";
}

export interface EntregaInventario {
  direccion: string;
  ciudad: string;
  departamento: string;
  notas: string;
}

export interface ContactoInventario {
  nombre: string;
  email: string;
  telefono: string;
}

/**
 * Cliente con cuenta (por su ID en el inventario, o por NIT/cédula si aún
 * no está vinculado) o comprador ocasional de la tienda.
 */
export type ClientePedidoInventario =
  | { tipo: "registrado"; id?: string; documento?: string }
  | { tipo: "ocasional" };

/** Un cliente del inventario (GET /clientes/{clave} y GET /clientes?buscar=). */
export interface ClienteInventario {
  id: string;
  nombre: string;
  negocio: string | null;
  documento: string | null;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
}

/** POST /pedidos — cuerpo. */
export interface CrearPedidoInventario {
  /** Única por pedido. Si llega dos veces, el inventario devuelve el mismo pedido. */
  referencia_web: string;
  origen: "cuenta" | "tienda";
  cliente: ClientePedidoInventario;
  contacto: ContactoInventario;
  /**
   * A dónde va. Solo en compras de la tienda. En los pedidos desde la cuenta
   * (`origen: "cuenta"`) no viene: el inventario usa los datos del cliente.
   */
  entrega?: EntregaInventario;
  /** Indicaciones del cliente (molienda, horario de recibo…). Opcional. */
  notas?: string;
  items: ItemPedidoInventario[];
  total: number;
  moneda: "COP";
  creado_en: string;
}

/** Un pedido como lo devuelve el inventario. */
export interface PedidoInventario {
  id: string;
  /** Número visible del pedido en el inventario, ej. "P-000123". */
  numero: string;
  referencia_web: string | null;
  origen: "cuenta" | "tienda" | "inventario";
  estado: EstadoPedidoInventario;
  creado_en: string;
  total: number;
  /** Puede venir vacío en pedidos desde la cuenta (usa los datos del cliente). */
  entrega?: EntregaInventario | null;
  notas?: string | null;
  items: ItemPedidoInventario[];
}

/** PATCH /pedidos/{referencia_web}/pago — cuerpo (solo si hay pasarela de pago). */
export interface PagoPedidoInventario {
  estado: "pagado" | "fallido";
  pasarela: "wompi";
  transaccion: string;
  monto: number;
}

/** Una línea de venta confirmada (GET /clientes/{documento}/compras). */
export interface CompraInventarioApi {
  id: string;
  fecha: string;
  producto: string;
  presentacion: PresentacionInventario;
  gramos: number;
  cantidad: number;
  total: number;
}

/** Error estándar de la API. */
export interface ErrorInventario {
  error: "validacion" | "no_autorizado" | "cliente_no_encontrado" | "pedido_no_encontrado" | "interno";
  mensaje?: string;
  campos?: Record<string, string>;
}

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
  presentacion: PresentacionInventario;
  gramos: number;
  cantidad: number;
  /** Precio por unidad que cobró la web (los precios viven en la web). */
  precio_unitario: number;
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

/** Cliente con cuenta (por NIT/cédula) o comprador ocasional de la tienda. */
export type ClientePedidoInventario =
  | { tipo: "registrado"; documento: string }
  | { tipo: "ocasional" };

/** POST /pedidos — cuerpo. */
export interface CrearPedidoInventario {
  /** Única por pedido. Si llega dos veces, el inventario devuelve el mismo pedido. */
  referencia_web: string;
  origen: "cuenta" | "tienda";
  cliente: ClientePedidoInventario;
  contacto: ContactoInventario;
  entrega: EntregaInventario;
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
  entrega: EntregaInventario;
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

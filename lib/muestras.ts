// Solicitudes de muestra gratis (100 g; el cliente paga el envío).
// Funciones puras: las usan el formulario de la tienda (para avisar antes de
// mandar), la ruta pública que la guarda y el panel del equipo.

export const GRAMOS_MUESTRA = 100;

export const ESTADOS_MUESTRA = ["pendiente", "contactado", "enviada", "compro", "descartada"] as const;
export type EstadoMuestra = (typeof ESTADOS_MUESTRA)[number];

export const ETIQUETA_ESTADO: Record<EstadoMuestra, [string, string]> = {
  pendiente: ["Pendiente", "Pending"],
  contactado: ["Contactado", "Contacted"],
  enviada: ["Enviada", "Shipped"],
  compro: ["Compró", "Bought"],
  descartada: ["Descartada", "Dismissed"],
};

export type TipoSolicitante = "persona" | "negocio";

export interface DatosMuestra {
  nombre: string;
  telefono: string;
  email: string | null;
  ciudad: string;
  direccion: string;
  tipo: TipoSolicitante;
  negocio: string | null;
  cafe: string;
  mensaje: string | null;
}

export interface SolicitudMuestra extends DatosMuestra {
  id: string;
  creadoEn: string;
  estado: EstadoMuestra;
  notas: string | null;
}

/** Campo que no pasó la validación; el formulario lo usa para marcarlo. */
export class MuestraInvalida extends Error {
  constructor(public campo: keyof DatosMuestra) {
    super(campo);
    this.name = "MuestraInvalida";
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Deja solo dígitos y un + inicial: así se comparan los teléfonos repetidos. */
export function normalizarTelefono(v: string): string {
  const limpio = v.trim().replace(/[^\d+]/g, "");
  return limpio.startsWith("+") ? "+" + limpio.slice(1).replace(/\+/g, "") : limpio.replace(/\+/g, "");
}

/**
 * Valida lo que llega del formulario. `cafes` son los ids que se pueden
 * pedir (los de la tienda). Lanza MuestraInvalida con el primer campo malo.
 */
export function validarMuestra(crudo: unknown, cafes: string[]): DatosMuestra {
  const r = (crudo ?? {}) as Record<string, unknown>;
  const txt = (campo: keyof DatosMuestra, max: number, requerido: boolean): string | null => {
    const v = r[campo];
    if (v === undefined || v === null || v === "") {
      if (requerido) throw new MuestraInvalida(campo);
      return null;
    }
    if (typeof v !== "string") throw new MuestraInvalida(campo);
    const limpio = v.trim().replace(/\s+/g, " ");
    if (!limpio) {
      if (requerido) throw new MuestraInvalida(campo);
      return null;
    }
    if (limpio.length > max) throw new MuestraInvalida(campo);
    return limpio;
  };

  const nombre = txt("nombre", 80, true)!;
  if (nombre.length < 2) throw new MuestraInvalida("nombre");

  const telefono = normalizarTelefono(txt("telefono", 25, true)!);
  const digitos = telefono.replace(/\D/g, "").length;
  if (digitos < 7 || digitos > 15) throw new MuestraInvalida("telefono");

  const email = txt("email", 120, false);
  if (email && !EMAIL.test(email)) throw new MuestraInvalida("email");

  const ciudad = txt("ciudad", 80, true)!;
  const direccion = txt("direccion", 200, true)!;

  const tipo = r.tipo === "negocio" ? "negocio" : r.tipo === "persona" || r.tipo === undefined ? "persona" : null;
  if (!tipo) throw new MuestraInvalida("tipo");
  const negocio = txt("negocio", 100, tipo === "negocio");

  const cafe = typeof r.cafe === "string" ? r.cafe : "";
  if (!cafes.includes(cafe)) throw new MuestraInvalida("cafe");

  const mensaje = txt("mensaje", 500, false);

  return {
    nombre, telefono, email, ciudad, direccion, tipo,
    negocio: tipo === "negocio" ? negocio : null,
    cafe, mensaje,
  };
}

export function aSolicitud(f: Record<string, unknown>): SolicitudMuestra {
  const estado = ESTADOS_MUESTRA.includes(f.estado as EstadoMuestra) ? (f.estado as EstadoMuestra) : "pendiente";
  const opt = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    id: String(f.id),
    creadoEn: String(f.creado_en),
    nombre: String(f.nombre ?? ""),
    telefono: String(f.telefono ?? ""),
    email: opt(f.email),
    ciudad: String(f.ciudad ?? ""),
    direccion: String(f.direccion ?? ""),
    tipo: f.tipo === "negocio" ? "negocio" : "persona",
    negocio: opt(f.negocio),
    cafe: String(f.cafe ?? ""),
    mensaje: opt(f.mensaje),
    estado,
    notas: opt(f.notas),
  };
}

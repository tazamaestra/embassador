// Clientes y capacitaciones: conversión de filas y validación de lo que
// manda el panel. Funciones puras, sin red.

import type { Capacitacion, Cliente } from "./types";

export class DatoInvalido extends Error {
  constructor(public campo: string) {
    super(campo);
    this.name = "DatoInvalido";
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const texto = (v: unknown) => (typeof v === "string" ? v : "");

export function aCliente(f: Record<string, unknown>): Cliente {
  return {
    id: String(f.id),
    email: texto(f.email),
    nombre: texto(f.nombre),
    telefono: texto(f.telefono),
    negocio: texto(f.negocio),
    documento: texto(f.documento),
    ciudad: texto(f.ciudad),
    notas: texto(f.notas),
    activo: f.activo !== false,
    creadoEn: String(f.creado_en ?? ""),
  };
}

export function aCapacitacion(f: Record<string, unknown>): Capacitacion {
  return {
    id: String(f.id),
    clienteId: String(f.cliente_id),
    fecha: String(f.fecha ?? "").slice(0, 10),
    horas: Number(f.horas ?? 0),
    tema: texto(f.tema),
    notas: texto(f.notas),
  };
}

/** Deja el NIT o la cédula sin puntos, espacios ni guiones de más. */
export function normalizarDocumento(v: string): string {
  return v.trim().replace(/[.\s]/g, "").toUpperCase();
}

export interface DatosCliente {
  email: string;
  nombre: string;
  telefono: string;
  negocio: string;
  documento: string;
  ciudad: string;
  notas: string;
  activo: boolean;
}

/**
 * Valida la ficha que manda el panel. `parcial` = edición: solo se validan
 * los campos que vienen. Devuelve solo esos campos.
 */
export function validarCliente(crudo: unknown, parcial = false): Partial<DatosCliente> {
  const r = (crudo ?? {}) as Record<string, unknown>;
  const out: Partial<DatosCliente> = {};
  const txt = (campo: keyof DatosCliente, max: number, requerido: boolean) => {
    const v = r[campo];
    if (v === undefined) {
      if (requerido && !parcial) throw new DatoInvalido(campo);
      return;
    }
    if (typeof v !== "string") throw new DatoInvalido(campo);
    const limpio = v.trim().replace(/\s+/g, " ");
    if (limpio.length > max || (requerido && !limpio)) throw new DatoInvalido(campo);
    (out as Record<string, unknown>)[campo] = limpio;
  };

  txt("email", 160, true);
  if (out.email !== undefined) {
    out.email = out.email.toLowerCase();
    if (!EMAIL.test(out.email)) throw new DatoInvalido("email");
  }
  txt("nombre", 100, true);
  txt("documento", 30, true);
  if (out.documento !== undefined) {
    out.documento = normalizarDocumento(out.documento);
    if (!/^[0-9A-Z-]{4,30}$/.test(out.documento)) throw new DatoInvalido("documento");
  }
  txt("telefono", 30, false);
  txt("negocio", 120, false);
  txt("ciudad", 80, false);
  txt("notas", 2000, false);
  if (r.activo !== undefined) {
    if (typeof r.activo !== "boolean") throw new DatoInvalido("activo");
    out.activo = r.activo;
  }
  return out;
}

export interface DatosCapacitacion {
  fecha: string;
  horas: number;
  tema: string;
  notas: string;
}

export function validarCapacitacion(crudo: unknown): DatosCapacitacion {
  const r = (crudo ?? {}) as Record<string, unknown>;
  const fecha = typeof r.fecha === "string" ? r.fecha : "";
  if (!FECHA.test(fecha) || Number.isNaN(Date.parse(fecha))) throw new DatoInvalido("fecha");
  const horas = Number(r.horas);
  // De a media hora, hasta 12 horas por sesión.
  if (!Number.isFinite(horas) || horas <= 0 || horas > 12 || Math.round(horas * 2) !== horas * 2) {
    throw new DatoInvalido("horas");
  }
  const tema = typeof r.tema === "string" ? r.tema.trim() : "";
  if (!tema || tema.length > 160) throw new DatoInvalido("tema");
  const notas = typeof r.notas === "string" ? r.notas.trim() : "";
  if (notas.length > 1000) throw new DatoInvalido("notas");
  return { fecha, horas, tema, notas };
}

/** Clave temporal para una cuenta nueva: 12 caracteres sin confusiones (0/O, 1/l). */
export function generarClave(
  aleatorio: (n: number) => number = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n
): string {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += letras[aleatorio(letras.length)];
  return s;
}

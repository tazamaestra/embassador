// Lo que el equipo edita de cada café desde el panel, y cómo se aplica sobre
// el catálogo base de data/content.json. Funciones puras: las usan el
// servidor (para pintar y para cobrar) y el panel (para validar antes de
// mandar). La tabla está en supabase/sql/cafe_ediciones.sql.

import type { Product } from "./types";

export const BUCKET_CAFES = "cafes";

/** Una fila de cafe_ediciones. null = se usa el valor del JSON. */
export interface EdicionCafe {
  productoSlug: string;
  nombre: string | null;
  precioCop: number | null;
  precioSuscriptorCop: number | null;
  precioUsd: number | null;
  precioSuscriptorUsd: number | null;
  notasEs: string | null;
  notasEn: string | null;
  propositoEs: string | null;
  propositoEn: string | null;
  fotoPath: string | null;
  fotoAncho: number | null;
  fotoAlto: number | null;
}

export type FilaEdicion = Record<string, unknown>;

const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const numero = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

export function aEdicion(f: FilaEdicion): EdicionCafe {
  return {
    productoSlug: String(f.producto_slug),
    nombre: texto(f.nombre),
    precioCop: numero(f.precio_cop),
    precioSuscriptorCop: numero(f.precio_suscriptor_cop),
    precioUsd: numero(f.precio_usd),
    precioSuscriptorUsd: numero(f.precio_suscriptor_usd),
    notasEs: texto(f.notas_es),
    notasEn: texto(f.notas_en),
    propositoEs: texto(f.proposito_es),
    propositoEn: texto(f.proposito_en),
    fotoPath: texto(f.foto_path),
    fotoAncho: numero(f.foto_ancho),
    fotoAlto: numero(f.foto_alto),
  };
}

/** URL pública de un archivo del bucket de cafés. */
export function urlFotoCafe(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${BUCKET_CAFES}/${path}`;
}

/**
 * El `src` de la foto de un café. Las del repo vienen como "assets/x.png" y
 * se sirven de /public; las que sube el panel ya son URL completas.
 */
export function srcImagen(img: string): string {
  return /^https?:\/\//.test(img) ? img : `/${img.replace("assets/", "")}`;
}

/** El catálogo con lo editado encima. Lo que no se editó queda como en el JSON. */
export function aplicarEdiciones(base: Product[], ediciones: EdicionCafe[]): Product[] {
  const porSlug = new Map(ediciones.map((e) => [e.productoSlug, e]));
  return base.map((p) => {
    const e = porSlug.get(p.id);
    if (!e) return p;
    return {
      ...p,
      name: e.nombre ?? p.name,
      precioCop: e.precioCop ?? p.precioCop,
      precioSuscriptorCop: e.precioSuscriptorCop ?? p.precioSuscriptorCop,
      precioUsd: e.precioUsd ?? p.precioUsd,
      precioSuscriptorUsd: e.precioSuscriptorUsd ?? p.precioSuscriptorUsd,
      notas_es: e.notasEs ?? p.notas_es,
      notas_en: e.notasEn ?? p.notas_en,
      historia_es: e.propositoEs ?? p.historia_es,
      historia_en: e.propositoEn ?? p.historia_en,
      img: e.fotoPath ? urlFotoCafe(e.fotoPath) : p.img,
    };
  });
}

export class EdicionInvalida extends Error {
  constructor(public campo: string) {
    super(campo);
    this.name = "EdicionInvalida";
  }
}

/** Los campos de texto y precio que manda el panel. La foto va aparte. */
export interface DatosEdicion {
  nombre: string | null;
  precioCop: number | null;
  precioSuscriptorCop: number | null;
  precioUsd: number | null;
  precioSuscriptorUsd: number | null;
  notasEs: string | null;
  notasEn: string | null;
  propositoEs: string | null;
  propositoEn: string | null;
}

const LIMITES = { nombre: 60, notas: 200, proposito: 1200 };

/**
 * Valida lo que llega del panel. Vacío = volver al valor del JSON. Los
 * precios se comparan contra el resultado final (editado o base), para que
 * el precio de suscriptor nunca quede por encima del de compra única.
 */
export function validarDatosEdicion(crudo: unknown, base: Product): DatosEdicion {
  const r = (crudo ?? {}) as Record<string, unknown>;

  const txt = (campo: string, max: number) => {
    const v = r[campo];
    if (v === undefined || v === null) return null;
    if (typeof v !== "string") throw new EdicionInvalida(campo);
    const limpio = v.trim();
    if (limpio.length > max) throw new EdicionInvalida(campo);
    return limpio || null;
  };

  const precio = (campo: string, entero: boolean) => {
    const v = r[campo];
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || (entero && !Number.isInteger(n))) throw new EdicionInvalida(campo);
    return entero ? n : Math.round(n * 100) / 100;
  };

  const datos: DatosEdicion = {
    nombre: txt("nombre", LIMITES.nombre),
    precioCop: precio("precioCop", true),
    precioSuscriptorCop: precio("precioSuscriptorCop", true),
    precioUsd: precio("precioUsd", false),
    precioSuscriptorUsd: precio("precioSuscriptorUsd", false),
    notasEs: txt("notasEs", LIMITES.notas),
    notasEn: txt("notasEn", LIMITES.notas),
    propositoEs: txt("propositoEs", LIMITES.proposito),
    propositoEn: txt("propositoEn", LIMITES.proposito),
  };

  const unico = datos.precioCop ?? base.precioCop;
  const suscriptor = datos.precioSuscriptorCop ?? base.precioSuscriptorCop;
  if (suscriptor > unico) throw new EdicionInvalida("precioSuscriptorCop");

  const unicoUsd = datos.precioUsd ?? base.precioUsd;
  const suscriptorUsd = datos.precioSuscriptorUsd ?? base.precioSuscriptorUsd;
  if (unicoUsd !== undefined && suscriptorUsd !== undefined && suscriptorUsd > unicoUsd) {
    throw new EdicionInvalida("precioSuscriptorUsd");
  }

  return datos;
}

/** DatosEdicion → columnas de la tabla. */
export function aFila(datos: DatosEdicion): FilaEdicion {
  return {
    nombre: datos.nombre,
    precio_cop: datos.precioCop,
    precio_suscriptor_cop: datos.precioSuscriptorCop,
    precio_usd: datos.precioUsd,
    precio_suscriptor_usd: datos.precioSuscriptorUsd,
    notas_es: datos.notasEs,
    notas_en: datos.notasEn,
    proposito_es: datos.propositoEs,
    proposito_en: datos.propositoEn,
  };
}

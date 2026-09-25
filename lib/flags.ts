// Feature flags. Se leen de variables de entorno con `NEXT_PUBLIC_` porque
// también las consultan componentes cliente (Header, ModeContext, ProductCard).
//
// FEATURE_AMBASSADORS apaga el programa de embajadores sin borrar nada: los
// modelos, las tablas de Supabase y los componentes siguen en el repo. Con el
// flag apagado no debe quedar ni una ruta, ni un menú, ni un texto visible.

export const FEATURE_AMBASSADORS =
  process.env.NEXT_PUBLIC_FEATURE_AMBASSADORS === "true";

export const NAV_KEYS_BASE = ["inicio", "tienda", "suscripcion", "blog"] as const;
export const NAV_KEY_AMBASSADORS = "embajadores" as const;

export type NavKey = (typeof NAV_KEYS_BASE)[number] | typeof NAV_KEY_AMBASSADORS;

/**
 * Claves de navegación visibles. `embajadores` solo aparece con el flag encendido.
 * Recibe el flag como parámetro para poder probarlo sin tocar process.env.
 */
export function visibleNavKeys(ambassadorsEnabled = FEATURE_AMBASSADORS): NavKey[] {
  return ambassadorsEnabled
    ? [...NAV_KEYS_BASE, NAV_KEY_AMBASSADORS]
    : [...NAV_KEYS_BASE];
}

/**
 * Detecta rutas del programa de embajadores, con o sin prefijo de locale.
 * Cubre "/embajadores", "/es/embajadores" y cualquier subruta.
 */
export function isAmbassadorPath(pathname: string): boolean {
  return /^\/(?:[a-z]{2}\/)?embajadores(?:\/|$)/.test(pathname);
}

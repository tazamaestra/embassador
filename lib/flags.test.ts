import { describe, expect, it } from "vitest";
import { isAmbassadorPath, visibleNavKeys } from "@/lib/flags";

describe("navegación con el flag apagado", () => {
  it("no muestra embajadores", () => {
    expect(visibleNavKeys(false)).not.toContain("embajadores");
  });

  it("sí muestra el resto del sitio", () => {
    expect(visibleNavKeys(false)).toEqual(["inicio", "tienda", "suscripcion", "blog"]);
  });

  it("lo vuelve a mostrar si se enciende", () => {
    expect(visibleNavKeys(true)).toContain("embajadores");
  });

  it("no deja que un llamador mute la lista compartida", () => {
    visibleNavKeys(false).push("embajadores");
    expect(visibleNavKeys(false)).not.toContain("embajadores");
  });
});

describe("rutas del programa", () => {
  it("reconoce la ruta con prefijo de locale", () => {
    expect(isAmbassadorPath("/es/embajadores")).toBe(true);
    expect(isAmbassadorPath("/en/embajadores")).toBe(true);
  });

  it("reconoce subrutas y anclas de ruta", () => {
    expect(isAmbassadorPath("/es/embajadores/beneficios")).toBe(true);
    expect(isAmbassadorPath("/embajadores")).toBe(true);
  });

  it("no confunde otras rutas", () => {
    for (const ruta of ["/es", "/es/tienda", "/es/blog", "/es/cuenta", "/es/checkout"]) {
      expect(isAmbassadorPath(ruta)).toBe(false);
    }
  });

  it("no se deja engañar por una ruta que solo empiece parecido", () => {
    expect(isAmbassadorPath("/es/embajadoresfalso")).toBe(false);
  });
});

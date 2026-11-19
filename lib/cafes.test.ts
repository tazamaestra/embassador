import { describe, expect, it } from "vitest";
import { products } from "@/lib/content";
import {
  EdicionInvalida, aEdicion, aplicarEdiciones, srcImagen, validarDatosEdicion, type EdicionCafe,
} from "@/lib/cafes";

const base = products[0];

const vacia = (slug: string): EdicionCafe => ({
  productoSlug: slug, nombre: null, precioCop: null, precioNegocioCop: null,
  precioUsd: null, precioNegocioUsd: null, notasEs: null, notasEn: null,
  propositoEs: null, propositoEn: null, fotoPath: null, fotoAncho: null, fotoAlto: null,
});

describe("aplicarEdiciones", () => {
  it("sin ediciones deja el catálogo igual", () => {
    expect(aplicarEdiciones(products, [])).toEqual(products);
  });

  it("un campo en null sigue al JSON", () => {
    const [p] = aplicarEdiciones([base], [vacia(base.id)]);
    expect(p).toEqual(base);
  });

  it("pone nombre, precios, notas, propósito y foto editados", () => {
    const [p] = aplicarEdiciones([base], [{
      ...vacia(base.id), nombre: "Nuevo", precioCop: 60000, precioNegocioCop: 50000,
      notasEs: "Miel", propositoEs: "Por qué existe", fotoPath: `${base.id}/1.webp`,
    }]);
    expect(p.name).toBe("Nuevo");
    expect(p.precioCop).toBe(60000);
    expect(p.negocio?.precioCop ?? 50000).toBe(50000);
    expect(p.notas_es).toBe("Miel");
    expect(p.notas_en).toBe(base.notas_en);
    expect(p.historia_es).toBe("Por qué existe");
    expect(p.img).toMatch(/\/storage\/v1\/object\/public\/cafes\/.+\/1\.webp$/);
    // Lo que el panel no edita no se toca.
    expect(p.finca).toBe(base.finca);
    expect(p.bolsa).toEqual(base.bolsa);
  });

  it("una edición de otro café no afecta a este", () => {
    const [p] = aplicarEdiciones([base], [{ ...vacia("otro"), nombre: "X" }]);
    expect(p.name).toBe(base.name);
  });
});

describe("aEdicion", () => {
  it("convierte la fila y trata los textos vacíos como null", () => {
    const e = aEdicion({ producto_slug: "x", nombre: "  ", precio_cop: "45000", precio_usd: null });
    expect(e.nombre).toBeNull();
    expect(e.precioCop).toBe(45000);
    expect(e.precioUsd).toBeNull();
  });
});

describe("validarDatosEdicion", () => {
  it("todo vacío = volver al JSON", () => {
    const d = validarDatosEdicion({}, base);
    expect(Object.values(d).every((v) => v === null)).toBe(true);
  });

  it("acepta precios como texto de un input", () => {
    const d = validarDatosEdicion({ precioCop: "52000", precioNegocioCop: "45000", precioUsd: "12.499" }, base);
    expect(d.precioCop).toBe(52000);
    expect(d.precioNegocioCop).toBe(45000);
    expect(d.precioUsd).toBe(12.5);
  });

  it("rechaza precios en cero, negativos, con decimales en COP o que no son número", () => {
    for (const malo of [0, -1, 1.5, "abc"]) {
      expect(() => validarDatosEdicion({ precioCop: malo }, base)).toThrow(EdicionInvalida);
    }
  });

  it("el precio del cuarterón solo se acepta si el café tiene cuarterón", () => {
    const sinCuarteron = { ...base, negocio: undefined };
    expect(() => validarDatosEdicion({ precioNegocioCop: 150000 }, sinCuarteron)).toThrow(EdicionInvalida);
  });

  it("limita el largo de los textos", () => {
    expect(() => validarDatosEdicion({ nombre: "x".repeat(61) }, base)).toThrow(EdicionInvalida);
    expect(() => validarDatosEdicion({ propositoEs: "x".repeat(1201) }, base)).toThrow(EdicionInvalida);
  });

  it("rechaza tipos raros", () => {
    expect(() => validarDatosEdicion({ nombre: 5 }, base)).toThrow(EdicionInvalida);
  });
});

describe("srcImagen", () => {
  it("las del repo salen de /public y las del bucket quedan como URL", () => {
    expect(srcImagen("assets/bag-maroon.png")).toBe("/bag-maroon.png");
    expect(srcImagen("https://x.supabase.co/storage/v1/object/public/cafes/a.webp")).toBe(
      "https://x.supabase.co/storage/v1/object/public/cafes/a.webp"
    );
  });
});

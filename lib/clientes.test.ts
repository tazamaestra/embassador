import { describe, expect, it } from "vitest";
import { calcularHoras, esLineaCuarteron } from "./capacitacion";
import { DatoInvalido, generarClave, normalizarDocumento, validarCapacitacion, validarCliente } from "./clientes";
import { armarLineas, PedidoInvalido, totalDe, validarContacto, validarEntrega } from "./pedidos";
import { aPedidoWeb, comprasSimuladas, normalizar } from "./servidor/inventario";
import { aPedidoInventario } from "./servidor/pedidos";
import { products } from "./content";
import type { Capacitacion, CompraInventario } from "./types";

const compra = (cantidad: number, esCuarteron = true, fecha = "2026-10-01"): CompraInventario => ({
  id: String(Math.random()), fecha, producto: "x", gramos: esCuarteron ? 2250 : 340,
  cantidad, totalCop: null, esCuarteron,
});
const HOY = new Date("2026-11-18T12:00:00Z");
const cap = (horas: number): Capacitacion => ({ id: "c", clienteId: "x", fecha: "2026-10-02", horas, tema: "t", notas: "" });

describe("horas de capacitación", () => {
  it("cada 3 cuarterones dan 1 hora, sin decimales", () => {
    expect(calcularHoras([compra(2)], []).ganadas).toBe(0);
    expect(calcularHoras([compra(3)], []).ganadas).toBe(1);
    expect(calcularHoras([compra(5, true, "2026-09-01"), compra(3)], []).ganadas).toBe(2);
  });

  it("solo cuentan los cuarterones, no las bolsas", () => {
    const h = calcularHoras([compra(10, false), compra(3)], []);
    expect(h.cuarterones).toBe(3);
    expect(h.ganadas).toBe(1);
  });

  it("resta las horas usadas y dice cuánto falta para la siguiente", () => {
    const h = calcularHoras([compra(7)], [cap(1.5)], HOY);
    expect(h).toMatchObject({ cuarterones: 7, base: 2, regalo: 0, ganadas: 2, usadas: 1.5, disponibles: 0.5, faltanParaSiguiente: 2 });
  });

  it("8 cuarterones en un mismo mes dan 1 hora de regalo: 2 + 1 = 3", () => {
    const h = calcularHoras([compra(5, true, "2026-09-03"), compra(3, true, "2026-09-25")], [], HOY);
    expect(h).toMatchObject({ cuarterones: 8, base: 2, regalo: 1, ganadas: 3 });
    expect(h.regaloPorMes).toEqual([{ mes: "2026-09", cuarterones: 8, horas: 1 }]);
  });

  it("8 cuarterones repartidos en dos meses no dan regalo", () => {
    const h = calcularHoras([compra(5, true, "2026-09-30"), compra(3, true, "2026-10-01")], [], HOY);
    expect(h).toMatchObject({ base: 2, regalo: 0, ganadas: 2 });
  });

  it("16 en un mes dan 2 horas de regalo", () => {
    expect(calcularHoras([compra(16, true, "2026-08-10")], [], HOY)).toMatchObject({ base: 5, regalo: 2, ganadas: 7 });
  });

  it("cuenta cuánto lleva el mes en curso hacia el regalo", () => {
    const h = calcularHoras([compra(3, true, "2026-11-02"), compra(2, true, "2026-11-15"), compra(9, true, "2026-10-01")], [], HOY);
    expect(h.mesActual).toEqual({ mes: "2026-11", cuarterones: 5, faltanParaRegalo: 3 });
  });

  it("reconoce el cuarterón por gramos o por el texto", () => {
    expect(esLineaCuarteron(2250, "")).toBe(true);
    expect(esLineaCuarteron(340, "cuarterón")).toBe(false);
    expect(esLineaCuarteron(null, "Chambrana Cuarterón")).toBe(true);
    expect(esLineaCuarteron(null, "Casa Roja 2.250 g")).toBe(true);
    expect(esLineaCuarteron(null, "Casa Roja 340 g")).toBe(false);
  });
});

describe("compras simuladas", () => {
  it("el mismo NIT da siempre las mismas compras, y otro NIT otras", () => {
    const a = comprasSimuladas("900123456", HOY);
    expect(comprasSimuladas("900123456", HOY)).toEqual(a);
    expect(comprasSimuladas("123456789", HOY)).not.toEqual(a);
  });

  it("trae un mes con hora de regalo y no inventa fechas futuras", () => {
    for (const nit of ["900123456", "1088123", "800555222-1"]) {
      const compras = comprasSimuladas(nit, HOY);
      expect(calcularHoras(compras, [], HOY).regalo).toBeGreaterThanOrEqual(1);
      expect(compras.every((c) => c.fecha <= "2026-11-18")).toBe(true);
    }
  });
});

describe("compras del inventario", () => {
  it("acepta nombres de campo distintos", () => {
    const c = normalizar({ codigo: "F-1", date: "2026-09-01", descripcion: "Chambrana", peso_g: "2250", qty: "2", valor: "300.000" }, 0);
    expect(c).toMatchObject({ id: "F-1", fecha: "2026-09-01", gramos: 2250, cantidad: 2, totalCop: 300000, esCuarteron: true });
  });

  it("lee montos en formato colombiano y en inglés", () => {
    expect(normalizar({ total: "$1.250.000" }, 0).totalCop).toBe(1250000);
    expect(normalizar({ total: "1,250,000.50" }, 0).totalCop).toBe(1250000.5);
    expect(normalizar({ total: 45000 }, 0).totalCop).toBe(45000);
    expect(normalizar({ total: "12,5" }, 0).totalCop).toBe(12.5);
  });
});

describe("clientes", () => {
  it("normaliza el NIT o la cédula", () => {
    expect(normalizarDocumento(" 900.123.456-7 ")).toBe("900123456-7");
  });

  it("exige correo, nombre y documento al crear", () => {
    expect(() => validarCliente({ nombre: "Ana", documento: "123456" })).toThrow(DatoInvalido);
    const d = validarCliente({ email: "ANA@Cafe.co", nombre: " Ana ", documento: "1.234.567" });
    expect(d).toMatchObject({ email: "ana@cafe.co", nombre: "Ana", documento: "1234567" });
  });

  it("al editar solo valida lo que llega", () => {
    expect(validarCliente({ telefono: "300" }, true)).toEqual({ telefono: "300" });
  });

  it("valida las capacitaciones: fecha, horas de media en media, tema", () => {
    expect(validarCapacitacion({ fecha: "2026-11-18", horas: 1.5, tema: "Molienda" }).horas).toBe(1.5);
    for (const horas of [0, 0.3, 13, "x"]) {
      expect(() => validarCapacitacion({ fecha: "2026-11-18", horas, tema: "x" })).toThrow(DatoInvalido);
    }
    expect(() => validarCapacitacion({ fecha: "ayer", horas: 1, tema: "x" })).toThrow(DatoInvalido);
  });

  it("genera claves de 12 caracteres", () => {
    expect(generarClave()).toMatch(/^[A-Za-z2-9]{12}$/);
  });
});

describe("pedidos", () => {
  const [cafe] = products;

  it("pone el precio del catálogo y suma la misma presentación", () => {
    const l = armarLineas(
      [{ cafe: cafe.id, presentacion: "bolsa", cantidad: 1, precioCop: 1 }, { cafe: cafe.id, cantidad: 2 }],
      products
    );
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ cantidad: 3, precioCop: cafe.precioCop });
    expect(totalDe(l)).toBe(cafe.precioCop * 3);
  });

  it("rechaza cafés, presentaciones o cantidades raras", () => {
    expect(() => armarLineas([], products)).toThrow(PedidoInvalido);
    expect(() => armarLineas([{ cafe: "nope", cantidad: 1 }], products)).toThrow(PedidoInvalido);
    expect(() => armarLineas([{ cafe: cafe.id, presentacion: "kilo", cantidad: 1 }], products)).toThrow(PedidoInvalido);
    expect(() => armarLineas([{ cafe: cafe.id, cantidad: 0 }], products)).toThrow(PedidoInvalido);
  });

  it("un pedido desde la cuenta solo pide la entrega", () => {
    expect(validarEntrega({ linea: "Cra 1 #2-3", ciudad: "Pereira", departamento: "Risaralda" })).toEqual({
      linea: "Cra 1 #2-3", ciudad: "Pereira", departamento: "Risaralda", notas: "",
    });
    expect(() => validarEntrega({ ciudad: "Pereira", departamento: "Risaralda" })).toThrow(PedidoInvalido);
  });

  it("exige los datos de envío", () => {
    const ok = { nombre: "Ana", email: "a@b.co", telefono: "3001234567", linea: "Cra 1", ciudad: "Pereira", departamento: "Risaralda" };
    expect(validarContacto(ok).notas).toBe("");
    expect(() => validarContacto({ ...ok, email: "x" })).toThrow(PedidoInvalido);
    expect(() => validarContacto({ ...ok, linea: "" })).toThrow(PedidoInvalido);
  });
});

describe("contrato con el inventario", () => {
  const cliente = {
    id: "u1", email: "ana@cafe.co", nombre: "Ana", telefono: "300", negocio: "Café", documento: "900123456-7",
    ciudad: "Pereira", notas: "", activo: true, creadoEn: "",
  };
  const base = {
    referencia: "PED-ABC123", origen: "cuenta" as const, cliente,
    contacto: { nombre: "Ana · Café", email: "ana@cafe.co", telefono: "300" },
    entrega: { linea: "Calle 1", ciudad: "Pereira", departamento: "Risaralda", notas: "" },
    items: [{ cafe: "santa-rita", nombre: "Chambrana", presentacion: "negocio" as const, pesoG: 2250, cantidad: 3, precioCop: 150000 }],
    totalCop: 450000,
  };

  it("arma el POST /pedidos con cliente registrado o ocasional", () => {
    const c = aPedidoInventario(base);
    expect(c).toMatchObject({
      referencia_web: "PED-ABC123", origen: "cuenta", cliente: { tipo: "registrado", documento: "900123456-7" },
      entrega: { direccion: "Calle 1" }, total: 450000, moneda: "COP",
    });
    expect(c.items[0]).toEqual({ producto: "santa-rita", nombre: "Chambrana", presentacion: "cuarteron", gramos: 2250, cantidad: 3, precio_unitario: 150000 });
    expect(aPedidoInventario({ ...base, cliente: null }).cliente).toEqual({ tipo: "ocasional" });
  });

  it("lee el pedido que devuelve el inventario", () => {
    const enviado = aPedidoInventario(base);
    const p = aPedidoWeb({ id: "x", numero: "P-000123", referencia_web: "PED-ABC123", origen: "cuenta", estado: "entregado", creado_en: "2026-11-18T10:00:00Z", total: 450000, entrega: enviado.entrega, items: enviado.items }, "u1");
    expect(p).toMatchObject({ referencia: "P-000123", estado: "entregado", totalCop: 450000, linea: "Calle 1", clienteId: "u1" });
    expect(p.items[0]).toEqual(base.items[0]);
  });

  it("muestra el nombre del café en las compras del contrato", () => {
    const c = normalizar({ id: "V-1", fecha: "2026-11-08", producto: "santa-rita", presentacion: "cuarteron", gramos: 2250, cantidad: 2, total: 300000 }, 0);
    expect(c).toMatchObject({ producto: "Chambrana · cuarterón", esCuarteron: true, cantidad: 2 });
  });
});

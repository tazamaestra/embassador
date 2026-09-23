import { describe, expect, it } from "vitest";
import {
  cobroPrepago, compararConSuelta, consumoMensual, librasDelEnvio,
  mejorAhorroSuelta, mesesEntre, nivelSugerido, progresoRegalo,
  proximoCobro, proximoDespacho, proximoDiaDelMes, sumarDias, tazasAcompanadas,
  tazasQueRinde,
} from "@/lib/suscripcion";
import { niveles, suscripcionConfig } from "@/lib/content";
import type { Suscripcion, SuscripcionConfig } from "@/lib/types";

// Configuración sintética: la matemática se prueba contra datos controlados,
// para que un precio escrito a mano en el código haga fallar el test.
const vacio = { label_es: "", label_en: "", nota_es: "", nota_en: "" };

const config: SuscripcionConfig = {
  moneda: "COP",
  redondeoCop: 100,
  diasPreparacion: 2,
  cobroDia: 1,
  despachoDia: 5,
  gramosPorLibra: 450,
  operacion: {
    productoId: "00000000-0000-0000-0000-000000000000",
    productoNombre: "Producto de prueba",
    canal: "prueba",
    prefijoPedido: "TEST",
  },
  suelta: { precioLibraCop: 50000, envioCop: 10000 },
  consumo: { diasMes: 30 },
  metodos: [
    { id: "filtro", gramosPorTaza: 8, ...vacio },
    { id: "espresso", gramosPorTaza: 14, ...vacio },
  ],
  niveles: [
    { id: "n1", libras: 1, gramos: 450, precioCop: 45000, orden: 1, incluye_es: [], incluye_en: [], ...vacio },
    { id: "n2", libras: 2, gramos: 900, precioCop: 85000, orden: 2, incluye_es: [], incluye_en: [], ...vacio },
    { id: "n3", libras: 3, gramos: 1350, precioCop: 120000, orden: 3, incluye_es: [], incluye_en: [], ...vacio },
  ],
  frecuencias: [{ id: "mensual", cadaDias: 30, orden: 1, ...vacio }],
  prepagos: [
    { id: "mes", meses: 1, descuentoPct: 0, orden: 1, ...vacio },
    { id: "tri", meses: 3, descuentoPct: 5, orden: 2, ...vacio },
    { id: "sem", meses: 6, descuentoPct: 10, orden: 3, ...vacio },
  ],
  moliendas: [],
  perfiles: [],
  regalo: { mesesSeguidos: 6, libras: 1, label_es: "", label_en: "", desc_es: "", desc_en: "" },
  beneficios: [],
  origenDelMes: {
    mes_es: "", mes_en: "", productor: "", finca: "", region: "", altura: "",
    variedad: "", proceso_es: "", proceso_en: "", notas_es: "", notas_en: "",
    foto: null, swatch: "",
  },
  ciudades: [],
  faqs: [],
};

const [n1, n2, n3] = config.niveles;

const suscripcion: Suscripcion = {
  id: "s1", clienteId: "c1", nivelId: n1.id, frecuenciaId: "mensual",
  prepagoId: "mes", molienda: "grano", metodo: "filtro",
  perfil: "balanceado", estado: "activa", proximoEnvio: "2026-10-01",
  enviosHechos: 0, enviosSaltados: 0,
  creadaEn: "2026-01-15", pausadaEn: null, canceladaEn: null, direccionId: null,
};

describe("fechas", () => {
  it("suma días cruzando el fin de mes", () => {
    expect(sumarDias("2026-01-25", 15)).toBe("2026-02-09");
  });

  it("suma días cruzando el fin de año", () => {
    expect(sumarDias("2026-12-28", 10)).toBe("2027-01-07");
  });

  it("cuenta meses completos, no calendario", () => {
    expect(mesesEntre("2026-01-15", "2026-02-14")).toBe(0);
    expect(mesesEntre("2026-01-15", "2026-02-15")).toBe(1);
  });

  it("el próximo día del mes salta al mes siguiente si ya pasó", () => {
    expect(proximoDiaDelMes(1, "2026-03-01")).toBe("2026-04-01");
    expect(proximoDiaDelMes(1, "2026-03-15")).toBe("2026-04-01");
  });

  it("cobra el día 1 y despacha el 5 del mismo ciclo", () => {
    expect(proximoCobro(config, "2026-03-15")).toBe("2026-04-01");
    expect(proximoDespacho(config, "2026-03-15")).toBe("2026-04-05");
  });
});

describe("calculadora de consumo", () => {
  it("usa los gramos del método: filtro 8 g, espresso 14 g", () => {
    expect(consumoMensual(2, "filtro", config)).toBe(2 * 8 * 30);
    expect(consumoMensual(2, "espresso", config)).toBe(2 * 14 * 30);
  });

  it("es cero si el método no existe", () => {
    expect(consumoMensual(2, "inventado", config)).toBe(0);
  });

  it("sugiere el nivel más pequeño que alcanza", () => {
    expect(nivelSugerido(450, config).id).toBe(n1.id);
    expect(nivelSugerido(451, config).id).toBe(n2.id);
    expect(nivelSugerido(900, config).id).toBe(n2.id);
    expect(nivelSugerido(901, config).id).toBe(n3.id);
  });

  it("se queda en el nivel mayor si el consumo se pasa", () => {
    expect(nivelSugerido(99999, config).id).toBe(n3.id);
  });

  it("una taza al día en filtro cae en el plan de 1 libra", () => {
    expect(nivelSugerido(consumoMensual(1, "filtro", config), config).id).toBe(n1.id);
  });

  it("tres tazas de espresso al día no caben en 1 libra", () => {
    const gramos = consumoMensual(3, "espresso", config);
    expect(gramos).toBe(1260);
    expect(nivelSugerido(gramos, config).id).toBe(n3.id);
  });

  it("dice para cuántas tazas rinde", () => {
    expect(tazasQueRinde(n1, "filtro", config)).toBe(56);
    expect(tazasQueRinde(n1, "espresso", config)).toBe(32);
  });
});

describe("prepago", () => {
  it("mes a mes no descuenta", () => {
    const c = cobroPrepago(n1, config.prepagos[0], config);
    expect(c.total).toBe(45000);
    expect(c.ahorro).toBe(0);
  });

  it("tres meses descuentan 5%", () => {
    const c = cobroPrepago(n1, config.prepagos[1], config);
    expect(c.total).toBe(128300);
    expect(c.ahorro).toBe(135000 - 128300);
    expect(c.porMes).toBeLessThan(n1.precioCop);
  });

  it("seis meses descuentan 10%", () => {
    const c = cobroPrepago(n1, config.prepagos[2], config);
    expect(c.total).toBe(243000);
  });

  it("redondea al paso configurado", () => {
    const c = cobroPrepago(n2, config.prepagos[1], config);
    expect(c.total % config.redondeoCop).toBe(0);
    expect(c.porMes % config.redondeoCop).toBe(0);
  });
});

describe("comparación contra comprar suelto", () => {
  it("suma el envío al precio suelto", () => {
    const c = compararConSuelta(n1, config);
    expect(c.suelta).toBe(1 * 50000 + 10000);
    expect(c.suscrito).toBe(45000);
    expect(c.ahorro).toBe(15000);
  });

  it("el ahorro crece con las libras", () => {
    expect(compararConSuelta(n3, config).ahorro).toBeGreaterThan(
      compararConSuelta(n1, config).ahorro
    );
  });

  it("el mejor ahorro es el del nivel que más ahorra", () => {
    expect(mejorAhorroSuelta(config).ahorro).toBe(compararConSuelta(n3, config).ahorro);
  });
});

describe("racha y libra de regalo", () => {
  it("arranca en cero", () => {
    const p = progresoRegalo(suscripcion, config);
    expect(p.enviosHechos).toBe(0);
    expect(p.faltan).toBe(6);
    expect(p.pct).toBe(0);
    expect(p.ganado).toBe(false);
  });

  it("avanza envío a envío", () => {
    const p = progresoRegalo({ ...suscripcion, enviosHechos: 3 }, config);
    expect(p.faltan).toBe(3);
    expect(p.pct).toBe(50);
  });

  it("al sexto envío está ganada", () => {
    const p = progresoRegalo({ ...suscripcion, enviosHechos: 6 }, config);
    expect(p.ganado).toBe(true);
    expect(p.faltan).toBe(0);
    expect(p.pct).toBe(100);
  });

  it("vuelve a contar para el siguiente ciclo", () => {
    const p = progresoRegalo({ ...suscripcion, enviosHechos: 7 }, config);
    expect(p.ganado).toBe(false);
    expect(p.faltan).toBe(5);
  });

  it("cancelar deja la racha en cero", () => {
    const p = progresoRegalo(
      { ...suscripcion, enviosHechos: 4, estado: "cancelada" },
      config
    );
    expect(p.enviosHechos).toBe(0);
  });

  it("el séptimo envío lleva la libra de regalo", () => {
    expect(librasDelEnvio({ ...suscripcion, enviosHechos: 5 }, n1, config)).toBe(1);
    expect(librasDelEnvio({ ...suscripcion, enviosHechos: 6 }, n1, config)).toBe(2);
    expect(librasDelEnvio({ ...suscripcion, enviosHechos: 7 }, n1, config)).toBe(1);
  });
});

describe("contador de tazas", () => {
  it("cuenta según los gramos del nivel y del método", () => {
    const s = { ...suscripcion, enviosHechos: 2 };
    expect(tazasAcompanadas(s, n1, config)).toBe(Math.floor((2 * 450) / 8));
  });

  it("es cero antes del primer envío", () => {
    expect(tazasAcompanadas(suscripcion, n1, config)).toBe(0);
  });
});

describe("configuración real", () => {
  it("todo nivel sale más barato que comprar esas libras sueltas", () => {
    for (const nivel of niveles) {
      const c = compararConSuelta(nivel, suscripcionConfig);
      expect(c.ahorro, `${nivel.id} no ahorra nada`).toBeGreaterThan(0);
    }
  });

  it("los niveles suben de precio con las libras", () => {
    for (let i = 1; i < niveles.length; i++) {
      expect(niveles[i].precioCop).toBeGreaterThan(niveles[i - 1].precioCop);
      expect(niveles[i].gramos).toBeGreaterThan(niveles[i - 1].gramos);
    }
  });

  it("prepagar más meses nunca sale más caro por mes", () => {
    const porMes = suscripcionConfig.prepagos.map(
      (p) => cobroPrepago(niveles[0], p, suscripcionConfig).porMes
    );
    for (let i = 1; i < porMes.length; i++) {
      expect(porMes[i]).toBeLessThanOrEqual(porMes[i - 1]);
    }
  });

  it("cada nivel cubre los gramos que promete en libras", () => {
    for (const nivel of niveles) {
      expect(nivel.gramos).toBe(nivel.libras * suscripcionConfig.gramosPorLibra);
    }
  });
});

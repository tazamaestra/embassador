import { describe, expect, it } from "vitest";
import {
  bolsasDelEnvio, costoMensual, decidirCiclo, enviosDelPrepago, fechaCobro,
  montoCobro, planearCobro, primerEnvio, progresoRegalo, sumarDias, sumarMeses,
} from "@/lib/suscripcion";
import { catalogoPrueba, planDos, planUno, suscripcionPrueba } from "@/lib/catalogo.fixture";

const catalogo = catalogoPrueba();
const { reglas } = catalogo;
const [siete, quince, treinta] = catalogo.frecuencias;
const [porEnvio, tres, seis] = catalogo.prepagos;

describe("fechas", () => {
  it("suma días cruzando meses y años", () => {
    expect(sumarDias("2026-12-30", 3)).toBe("2027-01-02");
    expect(sumarDias("2026-10-20", -3)).toBe("2026-10-17");
  });

  it("suma meses sin desbordar al mes siguiente", () => {
    expect(sumarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(sumarMeses("2028-01-31", 1)).toBe("2028-02-29");
    expect(sumarMeses("2026-11-15", 2)).toBe("2027-01-15");
  });

  it("cobra los días configurados antes del envío", () => {
    expect(fechaCobro({ proximoEnvio: "2026-10-20" }, reglas)).toBe("2026-10-17");
  });

  it("el primer envío deja los días de preparación", () => {
    expect(primerEnvio(reglas, "2026-10-01")).toBe("2026-10-05");
  });
});

describe("prepago", () => {
  it("cuenta los envíos que caben en los meses pagados", () => {
    expect(enviosDelPrepago(tres, siete)).toBe(12);
    expect(enviosDelPrepago(tres, quince)).toBe(6);
    expect(enviosDelPrepago(tres, treinta)).toBe(3);
    expect(enviosDelPrepago(seis, quince)).toBe(12);
    expect(enviosDelPrepago(porEnvio, treinta)).toBe(1);
  });

  it("sin prepago cobra un envío al precio del plan", () => {
    const m = montoCobro(planUno, quince, porEnvio, reglas);
    expect(m).toEqual({ total: 40000, envios: 1, porEnvio: 40000, ahorro: 0 });
  });

  it("con prepago cobra todos los envíos con el descuento", () => {
    const m = montoCobro(planDos, quince, tres, reglas);
    // 6 envíos × 70.000 = 420.000, menos 10%.
    expect(m.total).toBe(378000);
    expect(m.envios).toBe(6);
    expect(m.ahorro).toBe(42000);
    expect(m.porEnvio).toBe(63000);
  });

  it("redondea al múltiplo configurado", () => {
    const raro = { ...planUno, precioEnvioCop: 33333 };
    expect(montoCobro(raro, quince, tres, reglas).total % reglas.redondeoCop).toBe(0);
  });

  it("el costo mensual depende de la frecuencia, no el precio por envío", () => {
    expect(costoMensual(planUno, quince, reglas)).toBe(80000);
    expect(costoMensual(planUno, treinta, reglas)).toBe(40000);
  });
});

describe("bolsa de regalo", () => {
  it("cae en el envío siguiente a cada racha completa", () => {
    expect(bolsasDelEnvio({ enviosHechos: 5 }, planUno, reglas)).toEqual({ bolsas: 1, regalo: false });
    expect(bolsasDelEnvio({ enviosHechos: 6 }, planUno, reglas)).toEqual({ bolsas: 2, regalo: true });
    expect(bolsasDelEnvio({ enviosHechos: 12 }, planDos, reglas)).toEqual({ bolsas: 3, regalo: true });
    expect(bolsasDelEnvio({ enviosHechos: 0 }, planUno, reglas).regalo).toBe(false);
  });

  it("se apaga con cadaEnvios en 0", () => {
    const sinRegalo = { ...reglas, regalo: { cadaEnvios: 0, bolsas: 1 } };
    expect(bolsasDelEnvio({ enviosHechos: 6 }, planUno, sinRegalo).regalo).toBe(false);
  });

  it("muestra el avance de la racha", () => {
    expect(progresoRegalo({ enviosHechos: 3, estado: "activa" }, reglas)).toEqual({
      hechos: 3, meta: 6, faltan: 3, pct: 50,
    });
    expect(progresoRegalo({ enviosHechos: 3, estado: "cancelada" }, reglas).hechos).toBe(0);
  });
});

describe("ciclo diario", () => {
  it("no hace nada antes de la fecha de cobro", () => {
    const s = suscripcionPrueba({ proximoEnvio: "2026-10-20" });
    expect(decidirCiclo(s, catalogo, false, "2026-10-16").tipo).toBe("nada");
  });

  it("cobra el día del corte y no mueve la suscripción hasta que se apruebe", () => {
    const s = suscripcionPrueba({ proximoEnvio: "2026-10-20" });
    const d = decidirCiclo(s, catalogo, false, "2026-10-17");
    expect(d.tipo).toBe("cobrar");
    if (d.tipo !== "cobrar") return;
    expect(d.cobro.ciclo).toBe(3);
    expect(d.cobro.montoCop).toBe(40000);
    expect(d.suscripcion.proximoEnvio).toBe("2026-10-20");
  });

  it("con un cobro en vuelo no vuelve a cobrar", () => {
    const s = suscripcionPrueba({ proximoEnvio: "2026-10-20" });
    expect(decidirCiclo(s, catalogo, true, "2026-10-18").tipo).toBe("nada");
  });

  it("no toca suscripciones pausadas ni pendientes de pago", () => {
    expect(decidirCiclo(suscripcionPrueba({ estado: "pausada" }), catalogo, false, "2026-12-01").tipo).toBe("nada");
    expect(decidirCiclo(suscripcionPrueba({ estado: "pago_pendiente" }), catalogo, false, "2026-12-01").tipo).toBe("nada");
  });

  it("con envíos prepagados despacha sin cobrar", () => {
    const s = suscripcionPrueba({ enviosPrepagadosRestantes: 2, proximoEnvio: "2026-10-20" });
    const d = decidirCiclo(s, catalogo, false, "2026-10-17");
    expect(d.tipo).toBe("consumir_prepago");
    if (d.tipo !== "consumir_prepago") return;
    expect(d.suscripcion.enviosPrepagadosRestantes).toBe(1);
    expect(d.suscripcion.ciclo).toBe(3);
    expect(d.suscripcion.proximoEnvio).toBe("2026-11-04");
    expect(d.envio).toMatchObject({ numero: 3, fecha: "2026-10-20", bolsas: 1 });
  });

  it("al renovar aplica los cambios que esperaban al prepago", () => {
    const s = suscripcionPrueba({ cambiosPendientes: { planId: "dos" }, prepagoId: "tres" });
    const d = decidirCiclo(s, catalogo, false, "2026-10-17");
    if (d.tipo !== "cobrar") throw new Error("debía cobrar");
    expect(d.suscripcion.planId).toBe("dos");
    expect(d.suscripcion.cambiosPendientes).toEqual({});
    expect(d.cobro.detalle.planId).toBe("dos");
    // Renueva el mismo prepago: 6 envíos de 70.000 con 10%.
    expect(d.cobro.montoCop).toBe(378000);
    expect(d.cobro.enviosCubiertos).toBe(6);
  });

  it("con la regla 'ciclo' un prepago acabado pasa a cobrarse por envío", () => {
    const porCiclo = { ...catalogo, reglas: { ...reglas, prepagoRenovacion: "ciclo" as const } };
    const d = decidirCiclo(suscripcionPrueba({ prepagoId: "tres" }), porCiclo, false, "2026-10-17");
    if (d.tipo !== "cobrar") throw new Error("debía cobrar");
    expect(d.suscripcion.prepagoId).toBe("uno-a-uno");
    expect(d.cobro.enviosCubiertos).toBe(1);
  });

  it("guarda la foto de lo que se cobra", () => {
    const c = planearCobro(suscripcionPrueba({ moliendaId: "fina" }), catalogo, "alta");
    expect(c.detalle).toEqual({
      planId: "uno", frecuenciaId: "quince", prepagoId: "uno-a-uno",
      moliendaId: "fina", perfilId: "medio", bolsas: 1,
    });
  });

  it("falla con claridad si el plan ya no existe en el catálogo", () => {
    expect(() => planearCobro(suscripcionPrueba({ planId: "borrado" }), catalogo, "alta")).toThrow(/borrado/);
  });
});

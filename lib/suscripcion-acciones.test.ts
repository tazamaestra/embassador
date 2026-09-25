import { describe, expect, it } from "vitest";
import {
  TRANSICIONES, accionesDisponibles, aplicarCobroAprobado, aplicarCobroRechazado,
  cambiar, cancelar, debeReanudarse, debeReintentar, enviosPrepagadosAlCancelar,
  ofertasRetencion, pausar, planearCobro, puedeTransitar, reanudar, saltarEnvio,
} from "@/lib/suscripcion";
import { catalogoPrueba, suscripcionPrueba } from "@/lib/catalogo.fixture";
import type { EstadoSuscripcion } from "@/lib/types";

const catalogo = catalogoPrueba();
const { reglas } = catalogo;
const quince = catalogo.frecuencias[1];

describe("máquina de estados", () => {
  it("cancelada es terminal", () => {
    expect(TRANSICIONES.cancelada).toEqual([]);
  });

  it("solo permite las transiciones documentadas", () => {
    const validas: [EstadoSuscripcion, EstadoSuscripcion][] = [
      ["pago_pendiente", "activa"], ["pago_pendiente", "cancelada"],
      ["activa", "pausada"], ["activa", "pago_pendiente"], ["activa", "cancelada"],
      ["pausada", "activa"], ["pausada", "cancelada"],
    ];
    const estados: EstadoSuscripcion[] = ["activa", "pausada", "pago_pendiente", "cancelada"];
    for (const de of estados) {
      for (const a of estados) {
        const esperada = validas.some(([x, y]) => x === de && y === a);
        expect(puedeTransitar(de, a), `${de} → ${a}`).toBe(esperada);
      }
    }
  });
});

describe("pausar y reanudar", () => {
  it("pausa uno o dos meses y guarda cuándo vuelve", () => {
    const s = pausar(suscripcionPrueba(), 2, reglas, false, "2026-10-05");
    expect(s.estado).toBe("pausada");
    expect(s.pausadaHasta).toBe("2026-12-05");
  });

  it("no ofrece pausas que no estén configuradas", () => {
    expect(() => pausar(suscripcionPrueba(), 3, reglas, false)).toThrow();
  });

  it("no pausa con un cobro en vuelo", () => {
    expect(() => pausar(suscripcionPrueba(), 1, reglas, true)).toThrow(/cobro/);
  });

  it("no pausa una suscripción sin pago", () => {
    expect(() => pausar(suscripcionPrueba({ estado: "pago_pendiente" }), 1, reglas, false)).toThrow();
  });

  it("se reanuda sola al llegar la fecha", () => {
    const s = suscripcionPrueba({ estado: "pausada", pausadaHasta: "2026-12-05" });
    expect(debeReanudarse(s, "2026-12-04")).toBe(false);
    expect(debeReanudarse(s, "2026-12-05")).toBe(true);
  });

  it("al reanudar corre un envío que quedó en el pasado", () => {
    const s = suscripcionPrueba({ estado: "pausada", proximoEnvio: "2026-10-20", pausadaHasta: "2026-12-05" });
    const r = reanudar(s, reglas, "2026-12-05");
    expect(r.estado).toBe("activa");
    expect(r.pausadaHasta).toBeNull();
    expect(r.proximoEnvio).toBe("2026-12-08");
  });

  it("al reanudar respeta un envío que todavía está lejos", () => {
    const s = suscripcionPrueba({ estado: "pausada", proximoEnvio: "2027-01-10" });
    expect(reanudar(s, reglas, "2026-12-05").proximoEnvio).toBe("2027-01-10");
  });
});

describe("saltar", () => {
  it("corre el próximo envío una frecuencia y lo deja registrado", () => {
    const r = saltarEnvio(suscripcionPrueba(), quince, false);
    expect(r.suscripcion.proximoEnvio).toBe("2026-11-04");
    expect(r.suscripcion.enviosSaltados).toBe(1);
    expect(r.envio).toEqual({ numero: 3, fecha: "2026-10-20" });
  });

  it("no gasta envíos prepagados", () => {
    const r = saltarEnvio(suscripcionPrueba({ enviosPrepagadosRestantes: 3 }), quince, false);
    expect(r.suscripcion.enviosPrepagadosRestantes).toBe(3);
  });

  it("no salta un envío que ya se está cobrando", () => {
    expect(() => saltarEnvio(suscripcionPrueba(), quince, true)).toThrow(/cobrando/);
  });
});

describe("cambiar", () => {
  it("sin prepago, todo entra en el próximo envío", () => {
    const s = cambiar(suscripcionPrueba(), { planId: "dos", frecuenciaId: "siete", moliendaId: "fina" }, catalogo);
    expect(s).toMatchObject({ planId: "dos", frecuenciaId: "siete", moliendaId: "fina", cambiosPendientes: {} });
  });

  it("no mueve la fecha del próximo envío", () => {
    const s = cambiar(suscripcionPrueba(), { frecuenciaId: "treinta" }, catalogo);
    expect(s.proximoEnvio).toBe("2026-10-20");
  });

  it("con prepago, plan y frecuencia esperan a la renovación; molienda y perfil no", () => {
    const s = cambiar(
      suscripcionPrueba({ enviosPrepagadosRestantes: 4, prepagoId: "tres" }),
      { planId: "dos", frecuenciaId: "siete", perfilId: "choco" },
      catalogo
    );
    expect(s.planId).toBe("uno");
    expect(s.frecuenciaId).toBe("quince");
    expect(s.perfilId).toBe("choco");
    expect(s.cambiosPendientes).toEqual({ planId: "dos", frecuenciaId: "siete" });
  });

  it("rechaza opciones que no existen", () => {
    expect(() => cambiar(suscripcionPrueba(), { planId: "gigante" }, catalogo)).toThrow();
  });

  it("no cambia una suscripción cancelada", () => {
    expect(() => cambiar(suscripcionPrueba({ estado: "cancelada" }), { perfilId: "choco" }, catalogo)).toThrow();
  });
});

describe("cancelar", () => {
  it("cancela desde activa, pausada o sin pago", () => {
    for (const estado of ["activa", "pausada", "pago_pendiente"] as const) {
      expect(cancelar(suscripcionPrueba({ estado }), "2026-10-01").estado).toBe("cancelada");
    }
  });

  it("no se cancela dos veces", () => {
    expect(() => cancelar(suscripcionPrueba({ estado: "cancelada" }))).toThrow();
  });

  it("los envíos ya prepagados se despachan igual", () => {
    const s = suscripcionPrueba({ enviosPrepagadosRestantes: 2, ciclo: 4, proximoEnvio: "2026-10-20" });
    expect(enviosPrepagadosAlCancelar(s, quince)).toEqual([
      { numero: 5, fecha: "2026-10-20" },
      { numero: 6, fecha: "2026-11-04" },
    ]);
  });
});

describe("retención", () => {
  it("ofrece pausar, espaciar, bajar a una bolsa y cambiar de perfil", () => {
    const ofertas = ofertasRetencion(suscripcionPrueba({ planId: "dos", frecuenciaId: "siete" }), catalogo);
    expect(ofertas).toEqual([
      { tipo: "pausar", meses: 1 },
      { tipo: "pausar", meses: 2 },
      { tipo: "frecuencia", frecuenciaId: "quince" },
      { tipo: "plan", planId: "uno" },
      { tipo: "perfil" },
    ]);
  });

  it("no ofrece lo que no cambia nada", () => {
    const ofertas = ofertasRetencion(suscripcionPrueba({ planId: "uno", frecuenciaId: "treinta" }), catalogo);
    expect(ofertas.map((o) => o.tipo)).toEqual(["pausar", "pausar", "perfil"]);
  });
});

describe("resultado de un cobro", () => {
  it("el alta aprobada activa la suscripción y programa el primer envío", () => {
    const alta = suscripcionPrueba({ estado: "pago_pendiente", ciclo: 0, enviosHechos: 0, proximoEnvio: "2026-10-05" });
    const cobro = planearCobro({ ...alta, prepagoId: "tres" }, catalogo, "alta");
    const r = aplicarCobroAprobado(alta, cobro, catalogo, "2026-10-01");
    expect(r).not.toBeNull();
    expect(r!.suscripcion).toMatchObject({
      estado: "activa", ciclo: 1, enviosHechos: 1, enviosPrepagadosRestantes: 5,
      proximoEnvio: "2026-10-20",
    });
    expect(r!.envio).toMatchObject({ numero: 1, fecha: "2026-10-05" });
  });

  it("un evento repetido no cuenta dos veces", () => {
    const s = suscripcionPrueba({ ciclo: 3 });
    const cobro = { ciclo: 3, enviosCubiertos: 1, detalle: planearCobro(s, catalogo, "automatico").detalle };
    expect(aplicarCobroAprobado(s, cobro, catalogo)).toBeNull();
  });

  it("no revive una suscripción cancelada", () => {
    const s = suscripcionPrueba({ estado: "cancelada" });
    expect(aplicarCobroAprobado(s, planearCobro(s, catalogo, "manual"), catalogo)).toBeNull();
  });

  it("un pago que llega tarde no promete un envío antes de poder tostarlo", () => {
    const s = suscripcionPrueba({ estado: "pago_pendiente", proximoEnvio: "2026-10-20" });
    const r = aplicarCobroAprobado(s, planearCobro(s, catalogo, "reintento"), catalogo, "2026-10-25");
    expect(r!.envio.fecha).toBe("2026-10-29");
    expect(r!.suscripcion.proximoEnvio).toBe("2026-11-13");
    expect(r!.suscripcion.intentosFallidos).toBe(0);
  });

  it("un rechazo programa reintentos a los días configurados", () => {
    let s = suscripcionPrueba();
    const hoy = "2026-10-17";

    let r = aplicarCobroRechazado(s, "automatico", reglas, hoy);
    expect(r.suscripcion).toMatchObject({ estado: "pago_pendiente", intentosFallidos: 1, proximoReintento: "2026-10-19" });
    s = r.suscripcion;

    r = aplicarCobroRechazado(s, "reintento", reglas, "2026-10-19");
    expect(r.suscripcion).toMatchObject({ intentosFallidos: 2, proximoReintento: "2026-10-23" });
    s = r.suscripcion;

    r = aplicarCobroRechazado(s, "reintento", reglas, "2026-10-23");
    expect(r.suscripcion).toMatchObject({ intentosFallidos: 3, proximoReintento: "2026-10-30" });
    expect(r.cancelada).toBe(false);
    s = r.suscripcion;

    r = aplicarCobroRechazado(s, "reintento", reglas, "2026-10-30");
    expect(r.cancelada).toBe(true);
    expect(r.suscripcion.estado).toBe("cancelada");
  });

  it("un intento manual fallido no gasta reintentos", () => {
    const s = suscripcionPrueba({ estado: "pago_pendiente", intentosFallidos: 2, proximoReintento: "2026-10-23" });
    const r = aplicarCobroRechazado(s, "manual", reglas, "2026-10-21");
    expect(r.suscripcion.intentosFallidos).toBe(2);
    expect(r.suscripcion.proximoReintento).toBe("2026-10-23");
  });

  it("reintenta solo si hay medio de pago y ya es la fecha", () => {
    const s = suscripcionPrueba({ estado: "pago_pendiente", proximoReintento: "2026-10-19" });
    expect(debeReintentar(s, false, "2026-10-18")).toBe(false);
    expect(debeReintentar(s, false, "2026-10-19")).toBe(true);
    expect(debeReintentar(s, true, "2026-10-19")).toBe(false);
    expect(debeReintentar({ ...s, metodoPagoId: null }, false, "2026-10-19")).toBe(false);
  });
});

describe("acciones en pantalla", () => {
  it("cambian con el estado y con un cobro en vuelo", () => {
    expect(accionesDisponibles({ estado: "activa" })).toMatchObject({ pausar: true, saltar: true, pagar: false });
    expect(accionesDisponibles({ estado: "activa" }, true)).toMatchObject({ pausar: false, saltar: false });
    expect(accionesDisponibles({ estado: "pago_pendiente" })).toMatchObject({ pagar: true, pausar: false });
    expect(accionesDisponibles({ estado: "cancelada" })).toMatchObject({ cambiar: false, cancelar: false });
  });
});

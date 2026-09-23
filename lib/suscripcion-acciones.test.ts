import { describe, expect, it } from "vitest";
import {
  accionesDisponibles, activar, cambiarFrecuencia, cambiarNivel,
  cambiarPreferencias, cancelar, pausar, reanudar, registrarEnvio, saltarEnvio,
} from "@/lib/suscripcion";
import type { Frecuencia, Nivel, Suscripcion, SuscripcionConfig } from "@/lib/types";

const vacio = { label_es: "", label_en: "", nota_es: "", nota_en: "" };

const quincenal: Frecuencia = { id: "quincenal", cadaDias: 15, orden: 1, ...vacio };
const mensual: Frecuencia = { id: "mensual", cadaDias: 30, orden: 2, ...vacio };

const nivel1: Nivel = {
  id: "1-libra", libras: 1, gramos: 450, precioCop: 45000, orden: 1,
  incluye_es: [], incluye_en: [], ...vacio,
};
const nivel2: Nivel = { ...nivel1, id: "2-libras", libras: 2, gramos: 900, precioCop: 85000, orden: 2 };

const config = {
  moneda: "COP", redondeoCop: 100, diasPreparacion: 2,
  cobroDia: 1, despachoDia: 5, gramosPorLibra: 450,
  operacion: {
    productoId: "00000000-0000-0000-0000-000000000000",
    productoNombre: "Producto de prueba",
    canal: "prueba",
    prefijoPedido: "TEST",
  },
  suelta: { precioLibraCop: 49000, envioCop: 12000 },
  consumo: { diasMes: 30 },
  metodos: [{ id: "filtro", gramosPorTaza: 8, ...vacio }],
  niveles: [nivel1, nivel2],
  frecuencias: [quincenal, mensual],
  prepagos: [{ id: "mes", meses: 1, descuentoPct: 0, orden: 1, ...vacio }],
  moliendas: [], perfiles: [],
  regalo: { mesesSeguidos: 6, libras: 1, label_es: "", label_en: "", desc_es: "", desc_en: "" },
  beneficios: [],
  origenDelMes: {
    mes_es: "", mes_en: "", productor: "", finca: "", region: "", altura: "",
    variedad: "", proceso_es: "", proceso_en: "", notas_es: "", notas_en: "",
    foto: null, swatch: "",
  },
  ciudades: [], faqs: [],
} satisfies SuscripcionConfig;

const activa: Suscripcion = {
  id: "s1", clienteId: "c1", nivelId: nivel1.id, frecuenciaId: quincenal.id,
  prepagoId: "mes", molienda: "grano", metodo: "filtro", perfil: "balanceado",
  estado: "activa", proximoEnvio: "2026-10-01",
  enviosHechos: 2, enviosSaltados: 0,
  creadaEn: "2026-08-01", pausadaEn: null, canceladaEn: null, direccionId: null,
};

describe("pausar y reanudar", () => {
  it("pausa en un paso y guarda la fecha", () => {
    const s = pausar(activa, "2026-09-22");
    expect(s.estado).toBe("pausada");
    expect(s.pausadaEn).toBe("2026-09-22");
  });

  it("no altera la suscripción original", () => {
    pausar(activa, "2026-09-22");
    expect(activa.estado).toBe("activa");
  });

  it("reanuda conservando la fecha si todavía no ha pasado", () => {
    const s = reanudar(pausar(activa, "2026-09-22"), config, "2026-09-25");
    expect(s.estado).toBe("activa");
    expect(s.pausadaEn).toBeNull();
    expect(s.proximoEnvio).toBe("2026-10-01");
  });

  it("reprograma con margen si la fecha quedó atrás durante la pausa", () => {
    const s = reanudar(pausar(activa, "2026-09-22"), config, "2026-11-10");
    expect(s.proximoEnvio).toBe("2026-11-12"); // 2 días de preparación
  });

  it("no pausa algo que ya está pausado", () => {
    expect(() => pausar(pausar(activa, "2026-09-22"), "2026-09-23")).toThrow();
  });

  it("no reanuda algo que nunca se pausó", () => {
    expect(() => reanudar(activa, config, "2026-09-22")).toThrow();
  });
});

describe("saltar un envío", () => {
  it("corre la fecha una frecuencia hacia adelante", () => {
    const s = saltarEnvio(activa, quincenal);
    expect(s.proximoEnvio).toBe("2026-10-16");
    expect(s.enviosSaltados).toBe(1);
  });

  it("no cuenta como envío hecho", () => {
    expect(saltarEnvio(activa, quincenal).enviosHechos).toBe(activa.enviosHechos);
  });

  it("no se puede saltar estando pausada", () => {
    expect(() => saltarEnvio(pausar(activa, "2026-09-22"), quincenal)).toThrow();
  });
});

describe("cambiar nivel, frecuencia y preferencias", () => {
  it("cambia de nivel estando activa", () => {
    expect(cambiarNivel(activa, nivel2).nivelId).toBe("2-libras");
  });

  it("también lo cambia estando pausada", () => {
    const pausada = pausar(activa, "2026-09-22");
    expect(cambiarNivel(pausada, nivel2).nivelId).toBe("2-libras");
  });

  it("no lo cambia si ya canceló", () => {
    expect(() => cambiarNivel(cancelar(activa, "2026-09-22"), nivel2)).toThrow();
  });

  it("cambiar de nivel no mueve la fecha del próximo envío", () => {
    expect(cambiarNivel(activa, nivel2).proximoEnvio).toBe(activa.proximoEnvio);
  });

  it("recalcula la fecha con la nueva frecuencia", () => {
    const s = cambiarFrecuencia(activa, mensual, "2026-09-22");
    expect(s.frecuenciaId).toBe("mensual");
    expect(s.proximoEnvio).toBe("2026-10-22");
  });

  it("cambia grano/molido y método sin tocar fechas", () => {
    const s = cambiarPreferencias(activa, { molienda: "molido", metodo: "greca" });
    expect(s.molienda).toBe("molido");
    expect(s.metodo).toBe("greca");
    expect(s.proximoEnvio).toBe(activa.proximoEnvio);
  });

  it("no cambia preferencias si ya canceló", () => {
    const cancelada = cancelar(activa, "2026-09-22");
    expect(() => cambiarPreferencias(cancelada, { molienda: "molido" })).toThrow();
  });
});

describe("cancelar", () => {
  it("cancela de una, sin pasos intermedios", () => {
    const s = cancelar(activa, "2026-09-22");
    expect(s.estado).toBe("cancelada");
    expect(s.canceladaEn).toBe("2026-09-22");
  });

  it("cancela también desde pausada", () => {
    expect(cancelar(pausar(activa, "2026-09-22"), "2026-09-23").estado).toBe("cancelada");
  });

  it("no se cancela dos veces", () => {
    expect(() => cancelar(cancelar(activa, "2026-09-22"), "2026-09-23")).toThrow();
  });

  it("es terminal: no se reanuda", () => {
    expect(() => reanudar(cancelar(activa, "2026-09-22"), config)).toThrow();
  });
});

describe("ciclo de cobro", () => {
  it("activa cuenta el primer envío y programa el siguiente", () => {
    const pendiente: Suscripcion = { ...activa, estado: "pendiente", enviosHechos: 0 };
    const s = activar(pendiente, quincenal, "2026-09-22");
    expect(s.estado).toBe("activa");
    expect(s.enviosHechos).toBe(1);
    expect(s.proximoEnvio).toBe("2026-10-07");
  });

  it("registrar un envío suma uno y corre la fecha", () => {
    const s = registrarEnvio(activa, quincenal);
    expect(s.enviosHechos).toBe(3);
    expect(s.proximoEnvio).toBe("2026-10-16");
  });
});

describe("acciones que se ofrecen en pantalla", () => {
  it("activa: pausar, saltar, cambiar y cancelar", () => {
    expect(accionesDisponibles(activa)).toEqual({
      pausar: true, reanudar: false, saltar: true, cambiar: true, cancelar: true,
    });
  });

  it("pausada: reanudar, cambiar y cancelar", () => {
    expect(accionesDisponibles(pausar(activa, "2026-09-22"))).toEqual({
      pausar: false, reanudar: true, saltar: false, cambiar: true, cancelar: true,
    });
  });

  it("cancelada: ninguna", () => {
    const acciones = accionesDisponibles(cancelar(activa, "2026-09-22"));
    expect(Object.values(acciones).every((v) => v === false)).toBe(true);
  });
});

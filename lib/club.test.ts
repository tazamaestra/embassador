import { describe, expect, it } from "vitest";
import { cuentaAnual, nivelDelEnvio, puntosTras } from "@/lib/club";
import { catalogoPrueba, planUno } from "@/lib/catalogo.fixture";
import type { NivelClub } from "@/lib/types";

const txt = { label_es: "", label_en: "", desc_es: "", desc_en: "" };
// Desordenados a propósito: el orden lo pone desdeEnvio.
const niveles: NivelClub[] = [
  { id: "c", ...txt, desdeEnvio: 5, puntosEnvio: 30 },
  { id: "a", ...txt, desdeEnvio: 1, puntosEnvio: 10 },
  { id: "b", ...txt, desdeEnvio: 3, puntosEnvio: 20 },
];

describe("club", () => {
  it("ubica cada envío en su nivel", () => {
    expect(nivelDelEnvio(1, niveles).id).toBe("a");
    expect(nivelDelEnvio(3, niveles).id).toBe("b");
    expect(nivelDelEnvio(4, niveles).id).toBe("b");
    expect(nivelDelEnvio(9, niveles).id).toBe("c");
  });

  it("suma los puntos del nivel de cada envío", () => {
    expect(puntosTras(0, niveles)).toBe(0);
    expect(puntosTras(2, niveles)).toBe(20);
    expect(puntosTras(6, niveles)).toBe(10 + 10 + 20 + 20 + 30 + 30);
  });

  it("cuenta el año con las bolsas de regalo de las reglas", () => {
    const { reglas } = catalogoPrueba(); // regalo: 1 bolsa cada 6 envíos
    const anual = cuentaAnual(planUno, 30, reglas, niveles);
    expect(anual.envios).toBe(12);
    // Van de regalo en los envíos 7 y 13; el 13 ya no cae en el año.
    expect(anual.bolsasRegalo).toBe(1);
    expect(anual.bolsas).toBe(13);
    expect(anual.nivel.id).toBe("c");
  });
});

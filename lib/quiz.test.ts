import { describe, expect, it } from "vitest";
import { recomendar, validarRespuestas, type RespuestasQuiz } from "@/lib/quiz";
import { catalogoPrueba } from "@/lib/catalogo.fixture";

const { quiz, planes, frecuencias, perfiles } = catalogoPrueba();
// Entregas diarias del catálogo sintético (bolsas de 300 g):
//   uno/treinta 10 · uno/quince 20 · dos/treinta 20 · uno/siete 42.9
//   dos/quince 40 · dos/siete 85.7

const base: RespuestasQuiz = { metodoId: "v60", conLeche: false, perfilId: "medio", tazasDia: 1, personas: 1 };
const rec = (r: Partial<RespuestasQuiz>) => recomendar({ ...base, ...r }, quiz, planes, frecuencias);

describe("recomendación de plan y frecuencia", () => {
  it("una taza al día: una bolsa al mes", () => {
    expect(rec({})).toMatchObject({ planId: "uno", frecuenciaId: "treinta", gramosDia: 10 });
  });

  it("entre dos opciones iguales, el plan más chico", () => {
    // 20 g/día: uno/quince y dos/treinta entregan lo mismo.
    expect(rec({ tazasDia: 2 })).toMatchObject({ planId: "uno", frecuenciaId: "quince" });
  });

  it("multiplica por las personas de la casa", () => {
    // 3 tazas × 2 personas × 10 g = 60 g/día → dos cada semana.
    expect(rec({ tazasDia: 3, personas: 2 })).toMatchObject({ planId: "dos", frecuenciaId: "siete" });
  });

  it("usa los gramos del método", () => {
    // Espresso: 2 × 20 = 40 g/día.
    expect(rec({ metodoId: "espresso", tazasDia: 2 })).toMatchObject({ planId: "dos", frecuenciaId: "quince" });
  });

  it("si nada alcanza, recomienda lo que más entrega", () => {
    expect(rec({ tazasDia: 4, personas: 4 })).toMatchObject({ planId: "dos", frecuenciaId: "siete" });
  });

  it("el factor de cobertura permite quedarse un poco corto", () => {
    const flexible = { ...quiz, factorCobertura: 0.5 };
    // 30 g/día × 0.5 = 15 → basta uno/quince (20).
    expect(recomendar({ ...base, tazasDia: 3 }, flexible, planes, frecuencias).planId).toBe("uno");
  });
});

describe("molienda y perfil", () => {
  it("la molienda sale del método", () => {
    expect(rec({ metodoId: "molino" }).moliendaId).toBe("grano");
    expect(rec({ metodoId: "v60" }).moliendaId).toBe("fina");
  });

  it("la leche mueve el perfil según las reglas", () => {
    expect(rec({ perfilId: "fruta", conLeche: true }).perfilId).toBe("medio");
    expect(rec({ perfilId: "fruta", conLeche: false }).perfilId).toBe("fruta");
    expect(rec({ perfilId: "choco", conLeche: true }).perfilId).toBe("choco");
  });
});

describe("validación", () => {
  const ids = perfiles.map((p) => p.id);

  it("acepta respuestas válidas", () => {
    expect(validarRespuestas({ ...base, conLeche: true }, quiz, ids)).toEqual({ ...base, conLeche: true });
  });

  it("rechaza lo que no está en las opciones", () => {
    expect(() => validarRespuestas({ ...base, metodoId: "sifon" }, quiz, ids)).toThrow();
    expect(() => validarRespuestas({ ...base, tazasDia: 9 }, quiz, ids)).toThrow();
    expect(() => validarRespuestas({ ...base, perfilId: "x" }, quiz, ids)).toThrow();
    expect(() => validarRespuestas(null, quiz, ids)).toThrow();
  });
});

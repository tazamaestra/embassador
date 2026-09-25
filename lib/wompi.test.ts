import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";

// lib/wompi.ts lee los secretos al importarse: se fijan antes.
const SECRETO_INTEGRIDAD = "prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6";
const SECRETO_EVENTOS = "test_events_secreto";

let wompi: typeof import("@/lib/wompi");

beforeAll(async () => {
  vi.stubEnv("WOMPI_INTEGRITY_SECRET", SECRETO_INTEGRIDAD);
  vi.stubEnv("WOMPI_EVENTS_SECRET", SECRETO_EVENTOS);
  vi.stubEnv("NEXT_PUBLIC_WOMPI_PUBLIC_KEY", "pub_test_x");
  vi.resetModules();
  wompi = await import("@/lib/wompi");
});

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

describe("firma de integridad", () => {
  it("concatena en el orden del ejemplo de la documentación", () => {
    // docs.wompi.co → Widget & Checkout Web → Paso 3
    const cadenaDeLaDoc = "sk8-438k4-xmxm392-sn2m2490000COPprod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6";
    expect(
      wompi.firmaIntegridad({ referencia: "sk8-438k4-xmxm392-sn2m", montoEnCentavos: 2490000, moneda: "COP" })
    ).toBe(sha256(cadenaDeLaDoc));
  });

  it("pasa pesos a centavos sin decimales flotantes", () => {
    expect(wompi.aCentavos(45000)).toBe(4500000);
    expect(wompi.aCentavos(0.1 + 0.2)).toBe(30);
  });
});

describe("ambiente", () => {
  it("elige la URL según el prefijo de la llave", () => {
    expect(wompi.urlApiWompi("pub_test_abc")).toBe("https://sandbox.wompi.co/v1");
    expect(wompi.urlApiWompi("pub_prod_abc")).toBe("https://production.wompi.co/v1");
  });
});

describe("eventos del webhook", () => {
  const data = { transaction: { id: "1234-1610641025-49201", status: "APPROVED", amount_in_cents: 4490000 } };
  const timestamp = 1530291411;
  const checksum = sha256(`1234-1610641025-49201APPROVED4490000${timestamp}${SECRETO_EVENTOS}`);

  const evento = (cambios: Record<string, unknown> = {}) =>
    ({
      event: "transaction.updated",
      data,
      signature: {
        properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
        checksum,
      },
      timestamp,
      ...cambios,
    }) as unknown as Parameters<typeof wompi.eventoValido>[0];

  it("acepta un evento firmado con el secreto", () => {
    expect(wompi.eventoValido(evento())).toBe(true);
  });

  it("rechaza un evento alterado", () => {
    expect(wompi.eventoValido(evento({ timestamp: timestamp + 1 }))).toBe(false);
    expect(
      wompi.eventoValido(
        evento({ data: { transaction: { ...data.transaction, status: "DECLINED" } } })
      )
    ).toBe(false);
  });

  it("rechaza un evento sin firma", () => {
    expect(wompi.eventoValido(evento({ signature: undefined }))).toBe(false);
  });
});

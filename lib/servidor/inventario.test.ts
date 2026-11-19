// El adaptador del inventario contra un servidor falso que cumple el
// contrato (docs/contrato-api-inventario.md): llamadas HTTP de verdad, en
// localhost, sin tocar ningún sistema real.

import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CrearPedidoInventario, PedidoInventario } from "@/lib/inventario-contrato";

const TOKEN = "token-de-prueba";
const pedidos = new Map<string, PedidoInventario>();
let servidor: Server;
let inv: typeof import("./inventario");

function responder(res: import("node:http").ServerResponse, status: number, cuerpo: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(cuerpo));
}

beforeAll(async () => {
  servidor = createServer((req, res) => {
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return responder(res, 401, { error: "no_autorizado" });
    let datos = "";
    req.on("data", (c) => (datos += c));
    req.on("end", () => {
      const url = req.url ?? "";
      if (req.method === "POST" && url === "/pedidos") {
        const p = JSON.parse(datos) as CrearPedidoInventario;
        if (p.cliente.tipo === "registrado" && p.cliente.documento !== "900123456-7") {
          return responder(res, 404, { error: "cliente_no_encontrado" });
        }
        const existente = pedidos.get(p.referencia_web);
        if (existente) return responder(res, 200, existente);
        const nuevo: PedidoInventario = {
          id: `id-${pedidos.size + 1}`, numero: `P-${String(pedidos.size + 1).padStart(6, "0")}`,
          referencia_web: p.referencia_web, origen: p.origen, estado: "pendiente", creado_en: p.creado_en,
          total: p.total, entrega: p.entrega, items: p.items,
        };
        pedidos.set(p.referencia_web, nuevo);
        return responder(res, 201, nuevo);
      }
      if (req.method === "GET" && url.startsWith("/pedidos/")) {
        const p = pedidos.get(decodeURIComponent(url.slice("/pedidos/".length)));
        return p ? responder(res, 200, p) : responder(res, 404, { error: "pedido_no_encontrado" });
      }
      if (req.method === "GET" && url === "/clientes/900123456-7/pedidos") {
        return responder(res, 200, { pedidos: [...pedidos.values()].reverse() });
      }
      if (req.method === "GET" && url === "/clientes/900123456-7/compras") {
        return responder(res, 200, {
          compras: [{ id: "V-1", fecha: "2026-11-08", producto: "santa-rita", presentacion: "cuarteron", gramos: 2250, cantidad: 8, total: 1200000 }],
        });
      }
      if (url.startsWith("/clientes/")) return responder(res, 404, { error: "cliente_no_encontrado" });
      responder(res, 500, { error: "interno" });
    });
  });
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const { port } = servidor.address() as { port: number };
  process.env.INVENTARIO_API_URL = `http://127.0.0.1:${port}`;
  process.env.INVENTARIO_API_TOKEN = TOKEN;
  inv = await import("./inventario");
});

afterAll(() => {
  servidor.close();
  delete process.env.INVENTARIO_API_URL;
  delete process.env.INVENTARIO_API_TOKEN;
});

const pedido = (referencia: string, documento?: string): CrearPedidoInventario => ({
  referencia_web: referencia,
  origen: documento ? "cuenta" : "tienda",
  cliente: documento ? { tipo: "registrado", documento } : { tipo: "ocasional" },
  contacto: { nombre: "Ana", email: "ana@cafe.co", telefono: "300" },
  entrega: { direccion: "Calle 1", ciudad: "Pereira", departamento: "Risaralda", notas: "" },
  items: [{ producto: "santa-rita", nombre: "Chambrana", presentacion: "cuarteron", gramos: 2250, cantidad: 3, precio_unitario: 150000 }],
  total: 450000,
  moneda: "COP",
  creado_en: "2026-11-18T15:00:00Z",
});

describe("adaptador del inventario (servidor falso con el contrato)", () => {
  it("se da por conectado con INVENTARIO_API_URL", () => {
    expect(inv.inventarioConectado()).toBe(true);
  });

  it("crea un pedido y un reintento con la misma referencia no lo duplica", async () => {
    const a = await inv.crearPedidoEnInventario(pedido("PED-T-1", "900123456-7"));
    const b = await inv.crearPedidoEnInventario(pedido("PED-T-1", "900123456-7"));
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(b.pedido.numero).toBe(a.pedido.numero);
    expect(pedidos.size).toBe(1);
  });

  it("un comprador ocasional también crea pedido", async () => {
    const r = await inv.crearPedidoEnInventario(pedido("PED-T-2"));
    expect(r.ok).toBe(true);
  });

  it("un NIT desconocido se reporta como cliente_no_encontrado", async () => {
    const r = await inv.crearPedidoEnInventario(pedido("PED-T-3", "111"));
    expect(r).toEqual({ ok: false, motivo: "cliente_no_encontrado" });
  });

  it("lee el pedido por referencia y los pedidos del cliente", async () => {
    expect((await inv.pedidoPorReferencia("PED-T-1"))?.numero).toBe("P-000001");
    expect(await inv.pedidoPorReferencia("PED-NO-EXISTE")).toBeNull();
    expect((await inv.pedidosDeCliente("900123456-7"))?.length).toBe(2);
    expect(await inv.pedidosDeCliente("111")).toEqual([]);
  });

  it("lee las compras con el formato del contrato", async () => {
    const r = await inv.obtenerCompras("900123456-7");
    expect(r.simuladas).toBe(false);
    expect(r.compras[0]).toMatchObject({ producto: "Chambrana · cuarterón", cantidad: 8, esCuarteron: true, totalCop: 1200000 });
  });

  it("con un token malo, falla sin lanzar", async () => {
    process.env.INVENTARIO_API_TOKEN = "otro";
    expect(await inv.crearPedidoEnInventario(pedido("PED-T-4"))).toEqual({ ok: false, motivo: "no_disponible" });
    process.env.INVENTARIO_API_TOKEN = TOKEN;
  });
});

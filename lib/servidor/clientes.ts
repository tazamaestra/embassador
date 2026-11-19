// Resumen de un cliente: ficha, compras del inventario y horas de
// capacitación. Lo usan la cuenta del cliente y la ficha en el panel.
// SOLO SERVIDOR.

import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularHoras } from "@/lib/capacitacion";
import { aCapacitacion, aCliente } from "@/lib/clientes";
import { obtenerCompras } from "@/lib/servidor/inventario";
import { ESTADOS_CONFIRMADOS } from "@/lib/pedidos";
import { pedidosDelCliente } from "@/lib/servidor/pedidos";
import type { CompraInventario, Pedido, ResumenCliente } from "@/lib/types";

/**
 * Mientras las compras son simuladas, los pedidos web ya confirmados
 * (pagados o enviados) cuentan como compras, para que se reflejen en las
 * horas. Con el inventario conectado no se suman: el inventario ya registra
 * esas ventas y se contarían dos veces.
 */
function pedidosComoCompras(pedidos: Pedido[]): CompraInventario[] {
  return pedidos
    .filter((p) => ESTADOS_CONFIRMADOS.includes(p.estado))
    .flatMap((p) =>
      p.items.map((l, i) => ({
        id: `${p.referencia}-${i}`,
        fecha: p.creadoEn.slice(0, 10),
        producto: `${l.nombre} ${l.presentacion === "negocio" ? "cuarterón" : "bolsa"} · web`,
        gramos: l.pesoG,
        cantidad: l.cantidad,
        totalCop: l.precioCop * l.cantidad,
        esCuarteron: l.presentacion === "negocio",
      }))
    );
}

export async function resumenCliente(db: SupabaseClient, clienteId: string): Promise<ResumenCliente | null> {
  const [{ data: fila }, { data: filasCap }] = await Promise.all([
    db.from("clientes").select("*").eq("id", clienteId).maybeSingle(),
    db.from("capacitaciones").select("*").eq("cliente_id", clienteId).order("fecha", { ascending: false }),
  ]);
  if (!fila) return null;

  const cliente = aCliente(fila);
  const capacitaciones = (filasCap ?? []).map(aCapacitacion);
  // Pedidos y compras en paralelo (con el inventario conectado, son dos
  // llamadas a su API).
  const [pedidosLeidos, inventario] = await Promise.all([
    pedidosDelCliente(db, cliente),
    obtenerCompras(cliente.documento),
  ]);
  const pedidos = pedidosLeidos ?? [];
  const { estado, simuladas } = inventario;
  const compras = simuladas
    ? [...pedidosComoCompras(pedidos), ...inventario.compras].sort((a, b) => b.fecha.localeCompare(a.fecha))
    : inventario.compras;

  return {
    cliente,
    compras,
    inventario: estado,
    comprasSimuladas: simuladas,
    pedidos,
    capacitaciones,
    horas: calcularHoras(compras, capacitaciones),
  };
}

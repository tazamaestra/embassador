// Resumen de un cliente: ficha, compras del inventario y horas de
// capacitación. Lo usan la cuenta del cliente y la ficha en el panel.
// SOLO SERVIDOR.
//
// El cliente se busca en el inventario por su ID (si está vinculado) o por
// su NIT. Cada vez que se abre, se lee su cliente del inventario en vivo y:
//   · si aún no estaba vinculado y el NIT coincide, queda vinculado solo;
//   · si el NIT cambió en el inventario, la web toma el nuevo.

import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularHoras } from "@/lib/capacitacion";
import { aCapacitacion, aCliente } from "@/lib/clientes";
import { claveInventario, clienteDelInventario, inventarioConectado, obtenerCompras } from "@/lib/servidor/inventario";
import { pedidosDelCliente } from "@/lib/servidor/pedidos";
import type { ClienteInventario } from "@/lib/inventario-contrato";
import type { Cliente, ResumenCliente } from "@/lib/types";

/**
 * Guarda en la ficha de la web el ID y el NIT que tiene el inventario. Si el
 * NIT ya lo usa otra ficha de la web, se deja como está (el vínculo por ID
 * igual funciona).
 */
async function sincronizar(db: SupabaseClient, cliente: Cliente, inv: ClienteInventario): Promise<Cliente> {
  const cambios: Record<string, string> = {};
  if (cliente.inventarioId !== inv.id) cambios.inventario_id = inv.id;
  if (inv.documento && inv.documento !== cliente.documento) cambios.documento = inv.documento;
  if (Object.keys(cambios).length === 0) return cliente;

  let { data, error } = await db.from("clientes").update(cambios).eq("id", cliente.id).select("*").maybeSingle();
  if (error && cambios.documento) {
    delete cambios.documento;
    if (Object.keys(cambios).length === 0) return cliente;
    ({ data, error } = await db.from("clientes").update(cambios).eq("id", cliente.id).select("*").maybeSingle());
  }
  if (error || !data) {
    console.error("[clientes] No se pudo sincronizar con el inventario:", error?.message);
    return cliente;
  }
  return aCliente(data);
}

export async function resumenCliente(db: SupabaseClient, clienteId: string): Promise<ResumenCliente | null> {
  const [{ data: fila }, { data: filasCap }] = await Promise.all([
    db.from("clientes").select("*").eq("id", clienteId).maybeSingle(),
    db.from("capacitaciones").select("*").eq("cliente_id", clienteId).order("fecha", { ascending: false }),
  ]);
  if (!fila) return null;

  let cliente = aCliente(fila);
  const capacitaciones = (filasCap ?? []).map(aCapacitacion);
  const clave = claveInventario(cliente);

  // Cliente del inventario, pedidos y compras en paralelo (tres llamadas a su API).
  const [vinculo, pedidosLeidos, inventario] = await Promise.all([
    inventarioConectado() && clave ? clienteDelInventario(clave) : Promise.resolve(null),
    pedidosDelCliente(cliente),
    obtenerCompras(clave),
  ]);
  const clienteInventario = vinculo?.estado === "ok" ? vinculo.cliente : null;
  if (clienteInventario) cliente = await sincronizar(db, cliente, clienteInventario);

  const pedidos = pedidosLeidos ?? [];
  const { estado, simuladas, compras } = inventario;

  return {
    cliente,
    clienteInventario,
    compras,
    inventario: estado,
    comprasSimuladas: simuladas,
    pedidos,
    capacitaciones,
    horas: calcularHoras(compras, capacitaciones),
  };
}

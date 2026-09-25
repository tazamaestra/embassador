// Cobros, pausas, reintentos y conciliación del día.
//
// Lo llama Vercel Cron (ver vercel.json) una vez al día. Vercel manda
// `Authorization: Bearer <CRON_SECRET>` cuando la variable CRON_SECRET está
// definida en el proyecto; sin ella esta ruta no corre, para que nadie
// pueda disparar cobros desde afuera.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { obtenerCatalogo } from "@/lib/catalogo";
import { hoyISO } from "@/lib/suscripcion";
import { cobroRecurrenteConfigurado } from "@/lib/wompi";
import { procesarDia } from "@/lib/servidor/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "no_autorizado" }, { status: 401 });
  }
  if (!cobroRecurrenteConfigurado()) {
    return NextResponse.json({ error: "wompi_sin_configurar" }, { status: 503 });
  }

  const db = crearClienteAdmin();
  const resumen = await procesarDia(db, await obtenerCatalogo(db), hoyISO());
  console.log("[cron] Resumen del día:", JSON.stringify(resumen));
  return NextResponse.json(resumen);
}

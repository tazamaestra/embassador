// Guarda las respuestas del quiz en el perfil del cliente y devuelve la
// recomendación. La pantalla ya la calculó con la misma función pura; aquí
// se recalcula con el catálogo de la base, que es el que vale.

import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase-admin";
import { obtenerCatalogo } from "@/lib/catalogo";
import { RespuestasInvalidas, recomendar, validarRespuestas } from "@/lib/quiz";
import { leerSesion, respuestaError } from "@/lib/servidor/sesion";

export async function POST(request: Request) {
  const sesion = await leerSesion(request);
  if (!sesion) return respuestaError("sin_sesion", 401);

  const cuerpo = await request.json().catch(() => null);
  const db = crearClienteAdmin();
  const catalogo = await obtenerCatalogo(db);

  try {
    const respuestas = validarRespuestas(cuerpo, catalogo.quiz, catalogo.perfiles.map((p) => p.id));
    const recomendacion = recomendar(respuestas, catalogo.quiz, catalogo.planes, catalogo.frecuencias);

    const { error } = await db
      .from("clientes")
      .upsert({
        id: sesion.id,
        email: sesion.email,
        quiz_respuestas: respuestas,
        quiz_recomendacion: recomendacion,
        quiz_respondido_en: new Date().toISOString(),
      });
    if (error) throw error;

    return NextResponse.json({ ok: true, recomendacion });
  } catch (e) {
    if (e instanceof RespuestasInvalidas) return respuestaError("respuesta_invalida", 400, { campo: e.message });
    console.error("[quiz]", e);
    return respuestaError("error", 500);
  }
}

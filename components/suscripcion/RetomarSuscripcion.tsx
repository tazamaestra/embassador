"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/nav";
import { CHECKOUT_BORRADOR, leerProgreso } from "@/lib/progreso";
import { QUIZ_PROGRESO } from "@/lib/quiz";

// Quien ya empezó no tiene que volver a pasar por los planes: si hay un
// checkout a medias, vuelve a él (en el paso donde iba); si no, pero hay un
// quiz empezado, vuelve al quiz. Sin nada empezado, la página se ve normal.
// El checkout tiene un botón para descartar y volver aquí.
export default function RetomarSuscripcion() {
  const router = useRouter();

  useEffect(() => {
    if (leerProgreso(CHECKOUT_BORRADOR)) {
      router.replace("/checkout");
      return;
    }
    const quiz = leerProgreso<{ paso?: number }>(QUIZ_PROGRESO);
    if (quiz && (quiz.paso ?? 0) > 0) router.replace("/quiz");
  }, [router]);

  return null;
}

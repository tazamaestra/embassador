"use client";

import { useEffect, useRef, useState } from "react";

// Cuenta desde el valor anterior hasta el nuevo cuando cambia. Se usa en la
// calculadora: al mover tazas o método, los gramos no saltan, ruedan.
//
// No anima en el primer render —el número ya está bien— ni con
// prefers-reduced-motion.

const DURACION_MS = 420;

function prefiereQuieto(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function NumeroAnimado({
  valor,
  formato = (n: number) => String(Math.round(n)),
  className = "",
}: {
  valor: number;
  formato?: (n: number) => string;
  className?: string;
}) {
  const [mostrado, setMostrado] = useState(valor);
  const anterior = useRef(valor);
  const primera = useRef(true);

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      anterior.current = valor;
      return;
    }

    const desde = anterior.current;
    anterior.current = valor;

    if (desde === valor || prefiereQuieto()) {
      setMostrado(valor);
      return;
    }

    let frame = 0;
    const inicio = performance.now();

    const paso = (ahora: number) => {
      const t = Math.min((ahora - inicio) / DURACION_MS, 1);
      // easeOutCubic: arranca rápido y frena, que es como se lee mejor.
      const suave = 1 - Math.pow(1 - t, 3);
      setMostrado(desde + (valor - desde) * suave);
      if (t < 1) frame = requestAnimationFrame(paso);
    };

    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [valor]);

  // aria-live no: el número cambia mientras el usuario arrastra y lo
  // anunciaría en bucle. El resultado se anuncia una vez desde la calculadora.
  return <span className={className}>{formato(mostrado)}</span>;
}

"use client";

import { useState } from "react";
import { ciudades } from "@/lib/content";

// Lista de las principales ciudades de Colombia. "Otra…" abre un campo para
// escribirla. Funciona dentro de un <form> sin estado: el valor viaja en el
// campo `name` (el select o el texto, según lo elegido).

const OTRA = "__otra__";

export default function SelectorCiudad({
  id,
  name = "ciudad",
  defaultValue = "",
  disabled,
  className,
  es,
}: {
  id: string;
  name?: string;
  defaultValue?: string;
  disabled?: boolean;
  className: string;
  es: boolean;
}) {
  // Una ciudad guardada que no está en la lista se muestra como "Otra".
  const enLista = !defaultValue || ciudades.includes(defaultValue);
  const [eleccion, setEleccion] = useState(enLista ? defaultValue : OTRA);
  const otra = eleccion === OTRA;

  return (
    <div className="space-y-2">
      <div className="relative">
        <select
          id={id}
          name={otra ? undefined : name}
          value={eleccion}
          onChange={(e) => setEleccion(e.target.value)}
          disabled={disabled}
          className={`${className} appearance-none pr-10 cursor-pointer ${eleccion ? "" : "text-tinta-suave/60"}`}
        >
          <option value="">{es ? "Elige la ciudad" : "Choose a city"}</option>
          {ciudades.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value={OTRA}>{es ? "Otra…" : "Other…"}</option>
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 8"
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-3 h-2 text-tinta-suave"
        >
          <path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {otra && (
        <input
          name={name}
          defaultValue={enLista ? "" : defaultValue}
          disabled={disabled}
          placeholder={es ? "Escribe la ciudad" : "Type the city"}
          aria-label={es ? "Otra ciudad" : "Other city"}
          autoComplete="address-level2"
          autoFocus
          className={`${className} animate-[fadeUp_.2s_ease-out]`}
        />
      )}
    </div>
  );
}

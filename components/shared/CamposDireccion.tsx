"use client";

import { ciudades } from "@/lib/content";

// Formulario de dirección de envío. Lo usan el checkout y la cuenta.

export const DIRECCION_VACIA = {
  nombre: "", telefono: "", linea: "", ciudad: "", departamento: "", notas: "",
};

export type DatosDireccion = typeof DIRECCION_VACIA;

const ENTRADA =
  "w-full bg-white border border-borde rounded-input px-4 py-3 font-body text-tinta text-base focus:outline-none focus:border-naranja focus:ring-1 focus:ring-naranja transition-colors";
const ETIQUETA =
  "block font-mono text-[11px] tracking-[.15em] text-tinta-suave uppercase mb-1";

export default function CamposDireccion({
  es, direccion, onCambio, prefijo,
}: {
  es: boolean;
  direccion: typeof DIRECCION_VACIA;
  onCambio: (d: typeof DIRECCION_VACIA) => void;
  prefijo: string;
}) {
  const campo = (k: keyof typeof DIRECCION_VACIA) => ({
    id: `${prefijo}-${k}`,
    value: direccion[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onCambio({ ...direccion, [k]: e.target.value }),
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className={ETIQUETA} htmlFor={`${prefijo}-nombre`}>{es ? "Nombre completo" : "Full name"}</label>
        <input autoComplete="name" className={ENTRADA} {...campo("nombre")} />
      </div>
      <div>
        <label className={ETIQUETA} htmlFor={`${prefijo}-telefono`}>{es ? "Celular" : "Phone"}</label>
        <input type="tel" inputMode="tel" autoComplete="tel" className={ENTRADA} {...campo("telefono")} />
      </div>
      <div>
        <label className={ETIQUETA} htmlFor={`${prefijo}-ciudad`}>{es ? "Ciudad" : "City"}</label>
        <select autoComplete="address-level2" className={ENTRADA} {...campo("ciudad")}>
          <option value="">{es ? "Elige tu ciudad" : "Choose your city"}</option>
          {ciudades.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="otra">{es ? "Otra" : "Other"}</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={ETIQUETA} htmlFor={`${prefijo}-linea`}>{es ? "Dirección" : "Address"}</label>
        <input autoComplete="street-address" placeholder={es ? "Calle 12 #4-56, apto 301" : "Street, number, apartment"} className={ENTRADA} {...campo("linea")} />
      </div>
      <div>
        <label className={ETIQUETA} htmlFor={`${prefijo}-departamento`}>{es ? "Departamento" : "State"}</label>
        <input autoComplete="address-level1" className={ENTRADA} {...campo("departamento")} />
      </div>
      <div>
        <label className={ETIQUETA} htmlFor={`${prefijo}-notas`}>{es ? "Indicaciones (opcional)" : "Notes (optional)"}</label>
        <input placeholder={es ? "Portería, referencia…" : "Doorman, landmark…"} className={ENTRADA} {...campo("notas")} />
      </div>
    </div>
  );
}


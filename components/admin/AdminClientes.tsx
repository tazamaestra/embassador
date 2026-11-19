"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { llamarApi } from "@/lib/pago";
import type { Cliente } from "@/lib/types";
import FichaCliente from "@/components/admin/FichaCliente";
import SelectorCiudad from "@/components/shared/SelectorCiudad";

// Tablero de clientes. A la izquierda la lista (buscar, crear); a la
// derecha la ficha del elegido con sus compras del inventario, horas de
// capacitación y sesiones. Las cuentas las crea el equipo aquí: no hay
// registro público.

export type ClienteLista = Cliente & { horasUsadas: number };

export const ENTRADA =
  "w-full font-body text-sm text-tinta bg-white border border-borde rounded-input px-3 py-2 focus:border-vino focus:outline-none focus:ring-2 focus:ring-vino/15 disabled:opacity-60";
export const ETIQUETA = "block font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase mb-1";

export function mensajeError(error: string, campo: string | undefined, es: boolean, detalle?: string): string {
  const campos: Record<string, [string, string]> = {
    email: ["Revisa el correo.", "Check the email."],
    nombre: ["Falta el nombre.", "Name is missing."],
    documento: ["Revisa el NIT o cédula: solo números, letras y guion.", "Check the tax ID: digits, letters and dash only."],
    clave: ["La clave debe tener al menos 8 caracteres.", "The password needs at least 8 characters."],
    fecha: ["Revisa la fecha.", "Check the date."],
    horas: ["Las horas van de 0,5 en 0,5 y hasta 12.", "Hours go in 0.5 steps, up to 12."],
    tema: ["Escribe el tema de la capacitación.", "Enter the training topic."],
  };
  if (error === "campo_invalido" && campo && campos[campo]) return campos[campo][es ? 0 : 1];
  const generales: Record<string, [string, string]> = {
    documento_repetido: ["Ya hay un cliente con ese NIT o cédula.", "There's already a client with that tax ID."],
    email_repetido: ["Ya existe una cuenta con ese correo.", "An account with that email already exists."],
    es_equipo: ["Esa cuenta es del equipo: no se borra desde aquí.", "That's a team account: it can't be deleted here."],
    lectura: [
      "No se pudo leer la base. ¿Ya corriste supabase/migracion_clientes.sql?",
      "Couldn't read the database. Did you run supabase/migracion_clientes.sql?",
    ],
  };
  const base = generales[error]?.[es ? 0 : 1] ?? (es ? "No se pudo. Intenta de nuevo." : "That didn't work. Try again.");
  // El detalle de Supabase dice la causa real (tabla, permiso, columna…).
  return detalle ? `${base} (${detalle})` : base;
}

/** Tarjeta con el correo y la clave para enviarle al cliente. Se ve una sola vez. */
export function Credenciales({ email, clave, es, onCerrar }: { email: string; clave: string; es: boolean; onCerrar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const texto = es
    ? `¡Bienvenido a Taza Maestra! Tu cuenta ya está lista.\nEntra en ${typeof window !== "undefined" ? window.location.origin : ""}/es/acceso\nCorreo: ${email}\nContraseña: ${clave}`
    : `Welcome to Taza Maestra! Your account is ready.\nSign in at ${typeof window !== "undefined" ? window.location.origin : ""}/en/acceso\nEmail: ${email}\nPassword: ${clave}`;

  return (
    <div role="status" className="rounded-card border-2 border-verde bg-verde-claro p-5 animate-[fadeUp_.3s_ease-out]">
      <p className="font-display font-bold text-tinta text-lg mb-1">{es ? "Cuenta lista para enviar" : "Account ready to send"}</p>
      <p className="font-body text-sm text-tinta-suave mb-3">
        {es ? "Copia estos datos y envíaselos al cliente. La clave no se vuelve a mostrar." : "Copy these details and send them to the client. The password won't be shown again."}
      </p>
      <dl className="font-mono text-sm bg-white rounded-input border border-borde p-3 space-y-1 mb-3">
        <div><dt className="inline text-tinta-suave">{es ? "Correo: " : "Email: "}</dt><dd className="inline text-tinta break-all">{email}</dd></div>
        <div><dt className="inline text-tinta-suave">{es ? "Clave: " : "Password: "}</dt><dd className="inline text-tinta font-700">{clave}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(texto);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          }}
          className="font-body font-700 text-sm px-4 py-2 rounded-btn bg-verde text-white hover:opacity-90"
        >
          {copiado ? (es ? "¡Copiado!" : "Copied!") : (es ? "Copiar mensaje de bienvenida" : "Copy welcome message")}
        </button>
        <button type="button" onClick={onCerrar} className="font-body text-sm px-3 py-2 text-tinta-suave hover:text-tinta">
          {es ? "Listo, ya lo envié" : "Done, I sent it"}
        </button>
      </div>
    </div>
  );
}

/** Un campo del formulario: etiqueta arriba, ayuda o error abajo, siempre alineados. */
function Campo({
  id, etiqueta, requerido, ayuda, error, children, ancho = "",
}: {
  id: string;
  etiqueta: string;
  requerido?: boolean;
  ayuda?: string;
  error?: string;
  children: React.ReactNode;
  ancho?: string;
}) {
  return (
    <div className={ancho}>
      <label htmlFor={id} className="flex items-baseline gap-1 font-body font-600 text-sm text-tinta mb-1.5">
        {etiqueta}
        {requerido && <span className="text-vino" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="font-body text-xs text-vino mt-1.5">{error}</p>
      ) : ayuda ? (
        <p id={`${id}-ayuda`} className="font-body text-xs text-tinta-suave mt-1.5">{ayuda}</p>
      ) : null}
    </div>
  );
}

const ENTRADA_FORM =
  "w-full h-11 font-body text-[15px] text-tinta bg-white border border-borde rounded-input px-3.5 placeholder:text-tinta-suave/50 focus:border-vino focus:outline-none focus:ring-2 focus:ring-vino/15 disabled:opacity-60 aria-[invalid=true]:border-vino";

function Bloque({ numero, titulo, descripcion, children }: { numero: number; titulo: string; descripcion: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 md:gap-8 py-6 border-t border-borde first:border-t-0 first:pt-0">
      <div>
        <p className="flex items-center gap-2 font-display font-bold text-tinta text-lg">
          <span className="w-6 h-6 rounded-full bg-vino text-crema-papel font-mono text-[11px] flex items-center justify-center">{numero}</span>
          {titulo}
        </p>
        <p className="font-body text-sm text-tinta-suave mt-1">{descripcion}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5 items-start">{children}</div>
    </section>
  );
}

/**
 * Crear o editar un cliente. Sin `cliente`: crea la cuenta y la ficha (y
 * devuelve la clave). Con `cliente`: edita su ficha y su correo; la clave se
 * cambia aparte, con "Generar clave nueva" en la ficha.
 */
export function FormularioCliente({
  es, cliente, onListo, onCancelar,
}: {
  es: boolean;
  cliente?: Cliente;
  onListo: (c: Cliente, clave?: string) => void;
  onCancelar: () => void;
}) {
  const editando = Boolean(cliente);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [campoMalo, setCampoMalo] = useState<string | null>(null);
  const [claveManual, setClaveManual] = useState(false);

  async function crear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setCampoMalo(null);
    const datos = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    if (!claveManual || editando) delete datos.clave;
    setOcupado(true);
    const r = cliente
      ? await llamarApi<{ cliente?: Cliente; clave?: string }>(`/api/admin/clientes/${cliente.id}`, { method: "PATCH", body: datos })
      : await llamarApi<{ cliente?: Cliente; clave?: string }>("/api/admin/clientes", { body: datos });
    setOcupado(false);
    if (!r.ok) {
      if (r.error === "campo_invalido" && r.campo) {
        setCampoMalo(r.campo);
        document.getElementById(`nc-${r.campo}`)?.focus();
      } else if (r.error === "documento_repetido") setCampoMalo("documento");
      else if (r.error === "email_repetido") setCampoMalo("email");
      return setError(mensajeError(r.error, r.campo, es));
    }
    onListo(r.data.cliente ?? cliente!, r.data.clave);
  }

  const props = (k: string) => ({
    id: `nc-${k}`,
    name: k,
    disabled: ocupado,
    className: ENTRADA_FORM,
    defaultValue: cliente ? String((cliente as unknown as Record<string, unknown>)[k] ?? "") : undefined,
    "aria-invalid": campoMalo === k,
    "aria-describedby": campoMalo === k ? `nc-${k}-error` : undefined,
  });
  const errorDe = (k: string) => (campoMalo === k ? error : undefined);

  return (
    <form onSubmit={crear} noValidate className="rounded-card-lg border border-borde bg-white shadow-card-hover animate-[fadeUp_.25s_ease-out]">
      <header className="flex items-start justify-between gap-4 px-6 md:px-8 pt-6 pb-5 border-b border-borde">
        <div>
          <p className="font-mono text-[10px] tracking-[.18em] text-dorado uppercase mb-1">{es ? "CLIENTES" : "CLIENTS"}</p>
          <h2 className="font-display font-bold text-tinta text-2xl">
            {editando ? (es ? "Editar cliente" : "Edit client") : (es ? "Nuevo cliente" : "New client")}
          </h2>
          <p className="font-body text-sm text-tinta-suave mt-0.5">
            {cliente
              ? es ? `Cambia los datos de ${cliente.negocio || cliente.nombre || cliente.email}.` : `Update the details of ${cliente.negocio || cliente.nombre || cliente.email}.`
              : es ? "Se crea su ficha y su usuario para entrar a ver compras y horas." : "Creates their profile and a login to see purchases and hours."}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          disabled={ocupado}
          aria-label={es ? "Cerrar" : "Close"}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-tinta-suave hover:bg-arena hover:text-tinta transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="px-6 md:px-8 py-6">
        <Bloque numero={1} titulo={es ? "Negocio" : "Business"} descripcion={es ? "Con el NIT o cédula se buscan sus compras en el inventario." : "The tax ID is used to look up purchases in inventory."}>
          <Campo id="nc-negocio" etiqueta={es ? "Cafetería o negocio" : "Café or business"} ancho="sm:col-span-2" ayuda={es ? "Déjalo vacío si es una persona." : "Leave empty for an individual."}>
            <input {...props("negocio")} placeholder={es ? "Café La Esquina" : "Corner Café"} autoComplete="organization" />
          </Campo>
          <Campo id="nc-documento" etiqueta={es ? "NIT o cédula" : "Tax ID"} requerido error={errorDe("documento")} ayuda={es ? "Sin puntos. Ej: 900123456-7" : "No dots. E.g. 900123456-7"}>
            <input {...props("documento")} required inputMode="text" placeholder="900123456-7" />
          </Campo>
          <Campo id="nc-ciudad" etiqueta={es ? "Ciudad" : "City"}>
            <SelectorCiudad id="nc-ciudad" es={es} defaultValue={cliente?.ciudad} disabled={ocupado} className={ENTRADA_FORM} />
          </Campo>
        </Bloque>

        <Bloque numero={2} titulo={es ? "Contacto" : "Contact"} descripcion={es ? "La persona con quien coordinas pedidos y capacitaciones." : "Who you coordinate orders and training with."}>
          <Campo id="nc-nombre" etiqueta={es ? "Nombre" : "Name"} requerido error={errorDe("nombre")}>
            <input {...props("nombre")} required placeholder={es ? "Ana Gómez" : "Ana Gomez"} autoComplete="name" />
          </Campo>
          <Campo id="nc-telefono" etiqueta={es ? "Teléfono / WhatsApp" : "Phone / WhatsApp"}>
            <input {...props("telefono")} type="tel" inputMode="tel" placeholder="300 123 4567" autoComplete="tel" />
          </Campo>
        </Bloque>

        <Bloque
          numero={3}
          titulo={es ? "Acceso" : "Access"}
          descripcion={editando
            ? es ? "El correo es su usuario. Si lo cambias, entra con el nuevo." : "Email is their username. If you change it, they sign in with the new one."
            : es ? "Con esto entra a su cuenta. Se lo envías tú al terminar." : "Their login. You send it to them when done."}
        >
          <Campo id="nc-email" etiqueta={es ? "Correo" : "Email"} requerido error={errorDe("email")} ayuda={es ? (editando ? "Es su usuario para entrar." : "Será su usuario para entrar.") : "Their username."}>
            <input {...props("email")} type="email" required placeholder="ana@cafelaesquina.co" autoComplete="off" />
          </Campo>
          {editando ? (
            <Campo id="nc-clave-info" etiqueta={es ? "Contraseña" : "Password"}>
              <div id="nc-clave-info" className="h-11 flex items-center gap-2 rounded-input border border-dashed border-borde-2 bg-arena/40 px-3.5 font-body text-sm text-tinta-suave">
                <span aria-hidden="true">🔒</span>
                {es ? "No se muestra" : "Not shown"}
              </div>
              <p className="font-body text-xs text-tinta-suave mt-1.5">
                {es ? "Para cambiarla, usa «Generar clave nueva» en la ficha." : "To change it, use \"Generate new password\" on the profile."}
              </p>
            </Campo>
          ) : (
          <Campo
            id="nc-clave"
            etiqueta={es ? "Contraseña" : "Password"}
            error={errorDe("clave")}
          >
            {claveManual ? (
              <input {...props("clave")} type="text" minLength={8} autoComplete="new-password" placeholder={es ? "Escríbela" : "Type it"} />
            ) : (
              <div className="h-11 flex items-center gap-2 rounded-input border border-dashed border-borde-2 bg-arena/40 px-3.5 font-body text-[15px] text-tinta-suave">
                <span aria-hidden="true">🔒</span>
                {es ? "Automática" : "Automatic"}
              </div>
            )}
            {campoMalo !== "clave" && (
              <p className="font-body text-xs text-tinta-suave mt-1.5">
                {claveManual
                  ? es ? "Mínimo 8 caracteres. " : "At least 8 characters. "
                  : es ? "Se crea una segura y te la mostramos al final. " : "A secure one is generated and shown at the end. "}
                <button
                  type="button"
                  onClick={() => setClaveManual((v) => !v)}
                  disabled={ocupado}
                  className="font-700 text-vino hover:underline"
                >
                  {claveManual ? (es ? "Mejor que se genere sola" : "Generate it instead") : (es ? "Prefiero escribirla yo" : "I'll type it myself")}
                </button>
              </p>
            )}
          </Campo>
          )}
        </Bloque>

        <Bloque numero={4} titulo={es ? "Notas internas" : "Internal notes"} descripcion={es ? "Solo las ve el equipo. El cliente no." : "Team only. The client never sees them."}>
          <Campo id="nc-notas" etiqueta={es ? "Notas" : "Notes"} ancho="sm:col-span-2">
            <textarea
              id="nc-notas"
              name="notas"
              rows={3}
              maxLength={2000}
              defaultValue={cliente?.notas ?? ""}
              disabled={ocupado}
              placeholder={es ? "Horario de entregas, molino que usan, cómo nos conocieron…" : "Delivery hours, grinder, how they found us…"}
              className={`${ENTRADA_FORM} h-auto py-2.5 resize-y`}
            />
          </Campo>
        </Bloque>
      </div>

      <footer className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-6 md:px-8 py-4 border-t border-borde bg-arena/30 rounded-b-card-lg">
        <p className="font-body text-xs text-tinta-suave">
          <span className="text-vino">*</span> {es ? "Obligatorio" : "Required"}
          {error && !campoMalo && <span role="alert" className="block sm:inline sm:ml-3 text-sm text-vino">{error}</span>}
        </p>
        <div className="flex gap-2 sm:justify-end">
          <button type="button" onClick={onCancelar} disabled={ocupado} className="flex-1 sm:flex-none font-body font-700 text-sm px-5 py-2.5 rounded-btn border border-borde-2 text-tinta-cafe hover:border-vino hover:text-vino">
            {es ? "Cancelar" : "Cancel"}
          </button>
          <button type="submit" disabled={ocupado} className="flex-1 sm:flex-none font-body font-700 text-sm px-5 py-2.5 rounded-btn bg-vino text-crema-papel hover:bg-vino-900 disabled:opacity-60">
            {editando
              ? ocupado ? (es ? "Guardando…" : "Saving…") : (es ? "Guardar cambios" : "Save changes")
              : ocupado ? (es ? "Creando…" : "Creating…") : (es ? "Crear cliente y usuario" : "Create client and login")}
          </button>
        </div>
      </footer>
    </form>
  );
}

export default function AdminClientes({ es }: { es: boolean }) {
  const [clientes, setClientes] = useState<ClienteLista[] | null>(null);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  /** El cliente que se está editando (se muestra el formulario en vez de la ficha). */
  const [editando, setEditando] = useState<Cliente | null>(null);
  /** Sube al guardar, para que la ficha se vuelva a leer. */
  const [version, setVersion] = useState(0);
  const [credenciales, setCredenciales] = useState<{ email: string; clave: string } | null>(null);

  const cargar = useCallback(async () => {
    const r = await llamarApi<{ clientes: ClienteLista[] }>("/api/admin/clientes");
    if (r.ok) {
      setClientes(r.data.clientes);
      setError("");
    } else {
      setClientes([]);
      setError(mensajeError(r.error, r.campo, es, r.mensaje));
    }
  }, [es]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (clientes ?? []).filter(
      (c) => !q || [c.nombre, c.negocio, c.documento, c.email, c.ciudad].some((v) => v.toLowerCase().includes(q))
    );
  }, [clientes, busqueda]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
      {/* ── Lista ── */}
      <div className="space-y-3 lg:sticky lg:top-24">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display font-bold text-tinta text-2xl">
            {es ? "Clientes" : "Clients"}{" "}
            <span className="font-mono text-sm text-tinta-suave align-middle">{clientes?.length ?? ""}</span>
          </h2>
          {!creando && (
            <button
              type="button"
              onClick={() => { setCreando(true); setEditando(null); setCredenciales(null); }}
              className="font-body font-700 text-sm px-3.5 py-2 rounded-btn bg-naranja text-white hover:bg-naranja-700 shadow-cta"
            >
              + {es ? "Nuevo" : "New"}
            </button>
          )}
        </div>

        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={es ? "Buscar negocio, NIT, correo…" : "Search business, tax ID, email…"}
          aria-label={es ? "Buscar clientes" : "Search clients"}
          className={ENTRADA}
        />
        {error && <p role="alert" className="font-body text-sm text-vino">{error}</p>}

        {clientes === null ? (
          <p className="font-body text-sm text-tinta-suave py-6">{es ? "Cargando…" : "Loading…"}</p>
        ) : visibles.length === 0 ? (
          <p className="font-body text-sm text-tinta-suave py-6">
            {clientes.length === 0 ? (es ? "Aún no hay clientes. Crea el primero." : "No clients yet. Create the first one.") : (es ? "Nada coincide." : "No matches.")}
          </p>
        ) : (
          <ul className="rounded-card border border-borde bg-white divide-y divide-borde max-h-[65vh] overflow-y-auto">
            {visibles.map((c) => {
              const activo = c.id === elegido;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => { setElegido(c.id); setEditando(null); setCreando(false); }}
                    aria-current={activo}
                    className={`w-full text-left px-4 py-3 transition-colors ${activo ? "bg-vino/5 border-l-4 border-vino" : "hover:bg-arena/40 border-l-4 border-transparent"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-body font-700 text-sm text-tinta truncate">{c.negocio || c.nombre || c.email}</span>
                      {!c.activo && (
                        <span className="font-mono text-[9px] tracking-[.12em] uppercase bg-borde text-tinta-suave px-1.5 py-0.5 rounded-pill">
                          {es ? "Inactivo" : "Inactive"}
                        </span>
                      )}
                    </span>
                    <span className="block font-mono text-[11px] text-tinta-suave truncate">
                      {c.documento || (es ? "sin NIT/cédula" : "no tax ID")} · {c.horasUsadas} h {es ? "usadas" : "used"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Formulario o ficha, en el panel ancho ── */}
      <div className="space-y-4">
        {credenciales && !creando && !editando && (
          <Credenciales email={credenciales.email} clave={credenciales.clave} es={es} onCerrar={() => setCredenciales(null)} />
        )}
        {creando ? (
          <FormularioCliente
            es={es}
            onCancelar={() => setCreando(false)}
            onListo={(c, clave) => {
              setCreando(false);
              if (clave) setCredenciales({ email: c.email, clave });
              setElegido(c.id);
              cargar();
            }}
          />
        ) : editando ? (
          <FormularioCliente
            key={editando.id}
            es={es}
            cliente={editando}
            onCancelar={() => setEditando(null)}
            onListo={() => {
              setEditando(null);
              setVersion((v) => v + 1);
              cargar();
            }}
          />
        ) : elegido ? (
          <FichaCliente
            key={`${elegido}-${version}`}
            id={elegido}
            es={es}
            onEditar={(c) => { setEditando(c); setCredenciales(null); }}
            onCambio={cargar}
            onBorrado={() => { setElegido(null); cargar(); }}
          />
        ) : (
          <div className="rounded-card-lg border border-dashed border-borde-2 bg-white/50 p-10 text-center">
            <p className="font-display font-bold text-tinta text-xl mb-1">{es ? "Elige un cliente" : "Pick a client"}</p>
            <p className="font-body text-sm text-tinta-suave">
              {es
                ? "Verás sus compras del inventario, sus horas de capacitación y podrás registrar las sesiones dadas."
                : "You'll see their inventory purchases and training hours, and can log sessions."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { llamarApi } from "@/lib/pago";
import { etiqueta, formatCOP, formatFecha } from "@/lib/format";
import type { Catalogo, Cobro, EstadoSuscripcion, Suscripcion } from "@/lib/types";

// Suscripciones para el equipo: qué hay que despachar, cuánto entra, qué
// falló y por qué se van. Solo lectura. El permiso lo revisa cada ruta de
// /api/admin contra es_equipo(); esta pantalla no decide nada.

type Fila = Suscripcion & { email: string; nombre: string };

interface Resumen {
  resumen: {
    conteo: Record<EstadoSuscripcion, number>;
    recurrenteMensual: number;
    cobradoMes: number;
    fallidosMes: number;
    atascados: { referencia: string; suscripcion_id: string; creado_en: string }[];
  };
  motivos: Record<string, number>;
  comentarios: { motivo: string; texto: string; creada_en: string }[];
  proximosEnvios: {
    id: string; suscripcion_id: string; numero: number; fecha_programada: string; bolsas: number;
    molienda: string; perfil: string; plan_id: string; regalo: boolean; origen: string; email: string;
    direccion: { nombre: string; ciudad: string; linea: string; telefono: string } | null;
  }[];
  suscripciones: Fila[];
}

interface Detalle {
  suscripcion: Suscripcion;
  cliente: { email: string; nombre: string; telefono: string; quiz_respuestas: Record<string, unknown> | null } | null;
  direccion: { nombre: string; telefono: string; linea: string; ciudad: string; departamento: string; notas: string } | null;
  metodoPago: { tipo: string; marca: string; ultimos4: string; telefono: string; estado: string } | null;
  envios: { id: string; numero: number; fecha_programada: string; estado: string; bolsas: number; molienda: string; origen: string }[];
  cobros: (Cobro & { wompiTransactionId: string | null })[];
  eventos: { tipo: string; actor: string; estado_anterior: string | null; estado_nuevo: string | null; datos: Record<string, unknown>; creado_en: string }[];
  cancelaciones: { motivo: string; texto: string; creada_en: string }[];
}

const ESTADOS: [EstadoSuscripcion, string][] = [
  ["activa", "Activas"], ["pausada", "En pausa"], ["pago_pendiente", "Pago pendiente"], ["cancelada", "Canceladas"],
];

const MOTIVOS: Record<string, string> = {
  precio: "Precio", mucho_cafe: "Le sobra café", sabor: "Sabor", envios: "Envíos", otra_marca: "Otra marca",
  temporal: "Temporal", otro: "Otro", prefiero_no_decir: "Prefirió no decir", pago_fallido: "Pago fallido",
};

const TH = "text-left font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase px-3 py-2";
const TD = "px-3 py-2 font-body text-sm text-tinta";

export default function AdminSuscripciones({ catalogo }: { catalogo: Catalogo }) {
  const [datos, setDatos] = useState<Resumen | null>(null);
  const [estado, setEstado] = useState<EstadoSuscripcion | "">("");
  const [busqueda, setBusqueda] = useState("");
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const params = new URLSearchParams();
    if (estado) params.set("estado", estado);
    if (busqueda.trim()) params.set("q", busqueda.trim());
    const r = await llamarApi<Resumen>(`/api/admin/suscripciones?${params}`);
    if (r.ok) {
      setDatos(r.data);
      setError("");
    } else {
      setError(r.status === 403 ? "Tu usuario no tiene permiso de administración." : "No se pudo cargar el panel.");
    }
  }, [estado, busqueda]);

  useEffect(() => {
    const t = setTimeout(cargar, busqueda ? 300 : 0);
    return () => clearTimeout(t);
  }, [cargar, busqueda]);

  async function abrir(id: string) {
    const r = await llamarApi<Detalle>(`/api/admin/suscripciones/${id}`);
    if (r.ok) setDetalle(r.data);
  }

  if (error) return <p className="font-body text-vino text-sm" role="alert">{error}</p>;
  if (!datos) return <p className="font-body text-tinta-suave text-sm">Cargando…</p>;

  const { resumen } = datos;
  const totalMotivos = Object.values(datos.motivos).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      {/* Números */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ESTADOS.map(([e, texto]) => (
          <button key={e} type="button" onClick={() => setEstado(estado === e ? "" : e)} aria-pressed={estado === e}
            className={`text-left rounded-card border p-4 transition-colors ${estado === e ? "border-vino ring-1 ring-vino bg-white" : "border-borde bg-white hover:border-vino"}`}>
            <span className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase block">{texto}</span>
            <span className="font-display font-bold text-tinta text-3xl">{resumen.conteo[e] ?? 0}</span>
          </button>
        ))}
        <Numero titulo="Recurrente al mes (est.)" valor={formatCOP(resumen.recurrenteMensual)} />
        <Numero titulo="Cobrado este mes" valor={formatCOP(resumen.cobradoMes)} />
        <Numero titulo="Cobros fallidos este mes" valor={String(resumen.fallidosMes)} />
        <Numero titulo="Cobros sin respuesta" valor={String(resumen.atascados.length)} alerta={resumen.atascados.length > 0} />
      </section>

      {resumen.atascados.length > 0 && (
        <section className="rounded-card border-2 border-naranja bg-white p-4">
          <p className="font-body font-700 text-tinta text-sm mb-1">Cobros sin respuesta de Wompi</p>
          <p className="font-body text-tinta-suave text-sm mb-2">
            El proceso se cortó entre guardar el cobro y hablar con Wompi. Busca la referencia en el panel de Wompi antes de hacer nada:
            si se cobró, hay que marcarlo a mano; si no, se puede borrar el cobro para que el cron vuelva a intentar.
          </p>
          <ul className="font-mono text-xs text-tinta">
            {resumen.atascados.map((a) => (
              <li key={a.referencia}>
                <button type="button" className="underline" onClick={() => abrir(a.suscripcion_id)}>{a.referencia}</button> · {formatFecha(a.creado_en, true)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Despachos */}
      <section>
        <h2 className="font-display font-bold text-tinta text-2xl mb-3">Envíos pagados, próximas dos semanas</h2>
        {datos.proximosEnvios.length === 0 ? (
          <p className="font-body text-tinta-suave text-sm">No hay envíos programados.</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-borde bg-white">
            <table className="w-full border-collapse min-w-[720px]">
              <thead><tr className="border-b border-borde">
                <th className={TH}>Fecha</th><th className={TH}>Cliente</th><th className={TH}>Plan</th>
                <th className={TH}>Bolsas</th><th className={TH}>Molienda</th><th className={TH}>Perfil</th><th className={TH}>Ciudad</th>
              </tr></thead>
              <tbody>
                {datos.proximosEnvios.map((e) => (
                  <tr key={e.id} className="border-b border-borde last:border-0 hover:bg-arena/40 cursor-pointer" onClick={() => abrir(e.suscripcion_id)}>
                    <td className={TD}>{formatFecha(e.fecha_programada, true)}</td>
                    <td className={TD}>{e.direccion?.nombre ?? ""}<span className="block text-xs text-tinta-suave">{e.email}</span></td>
                    <td className={TD}>{etiqueta(catalogo.planes, e.plan_id, true)}</td>
                    <td className={TD}>{e.bolsas}{e.regalo && " (+regalo)"}</td>
                    <td className={TD}>{etiqueta(catalogo.moliendas, e.molienda, true)}</td>
                    <td className={TD}>{etiqueta(catalogo.perfiles, e.perfil, true)}</td>
                    <td className={TD}>{e.direccion?.ciudad ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Listado */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <h2 className="font-display font-bold text-tinta text-2xl">
            Suscripciones{estado && ` · ${ESTADOS.find(([e]) => e === estado)?.[1]}`}
          </h2>
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por correo o nombre"
            aria-label="Buscar suscripciones"
            className="bg-white border border-borde rounded-input px-3 py-2 font-body text-sm text-tinta w-full sm:w-72 focus:outline-none focus:border-naranja" />
        </div>
        <div className="overflow-x-auto rounded-card border border-borde bg-white">
          <table className="w-full border-collapse min-w-[820px]">
            <thead><tr className="border-b border-borde">
              <th className={TH}>Cliente</th><th className={TH}>Estado</th><th className={TH}>Plan</th><th className={TH}>Frecuencia</th>
              <th className={TH}>Próximo envío</th><th className={TH}>Prepago</th><th className={TH}>Intentos</th><th className={TH}>Desde</th>
            </tr></thead>
            <tbody>
              {datos.suscripciones.map((s) => (
                <tr key={s.id} className="border-b border-borde last:border-0 hover:bg-arena/40 cursor-pointer" onClick={() => abrir(s.id)}>
                  <td className={TD}>{s.nombre || "—"}<span className="block text-xs text-tinta-suave">{s.email}</span></td>
                  <td className={TD}>{ESTADOS.find(([e]) => e === s.estado)?.[1]}</td>
                  <td className={TD}>{etiqueta(catalogo.planes, s.planId, true)}</td>
                  <td className={TD}>{etiqueta(catalogo.frecuencias, s.frecuenciaId, true)}</td>
                  <td className={TD}>{s.estado === "pausada" ? `Vuelve ${formatFecha(s.pausadaHasta, true)}` : formatFecha(s.proximoEnvio, true)}</td>
                  <td className={TD}>{s.enviosPrepagadosRestantes || "—"}</td>
                  <td className={TD}>{s.intentosFallidos || "—"}</td>
                  <td className={TD}>{formatFecha(s.creadaEn, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {datos.suscripciones.length === 0 && <p className="font-body text-tinta-suave text-sm p-4">Nada con ese filtro.</p>}
        </div>
      </section>

      {/* Cancelaciones */}
      <section className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-display font-bold text-tinta text-2xl mb-3">Por qué cancelan</h2>
          {totalMotivos === 0 ? (
            <p className="font-body text-tinta-suave text-sm">Todavía no hay cancelaciones.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(datos.motivos).sort((a, b) => b[1] - a[1]).map(([m, n]) => (
                <li key={m}>
                  <div className="flex justify-between font-body text-sm text-tinta"><span>{MOTIVOS[m] ?? m}</span><span>{n}</span></div>
                  <div className="h-1.5 rounded-pill bg-arena overflow-hidden">
                    <div className="h-full bg-vino origin-left" style={{ transform: `scaleX(${n / totalMotivos})`, width: "100%" }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="font-display font-bold text-tinta text-2xl mb-3">Lo que escribieron</h2>
          {datos.comentarios.length === 0 ? (
            <p className="font-body text-tinta-suave text-sm">Sin comentarios.</p>
          ) : (
            <ul className="space-y-3">
              {datos.comentarios.map((c, i) => (
                <li key={i} className="font-body text-sm text-tinta border-l-2 border-borde pl-3">
                  “{c.texto}”
                  <span className="block font-mono text-[10px] text-tinta-suave">{MOTIVOS[c.motivo] ?? c.motivo} · {formatFecha(c.creada_en, true)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {detalle && <DetalleSuscripcion d={detalle} catalogo={catalogo} onCerrar={() => setDetalle(null)} />}
    </div>
  );
}

function Numero({ titulo, valor, alerta }: { titulo: string; valor: string; alerta?: boolean }) {
  return (
    <div className={`rounded-card border p-4 bg-white ${alerta ? "border-naranja" : "border-borde"}`}>
      <span className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase block">{titulo}</span>
      <span className="font-display font-bold text-tinta text-2xl">{valor}</span>
    </div>
  );
}

function DetalleSuscripcion({ d, catalogo, onCerrar }: { d: Detalle; catalogo: Catalogo; onCerrar: () => void }) {
  const s = d.suscripcion;
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 bg-tinta/40 flex justify-end" onClick={onCerrar}>
      <aside role="dialog" aria-modal="true" aria-label="Detalle de la suscripción"
        className="w-full max-w-[560px] h-full overflow-y-auto bg-fondo p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-display font-bold text-tinta text-2xl">{d.cliente?.nombre || d.cliente?.email}</h2>
            <p className="font-body text-tinta-suave text-sm">{d.cliente?.email} · {d.cliente?.telefono}</p>
          </div>
          <button type="button" onClick={onCerrar} className="font-body text-sm underline text-tinta-suave">Cerrar</button>
        </div>

        <dl className="grid grid-cols-2 gap-3 mb-6 font-body text-sm">
          {[
            ["Estado", s.estado],
            ["Plan", etiqueta(catalogo.planes, s.planId, true)],
            ["Frecuencia", etiqueta(catalogo.frecuencias, s.frecuenciaId, true)],
            ["Molienda", etiqueta(catalogo.moliendas, s.moliendaId, true)],
            ["Perfil", etiqueta(catalogo.perfiles, s.perfilId, true)],
            ["Pago", etiqueta(catalogo.prepagos, s.prepagoId, true)],
            ["Próximo envío", formatFecha(s.proximoEnvio, true)],
            ["Prepagados", String(s.enviosPrepagadosRestantes)],
            ["Envíos hechos", String(s.enviosHechos)],
            ["Intentos fallidos", String(s.intentosFallidos)],
            ["Medio de pago", d.metodoPago ? `${d.metodoPago.tipo} ${d.metodoPago.marca} ${d.metodoPago.ultimos4 || d.metodoPago.telefono}` : "—"],
            ["Cambios en espera", Object.keys(s.cambiosPendientes).length ? JSON.stringify(s.cambiosPendientes) : "—"],
          ].map(([k, v]) => (
            <div key={k}><dt className="font-mono text-[10px] uppercase tracking-[.15em] text-tinta-suave">{k}</dt><dd className="text-tinta">{v}</dd></div>
          ))}
        </dl>

        {d.direccion && (
          <Bloque titulo="Dirección">
            <p className="font-body text-sm text-tinta">{d.direccion.nombre} · {d.direccion.telefono}</p>
            <p className="font-body text-sm text-tinta-suave">{d.direccion.linea}, {d.direccion.ciudad}, {d.direccion.departamento}{d.direccion.notas && ` · ${d.direccion.notas}`}</p>
          </Bloque>
        )}

        {d.cliente?.quiz_respuestas && (
          <Bloque titulo="Respuestas del quiz">
            <pre className="font-mono text-xs text-tinta whitespace-pre-wrap">{JSON.stringify(d.cliente.quiz_respuestas, null, 1)}</pre>
          </Bloque>
        )}

        <Bloque titulo="Cobros">
          {d.cobros.length === 0 ? <p className="text-sm text-tinta-suave">—</p> : (
            <ul className="space-y-1">
              {d.cobros.map((c) => (
                <li key={c.id} className="font-body text-sm text-tinta">
                  {formatFecha(c.creadoEn, true)} · {formatCOP(c.montoCop)} · <strong>{c.estado}</strong> · {c.origen}
                  <span className="block font-mono text-[10px] text-tinta-suave">{c.referencia}{c.wompiTransactionId && ` · tx ${c.wompiTransactionId}`}{c.motivo && ` · ${c.motivo}`}</span>
                </li>
              ))}
            </ul>
          )}
        </Bloque>

        <Bloque titulo="Envíos">
          {d.envios.length === 0 ? <p className="text-sm text-tinta-suave">—</p> : (
            <ul className="space-y-1">
              {d.envios.map((e) => (
                <li key={e.id} className="font-body text-sm text-tinta">
                  #{e.numero} · {formatFecha(e.fecha_programada, true)} · {e.estado} · {e.bolsas} bolsas · {e.molienda} · {e.origen}
                </li>
              ))}
            </ul>
          )}
        </Bloque>

        {d.cancelaciones.length > 0 && (
          <Bloque titulo="Cancelación">
            {d.cancelaciones.map((c, i) => (
              <p key={i} className="font-body text-sm text-tinta">{MOTIVOS[c.motivo] ?? c.motivo}{c.texto && ` — “${c.texto}”`}</p>
            ))}
          </Bloque>
        )}

        <Bloque titulo="Bitácora">
          <ul className="space-y-1">
            {d.eventos.map((e, i) => (
              <li key={i} className="font-mono text-[11px] text-tinta">
                {new Date(e.creado_en).toLocaleString("es-CO")} · {e.actor} · {e.tipo}
                {e.estado_anterior !== e.estado_nuevo && e.estado_nuevo && ` · ${e.estado_anterior} → ${e.estado_nuevo}`}
                {Object.keys(e.datos ?? {}).length > 0 && <span className="text-tinta-suave"> · {JSON.stringify(e.datos)}</span>}
              </li>
            ))}
          </ul>
        </Bloque>
      </aside>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-borde bg-white p-4 mb-4">
      <h3 className="font-mono text-[10px] tracking-[.15em] text-tinta-suave uppercase mb-2">{titulo}</h3>
      {children}
    </section>
  );
}

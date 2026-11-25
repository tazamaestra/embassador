"use client";

import { useEffect, useState, type FormEvent } from "react";
import { GraduationCap } from "@phosphor-icons/react";
import { Link, useRouter } from "@/lib/nav";
import { LARGO_MINIMO_PASSWORD, traducirErrorAuth, useAuthStore } from "@/lib/auth-store";
import { llamarApi } from "@/lib/pago";
import { CUARTERONES_MES_REGALO, CUARTERONES_POR_HORA } from "@/lib/capacitacion";
import type { Locale, Pedido, ResumenCliente } from "@/lib/types";
import NuevoPedido from "@/components/cuenta/NuevoPedido";
import MisCursos from "@/components/cuenta/MisCursos";
import ListaPedidos from "@/components/clientes/ListaPedidos";
import { AvisoInventario, ListaCapacitaciones, NotaSimuladas, TablaCompras, TarjetasHoras } from "@/components/clientes/ResumenHoras";

// La cuenta del cliente: sus horas de capacitación (ganadas con cada 3
// cuarterones), las sesiones que ya tomó y sus compras, leídas del
// inventario. Todo de solo lectura; los datos los mantiene el equipo.

type Estado = "cargando" | "listo" | "sin_ficha" | "inactivo" | "error";

const ENTRADA =
  "w-full font-body text-base text-tinta bg-white border border-borde rounded-input px-3.5 py-2.5 focus:border-vino focus:outline-none focus:ring-2 focus:ring-vino/15";

function CambiarClave({ es }: { es: boolean }) {
  const { cambiarClave } = useAuthStore();
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nueva = String(f.get("nueva") ?? "");
    if (nueva.length < LARGO_MINIMO_PASSWORD) {
      return setMensaje({ ok: false, texto: es ? `Mínimo ${LARGO_MINIMO_PASSWORD} caracteres.` : `At least ${LARGO_MINIMO_PASSWORD} characters.` });
    }
    if (nueva !== String(f.get("repetir") ?? "")) {
      return setMensaje({ ok: false, texto: es ? "Las dos contraseñas no coinciden." : "The passwords don't match." });
    }
    setOcupado(true);
    const r = await cambiarClave(nueva);
    setOcupado(false);
    if (!r.ok) return setMensaje({ ok: false, texto: traducirErrorAuth(r.error, es) });
    setMensaje({ ok: true, texto: es ? "Listo. Tu contraseña quedó cambiada." : "Done. Your password was changed." });
    e.currentTarget.reset();
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="font-body text-sm text-tinta-suave hover:text-vino underline">
        {es ? "Cambiar mi contraseña" : "Change my password"}
      </button>
    );
  }
  return (
    <form onSubmit={enviar} className="rounded-card border border-borde bg-white p-5 space-y-3 max-w-md animate-[fadeUp_.25s_ease-out]">
      <p className="font-display font-bold text-tinta text-lg">{es ? "Cambiar contraseña" : "Change password"}</p>
      <input name="nueva" type="password" autoComplete="new-password" placeholder={es ? "Contraseña nueva" : "New password"} className={ENTRADA} aria-label={es ? "Contraseña nueva" : "New password"} />
      <input name="repetir" type="password" autoComplete="new-password" placeholder={es ? "Repítela" : "Repeat it"} className={ENTRADA} aria-label={es ? "Repite la contraseña" : "Repeat password"} />
      {mensaje && <p role={mensaje.ok ? "status" : "alert"} className={`font-body text-sm ${mensaje.ok ? "text-verde" : "text-vino"}`}>{mensaje.texto}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={ocupado} className="font-body font-700 text-sm px-4 py-2 rounded-btn bg-vino text-crema-papel hover:bg-vino-900 disabled:opacity-60">
          {ocupado ? (es ? "Guardando…" : "Saving…") : (es ? "Guardar" : "Save")}
        </button>
        <button type="button" onClick={() => { setAbierto(false); setMensaje(null); }} className="font-body text-sm px-3 py-2 text-tinta-suave hover:text-tinta">
          {es ? "Cancelar" : "Cancel"}
        </button>
      </div>
    </form>
  );
}

export default function CuentaCliente({ locale }: { locale: Locale }) {
  const es = locale !== "en";
  const router = useRouter();
  const { user, loading, esEquipo, init, logout } = useAuthStore();
  const [estado, setEstado] = useState<Estado>("cargando");
  const [resumen, setResumen] = useState<ResumenCliente | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const [enviado, setEnviado] = useState<Pedido | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!loading && !user) router.replace("/acceso");
  }, [loading, user, router]);

  // Una cuenta del equipo no tiene ficha de cliente: su lugar es el panel.
  useEffect(() => {
    if (esEquipo) router.replace("/admin");
  }, [esEquipo, router]);

  async function cargar() {
    const r = await llamarApi<ResumenCliente>("/api/mi-cuenta");
    if (r.ok) {
      setResumen(r.data);
      setEstado("listo");
    } else setEstado(r.error === "sin_ficha" ? "sin_ficha" : r.error === "inactivo" ? "inactivo" : "error");
  }

  useEffect(() => {
    if (user) void cargar();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function abrirPedido() {
    setEnviado(null);
    setPidiendo(true);
    requestAnimationFrame(() => document.getElementById("pedir")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function salir() {
    await logout();
    router.push("/");
  }

  if (loading || !user || estado === "cargando") {
    return (
      <div className="bg-fondo min-h-[60vh] flex items-center justify-center">
        <p className="font-body text-tinta-suave">{es ? "Abriendo tu cuenta…" : "Opening your account…"}</p>
      </div>
    );
  }

  if (estado !== "listo" || !resumen) {
    const textos: Record<Exclude<Estado, "cargando" | "listo">, [string, string]> = {
      sin_ficha: ["Tu cuenta todavía no tiene ficha de cliente. Escríbenos y la activamos.", "Your account doesn't have a client profile yet. Contact us and we'll set it up."],
      inactivo: ["Esta cuenta está inactiva. Escríbenos si crees que es un error.", "This account is inactive. Contact us if you think it's a mistake."],
      error: ["No pudimos cargar tu cuenta. Intenta de nuevo en un momento.", "We couldn't load your account. Try again in a moment."],
    };
    return (
      <div className="bg-fondo min-h-[60vh] flex items-center justify-center px-5.5">
        <div className="max-w-md text-center space-y-4">
          <p className="font-body text-tinta-suave">{textos[estado as keyof typeof textos][es ? 0 : 1]}</p>
          {esEquipo && (
            <Link href="/admin" className="inline-block font-body font-700 text-sm px-4 py-2 rounded-btn bg-vino text-crema-papel">
              {es ? "Ir al panel del equipo" : "Go to team panel"}
            </Link>
          )}
          <div><button type="button" onClick={salir} className="font-body text-sm text-tinta-suave underline">{es ? "Cerrar sesión" : "Sign out"}</button></div>
        </div>
      </div>
    );
  }

  const { cliente, horas, compras, capacitaciones, inventario, comprasSimuladas, pedidos } = resumen;
  const nombre = cliente.nombre.split(" ")[0] || cliente.negocio;

  return (
    <div className="bg-fondo min-h-screen">
      {/* Saludo con las horas disponibles al frente */}
      <section
        className="relative isolate overflow-hidden"
        style={{ background: "radial-gradient(120% 130% at 80% 0%, #8A1C21, #5E0F13 55%, #3E080C)" }}
      >
        <div aria-hidden="true" className="tm-hero-halo absolute -right-40 -top-40 -z-10 w-[520px] h-[520px] rounded-full" style={{ background: "radial-gradient(circle, #F0A24B33 0%, transparent 65%)" }} />
        <div className="max-w-310 mx-auto px-5.5 py-12 md:py-16 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="tm-entra font-mono text-[11px] tracking-[.22em] text-naranja-claro uppercase mb-3">
              {es ? "MI CUENTA" : "MY ACCOUNT"}{cliente.negocio ? ` · ${cliente.negocio}` : ""}
            </p>
            <h1 className="font-display font-bold text-crema-papel leading-[1.05] mb-3" style={{ fontSize: "clamp(32px,4.6vw,56px)" }}>
              {es ? `Hola${nombre ? `, ${nombre}` : ""}.` : `Hi${nombre ? `, ${nombre}` : ""}.`}{" "}
              <em className="not-italic text-naranja-claro">{es ? "Gracias por crecer con nosotros." : "Thanks for growing with us."}</em>
            </h1>
            <p className="tm-entra font-body text-crema/80 text-base md:text-lg max-w-140 mb-6" style={{ animationDelay: "120ms" }}>
              {es
                ? `Cada ${CUARTERONES_POR_HORA} cuarterones que compras suman 1 hora de capacitación con nuestro equipo, y si en un mes llegas a ${CUARTERONES_MES_REGALO}, te regalamos 1 hora más. Barismo, calibración, métodos y lo que tu negocio necesite.`
                : `Every ${CUARTERONES_POR_HORA} large bags you buy add 1 hour of training with our team, and ${CUARTERONES_MES_REGALO} in one month earns 1 bonus hour. Barista skills, calibration, brew methods and whatever your business needs.`}
            </p>
            <button
              type="button"
              onClick={abrirPedido}
              className="tm-entra group inline-flex items-center gap-2 bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base px-6 py-3 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5"
              style={{ animationDelay: "240ms" }}
            >
              {es ? "Hacer un pedido" : "Place an order"}
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </button>
          </div>
          <div className="tm-entra flex items-center gap-4 rounded-card-lg bg-white/10 border border-white/15 px-6 py-5" style={{ animationDelay: "200ms" }}>
            <span className="w-14 h-14 rounded-full bg-naranja-claro text-vino-900 flex items-center justify-center">
              <GraduationCap size={30} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display font-bold text-crema-papel text-5xl leading-none tabular-nums">
                {Number.isInteger(horas.disponibles) ? horas.disponibles : horas.disponibles.toFixed(1)}
              </p>
              <p className="font-mono text-[10px] tracking-[.16em] text-crema/70 uppercase mt-1">
                {es ? "Horas disponibles" : "Hours available"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-310 mx-auto px-5.5 py-10 md:py-14 space-y-12">
        <div id="pedir" className="scroll-mt-24 space-y-4">
          {enviado && !pidiendo && (
            <div role="status" className="rounded-card-lg border-2 border-verde bg-verde-claro p-5 flex flex-wrap items-center justify-between gap-4 animate-[fadeUp_.3s_ease-out]">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-verde text-white flex items-center justify-center text-xl" aria-hidden="true">✓</span>
                <div>
                  <p className="font-display font-bold text-tinta text-lg">{es ? "¡Recibimos tu pedido!" : "We got your order!"}</p>
                  <p className="font-body text-sm text-tinta-suave">
                    {es ? `Referencia ${enviado.referencia}. Te escribimos para confirmar el pago y el envío.` : `Reference ${enviado.referencia}. We'll contact you to confirm payment and shipping.`}
                  </p>
                </div>
              </div>
              <button type="button" onClick={abrirPedido} className="font-body font-700 text-sm px-4 py-2 rounded-btn border border-verde text-verde hover:bg-white">
                {es ? "Hacer otro pedido" : "Place another order"}
              </button>
            </div>
          )}
          {pidiendo && (
            <NuevoPedido
              es={es}
              compras={compras}
              capacitaciones={capacitaciones}
              onCerrar={() => setPidiendo(false)}
              onEnviado={(p) => {
                setPidiendo(false);
                setEnviado(p);
                void cargar();
              }}
            />
          )}
        </div>

        <section className="space-y-4">
          <h2 className="font-display font-bold text-tinta text-2xl">{es ? "Tus horas de capacitación" : "Your training hours"}</h2>
          <TarjetasHoras horas={horas} es={es} />
        </section>

        <MisCursos es={es} />

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display font-bold text-tinta text-2xl">{es ? "Tus pedidos" : "Your orders"}</h2>
            {!pidiendo && (
              <button type="button" onClick={abrirPedido} className="font-body font-700 text-sm px-4 py-2 rounded-btn bg-vino text-crema-papel hover:bg-vino-900">
                + {es ? "Nuevo pedido" : "New order"}
              </button>
            )}
          </div>
          <ListaPedidos
            pedidos={pedidos}
            es={es}
            vacio={es ? "Aún no has hecho pedidos desde aquí. Pulsa «Nuevo pedido» para pedir café." : "No orders yet. Use “New order” to request coffee."}
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-10">
          <section className="space-y-4">
            <h2 className="font-display font-bold text-tinta text-2xl">{es ? "Tus compras" : "Your purchases"}</h2>
            {comprasSimuladas && <NotaSimuladas es={es} />}
            {/* Al cliente no se le habla del inventario: si su NIT no está, simplemente aún no hay compras. */}
            {inventario === "ok" || inventario === "no_registrado" ? (
              <TablaCompras compras={compras} es={es} />
            ) : (
              <AvisoInventario estado={inventario === "sin_documento" ? "error" : inventario} es={es} />
            )}
          </section>
          <section className="space-y-4">
            <h2 className="font-display font-bold text-tinta text-2xl">{es ? "Capacitaciones tomadas" : "Training taken"}</h2>
            <ListaCapacitaciones capacitaciones={capacitaciones} es={es} />
          </section>
        </div>

        <section className="pt-8 border-t border-borde flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="font-body text-sm text-tinta-suave">
              {es ? "Entraste como " : "Signed in as "}<span className="text-tinta font-700">{cliente.email}</span>
            </p>
            <CambiarClave es={es} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={abrirPedido} className="font-body font-700 text-sm px-4 py-2 rounded-btn bg-naranja text-white hover:bg-naranja-700 shadow-cta">
              {es ? "Pedir más café" : "Order more coffee"}
            </button>
            <button type="button" onClick={salir} className="font-body text-sm px-3 py-2 text-tinta-suave hover:text-vino">
              {es ? "Cerrar sesión" : "Sign out"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

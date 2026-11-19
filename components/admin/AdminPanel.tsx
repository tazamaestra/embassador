"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth-store";
import { esEquipo } from "@/lib/finca-fotos";
import AdminClientes from "@/components/admin/AdminClientes";
import AdminMuestras from "@/components/admin/AdminMuestras";
import AdminCursos from "@/components/admin/AdminCursos";
import AdminCafes from "@/components/admin/AdminCafes";
import type { Locale } from "@/lib/types";

// Panel del equipo. Dos roles en la app: cliente y admin. Admin es quien
// tiene fila en la tabla `equipo` (es_equipo() en Postgres). Esta pantalla
// solo decide qué mostrar; lo que protege los datos son las rutas de
// /api/admin y las policies, que vuelven a preguntar el rol en el servidor.

type Permiso = "verificando" | "concedido" | "denegado";
type Pestaña = "clientes" | "cursos" | "muestras" | "cafes";

export default function AdminPanel({ locale }: { locale: Locale }) {
  const es = locale !== "en";
  const router = useRouter();
  const { user, loading, init } = useAuthStore();
  const [permiso, setPermiso] = useState<Permiso>("verificando");
  const [pestaña, setPestaña] = useState<Pestaña>("clientes");

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!loading && !user) router.replace("/acceso");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    esEquipo()
      .then((ok) => setPermiso(ok ? "concedido" : "denegado"))
      .catch(() => setPermiso("denegado"));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || permiso === "verificando") {
    return (
      <div className="bg-fondo min-h-[60vh] flex items-center justify-center">
        <p className="font-body text-tinta-suave text-base">{es ? "Verificando permisos…" : "Checking permissions…"}</p>
      </div>
    );
  }

  if (permiso === "denegado") {
    return (
      <div className="bg-fondo min-h-[60vh] flex items-center justify-center px-5.5">
        <div className="text-center max-w-105">
          <h1 className="font-display font-bold text-tinta text-3xl mb-3">{es ? "Panel del equipo" : "Team panel"}</h1>
          <p className="font-body text-tinta-suave text-base">
            {es
              ? "Esta cuenta no está en el equipo interno. Si crees que debería estarlo, pide que la agreguen a la tabla equipo."
              : "This account isn't on the internal team. If it should be, ask to be added to the equipo table."}
          </p>
        </div>
      </div>
    );
  }

  const tab = (id: Pestaña, texto: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={pestaña === id}
      onClick={() => setPestaña(id)}
      className={`font-body font-700 text-sm pb-2 -mb-px border-b-2 whitespace-nowrap ${
        pestaña === id ? "border-vino text-tinta" : "border-transparent text-tinta-suave hover:text-tinta"
      }`}
    >
      {texto}
    </button>
  );

  return (
    <div className="bg-fondo min-h-screen">
      <div className="max-w-310 mx-auto px-5.5 pt-10">
        <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">{es ? "EQUIPO" : "TEAM"}</p>
        <div role="tablist" aria-label={es ? "Secciones del panel" : "Panel sections"} className="flex gap-6 border-b border-borde mb-8 overflow-x-auto">
          {tab("clientes", es ? "Clientes" : "Clients")}
          {tab("cursos", es ? "Cursos" : "Courses")}
          {tab("muestras", es ? "Muestras" : "Samples")}
          {tab("cafes", es ? "Cafés" : "Coffees")}
        </div>
      </div>

      {pestaña === "cafes" ? (
        <AdminCafes locale={locale} />
      ) : (
        <div className="max-w-310 mx-auto px-5.5 pb-16">
          {pestaña === "clientes" && <AdminClientes es={es} />}
          {pestaña === "cursos" && <AdminCursos es={es} />}
          {pestaña === "muestras" && <AdminMuestras es={es} />}
        </div>
      )}
    </div>
  );
}

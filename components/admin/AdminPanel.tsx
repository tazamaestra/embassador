"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth-store";
import { esEquipo } from "@/lib/finca-fotos";
import AdminSuscripciones from "@/components/admin/AdminSuscripciones";
import AdminFincas from "@/components/admin/AdminFincas";
import type { Catalogo, Locale } from "@/lib/types";

// Panel del equipo. Dos roles en la app: suscriptor y admin. Admin es quien
// está en la tabla `usuarios` (es_equipo() en Postgres). Esta pantalla solo
// decide qué mostrar; lo que protege los datos son las rutas de /api/admin y
// las policies, que vuelven a preguntar el rol en el servidor.

type Permiso = "verificando" | "concedido" | "denegado";

export default function AdminPanel({ locale, catalogo }: { locale: Locale; catalogo: Catalogo }) {
  const es = locale !== "en";
  const router = useRouter();
  const { user, loading, init } = useAuthStore();
  const [permiso, setPermiso] = useState<Permiso>("verificando");
  const [pestaña, setPestaña] = useState<"suscripciones" | "fincas">("suscripciones");

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
  }, [user?.id]);

  if (loading || permiso === "verificando") {
    return (
      <div className="bg-fondo min-h-[60vh] flex items-center justify-center">
        <p className="font-body text-tinta-suave text-base">{es ? "Verificando permisos…" : "Checking permissions…"}</p>
      </div>
    );
  }

  if (permiso === "denegado") {
    return (
      <div className="bg-fondo min-h-[60vh] flex items-center justify-center px-[22px]">
        <div className="text-center max-w-[420px]">
          <h1 className="font-display font-bold text-tinta text-3xl mb-3">{es ? "Panel del equipo" : "Team panel"}</h1>
          <p className="font-body text-tinta-suave text-base">
            {es
              ? "Esta cuenta no está en el equipo interno. Si crees que debería estarlo, pide que te agreguen a la tabla de usuarios."
              : "This account isn't on the internal team. If it should be, ask to be added to the users table."}
          </p>
        </div>
      </div>
    );
  }

  const tab = (id: typeof pestaña, texto: string) => (
    <button type="button" role="tab" aria-selected={pestaña === id} onClick={() => setPestaña(id)}
      className={`font-body font-700 text-sm pb-2 -mb-px border-b-2 ${pestaña === id ? "border-vino text-tinta" : "border-transparent text-tinta-suave hover:text-tinta"}`}>
      {texto}
    </button>
  );

  return (
    <div className="bg-fondo min-h-screen">
      <div className="max-w-[1240px] mx-auto px-[22px] pt-10">
        <p className="font-mono text-[11px] tracking-[.2em] text-dorado uppercase mb-2">{es ? "EQUIPO" : "TEAM"}</p>
        <div role="tablist" aria-label={es ? "Secciones del panel" : "Panel sections"} className="flex gap-6 border-b border-borde mb-8">
          {tab("suscripciones", es ? "Suscripciones" : "Subscriptions")}
          {tab("fincas", es ? "Fotos de finca" : "Farm photos")}
        </div>
      </div>

      {pestaña === "suscripciones" ? (
        <div className="max-w-[1240px] mx-auto px-[22px] pb-16">
          <AdminSuscripciones catalogo={catalogo} />
        </div>
      ) : (
        <AdminFincas locale={locale} />
      )}
    </div>
  );
}

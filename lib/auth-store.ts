import { create } from "zustand";
import { getSupabase, haySesionGuardada, hayRespuestaOAuth } from "@/lib/supabase";

// Tres formas de entrar, a propósito:
//   · correo y contraseña, para quien quiere una cuenta de toda la vida;
//   · Google, un clic;
//   · código de 6 dígitos al correo, para quien no quiere inventar otra clave.
//
// Todas terminan en el mismo sitio: una sesión de Supabase y una fila en
// `clientes` que crea el trigger de supabase/sql/suscripciones.sql.

export interface Cliente {
  id: string;
  email: string;
  nombre: string;
  telefono: string;
}

interface Resultado {
  ok: boolean;
  error?: string;
}

interface ResultadoRegistro extends Resultado {
  /**
   * true cuando Supabase creó la cuenta pero exige confirmar el correo antes
   * de dar sesión. Con «Confirm email» apagado nunca llega en true.
   */
  faltaConfirmar?: boolean;
}

interface AuthState {
  user: Cliente | null;
  loading: boolean;
  init: () => void;
  registrar: (email: string, password: string) => Promise<ResultadoRegistro>;
  entrarConPassword: (email: string, password: string) => Promise<Resultado>;
  entrarConGoogle: (destino?: string) => Promise<Resultado>;
  pedirCodigo: (email: string) => Promise<Resultado>;
  verificarCodigo: (email: string, codigo: string) => Promise<Resultado>;
  guardarDatos: (datos: { nombre?: string; telefono?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

/** Mínimo de Supabase; se valida aquí para no gastar un viaje de red. */
export const LARGO_MINIMO_PASSWORD = 6;

export function traducirErrorAuth(mensaje: string | undefined, es: boolean): string {
  const m = (mensaje ?? "").toLowerCase();
  if (m.includes("invalid") && m.includes("token")) {
    return es ? "Ese código no es. Revísalo o pide otro." : "That code isn't right. Check it or ask for another.";
  }
  if (m.includes("expired")) {
    return es ? "El código venció. Pide uno nuevo." : "The code expired. Request a new one.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return es ? "Muchos intentos seguidos. Espera un minuto." : "Too many attempts. Wait a minute.";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return es ? "Revisa el correo." : "Check the email address.";
  }
  if (m.includes("invalid login credentials")) {
    return es ? "Ese correo y esa contraseña no coinciden." : "That email and password don't match.";
  }
  if (m.includes("already registered") || m.includes("already exists")) {
    return es
      ? "Ese correo ya tiene cuenta. Entra con tu contraseña."
      : "That email already has an account. Sign in with your password.";
  }
  if (m.includes("email not confirmed")) {
    return es ? "Confirma tu correo antes de entrar." : "Confirm your email before signing in.";
  }
  if (m.includes("password") && (m.includes("short") || m.includes("at least"))) {
    return es
      ? `La contraseña necesita al menos ${LARGO_MINIMO_PASSWORD} caracteres.`
      : `The password needs at least ${LARGO_MINIMO_PASSWORD} characters.`;
  }
  if (m.includes("provider is not enabled")) {
    return es
      ? "Entrar con Google todavía no está habilitado."
      : "Signing in with Google isn't enabled yet.";
  }
  return es ? "No se pudo. Intenta de nuevo." : "That didn't work. Try again.";
}

async function cargarPerfil(id: string, email: string | undefined): Promise<Cliente> {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("clientes")
    .select("nombre, telefono")
    .eq("id", id)
    .maybeSingle();

  return {
    id,
    email: email ?? "",
    nombre: data?.nombre ?? "",
    telefono: data?.telefono ?? "",
  };
}

// onAuthStateChange se dispara por cada componente que llama init(); estos
// guards hacen que solo nos suscribamos una vez por carga de página.
let initialized = false;
let escuchando = false;

type Aplicar = (estado: Partial<AuthState>) => void;

/** Carga el SDK, resuelve la sesión y queda atento a los cambios. */
async function escucharSesion(set: Aplicar) {
  if (escuchando) return;
  escuchando = true;

  const supabase = await getSupabase();

  const sincronizar = async (id?: string, email?: string) => {
    if (!id) {
      set({ user: null, loading: false });
      return;
    }

    // La sesión ya dice quién es. Se publica de una, sin esperar a la consulta
    // del perfil: así /cuenta puede pedir la suscripción en paralelo en vez de
    // encadenar sesión → perfil → suscripción. El nombre y el teléfono entran
    // un instante después, encima de lo ya pintado.
    set({ user: { id, email: email ?? "", nombre: "", telefono: "" }, loading: false });
    set({ user: await cargarPerfil(id, email) });
  };

  const { data } = await supabase.auth.getSession();
  await sincronizar(data.session?.user?.id, data.session?.user?.email);

  supabase.auth.onAuthStateChange((_event, session) => {
    void sincronizar(session?.user?.id, session?.user?.email);
  });
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  loading: true,

  // Sin sesión guardada no hay nada que resolver: se responde "anónimo" al
  // instante y el SDK ni se descarga. Solo quien ya entró alguna vez paga esos
  // 225 KB, y los paga después del primer pintado.
  init: () => {
    if (initialized) return;
    initialized = true;

    // Al volver de Google el token viene en el hash y todavía no hay nada
    // guardado, así que ese caso también obliga a cargar el SDK.
    if (!haySesionGuardada() && !hayRespuestaOAuth()) {
      set({ user: null, loading: false });
      return;
    }

    escucharSesion(set);
  },

  registrar: async (email, password) => {
    if (password.length < LARGO_MINIMO_PASSWORD) {
      return { ok: false, error: "password is too short" };
    }

    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { ok: false, error: error.message };

    // Con «Confirm email» encendido, Supabase crea el usuario pero no da
    // sesión. Se avisa en vez de dejar al cliente esperando un pago que no va
    // a poder hacer.
    if (!data.session) return { ok: true, faltaConfirmar: true };

    await escucharSesion(set);
    return { ok: true };
  },

  entrarConPassword: async (email, password) => {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };

    await escucharSesion(set);
    return { ok: true };
  },

  // Sale del sitio y vuelve a `destino`. La sesión la recoge init() al cargar
  // esa página, gracias a hayRespuestaOAuth().
  entrarConGoogle: async (destino = "/cuenta") => {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${destino}`,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  pedirCodigo: async (email) => {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  verificarCodigo: async (email, codigo) => {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: codigo.trim(),
      type: "email",
    });
    if (error) return { ok: false, error: error.message };

    // Si al cargar la página no había sesión, nadie está escuchando todavía.
    // Ahora sí la hay, así que se engancha el listener y se carga el perfil.
    await escucharSesion(set);
    return { ok: true };
  },

  guardarDatos: async ({ nombre, telefono }) => {
    const user = get().user;
    if (!user) return;

    const cambios: Record<string, string> = {};
    if (nombre !== undefined) cambios.nombre = nombre;
    if (telefono !== undefined) cambios.telefono = telefono;
    if (Object.keys(cambios).length === 0) return;

    // upsert y no update: si el trigger de `clientes` no está instalado, la
    // fila puede no existir todavía.
    const supabase = await getSupabase();
    const { error } = await supabase
      .from("clientes")
      .upsert({ id: user.id, email: user.email, ...cambios });
    if (error) throw error;

    set({ user: { ...user, ...cambios } });
  },

  logout: async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    set({ user: null, loading: false });
  },
}));

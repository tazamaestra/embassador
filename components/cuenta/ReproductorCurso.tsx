"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowCounterClockwise, CheckCircle, CornersIn, CornersOut, Pause, Play, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";

// Reproductor propio para los cursos. YouTube solo pone el video: sus
// controles, título, logo, «Ver en YouTube» y videos sugeridos quedan
// ocultos, para que el curso se sienta de Taza Maestra y no un video suelto.
//
//   · El iframe es 3 veces más alto que el cuadro y queda centrado: el video
//     llena el ancho y lo que YouTube pinta arriba (título) y abajo (logo)
//     cae fuera de la vista.
//   · Una capa encima recibe todos los clics, así nadie llega al iframe.
//   · Mientras no se está reproduciendo (al inicio, en pausa o al final), una
//     portada propia tapa el video.

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(segundos: number, permitirBuscar: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  mute(): void;
  unMute(): void;
  setPlaybackRate(r: number): void;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}

interface YTEvento {
  target: YTPlayer;
  data: number;
}

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opciones: Record<string, unknown>) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let cargaApi: Promise<void> | null = null;

/** Carga la API del reproductor de YouTube una sola vez. */
function cargarApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (!cargaApi) {
    cargaApi = new Promise((listo) => {
      const previo = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previo?.();
        listo();
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.head.appendChild(s);
    });
  }
  return cargaApi;
}

const REPRODUCIENDO = 1;
const PAUSADO = 2;
const TERMINADO = 0;
const VELOCIDADES = [1, 1.25, 1.5, 2];

type Estado = "cargando" | "listo" | "reproduciendo" | "pausado" | "terminado" | "error";

function reloj(s: number): string {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const seg = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${seg}` : `${m}:${seg}`;
}

const BOTON = "w-9 h-9 inline-flex items-center justify-center rounded-full text-crema-papel hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-naranja-claro";

export default function ReproductorCurso({
  youtubeId, titulo, miniatura, es, onTerminado,
}: {
  youtubeId: string;
  titulo: string;
  miniatura: string;
  es: boolean;
  /** Se llama cuando el video llega al final. */
  onTerminado?: () => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const anfitrion = useRef<HTMLDivElement>(null);
  const reproductor = useRef<YTPlayer | null>(null);
  const alTerminar = useRef(onTerminado);
  alTerminar.current = onTerminado;

  const [estado, setEstado] = useState<Estado>("cargando");
  const [tiempo, setTiempo] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [silencio, setSilencio] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [puedeCompleta, setPuedeCompleta] = useState(false);

  useEffect(() => {
    let vivo = true;
    let jugador: YTPlayer | null = null;
    cargarApi().then(() => {
      if (!vivo || !anfitrion.current || !window.YT) return;
      const el = document.createElement("div");
      anfitrion.current.replaceChildren(el);
      jugador = new window.YT.Player(el, {
        host: "https://www.youtube-nocookie.com",
        videoId: youtubeId,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1,
          iv_load_policy: 3, playsinline: 1, cc_load_policy: 0, origin: window.location.origin,
        },
        events: {
          onReady: (e: YTEvento) => {
            if (!vivo) return;
            const iframe = e.target.getIframe();
            iframe.tabIndex = -1;
            iframe.setAttribute("aria-hidden", "true");
            iframe.title = titulo;
            reproductor.current = e.target;
            setDuracion(e.target.getDuration());
            setEstado("listo");
          },
          // 101/150: el video no permite inserción; 100: no existe o es privado.
          onError: () => {
            if (vivo) setEstado("error");
          },
          onStateChange: (e: YTEvento) => {
            if (!vivo) return;
            if (e.data === REPRODUCIENDO) {
              setEstado("reproduciendo");
              setDuracion(e.target.getDuration());
            } else if (e.data === PAUSADO) setEstado("pausado");
            else if (e.data === TERMINADO) {
              setEstado("terminado");
              setTiempo(e.target.getDuration());
              alTerminar.current?.();
            }
          },
        },
      });
    });
    return () => {
      vivo = false;
      jugador?.destroy();
      reproductor.current = null;
    };
  }, [youtubeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // El tiempo avanza mientras se reproduce.
  useEffect(() => {
    if (estado !== "reproduciendo") return;
    const t = setInterval(() => setTiempo(reproductor.current?.getCurrentTime() ?? 0), 250);
    return () => clearInterval(t);
  }, [estado]);

  useEffect(() => {
    setPuedeCompleta(Boolean(document.fullscreenEnabled));
    const cambio = () => setPantallaCompleta(document.fullscreenElement === contenedor.current);
    document.addEventListener("fullscreenchange", cambio);
    return () => document.removeEventListener("fullscreenchange", cambio);
  }, []);

  const alternar = useCallback(() => {
    const r = reproductor.current;
    if (!r) return;
    if (estado === "reproduciendo") r.pauseVideo();
    else {
      if (estado === "terminado") r.seekTo(0, true);
      r.playVideo();
    }
  }, [estado]);

  function buscar(s: number) {
    const r = reproductor.current;
    if (!r) return;
    const destino = Math.min(Math.max(0, s), duracion || s);
    r.seekTo(destino, true);
    setTiempo(destino);
  }

  function alternarSilencio() {
    const r = reproductor.current;
    if (!r) return;
    if (silencio) r.unMute();
    else r.mute();
    setSilencio(!silencio);
  }

  function cambiarVelocidad() {
    const siguiente = VELOCIDADES[(VELOCIDADES.indexOf(velocidad) + 1) % VELOCIDADES.length];
    reproductor.current?.setPlaybackRate(siguiente);
    setVelocidad(siguiente);
  }

  function alternarPantalla() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void contenedor.current?.requestFullscreen();
  }

  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    const acciones: Record<string, () => void> = {
      " ": alternar, k: alternar,
      ArrowRight: () => buscar(tiempo + 10), ArrowLeft: () => buscar(tiempo - 10),
      m: alternarSilencio, f: alternarPantalla,
    };
    const accion = acciones[e.key];
    if (accion) {
      e.preventDefault();
      accion();
    }
  }

  const tapado = estado !== "reproduciendo";
  const pct = duracion ? (tiempo / duracion) * 100 : 0;

  return (
    <div
      ref={contenedor}
      tabIndex={0}
      onKeyDown={teclas}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={es ? `Reproductor: ${titulo}` : `Player: ${titulo}`}
      className={`flex flex-col bg-tinta overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-naranja ${
        pantallaCompleta ? "w-screen h-screen" : "rounded-card-lg shadow-card"
      }`}
    >
      <div className={`relative overflow-hidden bg-black select-none ${pantallaCompleta ? "flex-1" : "aspect-video"}`}>
        {/* El video, con los bordes de YouTube fuera de la vista */}
        <div ref={anfitrion} className="absolute left-0 w-full pointer-events-none" style={{ top: "-100%", height: "300%" }} />

        {/* Capa que recibe los clics: nadie toca el iframe */}
        <div className="absolute inset-0" onClick={alternar} onDoubleClick={puedeCompleta ? alternarPantalla : undefined} />

        {/* Portada propia: al inicio, en pausa y al final */}
        {tapado && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${miniatura})` }} aria-hidden="true" />
            <div className={`absolute inset-0 ${estado === "pausado" ? "bg-tinta/80 backdrop-blur-sm" : "bg-gradient-to-t from-tinta/90 via-tinta/40 to-tinta/30"}`} aria-hidden="true" />
            <div className="relative flex flex-col items-center gap-3 text-center px-6">
              {estado === "error" ? (
                <>
                  <p className="font-display font-bold text-crema-papel text-xl">{titulo}</p>
                  <p className="font-body text-sm text-crema/80 max-w-sm">
                    {es ? "Este video no está disponible en este momento. Escríbenos y lo revisamos." : "This video isn't available right now. Please try again later."}
                  </p>
                </>
              ) : estado === "terminado" ? (
                <>
                  <CheckCircle size={52} weight="fill" className="text-naranja-claro" aria-hidden="true" />
                  <p className="font-display font-bold text-crema-papel text-xl">{es ? "¡Video terminado!" : "Video finished!"}</p>
                  <button type="button" onClick={alternar} className="inline-flex items-center gap-2 font-body font-700 text-sm px-4 py-2 rounded-btn border border-crema/40 text-crema-papel hover:bg-white/10">
                    <ArrowCounterClockwise size={16} aria-hidden="true" /> {es ? "Ver de nuevo" : "Watch again"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={alternar}
                    disabled={estado === "cargando"}
                    aria-label={es ? "Reproducir" : "Play"}
                    className="w-18 h-18 rounded-full bg-naranja text-white flex items-center justify-center shadow-cta hover:scale-105 transition-transform disabled:opacity-60 disabled:hover:scale-100"
                  >
                    {estado === "cargando" ? (
                      <span className="w-7 h-7 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />
                    ) : (
                      <Play size={32} weight="fill" className="ml-1" aria-hidden="true" />
                    )}
                  </button>
                  <p className="font-display font-bold text-crema-papel text-lg md:text-xl max-w-lg leading-snug drop-shadow">{titulo}</p>
                  <p className="font-mono text-[10px] tracking-[.18em] text-naranja-claro uppercase">
                    {estado === "pausado" ? (es ? "En pausa" : "Paused") : (es ? "Taza Maestra · Exclusivo para clientes" : "Taza Maestra · Clients only")}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controles propios */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-tinta text-crema-papel">
        <button type="button" className={BOTON} onClick={alternar} disabled={estado === "cargando" || estado === "error"} aria-label={estado === "reproduciendo" ? (es ? "Pausar" : "Pause") : (es ? "Reproducir" : "Play")}>
          {estado === "reproduciendo" ? <Pause size={18} weight="fill" aria-hidden="true" /> : <Play size={18} weight="fill" aria-hidden="true" />}
        </button>
        <span className="font-mono text-[11px] tabular-nums text-crema/80 w-[88px] text-center shrink-0">
          {reloj(tiempo)} / {reloj(duracion)}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.floor(duracion))}
          step={1}
          value={Math.floor(tiempo)}
          onChange={(e) => buscar(Number(e.target.value))}
          disabled={!duracion}
          aria-label={es ? "Posición del video" : "Video position"}
          aria-valuetext={`${reloj(tiempo)} / ${reloj(duracion)}`}
          className="flex-1 min-w-0 h-1.5 accent-naranja cursor-pointer"
          style={{ background: `linear-gradient(to right, var(--color-naranja) ${pct}%, rgba(255,255,255,.2) ${pct}%)` }}
        />
        <button type="button" className={`${BOTON} w-auto px-2 font-mono text-[11px]`} onClick={cambiarVelocidad} aria-label={es ? `Velocidad ${velocidad}x` : `Speed ${velocidad}x`}>
          {velocidad}x
        </button>
        <button type="button" className={BOTON} onClick={alternarSilencio} aria-label={silencio ? (es ? "Activar sonido" : "Unmute") : (es ? "Silenciar" : "Mute")}>
          {silencio ? <SpeakerSlash size={18} aria-hidden="true" /> : <SpeakerHigh size={18} aria-hidden="true" />}
        </button>
        {puedeCompleta && (
          <button type="button" className={BOTON} onClick={alternarPantalla} aria-label={pantallaCompleta ? (es ? "Salir de pantalla completa" : "Exit full screen") : (es ? "Pantalla completa" : "Full screen")}>
            {pantallaCompleta ? <CornersIn size={18} aria-hidden="true" /> : <CornersOut size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}

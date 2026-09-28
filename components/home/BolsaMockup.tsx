import type { PatronBolsa } from "@/lib/types";

// Mockup de la bolsa mientras no hay foto de cada café: misma silueta, color
// y dibujo propios. Cuando lleguen las fotos se cambia por <Image> en el hero.

interface Props {
  id: string;
  nombre: string;
  region: string;
  proceso: string;
  fondo: string;
  acento: string;
  patron: PatronBolsa;
  className?: string;
}

function Dibujo({ patron, acento }: { patron: PatronBolsa; acento: string }) {
  switch (patron) {
    case "puntos":
      return (
        <>
          <circle cx="6" cy="6" r="3.2" fill={acento} />
          <circle cx="20" cy="18" r="2.2" fill={acento} opacity=".7" />
        </>
      );
    case "ondas":
      return <path d="M0 12 Q7 4 14 12 T28 12" fill="none" stroke={acento} strokeWidth="2" />;
    case "rayas":
      return <path d="M-4 4 L4 -4 M0 28 L28 0 M24 32 L32 24" stroke={acento} strokeWidth="3" />;
    case "hojas":
      return (
        <>
          <ellipse cx="8" cy="8" rx="6" ry="2.6" fill={acento} transform="rotate(-35 8 8)" />
          <ellipse cx="21" cy="21" rx="6" ry="2.6" fill={acento} opacity=".7" transform="rotate(35 21 21)" />
        </>
      );
    case "montanas":
      return <path d="M0 24 L7 12 L14 24 M14 24 L21 8 L28 24" fill="none" stroke={acento} strokeWidth="2" />;
  }
}

export default function BolsaMockup({ id, nombre, region, proceso, fondo, acento, patron, className }: Props) {
  const p = `tm-bolsa-${id}`;
  // La silueta de la bolsa: sello arriba, cuerpo que se abre un poco hacia la base.
  const cuerpo = "M44 52 L256 52 L266 356 Q268 384 240 384 L60 384 Q32 384 34 356 Z";

  return (
    <svg viewBox="0 0 300 400" role="img" aria-label={`Bolsa de café ${nombre}`} className={className}>
      <defs>
        <pattern id={`${p}-dibujo`} width="28" height="28" patternUnits="userSpaceOnUse">
          <Dibujo patron={patron} acento={acento} />
        </pattern>
        <linearGradient id={`${p}-luz`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".32" />
          <stop offset=".28" stopColor="#fff" stopOpacity=".16" />
          <stop offset=".55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".38" />
        </linearGradient>
        <clipPath id={`${p}-clip`}>
          <path d={cuerpo} />
        </clipPath>
      </defs>

      {/* Sombra en el piso */}
      <ellipse cx="150" cy="390" rx="118" ry="8" fill="#000" opacity=".25" />

      {/* Sello de arriba, con la muesca para abrir */}
      <rect x="44" y="20" width="212" height="36" rx="3" fill={fondo} />
      <rect x="44" y="20" width="212" height="36" rx="3" fill={`url(#${p}-luz)`} />
      <path d="M52 30 H248 M52 36 H248 M52 42 H248" stroke="#000" strokeOpacity=".18" strokeWidth="1" />
      <path d="M44 38 l6 -3 v6 Z M256 38 l-6 -3 v6 Z" fill="#000" opacity=".35" />

      {/* Cuerpo */}
      <path d={cuerpo} fill={fondo} />
      <g clipPath={`url(#${p}-clip)`}>
        <rect x="30" y="52" width="240" height="96" fill={`url(#${p}-dibujo)`} opacity=".55" />
        <rect x="30" y="336" width="240" height="60" fill={`url(#${p}-dibujo)`} opacity=".35" />
        <rect x="30" y="52" width="240" height="340" fill={`url(#${p}-luz)`} />
      </g>

      {/* Válvula */}
      <circle cx="150" cy="104" r="9" fill="#000" opacity=".25" />
      <circle cx="150" cy="104" r="5" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />

      {/* Etiqueta */}
      <rect x="72" y="150" width="156" height="176" rx="6" fill="#FBF3DD" />
      <rect x="72" y="150" width="156" height="10" rx="3" fill={acento} />
      <text x="150" y="186" textAnchor="middle" fill="#6B5547" fontFamily="var(--font-mono)" fontSize="8.5" letterSpacing="2">
        TAZA MAESTRA
      </text>
      <text x="150" y="226" textAnchor="middle" fill="#2A1A12" fontFamily="var(--font-display)" fontWeight="700" fontSize="27">
        {nombre}
      </text>
      <line x1="112" y1="242" x2="188" y2="242" stroke={fondo} strokeWidth="1.5" />
      <text x="150" y="264" textAnchor="middle" fill="#3A2418" fontFamily="var(--font-body)" fontSize="10.5">
        {region}
      </text>
      <text x="150" y="306" textAnchor="middle" fill="#6B5547" fontFamily="var(--font-mono)" fontSize="8.5" letterSpacing="1.5">
        {proceso.toUpperCase()} · 454 G
      </text>
    </svg>
  );
}

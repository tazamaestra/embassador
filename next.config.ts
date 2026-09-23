import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Las fotos de finca viven en el bucket público de Supabase (ver
// supabase/sql/finca_fotos.sql). El host se saca del entorno para no clavar
// el id del proyecto en el repo.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    // Las bolsas pesan ~120 KB en PNG. Con el optimizador salen en AVIF/WebP
    // al tamaño que pide cada `sizes`, que es lo que mantiene el home liviano.
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/fincas/**",
          },
        ]
      : [],
  },
};

export default withNextIntl(nextConfig);

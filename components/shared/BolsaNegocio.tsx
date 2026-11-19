import BolsaMockup from "@/components/shared/BolsaMockup";
import { formatPeso } from "@/lib/presentaciones";
import type { Product } from "@/lib/types";

// Imagen genérica del cuarterón para cafeterías o negocios: la bolsa negra,
// con el dibujo del café. Cuando haya foto real, se cambia aquí.
export default function BolsaNegocio({
  product,
  id,
  proceso,
  className,
  decorativa,
}: {
  product: Product;
  id: string;
  proceso: string;
  className?: string;
  decorativa?: boolean;
}) {
  return (
    <BolsaMockup
      id={id}
      nombre={product.name}
      region={product.region}
      proceso={proceso}
      fondo="#161412"
      acento={product.bolsa.acento}
      patron={product.bolsa.patron}
      peso={formatPeso(product.negocio?.pesoG ?? product.pesoG).toUpperCase()}
      className={className}
      decorativa={decorativa}
    />
  );
}

/**
 * Unidad de medida de una categoría.
 *
 * Es sólo una etiqueta para acompañar las cantidades: el stock, las ventas y los
 * remitos siguen manejando cantidades enteras.
 */

export const UNIDAD_POR_DEFECTO = 'UNIDAD';

export interface UnidadMedidaOption {
  value: string;
  label: string;
  /** Cómo se muestra al lado de una cantidad. */
  sufijo: string;
}

export const UNIDADES_MEDIDA: UnidadMedidaOption[] = [
  { value: 'UNIDAD', label: 'Unidad (u.)', sufijo: 'u.' },
  { value: 'BULTO', label: 'Bulto', sufijo: 'bultos' },
  { value: 'CAJA', label: 'Caja', sufijo: 'cajas' },
  { value: 'PAQUETE', label: 'Paquete', sufijo: 'paq.' },
  { value: 'KG', label: 'Kilogramo (kg)', sufijo: 'kg' },
  { value: 'GRAMO', label: 'Gramo (g)', sufijo: 'g' },
  { value: 'LITRO', label: 'Litro (l)', sufijo: 'l' },
  { value: 'MILILITRO', label: 'Mililitro (ml)', sufijo: 'ml' },
];

export const getSufijoUnidad = (unidadMedida?: string | null): string => {
  const unidad = (unidadMedida || UNIDAD_POR_DEFECTO).toUpperCase();
  return UNIDADES_MEDIDA.find((u) => u.value === unidad)?.sufijo ?? unidad.toLowerCase();
};

/** La unidad de un producto la define su categoría. */
export const getUnidadDeProducto = (producto: any): string =>
  producto?.categoria?.unidadMedida || producto?.unidadMedida || UNIDAD_POR_DEFECTO;

export const formatCantidad = (cantidad: number | null | undefined, unidadMedida?: string | null): string =>
  `${Number(cantidad ?? 0)} ${getSufijoUnidad(unidadMedida)}`;

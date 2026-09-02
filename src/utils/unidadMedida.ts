/**
 * Unidad de medida de una categoría.
 *
 * Es una etiqueta para acompañar las cantidades. Los remitos y el stock
 * aceptan decimales (kg de fiambres, por ejemplo 5,830).
 * Los platos de la carta se venden por unidad; si tienen receta, el stock
 * que importa es el de los insumos.
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

export const formatNumeroCantidad = (cantidad: number | null | undefined): string => {
  const n = Number(cantidad ?? 0);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('es-AR', { maximumFractionDigits: 3 });
};

export const formatCantidad = (cantidad: number | null | undefined, unidadMedida?: string | null): string =>
  `${formatNumeroCantidad(cantidad)} ${getSufijoUnidad(unidadMedida)}`;

export const esInsumo = (producto: any): boolean =>
  String(producto?.tipo || '').toUpperCase() === 'INSUMO';

/** Sale en la carta y se puede vender. Falta el campo = sí (Chirino / datos viejos). */
export const esVendible = (producto: any): boolean => producto?.vendible !== false;

export const esCarta = (producto: any): boolean => esVendible(producto);

export const tieneReceta = (producto: any): boolean =>
  Array.isArray(producto?.receta) && producto.receta.length > 0;

/** Depósito: materia prima, o ítem sin receta que se stockea a sí mismo (bebida). */
export const enDeposito = (producto: any): boolean =>
  esInsumo(producto) || !tieneReceta(producto);

export const productosDeCarta = <T,>(productos: T[] | null | undefined): T[] =>
  (Array.isArray(productos) ? productos : []).filter((p) => esVendible(p));

export const productosDeDeposito = <T,>(productos: T[] | null | undefined): T[] =>
  (Array.isArray(productos) ? productos : []).filter((p) => enDeposito(p));

/** Cuántas porciones se pueden vender: receta → insumos; si no, stock del producto. */
export const stockCarta = (producto: any): number => {
  if (tieneReceta(producto) && producto.porcionesEstimadas != null) {
    return Number(producto.porcionesEstimadas);
  }
  return Number(producto?.cantidadStock || 0);
};

export const etiquetaStockProducto = (producto: any): string => {
  if (tieneReceta(producto)) {
    return `≈ ${formatNumeroCantidad(stockCarta(producto))} porciones`;
  }
  return formatCantidad(producto?.cantidadStock, getUnidadDeProducto(producto));
};

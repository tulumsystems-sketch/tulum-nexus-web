/**
 * Lecturas derivadas de la configuración del tenant (GET /config).
 *
 * La config llega sin tipar desde SWR, así que todo lo que se consulta acá tiene
 * un valor por defecto que preserva el comportamiento histórico: IVA 21% y
 * Mercado Pago habilitado.
 */

export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'MERCADO_PAGO';

export interface MetodoPagoOption {
  value: MetodoPago;
  label: string;
  /** Etiqueta corta para tablas y filtros. */
  labelCorto: string;
}

export const IVA_POR_DEFECTO = 21;

const METODOS: Record<MetodoPago, MetodoPagoOption> = {
  EFECTIVO: { value: 'EFECTIVO', label: 'Efectivo', labelCorto: 'Efectivo' },
  TRANSFERENCIA: { value: 'TRANSFERENCIA', label: 'Transferencia', labelCorto: 'Transferencia' },
  MERCADO_PAGO: { value: 'MERCADO_PAGO', label: 'Mercado Pago', labelCorto: 'Digital' },
};

export const getIvaPorcentaje = (config: any): number => {
  const iva = Number(config?.ivaPorcentaje);
  return Number.isFinite(iva) ? iva : IVA_POR_DEFECTO;
};

/** true cuando el tenant discrimina IVA y hay que mostrar el desglose. */
export const discriminaIva = (config: any): boolean => getIvaPorcentaje(config) > 0;

export const calcularTotales = (subtotalNeto: number, config: any) => {
  const ivaPorcentaje = getIvaPorcentaje(config);
  const iva = subtotalNeto * (ivaPorcentaje / 100);
  return { ivaPorcentaje, subtotalNeto, iva, total: subtotalNeto + iva };
};

/**
 * Métodos de pago que el tenant acepta en el punto de venta.
 * Siempre devuelve al menos uno para no dejar el POS sin forma de cobrar.
 */
export const getMetodosPagoHabilitados = (config: any): MetodoPagoOption[] => {
  const habilitados: MetodoPagoOption[] = [];
  if (config?.pagoMercadoPagoHabilitado) habilitados.push(METODOS.MERCADO_PAGO);
  if (config?.pagoTransferenciaHabilitado) habilitados.push(METODOS.TRANSFERENCIA);
  if (config?.pagoEfectivoHabilitado ?? true) habilitados.push(METODOS.EFECTIVO);
  return habilitados.length > 0 ? habilitados : [METODOS.EFECTIVO];
};

export const getMetodoPagoLabel = (metodoPago?: string | null): string => {
  if (!metodoPago) return METODOS.EFECTIVO.label;
  return METODOS[metodoPago as MetodoPago]?.label ?? metodoPago;
};

export const getMetodoPagoLabelCorto = (metodoPago?: string | null): string => {
  if (!metodoPago) return METODOS.EFECTIVO.labelCorto;
  return METODOS[metodoPago as MetodoPago]?.labelCorto ?? metodoPago;
};

/** Mercado Pago sólo se ofrece si está habilitado y con credenciales cargadas. */
export const puedeCobrarConMercadoPago = (config: any): boolean =>
  Boolean(config?.pagoMercadoPagoHabilitado && config?.mpConfigurado);

/** Margen sobre el costo configurado para el tenant. null = precio de venta a mano. */
export const getMargenPorDefecto = (config: any): number | null => {
  if (config?.margenPorDefecto == null || config.margenPorDefecto === '') return null;
  const margen = Number(config.margenPorDefecto);
  return Number.isFinite(margen) ? margen : null;
};

export const calcularPrecioVenta = (precioCosto: number, margenPorcentaje: number): number =>
  precioCosto * (1 + margenPorcentaje / 100);

export const getAliasCobro = (config: any): string | null => {
  const alias = typeof config?.aliasCobro === 'string' ? config.aliasCobro.trim() : '';
  return alias !== '' ? alias : null;
};

import apiClient from '../../../../api/axiosConfig';

export type RemitoEstadoPago = 'IMPAGO' | 'PAGADO_PARCIAL' | 'PAGADO';

export interface RemitoCobranza {
  id: number;
  nroRemito?: string;
  fecha: string;
  estado?: string;
  nombreDestinatario?: string;
  telefonoDestinatario?: string;
  direccionEntrega?: string;
  observaciones?: string;
  total?: number;
  estadoPago?: RemitoEstadoPago;
  montoPagado?: number;
  saldoPendiente?: number;
  cliente?: { nombre?: string; apellido?: string };
}

export interface PagoRemito {
  id: number;
  remitoId?: number;
  nroRemito?: string;
  fecha: string;
  monto: number;
  metodoPago: string;
  observaciones?: string;
  usuarioEmail?: string;
}

export interface ResumenCobranzas {
  cantidadRemitos: number;
  cantidadImpagos: number;
  cantidadParciales: number;
  cantidadPagados: number;
  totalFacturado: number;
  totalCobrado: number;
  totalPendiente: number;
}

export const formatMoney = (value: number | null | undefined) =>
  `$${Number(value || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatFecha = (value?: string) => (value ? new Date(value).toLocaleDateString('es-AR') : '-');

export const formatFechaHora = (value?: string) => (value ? new Date(value).toLocaleString('es-AR') : '-');

export const getEstadoPago = (remito: RemitoCobranza): RemitoEstadoPago => remito.estadoPago || 'IMPAGO';

export const getSaldoPendiente = (remito: RemitoCobranza): number => {
  if (typeof remito.saldoPendiente === 'number') return remito.saldoPendiente;
  return Math.max(0, Number(remito.total || 0) - Number(remito.montoPagado || 0));
};

export const estadoPagoLabel: Record<RemitoEstadoPago, string> = {
  IMPAGO: 'Impago',
  PAGADO_PARCIAL: 'Pago parcial',
  PAGADO: 'Pagado',
};

export const estadoPagoStyles: Record<RemitoEstadoPago, string> = {
  IMPAGO: 'bg-red-100 text-red-700 border-red-200',
  PAGADO_PARCIAL: 'bg-amber-100 text-amber-700 border-amber-200',
  PAGADO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const metodoPagoLabel = (metodo?: string) => {
  switch (metodo) {
    case 'EFECTIVO':
      return 'Efectivo';
    case 'TRANSFERENCIA':
      return 'Transferencia';
    case 'MERCADO_PAGO':
      return 'Mercado Pago';
    default:
      return metodo || '-';
  }
};

/** Descarga el PDF del remito usando el token de la sesion y lo baja como archivo. */
export const descargarRemitoPdf = async (remito: RemitoCobranza): Promise<void> => {
  const response = await apiClient.get(`/remitos/${remito.id}/pdf`, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `remito-${remito.nroRemito || remito.id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

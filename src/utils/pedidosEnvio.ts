export interface PedidoListado {
  id: number;
  nroComprobante?: string;
  fecha?: string;
  estado?: string;
  canal?: string;
  metodoPago?: string;
  totalFinal?: number;
  observaciones?: string;
  nombreContacto?: string;
  telefonoContacto?: string;
  direccionEntrega?: string;
  cobrado?: boolean;
  repartidorNombre?: string;
  repartidorUsuarioId?: number;
  puedeTomar?: boolean;
  puedeLiberar?: boolean;
  proximosEstados?: string[];
  mesaId?: number;
  mesaNumero?: number;
  mesaEtiqueta?: string;
  items?: {
    id?: number;
    productoId?: number;
    producto: string;
    cantidad: number;
    precioUnitario?: number;
    observaciones?: string;
  }[];
  cliente?: { nombre?: string; apellido?: string; telefono?: string };
}

export const esPedidoSalon = (pedido: { canal?: string }): boolean =>
  String(pedido.canal || '').toUpperCase() === 'SALON';

export const esPedidoEnvio = (pedido: {
  canal?: string;
  direccionEntrega?: string;
}): boolean => {
  const canal = (pedido.canal || '').toUpperCase();
  if (canal === 'DELIVERY') return true;
  return canal === 'WHATSAPP' && Boolean(pedido.direccionEntrega?.trim());
};

export const tienePlatosCocina = (pedido: PedidoListado): boolean =>
  !esPedidoSalon(pedido) || (pedido.items || []).length > 0;

export const nombrePedido = (pedido: PedidoListado): string =>
  pedido.mesaEtiqueta ||
  (pedido.mesaNumero != null ? `Mesa ${pedido.mesaNumero}` : '') ||
  pedido.nombreContacto ||
  `${pedido.cliente?.nombre || ''} ${pedido.cliente?.apellido || ''}`.trim() ||
  'Sin nombre';

export const telefonoPedido = (pedido: PedidoListado): string =>
  pedido.telefonoContacto || pedido.cliente?.telefono || '';

export const mapsUrl = (direccion?: string): string | null => {
  const texto = direccion?.trim();
  if (!texto) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto)}`;
};

export const whatsappUrl = (telefono?: string, texto?: string): string | null => {
  const digits = (telefono || '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  let n = digits;
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('0')) n = n.slice(1);
  if (!n.startsWith('54')) n = `54${n}`;
  const q = texto ? `?text=${encodeURIComponent(texto)}` : '';
  return `https://wa.me/${n}${q}`;
};

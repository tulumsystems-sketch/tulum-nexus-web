/**
 * Plantilla única del ticket de venta.
 *
 * Antes estaba duplicada en POS y Dashboard y las dos copias se iban separando.
 * Cualquier cambio de formato del comprobante va acá.
 */

import { discriminaIva, getAliasCobro, getIvaPorcentaje, getMetodoPagoLabel } from './tenantConfig';
import { getSufijoUnidad } from './unidadMedida';

export interface TicketItem {
  cantidad?: number;
  precioUnitario?: number;
  producto?: { nombre?: string; categoria?: { unidadMedida?: string } };
  unidadMedida?: string;
  observaciones?: string | null;
}

export interface TicketVenta {
  id?: number | string;
  nroComprobante?: number | string | null;
  fecha?: string | Date;
  cliente?: { nombre?: string; apellido?: string } | null;
  items?: TicketItem[];
  totalNeto?: number | null;
  totalIva?: number | null;
  totalFinal?: number | null;
  metodoPago?: string | null;
  montoAbonado?: number | null;
  canal?: string | null;
  nombreContacto?: string | null;
  telefonoContacto?: string | null;
  direccionEntrega?: string | null;
  observaciones?: string | null;
}

const escapar = (valor: unknown): string =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (valor: number | null | undefined): string => `$${Number(valor || 0).toFixed(2)}`;

const fila = (etiqueta: string, valor: string, negrita = false) => `
  <div style="display: flex; justify-content: space-between;"${negrita ? ' class="bold"' : ''}>
    <span>${etiqueta}</span><span>${valor}</span>
  </div>`;

/**
 * Desglosa el comprobante. Si la venta trae neto e IVA del backend los respeta;
 * si no (por ejemplo el ticket que arma el POS al vuelo) los deriva del IVA del tenant.
 */
const desglosar = (venta: TicketVenta, config: any) => {
  const ivaPorcentaje = getIvaPorcentaje(config);
  const totalFinal = Number(venta.totalFinal || 0);

  if (venta.totalNeto != null && venta.totalIva != null) {
    return { ivaPorcentaje, totalNeto: Number(venta.totalNeto), totalIva: Number(venta.totalIva), totalFinal };
  }

  const totalNeto = ivaPorcentaje > 0 ? totalFinal / (1 + ivaPorcentaje / 100) : totalFinal;
  return { ivaPorcentaje, totalNeto, totalIva: totalFinal - totalNeto, totalFinal };
};

export const construirTicketHtml = (venta: TicketVenta, config: any): string => {
  const nombreEmpresa = escapar(config?.nombreEmpresa || 'TULUM SYSTEMS');
  const logoUrl = typeof config?.logoUrl === 'string' && config.logoUrl.trim() !== '' ? config.logoUrl : null;
  const aliasCobro = getAliasCobro(config);
  const comprobante = escapar(venta.nroComprobante || venta.id);
  const fecha = new Date(venta.fecha || Date.now()).toLocaleString('es-AR');
  const clienteNombre = venta.cliente?.nombre
    ? escapar(`${venta.cliente.nombre} ${venta.cliente.apellido || ''}`.trim())
    : 'Consumidor Final';

  const { ivaPorcentaje, totalNeto, totalIva, totalFinal } = desglosar(venta, config);
  const montoAbonado = Number(venta.montoAbonado || 0);
  const canal = (venta.canal || 'MOSTRADOR').toUpperCase();
  const esPedido = canal === 'DELIVERY' || canal === 'WHATSAPP' || canal === 'RETIRO' || canal === 'SALON';
  const titulo = esPedido
    ? (canal === 'DELIVERY'
      ? 'COMANDA DELIVERY'
      : canal === 'RETIRO'
        ? 'COMANDA RETIRO'
        : canal === 'SALON'
          ? 'COMANDA SALÓN'
          : 'COMANDA WHATSAPP')
    : 'TICKET';
  const nombrePedido =
    (venta.nombreContacto && venta.nombreContacto.trim()) ||
    (venta.cliente?.nombre
      ? `${venta.cliente.nombre} ${venta.cliente.apellido || ''}`.trim()
      : '') ||
    clienteNombre;
  const telefono = venta.telefonoContacto?.trim() || '';
  const direccion = venta.direccionEntrega?.trim() || '';
  const notasRaw = venta.observaciones?.trim() || '';
  const notas = notasRaw.startsWith('Cuenta abierta') ? '' : notasRaw;

  const itemsHtml = (venta.items || [])
    .map((item) => {
      const cantidad = Number(item.cantidad || 0);
      const precioUnitario = Number(item.precioUnitario || 0);
      const unidad = getSufijoUnidad(item.unidadMedida || item.producto?.categoria?.unidadMedida);
      const notaItem = item.observaciones?.trim() || '';
      return `
        <tr>
          <td style="padding: 4px 0; vertical-align: top;">
            ${escapar(item.producto?.nombre || 'Producto')}
            <div style="font-size: 9px;">${cantidad} ${escapar(unidad)} x ${money(precioUnitario)}</div>
            ${notaItem ? `<div style="font-size: 9px; font-weight: bold;">* ${escapar(notaItem)}</div>` : ''}
          </td>
          <td style="text-align: right; vertical-align: top;">${money(cantidad * precioUnitario)}</td>
        </tr>`;
    })
    .join('');

  return `
    <html>
      <head>
          <title>${esPedido ? 'Comanda' : 'Ticket'} #${comprobante}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; color: #000; font-size: 11px; padding: 10px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .header { margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .logo { max-width: 60mm; height: auto; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .totals { border-top: 1px dashed #000; padding-top: 10px; }
          .alias { margin-top: 12px; border: 1px dashed #000; padding: 8px; text-align: center; }
          .footer { margin-top: 20px; text-align: center; font-size: 9px; border-top: 1px dashed #000; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header center">
          ${logoUrl ? `<img src="${escapar(logoUrl)}" class="logo" alt="" />` : ''}
          <div class="bold" style="font-size: 15px;">${nombreEmpresa}</div>
          <div>${esPedido ? escapar(titulo) : 'COMPROBANTE NO FISCAL'}</div>
        </div>

        <div>
          <div class="bold">${esPedido ? 'PEDIDO' : 'TICKET'}: #${comprobante}</div>
          <div>FECHA: ${fecha}</div>
          <div>${esPedido ? (canal === 'SALON' ? 'MESA' : 'PARA') : 'CLIENTE'}: ${escapar(nombrePedido)}</div>
          ${esPedido ? `<div>CANAL: ${escapar(canal)}</div>` : ''}
          ${telefono ? `<div>TEL: ${escapar(telefono)}</div>` : ''}
          ${direccion ? `<div>DIR: ${escapar(direccion)}</div>` : ''}
        </div>
        ${notas ? `<div style="margin-top: 8px; border: 1px dashed #000; padding: 6px;"><div class="bold">NOTAS</div><div>${escapar(notas)}</div></div>` : ''}

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left;">DESCRIPCIÓN</th>
              <th style="text-align: right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div class="totals">
          ${discriminaIva(config)
            ? fila('SUBTOTAL:', money(totalNeto)) +
              fila(`IVA (${ivaPorcentaje}%):`, money(totalIva))
            : ''}
          ${fila('TOTAL:', money(totalFinal), true)}
        </div>

        <div style="margin-top: 10px;">
          <div>FORMA DE PAGO: ${escapar(getMetodoPagoLabel(venta.metodoPago).toUpperCase())}</div>
          ${montoAbonado > 0 ? `<div>ABONADO: ${money(montoAbonado)}</div>` : ''}
          ${montoAbonado > 0 ? `<div class="bold">VUELTO: ${money(Math.max(0, montoAbonado - totalFinal))}</div>` : ''}
        </div>

        ${aliasCobro
          ? `<div class="alias">
               <div>Alias para transferencias</div>
               <div class="bold" style="font-size: 13px;">${escapar(aliasCobro)}</div>
             </div>`
          : ''}

        <div class="footer">
          <p>¡Gracias por su compra!</p>
          <p>SaaS POS - Tulum Systems</p>
        </div>
      </body>
    </html>
  `;
};

/** Abre la ventana de impresión con el ticket ya armado. */
export const imprimirTicket = (venta: TicketVenta | null | undefined, config: any): void => {
  if (!venta) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(construirTicketHtml(venta, config));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};

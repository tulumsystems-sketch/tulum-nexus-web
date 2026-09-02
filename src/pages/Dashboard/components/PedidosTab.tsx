import React, { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import {
  Bike,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  Clock,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  Plus,
  Printer,
  Store,
  Trash2,
  Wallet,
} from 'lucide-react';
import apiClient from '../../../api/axiosConfig';
import { PageHeader } from '../../../components/ui/PageHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { getMetodosPagoHabilitados, MetodoPago } from '../../../utils/tenantConfig';
import { imprimirTicket, TicketVenta } from '../../../utils/ticketTemplate';
import {
  PedidoListado,
  esPedidoEnvio,
  esPedidoSalon,
  mapsUrl,
  nombrePedido,
  telefonoPedido,
  tienePlatosCocina,
  whatsappUrl,
} from '../../../utils/pedidosEnvio';
import { productosDeCarta, stockCarta } from '../../../utils/unidadMedida';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

type CanalPedido = 'WHATSAPP' | 'DELIVERY' | 'RETIRO' | 'SALON';
type FiltroActividad = 'activos' | 'todos';
type VistaCocina = 'columnas' | 'lista' | 'salida';

type Pedido = PedidoListado;

interface ProductoCatalogo {
  id: number;
  nombre: string;
  precio: number;
  cantidadStock: number;
  tipo?: string;
  receta?: any[];
  porcionesEstimadas?: number;
}

interface LineaNueva {
  productoId: number;
  nombre: string;
  cantidad: number;
  stock: number;
  observaciones: string;
}

const COLUMNAS_COCINA = [
  { key: 'PENDIENTE', label: 'Pendiente' },
  { key: 'EN_PREPARACION', label: 'En prep.' },
  { key: 'LISTO', label: 'Listo' },
  { key: 'EN_CAMINO', label: 'En camino' },
] as const;

const LABELS_ESTADO: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_PREPARACION: 'En preparación',
  LISTO: 'Listo',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  ANULADA: 'Anulado',
};

const LABELS_CANAL: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  DELIVERY: 'Delivery',
  RETIRO: 'Retiro',
  MOSTRADOR: 'Mostrador',
  SALON: 'Salón',
};

const tonoEstado = (estado?: string): string => {
  switch (estado) {
    case 'PENDIENTE':
      return 'bg-amber-500/15 text-amber-200 border-amber-400/30';
    case 'EN_PREPARACION':
      return 'bg-blue-500/15 text-blue-200 border-blue-400/30';
    case 'LISTO':
      return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30';
    case 'EN_CAMINO':
      return 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30';
    case 'ENTREGADO':
      return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
};

const minutosDesde = (fecha?: string, ahora = Date.now()): number => {
  if (!fecha) return 0;
  return Math.max(0, Math.floor((ahora - new Date(fecha).getTime()) / 60000));
};

const haceTiempo = (fecha?: string, ahora = Date.now()): string => {
  const minutos = minutosDesde(fecha, ahora);
  if (!fecha) return '';
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} d`;
};

/** 20 min ámbar, 40 min rojo: cocina ve qué se está quemando. */
const tonoEspera = (fecha?: string, ahora = Date.now()): string => {
  const minutos = minutosDesde(fecha, ahora);
  if (minutos >= 40) return 'border-red-500/70 ring-2 ring-red-500/25 bg-red-950/40';
  if (minutos >= 20) return 'border-amber-400/60 ring-1 ring-amber-400/20 bg-amber-950/30';
  return 'border-slate-800 bg-slate-900';
};

const colorReloj = (fecha?: string, ahora = Date.now()): string => {
  const minutos = minutosDesde(fecha, ahora);
  if (minutos >= 40) return 'text-red-300';
  if (minutos >= 20) return 'text-amber-200';
  return 'text-slate-400';
};

const labelEstadoAccion = (estado: string): string => {
  switch (estado) {
    case 'EN_PREPARACION':
      return 'Pasar a preparación';
    case 'LISTO':
      return 'Marcar listo';
    case 'ENTREGADO':
      return 'Marcar entregado';
    default:
      return LABELS_ESTADO[estado] || estado;
  }
};

const labelEstadoCorto = (estado: string): string => {
  switch (estado) {
    case 'EN_PREPARACION':
      return 'Prep';
    case 'LISTO':
      return 'Listo';
    case 'ENTREGADO':
      return 'Ok';
    default:
      return LABELS_ESTADO[estado] || estado;
  }
};

const resumenItems = (pedido: Pedido): string => {
  const items = pedido.items || [];
  if (items.length === 0) return 'Sin platos';
  const partes = items.slice(0, 2).map((item) => `${item.cantidad}× ${item.producto}`);
  if (items.length > 2) partes.push(`+${items.length - 2}`);
  return partes.join(' · ');
};

const avisarPedidoNuevo = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1174, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Si el browser bloquea audio, el badge visual alcanza.
  }
};

const pedidoATicket = (pedido: Pedido): TicketVenta => {
  const notas = pedido.observaciones?.startsWith('Cuenta abierta') ? undefined : pedido.observaciones;
  return {
    id: pedido.id,
    nroComprobante: pedido.nroComprobante,
    fecha: pedido.fecha,
    canal: pedido.canal,
    nombreContacto: nombrePedido(pedido),
    telefonoContacto: pedido.telefonoContacto || pedido.cliente?.telefono,
    direccionEntrega: pedido.direccionEntrega,
    observaciones: notas,
    metodoPago: pedido.metodoPago,
    totalFinal: pedido.totalFinal,
    cliente: pedido.cliente,
    items: (pedido.items || []).map((item) => ({
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      observaciones: item.observaciones,
      producto: { nombre: item.producto },
    })),
  };
};

export const PedidosTab: React.FC = () => {
  const [canalFiltro, setCanalFiltro] = useState<'' | CanalPedido>('');
  const [actividad, setActividad] = useState<FiltroActividad>('activos');
  const [vista, setVista] = useState<VistaCocina>('columnas');
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Pedido | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  const [ahora, setAhora] = useState(Date.now());
  const [avisoNuevos, setAvisoNuevos] = useState<string | null>(null);
  const [idsNuevos, setIdsNuevos] = useState<Set<number>>(new Set());
  const [idsActualizados, setIdsActualizados] = useState<Set<number>>(new Set());
  const idsVistos = useRef<Set<number> | null>(null);
  const estadoPorId = useRef<Map<number, string>>(new Map());
  const itemsPorId = useRef<Map<number, string>>(new Map());
  const mesaPorId = useRef<Map<number, string>>(new Map());

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('soloPedidos', 'true');
    params.set('size', '80');
    params.set('sort', 'fecha,desc');
    if (canalFiltro) params.set('canal', canalFiltro);
    return `/ventas/search?${params.toString()}`;
  }, [canalFiltro]);

  const { data, error, isLoading, mutate } = useSWR(query, fetcher, { refreshInterval: 8000 });
  const { data: productos } = useSWR<ProductoCatalogo[]>('/productos', fetcher);
  const { data: clientes } = useSWR('/clientes', fetcher);
  const { data: globalConfig } = useSWR('/config', fetcher);
  const { data: cadetes } = useSWR('/usuarios/repartidores', fetcher);

  const pedidos: Pedido[] = (Array.isArray(data?.content) ? data.content : []).filter(tienePlatosCocina);
  const cocina = pedidos.filter((p) => p.estado !== 'ANULADA' && p.estado !== 'ENTREGADO' && p.estado !== 'PAGADA');
  const listosSalida = cocina.filter((p) => Boolean(p.puedeTomar) || (esPedidoEnvio(p) && p.estado === 'LISTO' && !p.repartidorUsuarioId));
  const enCamino = cocina.filter((p) => p.estado === 'EN_CAMINO');
  const firmaCocina = cocina
    .map((p) => `${p.id}:${p.estado}:${p.mesaEtiqueta || p.mesaNumero || ''}:${(p.items || []).map((i) => `${i.productoId || i.producto}x${i.cantidad}`).join('|')}`)
    .join(',');
  const visibles = actividad === 'activos'
    ? cocina
    : pedidos.filter((p) => p.estado !== 'ANULADA');
  const columnasCocina = canalFiltro === 'SALON'
    ? COLUMNAS_COCINA.filter((col) => col.key !== 'EN_CAMINO')
    : COLUMNAS_COCINA;

  const firmaItems = (pedido: Pedido) =>
    (pedido.items || []).map((i) => `${i.productoId || i.producto}x${i.cantidad}`).join('|');
  const firmaMesa = (pedido: Pedido) => String(pedido.mesaEtiqueta || pedido.mesaNumero || '');

  useEffect(() => {
    const timer = window.setInterval(() => setAhora(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const ids = new Set(cocina.map((p) => p.id));
    if (idsVistos.current === null) {
      idsVistos.current = ids;
      estadoPorId.current = new Map(cocina.map((p) => [p.id, p.estado || '']));
      itemsPorId.current = new Map(cocina.map((p) => [p.id, firmaItems(p)]));
      mesaPorId.current = new Map(cocina.map((p) => [p.id, firmaMesa(p)]));
      return;
    }
    const recienLlegados: number[] = [];
    const nuevasRondas: number[] = [];
    const actualizados: number[] = [];
    cocina.forEach((p) => {
      if (!idsVistos.current!.has(p.id)) {
        recienLlegados.push(p.id);
        return;
      }
      const prevEstado = estadoPorId.current.get(p.id);
      const prevItems = itemsPorId.current.get(p.id);
      const prevMesa = mesaPorId.current.get(p.id);
      if (prevEstado && prevEstado !== 'PENDIENTE' && p.estado === 'PENDIENTE') {
        nuevasRondas.push(p.id);
      } else if (
        (prevItems !== undefined && prevItems !== firmaItems(p))
        || (prevMesa !== undefined && prevMesa !== firmaMesa(p))
      ) {
        actualizados.push(p.id);
      }
    });
    idsVistos.current = ids;
    estadoPorId.current = new Map(cocina.map((p) => [p.id, p.estado || '']));
    itemsPorId.current = new Map(cocina.map((p) => [p.id, firmaItems(p)]));
    mesaPorId.current = new Map(cocina.map((p) => [p.id, firmaMesa(p)]));
    if (recienLlegados.length === 0 && nuevasRondas.length === 0 && actualizados.length === 0) {
      return undefined;
    }
    const destacar = [...recienLlegados, ...nuevasRondas];
    if (destacar.length > 0) {
      setIdsNuevos((prev) => new Set([...Array.from(prev), ...destacar]));
      setAvisoNuevos(
        nuevasRondas.length > 0 && recienLlegados.length === 0
          ? nuevasRondas.length === 1
            ? 'Nueva comanda de mesa'
            : `Nuevas comandas en ${nuevasRondas.length} mesas`
          : recienLlegados.length === 1
            ? 'Entró un pedido nuevo'
            : `Entraron ${recienLlegados.length} pedidos nuevos`
      );
      avisarPedidoNuevo();
    } else if (actualizados.length > 0) {
      setIdsActualizados((prev) => new Set([...Array.from(prev), ...actualizados]));
      setAvisoNuevos(
        actualizados.length === 1 ? 'Se actualizó una comanda' : `Se actualizaron ${actualizados.length} comandas`
      );
    }
    const limpiaAviso = window.setTimeout(() => setAvisoNuevos(null), 8000);
    const limpiaNuevos = window.setTimeout(() => {
      setIdsNuevos((prev) => {
        const siguiente = new Set(prev);
        destacar.forEach((id) => siguiente.delete(id));
        return siguiente;
      });
      setIdsActualizados((prev) => {
        const siguiente = new Set(prev);
        actualizados.forEach((id) => siguiente.delete(id));
        return siguiente;
      });
    }, 20000);
    return () => {
      window.clearTimeout(limpiaAviso);
      window.clearTimeout(limpiaNuevos);
    };
  }, [firmaCocina]);

  const cambiarEstado = async (pedido: Pedido, estado: string) => {
    setGuardandoId(pedido.id);
    setFeedback(null);
    try {
      await apiClient.put(`/ventas/${pedido.id}/estado`, { estado });
      await mutate();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'No pudimos actualizar el estado del pedido.',
      });
    } finally {
      setGuardandoId(null);
    }
  };

  const marcarCobrado = async (pedido: Pedido, cobrado: boolean) => {
    setGuardandoId(pedido.id);
    setFeedback(null);
    try {
      await apiClient.put(`/ventas/${pedido.id}/cobro`, {
        cobrado,
        metodoPago: pedido.metodoPago,
      });
      await mutate();
      setFeedback({
        type: 'success',
        message: cobrado ? `Pedido #${pedido.nroComprobante || pedido.id} cobrado.` : 'Pedido marcado sin cobrar.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'No pudimos actualizar el cobro.',
      });
    } finally {
      setGuardandoId(null);
    }
  };

  const devolverACola = async (pedido: Pedido) => {
    setGuardandoId(pedido.id);
    setFeedback(null);
    try {
      await apiClient.post(`/ventas/${pedido.id}/liberar`);
      await mutate();
      setFeedback({ type: 'success', message: `Pedido #${pedido.nroComprobante || pedido.id} volvió a la cola.` });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'No pudimos devolver el pedido a la cola.',
      });
    } finally {
      setGuardandoId(null);
    }
  };

  const despachar = async (pedido: Pedido, repartidorUsuarioId?: number) => {
    setGuardandoId(pedido.id);
    setFeedback(null);
    try {
      await apiClient.post(`/ventas/${pedido.id}/despachar`, {
        repartidorUsuarioId: repartidorUsuarioId || null,
      });
      await mutate();
      setFeedback({
        type: 'success',
        message: `Pedido #${pedido.nroComprobante || pedido.id} en camino.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'No pudimos despachar el pedido.',
      });
    } finally {
      setGuardandoId(null);
    }
  };

  const renderCard = (pedido: Pedido) => (
    <PedidoCard
      key={pedido.id}
      pedido={pedido}
      esNuevo={idsNuevos.has(pedido.id)}
      esActualizado={idsActualizados.has(pedido.id)}
      hace={haceTiempo(pedido.fecha, ahora)}
      guardando={guardandoId === pedido.id}
      onImprimir={() => imprimirTicket(pedidoATicket(pedido), globalConfig)}
      onCambiarEstado={cambiarEstado}
      onCobrar={() => marcarCobrado(pedido, true)}
      onEditar={() => setEditando(pedido)}
      onLiberar={pedido.puedeLiberar ? () => devolverACola(pedido) : undefined}
      cadetes={Array.isArray(cadetes) ? cadetes : []}
      onDespachar={despachar}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        description="Salón, delivery y retiro. La mesa se cobra en Mesas."
        action={
          <AppButton icon={Plus} onClick={() => setFormAbierto(true)}>
            Nuevo pedido
          </AppButton>
        }
        meta={
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              {cocina.length} en cocina
            </span>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
              {listosSalida.length} listos para salir
            </span>
            <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
              {enCamino.length} en camino
            </span>
            {avisoNuevos && (
              <span className="animate-pulse rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-100">
                {avisoNuevos}
              </span>
            )}
          </div>
        }
      />

      {feedback && <ErrorAlert type={feedback.type} message={feedback.message} />}
      {error && <ErrorAlert message="No pudimos cargar los pedidos." />}

      <div className="flex flex-wrap gap-2">
        <FiltroChip activo={canalFiltro === ''} onClick={() => setCanalFiltro('')}>Todos los canales</FiltroChip>
        <FiltroChip activo={canalFiltro === 'SALON'} onClick={() => setCanalFiltro('SALON')}>Salón</FiltroChip>
        <FiltroChip activo={canalFiltro === 'WHATSAPP'} onClick={() => setCanalFiltro('WHATSAPP')}>WhatsApp</FiltroChip>
        <FiltroChip activo={canalFiltro === 'DELIVERY'} onClick={() => setCanalFiltro('DELIVERY')}>Delivery</FiltroChip>
        <FiltroChip activo={canalFiltro === 'RETIRO'} onClick={() => setCanalFiltro('RETIRO')}>Retiro</FiltroChip>
        <FiltroChip activo={actividad === 'activos'} onClick={() => setActividad('activos')}>Cocina</FiltroChip>
        <FiltroChip activo={actividad === 'todos'} onClick={() => setActividad('todos')}>Historial</FiltroChip>
        {actividad === 'activos' && (
          <>
            <FiltroChip activo={vista === 'columnas'} onClick={() => setVista('columnas')}>Columnas</FiltroChip>
            <FiltroChip activo={vista === 'lista'} onClick={() => setVista('lista')}>Lista</FiltroChip>
            <FiltroChip activo={vista === 'salida'} onClick={() => setVista('salida')}>Salida</FiltroChip>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm font-bold text-slate-400">
          Cargando pedidos...
        </div>
      ) : visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-12 text-center">
          <ChefHat className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <p className="text-lg font-black text-white">Cocina libre</p>
          <p className="mt-2 text-sm text-slate-400">Cargá un delivery o un plato en una mesa. Cocina lo ve acá.</p>
        </div>
      ) : actividad === 'activos' && vista === 'salida' ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wide text-slate-300">Listos · esperando cadete</h3>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-black text-slate-400">
                {listosSalida.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {listosSalida.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-800 px-3 py-6 text-center text-xs text-slate-600">
                  Nadie esperando. Despachá desde la fila o desde esta columna.
                </p>
              ) : (
                listosSalida.map(renderCard)
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wide text-cyan-200">En camino</h3>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-black text-slate-400">
                {enCamino.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {enCamino.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-800 px-3 py-6 text-center text-xs text-slate-600">
                  Vacío
                </p>
              ) : (
                enCamino.map(renderCard)
              )}
            </div>
          </section>
        </div>
      ) : actividad === 'activos' && vista === 'columnas' ? (
        <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${columnasCocina.length === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
          {columnasCocina.map((col) => {
            const deColumna = cocina.filter((p) => p.estado === col.key);
            return (
              <section key={col.key} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="text-xs font-black uppercase tracking-wide text-slate-300">{col.label}</h3>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-black text-slate-400">
                    {deColumna.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {deColumna.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-800 px-3 py-6 text-center text-xs text-slate-600">
                      Vacío
                    </p>
                  ) : (
                    deColumna.map(renderCard)
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
          {visibles.map(renderCard)}
        </div>
      )}

      {formAbierto && (
        <PedidoFormModal
          titulo="Nuevo pedido"
          productos={productosDeCarta(Array.isArray(productos) ? productos : [])}
          clientes={Array.isArray(clientes) ? clientes : []}
          metodos={getMetodosPagoHabilitados(globalConfig)}
          onClose={() => setFormAbierto(false)}
          onGuardado={async (mensaje) => {
            setFormAbierto(false);
            setFeedback({ type: 'success', message: mensaje });
            await mutate();
          }}
        />
      )}

      {editando && (
        <PedidoFormModal
          titulo={`Editar #${editando.nroComprobante || editando.id}`}
          pedido={editando}
          productos={productosDeCarta(Array.isArray(productos) ? productos : [])}
          clientes={Array.isArray(clientes) ? clientes : []}
          metodos={getMetodosPagoHabilitados(globalConfig)}
          onClose={() => setEditando(null)}
          onGuardado={async (mensaje) => {
            setEditando(null);
            setFeedback({ type: 'success', message: mensaje });
            await mutate();
          }}
        />
      )}
    </div>
  );
};

const FiltroChip: React.FC<{ activo: boolean; onClick: () => void; children: React.ReactNode }> = ({
  activo,
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wide transition ${
      activo
        ? 'border-blue-400/40 bg-blue-500/20 text-white'
        : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
    }`}
  >
    {children}
  </button>
);

const PedidoCard: React.FC<{
  pedido: Pedido;
  esNuevo: boolean;
  esActualizado?: boolean;
  hace: string;
  guardando: boolean;
  onImprimir: () => void;
  onCambiarEstado: (pedido: Pedido, estado: string) => void;
  onCobrar: () => void;
  onEditar: () => void;
  onLiberar?: () => void;
  cadetes: { id: number; nombreVisible?: string; email?: string }[];
  onDespachar: (pedido: Pedido, repartidorUsuarioId?: number) => void;
}> = ({ pedido, esNuevo, esActualizado, hace, guardando, onImprimir, onCambiarEstado, onCobrar, onEditar, onLiberar, cadetes, onDespachar }) => {
  const [cadeteId, setCadeteId] = useState('');
  const [abierto, setAbierto] = useState(esNuevo);
  const salon = esPedidoSalon(pedido);
  const nombre = nombrePedido(pedido);
  const telefono = telefonoPedido(pedido);
  const maps = salon ? null : mapsUrl(pedido.direccionEntrega);
  const wa = salon ? null : whatsappUrl(telefonoPedido(pedido));
  const puedeDespachar = !salon && (Boolean(pedido.puedeTomar) || (esPedidoEnvio(pedido) && pedido.estado === 'LISTO'));
  const CanalIcon =
    pedido.canal === 'DELIVERY' ? Bike
      : pedido.canal === 'WHATSAPP' ? MessageCircle
        : pedido.canal === 'RETIRO' ? Package
          : pedido.canal === 'SALON' ? LayoutGrid
            : Store;
  const activo = pedido.estado !== 'ENTREGADO' && pedido.estado !== 'ANULADA' && pedido.estado !== 'PAGADA';
  const borde = esNuevo
    ? 'border-amber-400/60 ring-1 ring-amber-400/30 bg-slate-900'
    : esActualizado
      ? 'border-sky-400/50 ring-1 ring-sky-400/25 bg-slate-900'
      : tonoEspera(pedido.fecha);
  const proximos = (pedido.proximosEstados || []).filter((estado) => estado !== 'EN_CAMINO');
  const notaGeneral = pedido.observaciones && !pedido.observaciones.startsWith('Cuenta abierta')
    ? pedido.observaciones
    : '';
  const tieneNotas = Boolean(notaGeneral || (pedido.items || []).some((item) => item.observaciones));

  useEffect(() => {
    if (esNuevo) setAbierto(true);
  }, [esNuevo]);

  return (
    <article className={`overflow-hidden rounded-xl border ${borde}`}>
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="flex w-8 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-800/60 hover:text-white"
          title={abierto ? 'Cerrar detalle' : 'Ver detalle'}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${abierto ? '' : '-rotate-90'}`} />
        </button>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="min-w-0 flex-1 px-1 py-2 text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-black text-emerald-300">#{pedido.nroComprobante || pedido.id}</p>
              <h3 className="truncate text-sm font-black text-white">{nombre}</h3>
              <p className="mt-0.5 truncate text-xs text-slate-400">{resumenItems(pedido)}</p>
            </div>
            {hace && (
              <p className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-bold ${colorReloj(pedido.fecha)}`}>
                <Clock className="h-3 w-3" />
                {hace}
              </p>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {esNuevo && (
              <span className="rounded-full border border-amber-400/40 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-100">
                Nuevo
              </span>
            )}
            {esActualizado && !esNuevo && (
              <span className="rounded-full border border-sky-400/40 bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-sky-100">
                Se actualizó
              </span>
            )}
            {tieneNotas && (
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-200">
                Notas
              </span>
            )}
            {puedeDespachar && (
              <span className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-cyan-100">
                Despachar
              </span>
            )}
            {pedido.repartidorNombre && (
              <span className="rounded-full border border-cyan-400/30 bg-slate-950 px-1.5 py-0.5 text-[9px] font-black uppercase text-cyan-200">
                {pedido.repartidorNombre}
              </span>
            )}
            <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase ${tonoEstado(pedido.estado)}`}>
              {LABELS_ESTADO[pedido.estado || ''] || pedido.estado}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-300">
              <CanalIcon className="h-2.5 w-2.5" />
              {LABELS_CANAL[pedido.canal || ''] || pedido.canal}
            </span>
            {!salon && (
              <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase ${
                pedido.cobrado
                  ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                  : 'border-rose-400/30 bg-rose-500/15 text-rose-200'
              }`}>
                {pedido.cobrado ? 'Cobrado' : 'Sin cobrar'}
              </span>
            )}
          </div>
        </button>
        <div className="flex shrink-0 flex-col items-stretch justify-center gap-1 py-1.5 pr-1.5">
          <button
            type="button"
            onClick={onImprimir}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-950 p-1.5 text-slate-300 hover:bg-slate-800"
            title="Imprimir comanda"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
          {proximos.map((estado) => (
            <button
              key={estado}
              type="button"
              disabled={guardando}
              title={labelEstadoAccion(estado)}
              onClick={() => onCambiarEstado(pedido, estado)}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-[10px] font-black text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {estado === 'EN_PREPARACION' ? <ChefHat className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {guardando ? '...' : labelEstadoCorto(estado)}
            </button>
          ))}
        </div>
      </div>

      {abierto && (
        <div className="space-y-2 border-t border-slate-800 bg-slate-950/60 px-3 py-3 text-sm text-slate-300">
          {salon ? (
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-100">
              Comanda de salón. Cuando esté lista, se cobra en Mesas. Si agregan otro plato, vuelve a Pendiente.
            </p>
          ) : (
            <>
              <p className="flex items-center gap-2 text-xs">
                <Phone className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-bold text-white">{telefono || 'Sin teléfono'}</span>
              </p>
              {pedido.direccionEntrega && (
                <p className="flex items-start gap-2 text-xs">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 text-cyan-400" />
                  <span>{pedido.direccionEntrega}</span>
                </p>
              )}
              {(maps || wa) && (
                <div className="flex flex-wrap gap-2">
                  {maps && (
                    <a
                      href={maps}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-black text-cyan-100"
                    >
                      Maps
                    </a>
                  )}
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-black text-emerald-100"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              )}
            </>
          )}
          {notaGeneral && (
            <p className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400">
              {notaGeneral}
            </p>
          )}

          <ul className="space-y-1 text-sm">
            {(pedido.items || []).map((item, index) => (
              <li key={`${pedido.id}-${index}`} className="text-slate-300">
                <div className="flex justify-between gap-2">
                  <span>
                    <span className="font-black text-white">{item.cantidad}×</span> {item.producto}
                  </span>
                  <span className="shrink-0 font-bold">
                    ${Number((item.precioUnitario || 0) * (item.cantidad || 0)).toLocaleString('es-AR')}
                  </span>
                </div>
                {item.observaciones && (
                  <p className="mt-0.5 text-[11px] font-semibold text-amber-200/90">* {item.observaciones}</p>
                )}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2">
            <p className="text-base font-black text-white">
              ${Number(pedido.totalFinal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                onClick={onImprimir}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-black text-slate-200 hover:bg-slate-800"
              >
                <Printer className="h-3.5 w-3.5" />
                Comanda
              </button>
              {activo && !salon && (
                <button
                  type="button"
                  onClick={onEditar}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-black text-slate-200 hover:bg-slate-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              )}
              {!pedido.cobrado && activo && !salon && (
                <button
                  type="button"
                  disabled={guardando}
                  onClick={onCobrar}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-black text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  {guardando ? '...' : 'Cobrar'}
                </button>
              )}
              {puedeDespachar && (
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {cadetes.length > 0 && (
                    <select
                      value={cadeteId}
                      onChange={(e) => setCadeteId(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] font-bold text-slate-200"
                    >
                      <option value="">Sin cadete / cocina</option>
                      {cadetes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombreVisible || c.email}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => onDespachar(pedido, cadeteId ? Number(cadeteId) : undefined)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-cyan-500 disabled:opacity-50"
                  >
                    <Bike className="h-3.5 w-3.5" />
                    {guardando ? '...' : 'Despachar'}
                  </button>
                </div>
              )}
              {onLiberar && (
                <button
                  type="button"
                  disabled={guardando}
                  onClick={onLiberar}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-black text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  Devolver a cola
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

const PedidoFormModal: React.FC<{
  titulo: string;
  pedido?: Pedido;
  productos: ProductoCatalogo[];
  clientes: any[];
  metodos: { value: MetodoPago; label: string }[];
  onClose: () => void;
  onGuardado: (mensaje: string) => Promise<void>;
}> = ({ titulo, pedido, productos, clientes, metodos, onClose, onGuardado }) => {
  const editando = Boolean(pedido);
  const [canal, setCanal] = useState<CanalPedido>((pedido?.canal as CanalPedido) || 'DELIVERY');
  const [clienteId, setClienteId] = useState<string>('');
  const [nombre, setNombre] = useState(pedido?.nombreContacto || '');
  const [telefono, setTelefono] = useState(pedido?.telefonoContacto || pedido?.cliente?.telefono || '');
  const [direccion, setDireccion] = useState(pedido?.direccionEntrega || '');
  const [notas, setNotas] = useState(pedido?.observaciones || '');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>((pedido?.metodoPago as MetodoPago) || metodos[0]?.value || 'EFECTIVO');
  const [cobradoAlCrear, setCobradoAlCrear] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [lineas, setLineas] = useState<LineaNueva[]>(() =>
    (pedido?.items || []).map((item) => {
      const porId = item.productoId
        ? productos.find((p) => p.id === item.productoId)
        : undefined;
      const porNombre = productos.find(
        (p) => p.nombre.toLowerCase() === (item.producto || '').toLowerCase()
      );
      const producto = porId || porNombre;
      return {
        productoId: producto?.id || item.productoId || 0,
        nombre: item.producto,
        cantidad: item.cantidad,
        stock: stockCarta(producto) || 999,
        observaciones: item.observaciones || '',
      };
    }).filter((l) => l.productoId > 0)
  );
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const filtrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
  ).slice(0, 8);

  const agregar = (producto: ProductoCatalogo) => {
    setLineas((prev) => {
      const existente = prev.find((l) => l.productoId === producto.id);
      if (existente) {
        return prev.map((l) =>
          l.productoId === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l
        );
      }
      return [...prev, {
        productoId: producto.id,
        nombre: producto.nombre,
        cantidad: 1,
        stock: stockCarta(producto),
        observaciones: '',
      }];
    });
    setBusqueda('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (lineas.length === 0) {
      setError('Agregá al menos un producto.');
      return;
    }
    if (canal === 'DELIVERY' && !direccion.trim()) {
      setError('El delivery necesita una dirección de entrega.');
      return;
    }
    setEnviando(true);
    const payload = {
      canal,
      clienteId: clienteId ? Number(clienteId) : null,
      nombreContacto: nombre,
      telefonoContacto: telefono,
      direccionEntrega: canal === 'RETIRO' ? (direccion || null) : direccion,
      observaciones: notas,
      metodoPago,
      cobrado: editando ? undefined : cobradoAlCrear,
      items: lineas.map((l) => ({
        productoId: l.productoId,
        cantidad: l.cantidad,
        observaciones: l.observaciones || null,
      })),
    };
    try {
      if (editando && pedido) {
        const response = await apiClient.put(`/ventas/${pedido.id}`, payload);
        await onGuardado(`Pedido ${response.data?.nroComprobante || pedido.id} actualizado.`);
      } else {
        const response = await apiClient.post('/ventas', payload);
        await onGuardado(`Pedido ${response.data?.nroComprobante || response.data?.id} cargado.`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || (editando
        ? 'No se pudo editar el pedido.'
        : 'No se pudo crear el pedido. ¿La caja está abierta?'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">{titulo}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">Cerrar</button>
        </div>

        {!editando && (
          <div className="mb-4 grid grid-cols-3 gap-2">
            {([
              { id: 'DELIVERY' as const, label: 'Delivery', active: 'border-cyan-400/40 bg-cyan-500/15 text-white' },
              { id: 'RETIRO' as const, label: 'Retiro', active: 'border-violet-400/40 bg-violet-500/15 text-white' },
              { id: 'WHATSAPP' as const, label: 'WhatsApp', active: 'border-emerald-400/40 bg-emerald-500/15 text-white' },
            ]).map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => setCanal(op.id)}
                className={`rounded-xl border px-3 py-3 text-sm font-black ${
                  canal === op.id ? op.active : 'border-slate-700 text-slate-400'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        )}

        {!editando && (
          <label className="mb-3 block text-xs font-black uppercase text-slate-400">
            Cliente existente (opcional)
            <select
              value={clienteId}
              onChange={(e) => {
                const id = e.target.value;
                setClienteId(id);
                const cliente = clientes.find((c: any) => String(c.id) === id);
                if (cliente) {
                  setNombre(`${cliente.nombre || ''} ${cliente.apellido || ''}`.trim());
                  setTelefono(cliente.telefono || '');
                  setDireccion(cliente.direccion || '');
                }
              }}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
            >
              <option value="">Sin cliente / cargar a mano</option>
              {clientes.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido} {c.telefono ? `· ${c.telefono}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
        </div>
        {(canal === 'DELIVERY' || canal === 'WHATSAPP' || direccion) && (
          <input
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder={
              canal === 'DELIVERY'
                ? 'Dirección de entrega (obligatoria)'
                : 'Dirección (si la cargás, sale a la calle y se puede despachar)'
            }
            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        )}
        <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas generales: depto 3, timbre..." className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />

        <select
          value={metodoPago}
          onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
          className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
        >
          {metodos.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {!editando && (
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <input
              type="checkbox"
              checked={cobradoAlCrear}
              onChange={(e) => setCobradoAlCrear(e.target.checked)}
              className="rounded border-slate-600"
            />
            Ya está cobrado
          </label>
        )}

        <div className="mt-4">
          <p className="mb-2 text-xs font-black uppercase text-slate-400">Productos</p>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar plato o bebida"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          {busqueda.trim() && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
              {filtrados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => agregar(p)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-900"
                >
                  <span>{p.nombre}</span>
                  <span className="text-xs text-slate-500">≈ {stockCarta(p)} porciones</span>
                </button>
              ))}
            </div>
          )}
          <ul className="mt-3 space-y-2">
            {lineas.map((linea) => (
              <li key={linea.productoId} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{linea.nombre}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={linea.cantidad}
                      onChange={(e) =>
                        setLineas((prev) =>
                          prev.map((l) =>
                            l.productoId === linea.productoId
                              ? { ...l, cantidad: Math.max(1, Number(e.target.value) || 1) }
                              : l
                          )
                        )
                      }
                      className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-center"
                    />
                    <button type="button" onClick={() => setLineas((prev) => prev.filter((l) => l.productoId !== linea.productoId))}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
                <input
                  value={linea.observaciones}
                  onChange={(e) =>
                    setLineas((prev) =>
                      prev.map((l) =>
                        l.productoId === linea.productoId
                          ? { ...l, observaciones: e.target.value }
                          : l
                      )
                    )
                  }
                  placeholder="Nota del ítem: sin mayo..."
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
                />
              </li>
            ))}
          </ul>
        </div>

        {error && <p className="mt-3 text-sm font-bold text-red-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <AppButton type="button" variant="secondary" onClick={onClose}>Cancelar</AppButton>
          <AppButton type="submit" disabled={enviando}>
            {enviando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear pedido'}
          </AppButton>
        </div>
      </form>
    </div>
  );
};

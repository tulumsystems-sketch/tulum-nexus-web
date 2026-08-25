import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Bike,
  CheckCircle2,
  ChefHat,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
} from 'lucide-react';
import apiClient from '../../../api/axiosConfig';
import { PageHeader } from '../../../components/ui/PageHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { getMetodosPagoHabilitados, MetodoPago } from '../../../utils/tenantConfig';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

type CanalPedido = 'WHATSAPP' | 'DELIVERY';
type FiltroActividad = 'activos' | 'todos';

interface ItemPedido {
  producto: string;
  cantidad: number;
  precioUnitario?: number;
}

interface Pedido {
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
  proximosEstados?: string[];
  items?: ItemPedido[];
  cliente?: { nombre?: string; apellido?: string; telefono?: string };
}

interface ProductoCatalogo {
  id: number;
  nombre: string;
  precio: number;
  cantidadStock: number;
}

interface LineaNueva {
  productoId: number;
  nombre: string;
  cantidad: number;
  stock: number;
}

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
  MOSTRADOR: 'Mostrador',
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

const labelEstadoAccion = (estado: string): string => {
  switch (estado) {
    case 'EN_PREPARACION':
      return 'Pasar a preparación';
    case 'LISTO':
      return 'Marcar listo';
    case 'EN_CAMINO':
      return 'Salir a entregar';
    case 'ENTREGADO':
      return 'Marcar entregado';
    default:
      return LABELS_ESTADO[estado] || estado;
  }
};

export const PedidosTab: React.FC = () => {
  const [canalFiltro, setCanalFiltro] = useState<'' | CanalPedido>('');
  const [actividad, setActividad] = useState<FiltroActividad>('activos');
  const [formAbierto, setFormAbierto] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [guardandoId, setGuardandoId] = useState<number | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('soloPedidos', 'true');
    params.set('size', '50');
    params.set('sort', 'fecha,desc');
    if (canalFiltro) params.set('canal', canalFiltro);
    if (actividad === 'activos') {
      // El tablero de cocina no mezcla entregados. El filtro "todos" sí.
    }
    return `/ventas/search?${params.toString()}`;
  }, [canalFiltro]);

  const { data, error, isLoading, mutate } = useSWR(query, fetcher, { refreshInterval: 8000 });
  const { data: productos } = useSWR<ProductoCatalogo[]>('/productos', fetcher);
  const { data: clientes } = useSWR('/clientes', fetcher);
  const { data: globalConfig } = useSWR('/config', fetcher);

  const pedidos: Pedido[] = Array.isArray(data?.content) ? data.content : [];
  const visibles = pedidos.filter((p) => {
    if (p.estado === 'ANULADA') return false;
    if (actividad === 'activos') {
      return p.estado !== 'ENTREGADO' && p.estado !== 'PAGADA';
    }
    return true;
  });

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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sala y delivery"
        title="Pedidos"
        description="WhatsApp y delivery en un solo tablero. El mostrador sigue en el POS."
        icon={ShoppingBag}
        action={
          <AppButton icon={Plus} onClick={() => setFormAbierto(true)}>
            Nuevo pedido
          </AppButton>
        }
        meta={
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-200">
              {visibles.length} en curso
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
              Actualiza cada 8s
            </span>
          </div>
        }
      />

      {feedback && <ErrorAlert type={feedback.type} message={feedback.message} />}
      {error && <ErrorAlert message="No pudimos cargar los pedidos." />}

      <div className="flex flex-wrap gap-2">
        <FiltroChip activo={canalFiltro === ''} onClick={() => setCanalFiltro('')}>Todos los canales</FiltroChip>
        <FiltroChip activo={canalFiltro === 'WHATSAPP'} onClick={() => setCanalFiltro('WHATSAPP')}>WhatsApp</FiltroChip>
        <FiltroChip activo={canalFiltro === 'DELIVERY'} onClick={() => setCanalFiltro('DELIVERY')}>Delivery</FiltroChip>
        <FiltroChip activo={actividad === 'activos'} onClick={() => setActividad('activos')}>Activos</FiltroChip>
        <FiltroChip activo={actividad === 'todos'} onClick={() => setActividad('todos')}>Incluir entregados</FiltroChip>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm font-bold text-slate-400">
          Cargando pedidos...
        </div>
      ) : visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-12 text-center">
          <MessageCircle className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <p className="text-lg font-black text-white">No hay pedidos en este filtro</p>
          <p className="mt-2 text-sm text-slate-400">Cargá uno a mano para la demo, o esperá uno por WhatsApp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {visibles.map((pedido) => (
            <PedidoCard
              key={pedido.id}
              pedido={pedido}
              guardando={guardandoId === pedido.id}
              onCambiarEstado={cambiarEstado}
            />
          ))}
        </div>
      )}

      {formAbierto && (
        <NuevoPedidoModal
          productos={Array.isArray(productos) ? productos : []}
          clientes={Array.isArray(clientes) ? clientes : []}
          metodos={getMetodosPagoHabilitados(globalConfig)}
          onClose={() => setFormAbierto(false)}
          onCreado={async (mensaje) => {
            setFormAbierto(false);
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
  guardando: boolean;
  onCambiarEstado: (pedido: Pedido, estado: string) => void;
}> = ({ pedido, guardando, onCambiarEstado }) => {
  const nombre =
    pedido.nombreContacto ||
    `${pedido.cliente?.nombre || ''} ${pedido.cliente?.apellido || ''}`.trim() ||
    'Sin nombre';
  const telefono = pedido.telefonoContacto || pedido.cliente?.telefono || 'Sin teléfono';
  const CanalIcon = pedido.canal === 'DELIVERY' ? Bike : pedido.canal === 'WHATSAPP' ? MessageCircle : Store;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-black text-emerald-300">#{pedido.nroComprobante || pedido.id}</p>
          <h3 className="mt-1 text-lg font-black text-white">{nombre}</h3>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${tonoEstado(pedido.estado)}`}>
            {LABELS_ESTADO[pedido.estado || ''] || pedido.estado}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-bold uppercase text-slate-300">
            <CanalIcon className="h-3 w-3" />
            {LABELS_CANAL[pedido.canal || ''] || pedido.canal}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-300">
        <p className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-emerald-400" />
          <span className="font-bold text-white">{telefono}</span>
        </p>
        {pedido.direccionEntrega && (
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-cyan-400" />
            <span>{pedido.direccionEntrega}</span>
          </p>
        )}
        {pedido.observaciones && (
          <p className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400">
            {pedido.observaciones}
          </p>
        )}
      </div>

      <ul className="mt-4 space-y-1.5 border-t border-slate-800 pt-3 text-sm">
        {(pedido.items || []).map((item, index) => (
          <li key={`${pedido.id}-${index}`} className="flex justify-between text-slate-300">
            <span>
              <span className="font-black text-white">{item.cantidad}×</span> {item.producto}
            </span>
            <span className="font-bold">
              ${Number((item.precioUnitario || 0) * (item.cantidad || 0)).toLocaleString('es-AR')}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
        <p className="text-xl font-black text-white">
          ${Number(pedido.totalFinal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          {(pedido.proximosEstados || []).map((estado) => (
            <button
              key={estado}
              type="button"
              disabled={guardando}
              onClick={() => onCambiarEstado(pedido, estado)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {estado === 'EN_PREPARACION' ? <ChefHat className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {guardando ? 'Guardando...' : labelEstadoAccion(estado)}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
};

const NuevoPedidoModal: React.FC<{
  productos: ProductoCatalogo[];
  clientes: any[];
  metodos: { value: MetodoPago; label: string }[];
  onClose: () => void;
  onCreado: (mensaje: string) => Promise<void>;
}> = ({ productos, clientes, metodos, onClose, onCreado }) => {
  const [canal, setCanal] = useState<CanalPedido>('DELIVERY');
  const [clienteId, setClienteId] = useState<string>('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(metodos[0]?.value || 'EFECTIVO');
  const [busqueda, setBusqueda] = useState('');
  const [lineas, setLineas] = useState<LineaNueva[]>([]);
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
      return [...prev, { productoId: producto.id, nombre: producto.nombre, cantidad: 1, stock: producto.cantidadStock }];
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
    setEnviando(true);
    try {
      const response = await apiClient.post('/ventas', {
        canal,
        clienteId: clienteId ? Number(clienteId) : null,
        nombreContacto: nombre,
        telefonoContacto: telefono,
        direccionEntrega: direccion,
        observaciones: notas,
        metodoPago,
        items: lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
      });
      await onCreado(`Pedido ${response.data?.nroComprobante || response.data?.id} cargado.`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo crear el pedido. ¿La caja está abierta?');
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
          <h2 className="text-xl font-black text-white">Nuevo pedido</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">Cerrar</button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCanal('DELIVERY')}
            className={`rounded-xl border px-3 py-3 text-sm font-black ${canal === 'DELIVERY' ? 'border-cyan-400/40 bg-cyan-500/15 text-white' : 'border-slate-700 text-slate-400'}`}
          >
            Delivery
          </button>
          <button
            type="button"
            onClick={() => setCanal('WHATSAPP')}
            className={`rounded-xl border px-3 py-3 text-sm font-black ${canal === 'WHATSAPP' ? 'border-emerald-400/40 bg-emerald-500/15 text-white' : 'border-slate-700 text-slate-400'}`}
          >
            WhatsApp
          </button>
        </div>

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

        <div className="grid gap-3 sm:grid-cols-2">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
        </div>
        <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección de entrega" className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
        <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas: sin mayo, depto 3..." className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />

        <select
          value={metodoPago}
          onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
          className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
        >
          {metodos.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

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
                  <span className="text-xs text-slate-500">stock {p.cantidadStock}</span>
                </button>
              ))}
            </div>
          )}
          <ul className="mt-3 space-y-2">
            {lineas.map((linea) => (
              <li key={linea.productoId} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white">
                <span>{linea.nombre}</span>
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
              </li>
            ))}
          </ul>
        </div>

        {error && <p className="mt-3 text-sm font-bold text-red-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <AppButton type="button" variant="secondary" onClick={onClose}>Cancelar</AppButton>
          <AppButton type="submit" disabled={enviando}>{enviando ? 'Creando...' : 'Crear pedido'}</AppButton>
        </div>
      </form>
    </div>
  );
};

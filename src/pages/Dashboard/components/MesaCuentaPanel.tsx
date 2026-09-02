import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Combine, Minus, Plus, Printer, Search, Split, Trash2, Wallet, X } from 'lucide-react';
import apiClient from '../../../api/axiosConfig';
import { AppButton } from '../../../components/ui/AppButton';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import {
  getMetodosPagoHabilitados,
  MetodoPago,
} from '../../../utils/tenantConfig';
import { imprimirTicket, TicketVenta } from '../../../utils/ticketTemplate';
import { productosDeCarta, stockCarta } from '../../../utils/unidadMedida';

interface ProductoCarta {
  id: number;
  nombre: string;
  precio: number;
  cantidadStock: number;
  tipo?: string;
  receta?: any[];
  porcionesEstimadas?: number;
  categoria?: { id: number; nombre: string };
}

interface Linea {
  productoId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  observaciones: string;
}

interface Cuenta {
  id: number;
  nroComprobante?: string;
  estado?: string;
  totalFinal?: number;
  metodoPago?: string;
  observaciones?: string;
  nombreContacto?: string;
  montoPagado?: number;
  saldo?: number;
  items?: {
    productoId?: number;
    producto?: string;
    cantidad?: number;
    precioUnitario?: number;
    observaciones?: string;
  }[];
}

interface MesaResumen {
  id: number;
  numero: number;
  etiqueta?: string;
  nombre?: string;
  estado?: string;
}

const money = (n: number) =>
  Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });

const cuentaATicket = (mesa: MesaResumen, cuenta: Cuenta): TicketVenta => ({
  id: cuenta.id,
  nroComprobante: cuenta.nroComprobante,
  canal: 'SALON',
  nombreContacto: cuenta.nombreContacto || mesa.etiqueta || mesa.nombre || `Mesa ${mesa.numero}`,
  metodoPago: cuenta.metodoPago,
  totalFinal: cuenta.totalFinal,
  observaciones: cuenta.observaciones,
  items: (cuenta.items || []).map((item) => ({
    cantidad: item.cantidad,
    precioUnitario: item.precioUnitario,
    observaciones: item.observaciones,
    producto: { nombre: item.producto },
  })),
});

export const MesaCuentaPanel: React.FC<{
  mesaId: number;
  onClose: () => void;
  onCambio: () => void;
  onMesaCambiada?: (mesaId: number) => void;
}> = ({ mesaId, onClose, onCambio, onMesaCambiada }) => {
  const [mesa, setMesa] = useState<MesaResumen | null>(null);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [productos, setProductos] = useState<ProductoCarta[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | 'todas'>('todas');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [mostrarCobro, setMostrarCobro] = useState(false);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO');
  const [montoAbonado, setMontoAbonado] = useState('');
  const [mesas, setMesas] = useState<MesaResumen[]>([]);
  const [traspaso, setTraspaso] = useState<null | 'pasar' | 'juntar'>(null);
  const [mesaDestinoId, setMesaDestinoId] = useState('');
  const [mostrarDivision, setMostrarDivision] = useState(false);
  const [partesIguales, setPartesIguales] = useState<number | null>(null);
  const [cantidadesParte, setCantidadesParte] = useState<Record<number, number>>({});

  const metodos = getMetodosPagoHabilitados(config);
  const total = cuenta?.totalFinal ?? lineas.reduce((acc, l) => acc + l.precioUnitario * l.cantidad, 0);
  const mesasPasar = mesas.filter((m) => m.id !== mesaId && m.estado === 'LIBRE');
  const mesasJuntar = mesas.filter((m) => m.id !== mesaId && m.estado === 'OCUPADA');
  const destinos = traspaso === 'juntar' ? mesasJuntar : mesasPasar;
  const pagado = Number(cuenta?.montoPagado || 0);
  const saldo = cuenta?.saldo != null ? Number(cuenta.saldo) : total;
  const aCobrar = pagado > 0 ? saldo : total;
  const subtotalLineas = lineas.reduce((acc, l) => acc + l.precioUnitario * l.cantidad, 0);
  const subtotalParte = lineas.reduce((acc, l) => acc + l.precioUnitario * (cantidadesParte[l.productoId] || 0), 0);
  const estimadoPlatos = subtotalLineas > 0 ? (subtotalParte * total) / subtotalLineas : 0;
  const estimadoPartes = partesIguales && partesIguales >= 2
    ? Math.min(Math.round((total / partesIguales) * 100) / 100, saldo)
    : 0;

  const categorias = useMemo(() => {
    const map = new Map<number, string>();
    productos.forEach((p) => {
      if (p.categoria?.id) map.set(p.categoria.id, p.categoria.nombre);
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [productos]);

  const carta = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      if (categoriaId !== 'todas' && p.categoria?.id !== categoriaId) return false;
      if (q && !p.nombre.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [productos, busqueda, categoriaId]);

  const hidratar = (data: any) => {
    const mesaData: MesaResumen = data?.mesa;
    const cuentaData: Cuenta | null = data?.cuenta || null;
    setMesa(mesaData);
    setCuenta(cuentaData);
    setLineas(
      (cuentaData?.items || [])
        .filter((item) => item.productoId)
        .map((item) => ({
          productoId: item.productoId as number,
          nombre: item.producto || 'Producto',
          cantidad: item.cantidad || 1,
          precioUnitario: item.precioUnitario || 0,
          observaciones: item.observaciones || '',
        }))
    );
  };

  const cargar = async () => {
    const [cuentaRes, productosRes, configRes, mesasRes] = await Promise.all([
      apiClient.get(`/mesas/${mesaId}/cuenta`),
      apiClient.get('/productos'),
      apiClient.get('/config'),
      apiClient.get('/mesas'),
    ]);
    hidratar(cuentaRes.data);
    setProductos(productosDeCarta(Array.isArray(productosRes.data) ? productosRes.data : []));
    setConfig(configRes.data);
    setMesas(Array.isArray(mesasRes.data) ? mesasRes.data : []);
    const metodosCfg = getMetodosPagoHabilitados(configRes.data);
    setMetodoPago((cuentaRes.data?.cuenta?.metodoPago as MetodoPago) || metodosCfg[0]?.value || 'EFECTIVO');
  };

  useEffect(() => {
    cargar().catch((err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'No pudimos abrir la cuenta de la mesa.',
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesaId]);

  const persistir = async (siguientes: Linea[]) => {
    setGuardando(true);
    setFeedback(null);
    try {
      const res = await apiClient.put(`/mesas/${mesaId}/cuenta`, {
        items: siguientes.map((l) => ({
          productoId: l.productoId,
          cantidad: l.cantidad,
          observaciones: l.observaciones || null,
        })),
      });
      hidratar(res.data);
      onCambio();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'No se pudo actualizar la cuenta.',
      });
      await cargar();
    } finally {
      setGuardando(false);
    }
  };

  const agregar = (producto: ProductoCarta) => {
    const siguientes = [...lineas];
    const idx = siguientes.findIndex((l) => l.productoId === producto.id);
    if (idx >= 0) {
      siguientes[idx] = { ...siguientes[idx], cantidad: siguientes[idx].cantidad + 1 };
    } else {
      siguientes.push({
        productoId: producto.id,
        nombre: producto.nombre,
        cantidad: 1,
        precioUnitario: producto.precio,
        observaciones: '',
      });
    }
    setLineas(siguientes);
    persistir(siguientes);
  };

  const cambiarCantidad = (productoId: number, delta: number) => {
    const siguientes = lineas
      .map((l) => (l.productoId === productoId ? { ...l, cantidad: l.cantidad + delta } : l))
      .filter((l) => l.cantidad > 0);
    setLineas(siguientes);
    persistir(siguientes);
  };

  const quitar = (productoId: number) => {
    const siguientes = lineas.filter((l) => l.productoId !== productoId);
    setLineas(siguientes);
    persistir(siguientes);
  };

  const guardarNota = (productoId: number, observaciones: string) => {
    const siguientes = lineas.map((l) =>
      l.productoId === productoId ? { ...l, observaciones } : l
    );
    setLineas(siguientes);
    persistir(siguientes);
  };

  const cobrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lineas.length === 0) {
      setFeedback({ type: 'error', message: 'Cargá al menos un plato antes de cobrar.' });
      return;
    }
    setCobrando(true);
    setFeedback(null);
    try {
      const abonado = metodoPago === 'EFECTIVO' && montoAbonado
        ? Number(montoAbonado)
        : aCobrar;
      const res = await apiClient.post(`/mesas/${mesaId}/cobrar`, {
        cobrado: true,
        metodoPago,
        montoAbonado: Number.isFinite(abonado) ? abonado : aCobrar,
      });
      hidratar(res.data);
      onCambio();
      if (res.data?.parteCobrada) {
        imprimirTicket(cuentaATicket(mesa || { id: mesaId, numero: 0 }, res.data.parteCobrada), config);
      } else if (res.data?.cuenta) {
        imprimirTicket(cuentaATicket(mesa || { id: mesaId, numero: 0 }, res.data.cuenta), config);
      }
      onClose();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'No se pudo cobrar la mesa.',
      });
    } finally {
      setCobrando(false);
    }
  };

  const abrirDivision = () => {
    setMostrarCobro(false);
    setMostrarDivision(true);
    setPartesIguales(null);
    setCantidadesParte({});
  };

  const setQtyParte = (productoId: number, qty: number, max: number) => {
    setPartesIguales(null);
    setCantidadesParte((prev) => ({
      ...prev,
      [productoId]: Math.max(0, Math.min(max, qty)),
    }));
  };

  const dividirCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = lineas
      .map((l) => ({ productoId: l.productoId, cantidad: cantidadesParte[l.productoId] || 0 }))
      .filter((l) => l.cantidad > 0);
    if (!partesIguales && items.length === 0) {
      setFeedback({ type: 'error', message: 'Elegí platos o dividí en 2, 3 o 4 partes.' });
      return;
    }
    setCobrando(true);
    setFeedback(null);
    try {
      const estimado = partesIguales ? estimadoPartes : estimadoPlatos;
      const abonado = metodoPago === 'EFECTIVO' && montoAbonado
        ? Number(montoAbonado)
        : estimado;
      const payload: {
        metodoPago: MetodoPago;
        montoAbonado?: number;
        partes?: number;
        items?: { productoId: number; cantidad: number }[];
      } = {
        metodoPago,
        montoAbonado: Number.isFinite(abonado) ? abonado : undefined,
      };
      if (partesIguales) {
        payload.partes = partesIguales;
      } else {
        payload.items = items;
      }
      const res = await apiClient.post(`/mesas/${mesaId}/dividir`, payload);
      if (res.data?.parteCobrada) {
        imprimirTicket(cuentaATicket(mesa || { id: mesaId, numero: 0 }, res.data.parteCobrada), config);
      }
      onCambio();
      const queda = res.data?.cuenta && res.data?.mesa?.estado === 'OCUPADA';
      if (!queda) {
        onClose();
        return;
      }
      hidratar(res.data);
      setCantidadesParte({});
      setPartesIguales(null);
      setMontoAbonado('');
      setFeedback({ type: 'success', message: 'Parte cobrada. La mesa sigue abierta con el resto.' });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'No se pudo dividir la cuenta.',
      });
    } finally {
      setCobrando(false);
    }
  };

  const anular = async () => {
    if (!window.confirm('¿Anular esta cuenta y liberar la mesa? El stock vuelve.')) return;
    setGuardando(true);
    try {
      await apiClient.post(`/mesas/${mesaId}/anular`);
      onCambio();
      onClose();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'No se pudo anular la cuenta.',
      });
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarTraspaso = async () => {
    const destinoId = Number(mesaDestinoId);
    if (!traspaso || !destinoId) {
      setFeedback({ type: 'error', message: 'Elegí la mesa destino.' });
      return;
    }
    if (traspaso === 'juntar') {
      const destino = mesas.find((m) => m.id === destinoId);
      const etiquetaDestino = destino?.etiqueta || destino?.nombre || `Mesa ${destino?.numero || destinoId}`;
      const etiquetaOrigen = mesa?.etiqueta || mesa?.nombre || `Mesa ${mesa?.numero || mesaId}`;
      if (!window.confirm(`Los platos de ${etiquetaOrigen} pasan a ${etiquetaDestino} y se libera ${etiquetaOrigen}.`)) {
        return;
      }
    }
    setGuardando(true);
    setFeedback(null);
    try {
      const res = await apiClient.post(`/mesas/${mesaId}/${traspaso}`, { mesaDestinoId: destinoId });
      hidratar(res.data);
      setTraspaso(null);
      setMesaDestinoId('');
      onCambio();
      onMesaCambiada?.(destinoId);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'No se pudo mover la cuenta.',
      });
    } finally {
      setGuardando(false);
    }
  };

  const imprimir = () => {
    if (!cuenta || !mesa) return;
    imprimirTicket(cuentaATicket(mesa, { ...cuenta, items: lineas.map((l) => ({
      productoId: l.productoId,
      producto: l.nombre,
      cantidad: l.cantidad,
      precioUnitario: l.precioUnitario,
      observaciones: l.observaciones,
    })) }), config);
  };

  const vuelto = metodoPago === 'EFECTIVO' && Number(montoAbonado) > aCobrar
    ? Number(montoAbonado) - aCobrar
    : 0;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-tulum-ink">
      <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-tulum-ink border-t border-tulum-border">
        <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-300">Cuenta de salón</p>
            <h2 className="text-xl font-black text-white">
              {mesa?.etiqueta || mesa?.nombre || `Mesa ${mesa?.numero || ''}`}
            </h2>
            {cuenta?.nroComprobante && (
              <p className="font-mono text-xs text-slate-400">{cuenta.nroComprobante}</p>
            )}
            <p className="mt-1 text-xs font-semibold text-emerald-200/90">
              {lineas.length === 0
                ? 'Cargá un plato y cocina lo ve en Pedidos.'
                : cuenta?.estado === 'LISTO'
                  ? 'Cocina marcó listo. Podés cobrar o sumar otro plato (vuelve a pendiente).'
                  : cuenta?.estado === 'EN_PREPARACION'
                    ? 'Cocina está preparando esta mesa.'
                    : 'Cocina ve esta mesa en Pedidos.'}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <AppButton variant="secondary" icon={Printer} onClick={imprimir} disabled={!cuenta}>
              Ticket
            </AppButton>
            <AppButton
              variant="secondary"
              icon={ArrowRightLeft}
              onClick={() => {
                setTraspaso((v) => (v === 'pasar' ? null : 'pasar'));
                setMesaDestinoId('');
              }}
              disabled={guardando}
            >
              Pasar
            </AppButton>
            <AppButton
              variant="secondary"
              icon={Combine}
              onClick={() => {
                setTraspaso((v) => (v === 'juntar' ? null : 'juntar'));
                setMesaDestinoId('');
              }}
              disabled={guardando || lineas.length === 0}
            >
              Juntar
            </AppButton>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {traspaso && (
          <div className="border-b border-slate-800 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-300">
              {traspaso === 'pasar' ? 'Pasar esta cuenta a una mesa libre' : 'Juntar los platos en otra mesa ocupada'}
            </p>
            {destinos.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                {traspaso === 'pasar' ? 'No hay mesas libres.' : 'No hay otra mesa ocupada para juntar.'}
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="text-xs font-bold text-slate-400">
                  Destino
                  <select
                    value={mesaDestinoId}
                    onChange={(e) => setMesaDestinoId(e.target.value)}
                    className="mt-1 block min-w-[180px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Elegí mesa</option>
                    {destinos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.etiqueta || m.nombre || `Mesa ${m.numero}`}
                      </option>
                    ))}
                  </select>
                </label>
                <AppButton onClick={ejecutarTraspaso} disabled={guardando || !mesaDestinoId}>
                  {traspaso === 'pasar' ? 'Pasar cuenta' : 'Juntar cuentas'}
                </AppButton>
                <AppButton variant="secondary" onClick={() => setTraspaso(null)}>
                  Cancelar
                </AppButton>
              </div>
            )}
          </div>
        )}

        {feedback && (
          <div className="px-4 pt-3">
            <ErrorAlert type={feedback.type} message={feedback.message} />
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
          <section className="min-h-0 overflow-y-auto border-b border-slate-800 p-4 lg:border-b-0 lg:border-r">
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en la carta…"
                className="w-full bg-transparent text-sm text-white outline-none"
              />
            </div>
            {categorias.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCategoriaId('todas')}
                  className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${
                    categoriaId === 'todas' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Toda la carta
                </button>
                {categorias.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoriaId(c.id)}
                    className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${
                      categoriaId === c.id ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {c.nombre}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {carta.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => agregar(p)}
                  disabled={guardando || stockCarta(p) <= 0}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-left hover:border-emerald-400/40 disabled:opacity-40"
                >
                  <p className="font-black text-white">{p.nombre}</p>
                  <p className="mt-1 text-sm font-bold text-emerald-200">${money(p.precio)}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {p.receta?.length ? `≈ ${stockCarta(p)} porciones` : `Stock ${p.cantidadStock ?? 0}`}
                  </p>
                </button>
              ))}
              {carta.length === 0 && (
                <p className="col-span-2 py-8 text-center text-sm text-slate-500">No hay productos en esa búsqueda.</p>
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-col p-4">
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {lineas.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-800 px-4 py-10 text-center text-sm text-slate-500">
                  Tocá la carta para cargar el pedido. Podés anotar punto de cocción o guarnición en cada plato.
                </p>
              ) : (
                lineas.map((linea) => (
                  <article key={linea.productoId} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black text-white">{linea.nombre}</p>
                        <p className="text-sm font-bold text-emerald-200">
                          ${money(linea.precioUnitario * linea.cantidad)}
                        </p>
                      </div>
                      <button type="button" onClick={() => quitar(linea.productoId)} disabled={mostrarDivision} className="text-slate-500 hover:text-red-300 disabled:opacity-30">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={guardando || mostrarDivision}
                        onClick={() => cambiarCantidad(linea.productoId, -1)}
                        className="rounded-lg bg-slate-800 p-1.5 text-white disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[2ch] text-center font-black text-white">{linea.cantidad}</span>
                      <button
                        type="button"
                        disabled={guardando || mostrarDivision}
                        onClick={() => cambiarCantidad(linea.productoId, 1)}
                        className="rounded-lg bg-slate-800 p-1.5 text-white disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {mostrarDivision && !partesIguales && (
                      <div className="mt-2 flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-950/30 px-2 py-1.5">
                        <p className="text-[11px] font-black uppercase text-cyan-100">Cobra ahora</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQtyParte(linea.productoId, (cantidadesParte[linea.productoId] || 0) - 1, linea.cantidad)}
                            className="rounded-lg bg-slate-800 p-1 text-white"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[2ch] text-center text-sm font-black text-white">
                            {cantidadesParte[linea.productoId] || 0}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQtyParte(linea.productoId, (cantidadesParte[linea.productoId] || 0) + 1, linea.cantidad)}
                            className="rounded-lg bg-slate-800 p-1 text-white"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                    <input
                      value={linea.observaciones}
                      onChange={(e) =>
                        setLineas((prev) =>
                          prev.map((l) =>
                            l.productoId === linea.productoId ? { ...l, observaciones: e.target.value } : l
                          )
                        )
                      }
                      onBlur={(e) => guardarNota(linea.productoId, e.target.value)}
                      placeholder="Punto, guarnición, sin cebolla…"
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none"
                    />
                  </article>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-slate-800 pt-4">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-400">Total</p>
                  {pagado > 0 && (
                    <p className="text-[11px] font-semibold text-cyan-200">
                      Ya cobrado ${money(pagado)} · saldo ${money(saldo)}
                    </p>
                  )}
                </div>
                <p className="text-2xl font-black text-white">${money(pagado > 0 ? saldo : total)}</p>
              </div>
              {mostrarCobro ? (
                <form onSubmit={cobrar} className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
                  <div className="flex flex-wrap gap-2">
                    {metodos.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMetodoPago(m.value)}
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                          metodoPago === m.value ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {metodoPago === 'EFECTIVO' && (
                    <label className="block text-xs font-bold text-slate-400">
                      Abona con
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={montoAbonado}
                        onChange={(e) => setMontoAbonado(e.target.value)}
                        placeholder={String(aCobrar)}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                      />
                    </label>
                  )}
                  {vuelto > 0 && (
                    <p className="text-sm font-black text-amber-200">Vuelto ${money(vuelto)}</p>
                  )}
                  <div className="flex gap-2">
                    <AppButton type="submit" icon={Wallet} disabled={cobrando || guardando}>
                      {cobrando ? 'Cobrando…' : 'Cobrar y liberar'}
                    </AppButton>
                    <AppButton type="button" variant="secondary" onClick={() => setMostrarCobro(false)}>
                      Volver
                    </AppButton>
                  </div>
                </form>
              ) : mostrarDivision ? (
                <form onSubmit={dividirCuenta} className="space-y-3 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3">
                  <p className="text-xs font-semibold text-cyan-100">
                    Cobrá platos de una persona, o dividí en partes iguales. El resto sigue en la mesa.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setPartesIguales(n);
                          setCantidadesParte({});
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                          partesIguales === n ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {n} partes
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPartesIguales(null)}
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                        !partesIguales ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      Por platos
                    </button>
                  </div>
                  <p className="text-sm font-black text-white">
                    {partesIguales
                      ? `Se cobra ${money(estimadoPartes)} de ${money(total)}`
                      : `Se cobra ${money(estimadoPlatos)}`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {metodos.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMetodoPago(m.value)}
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                          metodoPago === m.value ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {metodoPago === 'EFECTIVO' && (
                    <label className="block text-xs font-bold text-slate-400">
                      Abona con
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={montoAbonado}
                        onChange={(e) => setMontoAbonado(e.target.value)}
                        placeholder={String(partesIguales ? estimadoPartes : estimadoPlatos)}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                      />
                    </label>
                  )}
                  <div className="flex gap-2">
                    <AppButton type="submit" icon={Split} disabled={cobrando || guardando}>
                      {cobrando ? 'Cobrando…' : 'Cobrar esta parte'}
                    </AppButton>
                    <AppButton type="button" variant="secondary" onClick={() => setMostrarDivision(false)}>
                      Volver
                    </AppButton>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <AppButton icon={Wallet} onClick={() => { setMostrarDivision(false); setMostrarCobro(true); }} disabled={lineas.length === 0}>
                    {pagado > 0 ? 'Cobrar saldo' : 'Cobrar mesa'}
                  </AppButton>
                  <AppButton variant="secondary" icon={Split} onClick={abrirDivision} disabled={lineas.length === 0}>
                    Dividir
                  </AppButton>
                  <AppButton variant="secondary" onClick={anular} disabled={guardando}>
                    Anular cuenta
                  </AppButton>
                </div>
              )}
              {guardando && <p className="mt-2 text-[11px] font-bold text-slate-500">Guardando en stock…</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

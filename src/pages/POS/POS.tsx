import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { 
  Search, Plus, Minus, Trash2, ShoppingBag, 
  ArrowLeft, Clock, CheckCircle, X, User
} from 'lucide-react';
import apiClient from '../../api/axiosConfig';
import { useTenantFeatures } from '../../hooks/useTenantFeatures';
import {
  MetodoPago,
  calcularTotales,
  discriminaIva,
  getAliasCobro,
  getMetodosPagoHabilitados,
} from '../../utils/tenantConfig';
import { getSufijoUnidad, getUnidadDeProducto } from '../../utils/unidadMedida';
import { imprimirTicket } from '../../utils/ticketTemplate';
import { AppButton } from '../../components/ui/AppButton';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { fieldClass } from '../../components/ui/fieldStyles';
import { PosRestaurante } from './PosRestaurante';

/**
 * POS - Point Of Sale (Modo Zen Redesign)
 */

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  imageUrl?: string;
  cantidadStock: number;
  tipo?: string;
  receta?: any[];
  porcionesEstimadas?: number;
  categoria?: { id: number; nombre: string; unidadMedida?: string };
  codigoBarras?: string;
}

interface CartItem {
  productoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  imageUrl?: string;
  cantidadStock: number;
  codigoBarras?: string;
  unidadMedida: string;
}

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export const POS: React.FC = () => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { isFeatureEnabled, isLoading: featuresLoading } = useTenantFeatures();
  const barcodeEnabled = isFeatureEnabled('POS_BARCODE');
  const esRestaurante = isFeatureEnabled('MESAS');
  
  // SWR: Preferencias y Config
  const { data: globalConfig } = useSWR('/config', fetcher);

  // Estados principales
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // Cambiado a Drawer
  const [showMobileCart, setShowMobileCart] = useState(false);

  const metodosHabilitados = getMetodosPagoHabilitados(globalConfig);
  const aliasCobro = getAliasCobro(globalConfig);
  const clientesHabilitados = globalConfig?.clientesHabilitado ?? true;

  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO');
  const [montoAbonado, setMontoAbonado] = useState<number | ''>('');

  // El método seleccionado siempre tiene que ser uno de los habilitados para el tenant.
  useEffect(() => {
    if (globalConfig && !metodosHabilitados.some((m) => m.value === metodoPago)) {
      setMetodoPago(metodosHabilitados[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalConfig, metodoPago]);

  // Cliente de la venta. null = venta de mostrador (Consumidor Final).
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const { data: clientes } = useSWR(clientesHabilitados ? '/clientes' : null, fetcher);

  const [apiError, setApiError] = useState<string | null>(null);
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false);
  const [successVentaId, setSuccessVentaId] = useState<string | number | null>(null);
  const [vueltoFinal, setVueltoFinal] = useState<number>(0);
  const [currentVentaPrint, setCurrentVentaPrint] = useState<any>(null); // Guardar copia de la venta para imprimir


  // SWR: Estado de la caja
  const { data: cajaEstado, isLoading: isLoadingCaja } = useSWR('/caja/estado', fetcher, {
    refreshInterval: 60000,
  });

  // SWR: Búsqueda de productos
  const { data: productos, isLoading: isLoadingProductos } = useSWR(
    searchTerm.trim() !== '' 
      ? `/productos/buscar?q=${encodeURIComponent(searchTerm)}` 
      : '/productos',
    fetcher
  );

  // Listener para F2 (foco en búsqueda)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cálculos totales (el IVA sale de la configuración del tenant)
  const subtotalNeto = cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  const { ivaPorcentaje, iva: calculoIva, total: totalVenta } = calcularTotales(subtotalNeto, globalConfig);
  const muestraIva = discriminaIva(globalConfig);

  const nombreCliente = (cliente: any): string =>
    `${cliente?.nombre || ''} ${cliente?.apellido || ''}`.trim() || 'Cliente sin nombre';

  const clienteSeleccionado = Array.isArray(clientes)
    ? clientes.find((c: any) => c.id === clienteId) ?? null
    : null;

  const clientesFiltrados = (Array.isArray(clientes) ? clientes : [])
    .filter((c: any) => {
      const termino = clienteSearch.trim().toLowerCase();
      if (termino === '') return true;
      return `${c.nombre || ''} ${c.apellido || ''} ${c.empresa || ''}`.toLowerCase().includes(termino);
    })
    .slice(0, 6);

  const getProductStock = (productoId: number): number => {
    const prod = Array.isArray(productos) ? productos.find((p: any) => p.id === productoId) : null;
    if (prod) return Number(prod.cantidadStock || 0);
    const cartItem = cart.find((i) => i.productoId === productoId);
    return cartItem ? Number(cartItem.cantidadStock || 0) : 0;
  };

  const getCartQuantity = (productoId: number): number => {
    const item = cart.find((i) => i.productoId === productoId);
    return item ? item.cantidad : 0;
  };

  const handleAddProduct = (p: Producto) => {
    const stockDisponible = Number(p.cantidadStock || 0);
    if (getCartQuantity(p.id) >= stockDisponible) {
      setApiError(`No hay stock suficiente para "${p.nombre}". Disponible: ${stockDisponible}.`);
      return;
    }
    setApiError(null);
    setCart((prev) => {
      const existing = prev.find((i) => i.productoId === p.id);
      if (existing) {
        return prev.map((i) =>
          i.productoId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productoId: p.id,
          nombre: p.nombre,
          precio: p.precio,
          cantidad: 1,
          imageUrl: p.imageUrl,
          cantidadStock: stockDisponible,
          codigoBarras: p.codigoBarras,
          unidadMedida: getUnidadDeProducto(p),
        },
      ];
    });
  };

  const handleBarcodeSubmit = async () => {
    if (!barcodeEnabled) return;
    const codigoBarras = searchTerm.trim();
    if (!codigoBarras) return;

    setApiError(null);
    setIsBarcodeLoading(true);
    try {
      const response = await apiClient.get(`/productos/codigo/${encodeURIComponent(codigoBarras)}`);
      handleAddProduct(response.data);
      setSearchTerm('');
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    } catch (err: any) {
      const message = err.response?.status === 404
        ? `No encontramos un producto con codigo ${codigoBarras}.`
        : err.response?.data?.message || 'No pudimos leer el codigo de barras.';
      setApiError(message);
    } finally {
      setIsBarcodeLoading(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!barcodeEnabled || e.key !== 'Enter') return;
    e.preventDefault();
    handleBarcodeSubmit();
  };

  const handleUpdateQuantity = (id: number, qty: number) => {
    if (qty < 1) return;
    const stock = getProductStock(id);
    if (qty > stock) {
      setApiError(`No hay stock suficiente. Disponible: ${stock}.`);
      return;
    }
    setApiError(null);
    setCart((prev) => prev.map((i) => (i.productoId === id ? { ...i, cantidad: qty } : i)));
  };

  const handleRemoveItem = (id: number) => {
    setCart((prev) => prev.filter((i) => i.productoId !== id));
  };

  const handleFinalizarVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const payload = {
      clienteId,
      canal: 'MOSTRADOR',
      items: cart.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
      metodoPago,
      ...(metodoPago === 'EFECTIVO' && { montoAbonado: Number(montoAbonado) }),
    };

    try {
      const response = await apiClient.post('/ventas', payload);

      const calculatedVuelto = metodoPago === 'EFECTIVO' && montoAbonado ? Number(montoAbonado) - totalVenta : 0;
      setVueltoFinal(calculatedVuelto >= 0 ? calculatedVuelto : 0);

      // Armamos objeto local para imprimir con la misma plantilla que el Dashboard
      setCurrentVentaPrint({
         id: response.data?.id || 'VentaId',
         nroComprobante: response.data?.nroComprobante || response.data?.id || 'Id',
         fecha: new Date(),
         cliente: clienteSeleccionado,
         totalNeto: subtotalNeto,
         totalIva: calculoIva,
         totalFinal: totalVenta,
         metodoPago,
         montoAbonado: metodoPago === 'EFECTIVO' ? Number(montoAbonado) : 0,
         items: cart.map(i => ({
            cantidad: i.cantidad,
            precioUnitario: i.precio,
            unidadMedida: i.unidadMedida,
            producto: { nombre: i.nombre }
         }))
      });

      setSuccessVentaId(response.data?.nroComprobante || response.data?.id || 'VentaId');
      setCart([]);
      setIsDrawerOpen(false); // Cerrar drawer al aprobar
      setMontoAbonado('');
      setClienteId(null);
      setClienteSearch('');

    } catch (err: any) {
      const backendMessage = err.response?.data?.message || '';
      setApiError(backendMessage.toLowerCase().includes('stock')
        ? backendMessage
        : backendMessage || 'Error al procesar la venta.');
    }
  };

  const handleImprimir = (venta: any) => imprimirTicket(venta, globalConfig);


  if (featuresLoading) {
    return (
      <div className="tulum-app fixed inset-0 z-[200] flex items-center justify-center bg-tulum-ink text-tulum-muted text-sm">
        <Clock className="mr-2 h-5 w-5 animate-spin text-tulum-accent" />
        Cargando mostrador…
      </div>
    );
  }

  if (!isLoadingCaja && (!cajaEstado || cajaEstado.estado === 'CERRADA')) {
    return (
      <div className="tulum-app fixed inset-0 z-[200] flex flex-col items-center justify-center bg-tulum-ink text-tulum-bone">
        <div className="text-center p-8 bg-tulum-surface rounded-2xl border border-tulum-border max-w-sm">
          <div className="w-14 h-14 mx-auto bg-tulum-warning/15 text-tulum-warning rounded-lg flex items-center justify-center mb-4 border border-tulum-warning/30">
            <Clock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-semibold mb-2 tracking-tight">Turno cerrado</h2>
          <p className="text-tulum-muted text-sm mb-6 leading-relaxed">
            Abrí un turno desde el dashboard para vender. A las 24 horas la caja se cierra sola; si hay que ajustar el efectivo, se hace con un descargo.
          </p>
          <AppButton className="w-full" icon={ArrowLeft} onClick={() => navigate('/dashboard')}>
            Ir al dashboard
          </AppButton>
        </div>
      </div>
    );
  }

  if (esRestaurante) {
    return <PosRestaurante nombreEmpresa={globalConfig?.nombreEmpresa} />;
  }

  return (
    <div className="tulum-app h-screen w-screen flex flex-col md:flex-row bg-tulum-ink font-sans text-tulum-bone overflow-hidden relative">
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-tulum-ink">
        <header className="px-3 py-3 md:px-5 md:py-4 bg-tulum-ink border-b border-tulum-border flex items-center gap-2 md:gap-4 sticky top-0 z-10 flex-shrink-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-2 py-2 md:px-3 border border-tulum-border bg-tulum-elevated rounded-lg hover:bg-tulum-surface text-tulum-bone transition-colors font-semibold text-xs flex items-center gap-1.5 flex-shrink-0"
            title="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver</span>
          </button>
          <div className="hidden sm:block min-w-0 max-w-[10rem] lg:max-w-xs">
            <p className="text-sm font-semibold text-tulum-bone truncate">{globalConfig?.nombreEmpresa || 'Tulum'}</p>
            <p className="text-[11px] text-tulum-muted">Mostrador</p>
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tulum-muted w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={barcodeEnabled ? 'Buscar o escanear código…' : 'Buscar productos…'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={barcodeEnabled ? handleSearchKeyDown : undefined}
              className={`${fieldClass} pl-10 pr-20`}
            />
            {barcodeEnabled && isBarcodeLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wide text-tulum-accent">
                Leyendo
              </span>
            )}
          </div>
          <div className="hidden lg:block rounded-lg border border-tulum-border bg-tulum-surface px-4 py-2 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-tulum-muted">Total</div>
            <div className="text-lg font-bold text-tulum-bone">${totalVenta.toFixed(2)}</div>
          </div>
        </header>

        {apiError && (
          <div className="mx-3 md:mx-5 mt-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <ErrorAlert message={apiError} />
              </div>
              <button type="button" onClick={() => setApiError(null)} className="mt-2 p-1 text-tulum-muted hover:text-tulum-bone">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 md:p-5 min-h-0 pb-24 md:pb-5">
          {isLoadingProductos ? (
            <div className="flex items-center justify-center h-full text-tulum-muted text-sm font-medium">
              <Clock className="w-5 h-5 animate-spin text-tulum-accent mr-2" /> Cargando catálogo…
            </div>
          ) : Array.isArray(productos) && productos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {productos.map((p: Producto) => (
                <button
                  key={p.id}
                  onClick={() => handleAddProduct(p)}
                  disabled={Number(p.cantidadStock || 0) <= 0}
                  className="group flex flex-col bg-tulum-surface border border-tulum-border rounded-2xl overflow-hidden text-left relative focus:outline-none focus:ring-2 focus:ring-tulum-accent/30 disabled:opacity-50"
                >
                  <div className="aspect-square w-full bg-tulum-elevated flex items-center justify-center relative overflow-hidden p-3">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.nombre} className="object-contain w-full h-full" />
                    ) : (
                      <ShoppingBag className="w-10 h-10 text-tulum-muted" />
                    )}
                    {Number(p.cantidadStock || 0) <= 0 && (
                      <div className="absolute inset-0 bg-tulum-ink/80 flex items-center justify-center text-tulum-bone font-semibold text-xs uppercase tracking-wide">
                        Sin stock
                      </div>
                    )}
                    {Number(p.cantidadStock || 0) > 0 && Number(p.cantidadStock || 0) <= 5 && (
                      <span className="absolute left-2 top-2 rounded-full border border-tulum-warning/30 bg-tulum-warning/15 px-2 py-0.5 text-[10px] font-semibold text-tulum-warning">
                        Bajo stock
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 md:p-3 w-full border-t border-tulum-border">
                    <h4 className="font-semibold text-xs md:text-sm text-tulum-bone line-clamp-1 mb-0.5">{p.nombre}</h4>
                    {barcodeEnabled && p.codigoBarras && (
                      <p className="mb-1 truncate font-mono text-[10px] font-medium text-tulum-muted">{p.codigoBarras}</p>
                    )}
                    <p className="text-tulum-accent font-bold text-sm md:text-base">
                      ${Number(p.precio).toFixed(2)}
                      <span className="ml-1 text-[10px] font-medium text-tulum-muted">/ {getSufijoUnidad(getUnidadDeProducto(p))}</span>
                    </p>
                    <p className={`text-[10px] font-medium mt-1 ${Number(p.cantidadStock || 0) <= 5 ? 'text-tulum-danger' : 'text-tulum-muted'}`}>
                      Stock: {p.cantidadStock} {getSufijoUnidad(getUnidadDeProducto(p))}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-tulum-muted">
              <ShoppingBag className="mb-3 h-10 w-10" />
              <div className="font-semibold text-tulum-bone">No encontramos productos</div>
              <div className="mt-1 text-sm font-medium">Probá con otra búsqueda o revisá el catálogo.</div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setShowMobileCart(true)}
        className="md:hidden fixed bottom-6 right-6 z-30 w-14 h-14 bg-tulum-accent text-white rounded-full flex items-center justify-center"
        aria-label="Ver cuenta"
      >
        <ShoppingBag className="w-6 h-6" />
        {cart.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-tulum-danger text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
            {cart.length}
          </span>
        )}
      </button>

      {showMobileCart && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setShowMobileCart(false)}
        />
      )}

      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 flex flex-col h-full bg-tulum-surface border-l border-tulum-border flex-shrink-0 transition-transform duration-300 md:static md:w-96 md:translate-x-0 md:z-20 ${showMobileCart ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="px-5 py-4 border-b border-tulum-border flex items-center gap-2">
          <button
            onClick={() => setShowMobileCart(false)}
            className="md:hidden p-1.5 -ml-1 mr-1 text-tulum-muted hover:text-tulum-bone hover:bg-tulum-elevated rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
          <ShoppingBag className="w-5 h-5 text-tulum-accent" />
          <h3 className="font-semibold text-base text-tulum-bone tracking-tight">Cuenta</h3>
          <span className="text-xs font-semibold text-tulum-muted px-2 py-1 rounded-full ml-auto border border-tulum-border">
            {cart.length} ítems
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-tulum-muted text-sm">
              <ShoppingBag className="w-8 h-8 mb-2" /> Vacío
            </div>
          ) : (
            cart.map((i) => (
              <div key={i.productoId} className="flex gap-3 bg-tulum-elevated border border-tulum-border rounded-xl p-3 items-center group">
                {i.imageUrl ? (
                  <img src={i.imageUrl} alt={i.nombre} className="w-12 h-12 object-contain rounded-lg flex-shrink-0 bg-tulum-ink p-1 border border-tulum-border" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-tulum-ink flex items-center justify-center text-tulum-muted border border-tulum-border">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-tulum-bone text-sm line-clamp-1">{i.nombre}</h4>
                  <p className="text-xs font-semibold text-tulum-accent">${i.precio.toFixed(2)} / {getSufijoUnidad(i.unidadMedida)}</p>
                  <p className={`text-[10px] font-medium ${getProductStock(i.productoId) <= 5 ? 'text-tulum-danger' : 'text-tulum-muted'}`}>
                    Stock: {getProductStock(i.productoId)} {getSufijoUnidad(i.unidadMedida)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button type="button" onClick={() => handleUpdateQuantity(i.productoId, i.cantidad - 1)} className="p-1 border border-tulum-border bg-tulum-surface rounded text-tulum-bone hover:bg-tulum-ink">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-xs text-tulum-bone w-4 text-center">{i.cantidad}</span>
                    <button type="button" onClick={() => handleUpdateQuantity(i.productoId, i.cantidad + 1)} disabled={i.cantidad >= getProductStock(i.productoId)} className="p-1 border border-tulum-border bg-tulum-surface rounded text-tulum-bone hover:bg-tulum-ink disabled:opacity-30">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <button type="button" onClick={() => handleRemoveItem(i.productoId)} className="text-tulum-muted hover:text-tulum-danger p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-5 border-t border-tulum-border bg-tulum-ink space-y-4 flex-shrink-0">
          <div className="space-y-1">
            {muestraIva && (
              <div className="flex justify-between text-xs text-tulum-muted font-medium">
                <span>Neto</span>
                <span className="text-tulum-bone">${subtotalNeto.toFixed(2)}</span>
              </div>
            )}
            {muestraIva && (
              <div className="flex justify-between text-xs text-tulum-muted font-medium border-b border-tulum-border pb-1.5">
                <span>IVA ({ivaPorcentaje}%)</span>
                <span className="text-tulum-bone">${calculoIva.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2">
              <span className="text-xs font-semibold text-tulum-muted uppercase tracking-wide">Total</span>
              <span className="text-3xl font-bold text-tulum-bone tracking-tight">
                ${totalVenta.toFixed(2)}
              </span>
            </div>
          </div>

          <AppButton
            className="w-full py-4 text-base"
            disabled={cart.length === 0}
            onClick={() => { setIsDrawerOpen(true); setShowMobileCart(false); }}
          >
            Cobrar
          </AppButton>
        </div>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-[150] bg-tulum-ink/70 flex justify-end">
          <div className="bg-tulum-surface h-full w-full max-w-full sm:max-w-md p-6 sm:p-8 flex flex-col relative overflow-y-auto border-l border-tulum-border">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="absolute top-6 right-6 text-tulum-muted hover:text-tulum-bone p-1 rounded-lg hover:bg-tulum-elevated">
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-xl font-semibold text-tulum-bone mb-6 tracking-tight border-b pb-4 border-tulum-border">Cobro</h3>

            {apiError && <div className="mb-4"><ErrorAlert message={apiError} /></div>}

            <form onSubmit={handleFinalizarVenta} className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                {clientesHabilitados && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-tulum-muted">Cliente</label>
                    {clienteSeleccionado ? (
                      <div className="flex items-center gap-3 p-3 border border-tulum-accent/40 bg-tulum-accent/10 rounded-xl">
                        <div className="w-9 h-9 rounded-lg bg-tulum-elevated text-tulum-accent flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-tulum-bone truncate">{nombreCliente(clienteSeleccionado)}</div>
                          {clienteSeleccionado.empresa && (
                            <div className="text-xs font-medium text-tulum-muted truncate">{clienteSeleccionado.empresa}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setClienteId(null)}
                          className="px-3 py-1.5 text-xs font-semibold text-tulum-muted border border-tulum-border rounded-lg hover:text-tulum-bone hover:bg-tulum-elevated"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tulum-muted" />
                          <input
                            type="text"
                            value={clienteSearch}
                            onChange={(e) => setClienteSearch(e.target.value)}
                            placeholder="Buscar cliente…"
                            className={`${fieldClass} pl-9`}
                          />
                        </div>
                        {clienteSearch.trim() !== '' && (
                          <div className="max-h-40 overflow-y-auto rounded-xl border border-tulum-border divide-y divide-tulum-border">
                            {clientesFiltrados.length > 0 ? clientesFiltrados.map((c: any) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => { setClienteId(c.id); setClienteSearch(''); }}
                                className="w-full px-3 py-2.5 text-left hover:bg-tulum-elevated"
                              >
                                <div className="text-sm font-semibold text-tulum-bone">{nombreCliente(c)}</div>
                                {c.empresa && <div className="text-xs font-medium text-tulum-muted">{c.empresa}</div>}
                              </button>
                            )) : (
                              <div className="px-3 py-3 text-xs font-medium text-tulum-muted">Sin resultados.</div>
                            )}
                          </div>
                        )}
                        <p className="text-xs font-medium text-tulum-muted">
                          Sin cliente, se registra como Consumidor Final.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <label className="block text-xs font-semibold text-tulum-muted">Método de pago</label>
                <div className={`grid ${metodosHabilitados.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                  {metodosHabilitados.map((metodo) => (
                    <label
                      key={metodo.value}
                      className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer text-center ${
                        metodoPago === metodo.value
                          ? 'border-tulum-accent bg-tulum-accent/15 text-tulum-bone font-semibold'
                          : 'border-tulum-border text-tulum-muted bg-tulum-elevated'
                      }`}
                    >
                      <input
                        type="radio"
                        value={metodo.value}
                        checked={metodoPago === metodo.value}
                        onChange={() => setMetodoPago(metodo.value)}
                        className="sr-only"
                      />
                      <span className="text-xs font-semibold">{metodo.label}</span>
                    </label>
                  ))}
                </div>

                {metodoPago === 'TRANSFERENCIA' && aliasCobro && (
                  <div className="p-4 bg-tulum-elevated border border-tulum-border rounded-xl text-center">
                    <div className="text-xs font-semibold text-tulum-muted uppercase tracking-wide">Alias</div>
                    <div className="mt-1 text-lg font-bold text-tulum-bone font-mono break-all">{aliasCobro}</div>
                  </div>
                )}

                {metodoPago === 'EFECTIVO' && (
                  <div className="bg-tulum-ink p-5 rounded-2xl text-tulum-bone space-y-4 border border-tulum-border">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-tulum-muted uppercase tracking-wide">Paga con</label>
                      <div className="relative">
                        <span className="absolute left-0 top-1 text-3xl font-bold text-tulum-muted">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min={totalVenta}
                          required
                          placeholder="0.00"
                          value={montoAbonado}
                          onChange={(e) => setMontoAbonado(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full pl-8 py-2 bg-transparent outline-none border-b border-tulum-border focus:border-tulum-accent text-4xl font-bold text-tulum-bone"
                        />
                      </div>
                    </div>

                    {montoAbonado !== '' && Number(montoAbonado) >= totalVenta && (
                      <div className="border-t border-tulum-border pt-4 flex justify-between items-center">
                        <span className="text-xs font-semibold text-tulum-muted uppercase">Vuelto</span>
                        <span className="text-tulum-warning font-bold text-4xl tracking-tight">${(Number(montoAbonado) - totalVenta).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4 border-t border-tulum-border pt-6">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs font-semibold text-tulum-muted uppercase tracking-wide">Total</span>
                  <div className="text-3xl font-bold text-tulum-bone tracking-tight">${totalVenta.toFixed(2)}</div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-4 py-3 font-semibold text-tulum-muted hover:text-tulum-bone text-sm">
                    Cancelar
                  </button>
                  <AppButton type="submit" className="flex-1 py-4 text-base">
                    Confirmar
                  </AppButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {successVentaId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-tulum-ink/70">
          <div className="bg-tulum-surface border border-tulum-border rounded-2xl w-full max-w-sm mx-4 p-6 text-center">
            <div className="w-14 h-14 mx-auto bg-tulum-success/15 text-tulum-success rounded-lg flex items-center justify-center mb-4 border border-tulum-success/30">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-semibold text-tulum-bone tracking-tight">Venta hecha</h3>

            {vueltoFinal > 0 && (
              <div className="mt-3 bg-tulum-ink p-5 rounded-xl text-center border border-tulum-border">
                <p className="text-3xl font-bold text-tulum-warning tracking-tight">${vueltoFinal.toFixed(2)}</p>
                <p className="text-[10px] font-semibold text-tulum-muted uppercase tracking-wide mt-1">Vuelto</p>
              </div>
            )}

            <p className="text-tulum-muted text-xs mt-3 mb-6 font-medium">
              Comprobante <span className="font-semibold text-tulum-accent">#{successVentaId}</span>
            </p>

            <div className="space-y-2">
              <AppButton className="w-full" onClick={() => handleImprimir(currentVentaPrint)}>
                Imprimir ticket
              </AppButton>
              <AppButton
                variant="secondary"
                className="w-full"
                onClick={() => { setSuccessVentaId(null); setVueltoFinal(0); }}
              >
                Continuar
              </AppButton>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

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

/**
 * POS - Point Of Sale (Modo Zen Redesign)
 */

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  imageUrl?: string;
  cantidadStock: number;
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
  const { isFeatureEnabled } = useTenantFeatures();
  const barcodeEnabled = isFeatureEnabled('POS_BARCODE');
  
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


  // Overlay de validación de Caja Cerrada
  if (!isLoadingCaja && (!cajaEstado || cajaEstado.estado === 'CERRADA')) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900 text-white backdrop-blur-md">
        <div className="text-center p-8 bg-white/5 rounded-3xl border border-white/10 shadow-2xl max-w-sm animate-in zoom-in-95 duration-300">
           <div className="w-16 h-16 mx-auto bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mb-4 border border-amber-500/30">
             <Clock className="w-8 h-8" />
           </div>
           <h2 className="text-xl font-black mb-2 tracking-tight">Turno Cerrado</h2>
           <p className="text-slate-400 text-sm mb-6 leading-relaxed">
             Abrí un turno desde el Dashboard para vender. A las 24 horas la caja se cierra sola; si hay que ajustar el efectivo, se hace con un descargo.
           </p>
           <button 
             onClick={() => navigate('/dashboard')}
             className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
           >
             <ArrowLeft className="w-4 h-4" /> Ir al Dashboard
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tulum-dark h-screen w-screen flex flex-col md:flex-row bg-slate-950 font-sans text-slate-100 overflow-hidden relative">
      
      {/* Lado Izquierdo: Buscador + Grilla (Modo Zen) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
         <header className="px-3 py-3 md:px-6 md:py-5 bg-slate-950 text-white border-b border-slate-800 flex items-center gap-2 md:gap-4 sticky top-0 z-10 flex-shrink-0 shadow-xl shadow-slate-300/30">
           <button 
             onClick={() => navigate('/dashboard')}
             className="px-2 py-2 md:px-3 bg-white/10 border border-white/10 rounded-xl hover:bg-white hover:text-slate-900 text-slate-200 transition-all font-bold text-xs flex items-center gap-1 md:gap-1.5 shadow-sm flex-shrink-0"
             title="Volver"
           >
             <ArrowLeft className="w-4 h-4" />
             <span className="hidden sm:inline">Dashboard</span>
           </button>

           <div className="flex-1 relative">
              <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder={barcodeEnabled ? 'Buscar o escanear codigo de barras...' : 'Buscar productos...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={barcodeEnabled ? handleSearchKeyDown : undefined}
                className="w-full pl-10 md:pl-12 pr-20 py-2.5 md:py-3.5 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all text-sm font-bold bg-slate-50 focus:bg-white shadow-inner"
              />
              {barcodeEnabled && isBarcodeLoading && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-blue-500">
                  Leyendo
                </span>
              )}
           </div>
           <div className="hidden lg:block rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-right">
             <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total actual</div>
             <div className="text-lg font-black text-white">${totalVenta.toFixed(2)}</div>
           </div>
         </header>

          {apiError && (
            <div className="mx-3 md:mx-6 mt-3 md:mt-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
              <span className="flex-1">{apiError}</span>
              <button onClick={() => setApiError(null)} className="text-red-400 hover:text-red-600 p-1"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Grid de Productos Scrollable */}
          <div className="flex-1 overflow-y-auto p-3 md:p-6 min-h-0 pb-24 md:pb-6">
           {isLoadingProductos ? (
              <div className="flex items-center justify-center h-full text-slate-400/80 text-sm font-medium animate-pulse">
                 <Clock className="w-5 h-5 animate-spin text-blue-500 mr-2" /> Cargando catálogo...
              </div>
           ) : Array.isArray(productos) && productos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                 {productos.map((p: Producto) => (
                    <button
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      disabled={p.cantidadStock <= 0}
                      className="group flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm shadow-slate-200/70 hover:shadow-2xl hover:shadow-blue-100 hover:-translate-y-1 transition-all duration-300 text-left relative focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
                    >
                      <div className="aspect-square w-full bg-gradient-to-br from-slate-100 to-white flex items-center justify-center relative overflow-hidden p-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.nombre} className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <ShoppingBag className="w-12 h-12 text-slate-300" />
                        )}
                        {p.cantidadStock <= 0 && (
                          <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center text-white font-black text-xs uppercase tracking-widest">Sin stock</div>
                        )}
                        {p.cantidadStock > 0 && p.cantidadStock <= 5 && (
                          <span className="absolute left-3 top-3 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">Bajo stock</span>
                        )}
                      </div>

                      <div className="p-2.5 md:p-4 bg-white w-full border-t border-slate-100">
                          <h4 className="font-bold text-xs md:text-sm text-slate-800 line-clamp-1 mb-0.5 md:mb-1 group-hover:text-blue-600 transition-colors">{p.nombre}</h4>
                          {barcodeEnabled && p.codigoBarras && (
                            <p className="mb-1 truncate font-mono text-[10px] font-bold text-slate-400">{p.codigoBarras}</p>
                          )}
                          <p className="text-blue-600 font-extrabold text-sm md:text-base">
                            ${Number(p.precio).toFixed(2)}
                            <span className="ml-1 text-[10px] font-bold text-slate-400">/ {getSufijoUnidad(getUnidadDeProducto(p))}</span>
                          </p>
                          <p className={`text-[10px] font-bold mt-1 ${p.cantidadStock <= 5 ? 'text-red-500' : 'text-slate-400'}`}>Stock: {p.cantidadStock} {getSufijoUnidad(getUnidadDeProducto(p))}</p>
                      </div>
                    </button>
                 ))}
              </div>
           ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                 <ShoppingBag className="mb-3 h-12 w-12 text-slate-200" />
                 <div className="font-bold text-slate-600">No encontramos productos</div>
                 <div className="mt-1 text-sm font-medium">Proba con otra busqueda o revisa el catalogo.</div>
              </div>
           )}
         </div>
      </div>

      {/* Floating Cart Button (mobile only) */}
      <button
        onClick={() => setShowMobileCart(true)}
        className="md:hidden fixed bottom-6 right-6 z-30 w-16 h-16 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center active:scale-95 transition-transform"
      >
        <ShoppingBag className="w-7 h-7" />
        {cart.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center shadow-lg">
            {cart.length}
          </span>
        )}
      </button>

      {/* Mobile Cart Backdrop */}
      {showMobileCart && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowMobileCart(false)}
        />
      )}

      {/* Lado Derecho: Carrito de Compras (Fixed Sticky Panel) */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 flex flex-col h-full bg-white border-l border-slate-200 flex-shrink-0 shadow-2xl shadow-slate-300 transition-transform duration-300 md:static md:w-96 md:translate-x-0 md:z-20 ${showMobileCart ? 'translate-x-0' : 'translate-x-full'}`}>
         <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center gap-2">
            {/* Close button (mobile only) */}
            <button
              onClick={() => setShowMobileCart(false)}
              className="md:hidden p-1.5 -ml-2 mr-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <ShoppingBag className="w-5 h-5 text-blue-600 font-bold" />
            <h3 className="font-black text-base text-slate-900 tracking-tight">Orden Actual</h3>
            <span className="text-xs bg-blue-50 font-black text-blue-700 px-2.5 py-1 rounded-full ml-auto">
               {cart.length} ítems
            </span>
         </div>

         {/* Cart Items List */}
         <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
            {cart.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-400/80 italic text-sm">
                  <ShoppingBag className="w-10 h-10 text-slate-100 mb-2" /> Carrito Vacío
               </div>
            ) : (
               cart.map((i) => (
                  <div key={i.productoId} className="flex gap-3 bg-white border border-slate-200 rounded-2xl p-3 items-center group shadow-sm shadow-slate-200/60">
                     {i.imageUrl ? (
                        <img src={i.imageUrl} alt={i.nombre} className="w-12 h-12 object-contain rounded-xl flex-shrink-0 bg-white p-1 border" />
                     ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border">
                           <ShoppingBag className="w-5 h-5" />
                        </div>
                     )}
                      <div className="flex-1 min-w-0">
                         <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{i.nombre}</h4>
                         <p className="text-xs font-black text-blue-600">${i.precio.toFixed(2)} / {getSufijoUnidad(i.unidadMedida)}</p>
                         <p className={`text-[10px] font-bold ${getProductStock(i.productoId) <= 5 ? 'text-red-400' : 'text-slate-400'}`}>Stock disp: {getProductStock(i.productoId)} {getSufijoUnidad(i.unidadMedida)}</p>
                         
                         <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => handleUpdateQuantity(i.productoId, i.cantidad - 1)} className="p-1 border bg-white border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="font-black text-xs text-slate-800 w-4 text-center">{i.cantidad}</span>
                            <button onClick={() => handleUpdateQuantity(i.productoId, i.cantidad + 1)} disabled={i.cantidad >= getProductStock(i.productoId)} className="p-1 border bg-white border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"><Plus className="w-3.5 h-3.5" /></button>
                         </div>
                      </div>
                     <button onClick={() => handleRemoveItem(i.productoId)} className="text-slate-400 hover:text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
               ))
            )}
         </div>

         {/* Bottom Resumen y Acción */}
         <div className="p-6 border-t border-slate-100 bg-slate-950 text-white space-y-4 flex-shrink-0">
            <div className="space-y-1">
               {muestraIva && (
                 <div className="flex justify-between text-xs text-slate-400 font-bold">
                    <span>Neto:</span>
                    <span className="text-slate-200">${subtotalNeto.toFixed(2)}</span>
                 </div>
               )}
               {muestraIva && (
                 <div className="flex justify-between text-xs text-slate-400 font-bold border-b border-slate-800 pb-1.5">
                    <span>IVA ({ivaPorcentaje}%):</span>
                    <span className="text-slate-200">${calculoIva.toFixed(2)}</span>
                 </div>
               )}
               <div className="flex justify-between items-baseline pt-2">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Operación</span>
                  <span className="text-3xl font-black text-white tracking-tighter">
                     ${totalVenta.toFixed(2)}
                  </span>
               </div>
            </div>

            <button 
              onClick={() => { setIsDrawerOpen(true); setShowMobileCart(false); }}
              disabled={cart.length === 0}
              className="w-full py-4 text-base font-black text-slate-950 bg-white rounded-2xl shadow-lg shadow-white/10 hover:bg-blue-50 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 active:translate-y-0.5"
            >
               Finalizar Venta
            </button>
         </div>
      </div>

      {/* Drawer Cierre Venta UX */}
      {isDrawerOpen && (
         <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 flex justify-end">
            <div className="bg-white h-full w-full max-w-full sm:max-w-md p-6 sm:p-8 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 relative overflow-y-auto">
               
               <button onClick={() => setIsDrawerOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all">
                  <X className="w-6 h-6" />
               </button>

               <h3 className="text-2xl font-black text-slate-800 mb-8 tracking-tight border-b pb-4 border-slate-100">Cierre de Operación</h3>
               
               {apiError && <div className="p-3 mb-4 text-xs font-bold bg-red-50 text-red-600 border border-red-100 rounded-xl">{apiError}</div>}

               <form onSubmit={handleFinalizarVenta} className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-6">
                     {clientesHabilitados && (
                       <div className="space-y-2">
                         <label className="block text-sm font-black text-slate-700 uppercase tracking-wide">Cliente</label>
                         {clienteSeleccionado ? (
                           <div className="flex items-center gap-3 p-3 border-2 border-indigo-200 bg-indigo-50/50 rounded-2xl">
                             <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                               <User className="w-4 h-4" />
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="font-bold text-sm text-slate-800 truncate">{nombreCliente(clienteSeleccionado)}</div>
                               {clienteSeleccionado.empresa && (
                                 <div className="text-xs font-semibold text-slate-500 truncate">{clienteSeleccionado.empresa}</div>
                               )}
                             </div>
                             <button
                               type="button"
                               onClick={() => setClienteId(null)}
                               className="px-3 py-1.5 text-xs font-black text-slate-500 bg-white border border-slate-200 rounded-lg hover:text-slate-800 hover:bg-slate-50 transition-colors"
                             >
                               Quitar
                             </button>
                           </div>
                         ) : (
                           <div className="space-y-2">
                             <div className="relative">
                               <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                               <input
                                 type="text"
                                 value={clienteSearch}
                                 onChange={(e) => setClienteSearch(e.target.value)}
                                 placeholder="Buscar cliente por nombre o empresa..."
                                 className="w-full pl-9 pr-4 py-2.5 text-sm font-bold text-slate-700 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-400 focus:bg-white transition-all"
                               />
                             </div>
                             {clienteSearch.trim() !== '' && (
                               <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
                                 {clientesFiltrados.length > 0 ? clientesFiltrados.map((c: any) => (
                                   <button
                                     key={c.id}
                                     type="button"
                                     onClick={() => { setClienteId(c.id); setClienteSearch(''); }}
                                     className="w-full px-3 py-2.5 text-left hover:bg-indigo-50 transition-colors"
                                   >
                                     <div className="text-sm font-bold text-slate-700">{nombreCliente(c)}</div>
                                     {c.empresa && <div className="text-xs font-semibold text-slate-400">{c.empresa}</div>}
                                   </button>
                                 )) : (
                                   <div className="px-3 py-3 text-xs font-bold text-slate-400 italic">Sin resultados.</div>
                                 )}
                               </div>
                             )}
                             <p className="text-xs font-bold text-slate-400">
                               Sin cliente seleccionado la venta se registra como Consumidor Final.
                             </p>
                           </div>
                         )}
                       </div>
                     )}

                     <label className="block text-sm font-black text-slate-700 uppercase tracking-wide">Método de Pago</label>
                      <div className={`grid ${metodosHabilitados.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                         {metodosHabilitados.map((metodo) => (
                           <label
                             key={metodo.value}
                             className={`flex flex-col items-center justify-center p-5 border-2 rounded-2xl cursor-pointer transition-all text-center ${
                               metodoPago === metodo.value
                                 ? 'border-indigo-500 bg-indigo-50/30 text-indigo-800 font-bold shadow-md'
                                 : 'border-slate-100 hover:border-slate-200 text-slate-500 bg-slate-50'
                             }`}
                           >
                             <input
                               type="radio"
                               value={metodo.value}
                               checked={metodoPago === metodo.value}
                               onChange={() => setMetodoPago(metodo.value)}
                               className="sr-only"
                             />
                             <span className="text-xs font-bold">{metodo.label}</span>
                           </label>
                         ))}
                      </div>

                     {metodoPago === 'TRANSFERENCIA' && aliasCobro && (
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-center">
                           <div className="text-xs font-black text-blue-700 uppercase tracking-widest">Alias para transferencias</div>
                           <div className="mt-1 text-lg font-black text-blue-900 font-mono break-all">{aliasCobro}</div>
                        </div>
                     )}

                     {metodoPago === 'EFECTIVO' && (
                        <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4 shadow-xl">
                           <div className="space-y-2">
                              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Paga con:</label>
                              <div className="relative">
                                 <span className="absolute left-0 top-1 text-3xl font-black text-slate-500">$</span>
                                 <input 
                                   type="number" 
                                   step="0.01" 
                                   min={totalVenta} 
                                   required 
                                   placeholder="0.00"
                                   value={montoAbonado}
                                   onChange={(e) => setMontoAbonado(e.target.value === '' ? '' : Number(e.target.value))}
                                   className="w-full pl-8 py-2 bg-transparent outline-none border-b-2 border-slate-700 focus:border-yellow-400 text-4xl font-black text-white transition-colors"
                                 />
                              </div>
                           </div>

                           {montoAbonado !== '' && Number(montoAbonado) >= totalVenta && (
                              <div className="border-t border-slate-800 pt-4 flex justify-between items-center">
                                 <span className="text-xs font-bold text-slate-400 uppercase">Vuelto a entregar:</span>
                                 <span className="text-yellow-400 font-black text-4xl tracking-tighter">${(Number(montoAbonado) - totalVenta).toFixed(2)}</span>
                              </div>
                           )}
                        </div>
                     )}
                  </div>

                  <div className="space-y-4 border-t border-slate-100 pt-6">
                     <div className="flex justify-between items-baseline mb-4">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Operación</span>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">${totalVenta.toFixed(2)}</div>
                     </div>

                     <div className="flex gap-3">
                        <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-4 py-4 font-bold text-slate-400 hover:text-slate-600 text-sm">Cancelar</button>
                        <button type="submit" className={`flex-1 py-4 text-base font-black text-white rounded-2xl shadow-lg transition-all ${metodoPago === 'EFECTIVO' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                           Procesar Orden
                        </button>
                     </div>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* Modal Éxito Venta */}
      {successVentaId && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-sm mx-4 sm:mx-0 p-6 text-center animate-in zoom-in-95 duration-200 shadow-2xl relative">
               <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <CheckCircle className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-black text-slate-800 tracking-tight">Venta Completada</h3>
               
               {vueltoFinal > 0 && (
                  <div className="mt-2 bg-slate-900 p-5 rounded-2xl text-center shadow-lg">
                     <p className="text-3xl font-black text-yellow-400 tracking-tighter">${vueltoFinal.toFixed(2)}</p>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">💰 Vuelto a Entregar</p>
                  </div>
               )}

               <p className="text-slate-500 text-xs mt-3 mb-6 font-medium">Comprobante asignado: <span className="font-bold text-blue-600">#{successVentaId}</span></p>

               <div className="space-y-2">
                  <button 
                     onClick={() => handleImprimir(currentVentaPrint)} 
                     className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
                  >
                     Imprimir Ticket
                  </button>


                  <button onClick={() => { setSuccessVentaId(null); setVueltoFinal(0); }} className="w-full py-3 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                     Continuar
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

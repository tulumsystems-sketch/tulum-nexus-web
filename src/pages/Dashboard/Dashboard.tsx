import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import {
  AlertTriangle,
  Building2,
  DollarSign,
  ExternalLink,
  Eye,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Search,
  PanelLeft,
  PanelLeftClose,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import apiClient from '../../api/axiosConfig';
import { CreateCategoryForm } from './components/CreateCategoryForm';
import { CreateProductForm } from './components/CreateProductForm';
import { CreateClientForm } from './components/CreateClientForm';
import { SettingsTab } from './components/SettingsTab';
import { PedidosTab } from './components/PedidosTab';
import { MesasTab } from './components/MesasTab';
import { RestauranteDashboardHome } from './components/RestauranteDashboardHome';
import { VentasChart } from './components/VentasChart';
import { UsuariosTab } from './components/UsuariosTab';
import { RemitosTab } from './components/RemitosTab';
import { AlertasStock } from './components/AlertasStock';
import { ProveedoresTab } from './components/ProveedoresTab';
import { ComprasTab } from './components/ComprasTab';
import { MovimientosStockTab } from './components/MovimientosStockTab';
import { StockLogisticaTab } from './components/StockLogisticaTab';
import { AuditoriaTab } from './components/AuditoriaTab';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { AppButton } from '../../components/ui/AppButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { StatusPill } from '../../components/ui/StatusPill';
import { DashboardSidebar } from './components/DashboardSidebar';
import type { TabType } from './tabTypes';
import { clearTenantFeaturesCache, useTenantFeatures } from '../../hooks/useTenantFeatures';
import { clearSession } from '../../utils/session';
import {
  getMetodoPagoLabelCorto,
  getMetodosPagoHabilitados,
  puedeCobrarConMercadoPago,
} from '../../utils/tenantConfig';
import {
  esInsumo,
  esVendible,
  etiquetaStockProducto,
  getSufijoUnidad,
  stockCarta,
  tieneReceta,
} from '../../utils/unidadMedida';
import { imprimirTicket } from '../../utils/ticketTemplate';



// Fetcher usando nuestro cliente Axios
const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export const Dashboard: React.FC = () => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const rol = localStorage.getItem('rol');
  const esAdmin = rol === 'ADMIN';
  const isOperador = rol === 'OPERADOR';
  // El preventista toma pedidos y remitos en la calle: no cobra en el mostrador.
  const esPreventista = rol === 'PREVENTISTA';
  const puedeUsarPOS = !esPreventista;
  const { isFeatureEnabled } = useTenantFeatures();
  const mesasHabilitado = isFeatureEnabled('MESAS');

  const [activeTab, setActiveTab] = useState<TabType>(isOperador ? 'products' : esPreventista ? 'remitos' : 'dashboard');
  const restaurantDefaultApplied = React.useRef(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [montoInicial, setMontoInicial] = useState<number | ''>('');
  const [isOpeningCaja, setIsOpeningCaja] = useState(false);
  const [isAperturaModalOpen, setIsAperturaModalOpen] = useState(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [isHistorialCajasOpen, setIsHistorialCajasOpen] = useState(false);
  const [montoCierre, setMontoCierre] = useState<number | ''>('');
  const [isClosingCaja, setIsClosingCaja] = useState(false);
  const [descargoMonto, setDescargoMonto] = useState<Record<number, string>>({});
  const [descargoMotivo, setDescargoMotivo] = useState<Record<number, string>>({});
  const [guardandoDescargoId, setGuardandoDescargoId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = sessionStorage.getItem('tulum-nav');
    if (saved === '0') return false;
    if (saved === '1') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [showProductForm, setShowProductForm] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  // SWR Asíncrono puro - Solo disparar si hay token para evitar loops de 401/403
  const { data: categorias, error: errorCategorias, isLoading: isLoadingCategorias, mutate: mutateCategorias } = useSWR(token && !esPreventista ? '/categorias' : null, fetcher);
  const { data: productos, error: errorProductos, isLoading: isLoadingProductos, mutate: mutateProductos } = useSWR(token ? '/productos' : null, fetcher);
  const { data: clientes, error: errorClientes, isLoading: isLoadingClientes, mutate: mutateClientes } = useSWR(token ? '/clientes' : null, fetcher);
  const { data: ventasTotales, mutate: mutateVentasTotales } = useSWR(token && !esPreventista ? '/ventas/stats/totales' : null, fetcher);
  const { data: ventasRecientes, mutate: mutateVentasRecientes } = useSWR(token && !esPreventista ? '/ventas/search?page=0&size=15&sort=fecha,desc' : null, fetcher);
  
  // Configuración Global y Preferencias
  const { data: globalConfig } = useSWR(token ? '/config' : null, fetcher, {
    revalidateOnFocus: false,
  });
  const mpHabilitado = puedeCobrarConMercadoPago(globalConfig);
  const metodosHabilitados = getMetodosPagoHabilitados(globalConfig);
  
  // Filtros Pestaña de Ventas
  const [filterDesde, setFilterDesde] = useState('');
  const [filterHasta, setFilterHasta] = useState('');
  const [filterMetodoPago, setFilterMetodoPago] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [page, setPage] = useState(0);

  const { data: ventasPaginadas, mutate: mutateVentasPaginadas } = useSWR(
    token && !esPreventista ? `/ventas/search?page=${page}&size=10&desde=${filterDesde}&hasta=${filterHasta}&metodoPago=${filterMetodoPago}&estado=${filterEstado}&sort=fecha,desc` : null,
    fetcher
  );
  const { data: ventasCliente } = useSWR(
    selectedClient ? `/ventas/search?clienteId=${selectedClient.id}&size=50&sort=fecha,desc` : null,
    fetcher
  );

  // Estado de la Caja
  const [caja, setCaja] = useState<any>(null);
  const [isLoadingCaja, setIsLoadingCaja] = useState(true);

  useEffect(() => {
    if (!token || esPreventista) {
      setCaja(null);
      setIsLoadingCaja(false);
      return;
    }
    const cargarCaja = () =>
      apiClient.get('/caja/estado')
        .then(res => setCaja(res.data))
        .catch(err => {
          console.error("Error obteniendo estado de caja:", err);
          setCaja(null);
        })
        .finally(() => setIsLoadingCaja(false));

    cargarCaja();
    const timer = window.setInterval(cargarCaja, 60000);
    return () => window.clearInterval(timer);
  }, [token, esPreventista]);

  useEffect(() => {
    sessionStorage.setItem('tulum-nav', sidebarOpen ? '1' : '0');
  }, [sidebarOpen]);
  const esRestaurante = mesasHabilitado;

  useEffect(() => {
    if (esPreventista && globalConfig && globalConfig.remitosHabilitado === false) {
      setActiveTab((tab) => (tab === 'remitos' ? 'products' : tab));
    }
  }, [esPreventista, globalConfig]);

  useEffect(() => {
    if (!esRestaurante || esPreventista) return;
    const destino: TabType = 'mesas';
    if (!restaurantDefaultApplied.current) {
      restaurantDefaultApplied.current = true;
      setActiveTab(destino);
      return;
    }
    const ocultas: TabType[] = [
      'proveedores',
      'compras',
      'auditoria',
    ];
    if (!(globalConfig?.clientesHabilitado ?? false)) ocultas.push('clients');
    if (!(globalConfig?.remitosHabilitado ?? false)) ocultas.push('remitos');
    setActiveTab((tab) => (ocultas.includes(tab) ? destino : tab));
  }, [esRestaurante, esPreventista, globalConfig]);

  // Historial de Cierres de Caja (solo carga cuando el modal está abierto)
  const { data: historialCajas, mutate: mutateHistorialCajas } = useSWR(
    isHistorialCajasOpen ? '/caja/historial' : null,
    fetcher
  );

  // Verificación de seguridad ANTES de cualquier renderizado pero DESPUÉS de todos los Hooks
  if (!token) {
    return null; // El ProtectedRoute se encarga del redirect
  }

  const handleLogout = (): void => {
    clearSession();
    clearTenantFeaturesCache();
    navigate('/login', { replace: true });
  };

  const handleCategoryCreated = async () => {
    await mutateCategorias();
    setEditingCategory(null);
    notify('success', 'Categoría guardada correctamente.');
  };
  const handleProductCreated = async () => {
    await mutateProductos();
    notify('success', 'Producto guardado correctamente.');
  };
  const handleClientCreated = async () => await mutateClientes();

  const notify = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    window.setTimeout(() => setFeedback(null), 6000);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('¿Desea eliminar este producto del inventario?')) return;
    try {
      await apiClient.delete(`/productos/${id}`);
      await mutateProductos();
      notify('success', 'Producto eliminado correctamente.');
    } catch (error: any) {
      console.error('Error al eliminar producto:', error);
      notify('error', 'No se pudo eliminar el producto. ' + (error.response?.data?.message || ''));
    }
  };

  const handleCobrar = async (ventaId: number) => {
    // Validación preventiva: verificar si existe el token de Mercado Pago
    if (!globalConfig?.mpConfigurado) {
      notify('error', 'Mercado Pago no esta configurado. Revisa credenciales en Configuracion antes de cobrar con link.');
      setActiveTab('settings');
      return;
    }

    try {
      const response = await apiClient.post(`/pagos/link/${ventaId}`);
      if (response.data?.url) {
        window.open(response.data.url, '_blank');
      } else {
        notify('error', 'No se pudo generar el link de pago.');
      }
    } catch (error) {
      console.error('Error al cobrar:', error);
      notify('error', 'Error al procesar el cobro. Intente nuevamente.');
    }
  };

  const handleAnular = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas anular esta venta? El stock será devuelto.')) return;
    try {
      await apiClient.put(`/ventas/${id}/anular`);
      await mutateVentasRecientes();
      await mutateVentasPaginadas();
      await mutateVentasTotales();
      await mutateProductos();
      notify('success', 'Venta anulada y stock devuelto correctamente.');
    } catch (error: any) {
      console.error('Error al anular venta:', error);
      notify('error', 'Error al anular la venta. ' + (error.response?.data?.message || ''));
    }
  };

  const abrirArqueo = async () => {
    try {
      const stateRes = await apiClient.get('/caja/estado');
      setCaja(stateRes.data);
    } catch (error) {
      console.error('Error obteniendo estado de caja:', error);
    }
    setIsClosingModalOpen(true);
  };

  const handleImprimir = async (venta: any) => {
    try {
      const res = await apiClient.get(`/ventas/${venta.id}`);
      imprimirTicket(res.data, globalConfig);
    } catch {
      imprimirTicket(venta, globalConfig);
    }
  };

  const handleOpenCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montoInicial === '' || Number(montoInicial) < 0) return;
    
    setIsOpeningCaja(true);
    const payload = { montoInicial: Number(montoInicial) };
    
    try {
      await apiClient.post('/caja/apertura', payload);
      
      // Obtener el nuevo estado inmediatamente para actualizar la UI sin delay
      const stateRes = await apiClient.get('/caja/estado');
      setCaja(stateRes.data);
      
      setIsAperturaModalOpen(false);
      setMontoInicial('');
      notify('success', 'Caja abierta correctamente. Ya puede comenzar a operar.');
    } catch (error: any) {
      console.error('Error al abrir caja:', error);
      notify('error', 'Error al abrir la caja. ' + (error.response?.data?.message || ''));
    } finally {
      setIsOpeningCaja(false);
    }
  };

  const handleCloseCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montoCierre === '' || Number(montoCierre) < 0) return;
    setIsClosingCaja(true);
    try {
      await apiClient.post('/caja/cierre', { montoFinalReal: Number(montoCierre) });
      const stateRes = await apiClient.get('/caja/estado');
      setCaja(stateRes.data);
      setIsClosingModalOpen(false);
      setMontoCierre('');
      setActiveTab('dashboard');
      notify('success', 'Caja cerrada correctamente.');

    } catch (error: any) {
      console.error('Error al cerrar caja:', error);
      notify('error', 'Error al cerrar la caja. ' + (error.response?.data?.message || ''));
    } finally {
      setIsClosingCaja(false);
    }
  };

  const handleDescargo = async (cajaId: number) => {
    const monto = Number(descargoMonto[cajaId]);
    const motivo = (descargoMotivo[cajaId] || '').trim();
    if (Number.isNaN(monto) || monto < 0) {
      notify('error', 'Indicá el monto real de efectivo.');
      return;
    }
    if (motivo.length < 8) {
      notify('error', 'El descargo necesita un motivo (mínimo 8 caracteres).');
      return;
    }
    setGuardandoDescargoId(cajaId);
    try {
      await apiClient.post(`/caja/${cajaId}/descargo`, { montoFinalReal: monto, motivo });
      await mutateHistorialCajas();
      setDescargoMonto((prev) => ({ ...prev, [cajaId]: '' }));
      setDescargoMotivo((prev) => ({ ...prev, [cajaId]: '' }));
      notify('success', 'Descargo registrado. La caja quedó ajustada.');
    } catch (error: any) {
      notify('error', error.response?.data?.message || 'No se pudo registrar el descargo.');
    } finally {
      setGuardandoDescargoId(null);
    }
  };

  // Loaders
  if (isLoadingCaja || isLoadingCategorias || isLoadingProductos || isLoadingClientes) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="flex flex-col items-center">
          <svg className="w-12 h-12 text-blue-500 animate-spin mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-300 font-semibold tracking-wider uppercase text-sm">Iniciando Tulum Core...</p>
        </div>
      </div>
    );
  }

  // Errors
  if (errorCategorias || errorProductos || errorClientes) {
    return (
      <div className="tulum-app flex flex-col items-center justify-center min-h-screen bg-tulum-ink">
        <div className="p-8 bg-tulum-surface border border-tulum-danger/30 rounded-2xl text-center max-w-md">
           <svg className="w-16 h-16 mx-auto text-tulum-danger mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
           <h2 className="text-xl font-semibold text-tulum-bone mb-2">Error de Sincronización</h2>
           <p className="text-tulum-muted mb-6">No pudimos conectar con el servidor central de Tulum Systems.</p>
           <button onClick={handleLogout} className="px-6 py-2.5 font-semibold text-white transition-colors bg-tulum-accent rounded-lg hover:bg-tulum-accent-hover w-full">Volver al Inicio</button>
        </div>
      </div>
    );
  }

  // Diccionarios UI
  const tabTitles: Record<TabType, string> = {
    dashboard: esRestaurante ? 'Hoy' : 'Resumen',
    categories: 'Categorías',
    products: esRestaurante ? 'Carta' : 'Productos',
    clients: 'Clientes',
    sales: 'Ventas',
    settings: 'Preferencias',
    usuarios: 'Equipo',
    remitos: 'Hojas de ruta',
    pedidos: 'Pedidos',
    mesas: 'Mesas',
    proveedores: 'Proveedores',
    compras: 'Órdenes',
    movimientos: esRestaurante ? 'Stock' : 'Movimientos',
    auditoria: 'Auditoría',
  };

  // Cálculo de Métricas (Stat Cards) & Resumen de Caja
  const totalVentas = Number(ventasTotales?.cantidad || 0);
  const ingresosTotales = Number(ventasTotales?.ingresos || 0);
  const ticketPromedio = Number(ventasTotales?.ticketPromedio || (totalVentas > 0 ? ingresosTotales / totalVentas : 0));

  // Caja del turno abierto: una sola fuente de verdad (buckets reconstruidos en el backend).
  const vendidoEfectivo = Number(caja?.montoVentasEfectivo || 0);
  const vendidoTransferencia = Number(caja?.montoVentasTransferencia || 0);
  const vendidoMP = Number(caja?.montoVentasMP || 0);
  const cobranzasEfectivo = Number(caja?.montoCobranzasEfectivo || 0);
  const cobranzasTransferencia = Number(caja?.montoCobranzasTransferencia || 0);
  const totalEsperadoCaja = Number(
    caja?.montoFinalEsperado ?? ((caja?.montoInicial || 0) + vendidoEfectivo + cobranzasEfectivo)
  );

  const filteredProducts = Array.isArray(productos) ? productos.filter((p: any) => {
    const matchNombre = (p.nombre || '').toLowerCase().includes(productSearch.toLowerCase());
    const matchCarta = !esRestaurante || esVendible(p);
    return matchNombre && matchCarta;
  }) : [];
  const totalProductos = Array.isArray(productos)
    ? (esRestaurante ? productos.filter((p: any) => esVendible(p)).length : productos.length)
    : 0;
  const productosBajoStock = Array.isArray(productos)
    ? productos.filter((p: any) => {
        if (esRestaurante && !esVendible(p)) return false;
        const disponible = esRestaurante && tieneReceta(p) ? stockCarta(p) : Number(p.cantidadStock || 0);
        return disponible <= Number(p.stockMinimo || 0);
      }).length
    : 0;
  const productosSinCosto = Array.isArray(productos)
    ? productos.filter((p: any) => p.precioCosto == null).length
    : 0;
  const formatMoney = (value: number | null | undefined) =>
    `$${Number(value || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const ventasDelCliente = Array.isArray(ventasCliente?.content)
    ? ventasCliente.content.filter((venta: any) => venta.estado !== 'ANULADA')
    : [];
  const selectedClientLastSale = ventasDelCliente[0] || null;
  const totalCompradoCliente = ventasDelCliente.reduce((acc: number, venta: any) => acc + Number(venta.totalFinal || 0), 0);
  const cajaAbierta = caja?.estado === 'ABIERTA';
  const cajaStatusMeta = esPreventista
    ? 'Preventista · pedidos y hojas de ruta'
    : cajaAbierta
      ? `Turno abierto · ${caja.horasAbierta || 0}h`
      : 'Turno cerrado';

  const closeNavIfMobile = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      setSidebarOpen(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    if (esPreventista && tab !== 'products' && tab !== 'clients' && tab !== 'remitos') {
      return;
    }
    setActiveTab(tab);
    closeNavIfMobile();
  };

  return (
    <div className="tulum-app flex h-screen overflow-hidden bg-tulum-ink font-sans text-tulum-bone selection:bg-tulum-accent/30 selection:text-white">
      
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <DashboardSidebar
        open={sidebarOpen}
        nombreEmpresa={globalConfig?.nombreEmpresa}
        logoUrl={globalConfig?.logoUrl}
        esRestaurante={esRestaurante}
        esAdmin={esAdmin}
        esPreventista={esPreventista}
        isOperador={isOperador}
        puedeUsarPOS={puedeUsarPOS}
        mesasHabilitado={mesasHabilitado}
        clientesHabilitado={esRestaurante ? Boolean(globalConfig?.clientesHabilitado) : (globalConfig?.clientesHabilitado ?? true)}
        remitosHabilitado={esRestaurante ? Boolean(globalConfig?.remitosHabilitado) : (globalConfig?.remitosHabilitado ?? true)}
        comprasHabilitado={globalConfig?.comprasHabilitado ?? true}
        stockHabilitado={globalConfig?.stockHabilitado ?? true}
        activeTab={activeTab}
        turnosOpen={isHistorialCajasOpen}
        cajaAbierta={cajaAbierta}
        onTabChange={handleTabChange}
        onGoPos={() => { closeNavIfMobile(); navigate('/pos'); }}
        onOpenTurnos={() => { closeNavIfMobile(); setIsHistorialCajasOpen(true); }}
        onAbrirCaja={() => setIsAperturaModalOpen(true)}
        onCerrarCaja={abrirArqueo}
        onLogout={handleLogout}
        onGoHome={() => handleTabChange(esRestaurante ? 'mesas' : esPreventista ? 'remitos' : 'dashboard')}
        onCollapse={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen bg-tulum-ink">
        
        {/* Topbar Header */}
        <header className="bg-tulum-ink border-b border-tulum-border px-4 py-3 lg:px-8 flex items-center gap-3">
           <button
             onClick={() => setSidebarOpen((v) => !v)}
             className={`p-2 -ml-1 text-tulum-bone hover:bg-tulum-elevated rounded-lg transition-colors flex-shrink-0 ${sidebarOpen ? 'lg:hidden' : ''}`}
             aria-label={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
             title={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
           >
             {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
           </button>

           <div className="min-w-0 flex-1">
             <p className="text-lg lg:text-xl font-semibold text-tulum-bone tracking-tight truncate">
               {globalConfig?.nombreEmpresa || 'Tulum'}
             </p>
             <p className="text-xs font-medium text-tulum-muted mt-0.5 truncate">
               {tabTitles[activeTab]} · {cajaStatusMeta}
             </p>
           </div>
        </header>

        <div className={`relative flex-1 overflow-y-auto overflow-x-hidden min-h-0 ${activeTab === 'pedidos' || activeTab === 'mesas' ? 'p-3 sm:p-4' : 'p-3 sm:p-6 lg:p-8'}`}>
          {feedback && (
            <div className="max-w-7xl mx-auto mb-5">
              <ErrorAlert type={feedback.type} message={feedback.message} />
            </div>
          )}
          
          {/* TAB: PRODUCTOS */}
          {activeTab === 'products' && (
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PageHeader
                description={esRestaurante
                  ? 'Platos y bebidas que se venden. El fiambre y la limpieza están en Stock.'
                  : 'Precios, imágenes y disponibilidad.'}
                meta={
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label={esRestaurante ? `${totalProductos} en carta` : `${totalProductos} productos`} tone="blue" />
                    <StatusPill label={`${productosBajoStock} bajo stock`} tone={productosBajoStock > 0 ? 'amber' : 'emerald'} />
                    {productosSinCosto > 0 && !esPreventista && (
                      <StatusPill label={`${productosSinCosto} sin costo cargado`} tone="amber" />
                    )}
                  </div>
                }
                action={!esPreventista ? <AppButton icon={Plus} onClick={() => setShowProductForm(true)}>{esRestaurante ? 'Nuevo plato' : 'Nuevo producto'}</AppButton> : undefined}
              />
              {!esPreventista && (showProductForm || editingProduct) ? (
                <div className="relative">
                  <button
                    onClick={() => { setShowProductForm(false); setEditingProduct(null); }}
                    className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-4"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    {esRestaurante ? 'Volver a Carta' : 'Volver a Productos'}
                  </button>
                  <CreateProductForm 
                    modo={esRestaurante ? (esInsumo(editingProduct) ? 'deposito' : 'carta') : undefined}
                    onProductCreated={() => { handleProductCreated(); setEditingProduct(null); setShowProductForm(false); }} 
                    initialData={editingProduct}
                    onCancelEdit={() => { setEditingProduct(null); setShowProductForm(false); }}
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1 max-w-xl">
                      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre de producto..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>
                    {!esPreventista && (
                      <AppButton icon={Plus} onClick={() => setShowProductForm(true)}>{esRestaurante ? 'Nuevo plato' : 'Agregar producto'}</AppButton>
                    )}
                  </div>

                  <SectionCard
                    description={esRestaurante
                      ? 'Lo que el cliente pide. El depósito está en Stock.'
                      : 'Productos para ventas, remitos y compras.'}
                    action={<StatusPill label={`${filteredProducts.length} items`} tone="blue" />}
                  >
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-black">
                          <tr>
                            <th className="px-6 py-4">Imagen</th>
                            <th className="px-6 py-4">Producto</th>
                            <th className="px-6 py-4">Categoría</th>
                            <th className="px-6 py-4 text-right">Precio / Costo</th>
                            <th className="px-6 py-4 text-center">Stock</th>
                            {!esPreventista && <th className="px-6 py-4 text-center">Acciones</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredProducts.length > 0 ? filteredProducts.map((col: any, index: number) => (
                             <tr key={col.id} className={`transition-colors hover:bg-blue-50/30 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                               <td className="px-6 py-3">
                                  {col.imageUrl ? (
                                    <img src={col.imageUrl} alt={col.nombre} className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm bg-slate-50" />
                                  ) : (
                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400">
                                      <Package className="h-6 w-6" />
                                    </div>
                                  )}
                               </td>
                               <td className="px-6 py-4">
                                 <div className="font-black text-slate-900">{col.nombre}</div>
                                 {esRestaurante && (
                                 <div className="mt-1 flex flex-wrap gap-1">
                                   {tieneReceta(col) ? (
                                     <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">
                                       Receta
                                     </span>
                                   ) : (
                                     <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-black uppercase text-sky-700">
                                       De stock
                                     </span>
                                   )}
                                 </div>
                                 )}
                                 {col.medidas && <div className="mt-1 text-xs font-semibold text-slate-400">{col.medidas}</div>}
                               </td>
                               <td className="px-6 py-4 font-medium text-slate-500">
                                 <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{col.categoria?.nombre || `ID: ${col.categoriaId}`}</span>
                               </td>
                               <td className="px-6 py-4 text-right">
                                 <div className="font-black text-slate-900">${Number(col.precio).toFixed(2)}</div>
                                 {!esPreventista && (col.precioCosto != null ? (
                                   <div className="mt-0.5 text-xs font-semibold text-slate-400">Costo ${Number(col.precioCosto).toFixed(2)}</div>
                                 ) : (
                                   <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 border border-amber-200">
                                     <AlertTriangle className="h-3 w-3" />
                                     Sin costo
                                   </div>
                                 ))}
                               </td>
                                <td className="px-6 py-4 text-center">
                                  <StatusPill
                                    label={esRestaurante ? etiquetaStockProducto(col) : `${Number(col.cantidadStock || 0)}`}
                                    tone={(esRestaurante ? stockCarta(col) : Number(col.cantidadStock || 0)) <= 0 ? 'red' : col.stockMinimo > 0 && (esRestaurante ? stockCarta(col) : Number(col.cantidadStock || 0)) <= col.stockMinimo ? 'amber' : 'emerald'}
                                  />
                                </td>
                               {!esPreventista && (
                               <td className="px-6 py-4 text-center">
                                 <div className="flex items-center justify-center gap-2">
                                   <button
                                     onClick={() => {
                                       setEditingProduct(col);
                                       setShowProductForm(true);
                                       window.scrollTo({ top: 0, behavior: 'smooth' });
                                     }}
                                     className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                                     title="Editar Producto"
                                   >
                                     <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                   </button>
                                   <button
                                     onClick={() => handleDeleteProduct(col.id)}
                                     className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                     title="Eliminar Producto"
                                   >
                                     <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                   </button>
                                 </div>
                               </td>
                               )}
                             </tr>
                          )) : (
                            <tr>
                              <td colSpan={esPreventista ? 5 : 6} className="px-6 py-8">
                                <EmptyState compact title="No hay productos para mostrar" description={esRestaurante ? 'Cargá un plato acá, o una bebida en Stock con «Se vende».' : 'Crea un producto o ajusta la busqueda para ver resultados.'} icon={Package} />
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                </>
              )}
            </div>
          )}

          {/* TAB: CATEGORÍAS */}
          {activeTab === 'categories' && !esPreventista && (
            <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CreateCategoryForm
                onCategoryCreated={handleCategoryCreated}
                initialData={editingCategory}
                onCancelEdit={() => setEditingCategory(null)}
              />
              
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800">Categorías Activas</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-600">
                    <thead className="bg-white border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-bold">
                      <tr>
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Nombre / Tag</th>
                        <th className="px-6 py-4">Unidad de Medida</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.isArray(categorias) && categorias.length > 0 ? categorias.map((col: any, index: number) => (
                         <tr key={col.id} className={`transition-colors hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${editingCategory?.id === col.id ? 'bg-indigo-50/70' : ''}`}>
                           <td className="px-6 py-4 font-mono text-slate-400">{col.id}</td>
                           <td className="px-6 py-4 font-semibold text-slate-700">
                             <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md border border-indigo-100">{col.nombre}</span>
                           </td>
                           <td className="px-6 py-4 font-semibold text-slate-500">
                             {col.unidadMedida || 'UNIDAD'}
                             <span className="ml-1.5 text-xs text-slate-400">({getSufijoUnidad(col.unidadMedida)})</span>
                           </td>
                           <td className="px-6 py-4 text-right">
                             <button
                               type="button"
                               onClick={() => {
                                 setEditingCategory(col);
                                 window.scrollTo({ top: 0, behavior: 'smooth' });
                               }}
                               className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                             >
                               <Pencil className="h-3.5 w-3.5" />
                               Editar
                             </button>
                           </td>
                         </tr>
                      )) : (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No hay categorías registradas.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB: CLIENTES */}
          {activeTab === 'clients' && (
            <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CreateClientForm onClientCreated={handleClientCreated} />

              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800">Clientes</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-600">
                    <thead className="bg-white border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-bold">
                      <tr>
                        <th className="px-6 py-4 w-16">ID</th>
                        <th className="px-6 py-4">Nombre Completo</th>
                        <th className="px-6 py-4">Empresa (Opcional)</th>
                        <th className="px-6 py-4 text-right">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.isArray(clientes) && clientes.length > 0 ? clientes.map((col: any, index: number) => (
                         <tr
                           key={col.id}
                           onClick={() => setSelectedClient(col)}
                           className={`cursor-pointer transition-colors hover:bg-indigo-50/60 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                         >
                            <td className="px-6 py-4 font-mono text-slate-400">{col.id}</td>
                            <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                {(col.nombre ? col.nombre.charAt(0) : 'C')}{(col.apellido ? col.apellido.charAt(0) : '')}
                              </div>
                              {col.nombre || 'Sin Nombre'} {col.apellido || ''}
                           </td>
                            <td className="px-6 py-4 font-medium text-slate-500">
                              {col.empresa ? (
                                <span className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-md text-xs">{col.empresa}</span>
                              ) : (
                                <span className="text-slate-300 italic">No especificada</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedClient(col);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Ver
                              </button>
                            </td>
                          </tr>
                      )) : (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No hay clientes registrados.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB: USUARIOS */}
          {activeTab === 'usuarios' && <UsuariosTab />}

          {/* TAB: REMITOS */}
          {activeTab === 'pedidos' && !esPreventista && esRestaurante && <PedidosTab />}
          {activeTab === 'mesas' && !esPreventista && mesasHabilitado && <MesasTab />}
          {activeTab === 'remitos' && <RemitosTab ocultarCobranzas={esPreventista} />}

          {/* TAB: PROVEEDORES */}
          {activeTab === 'proveedores' && <ProveedoresTab />}

          {/* TAB: COMPRAS */}
          {activeTab === 'compras' && <ComprasTab />}

          {/* TAB: MOVIMIENTOS */}
          {activeTab === 'movimientos' && (esRestaurante ? <StockLogisticaTab /> : <MovimientosStockTab />)}

          {/* TAB: AUDITORIA */}
          {activeTab === 'auditoria' && <AuditoriaTab />}

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && !esPreventista && (
            esRestaurante ? (
              <RestauranteDashboardHome
                nombreEmpresa={globalConfig?.nombreEmpresa}
                cajaAbierta={cajaAbierta}
                cajaLabel={
                  cajaAbierta
                    ? `${caja?.horasAbierta || 0}h / ${caja?.limiteHoras || 24}h`
                    : undefined
                }
                onAbrirCaja={() => setIsAperturaModalOpen(true)}
                onCerrarCaja={abrirArqueo}
                onIrPedidos={() => handleTabChange('pedidos')}
                onIrMesas={() => handleTabChange('mesas')}
                onIrPos={() => navigate('/pos')}
                ingresosTotales={ingresosTotales}
              />
            ) : (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PageHeader
                description="Ventas, caja, stock y actividad del turno."
                meta={
                  <div className="flex flex-wrap gap-2">
                    {!esPreventista && (
                      <StatusPill label={cajaAbierta ? 'Caja abierta' : 'Caja cerrada'} tone={cajaAbierta ? 'emerald' : 'amber'} />
                    )}
                    <StatusPill label={`${totalProductos} productos`} tone="blue" />
                    <StatusPill label={`${productosBajoStock} alertas stock`} tone={productosBajoStock > 0 ? 'amber' : 'emerald'} />
                  </div>
                }
                action={
                  esPreventista ? undefined : cajaAbierta ? (
                    <AppButton variant="secondary" onClick={abrirArqueo}>Cerrar caja</AppButton>
                  ) : (
                    <AppButton variant="success" onClick={() => setIsAperturaModalOpen(true)}>Abrir caja</AppButton>
                  )
                }
              />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Ventas" value={totalVentas} helper="Operaciones registradas" icon={Receipt} tone="blue" />
                <MetricCard label="Ingresos" value={`$${ingresosTotales.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} helper="Facturacion total" icon={DollarSign} tone="emerald" />
                <MetricCard label="Ticket promedio" value={`$${ticketPromedio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} helper="Promedio por venta" icon={TrendingUp} tone="indigo" />
                <MetricCard label="Stock critico" value={productosBajoStock} helper="Productos en alerta" icon={AlertTriangle} tone={productosBajoStock > 0 ? 'amber' : 'slate'} />
              </div>

              {/* Gráfico de Ventas Historial Recharts */}
              <VentasChart />

                {esAdmin && (!caja || caja.estado !== 'ABIERTA') && (
                  <section className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
                    <form onSubmit={handleOpenCaja} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-amber-800">Turno Cerrado</h3>
                          <p className="text-sm text-amber-700">No hay un turno de caja abierto. Iniciá uno para registrar ventas en efectivo.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={montoInicial}
                            onChange={(e) => setMontoInicial(e.target.value === '' ? '' : Number(e.target.value))}
                            disabled={isOpeningCaja}
                            className="w-28 pl-7 pr-3 py-2.5 bg-white border-2 border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-bold text-slate-800"
                            placeholder="0.00"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isOpeningCaja}
                          className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-200 transition-all disabled:opacity-50"
                        >
                          {isOpeningCaja ? 'Abriendo...' : 'Abrir Turno'}
                        </button>
                      </div>
                    </form>
                  </section>
                )}

              <AlertasStock />

              {!esPreventista && esRestaurante && (
                <button
                  type="button"
                  onClick={() => handleTabChange('pedidos')}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left shadow-sm transition hover:border-emerald-500/40"
                >
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Pedidos</p>
                  <p className="mt-1 text-lg font-black text-white">WhatsApp y delivery</p>
                  <p className="mt-1 text-sm text-slate-400">Abrí el tablero para ver estados, dirección y cargar un pedido a mano.</p>
                </button>
              )}


              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800">Historial de Ventas</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-600">
                    <thead className="bg-white border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-bold">
                      <tr>
                        <th className="px-6 py-4">Comp. #</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4 text-center">Canal/Estado</th>
                        <th className="px-6 py-4 text-center">Moneda</th>
                        <th className="px-6 py-4 text-right">Total Final</th>
                        <th className="px-6 py-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.isArray(ventasRecientes?.content) && ventasRecientes.content.length > 0 ? (
                        ventasRecientes.content.map((col: any, index: number) => {
                          const clientName = col.cliente?.nombre 
                            ? `${col.cliente.nombre} ${col.cliente.apellido}` 
                            : (col.clienteId === 0 || !col.clienteId ? 'Consumidor Final' : `ID Cliente: ${col.clienteId}`);
                          const estado = col.estado?.toUpperCase() || 'PENDIENTE';
                          const isAnulada = estado === 'ANULADA';
                          
                          return (
                            <tr key={col.id} className={`transition-all duration-300 hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${isAnulada ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                              <td className={`px-6 py-4 font-mono font-bold ${isAnulada ? 'text-slate-400 line-through' : 'text-indigo-600'}`}>
                                {col.nroComprobante || col.id}
                              </td>
                              <td className={`px-6 py-4 font-semibold text-slate-700 ${isAnulada ? 'line-through' : ''}`}>{clientName}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border shadow-sm ${
                                  estado === 'PENDIENTE' 
                                    ? 'bg-amber-50 text-amber-600 border-amber-200' 
                                    : estado === 'PAGADA' || estado === 'COMPLETADA'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-red-50 text-red-700 border-red-500'
                                }`}>
                                  {estado}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center font-bold text-slate-500">
                                {col.moneda === 'USD' ? 'US$' : 'ARS'}
                              </td>
                              <td className={`px-6 py-4 text-right font-black text-slate-800 ${isAnulada ? 'line-through' : ''}`}>
                                {col.moneda === 'USD' ? 'US$' : '$'}{(col.totalFinal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  {!isAnulada && (
                                    <>
                                      {estado === 'PENDIENTE' && mpHabilitado && (
                                        <button
                                          onClick={() => handleCobrar(col.id)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-tulum-accent text-white text-[10px] font-semibold uppercase rounded-lg hover:bg-tulum-accent-hover transition-colors"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                          Cobrar
                                        </button>
                                      )}
                                      
                                      {(estado === 'PAGADA' || estado === 'COMPLETADA') && (
                                        <button
                                          onClick={() => handleImprimir(col)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-black uppercase rounded-lg hover:bg-slate-900 transition-all shadow-sm"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                          Ticket
                                        </button>
                                      )}

                                      <button
                                        onClick={() => handleAnular(col.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-500 text-[10px] font-black uppercase rounded-lg hover:bg-red-50 transition-all"
                                        title="Anular Operación"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        Anular
                                      </button>
                                    </>
                                  )}
                                  
                                  {isAnulada && (
                                    <div className="text-slate-400 font-black text-[10px] uppercase tracking-tighter italic">Comprobante Anulado</div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                            No hay ventas registradas recientemente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            )
          )}

          {/* TAB: VENTAS HISTORIAL */}
          {activeTab === 'sales' && !esPreventista && (
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               
               {/* Barra de Filtros */}
               <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-3 sm:gap-4 items-end">
                 <div className="flex-1 min-w-[120px] sm:min-w-[150px]">
                    <label className="block text-xs font-extrabold text-slate-500 mb-1 tracking-wider uppercase">Desde</label>
                    <input type="date" value={filterDesde} onChange={(e) => { setFilterDesde(e.target.value); setPage(0); }} className="w-full px-3 sm:px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all text-sm bg-slate-50/50" />
                 </div>
                 <div className="flex-1 min-w-[120px] sm:min-w-[150px]">
                    <label className="block text-xs font-extrabold text-slate-500 mb-1 tracking-wider uppercase">Hasta</label>
                    <input type="date" value={filterHasta} onChange={(e) => { setFilterHasta(e.target.value); setPage(0); }} className="w-full px-3 sm:px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all text-sm bg-slate-50/50" />
                 </div>
                 <div className="flex-1 min-w-[120px] sm:min-w-[150px]">
                    <label className="block text-xs font-extrabold text-slate-500 mb-1 tracking-wider uppercase">Medio de Pago</label>
                    <select value={filterMetodoPago} onChange={(e) => { setFilterMetodoPago(e.target.value); setPage(0); }} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all text-sm bg-slate-50/50">
                       <option value="">TODOS</option>
                       {metodosHabilitados.map((metodo) => (
                         <option key={metodo.value} value={metodo.value}>{metodo.label.toUpperCase()}</option>
                       ))}
                    </select>
                 </div>
                 <div className="flex-1 min-w-[120px] sm:min-w-[150px]">
                    <label className="block text-xs font-extrabold text-slate-500 mb-1 tracking-wider uppercase">Estado</label>
                    <select value={filterEstado} onChange={(e) => { setFilterEstado(e.target.value); setPage(0); }} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all text-sm bg-slate-50/50">
                       <option value="">TODOS</option>
                       <option value="PENDIENTE">PENDIENTE</option>
                       <option value="PAGADA">PAGADA</option>
                       <option value="COMPLETADA">COMPLETADA</option>
                       <option value="ANULADA">ANULADA</option>
                    </select>
                 </div>
                 <button onClick={() => { setFilterDesde(''); setFilterHasta(''); setFilterMetodoPago(''); setFilterEstado(''); setPage(0); }} className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-xl font-bold text-sm transition-all hover:text-slate-700 shadow-sm">
                   Limpiar
                 </button>
               </div>

               {/* Tabla de Ventas Paginadas */}
               <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-bold">
                        <tr>
                          <th className="px-6 py-4">Comp. #</th>
                          <th className="px-6 py-4">Cliente</th>
                          <th className="px-6 py-4 text-center">Forma Pago</th>
                          <th className="px-6 py-4 text-center">Estado</th>
                          <th className="px-6 py-4 text-right">Total Final</th>
                          <th className="px-6 py-4 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ventasPaginadas?.content && ventasPaginadas.content.length > 0 ? (
                           ventasPaginadas.content.map((col: any) => (
                             <tr key={col.id} className="hover:bg-slate-50 transition-all duration-200">
                                <td className="px-6 py-4 font-mono font-bold text-indigo-600">{col.nroComprobante || col.id}</td>
                                <td className="px-6 py-4 font-bold text-slate-700">{col.cliente ? `${col.cliente.nombre} ${col.cliente.apellido}` : 'Consumidor Final'}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-400 text-xs">{getMetodoPagoLabelCorto(col.metodoPago)}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                                    col.estado === 'PENDIENTE' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                    col.estado === 'PAGADA' || col.estado === 'COMPLETADA' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                                  }`}>{col.estado}</span>
                                </td>
                                <td className="px-6 py-4 text-right font-black text-slate-800">${(col.totalFinal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-6 py-4 text-center">
                                   <button onClick={() => handleImprimir(col)} className="px-3 py-1.5 bg-slate-800 text-white font-bold text-xs uppercase rounded-lg hover:bg-slate-900 transition-all shadow-sm">Ticket</button>
                                </td>
                             </tr>
                           ))
                        ) : (
                           <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No hay ventas registradas que coincidan con la búsqueda.</td></tr>
                        )}
                      </tbody>
                    </table>
                 </div>
                 
                 {/* Footer Paginacion */}
                 <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-600">
                   <div>Página {page + 1} de {ventasPaginadas?.totalPages || 1}</div>
                   <div className="flex gap-2">
                     <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-50 font-black text-xs hover:bg-slate-100 hover:text-slate-800 transition-all shadow-sm">Anterior</button>
                     <button disabled={page + 1 >= (ventasPaginadas?.totalPages || 1)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-50 font-black text-xs hover:bg-slate-100 hover:text-slate-800 transition-all shadow-sm">Siguiente</button>
                   </div>
                 </div>
               </section>
            </div>
          )}

          {/* TAB: PREFERENCIAS GLOBALES */}
          {activeTab === 'settings' && (

            <SettingsTab />
          )}

        </div>
      </main>

      {selectedClient && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setSelectedClient(null)}>
          <div
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-black text-indigo-700">
                  {(selectedClient.nombre ? selectedClient.nombre.charAt(0) : 'C')}{(selectedClient.apellido ? selectedClient.apellido.charAt(0) : '')}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Perfil de cliente</p>
                  <h2 className="text-2xl font-black text-slate-900">
                    {selectedClient.nombre || 'Sin nombre'} {selectedClient.apellido || ''}
                  </h2>
                  {selectedClient.empresa && (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                      <Building2 className="h-4 w-4" />
                      {selectedClient.empresa}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
                aria-label="Cerrar perfil"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Compras</p>
                  <p className="mt-1 text-xl font-black text-slate-800">{ventasDelCliente.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total comprado</p>
                  <p className="mt-1 text-xl font-black text-slate-800">{formatMoney(totalCompradoCliente)}</p>
                </div>
              </div>

              {Number(selectedClient.saldoCuentaCorriente || 0) !== 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-wider text-amber-600">Saldo cuenta corriente</p>
                  <p className="mt-1 text-lg font-black text-amber-800">{formatMoney(selectedClient.saldoCuentaCorriente)}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Teléfono</p>
                    <p className="font-semibold text-slate-700">{selectedClient.telefono || 'No informado'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Dirección</p>
                    <p className="font-semibold text-slate-700">{selectedClient.direccion || 'No informada'}</p>
                    {selectedClient.googleMapsUrl && (
                      <a
                        href={selectedClient.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-black text-indigo-600 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir en Google Maps
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Última compra</p>
                {selectedClientLastSale ? (
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-800">
                        {selectedClientLastSale.nroComprobante || `#${selectedClientLastSale.id}`}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        {selectedClientLastSale.fecha
                          ? new Date(selectedClientLastSale.fecha).toLocaleDateString('es-AR')
                          : 'Sin fecha'}
                        {' · '}
                        {getMetodoPagoLabelCorto(selectedClientLastSale.metodoPago)}
                      </p>
                    </div>
                    <p className="font-black text-slate-900">{formatMoney(selectedClientLastSale.totalFinal)}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-slate-400">Todavía no tiene compras registradas.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Bloqueo de Caja: el operador necesita turno abierto */}
      {!isLoadingCaja && isOperador && (!caja || caja.estado !== 'ABIERTA') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-8 bg-white shadow-2xl rounded-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center w-16 h-16 text-amber-600 bg-amber-100 rounded-full shadow-inner">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-black text-center text-slate-800 tracking-tight">¡Atención! Turno Cerrado</h2>
            <p className="mb-8 text-sm font-medium text-center text-slate-500 leading-relaxed">
              Para comenzar a operar, debes iniciar la caja con el monto de efectivo disponible para cambio.
            </p>
            <form onSubmit={handleOpenCaja} className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-bold text-slate-700">Monto Inicial ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={isOpeningCaja}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-lg font-black text-slate-800 transition-all placeholder:font-medium"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isOpeningCaja}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 font-black tracking-wide text-white transition-all bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOpeningCaja ? (
                  <>
                    <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Abriendo Turno...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
                    Iniciar Turno
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 mt-2 font-bold text-slate-400 hover:text-red-500 transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                Salir / Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cierre de Caja */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-8 bg-white shadow-2xl rounded-2xl animate-in zoom-in-95 duration-300">
            <h2 className="mb-6 text-2xl font-black text-center text-slate-800 tracking-tight">Arqueo de Caja</h2>
            
            <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500">Efectivo Inicial:</span>
                <span className="font-mono font-bold text-slate-700">${(caja?.montoInicial || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-600">
                <span className="text-sm font-bold opacity-80">Vendido en Efectivo:</span>
                <span className="font-mono font-bold">${vendidoEfectivo.toFixed(2)}</span>
              </div>
              {cobranzasEfectivo > 0 && (
                <div className="flex justify-between items-center text-amber-600">
                  <span className="text-sm font-bold opacity-80">Cobranzas de remitos en efectivo:</span>
                  <span className="font-mono font-bold">${cobranzasEfectivo.toFixed(2)}</span>
                </div>
              )}
              {vendidoTransferencia > 0 && (
                <div className="flex justify-between items-center text-indigo-600">
                  <span className="text-sm font-bold opacity-80">Vendido por Transferencia:</span>
                  <span className="font-mono font-bold">${vendidoTransferencia.toFixed(2)}</span>
                </div>
              )}
              {cobranzasTransferencia > 0 && (
                <div className="flex justify-between items-center text-indigo-500">
                  <span className="text-sm font-bold opacity-80">Cobranzas de remitos por transferencia:</span>
                  <span className="font-mono font-bold">${cobranzasTransferencia.toFixed(2)}</span>
                </div>
              )}
              {vendidoMP > 0 && (
                <div className="flex justify-between items-center text-blue-600">
                  <span className="text-sm font-bold opacity-80">Vendido en Digital (MP):</span>
                  <span className="font-mono font-bold">${vendidoMP.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between items-center text-slate-800">
                <span className="text-sm font-black uppercase tracking-wider">Total Esperado en Caja:</span>
                <span className="font-mono font-black text-lg">${totalEsperadoCaja.toFixed(2)}</span>
              </div>
              <p className="text-xs font-semibold text-slate-400">
                Transferencias y Mercado Pago no entran al efectivo del cajón.
              </p>
            </div>

            <form onSubmit={handleCloseCaja} className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-bold text-slate-700">Efectivo Real en Caja ($) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={montoCierre}
                    onChange={(e) => setMontoCierre(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={isClosingCaja}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 text-lg font-black text-slate-800 transition-all placeholder:font-medium"
                    placeholder="0.00"
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500 bg-slate-100 p-2.5 rounded-lg border border-slate-200 flex items-center gap-1">
                   💡 Contá todo el efectivo físico en el cajón (incluyendo el monto inicial) y cargalo aquí.
                </p>
              </div>

              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsClosingModalOpen(false)}
                  disabled={isClosingCaja}
                  className="flex-1 py-3.5 px-4 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isClosingCaja}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 font-black tracking-wide text-white transition-all bg-amber-500 rounded-xl shadow-lg shadow-amber-500/30 hover:bg-amber-600 disabled:opacity-50"
                >
                  {isClosingCaja ? 'Cerrando...' : 'Confirmar Cierre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historial de Cierres de Caja */}
      {isHistorialCajasOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] bg-white shadow-2xl rounded-2xl animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Turnos</h2>
              <button onClick={() => setIsHistorialCajasOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!Array.isArray(historialCajas) || historialCajas.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                  <p className="text-sm font-bold">No hay turnos registrados</p>
                </div>
              ) : (
                historialCajas.map((c: any) => (
                  <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${c.estado === 'ABIERTA' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {c.estado}
                        </span>
                        {c.cierreAutomatico && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Cierre automático
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {c.fechaApertura ? new Date(c.fechaApertura).toLocaleString() : '-'}
                        {c.fechaCierre ? ` → ${new Date(c.fechaCierre).toLocaleString()}` : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      <div><span className="font-bold text-slate-400 block">Inicial</span><span className="font-black text-slate-700">${(c.montoInicial || 0).toFixed(2)}</span></div>
                      <div><span className="font-bold text-emerald-500 block">Efectivo</span><span className="font-black text-slate-700">${(c.montoVentasEfectivo || 0).toFixed(2)}</span></div>
                      <div><span className="font-bold text-indigo-500 block">Transferencia</span><span className="font-black text-slate-700">${(c.montoVentasTransferencia || 0).toFixed(2)}</span></div>
                      <div><span className="font-bold text-blue-500 block">MP</span><span className="font-black text-slate-700">${(c.montoVentasMP || 0).toFixed(2)}</span></div>
                      <div><span className="font-bold text-amber-500 block">Esperado</span><span className="font-black text-slate-700">${(c.montoFinalEsperado || 0).toFixed(2)}</span></div>
                      {c.montoFinalReal != null && (
                        <div className="col-span-full border-t border-slate-200 pt-2 flex justify-between">
                          <span className="font-bold text-slate-500">Real:</span>
                          <span className={`font-black text-lg ${c.montoFinalReal >= (c.montoFinalEsperado || 0) ? 'text-emerald-600' : 'text-red-500'}`}>
                            ${c.montoFinalReal.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    {c.motivoCierre && (
                      <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{c.motivoCierre}</p>
                    )}
                    {Array.isArray(c.descargos) && c.descargos.length > 0 && (
                      <div className="space-y-1 border-t border-slate-200 pt-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Descargos</p>
                        {c.descargos.map((d: any) => (
                          <p key={d.id} className="text-[11px] font-semibold text-slate-600">
                            {d.fecha ? new Date(d.fecha).toLocaleString() : ''} · ${(d.montoAnterior || 0).toFixed(2)} → ${(d.montoNuevo || 0).toFixed(2)}
                            {d.diferencia != null ? ` (${d.diferencia > 0 ? '+' : ''}${Number(d.diferencia).toFixed(2)})` : ''}
                            {' · '}{d.motivo}
                          </p>
                        ))}
                      </div>
                    )}
                    {c.estado === 'CERRADA' && (
                      <div className="space-y-2 border-t border-slate-200 pt-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ajustar con descargo</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Monto real $"
                            value={descargoMonto[c.id] ?? ''}
                            onChange={(e) => setDescargoMonto((prev) => ({ ...prev, [c.id]: e.target.value }))}
                            className="flex-1 px-3 py-2 text-sm font-bold bg-white border border-slate-200 rounded-lg text-slate-800"
                          />
                          <input
                            type="text"
                            placeholder="Motivo del ajuste"
                            value={descargoMotivo[c.id] ?? ''}
                            onChange={(e) => setDescargoMotivo((prev) => ({ ...prev, [c.id]: e.target.value }))}
                            className="flex-[2] px-3 py-2 text-sm font-semibold bg-white border border-slate-200 rounded-lg text-slate-800"
                          />
                          <button
                            type="button"
                            disabled={guardandoDescargoId === c.id}
                            onClick={() => handleDescargo(c.id)}
                            className="px-3 py-2 text-xs font-black uppercase tracking-wide text-white bg-slate-800 rounded-lg hover:bg-slate-900 disabled:opacity-50"
                          >
                            {guardandoDescargoId === c.id ? 'Guardando...' : 'Descargo'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Apertura de Caja */}
      {isAperturaModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-8 bg-white shadow-2xl rounded-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center w-16 h-16 text-amber-600 bg-amber-100 rounded-full shadow-inner">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-black text-center text-slate-800 tracking-tight">Apertura de Turno</h2>
            <p className="mb-8 text-sm font-medium text-center text-slate-500 leading-relaxed">
              Ingresá el monto de efectivo disponible para cambio.
            </p>
            <form onSubmit={handleOpenCaja} className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-bold text-slate-700">Monto Inicial ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={isOpeningCaja}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-lg font-black text-slate-800 transition-all placeholder:font-medium"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isOpeningCaja}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 font-black tracking-wide text-white transition-all bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOpeningCaja ? (
                  <>
                    <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Abriendo Turno...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
                    Iniciar Turno
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsAperturaModalOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 mt-2 font-bold text-slate-400 hover:text-red-500 transition-colors text-sm"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

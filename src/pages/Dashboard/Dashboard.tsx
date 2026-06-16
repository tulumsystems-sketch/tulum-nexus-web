import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import apiClient from '../../api/axiosConfig';
import { CreateCategoryForm } from './components/CreateCategoryForm';
import { CreateProductForm } from './components/CreateProductForm';
import { CreateClientForm } from './components/CreateClientForm';
import { SettingsTab } from './components/SettingsTab';
import { MonitorPedidosOnline } from './components/MonitorPedidosOnline';
import { VentasChart } from './components/VentasChart';
import { UsuariosTab } from './components/UsuariosTab';
import { RemitosTab } from './components/RemitosTab';
import { AlertasStock } from './components/AlertasStock';



// Fetcher usando nuestro cliente Axios
const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

type TabType = 'dashboard' | 'categories' | 'products' | 'clients' | 'sales' | 'settings' | 'usuarios' | 'remitos';

export const Dashboard: React.FC = () => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const rol = localStorage.getItem('rol');
  const esAdmin = rol === 'ADMIN';
  const isOperador = rol === 'OPERADOR';

  const [activeTab, setActiveTab] = useState<TabType>(isOperador ? 'products' : 'dashboard');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [montoInicial, setMontoInicial] = useState<number | ''>('');
  const [isOpeningCaja, setIsOpeningCaja] = useState(false);
  const [isAperturaModalOpen, setIsAperturaModalOpen] = useState(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [isHistorialCajasOpen, setIsHistorialCajasOpen] = useState(false);
  const [montoCierre, setMontoCierre] = useState<number | ''>('');
  const [isClosingCaja, setIsClosingCaja] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // SWR Asíncrono puro - Solo disparar si hay token para evitar loops de 401/403
  const { data: categorias, error: errorCategorias, isLoading: isLoadingCategorias, mutate: mutateCategorias } = useSWR(token ? '/categorias' : null, fetcher);
  const { data: productos, error: errorProductos, isLoading: isLoadingProductos, mutate: mutateProductos } = useSWR(token ? '/productos' : null, fetcher);
  const { data: clientes, error: errorClientes, isLoading: isLoadingClientes, mutate: mutateClientes } = useSWR(token ? '/clientes' : null, fetcher);
  const { data: ventas, error: errorVentas, isLoading: isLoadingVentas, mutate: mutateVentas } = useSWR(token ? '/ventas' : null, fetcher);
  
  // Configuración Global y Preferencias
  const { data: globalConfig } = useSWR(token ? '/config' : null, fetcher);
  const mpHabilitado = globalConfig?.mpAceptarCredito || globalConfig?.mpAceptarDebito;
  
  // Filtros Pestaña de Ventas
  const [filterDesde, setFilterDesde] = useState('');
  const [filterHasta, setFilterHasta] = useState('');
  const [filterMetodoPago, setFilterMetodoPago] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [page, setPage] = useState(0);

  const { data: ventasPaginadas } = useSWR(
    token ? `/ventas/search?page=${page}&size=10&desde=${filterDesde}&hasta=${filterHasta}&metodoPago=${filterMetodoPago}&estado=${filterEstado}` : null,
    fetcher
  );

  // Estado de la Caja
  const [caja, setCaja] = useState<any>(null);
  const [isLoadingCaja, setIsLoadingCaja] = useState(true);

  useEffect(() => {
    if (token) {
      apiClient.get('/caja/estado')
        .then(res => setCaja(res.data))
        .catch(err => {
          console.error("Error obteniendo estado de caja:", err);
          setCaja(null);
        })
        .finally(() => setIsLoadingCaja(false));
    } else {
      setIsLoadingCaja(false);
    }
  }, [token]);

  // Historial de Cierres de Caja (solo carga cuando el modal está abierto)
  const { data: historialCajas } = useSWR(
    isHistorialCajasOpen ? '/caja/historial' : null,
    fetcher
  );

  // Verificación de seguridad ANTES de cualquier renderizado pero DESPUÉS de todos los Hooks
  if (!token) {
    return null; // El ProtectedRoute se encarga del redirect
  }

  const handleLogout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('tenant');
    localStorage.removeItem('rol');
    localStorage.removeItem('email');
    navigate('/login', { replace: true });
  };

  const handleCategoryCreated = async () => await mutateCategorias();
  const handleProductCreated = async () => await mutateProductos();
  const handleClientCreated = async () => await mutateClientes();

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('¿Desea eliminar este producto del inventario?')) return;
    try {
      await apiClient.delete(`/productos/${id}`);
      await mutateProductos();
    } catch (error: any) {
      console.error('Error al eliminar producto:', error);
      alert('No se pudo eliminar el producto. ' + (error.response?.data?.message || ''));
    }
  };

  const handleCobrar = async (ventaId: number) => {
    // Validación preventiva: verificar si existe el token de Mercado Pago
    if (!globalConfig?.mpAccessToken) {
      alert("⚠️ Acción requerida: Aún no has configurado tu Access Token de Mercado Pago.\n\nPor favor, ve a la pestaña 'Configuración', ingresa tus credenciales y vuelve a intentar.");
      setActiveTab('settings');
      return;
    }

    try {
      const response = await apiClient.post(`/pagos/link/${ventaId}`);
      if (response.data?.url) {
        window.open(response.data.url, '_blank');
      } else {
        alert('No se pudo generar el link de pago.');
      }
    } catch (error) {
      console.error('Error al cobrar:', error);
      alert('Error al procesar el cobro. Intente nuevamente.');
    }
  };

  const handleAnular = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas anular esta venta? El stock será devuelto.')) return;
    try {
      await apiClient.put(`/ventas/${id}/anular`);
      await mutateVentas();
      await mutateProductos();
    } catch (error: any) {
      console.error('Error al anular venta:', error);
      alert('Error al anular la venta. ' + (error.response?.data?.message || ''));
    }
  };

  const handleImprimir = (venta: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = venta.items?.map((item: any) => `
      <tr>
        <td style="padding: 5px 0;">${item.cantidad} x ${item.producto?.nombre || 'Producto'}</td>
        <td style="text-align: right;">$${(item.precioUnitario * item.cantidad).toFixed(2)}</td>
      </tr>
    `).join('') || '';

    const clienteName = venta.cliente ? `${venta.cliente.nombre} ${venta.cliente.apellido}` : 'Consumidor Final';
    const fecha = new Date(venta.fecha || Date.now()).toLocaleString('es-AR');

    const htmlContent = `
      <html>
        <head>
          <title>Ticket #BT-${venta.nroComprobante || venta.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; color: #000; font-size: 12px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .header { margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .logo { max-width: 60mm; height: auto; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .totals { border-top: 1px dashed #000; padding-top: 10px; }
            .footer { margin-top: 20px; text-align: center; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header center">
            ${globalConfig?.logoUrl ? `<img src="${globalConfig.logoUrl}" class="logo" />` : ''}
            <div class="bold" style="font-size: 16px;">${globalConfig?.nombreEmpresa || 'TULUM SYSTEMS'}</div>
            <div>COMPROBANTE NO FISCAL</div>
          </div>
          
          <div>
            <div class="bold">TICKET: #BT-${venta.nroComprobante || venta.id}</div>
            <div>FECHA: ${fecha}</div>
            <div>CLIENTE: ${clienteName}</div>
          </div>

          <table>
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th style="text-align: left;">DESCRIPCIÓN</th>
                <th style="text-align: right;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div style="display: flex; justify-content: space-between;">
              <span>SUBTOTAL:</span>
              <span>$${(venta.totalFinal / 1.21).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>IVA (21%):</span>
              <span>$${(venta.totalFinal - (venta.totalFinal / 1.21)).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;" class="bold">
              <span>TOTAL:</span>
              <span>$${(venta.totalFinal || 0).toFixed(2)}</span>
            </div>
          </div>

          <div style="margin-top: 10px; font-size: 10px;">
            <div>FORMA DE PAGO: ${venta.metodoPago || 'MERCADO PAGO'}</div>
            ${venta.montoAbonado ? `<div>ABONADO: $${venta.montoAbonado.toFixed(2)}</div>` : ''}
            ${venta.montoAbonado ? `<div class="bold">VUELTO: $${(venta.montoAbonado - venta.totalFinal).toFixed(2)}</div>` : ''}
          </div>

          <div class="footer">
            <p>¡Gracias por su compra!</p>
            <p>SaaS POS - Powered by Tulum Systems</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleOpenCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montoInicial === '' || Number(montoInicial) < 0) return;
    
    setIsOpeningCaja(true);
    const payload = { montoInicial: Number(montoInicial) };
    
    console.log('--- ENVIANDO APERTURA DE CAJA ---');
    console.log('Payload:', payload);
    console.log('URL: /api/caja/apertura');

    try {
      await apiClient.post('/caja/apertura', payload);
      
      // Obtener el nuevo estado inmediatamente para actualizar la UI sin delay
      const stateRes = await apiClient.get('/caja/estado');
      setCaja(stateRes.data);
      
      setIsAperturaModalOpen(false);
      alert('✅ Caja abierta correctamente. Ya puede comenzar a operar.');
    } catch (error: any) {
      console.error('Error al abrir caja:', error);
      alert('Error al abrir la caja. ' + (error.response?.data?.message || ''));
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

    } catch (error: any) {
      console.error('Error al cerrar caja:', error);
      alert('Error al cerrar la caja. ' + (error.response?.data?.message || ''));
    } finally {
      setIsClosingCaja(false);
    }
  };

  // Loaders
  if (isLoadingCaja || isLoadingCategorias || isLoadingProductos || isLoadingClientes || isLoadingVentas) {
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
  if (errorCategorias || errorProductos || errorClientes || errorVentas) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="p-8 bg-white border border-red-100 rounded-2xl shadow-xl text-center max-w-md">
           <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
           <h2 className="text-xl font-bold text-slate-800 mb-2">Error de Sincronización</h2>
           <p className="text-slate-600 mb-6">No pudimos conectar con el servidor central de Tulum Systems.</p>
           <button onClick={handleLogout} className="px-6 py-2.5 font-bold text-white transition-all bg-slate-800 rounded-lg shadow hover:bg-slate-900 w-full">Volver al Inicio</button>
        </div>
      </div>
    );
  }

  // Diccionarios UI
  const tabTitles: Record<TabType, string> = {
    dashboard: 'Dashboard & Estadísticas',
    categories: 'Gestión de Categorías',
    products: 'Catálogo de Productos',
    clients: 'Directorio de Clientes',
    sales: 'Punto de Venta (POS)',
    settings: 'Configuración del Tenant',
    usuarios: 'Gestión de Usuarios',
    remitos: 'Hojas de Ruta',
  };

  // Cálculo de Métricas (Stat Cards) & Resumen de Caja
  const totalVentas = Array.isArray(ventas) ? ventas.length : 0;
  const ingresosTotales = Array.isArray(ventas) ? ventas.reduce((acc: number, v: any) => acc + (v.totalFinal || 0), 0) : 0;
  const ticketPromedio = totalVentas > 0 ? ingresosTotales / totalVentas : 0;

  const vendidoEfectivo = Array.isArray(ventas) ? ventas.filter((v: any) => v.metodoPago === 'EFECTIVO' && v.estado !== 'ANULADA').reduce((acc, v) => acc + (v.totalFinal || 0), 0) : 0;
  const vendidoMP = Array.isArray(ventas) ? ventas.filter((v: any) => v.metodoPago !== 'EFECTIVO' && v.estado !== 'ANULADA').reduce((acc, v) => acc + (v.totalFinal || 0), 0) : 0;
  const totalEsperadoCaja = (caja?.montoInicial || 0) + vendidoEfectivo;

  const filteredProducts = Array.isArray(productos) ? productos.filter((p: any) =>
    (p.nombre || '').toLowerCase().includes(productSearch.toLowerCase())
  ) : [];

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900">
      
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Lateral Premium */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0f172a] text-white flex flex-col transition-transform duration-300 shadow-2xl lg:static lg:translate-x-0 lg:z-20 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Branding */}
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          {globalConfig?.logoUrl ? (
             <img src={globalConfig.logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-contain bg-white/10 backdrop-blur border border-white/20 p-1 shadow-inner shadow-white/20" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-xl shadow-inner shadow-white/20">
              T
            </div>
          )}
          <div className="flex-1 truncate">
            <h1 className="text-xl font-bold tracking-wide text-white leading-tight truncate">{globalConfig?.nombreEmpresa || 'Tulum'}</h1>
            <p className="text-xs font-medium text-blue-400 uppercase tracking-widest">Systems Core</p>
          </div>
        </div>
        
        {/* User Badge */}
        <div className="px-6 py-5 border-b border-white/5 bg-white/5">
          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1.5">
             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
             Sesión Activa
          </div>
          <div className="font-semibold text-slate-200 truncate flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            {esAdmin ? 'Administrador' : 'Operador'}
          </div>
        </div>

        {/* Navbar */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {!isOperador && (
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            Dashboard
          </button>
          )}

          {/* Acceso Directo Punto de Venta POS */}
          <button
            onClick={() => { setSidebarOpen(false); navigate('/pos'); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-black bg-emerald-600 text-white shadow-lg shadow-emerald-500/10 hover:bg-emerald-700 transition-all duration-200 hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            Punto de Venta (POS)
          </button>

          <button

            onClick={() => handleTabChange('products')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            Productos
          </button>
          
          <button
            onClick={() => handleTabChange('categories')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'categories'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
            Categorías
          </button>
          
          {(globalConfig?.clientesHabilitado ?? true) && (
            <button
              onClick={() => handleTabChange('clients')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === 'clients'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              Directorio Clientes
            </button>
          )}

          {esAdmin && (
            <button
              onClick={() => handleTabChange('usuarios')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === 'usuarios'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Gestión Usuarios
            </button>
          )}

          {!isOperador && (
          <button
            onClick={() => handleTabChange('sales')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'sales'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"></path></svg>
            Ventas / POS
          </button>
          )}

          {(globalConfig?.remitosHabilitado ?? true) && (
            <button
              onClick={() => handleTabChange('remitos')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === 'remitos'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path></svg>
              Hojas de Ruta
            </button>
          )}

          {esAdmin && (
            <div className="pt-2 border-t border-white/5">
              <button
                onClick={() => handleTabChange('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'settings'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Configuración
              </button>
            </div>
          )}
        </nav>


        <div className="p-6 border-t border-white/5 space-y-3">
          {caja && caja.estado === 'ABIERTA' ? (
            <button
              onClick={() => setIsClosingModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-amber-500 transition-colors bg-amber-500/10 rounded-xl hover:bg-amber-500 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              Cerrar Caja
            </button>
          ) : (
            <button
              onClick={() => setIsAperturaModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-emerald-500 transition-colors bg-emerald-500/10 rounded-xl hover:bg-emerald-500 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              Abrir Turno
            </button>
          )}
          {esAdmin && (
            <button
              onClick={() => setIsHistorialCajasOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-slate-400 transition-colors bg-white/5 rounded-xl hover:bg-slate-100 hover:text-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
              Historial de Cierres
            </button>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-400 transition-colors bg-white/5 rounded-xl hover:bg-red-500 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Desconectar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen relative z-10 bg-slate-50">
        
        {/* Topbar Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-4 lg:px-10 lg:py-6 flex items-center justify-between sticky top-0 z-10 gap-3">
           {/* Hamburger (mobile only) */}
           <button
             onClick={() => setSidebarOpen(true)}
             className="lg:hidden p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0"
             aria-label="Abrir menú"
           >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
           </button>

           <div className="min-w-0 flex-1">
             <h2 className="text-lg lg:text-2xl font-extrabold text-slate-800 tracking-tight truncate">{tabTitles[activeTab]}</h2>
             <p className="text-xs lg:text-sm font-medium text-slate-500 mt-0.5 hidden sm:block">Gestión administrativa y recursos del tenant.</p>
           </div>
           

        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-10 min-h-0">
          
          {/* TAB: PRODUCTOS */}
          {activeTab === 'products' && (
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {showProductForm || editingProduct ? (
                <div className="relative">
                  <button
                    onClick={() => { setShowProductForm(false); setEditingProduct(null); }}
                    className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-4"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Volver a Productos
                  </button>
                  <CreateProductForm 
                    onProductCreated={() => { handleProductCreated(); setEditingProduct(null); setShowProductForm(false); }} 
                    initialData={editingProduct}
                    onCancelEdit={() => { setEditingProduct(null); setShowProductForm(false); }}
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                      <input
                        type="text"
                        placeholder="Buscar productos..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium text-slate-700 transition-all"
                      />
                    </div>
                    <button
                      onClick={() => setShowProductForm(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-200 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                      Agregar Producto
                    </button>
                  </div>

                  <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-800">Catálogo de Productos</h3>
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{filteredProducts.length} Ítems</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm text-slate-600">
                        <thead className="bg-white border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-bold">
                          <tr>
                            <th className="px-6 py-4">Imagen</th>
                            <th className="px-6 py-4">Producto</th>
                            <th className="px-6 py-4">Categoría</th>
                            <th className="px-6 py-4 text-right">Precio Base</th>
                            <th className="px-6 py-4 text-center">Stock</th>
                            <th className="px-6 py-4 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredProducts.length > 0 ? filteredProducts.map((col: any, index: number) => (
                             <tr key={col.id} className={`transition-colors hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                               <td className="px-6 py-3">
                                  {col.imageUrl ? (
                                    <img src={col.imageUrl} alt={col.nombre} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 text-xs">Sin IMG</div>
                                  )}
                               </td>
                               <td className="px-6 py-4 font-bold text-slate-800">{col.nombre}</td>
                               <td className="px-6 py-4 font-medium text-slate-500">{col.categoria?.nombre || `ID: ${col.categoriaId}`}</td>
                               <td className="px-6 py-4 font-bold text-slate-800 text-right">${Number(col.precio).toFixed(2)}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                                    col.cantidadStock <= 0 ? 'bg-red-50 text-red-700 border-red-200' :
                                    col.stockMinimo > 0 && col.cantidadStock <= col.stockMinimo ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}>
                                    {col.cantidadStock} Unds.
                                  </span>
                                </td>
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
                             </tr>
                          )) : (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">No hay productos registrados.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </div>
          )}

          {/* TAB: CATEGORÍAS */}
          {activeTab === 'categories' && (
            <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CreateCategoryForm onCategoryCreated={handleCategoryCreated} />
              
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.isArray(categorias) && categorias.length > 0 ? categorias.map((col: any, index: number) => (
                         <tr key={col.id} className={`transition-colors hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                           <td className="px-6 py-4 font-mono text-slate-400">{col.id}</td>
                           <td className="px-6 py-4 font-semibold text-slate-700">
                             <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md border border-indigo-100">{col.nombre}</span>
                           </td>
                         </tr>
                      )) : (
                        <tr><td colSpan={2} className="px-6 py-8 text-center text-slate-400 italic">No hay categorías registradas.</td></tr>
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
                  <h3 className="text-lg font-bold text-slate-800">Directorio General</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-600">
                    <thead className="bg-white border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-bold">
                      <tr>
                        <th className="px-6 py-4 w-16">ID</th>
                        <th className="px-6 py-4">Nombre Completo</th>
                        <th className="px-6 py-4">Empresa (Opcional)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.isArray(clientes) && clientes.length > 0 ? clientes.map((col: any, index: number) => (
                         <tr key={col.id} className={`transition-colors hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                           <td className="px-6 py-4 font-mono text-slate-400">{col.id}</td>
                           <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                               {col.nombre.charAt(0)}{col.apellido.charAt(0)}
                             </div>
                             {col.nombre} {col.apellido}
                           </td>
                           <td className="px-6 py-4 font-medium text-slate-500">
                             {col.empresa ? (
                               <span className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-md text-xs">{col.empresa}</span>
                             ) : (
                               <span className="text-slate-300 italic">No especificada</span>
                             )}
                           </td>
                         </tr>
                      )) : (
                        <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">No hay clientes registrados.</td></tr>
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
          {activeTab === 'remitos' && <RemitosTab />}

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Stat Cards Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
                   <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Ventas</p>
                     <h3 className="text-2xl font-black text-slate-800">{totalVentas}</h3>
                   </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
                   <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ingresos Totales</p>
                     <h3 className="text-2xl font-black text-slate-800">${ingresosTotales.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                   </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
                   <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ticket Promedio</p>
                     <h3 className="text-2xl font-black text-slate-800">${ticketPromedio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                   </div>
                </div>
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

                {/* Alertas de Stock Mínimo */}
              <AlertasStock />

              {/* Monitor de Pedidos Online WhatsApp */}
              <MonitorPedidosOnline />


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
                      {Array.isArray(ventas) && ventas.length > 0 ? (
                        ventas.map((col: any, index: number) => {
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
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-blue-700 transition-all shadow-sm"
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
          )}

          {/* TAB: VENTAS HISTORIAL */}
          {activeTab === 'sales' && (
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
                       <option value="EFECTIVO">EFECTIVO</option>
                       <option value="MERCADO_PAGO">MERCADO PAGO</option>
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
                                <td className="px-6 py-4 text-center font-bold text-slate-400 text-xs">{col.metodoPago === 'MERCADO_PAGO' ? 'Digital' : 'Efectivo'}</td>
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

      {/* Modal de Bloqueo de Caja - Solo operador necesita turno abierto */}
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
              <div className="flex justify-between items-center text-blue-600">
                <span className="text-sm font-bold opacity-80">Vendido en Digital (MP):</span>
                <span className="font-mono font-bold">${vendidoMP.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between items-center text-slate-800">
                <span className="text-sm font-black uppercase tracking-wider">Total Esperado en Caja:</span>
                <span className="font-mono font-black text-lg">${totalEsperadoCaja.toFixed(2)}</span>
              </div>
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
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Historial de Cierres</h2>
              <button onClick={() => setIsHistorialCajasOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!Array.isArray(historialCajas) || historialCajas.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                  <p className="text-sm font-bold">No hay cierres registrados</p>
                </div>
              ) : (
                historialCajas.map((c: any) => (
                  <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${c.estado === 'ABIERTA' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {c.estado}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {c.fechaApertura ? new Date(c.fechaApertura).toLocaleString() : '-'}
                        {c.fechaCierre ? ` → ${new Date(c.fechaCierre).toLocaleString()}` : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div><span className="font-bold text-slate-400 block">Inicial</span><span className="font-black text-slate-700">${(c.montoInicial || 0).toFixed(2)}</span></div>
                      <div><span className="font-bold text-emerald-500 block">Efectivo</span><span className="font-black text-slate-700">${(c.montoVentasEfectivo || 0).toFixed(2)}</span></div>
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

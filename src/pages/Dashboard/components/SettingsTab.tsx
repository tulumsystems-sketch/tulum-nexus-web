import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import apiClient from '../../../api/axiosConfig';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

const formDesdeConfig = (config: any) => ({
  nombreEmpresa: config.nombreEmpresa || '',
  logoUrl: config.logoUrl || '',
  ivaPorcentaje: config.ivaPorcentaje != null ? String(config.ivaPorcentaje) : '21',
  margenAutomatico: config.margenPorDefecto != null,
  margenPorDefecto: config.margenPorDefecto != null ? String(config.margenPorDefecto) : '',
  aliasCobro: config.aliasCobro || '',
  pagoEfectivoHabilitado: config.pagoEfectivoHabilitado ?? true,
  pagoTransferenciaHabilitado: config.pagoTransferenciaHabilitado ?? false,
  pagoMercadoPagoHabilitado: config.pagoMercadoPagoHabilitado ?? true,
});

export const SettingsTab: React.FC = () => {
  const { data: config, mutate, isLoading } = useSWR('/config', fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
  });

  const [formData, setFormData] = useState({
    nombreEmpresa: '',
    logoUrl: '',
    ivaPorcentaje: '21',
    margenAutomatico: false,
    margenPorDefecto: '',
    aliasCobro: '',
    pagoEfectivoHabilitado: true,
    pagoTransferenciaHabilitado: false,
    pagoMercadoPagoHabilitado: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (config && !isSaving) {
      setFormData(formDesdeConfig(config));
    }
  }, [config, isSaving]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ text: '', type: '' });

    const ivaPorcentaje = Number(formData.ivaPorcentaje);
    const margenPorDefecto = Number(formData.margenPorDefecto);

    // El endpoint hace merge parcial: null significa "no tocar" y por eso el margen
    // automático se apaga con un flag explícito.
    const payload = {
      nombreEmpresa: formData.nombreEmpresa,
      logoUrl: formData.logoUrl,
      aliasCobro: formData.aliasCobro,
      ivaPorcentaje: Number.isFinite(ivaPorcentaje) ? ivaPorcentaje : null,
      margenPorDefecto: formData.margenAutomatico && Number.isFinite(margenPorDefecto) ? margenPorDefecto : null,
      limpiarMargenPorDefecto: !formData.margenAutomatico,
      pagoEfectivoHabilitado: formData.pagoEfectivoHabilitado,
      pagoTransferenciaHabilitado: formData.pagoTransferenciaHabilitado,
      pagoMercadoPagoHabilitado: formData.pagoMercadoPagoHabilitado,
    };

    try {
      const { data } = await apiClient.post('/config', payload);
      setFormData(formDesdeConfig(data));
      await mutate(data, { revalidate: false });
      setMessage({ text: 'Configuración actualizada con éxito.', type: 'success' });
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Error al guardar la configuración.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="text-slate-500 animate-pulse">Cargando preferencias...</div>;

  const inputClass = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div>
        <h2 className="text-2xl font-bold text-slate-800">Configuración del Negocio</h2>
        <p className="text-slate-500 text-sm mt-1">Personaliza la identidad, los impuestos y los medios de cobro de tu empresa.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg font-bold text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* SECCIÓN BRANDING */}
        <section className="bg-white p-4 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            Identidad de la Empresa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nombre Comercial</label>
              <input type="text" name="nombreEmpresa" value={formData.nombreEmpresa} onChange={handleChange} className={inputClass} placeholder="Ej. Tulum Systems" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">URL del Logo</label>
              <input type="text" name="logoUrl" value={formData.logoUrl} onChange={handleChange} className={inputClass} placeholder="https://ejemplo.com/logo.png" />
            </div>
          </div>
        </section>

        {/* SECCIÓN IMPUESTOS Y PRECIOS */}
        <section className="bg-white p-4 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m-6 4h6m-6 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"></path></svg>
            Impuestos y Precios
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">IVA aplicado a las ventas (%)</label>
              <input type="number" step="0.01" min="0" name="ivaPorcentaje" value={formData.ivaPorcentaje} onChange={handleChange} className={inputClass} placeholder="21" />
              <p className="mt-1.5 text-xs text-slate-400">
                Con 0 no se discrimina IVA: el total de la venta es igual al subtotal y el ticket no muestra el desglose.
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2 cursor-pointer">
                <input type="checkbox" name="margenAutomatico" checked={formData.margenAutomatico} onChange={handleChange} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                Calcular el precio de venta desde el costo
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="margenPorDefecto"
                value={formData.margenPorDefecto}
                onChange={handleChange}
                disabled={!formData.margenAutomatico}
                className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                placeholder="Ej. 15"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Margen por defecto sobre el costo. Sin esta opción, el precio de venta se carga a mano en cada producto.
              </p>
            </div>
          </div>
        </section>

        {/* SECCIÓN MEDIOS DE COBRO */}
        <section className="bg-white p-4 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
            Medios de Cobro
          </h3>

          <div className="space-y-3 mb-6">
            {[
              { name: 'pagoEfectivoHabilitado', label: 'Efectivo', descripcion: 'Entra al efectivo del cajón y al arqueo de caja.' },
              { name: 'pagoTransferenciaHabilitado', label: 'Transferencia', descripcion: 'Se acumula aparte: no entra al efectivo del cajón.' },
              { name: 'pagoMercadoPagoHabilitado', label: 'Mercado Pago', descripcion: 'Necesita credenciales cargadas para generar links de pago.' },
            ].map((metodo) => (
              <label key={metodo.name} className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  name={metodo.name}
                  checked={(formData as any)[metodo.name]}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-700">{metodo.label}</span>
                  <span className="block text-xs text-slate-400">{metodo.descripcion}</span>
                </span>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Alias o CBU para transferencias</label>
            <input type="text" name="aliasCobro" value={formData.aliasCobro} onChange={handleChange} className={inputClass} placeholder="Ej. mi.negocio.mp" />
            <p className="mt-1.5 text-xs text-slate-400">
              Si lo cargás, se imprime en el ticket de venta bajo la leyenda "Alias para transferencias".
            </p>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={isSaving} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 flex items-center gap-2">
            {isSaving ? (
              <>
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

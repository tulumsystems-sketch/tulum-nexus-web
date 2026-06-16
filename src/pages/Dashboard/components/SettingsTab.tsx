import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import apiClient from '../../../api/axiosConfig';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export const SettingsTab: React.FC = () => {
  const { data: config, mutate, isLoading } = useSWR('/config', fetcher);

  const [formData, setFormData] = useState({
    nombreEmpresa: '',
    logoUrl: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Cargar datos cuando lleguen del backend
  useEffect(() => {
    if (config) {
      setFormData({
        nombreEmpresa: config.nombreEmpresa || '',
        logoUrl: config.logoUrl || '',
      });
    }
  }, [config]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ text: '', type: '' });

    try {
      await apiClient.post('/config', formData);
      setMessage({ text: 'Configuración actualizada con éxito.', type: 'success' });
      mutate(); // Recarga los datos globales
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Error al guardar la configuración.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="text-slate-500 animate-pulse">Cargando preferencias...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div>
        <h2 className="text-2xl font-bold text-slate-800">Configuración del Negocio</h2>
        <p className="text-slate-500 text-sm mt-1">Personaliza la identidad de tu empresa.</p>
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
              <input type="text" name="nombreEmpresa" value={formData.nombreEmpresa} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700" placeholder="Ej. Tulum Systems" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">URL del Logo</label>
              <input type="text" name="logoUrl" value={formData.logoUrl} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700" placeholder="https://ejemplo.com/logo.png" />
            </div>
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
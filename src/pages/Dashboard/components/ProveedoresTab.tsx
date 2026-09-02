import React, { useState } from 'react';
import useSWR from 'swr';
import { Building2, Edit3, Plus, Trash2, X } from 'lucide-react';
import apiClient from '../../../api/axiosConfig';
import { AppButton } from '../../../components/ui/AppButton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SectionCard } from '../../../components/ui/SectionCard';
import { StatusPill } from '../../../components/ui/StatusPill';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

interface Proveedor {
  id: number;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  cuit?: string;
  observaciones?: string;
}

type ProveedorForm = Omit<Proveedor, 'id'>;

const emptyForm: ProveedorForm = {
  nombre: '',
  contacto: '',
  telefono: '',
  email: '',
  direccion: '',
  cuit: '',
  observaciones: '',
};

export const ProveedoresTab: React.FC = () => {
  const { data: proveedores, error, isLoading, mutate } = useSWR('/proveedores', fetcher);
  const [form, setForm] = useState<ProveedorForm>(emptyForm);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const proveedorList: Proveedor[] = Array.isArray(proveedores) ? proveedores : [];

  const updateField = (field: keyof ProveedorForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const handleEdit = (proveedor: Proveedor) => {
    setEditing(proveedor);
    setForm({
      nombre: proveedor.nombre || '',
      contacto: proveedor.contacto || '',
      telefono: proveedor.telefono || '',
      email: proveedor.email || '',
      direccion: proveedor.direccion || '',
      cuit: proveedor.cuit || '',
      observaciones: proveedor.observaciones || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    if (!form.nombre.trim()) {
      setFeedback({ type: 'error', message: 'El nombre del proveedor es obligatorio.' });
      return;
    }

    setIsSaving(true);
    try {
      if (editing) {
        await apiClient.put(`/proveedores/${editing.id}`, form);
        setFeedback({ type: 'success', message: 'Proveedor actualizado correctamente.' });
      } else {
        await apiClient.post('/proveedores', form);
        setFeedback({ type: 'success', message: 'Proveedor creado correctamente.' });
      }
      resetForm();
      await mutate();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'No pudimos guardar el proveedor.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Desea eliminar este proveedor?')) return;
    setFeedback(null);
    try {
      await apiClient.delete(`/proveedores/${id}`);
      await mutate();
      setFeedback({ type: 'success', message: 'Proveedor eliminado correctamente.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'No pudimos eliminar el proveedor.' });
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        description="Contactos y datos fiscales para compras."
        meta={<StatusPill label={`${proveedorList.length} proveedores activos`} tone="blue" />}
      />

      {feedback && <ErrorAlert type={feedback.type} message={feedback.message} />}

      <SectionCard
        title={editing ? 'Editar proveedor' : 'Nuevo proveedor'}
        description="Datos comerciales para compras y control operativo."
        action={editing && <AppButton type="button" variant="secondary" icon={X} onClick={resetForm}>Cancelar</AppButton>}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Nombre *</span>
            <input
              value={form.nombre}
              onChange={(e) => updateField('nombre', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              placeholder="Proveedor comercial"
              disabled={isSaving}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Contacto</span>
            <input value={form.contacto} onChange={(e) => updateField('contacto', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10" disabled={isSaving} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Telefono</span>
            <input value={form.telefono} onChange={(e) => updateField('telefono', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10" disabled={isSaving} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Email</span>
            <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10" disabled={isSaving} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">CUIT</span>
            <input value={form.cuit} onChange={(e) => updateField('cuit', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10" disabled={isSaving} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Direccion</span>
            <input value={form.direccion} onChange={(e) => updateField('direccion', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10" disabled={isSaving} />
          </label>
          <label className="block sm:col-span-2 lg:col-span-3">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Observaciones</span>
            <textarea value={form.observaciones} onChange={(e) => updateField('observaciones', e.target.value)} rows={2} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10" disabled={isSaving} />
          </label>
          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <AppButton disabled={isSaving} icon={Plus}>
              {isSaving ? 'Guardando...' : editing ? 'Actualizar proveedor' : 'Crear proveedor'}
            </AppButton>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Directorio de proveedores"
        description="Contactos y datos fiscales disponibles para el circuito de compras."
        action={<StatusPill label={`${proveedorList.length} activos`} tone="blue" />}
      >
        {isLoading ? (
          <div className="p-5"><LoadingState label="Cargando proveedores..." /></div>
        ) : error ? (
          <div className="p-5"><ErrorAlert message="No pudimos cargar los proveedores." /></div>
        ) : proveedorList.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No hay proveedores cargados" description="Agrega el primer proveedor para dejar lista la demo de compras." icon={Building2} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-4">Proveedor</th>
                  <th className="px-5 py-4">Contacto</th>
                  <th className="px-5 py-4">CUIT</th>
                  <th className="px-5 py-4">Telefono</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proveedorList.map((proveedor) => (
                  <tr key={proveedor.id} className="hover:bg-blue-50/30">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-black text-slate-900">{proveedor.nombre}</div>
                          <div className="text-xs font-medium text-slate-400">{proveedor.email || 'Sin email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold">{proveedor.contacto || '-'}</td>
                    <td className="px-5 py-4 font-mono text-xs">{proveedor.cuit || '-'}</td>
                    <td className="px-5 py-4">{proveedor.telefono || '-'}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => handleEdit(proveedor)} className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-blue-600 hover:bg-blue-600 hover:text-white" title="Editar proveedor">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(proveedor.id)} className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-500 hover:bg-red-600 hover:text-white" title="Eliminar proveedor">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { FileSearch } from 'lucide-react';
import apiClient from '../../../api/axiosConfig';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusPill } from '../../../components/ui/StatusPill';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

interface AuditLog {
  id: number;
  accion: string;
  entidad: string;
  entidadId: number;
  descripcion?: string;
  detalleAnterior?: string;
  detalleNuevo?: string;
  fecha?: string;
  usuario?: { email?: string; nombre?: string };
}

const acciones = ['', 'CREATE', 'UPDATE', 'DELETE'];
const entidades = ['', 'PRODUCTO', 'PROVEEDOR', 'CAJA', 'REMITO', 'COMPRA', 'VENTA'];

const getActionTone = (action: string) => {
  if (action === 'CREATE') return 'emerald';
  if (action === 'UPDATE') return 'blue';
  if (action === 'DELETE') return 'red';
  return 'slate';
};

export const AuditoriaTab: React.FC = () => {
  const [accion, setAccion] = useState('');
  const [entidad, setEntidad] = useState('');

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (accion) params.set('accion', accion);
    if (entidad) params.set('entidad', entidad);
    const query = params.toString();
    return query ? `/audit-log?${query}` : '/audit-log';
  }, [accion, entidad]);

  const { data, error, isLoading } = useSWR(endpoint, fetcher);
  const logs: AuditLog[] = Array.isArray(data) ? data : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        eyebrow="Control interno"
        title="Auditoria operativa"
        description="Revisa acciones criticas por usuario, entidad y detalle para dar confianza en demo y operacion real."
        icon={FileSearch}
        meta={<StatusPill label={`${logs.length} eventos`} tone="blue" />}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-800">Auditoria operativa</h3>
            <p className="text-sm font-medium text-slate-500">Registro de cambios criticos por usuario, entidad y accion.</p>
          </div>
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">
            <label className="w-full sm:w-56">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Entidad</span>
              <select value={entidad} onChange={(e) => setEntidad(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10">
                {entidades.map((value) => <option key={value || 'TODAS'} value={value}>{value || 'TODAS'}</option>)}
              </select>
            </label>
            <label className="w-full sm:w-56">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Accion</span>
              <select value={accion} onChange={(e) => setAccion(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10">
                {acciones.map((value) => <option key={value || 'TODAS'} value={value}>{value || 'TODAS'}</option>)}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h3 className="text-lg font-black text-slate-800">Eventos</h3>
          <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{logs.length} eventos</span>
        </div>

        {isLoading ? (
          <div className="p-5"><LoadingState label="Cargando auditoria..." /></div>
        ) : error ? (
          <div className="p-5"><ErrorAlert message="No pudimos cargar los eventos de auditoria." /></div>
        ) : logs.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Sin eventos de auditoria" description="Los cambios criticos apareceran aqui cuando el backend los registre." icon={FileSearch} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-white text-xs font-black uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-4">Fecha</th>
                  <th className="px-5 py-4">Accion</th>
                  <th className="px-5 py-4">Entidad</th>
                  <th className="px-5 py-4">Usuario</th>
                  <th className="px-5 py-4">Descripcion</th>
                  <th className="px-5 py-4">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold">{log.fecha ? new Date(log.fecha).toLocaleString('es-AR') : '-'}</td>
                    <td className="px-5 py-4"><StatusPill label={log.accion} tone={getActionTone(log.accion)} /></td>
                    <td className="px-5 py-4">
                      <div className="font-black text-slate-800">{log.entidad}</div>
                      <div className="font-mono text-xs text-slate-400">#{log.entidadId}</div>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-500">{log.usuario?.email || log.usuario?.nombre || '-'}</td>
                    <td className="px-5 py-4 max-w-md font-medium text-slate-600">{log.descripcion || '-'}</td>
                    <td className="px-5 py-4">
                      {(log.detalleAnterior || log.detalleNuevo) ? (
                        <details className="w-72 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                          <summary className="cursor-pointer font-black text-slate-700">Ver detalle</summary>
                          {log.detalleAnterior && (
                            <div className="mt-3">
                              <div className="mb-1 font-black uppercase text-slate-400">Anterior</div>
                              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-white p-2 font-mono text-slate-600">{log.detalleAnterior}</pre>
                            </div>
                          )}
                          {log.detalleNuevo && (
                            <div className="mt-3">
                              <div className="mb-1 font-black uppercase text-slate-400">Nuevo</div>
                              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-white p-2 font-mono text-slate-600">{log.detalleNuevo}</pre>
                            </div>
                          )}
                        </details>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Sin detalle</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

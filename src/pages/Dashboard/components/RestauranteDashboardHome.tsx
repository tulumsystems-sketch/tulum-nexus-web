import React, { useMemo } from 'react';
import useSWR from 'swr';
import {
  AlertTriangle,
  Bike,
  Clock3,
  DollarSign,
  LayoutGrid,
  UtensilsCrossed,
} from 'lucide-react';
import apiClient from '../../../api/axiosConfig';
import { AppButton } from '../../../components/ui/AppButton';
import { MetricCard } from '../../../components/ui/MetricCard';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusPill } from '../../../components/ui/StatusPill';
import { esPedidoEnvio, tienePlatosCocina } from '../../../utils/pedidosEnvio';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

const COCINA_ACTIVOS = new Set(['PENDIENTE', 'EN_PREPARACION', 'LISTO', 'EN_CAMINO']);

function minutosDesde(fecha: string | undefined): number {
  if (!fecha) return 0;
  const t = new Date(fecha).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 60000));
}

interface Props {
  nombreEmpresa?: string;
  cajaAbierta: boolean;
  cajaLabel?: string;
  onAbrirCaja: () => void;
  onCerrarCaja: () => void;
  onIrPedidos: () => void;
  onIrMesas: () => void;
  onIrPos: () => void;
  ingresosTotales: number;
}

export const RestauranteDashboardHome: React.FC<Props> = ({
  nombreEmpresa,
  cajaAbierta,
  cajaLabel,
  onAbrirCaja,
  onCerrarCaja,
  onIrPedidos,
  onIrMesas,
  onIrPos,
  ingresosTotales,
}) => {
  const { data: pedidosPage } = useSWR(
    '/ventas/search?page=0&size=80&soloPedidos=true&sort=fecha,desc',
    fetcher,
    { refreshInterval: 10000 }
  );
  const { data: mesas } = useSWR('/mesas', fetcher, { refreshInterval: 15000 });

  const pedidos = useMemo(
    () => (Array.isArray(pedidosPage?.content) ? pedidosPage.content.filter(tienePlatosCocina) : []),
    [pedidosPage]
  );

  const enCocina = pedidos.filter((p: any) => COCINA_ACTIVOS.has(String(p.estado || '').toUpperCase()));
  const listosSalida = pedidos.filter((p: any) => {
    const estado = String(p.estado || '').toUpperCase();
    return estado === 'LISTO' && esPedidoEnvio(p) && !p.repartidorUsuarioId;
  }).length;
  const enCamino = pedidos.filter((p: any) => String(p.estado || '').toUpperCase() === 'EN_CAMINO').length;
  const agingAmber = enCocina.filter((p: any) => {
    const m = minutosDesde(p.fecha);
    return m >= 20 && m < 40;
  }).length;
  const agingRed = enCocina.filter((p: any) => minutosDesde(p.fecha) >= 40).length;

  const listaMesas = Array.isArray(mesas) ? mesas : [];
  const ocupadas = listaMesas.filter((m: any) => String(m.estado || '').toUpperCase() === 'OCUPADA').length;
  const libres = listaMesas.filter((m: any) => String(m.estado || '').toUpperCase() === 'LIBRE').length;

  const porCanal = enCocina.reduce(
    (acc: Record<string, number>, p: any) => {
      const c = String(p.canal || 'OTRO').toUpperCase();
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        description={nombreEmpresa
          ? `${nombreEmpresa}: mesas, pedidos y mostrador en el mismo turno.`
          : 'Mesas, pedidos y mostrador en el mismo turno.'}
        meta={
          <div className="flex flex-wrap gap-2">
            <StatusPill label={cajaAbierta ? 'Turno abierto' : 'Turno cerrado'} tone={cajaAbierta ? 'emerald' : 'amber'} />
            {cajaLabel && <StatusPill label={cajaLabel} tone="slate" />}
            <StatusPill label={`${enCocina.length} en pedidos`} tone={enCocina.length ? 'blue' : 'slate'} />
            <StatusPill label={`${listosSalida} listos para salir`} tone={listosSalida ? 'indigo' : 'slate'} />
            <StatusPill label={`${enCamino} en camino`} tone={enCamino ? 'amber' : 'slate'} />
            <StatusPill
              label={`${ocupadas} mesas ocupadas`}
              tone={ocupadas ? 'amber' : 'emerald'}
            />
          </div>
        }
        action={
          cajaAbierta ? (
            <AppButton variant="secondary" onClick={onCerrarCaja}>
              Cerrar turno
            </AppButton>
          ) : (
            <AppButton variant="success" onClick={onAbrirCaja}>
              Abrir turno
            </AppButton>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="En cocina"
          value={enCocina.length}
          helper="Salón + delivery + retiro"
          icon={UtensilsCrossed}
          tone="blue"
        />
        <MetricCard
          label="Listos para salir"
          value={listosSalida}
          helper="Despachá desde cocina o asigná un cadete"
          icon={Bike}
          tone={listosSalida ? 'indigo' : 'slate'}
        />
        <MetricCard
          label="En camino"
          value={enCamino}
          helper="Envíos que ya salieron"
          icon={Clock3}
          tone={enCamino ? 'amber' : 'slate'}
        />
        <MetricCard
          label="Aging"
          value={`${agingAmber + agingRed}`}
          helper={`${agingAmber} +20min · ${agingRed} +40min`}
          icon={Clock3}
          tone={agingRed > 0 ? 'amber' : agingAmber > 0 ? 'amber' : 'slate'}
        />
        <MetricCard
          label="Mesas"
          value={`${ocupadas}/${listaMesas.length || 0}`}
          helper={`${libres} libres`}
          icon={LayoutGrid}
          tone={ocupadas ? 'indigo' : 'slate'}
        />
        <MetricCard
          label="Ingresos día"
          value={`$${ingresosTotales.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          helper="Facturación total del día"
          icon={DollarSign}
          tone="emerald"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={onIrMesas}
          className="rounded-2xl border border-tulum-accent/40 bg-tulum-accent/10 p-5 text-left"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-tulum-accent">Mesas</p>
          <p className="mt-1 text-lg font-semibold text-tulum-bone">Salón</p>
          <p className="mt-1 text-sm text-tulum-muted">Abrir mesa, cargar carta, cobrar</p>
        </button>
        <button
          type="button"
          onClick={onIrPedidos}
          className="rounded-2xl border border-tulum-border bg-tulum-surface p-5 text-left"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-tulum-muted">Pedidos</p>
          <p className="mt-1 text-lg font-semibold text-tulum-bone">Cocina</p>
          <p className="mt-1 text-sm text-tulum-muted">
            Salón {porCanal.SALON || 0} · Delivery {porCanal.DELIVERY || 0} · Retiro {porCanal.RETIRO || 0}
          </p>
        </button>
        <button
          type="button"
          onClick={onIrPos}
          className="rounded-2xl border border-tulum-border bg-tulum-surface p-5 text-left"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-tulum-muted">Mostrador</p>
          <p className="mt-1 text-lg font-semibold text-tulum-bone">Caja rápida</p>
          <p className="mt-1 text-sm text-tulum-muted">Venta sin mesa</p>
        </button>
      </div>

      {(agingAmber > 0 || agingRed > 0) && (
        <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            Hay pedidos demorados en cocina
            {agingRed > 0 ? ` (${agingRed} con más de 40 min)` : ` (${agingAmber} con más de 20 min)`}.
            Revisá el tablero.
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/88 shadow-xl shadow-black/25">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h3 className="text-lg font-black text-slate-100">Pedidos activos</h3>
          <AppButton variant="secondary" className="text-xs" onClick={onIrPedidos}>
            Ver todos
          </AppButton>
        </div>
        <ul className="divide-y divide-slate-800">
          {enCocina.slice(0, 8).map((p: any) => {
            const mins = minutosDesde(p.fecha);
            const tone =
              mins >= 40 ? 'text-red-300' : mins >= 20 ? 'text-amber-300' : 'text-slate-400';
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-100">
                    {p.nroComprobante || `#${p.id}`} · {p.canal}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {p.nombreContacto || p.telefonoContacto || 'Sin contacto'}
                    {p.direccionEntrega ? ` · ${p.direccionEntrega}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-black uppercase">
                  <span className={tone}>{mins} min</span>
                  <span className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300">
                    {p.estado}
                  </span>
                </div>
              </li>
            );
          })}
          {enCocina.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-slate-500">
              No hay pedidos en cocina. Cuando entre uno por WhatsApp o a mano, aparece acá.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Bike,
  CheckCircle2,
  LogOut,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import apiClient from '../../api/axiosConfig';
import { AppButton } from '../../components/ui/AppButton';
import { clearSession } from '../../utils/session';
import {
  PedidoListado,
  esPedidoEnvio,
  mapsUrl,
  nombrePedido,
  telefonoPedido,
  whatsappUrl,
} from '../../utils/pedidosEnvio';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

interface SalidaData {
  listos?: PedidoListado[];
  enCamino?: PedidoListado[];
}

const minutosDesde = (fecha?: string, ahora = Date.now()): number => {
  if (!fecha) return 0;
  return Math.max(0, Math.floor((ahora - new Date(fecha).getTime()) / 60000));
};

export const SalidaRider: React.FC = () => {
  const email = localStorage.getItem('email') || '';
  const [ahora] = useState(Date.now());
  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: config } = useSWR('/config', fetcher, { revalidateOnFocus: false });
  const { data, isLoading, mutate } = useSWR<SalidaData>('/ventas/salida', fetcher, {
    refreshInterval: 5000,
  });

  const listos = useMemo(
    () => (data?.listos ?? []).filter(esPedidoEnvio),
    [data]
  );
  const mios = useMemo(
    () => data?.enCamino ?? [],
    [data]
  );

  const accion = async (pedido: PedidoListado, fn: () => Promise<void>, ok: string) => {
    setGuardandoId(pedido.id);
    setError(null);
    setFeedback(null);
    try {
      await fn();
      await mutate();
      setFeedback(ok);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo completar la acción.');
      await mutate();
    } finally {
      setGuardandoId(null);
    }
  };

  const salir = () => {
    clearSession();
    window.location.href = '/login';
  };

  return (
    <div className="tulum-app min-h-screen bg-tulum-ink text-tulum-bone">
      <header className="sticky top-0 z-20 border-b border-tulum-border bg-tulum-ink px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-tulum-muted">Tulum Core</p>
            <h1 className="truncate text-lg font-semibold">{config?.nombreEmpresa || 'Tulum'}</h1>
            <p className="truncate text-xs text-tulum-muted">Salida · {email}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => mutate()}
              className="rounded-lg border border-tulum-border bg-tulum-surface p-2.5 text-tulum-bone"
              aria-label="Actualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={salir}
              className="rounded-lg border border-tulum-border bg-tulum-surface p-2.5 text-tulum-bone"
              aria-label="Salir"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-4 py-5 pb-24">
        {error && (
          <p className="rounded-xl border border-tulum-danger/30 bg-tulum-danger/10 px-4 py-3 text-sm font-medium text-tulum-danger">
            {error}
          </p>
        )}
        {feedback && (
          <p className="rounded-xl border border-tulum-success/30 bg-tulum-success/10 px-4 py-3 text-sm font-medium text-tulum-success">
            {feedback}
          </p>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-tulum-muted">Listos para salir</h2>
            <span className="rounded-full bg-tulum-elevated px-2 py-0.5 text-[11px] font-semibold text-tulum-muted">
              {listos.length}
            </span>
          </div>
          {isLoading && listos.length === 0 && mios.length === 0 ? (
            <p className="rounded-2xl border border-tulum-border bg-tulum-surface px-4 py-8 text-center text-sm text-tulum-muted">
              Cargando envíos…
            </p>
          ) : listos.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-tulum-border bg-tulum-surface px-4 py-8 text-center text-sm text-tulum-muted">
              No hay pedidos listos. Cuando cocina marque listo, aparecen acá.
            </p>
          ) : (
            <div className="space-y-3">
              {listos.map((pedido) => (
                <RiderCard
                  key={pedido.id}
                  pedido={pedido}
                  ahora={ahora}
                  guardando={guardandoId === pedido.id}
                  modo="cola"
                  onTomar={() =>
                    accion(
                      pedido,
                      () => apiClient.post(`/ventas/${pedido.id}/tomar`),
                      `Tomaste #${pedido.nroComprobante || pedido.id}. Pasá a retirar.`
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-tulum-muted">Mis envíos</h2>
            <span className="rounded-full bg-tulum-elevated px-2 py-0.5 text-[11px] font-semibold text-tulum-muted">
              {mios.length}
            </span>
          </div>
          {mios.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-tulum-border px-4 py-6 text-center text-sm text-tulum-muted">
              Cuando tomes un pedido, viaja con vos acá.
            </p>
          ) : (
            <div className="space-y-3">
              {mios.map((pedido) => (
                <RiderCard
                  key={pedido.id}
                  pedido={pedido}
                  ahora={ahora}
                  guardando={guardandoId === pedido.id}
                  modo="mio"
                  onCobrar={() =>
                    accion(
                      pedido,
                      () =>
                        apiClient.put(`/ventas/${pedido.id}/cobro`, {
                          cobrado: true,
                          metodoPago: pedido.metodoPago,
                        }),
                      `Pedido #${pedido.nroComprobante || pedido.id} cobrado.`
                    )
                  }
                  onEntregar={() =>
                    accion(
                      pedido,
                      () => apiClient.put(`/ventas/${pedido.id}/estado`, { estado: 'ENTREGADO' }),
                      `Entregaste #${pedido.nroComprobante || pedido.id}.`
                    )
                  }
                  onLiberar={() =>
                    accion(
                      pedido,
                      () => apiClient.post(`/ventas/${pedido.id}/liberar`),
                      'El pedido volvió a la cola.'
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const RiderCard: React.FC<{
  pedido: PedidoListado;
  ahora: number;
  guardando: boolean;
  modo: 'cola' | 'mio';
  onTomar?: () => void;
  onCobrar?: () => void;
  onEntregar?: () => void;
  onLiberar?: () => void;
}> = ({ pedido, ahora, guardando, modo, onTomar, onCobrar, onEntregar, onLiberar }) => {
  const nombre = nombrePedido(pedido);
  const telefono = telefonoPedido(pedido);
  const maps = mapsUrl(pedido.direccionEntrega);
  const wa = whatsappUrl(
    telefono,
    `Hola ${nombre}, soy el cadete de ${pedido.nroComprobante || 'tu pedido'}. Voy en camino.`
  );
  const mins = minutosDesde(pedido.fecha, ahora);

  return (
    <article className="rounded-2xl border border-tulum-border bg-tulum-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold text-tulum-accent">#{pedido.nroComprobante || pedido.id}</p>
          <h3 className="mt-1 text-lg font-semibold">{nombre}</h3>
          <p className="mt-1 text-xs font-medium text-tulum-muted">{mins} min · {pedido.canal}</p>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
            pedido.cobrado
              ? 'border-tulum-success/30 bg-tulum-success/15 text-tulum-success'
              : 'border-tulum-danger/30 bg-tulum-danger/15 text-tulum-danger'
          }`}
        >
          {pedido.cobrado ? 'Cobrado' : 'Cobrar'}
        </span>
      </div>

      {pedido.direccionEntrega && (
        <p className="mb-2 flex items-start gap-2 text-sm text-tulum-bone">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-tulum-accent" />
          {pedido.direccionEntrega}
        </p>
      )}
      {telefono && (
        <p className="mb-3 flex items-center gap-2 text-sm text-tulum-muted">
          <Phone className="h-4 w-4 text-tulum-success" />
          {telefono}
        </p>
      )}

      <ul className="mb-3 space-y-1 border-t border-tulum-border pt-3 text-sm">
        {(pedido.items || []).map((item, index) => (
          <li key={`${pedido.id}-${index}`} className="text-tulum-muted">
            <span className="font-semibold text-tulum-bone">{item.cantidad}×</span> {item.producto}
            {item.observaciones ? <span className="block text-[11px] text-tulum-warning">* {item.observaciones}</span> : null}
          </li>
        ))}
      </ul>

      <p className="mb-3 text-xl font-bold">
        ${Number(pedido.totalFinal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {maps && (
          <a
            href={maps}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-lg border border-tulum-border bg-tulum-elevated text-sm font-semibold text-tulum-bone"
          >
            <Navigation className="h-4 w-4" />
            Maps
          </a>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-lg border border-tulum-success/40 bg-tulum-success/15 text-sm font-semibold text-tulum-success"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        )}
      </div>

      <div className="mt-2 space-y-2">
        {modo === 'cola' && onTomar && (
          <AppButton
            className="min-h-12 w-full text-base"
            variant="success"
            icon={Bike}
            disabled={guardando}
            onClick={onTomar}
          >
            {guardando ? 'Tomando...' : 'Tomar pedido'}
          </AppButton>
        )}
        {modo === 'mio' && (
          <>
            {!pedido.cobrado && onCobrar && (
              <AppButton
                className="min-h-12 w-full"
                variant="secondary"
                icon={Wallet}
                disabled={guardando}
                onClick={onCobrar}
              >
                {guardando ? '...' : 'Marcar cobrado'}
              </AppButton>
            )}
            {onEntregar && (
              <AppButton
                className="min-h-12 w-full text-base"
                variant="success"
                icon={CheckCircle2}
                disabled={guardando}
                onClick={onEntregar}
              >
                {guardando ? '...' : 'Entregado'}
              </AppButton>
            )}
            {pedido.puedeLiberar && onLiberar && (
              <button
                type="button"
                disabled={guardando}
                onClick={onLiberar}
                className="w-full py-2 text-xs font-medium text-tulum-muted hover:text-tulum-bone disabled:opacity-50"
              >
                Devolver a la cola
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
};

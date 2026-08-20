import React from 'react';
import { formatCantidad } from '../../../../utils/cantidad';

export interface RemitoItemResumen {
  id?: number;
  cantidad: number;
  descripcion?: string;
  precioUnitario?: number;
  totalLinea?: number;
  producto?: { nombre?: string };
}

interface RemitoItemsResumenProps {
  items: RemitoItemResumen[];
  expandido: boolean;
  onToggle: () => void;
  formatMoney: (value: number | null | undefined) => string;
  limite?: number;
}

export const RemitoItemsResumen: React.FC<RemitoItemsResumenProps> = ({
  items,
  expandido,
  onToggle,
  formatMoney,
  limite,
}) => {
  const lista = Array.isArray(items) ? items : [];
  const limiteEfectivo = limite ?? (lista.length > 8 ? 0 : 3);
  const hayMas = lista.length > limiteEfectivo;
  const visibles = expandido || !hayMas ? lista : lista.slice(0, limiteEfectivo);
  const ocultos = Math.max(0, lista.length - limiteEfectivo);
  const total = lista.reduce((acc, item) => acc + Number(item.totalLinea || 0), 0);

  return (
    <div className="pt-3 border-t border-slate-50">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black text-slate-400 uppercase">
          {lista.length} ítems
          {lista.length > 0 && (
            <span className="ml-1 font-bold text-slate-500">· {formatMoney(total)}</span>
          )}
        </p>
        {hayMas && (
          <button
            type="button"
            onClick={onToggle}
            className="text-[10px] font-black uppercase tracking-wide text-blue-600 hover:text-blue-800"
          >
            {expandido ? 'Ocultar ítems' : (limiteEfectivo === 0 ? 'Ver detalle' : `Ver ${ocultos} más`)}
          </button>
        )}
      </div>
      {visibles.length > 0 && (
        <ul className="max-h-48 space-y-0.5 overflow-y-auto text-xs">
          {visibles.map((item, index) => (
            <li key={item.id ?? index} className="flex items-baseline justify-between gap-2 rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-50">
              <div className="min-w-0 truncate">
                <span className="font-black text-slate-800">{formatCantidad(item.cantidad)}</span>
                <span className="mx-1 text-slate-300">×</span>
                <span className="font-semibold text-slate-700">{item.producto?.nombre || 'Producto'}</span>
                {item.descripcion && <span className="ml-1 italic text-slate-400">({item.descripcion})</span>}
              </div>
              <div className="shrink-0 font-black tabular-nums text-emerald-700">{formatMoney(item.totalLinea)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

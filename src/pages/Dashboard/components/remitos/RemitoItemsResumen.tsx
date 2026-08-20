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
  limite = 3,
}) => {
  const lista = Array.isArray(items) ? items : [];
  const hayMas = lista.length > limite;
  const visibles = expandido || !hayMas ? lista : lista.slice(0, limite);
  const ocultos = Math.max(0, lista.length - limite);

  return (
    <div className="pt-3 border-t border-slate-50">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black text-slate-400 uppercase">
          Ítems ({lista.length})
        </p>
        {hayMas && (
          <button
            type="button"
            onClick={onToggle}
            className="text-[10px] font-black uppercase tracking-wide text-blue-600 hover:text-blue-800"
          >
            {expandido ? 'Ver menos' : `Ver ${ocultos} más`}
          </button>
        )}
      </div>
      <ul className="space-y-1 text-xs">
        {visibles.map((item, index) => (
          <li key={item.id ?? index} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-slate-600">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-slate-800">
                  <span className="font-black mr-1">{formatCantidad(item.cantidad)} ×</span>
                  {item.producto?.nombre || 'Producto'}
                </div>
                {item.descripcion && <div className="text-[10px] italic text-slate-400 truncate">{item.descripcion}</div>}
              </div>
              <div className="text-right tabular-nums">
                <div className="text-[10px] font-bold text-slate-400">{formatMoney(item.precioUnitario)} c/u</div>
                <div className="font-black text-emerald-700">{formatMoney(item.totalLinea)}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

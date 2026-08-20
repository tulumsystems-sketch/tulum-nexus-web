import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import apiClient from '../../../../api/axiosConfig';
import { formatCantidad } from '../../../../utils/cantidad';

export interface ProductoBusqueda {
  id: number;
  nombre: string;
  precio?: number;
  cantidadStock?: number;
  descripcion?: string;
  medidas?: string;
  categoria?: { id?: number; nombre?: string };
}

interface ProductoBuscadorProps {
  value: number | string;
  productoSeleccionado?: ProductoBusqueda | null;
  onSelect: (producto: ProductoBusqueda | null) => void;
  formatMoney: (value: number | null | undefined) => string;
}

export const ProductoBuscador: React.FC<ProductoBuscadorProps> = ({ value, productoSeleccionado, onSelect, formatMoney }) => {
  const [query, setQuery] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [resultados, setResultados] = useState<ProductoBusqueda[]>([]);
  const [cargando, setCargando] = useState(false);
  const [seleccionado, setSeleccionado] = useState<ProductoBusqueda | null>(null);
  const cajaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value === '' || value == null) {
      setSeleccionado(null);
      setQuery('');
      return;
    }
    if (productoSeleccionado && String(productoSeleccionado.id) === String(value)) {
      setSeleccionado(productoSeleccionado);
      setQuery(productoSeleccionado.nombre);
    }
  }, [value, productoSeleccionado]);

  useEffect(() => {
    const texto = query.trim();
    if (!abierto || texto.length === 0) {
      setResultados([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setCargando(true);
      try {
        const res = await apiClient.get('/productos/buscar', { params: { q: texto } });
        setResultados(Array.isArray(res.data) ? res.data : []);
      } catch {
        setResultados([]);
      } finally {
        setCargando(false);
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query, abierto]);

  useEffect(() => {
    const cerrar = (event: MouseEvent) => {
      if (cajaRef.current && !cajaRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  const etiqueta = (producto: ProductoBusqueda) => {
    const extra = [producto.categoria?.nombre, producto.medidas, producto.descripcion]
      .filter((parte) => parte && String(parte).trim() !== '')
      .join(' · ');
    return extra ? `${producto.nombre} · ${extra}` : producto.nombre;
  };

  return (
    <div ref={cajaRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          value={abierto ? query : (seleccionado ? seleccionado.nombre : query)}
          onChange={(e) => {
            setQuery(e.target.value);
            setAbierto(true);
            if (seleccionado) {
              setSeleccionado(null);
              onSelect(null);
            }
          }}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar por nombre, categoría o marca"
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs font-bold text-slate-700 outline-none"
        />
      </div>
      {abierto && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {query.trim() === '' && (
            <p className="px-3 py-2 text-[11px] font-semibold text-slate-400">Escribí nombre, categoría o marca.</p>
          )}
          {cargando && <p className="px-3 py-2 text-[11px] font-semibold text-slate-400">Buscando...</p>}
          {!cargando && query.trim() !== '' && resultados.length === 0 && (
            <p className="px-3 py-2 text-[11px] font-semibold text-slate-400">Sin resultados.</p>
          )}
          {resultados.map((producto) => (
            <button
              key={producto.id}
              type="button"
              onClick={() => {
                setSeleccionado(producto);
                setQuery(producto.nombre);
                setAbierto(false);
                onSelect(producto);
              }}
              className="flex w-full flex-col items-start gap-0.5 border-b border-slate-50 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
            >
              <span className="text-xs font-black text-slate-800">{etiqueta(producto)}</span>
              <span className="text-[10px] font-bold text-slate-400">
                {formatMoney(producto.precio)} · Stock {formatCantidad(producto.cantidadStock)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

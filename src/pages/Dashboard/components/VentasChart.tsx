import React from 'react';
import useSWR from 'swr';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Clock, AlertCircle } from 'lucide-react';
import apiClient from '../../../api/axiosConfig';


const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export const VentasChart: React.FC = () => {
  const { data: historial, error, isLoading } = useSWR('/ventas/stats/resumen-semanal', fetcher);

  // Helper para procesar la data del historial
  const processData = (rawList: any[]) => {
    if (!Array.isArray(rawList)) return [];

    return rawList.map((item) => {
      if (!item.fecha) return { fecha: '-', efectivo: 0, mercadopago: 0 };

      const dateObj = new Date(item.fecha);
      const dayLabel = dateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

      return {
        fecha: dayLabel,
        efectivo: item.efectivo || 0,
        mercadopago: item.mercadoPago || 0, // capitalizado P
      };
    });
  };


  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center animate-pulse h-80">
        <Clock className="w-5 h-5 animate-spin text-blue-500 mr-2" />
        <p className="text-slate-500 text-sm font-bold">Cargando estadísticas de venta...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center h-80 text-red-500 text-sm font-medium">
        <AlertCircle className="w-5 h-5 mr-2" /> No pudimos cargar el resumen de ventas.
      </div>
    );
  }

  const chartData = processData(historial || []);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="mb-6">
        <h3 className="text-lg font-black text-slate-800 tracking-tight">Ventas por Día (Última Semana)</h3>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">Reporte consolidado de facturación apilada.</p>
      </div>

      {chartData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-300 shadow-sm">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="font-bold text-slate-700">Todavia no hay ventas para graficar</p>
          <p className="mt-1 text-sm font-medium text-slate-500">Cuando registres operaciones, el resumen semanal aparecera aca.</p>
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="fecha"
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'black' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
                formatter={(value) => [`$${value}`, '']}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 'bold' }}
              />
              <Bar
                dataKey="efectivo"
                stackId="a"
                fill="#10b981"
                name="Efectivo"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="mercadopago"
                stackId="a"
                fill="#3b82f6"
                name="Mercado Pago"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

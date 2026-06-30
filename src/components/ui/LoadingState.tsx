import React from 'react';

interface LoadingStateProps {
  label?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ label = 'Cargando datos...' }) => (
  <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-10 text-slate-500">
    <div className="flex items-center gap-3 text-sm font-bold">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      {label}
    </div>
  </div>
);

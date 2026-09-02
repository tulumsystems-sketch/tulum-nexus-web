import React from 'react';

interface LoadingStateProps {
  label?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ label = 'Cargando datos...' }) => (
  <div className="flex items-center justify-center rounded-lg border border-tulum-border bg-tulum-surface p-10 text-tulum-muted">
    <div className="flex items-center gap-3 text-sm font-semibold">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-tulum-border border-t-tulum-accent" />
      {label}
    </div>
  </div>
);

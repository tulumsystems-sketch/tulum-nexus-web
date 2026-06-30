import React from 'react';
import { Inbox, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
  compact = false,
}) => (
  <div className={`relative overflow-hidden flex flex-col items-center justify-center text-center border border-dashed border-slate-200 bg-white rounded-2xl shadow-sm ${compact ? 'p-8' : 'p-12'}`}>
    <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white text-slate-400 shadow-sm">
      <Icon className="h-7 w-7" />
    </div>
    <h3 className="text-lg font-black text-slate-900">{title}</h3>
    {description && <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

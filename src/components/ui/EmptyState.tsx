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
  <div
    className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-tulum-border bg-tulum-surface text-center ${compact ? 'p-8' : 'p-12'}`}
  >
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-tulum-border bg-tulum-elevated text-tulum-muted">
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="text-lg font-semibold text-tulum-bone">{title}</h3>
    {description && (
      <p className="mt-2 max-w-md text-sm font-medium leading-6 text-tulum-muted">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

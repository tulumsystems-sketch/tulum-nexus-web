import React from 'react';
import { LucideIcon } from 'lucide-react';

type Tone = 'blue' | 'emerald' | 'indigo' | 'amber' | 'slate';

interface MetricCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  blue: 'text-tulum-accent border-tulum-accent/30 bg-tulum-accent/10',
  indigo: 'text-tulum-accent border-tulum-accent/30 bg-tulum-accent/10',
  emerald: 'text-tulum-success border-tulum-success/30 bg-tulum-success/10',
  amber: 'text-tulum-warning border-tulum-warning/30 bg-tulum-warning/10',
  slate: 'text-tulum-muted border-tulum-border bg-tulum-elevated',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'blue',
}) => (
  <div className="rounded-2xl border border-tulum-border bg-tulum-surface p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-tulum-muted">{label}</p>
        <div className="mt-3 text-2xl font-semibold tracking-tight text-tulum-bone">{value}</div>
        {helper && <p className="mt-2 text-sm font-medium text-tulum-muted">{helper}</p>}
      </div>
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

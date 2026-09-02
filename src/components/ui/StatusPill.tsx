import React from 'react';

type Tone = 'slate' | 'blue' | 'emerald' | 'amber' | 'red' | 'indigo';

interface StatusPillProps {
  label: string;
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  slate: 'border-tulum-border bg-tulum-elevated text-tulum-muted before:bg-tulum-muted',
  blue: 'border-tulum-accent/30 bg-tulum-accent/15 text-tulum-accent before:bg-tulum-accent',
  indigo: 'border-tulum-accent/30 bg-tulum-accent/15 text-tulum-accent before:bg-tulum-accent',
  emerald: 'border-tulum-success/30 bg-tulum-success/15 text-tulum-success before:bg-tulum-success',
  amber: 'border-tulum-warning/30 bg-tulum-warning/15 text-tulum-warning before:bg-tulum-warning',
  red: 'border-tulum-danger/30 bg-tulum-danger/15 text-tulum-danger before:bg-tulum-danger',
};

export const StatusPill: React.FC<StatusPillProps> = ({ label, tone = 'slate' }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide before:h-1.5 before:w-1.5 before:rounded-full ${tones[tone]}`}
  >
    {label}
  </span>
);

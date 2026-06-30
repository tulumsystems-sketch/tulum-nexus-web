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

const toneClasses: Record<Tone, { icon: string; line: string }> = {
  blue: { icon: 'bg-blue-50 text-blue-600 border-blue-100', line: 'from-blue-500 to-cyan-400' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600 border-emerald-100', line: 'from-emerald-500 to-teal-400' },
  indigo: { icon: 'bg-indigo-50 text-indigo-600 border-indigo-100', line: 'from-indigo-500 to-blue-400' },
  amber: { icon: 'bg-amber-50 text-amber-600 border-amber-100', line: 'from-amber-500 to-orange-400' },
  slate: { icon: 'bg-slate-100 text-slate-700 border-slate-200', line: 'from-slate-700 to-slate-400' },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'blue',
}) => {
  const classes = toneClasses[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${classes.line}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</div>
          {helper && <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>}
        </div>
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border ${classes.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

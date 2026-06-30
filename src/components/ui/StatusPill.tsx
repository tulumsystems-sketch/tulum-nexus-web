import React from 'react';

type Tone = 'slate' | 'blue' | 'emerald' | 'amber' | 'red' | 'indigo';

interface StatusPillProps {
  label: string;
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200 before:bg-slate-400',
  blue: 'bg-blue-50 text-blue-700 border-blue-200 before:bg-blue-500',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 before:bg-emerald-500',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 before:bg-amber-500',
  red: 'bg-red-50 text-red-700 border-red-200 before:bg-red-500',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 before:bg-indigo-500',
};

export const StatusPill: React.FC<StatusPillProps> = ({ label, tone = 'slate' }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide before:h-1.5 before:w-1.5 before:rounded-full ${tones[tone]}`}>
    {label}
  </span>
);

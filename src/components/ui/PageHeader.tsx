import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  meta?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
  meta,
}) => (
  <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 px-6 py-6 text-white shadow-xl shadow-slate-200 sm:px-8">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.35),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.25),transparent_28%)]" />
    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-blue-100 shadow-inner">
            <Icon className="h-7 w-7" />
          </div>
        )}
        <div>
          {eyebrow && <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">{eyebrow}</p>}
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-300">{description}</p>}
          {meta && <div className="mt-4">{meta}</div>}
        </div>
      </div>
      {action && <div className="relative flex-shrink-0">{action}</div>}
    </div>
  </section>
);

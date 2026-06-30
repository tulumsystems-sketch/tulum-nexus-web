import React from 'react';

interface SectionCardProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  action,
  children,
  className = '',
  bodyClassName = '',
}) => (
  <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70 ${className}`}>
    {(title || description || action) && (
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {title && <h3 className="text-lg font-black tracking-tight text-slate-900">{title}</h3>}
          {description && <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

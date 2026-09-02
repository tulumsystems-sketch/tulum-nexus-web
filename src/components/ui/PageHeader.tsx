import React from 'react';

interface PageHeaderProps {
  description?: string;
  action?: React.ReactNode;
  meta?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  description,
  action,
  meta,
}) => {
  if (!description && !action && !meta) return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        {description && (
          <p className="max-w-2xl text-sm font-medium leading-6 text-tulum-muted">{description}</p>
        )}
        {meta}
      </div>
      {action ? <div className="flex-shrink-0">{action}</div> : null}
    </div>
  );
};

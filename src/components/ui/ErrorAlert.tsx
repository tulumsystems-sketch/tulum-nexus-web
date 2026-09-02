import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface ErrorAlertProps {
  type?: 'error' | 'success' | 'info';
  title?: string;
  message: string;
}

const toneClasses = {
  error: 'border-tulum-danger/30 bg-tulum-danger/10 text-tulum-danger',
  success: 'border-tulum-success/30 bg-tulum-success/10 text-tulum-success',
  info: 'border-tulum-accent/30 bg-tulum-accent/10 text-tulum-accent',
};

const icons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ type = 'error', title, message }) => {
  const Icon = icons[type];

  return (
    <div className={`flex gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${toneClasses[type]}`} role="alert">
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div>
        {title && <div className="font-semibold">{title}</div>}
        <div>{message}</div>
      </div>
    </div>
  );
};

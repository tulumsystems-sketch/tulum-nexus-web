import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface ErrorAlertProps {
  type?: 'error' | 'success' | 'info';
  title?: string;
  message: string;
}

const toneClasses = {
  error: 'border-red-200 bg-red-50 text-red-700 shadow-red-100',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-emerald-100',
  info: 'border-blue-200 bg-blue-50 text-blue-700 shadow-blue-100',
};

const icons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ type = 'error', title, message }) => {
  const Icon = icons[type];

  return (
    <div className={`flex gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ${toneClasses[type]}`} role="alert">
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div>
        {title && <div className="font-black">{title}</div>}
        <div>{message}</div>
      </div>
    </div>
  );
};

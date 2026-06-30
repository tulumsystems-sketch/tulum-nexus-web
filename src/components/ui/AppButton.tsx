import React from 'react';
import { LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'dark';

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700',
  secondary: 'bg-white text-slate-700 border border-slate-200 shadow-slate-200/70 hover:bg-slate-50',
  danger: 'bg-red-600 text-white shadow-red-500/20 hover:bg-red-700',
  success: 'bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-700',
  dark: 'bg-slate-950 text-white shadow-slate-500/20 hover:bg-slate-800',
};

export const AppButton: React.FC<AppButtonProps> = ({
  icon: Icon,
  variant = 'primary',
  className = '',
  children,
  ...props
}) => (
  <button
    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    {...props}
  >
    {Icon && <Icon className="h-4 w-4" />}
    {children}
  </button>
);

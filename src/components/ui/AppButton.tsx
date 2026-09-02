import React from 'react';
import { LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'dark';

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-tulum-accent text-white hover:bg-tulum-accent-hover',
  secondary: 'border border-tulum-border bg-tulum-elevated text-tulum-bone hover:bg-tulum-surface',
  danger: 'bg-tulum-danger text-white hover:opacity-90',
  success: 'bg-tulum-success text-white hover:opacity-90',
  dark: 'border border-tulum-border bg-tulum-ink text-tulum-bone hover:bg-tulum-elevated',
};

export const AppButton: React.FC<AppButtonProps> = ({
  icon: Icon,
  variant = 'primary',
  className = '',
  children,
  ...props
}) => (
  <button
    className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    {...props}
  >
    {Icon && <Icon className="h-4 w-4" />}
    {children}
  </button>
);

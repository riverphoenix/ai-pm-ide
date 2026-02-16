import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  // Base styles
  const baseStyles = 'font-normal rounded transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-codex-accent disabled:opacity-40 disabled:cursor-not-allowed';

  // Variant styles
  const variantStyles = {
    primary: 'bg-codex-accent hover:bg-codex-accent-hover text-white',
    secondary: 'bg-codex-surface hover:bg-codex-surface-hover text-codex-text-primary border border-codex-border',
    ghost: 'text-codex-text-secondary hover:bg-codex-surface hover:text-codex-text-primary',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-[11px]',
    lg: 'px-3 py-1.5 text-sm'
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  return (
    <button
      className={combinedClassName}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

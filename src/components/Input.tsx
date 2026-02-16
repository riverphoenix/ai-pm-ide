import { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export default function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}: InputProps) {
  const baseStyles = 'w-full px-2 py-1 bg-codex-bg border rounded text-codex-text-primary text-sm placeholder-codex-text-dimmed transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-codex-accent focus:border-codex-accent disabled:opacity-40 disabled:cursor-not-allowed';

  const borderStyles = error
    ? 'border-red-500 focus:ring-red-500'
    : 'border-codex-border';

  const inputWithIcons = leftIcon || rightIcon;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-normal text-codex-text-muted mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-codex-text-muted">
            {leftIcon}
          </div>
        )}

        <input
          className={`${baseStyles} ${borderStyles} ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${className}`}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-codex-text-muted">
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      )}

      {helperText && !error && (
        <p className="mt-1.5 text-xs text-codex-text-muted">{helperText}</p>
      )}
    </div>
  );
}

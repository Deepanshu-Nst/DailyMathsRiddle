import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth, loading, children, disabled, ...props }, ref) => {
    const baseStyles = 'btn';

    const variantStyles = {
      primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_12px_40px_rgba(244,162,58,0.18)]',
      secondary: 'bg-white/[0.05] text-text-1 border border-white/[0.1] hover:bg-white/[0.08] active:bg-white/[0.06]',
      ghost: 'bg-transparent text-text-2 hover:text-text-1 hover:bg-white/[0.04]',
      danger: 'bg-error text-white hover:bg-red-600 shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
      success: 'bg-success text-white hover:bg-green-600 shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-[13px]',
      md: 'px-4 py-2 text-[14px]',
      lg: 'px-5 py-2.5 text-[15px]',
    };

    const styles = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth ? 'w-full' : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <button ref={ref} className={styles} disabled={disabled || loading} {...props}>
        {loading && (
          <svg className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  iconOnly?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth, loading, iconOnly, children, disabled, ...props }, ref) => {
    const baseStyles = 'btn';

    const variantStyles = {
      primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_8px_24px_rgba(108,123,255,0.2)] hover:shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_12px_32px_rgba(108,123,255,0.3)]',
      secondary: 'bg-white/[0.05] text-text-1 border border-white/[0.1] hover:bg-white/[0.08] active:bg-white/[0.06] hover:border-white/[0.15]',
      ghost: 'bg-transparent text-text-2 hover:text-text-1 hover:bg-white/[0.04]',
      danger: 'bg-error text-white hover:bg-red-600 shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_8px_24px_rgba(248,113,113,0.15)]',
      success: 'bg-success text-white hover:bg-green-600 shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_8px_24px_rgba(52,211,153,0.15)]',
    };

    const sizeStyles = {
      sm: iconOnly ? 'p-2 text-[13px]' : 'px-3.5 py-1.5 text-[13px]',
      md: iconOnly ? 'p-2.5 text-[14px]' : 'px-5 py-2.5 text-[14px]',
      lg: iconOnly ? 'p-3 text-[16px]' : 'px-7 py-3 text-[16px]',
    };

    const styles = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth ? 'w-full' : '',
      iconOnly ? 'rounded-xl' : '',
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

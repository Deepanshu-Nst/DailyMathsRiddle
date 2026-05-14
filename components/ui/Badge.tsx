import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'secondary',
  className,
  size = 'md',
  dot = false,
}) => {
  const variantStyles = {
    primary: 'bg-primary/8 text-primary ring-primary/10',
    secondary: 'bg-bg-muted text-text-2 ring-border',
    success: 'bg-success/8 text-success ring-success/10',
    danger: 'bg-error/8 text-error ring-error/10',
    warning: 'bg-warning/8 text-warning ring-warning/10',
    info: 'bg-info/8 text-info ring-info/10',
  };

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-[11px]',
    lg: 'px-3 py-1 text-[13px]',
  };

  const styles = [
    'inline-flex items-center gap-1.5 rounded-md font-semibold ring-1 ring-inset',
    variantStyles[variant],
    sizeStyles[size],
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={styles}>
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      )}
      {children}
    </span>
  );
};

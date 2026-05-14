import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  title?: string;
  variant?: 'default' | 'elevated' | 'sunken' | 'ghost';
  hoverable?: boolean;
}

const paddingMap = {
  none: 'p-0',
  sm: 'p-3.5',
  md: 'p-5',
  lg: 'p-7',
};

export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
  bordered = true,
  title,
  variant = 'default',
  hoverable = false,
}) => {
  const variantStyles = {
    default: 'card',
    elevated: 'card card-elevated',
    sunken: 'card-sunken border border-border-subtle',
    ghost: 'bg-transparent border border-dashed border-border',
  };

  const styles = [
    variantStyles[variant],
    hoverable ? 'card-hoverable cursor-pointer' : '',
    bordered ? '' : 'border-none',
    title ? '' : paddingMap[padding],
    'overflow-hidden',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={styles}>
      {title && (
        <div className="px-5 py-3 border-b border-border-subtle bg-bg-subtle/60">
          <h3 className="text-[11px] font-semibold text-text-3 uppercase tracking-[0.06em]">{title}</h3>
        </div>
      )}
      <div className={title ? paddingMap[padding] : ''}>
        {children}
      </div>
    </div>
  );
};

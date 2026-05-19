import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={['skeleton-shimmer', className].filter(Boolean).join(' ')} />
);

export const SkeletonGroup: React.FC<{
  count?: number;
  className?: string;
  itemClassName?: string;
  gap?: string;
}> = ({ count = 3, className, itemClassName, gap = 'gap-3' }) => (
  <div className={['flex flex-col', gap, className].filter(Boolean).join(' ')}>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} className={itemClassName || 'h-12 w-full'} />
    ))}
  </div>
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className }) => {
  const widths = ['w-full', 'w-[92%]', 'w-[78%]', 'w-[85%]', 'w-[70%]'];
  return (
    <div className={['flex flex-col gap-2.5', className].filter(Boolean).join(' ')}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${widths[i % widths.length]} rounded-md`} />
      ))}
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'inline' | 'compact';
}> = ({ title, description, icon, action, className, variant = 'default' }) => {
  const styles = {
    default: 'flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-border rounded-2xl bg-bg-subtle/40',
    inline: 'flex flex-col items-center justify-center py-10 px-5 text-center border border-dashed border-border rounded-xl bg-bg-subtle/20',
    compact: 'flex items-center gap-4 py-4 px-5 text-left border border-dashed border-border rounded-lg bg-bg-subtle/20',
  };

  return (
    <div className={[styles[variant], className].filter(Boolean).join(' ')}>
      {icon && <div className={variant === 'compact' ? 'text-text-4 shrink-0' : 'mb-4 text-text-4'}>{icon}</div>}
      <div className={variant === 'compact' ? 'flex-1 min-w-0' : ''}>
        <h3 className="text-[15px] font-semibold text-text-1">{title}</h3>
        {description && <p className="text-[13px] text-text-3 mt-1.5 max-w-xs mx-auto leading-relaxed">{description}</p>}
      </div>
      {action && <div className={variant === 'compact' ? 'shrink-0' : 'mt-6'}>{action}</div>}
    </div>
  );
};

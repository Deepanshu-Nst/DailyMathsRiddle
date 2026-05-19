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

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, description, icon, action, className }) => (
  <div className={[
    'flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-border rounded-2xl bg-bg-subtle/40',
    className,
  ].filter(Boolean).join(' ')}>
    {icon && <div className="mb-4 text-text-4">{icon}</div>}
    <h3 className="text-[15px] font-semibold text-text-1">{title}</h3>
    {description && <p className="text-[13px] text-text-3 mt-1.5 max-w-xs mx-auto leading-relaxed">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

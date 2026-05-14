import React from 'react';

export const Container: React.FC<{ children: React.ReactNode; className?: string; wide?: boolean }> = ({ children, className, wide }) => (
  <div className={[(wide ? 'max-w-[min(1400px,100%)]' : 'max-w-[min(1180px,100%)]'), 'mx-auto px-5 sm:px-6 lg:px-8', className].filter(Boolean).join(' ')}>
    {children}
  </div>
);

export const Sidebar: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <aside className={[
    'w-64 border-r border-border bg-bg-subtle flex flex-col sticky top-0 h-screen',
    className,
  ].filter(Boolean).join(' ')}>
    {children}
  </aside>
);

export const Topbar: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <header className={[
    'h-14 border-b border-white/[0.06] bg-[rgba(8,8,10,0.72)] backdrop-blur-xl flex items-center sticky top-0 z-40',
    className,
  ].filter(Boolean).join(' ')}>
    {children}
  </header>
);

export const Section: React.FC<{ children: React.ReactNode; title?: string; subtitle?: string; className?: string }> = ({
  children, title, subtitle, className,
}) => (
  <section className={['py-6', className].filter(Boolean).join(' ')}>
    {(title || subtitle) && (
      <div className="mb-5">
        {title && <h2 className="text-[15px] font-semibold text-text-1 tracking-tight">{title}</h2>}
        {subtitle && <p className="text-[13px] text-text-3 mt-0.5">{subtitle}</p>}
      </div>
    )}
    {children}
  </section>
);

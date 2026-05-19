'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { pageTransition } from '@/lib/motion';

export const Container: React.FC<{ children: React.ReactNode; className?: string; wide?: boolean }> = ({ children, className, wide }) => (
  <div className={[(wide ? 'max-w-[min(1440px,100%)]' : 'max-w-[min(1280px,100%)]'), 'mx-auto px-5 sm:px-6 lg:px-8', className].filter(Boolean).join(' ')}>
    {children}
  </div>
);

export const Sidebar: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <aside className={[
    'w-64 border-r border-white/[0.06] bg-bg-subtle/80 backdrop-blur-xl flex flex-col sticky top-0 h-screen',
    className,
  ].filter(Boolean).join(' ')}>
    {children}
  </aside>
);

export const Topbar: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <header className={[
    'h-16 border-b border-white/[0.04] bg-[rgba(5,5,5,0.8)] backdrop-blur-2xl flex items-center sticky top-0 z-40 shadow-[0_1px_0_rgba(255,255,255,0.02),0_4px_24px_rgba(0,0,0,0.3)]',
    className,
  ].filter(Boolean).join(' ')}>
    {children}
  </header>
);

export const Section: React.FC<{ children: React.ReactNode; title?: string; subtitle?: string; className?: string }> = ({
  children, title, subtitle, className,
}) => (
  <section className={['py-10', className].filter(Boolean).join(' ')}>
    {(title || subtitle) && (
      <div className="mb-5">
        {title && <h2 className="text-[15px] font-semibold text-text-1 tracking-tight">{title}</h2>}
        {subtitle && <p className="text-[13px] text-text-3 mt-0.5">{subtitle}</p>}
      </div>
    )}
    {children}
  </section>
);

/** Page wrapper with fade-in transition */
export const PageWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <motion.div
    variants={pageTransition}
    initial="hidden"
    animate="visible"
    className={className}
  >
    {children}
  </motion.div>
);

/** Consistent page header for top-level pages */
export const PageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ eyebrow, title, description, action, className }) => (
  <div className={['flex flex-col gap-3', className].filter(Boolean).join(' ')}>
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        {eyebrow && (
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-text-4">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-balance text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-text-1">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-[15px] leading-relaxed text-text-2">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 pt-2">{action}</div>}
    </div>
  </div>
);

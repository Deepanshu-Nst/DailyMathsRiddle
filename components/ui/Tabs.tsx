'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode; count?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'pills' | 'underline' | 'contained' | 'segmented';
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className, variant = 'pills' }) => {
  if (variant === 'contained' || variant === 'segmented') {
    const isSegmented = variant === 'segmented';
    return (
      <div className={[
        'inline-flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1.5',
        isSegmented ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={[
                'relative flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-semibold rounded-xl transition-colors',
                isSegmented ? 'flex-1' : '',
                isActive
                  ? 'text-bg'
                  : 'text-text-3 hover:text-text-2',
              ].join(' ')}
            >
              {isActive && (
                <motion.div
                  layoutId={`tab-${variant}-${tab.id}`}
                  className="absolute inset-0 rounded-xl bg-text-1 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {tab.icon && tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className={[
                    'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                    isActive ? 'bg-bg/20 text-bg' : 'bg-white/[0.06] text-text-4',
                  ].join(' ')}>
                    {tab.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={['flex items-center gap-0.5', className].filter(Boolean).join(' ')}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        if (variant === 'underline') {
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={[
                'relative px-4 py-3 text-[13px] font-medium transition-colors',
                isActive ? 'text-text-1' : 'text-text-3 hover:text-text-2',
              ].join(' ')}
            >
              <span className="flex items-center gap-1.5">
                {tab.icon && tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-0.5 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-text-4">
                    {tab.count}
                  </span>
                )}
              </span>
              {isActive && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                  transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                />
              )}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={[
              'relative flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium rounded-full transition-colors',
              isActive
                ? 'text-text-1'
                : 'text-text-3 hover:text-text-2',
            ].join(' ')}
          >
            {isActive && (
              <motion.div
                layoutId="tab-pill"
                className="absolute inset-0 rounded-full border border-white/[0.08] bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md"
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon && tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className={[
                  'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  isActive ? 'bg-primary/15 text-primary' : 'bg-white/[0.06] text-text-4',
                ].join(' ')}>
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

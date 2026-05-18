'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'pills' | 'underline';
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className, variant = 'pills' }) => {
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
                className="absolute inset-0 rounded-full border border-white/[0.08] bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md"
                transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon && tab.icon}
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

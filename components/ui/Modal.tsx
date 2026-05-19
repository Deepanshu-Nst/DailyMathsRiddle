'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  scrollable?: boolean;
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className,
  scrollable,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-backdrop">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-2xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 300,
            }}
            className={[
              'modal-card relative w-full rounded-2xl border border-white/[0.1]',
              'bg-[linear-gradient(180deg,rgba(22,22,28,0.98)_0%,rgba(10,10,14,0.98)_100%)]',
              'shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_40px_120px_rgba(0,0,0,0.75)]',
              sizeMap[size],
              scrollable ? 'max-h-[85vh] overflow-y-auto' : '',
              className,
            ].filter(Boolean).join(' ')}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-white/[0.02]">
                <h3 className="text-[15px] font-semibold tracking-tight text-text-1">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="rounded-xl p-1.5 text-text-3 transition-standard hover:bg-white/[0.06] hover:text-text-1"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

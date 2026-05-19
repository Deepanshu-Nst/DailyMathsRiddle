'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Send } from 'lucide-react';

interface AnswerInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  status: 'idle' | 'correct' | 'incorrect';
  disabled?: boolean;
}

export default function AnswerInput({ value, onChange, onSubmit, status, disabled }: AnswerInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled && value.trim()) {
      onSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your solution..."
            disabled={disabled}
            inputSize="lg"
            error={status === 'incorrect'}
            className={[
              status === 'correct' ? 'border-success ring-1 ring-success/20 text-success' : '',
              'pr-16',
            ].filter(Boolean).join(' ')}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-4 pointer-events-none hidden sm:inline">
            Enter ↵
          </span>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
          <Button 
            variant="primary"
            size="lg"
            onClick={onSubmit} 
            disabled={disabled || !value.trim()}
            className="shrink-0 px-7 gap-2"
          >
            <Send size={16} />
            Submit
          </Button>
        </motion.div>
      </div>
      <div className="h-5">
        <AnimatePresence mode="wait">
          {status === 'incorrect' && (
            <motion.p
              key="incorrect"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs font-semibold text-error anim-shake"
            >
              That answer is incorrect. Try again.
            </motion.p>
          )}
          {status === 'correct' && (
            <motion.p
              key="correct"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs font-semibold text-success"
            >
              ✓ Correct.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

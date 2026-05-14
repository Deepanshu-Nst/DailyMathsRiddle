'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  hint1: string;
  hint2: string;
  disabled?: boolean;
}

export default function HintLadder({ hint1, hint2, disabled }: Props) {
  const [level, setLevel] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      {/* Hint Selection Controls */}
      <div className="flex gap-2">
        <Button
          variant={level === 1 ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setLevel(level === 1 ? 0 : 1)}
          disabled={disabled}
          className="gap-2"
        >
          <Lightbulb size={14} className={level >= 1 ? 'text-primary' : 'text-text-4'} />
          Hint 1
          {level === 1 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>

        {hint2 && (
          <Button
            variant={level === 2 ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setLevel(level === 2 ? 0 : 2)}
            disabled={disabled || level < 1}
            className="gap-2"
          >
            <Lightbulb size={14} className={level === 2 ? 'text-primary' : 'text-text-4'} />
            Hint 2
            {level === 2 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        )}
      </div>

      {/* Hint Content Display */}
      <AnimatePresence mode="wait">
        {level > 0 && (
          <motion.div
            key={level}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="p-4 bg-bg-subtle border border-border rounded-xl flex flex-col gap-3 shadow-sm shadow-black/5"
          >
            <div className="flex items-center gap-2">
              <Badge variant="warning" size="sm">Level {level} Hint</Badge>
              <div className="h-px flex-1 bg-border/50" />
            </div>
            <p className="text-sm text-text-2 leading-relaxed italic pr-4">
              "{level === 1 ? hint1 : hint2}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


'use client';
import { Difficulty } from '@/types';
import { motion } from 'framer-motion';

interface Props {
  selected: Difficulty;
  onChange: (d: Difficulty) => void;
  disabled?: boolean;
}
const LEVELS: { value: Difficulty; label: string }[] = [
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
];

export default function DifficultySelector({ selected, onChange, disabled }: Props) {
  return (
    <div className="diff-group">
      {LEVELS.map(({ value, label }) => {
        const active = selected === value;
        return (
          <button
            key={value}
            onClick={() => !disabled && onChange(value)}
            disabled={disabled}
            className={`diff-pill${active ? ' active' : ''}`}
            style={{ pointerEvents: disabled && !active ? 'none' : 'auto' }}
          >
            {active && (
              <motion.div
                layoutId="diff-bg"
                style={{
                  position: 'absolute', inset: 0,
                  background: 'var(--text-1)',
                  borderRadius: 6, zIndex: -1,
                }}
                transition={{ type: 'tween', ease: [0.3, 0, 0.2, 1], duration: 0.18 }}
              />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}

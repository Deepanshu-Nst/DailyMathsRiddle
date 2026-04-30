'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props { hint1: string; hint2: string; disabled?: boolean; }

export default function HintLadder({ hint1, hint2, disabled }: Props) {
  const [level, setLevel] = useState(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {level === 0 && !disabled && (
        <button
          onClick={() => setLevel(1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 7,
            color: 'var(--text-3)', fontSize: 13, fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            transition: 'color 140ms',
            alignSelf: 'flex-start',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Need a hint?
        </button>
      )}

      <AnimatePresence>
        {level >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ paddingLeft: 14, borderLeft: '1.5px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 5 }}
          >
            <span className="label">Hint 1</span>
            <span style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>{hint1}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {level === 1 && !disabled && (
        <button
          onClick={() => setLevel(2)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 7,
            color: 'var(--text-3)', fontSize: 13, fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            transition: 'color 140ms',
            alignSelf: 'flex-start',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          One more?
        </button>
      )}

      <AnimatePresence>
        {level >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ paddingLeft: 14, borderLeft: '1.5px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 5 }}
          >
            <span className="label">Hint 2</span>
            <span style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>{hint2}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

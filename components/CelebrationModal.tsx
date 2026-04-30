'use client';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import CountdownTimer from './CountdownTimer';

interface Props {
  explanation: string;
  answer: string;
  streak: number;
  onClose: () => void;
}

export default function CelebrationModal({ explanation, answer, streak, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        className="modal-card"
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div style={{ padding: '28px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Checkmark */}
          <div style={{ width: 52, height: 52, borderRadius: '50%', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <path className="check-path" d="M6 14l6 6 10-10" stroke="var(--text-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, transition: 'color 140ms' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 28px 28px' }}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
              {streak > 1 ? `${streak} days strong.` : 'Nice. You\'re on a streak.'}
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 24, lineHeight: 1.6 }}>
              Intelligence is built daily. Keep going.
            </p>

            {/* Solution */}
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '16px 18px', marginBottom: 24 }}>
              <span className="label" style={{ display: 'block', marginBottom: 8 }}>Solution</span>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 10 }}>{explanation}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="label">Answer</span>
                <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{answer}</span>
              </div>
            </div>

            {/* Streak + Countdown */}
            {streak > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <span className="label" style={{ display: 'block', marginBottom: 4 }}>Current Streak</span>
                  <span className="mono font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>{streak}</span>
                </div>
                <CountdownTimer />
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

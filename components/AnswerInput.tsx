'use client';
import { useRef, useEffect, useState } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  status: 'idle' | 'correct' | 'incorrect';
  disabled?: boolean;
}

export default function AnswerInput({ value, onChange, onSubmit, status, disabled }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [shake, setShake] = useState(false);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) onSubmit();
  };

  useEffect(() => {
    if (status === 'incorrect') {
      setShake(true);
      const t = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(t);
    }
  }, [status]);

  useEffect(() => {
    if (!disabled && status === 'idle') ref.current?.focus();
  }, [disabled, status]);

  const inputClass = [
    'input-underline',
    status === 'correct'   ? 'is-correct' : '',
    status === 'incorrect' ? 'is-error'   : '',
    shake                  ? 'anim-shake' : '',
  ].filter(Boolean).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <input
          ref={ref}
          className={inputClass}
          type="text"
          placeholder="Your answer…"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          autoComplete="off"
        />
        <button
          className="btn btn-icon"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          aria-label="Submit answer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      <div style={{ height: 22, paddingTop: 5 }}>
        {status === 'incorrect' && (
          <span className="anim-fade-up" style={{ fontSize: 13, color: 'var(--error)' }}>
            Not quite. Give it another try.
          </span>
        )}
        {status === 'correct' && (
          <span className="anim-fade-up" style={{ fontSize: 13, color: 'var(--success)' }}>
            Correct.
          </span>
        )}
      </div>
    </div>
  );
}

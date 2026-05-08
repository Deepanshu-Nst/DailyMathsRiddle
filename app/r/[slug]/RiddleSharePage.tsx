'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AnswerInput from '@/components/AnswerInput';
import HintLadder from '@/components/HintLadder';
import type { DbRiddle } from '@/types/supabase';
import { getLinkedInShareUrl, getWhatsAppShareUrl } from '@/lib/share/getShareUrl';

interface Props {
  riddle: DbRiddle;
  shareUrl: string;
}

/**
 * RiddleSharePage — client component for /r/[slug].
 * Handles answer submission, hints, and solved state.
 * Sends answer to /api/riddles/attempt (new endpoint).
 * Riddle identity is locked to the DB row — never changes.
 */
export default function RiddleSharePage({ riddle, shareUrl }: Props) {
  const router = useRouter();
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [explanation, setExplanation] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [isSolved, setIsSolved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const difficulty = riddle.difficulty.charAt(0).toUpperCase() + riddle.difficulty.slice(1);

  const handleSubmit = async () => {
    if (!answer.trim() || status === 'correct' || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/riddles/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riddleId: riddle.id,
          submittedAnswer: answer,
        }),
      });
      const data = await res.json();

      if (data.isCorrect) {
        setStatus('correct');
        setExplanation(data.explanation ?? '');
        setCorrectAnswer(data.answer ?? '');
        setIsSolved(true);
      } else {
        setStatus('incorrect');
        setTimeout(() => setStatus('idle'), 2000);
      }
    } catch {
      setStatus('incorrect');
      setTimeout(() => setStatus('idle'), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Nav */}
      <nav style={{ width: '100%', maxWidth: 1100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 0 0' }}>
        <button className="nav-back" onClick={() => router.push('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Home
        </button>

        {/* Difficulty badge */}
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)' }}>
          {difficulty}
        </span>
      </nav>

      {/* Main */}
      <main style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 40, padding: 'clamp(48px, 8vh, 80px) 0 80px' }}>

        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-4)' }} />
          <span className="label">Shared challenge · {riddle.category}</span>
        </div>

        {/* Question */}
        <p style={{ fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 500, color: 'var(--text-1)', lineHeight: 1.65, letterSpacing: '-0.01em' }}>
          {riddle.question}
        </p>

        {/* Answer / Solved state */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 500 }}>
          {!isSolved ? (
            <>
              <AnswerInput
                value={answer}
                onChange={setAnswer}
                onSubmit={handleSubmit}
                status={status}
                disabled={status === 'correct' || isSubmitting}
              />
              <HintLadder hint1={riddle.hint1} hint2={riddle.hint2} disabled={status === 'correct'} />
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                <span style={{ fontSize: 14, color: 'var(--success)' }}>Solved</span>
              </div>

              {correctAnswer && (
                <div>
                  <span className="label" style={{ display: 'block', marginBottom: 8 }}>Answer</span>
                  <span className="mono" style={{ fontSize: 22, fontWeight: 500, color: 'var(--text-1)' }}>{correctAnswer}</span>
                </div>
              )}

              {explanation && (
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>{explanation}</p>
              )}

              {/* Share */}
              <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                <a
                  href={getLinkedInShareUrl(shareUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ fontSize: 13 }}
                >
                  Share on LinkedIn
                </a>
                <a
                  href={getWhatsAppShareUrl(`I solved this ${difficulty} math riddle! Can you?`, shareUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ fontSize: 13 }}
                >
                  Share on WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Persistent share URL */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 24 }}>
          <span className="label" style={{ display: 'block', marginBottom: 8 }}>Share this challenge</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
              {shareUrl}
            </span>
            <button
              id="copy-share-url"
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0 }}
              onClick={() => navigator.clipboard.writeText(shareUrl)}
            >
              Copy
            </button>
          </div>
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-4)' }}>
            This link always opens this exact riddle — not today&apos;s daily.
          </p>
        </div>

        {/* Try today's */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 24 }}>
          <button
            className="btn btn-primary"
            onClick={() => router.push('/')}
            style={{ fontSize: 14 }}
          >
            Try today&apos;s daily riddle →
          </button>
        </div>
      </main>

      <footer style={{ paddingBottom: 32, textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-4)' }}>
          Built by <span style={{ color: 'var(--text-3)' }}>AdvaitAI</span> · One challenge a day
        </span>
      </footer>
    </div>
  );
}

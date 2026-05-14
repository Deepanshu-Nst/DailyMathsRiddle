'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { validateUsername } from '@/lib/username';

interface Props {
  isOpen: boolean;
  onSuccess: (username: string) => void;
}

export default function UsernameModal({ isOpen, onSuccess }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validation = validateUsername(username);
    if (!validation.valid) {
      setError(validation.error || 'Invalid username');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/profile/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        // Handle specific error codes if needed, or just show the message
        if (data.code === 'USERNAME_TAKEN') {
          setError('This username is already taken. Try another one.');
        } else if (data.code === 'RENAME_COOLDOWN') {
          setError(data.error);
        } else {
          setError(data.error || 'Failed to claim username');
        }
      } else {
        setSuccess(true);
        // Small delay to show success state
        setTimeout(() => {
          onSuccess(username);
          router.refresh();
        }, 800);
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: 24
            }}
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              style={{
                width: '100%', maxWidth: 440, background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 24,
                padding: '48px 32px', boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
                position: 'relative', overflow: 'hidden'
              }}
            >
              {success && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{
                    position: 'absolute', inset: 0, background: 'var(--surface)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', zIndex: 10, gap: 16
                  }}
                >
                  <div style={{ fontSize: 40 }}>✅</div>
                  <h3 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>Identity Secured</h3>
                  <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Welcome to AdvaitAI, @{username}</p>
                </motion.div>
              )}

              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 18, background: 'var(--text-1)',
                  margin: '0 auto 24px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'var(--bg)', fontSize: 28
                }}>
                  👤
                </div>
                <h2 className="font-display" style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
                  Claim your identity
                </h2>
                <p style={{ fontSize: 15, color: 'var(--text-3)', lineHeight: 1.6 }}>
                  Choose a unique username to appear on the global leaderboards and your public profile.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ 
                      position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--text-4)', fontSize: 16, fontWeight: 600
                    }}>@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                      placeholder="math_wizard"
                      style={{
                        width: '100%', padding: '16px 18px 16px 40px', borderRadius: 14,
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        color: 'var(--text-1)', fontSize: 16, outline: 'none',
                        fontWeight: 500, transition: 'border-color 0.2s ease'
                      }}
                      autoFocus
                    />
                  </div>
                  {error && (
                    <p style={{ color: '#ff4d4d', fontSize: 13, marginTop: 10, marginLeft: 4, fontWeight: 500 }}>
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || success}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 700 }}
                >
                  {loading ? 'Claiming...' : 'Complete profile'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'var(--text-4)', fontWeight: 500 }}>
                You can change this later, but only once every 30 days.
              </p>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

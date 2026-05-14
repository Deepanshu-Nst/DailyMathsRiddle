'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Challenge {
  id: string;
  user_id: string;
  riddle_id: string;
  proposed_answer: string;
  reasoning: string;
  proof_text: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'rewarded';
  admin_notes: string | null;
  created_at: string;
  user?: {
    username: string;
    email: string;
  };
  riddle?: {
    question: string;
    answer: string;
    difficulty: string;
    category: string;
  };
}

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [compensationXP, setCompensationXP] = useState(50);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/challenges?status=pending');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChallenges(data.challenges || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (status: 'approved' | 'rejected') => {
    if (!selectedChallenge) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/challenges/${selectedChallenge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          adminNotes,
          compensationXP: status === 'approved' ? compensationXP : 0
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      
      setSelectedChallenge(null);
      setAdminNotes('');
      fetchChallenges();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="admin-container" style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 48 }}>
        <h1 className="font-display" style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Challenge Queue</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Review disputes for AI-generated riddles.</p>
      </header>

      {loading ? (
        <div style={{ color: 'var(--text-4)' }}>Loading challenges...</div>
      ) : error ? (
        <div style={{ color: 'var(--error)' }}>{error}</div>
      ) : challenges.length === 0 ? (
        <div style={{ 
          padding: 64, border: '1px dashed var(--border)', borderRadius: 20, 
          textAlign: 'center', color: 'var(--text-4)' 
        }}>
          No pending challenges. Everything is stable.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {challenges.map((c) => (
            <motion.div
              key={c.id}
              layoutId={c.id}
              onClick={() => setSelectedChallenge(c)}
              style={{
                padding: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                borderRadius: 16, cursor: 'pointer', transition: 'all 0.2s ease'
              }}
              whileHover={{ borderColor: 'var(--text-3)', background: 'rgba(255,255,255,0.04)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-4)' }}>
                  {new Date(c.created_at).toLocaleDateString()} — {c.user?.username || 'Anonymous'}
                </span>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)' }}>
                  {c.riddle?.difficulty} • {c.riddle?.category}
                </span>
              </div>
              <p style={{ fontSize: 15, color: 'var(--text-1)', fontWeight: 500 }}>{c.riddle?.question.substring(0, 100)}...</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedChallenge && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto',
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 24, padding: 40
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <div>
                  <h2 className="font-display" style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Review Dispute</h2>
                  <p style={{ color: 'var(--text-4)', fontSize: 13 }}>Submitted by {selectedChallenge.user?.username} ({selectedChallenge.user?.email})</p>
                </div>
                <button className="btn btn-ghost" onClick={() => setSelectedChallenge(null)}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 40 }}>
                <section>
                  <span className="label" style={{ display: 'block', marginBottom: 12 }}>Riddle Context</span>
                  <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                    <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 16 }}>{selectedChallenge.riddle?.question}</p>
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase' }}>System Answer</span>
                      <p className="mono" style={{ fontSize: 16, color: 'var(--success)' }}>{selectedChallenge.riddle?.answer}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <span className="label" style={{ display: 'block', marginBottom: 12 }}>User Challenge</span>
                  <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase' }}>Proposed Answer</span>
                    <p className="mono" style={{ fontSize: 16, color: 'var(--accent)', marginBottom: 16 }}>{selectedChallenge.proposed_answer}</p>
                    
                    <span style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase' }}>Reasoning</span>
                    <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>{selectedChallenge.reasoning}</p>
                    
                    {selectedChallenge.proof_text && (
                      <div style={{ marginTop: 16 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase' }}>Proof</span>
                        <p style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' }}>{selectedChallenge.proof_text}</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 32 }}>
                <div style={{ marginBottom: 24 }}>
                  <span className="label" style={{ display: 'block', marginBottom: 12 }}>Resolution Notes</span>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Why are you approving/rejecting this?"
                    style={{
                      width: '100%', height: 100, background: 'var(--bg-2)', border: '1px solid var(--border)',
                      borderRadius: 12, padding: 16, color: 'var(--text-1)', fontSize: 14, outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', gap: 12 }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => handleResolve('approved')}
                      disabled={isUpdating}
                      style={{ background: 'var(--success)', color: '#000', border: 'none' }}
                    >
                      Approve & Invalidate
                    </button>
                    <button 
                      className="btn btn-ghost" 
                      onClick={() => handleResolve('rejected')}
                      disabled={isUpdating}
                      style={{ color: 'var(--error)' }}
                    >
                      Reject Dispute
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', borderLeft: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-4)' }}>Reward XP:</span>
                    <input 
                      type="number" 
                      value={compensationXP} 
                      onChange={(e) => setCompensationXP(parseInt(e.target.value))}
                      style={{ width: 60, background: 'none', border: 'none', borderBottom: '1px solid var(--text-4)', color: 'var(--text-1)', textAlign: 'center' }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .btn {
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary { background: #fff; color: #000; border: none; }
        .btn-ghost { background: transparent; color: var(--text-3); border: 1px solid var(--border); }
        .btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-4); font-weight: 700; }
        .mono { font-family: var(--font-mono); }
      `}</style>
    </div>
  );
}

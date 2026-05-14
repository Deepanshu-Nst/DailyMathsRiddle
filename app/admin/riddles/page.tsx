'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Trash2,
  Edit3,
  Eye
} from 'lucide-react';

type RiddleStatus = 'draft' | 'scheduled' | 'published' | 'archived';
type Difficulty = 'easy' | 'medium' | 'hard';

interface ScheduledRiddle {
  id: string;
  publish_date: string;
  difficulty: Difficulty;
  question: string;
  answer: string;
  explanation: string;
  status: RiddleStatus;
}

export default function ScheduledRiddlesPage() {
  const [riddles, setRiddles] = useState<ScheduledRiddle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [form, setForm] = useState({
    publish_date: new Date().toISOString().split('T')[0],
    difficulty: 'medium' as Difficulty,
    question: '',
    answer: '',
    explanation: '',
    status: 'scheduled' as RiddleStatus
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRiddles();
  }, []);

  async function fetchRiddles() {
    try {
      const res = await fetch('/api/admin/riddles');
      const data = await res.json();
      if (data.success) setRiddles(data.riddles);
    } catch (err) {
      console.error('Failed to fetch riddles', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const url = editingId ? `/api/admin/riddles/${editingId}` : '/api/admin/riddles';
    const method = editingId ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error);
      } else {
        setIsFormOpen(false);
        setEditingId(null);
        setForm({
          publish_date: new Date().toISOString().split('T')[0],
          difficulty: 'medium',
          question: '',
          answer: '',
          explanation: '',
          status: 'scheduled'
        });
        fetchRiddles();
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this scheduled riddle?')) return;
    
    try {
      const res = await fetch(`/api/admin/riddles/${id}`, { method: 'DELETE' });
      if (res.ok) fetchRiddles();
    } catch (err) {
      alert('Failed to delete');
    }
  }

  function startEdit(riddle: ScheduledRiddle) {
    setEditingId(riddle.id);
    setForm({
      publish_date: riddle.publish_date,
      difficulty: riddle.difficulty,
      question: riddle.question,
      answer: riddle.answer,
      explanation: riddle.explanation,
      status: riddle.status
    });
    setIsFormOpen(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 8 }}>
            Scheduled Riddles
          </h1>
          <p style={{ color: '#666', fontSize: 14 }}>
            Manage the editorial calendar and pre-schedule intelligence challenges.
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setIsFormOpen(!isFormOpen);
          }}
          className="btn btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px' }}
        >
          {isFormOpen ? 'Close Editor' : <><Plus size={18} /> Schedule Riddle</>}
        </button>
      </div>

      {isFormOpen && (
        <div style={{ 
          display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 32, 
          background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 24, padding: 32 
        }}>
          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#444', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Publish Date</label>
                <input 
                  type="date" 
                  value={form.publish_date}
                  onChange={e => setForm({...form, publish_date: e.target.value})}
                  style={{ width: '100%', background: '#000', border: '1px solid #222', borderRadius: 10, padding: 12, color: '#fff' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#444', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Difficulty</label>
                <select 
                  value={form.difficulty}
                  onChange={e => setForm({...form, difficulty: e.target.value as Difficulty})}
                  style={{ width: '100%', background: '#000', border: '1px solid #222', borderRadius: 10, padding: 12, color: '#fff' }}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#444', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Status</label>
                <select 
                  value={form.status}
                  onChange={e => setForm({...form, status: e.target.value as RiddleStatus})}
                  style={{ width: '100%', background: '#000', border: '1px solid #222', borderRadius: 10, padding: 12, color: '#fff' }}
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#444', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Question</label>
              <textarea 
                value={form.question}
                onChange={e => setForm({...form, question: e.target.value})}
                placeholder="The riddle question..."
                style={{ width: '100%', background: '#000', border: '1px solid #222', borderRadius: 10, padding: 16, color: '#fff', minHeight: 120, resize: 'vertical' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#444', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Answer</label>
                <input 
                  type="text"
                  value={form.answer}
                  onChange={e => setForm({...form, answer: e.target.value})}
                  placeholder="Final numeric result"
                  style={{ width: '100%', background: '#000', border: '1px solid #222', borderRadius: 10, padding: 12, color: '#fff' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#444', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Explanation</label>
                <input 
                  type="text"
                  value={form.explanation}
                  onChange={e => setForm({...form, explanation: e.target.value})}
                  placeholder="Step-by-step solution logic"
                  style={{ width: '100%', background: '#000', border: '1px solid #222', borderRadius: 10, padding: 12, color: '#fff' }}
                  required
                />
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 13 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={saving}
              className="btn btn-primary" 
              style={{ padding: '16px', fontWeight: 700 }}
            >
              {saving ? 'Processing...' : (editingId ? 'Update Scheduled Riddle' : 'Schedule for Network')}
            </button>
          </form>

          {/* Preview Panel */}
          <div style={{ borderLeft: '1px solid #1a1a1a', paddingLeft: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#444', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
              <Eye size={14} /> Live Preview
            </div>
            <div style={{ 
              background: '#000', border: '1px solid #222', borderRadius: 16, 
              padding: 24, minHeight: 300, display: 'flex', flexDirection: 'column', gap: 16 
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#111', color: '#666', fontWeight: 700 }}>
                  {form.difficulty.toUpperCase()}
                </span>
                <span style={{ fontSize: 10, color: '#444' }}>PUBLISHING: {form.publish_date}</span>
              </div>
              <div style={{ fontSize: 18, lineHeight: 1.6, fontWeight: 500, color: '#ccc' }}>
                {form.question || <span style={{ opacity: 0.2 }}>Question content will appear here...</span>}
              </div>
              {form.explanation && (
                <div style={{ marginTop: 'auto', padding: 16, background: '#050505', borderRadius: 10, border: '1px dashed #222' }}>
                  <p style={{ fontSize: 11, color: '#444', marginBottom: 4, fontWeight: 700 }}>EXPLANATION</p>
                  <p style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>{form.explanation}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <div style={{ color: '#444' }}>Synchronizing calendar...</div>
        ) : riddles.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', border: '1px dashed #222', borderRadius: 20, color: '#444' }}>
            No riddles scheduled. The AI pipeline will handle fallback.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {riddles.map((riddle) => (
              <div key={riddle.id} style={{ 
                background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 16, 
                padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24
              }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: 12, background: '#000', 
                  border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', color: '#444' 
                }}>
                  <Calendar size={20} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{riddle.publish_date}</span>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#111', color: '#666', fontWeight: 700 }}>
                      {riddle.difficulty.toUpperCase()}
                    </span>
                    <StatusBadge status={riddle.status} />
                  </div>
                  <div style={{ fontSize: 13, color: '#555', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {riddle.question}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => startEdit(riddle)} className="btn btn-ghost" style={{ padding: 8, color: '#888' }}><Edit3 size={18} /></button>
                  <button onClick={() => handleDelete(riddle.id)} className="btn btn-ghost" style={{ padding: 8, color: '#ef4444' }}><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RiddleStatus }) {
  const colors: Record<RiddleStatus, string> = {
    draft: '#888',
    scheduled: '#3b82f6',
    published: '#10b981',
    archived: '#444'
  };
  const icons: Record<RiddleStatus, any> = {
    draft: <Clock size={10} />,
    scheduled: <Calendar size={10} />,
    published: <CheckCircle2 size={10} />,
    archived: <AlertCircle size={10} />
  };

  return (
    <div style={{ 
      display: 'flex', alignItems: 'center', gap: 4, 
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', 
      color: colors[status] 
    }}>
      {icons[status]}
      {status}
    </div>
  );
}

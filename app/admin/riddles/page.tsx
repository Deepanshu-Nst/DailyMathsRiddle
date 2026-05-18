'use client';

import { useState, useEffect } from 'react';
import { Plus, Calendar, CheckCircle2, Clock, AlertCircle, Trash2, Edit3, Eye } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getOfficialDailyDate, addOfficialCalendarDays } from '@/lib/timezone';

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

  const [form, setForm] = useState({
    publish_date: getOfficialDailyDate(),
    difficulty: 'medium' as Difficulty,
    category: 'Editorial',
    question: '',
    answer: '',
    explanation: '',
    hint1: '',
    hint2: '',
    status: 'scheduled' as RiddleStatus,
  });

  const [submitAction, setSubmitAction] = useState<'schedule' | 'publish_now'>('schedule');

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
        body: JSON.stringify({ ...form, action: submitAction }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error);
      } else {
        setIsFormOpen(false);
        setEditingId(null);
        setForm({
          publish_date: getOfficialDailyDate(),
          difficulty: 'medium',
          category: 'Editorial',
          question: '',
          answer: '',
          explanation: '',
          hint1: '',
          hint2: '',
          status: 'scheduled',
        });
        fetchRiddles();
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this scheduled riddle?')) return;
    try {
      const res = await fetch(`/api/admin/riddles/${id}`, { method: 'DELETE' });
      if (res.ok) fetchRiddles();
    } catch {
      alert('Failed to delete');
    }
  }

  function startEdit(riddle: ScheduledRiddle) {
    setEditingId(riddle.id);
    setForm({
      publish_date: riddle.publish_date,
      difficulty: riddle.difficulty,
      category: 'Editorial',
      question: riddle.question,
      answer: riddle.answer,
      explanation: riddle.explanation,
      hint1: '',
      hint2: '',
      status: riddle.status,
    });
    setIsFormOpen(true);
  }

  const statusVariant: Record<RiddleStatus, 'secondary' | 'success' | 'primary'> = {
    draft: 'secondary',
    scheduled: 'primary',
    published: 'success',
    archived: 'secondary',
  };

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <header className="flex flex-col gap-2 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-1">Scheduled riddles</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-text-2">
            Pre-schedule riddles for specific dates. Scheduled riddles override AI-generated ones
            when their publish date arrives.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setForm({
              publish_date: getOfficialDailyDate(),
              difficulty: 'medium',
              category: 'Editorial',
              question: '',
              answer: '',
              explanation: '',
              hint1: '',
              hint2: '',
              status: 'scheduled',
            });
            setIsFormOpen(!isFormOpen);
          }}
          size="sm"
        >
          {isFormOpen ? 'Close' : (
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Schedule riddle
            </span>
          )}
        </Button>
      </header>

      {/* Form */}
      {isFormOpen && (
        <Card padding="lg" className="flex flex-col gap-6 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:gap-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide text-text-3 mb-2 block">
                  Publish date
                </label>
                <input
                  type="date"
                  value={form.publish_date}
                  onChange={(e) => setForm({ ...form, publish_date: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide text-text-3 mb-2 block">
                  Difficulty
                </label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}
                  className="input"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide text-text-3 mb-2 block">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as RiddleStatus })}
                  className="input"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-text-3 mb-2 block">
                Question
              </label>
              <textarea
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="The riddle question…"
                className="input min-h-[120px] resize-y"
                required
              />
            </div>

            <div className="grid grid-cols-[1fr_2fr] gap-4">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide text-text-3 mb-2 block">
                  Answer
                </label>
                <input
                  type="text"
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  placeholder="Final answer"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide text-text-3 mb-2 block">
                  Explanation
                </label>
                <input
                  type="text"
                  value={form.explanation}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                  placeholder="Step-by-step solution"
                  className="input"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_2fr] gap-4">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide text-text-3 mb-2 block">
                  Category
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Algebra"
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-text-3 mb-2 block">
                    Hint 1
                  </label>
                  <input
                    type="text"
                    value={form.hint1}
                    onChange={(e) => setForm({ ...form, hint1: e.target.value })}
                    placeholder="First hint"
                    className="input"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-text-3 mb-2 block">
                    Hint 2
                  </label>
                  <input
                    type="text"
                    value={form.hint2}
                    onChange={(e) => setForm({ ...form, hint2: e.target.value })}
                    placeholder="Second hint"
                    className="input"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-error">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <Button type="submit" disabled={saving} onClick={() => setSubmitAction('schedule')} variant={editingId ? 'primary' : 'secondary'}>
                {saving && submitAction === 'schedule' ? 'Saving…' : editingId ? 'Update scheduled' : 'Schedule for date'}
              </Button>
              {!editingId && (
                <Button type="submit" disabled={saving} onClick={() => setSubmitAction('publish_now')} variant="primary">
                  {saving && submitAction === 'publish_now' ? 'Publishing…' : 'Publish NOW'}
                </Button>
              )}
            </div>
          </form>

          {/* Preview */}
          <div className="border-l border-border pl-8 hidden lg:flex flex-col gap-4">
            <div className="flex items-center gap-2 text-text-3 text-xs font-medium">
              <Eye size={14} /> Preview
            </div>
            <Card padding="md" className="flex flex-col gap-4 bg-bg">
              <div className="flex gap-2">
                <Badge variant="secondary" size="sm" className="font-mono uppercase">
                  {form.difficulty}
                </Badge>
                <span className="text-[11px] text-text-4">{form.publish_date}</span>
              </div>
              <p className="text-[15px] leading-relaxed text-text-1">
                {form.question || <span className="text-text-4">Question will appear here…</span>}
              </p>
              {form.explanation && (
                <div className="border-t border-border pt-3">
                  <p className="text-[11px] font-medium text-text-3 mb-1">Explanation</p>
                  <p className="text-sm leading-relaxed text-text-2">{form.explanation}</p>
                </div>
              )}
            </Card>
          </div>
        </Card>
      )}

      {/* List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer h-20 rounded-xl" />
            ))}
          </div>
        ) : riddles.length === 0 ? (
          <Card padding="lg" className="text-center text-sm text-text-3">
            No riddles scheduled. The AI pipeline generates riddles automatically when no
            scheduled override exists.
          </Card>
        ) : (
          riddles.map((riddle) => (
            <Card key={riddle.id} padding="md" className="flex items-center gap-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-muted text-text-3">
                <Calendar size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-text-1">{riddle.publish_date}</span>
                  <Badge variant="secondary" size="sm" className="font-mono uppercase">
                    {riddle.difficulty}
                  </Badge>
                  <Badge variant={statusVariant[riddle.status]} size="sm">
                    {riddle.status}
                  </Badge>
                </div>
                <p className="truncate text-sm text-text-3 max-w-md">{riddle.question}</p>
              </div>

              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => startEdit(riddle)}>
                  <Edit3 size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(riddle.id)} className="text-error hover:text-error">
                  <Trash2 size={16} />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

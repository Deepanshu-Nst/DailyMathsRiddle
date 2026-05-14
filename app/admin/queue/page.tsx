'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RefreshCw, ChevronDown } from 'lucide-react';

interface QueueEntry {
  id: string;
  target_date: string;
  difficulty: string;
  status: 'pending' | 'published' | 'rejected' | 'expired';
  position: number;
  rejected_reason: string | null;
  generated_at: string;
  published_at: string | null;
  riddle?: {
    id: string;
    question: string;
    answer: string;
    explanation: string;
  };
}

interface GenerationJob {
  id: string;
  target_date: string;
  difficulty: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  error_message: string | null;
  duration_ms: number | null;
  retry_count: number;
  created_at: string;
}

export default function PublishQueuePage() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [qRes, jRes] = await Promise.all([
        fetch('/api/admin/queue'),
        fetch('/api/admin/jobs?limit=20'),
      ]);
      const qData = await qRes.json();
      const jData = await jRes.json();
      setEntries(qData.entries || []);
      setJobs(jData.jobs || []);
    } catch (err) {
      console.error('Failed to fetch queue data', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish(date: string, difficulty: string) {
    setActing(`publish-${date}-${difficulty}`);
    try {
      const res = await fetch('/api/admin/queue/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, difficulty }),
      });
      const data = await res.json();
      if (!data.success) alert(data.error || 'Failed to publish');
      else fetchAll();
    } catch {
      alert('Request failed');
    } finally {
      setActing(null);
    }
  }

  async function handleReject() {
    if (!rejectId || !rejectReason.trim()) return;
    setActing(`reject-${rejectId}`);
    try {
      const res = await fetch('/api/admin/queue/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: rejectId, reason: rejectReason }),
      });
      const data = await res.json();
      if (data.success) {
        setRejectId(null);
        setRejectReason('');
        fetchAll();
      }
    } catch {
      alert('Request failed');
    } finally {
      setActing(null);
    }
  }

  async function handleRegenerate(date: string, difficulty: string) {
    setRegenerating(true);
    try {
      const res = await fetch('/api/admin/queue/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, difficulty }),
      });
      const data = await res.json();
      if (!data.success) alert(data.error || 'Regeneration failed');
      else fetchAll();
    } catch {
      alert('Request failed');
    } finally {
      setRegenerating(false);
    }
  }

  const statusVariant: Record<string, 'success' | 'secondary' | 'primary'> = {
    pending: 'primary',
    published: 'success',
    rejected: 'secondary',
    expired: 'secondary',
  };

  const jobStatusVariant: Record<string, 'success' | 'secondary' | 'primary'> = {
    queued: 'secondary',
    running: 'primary',
    completed: 'success',
    failed: 'secondary',
  };

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-1">Publish queue</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-text-2">
            Pre-generated riddles waiting for their scheduled publish time. The daily cron
            promotes the top-priority pending entry at midnight IST.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </header>

      {/* Queue Entries */}
      <section>
        <h2 className="text-sm font-semibold text-text-1 mb-4">Queue entries</h2>
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer h-20 rounded-xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <Card padding="lg" className="text-center text-sm text-text-3">
            No queue entries. The generation cron creates entries automatically, or you can
            regenerate manually below.
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <Card key={entry.id} padding="md" className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-text-1">{entry.target_date}</span>
                    <Badge variant="secondary" size="sm" className="font-mono uppercase">
                      {entry.difficulty}
                    </Badge>
                    <Badge variant={statusVariant[entry.status] || 'secondary'} size="sm">
                      {entry.status}
                    </Badge>
                    {entry.published_at && (
                      <span className="text-[11px] text-text-4">
                        Published {new Date(entry.published_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {entry.status === 'pending' && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handlePublish(entry.target_date, entry.difficulty)}
                        disabled={acting !== null}
                      >
                        Publish now
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRejectId(entry.id)}
                        disabled={acting !== null}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {entry.riddle && (
                  <div className="border-t border-border-subtle pt-3">
                    <p className="text-sm leading-relaxed text-text-2">{entry.riddle.question}</p>
                    <div className="mt-2 flex gap-4 text-xs text-text-3">
                      <span>Answer: <span className="font-mono text-text-2">{entry.riddle.answer}</span></span>
                    </div>
                  </div>
                )}

                {entry.rejected_reason && (
                  <p className="text-xs text-error">Rejected: {entry.rejected_reason}</p>
                )}

                {/* Inline reject form */}
                {rejectId === entry.id && (
                  <div className="flex items-end gap-2 border-t border-border pt-3">
                    <div className="flex-1">
                      <label className="text-[11px] text-text-3 mb-1 block">Rejection reason</label>
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Why is this being rejected?"
                        className="input"
                        autoFocus
                      />
                    </div>
                    <Button size="sm" onClick={handleReject} disabled={!rejectReason.trim()}>
                      Confirm
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setRejectId(null); setRejectReason(''); }}>
                      Cancel
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Manual regeneration */}
      <section>
        <h2 className="text-sm font-semibold text-text-1 mb-2">Regenerate</h2>
        <p className="text-xs text-text-3 mb-4">
          Generate a new candidate for a specific date. This runs the full AI pipeline.
        </p>
        <RegenerateForm onRegenerate={handleRegenerate} disabled={regenerating} />
      </section>

      {/* Generation Jobs */}
      <section>
        <h2 className="text-sm font-semibold text-text-1 mb-4">Recent generation jobs</h2>
        {jobs.length === 0 ? (
          <Card padding="md" className="text-sm text-text-3">
            No generation jobs recorded yet.
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-text-3">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Difficulty</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Duration</th>
                  <th className="px-5 py-3 font-medium">Retries</th>
                  <th className="px-5 py-3 font-medium">Error</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border-subtle">
                    <td className="px-5 py-3 font-mono text-text-1">{job.target_date}</td>
                    <td className="px-5 py-3 text-text-2">{job.difficulty}</td>
                    <td className="px-5 py-3">
                      <Badge variant={jobStatusVariant[job.status] || 'secondary'} size="sm">
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 font-mono tabular-nums text-text-2">
                      {job.duration_ms ? `${job.duration_ms}ms` : '—'}
                    </td>
                    <td className="px-5 py-3 font-mono tabular-nums text-text-2">{job.retry_count}</td>
                    <td className="px-5 py-3 text-error text-xs max-w-[200px] truncate">
                      {job.error_message || '—'}
                    </td>
                    <td className="px-5 py-3 text-[11px] text-text-3">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}

function RegenerateForm({
  onRegenerate,
  disabled,
}: {
  onRegenerate: (date: string, difficulty: string) => void;
  disabled: boolean;
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [difficulty, setDifficulty] = useState('medium');

  return (
    <div className="flex items-end gap-3">
      <div>
        <label className="text-[11px] text-text-3 mb-1 block">Target date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label className="text-[11px] text-text-3 mb-1 block">Difficulty</label>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input">
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <Button onClick={() => onRegenerate(date, difficulty)} disabled={disabled} size="sm">
        {disabled ? 'Generating…' : 'Generate'}
      </Button>
    </div>
  );
}

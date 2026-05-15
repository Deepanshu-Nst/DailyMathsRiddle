'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RefreshCw } from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  actor: { username: string; full_name: string | null } | null;
}

const ACTION_LABELS: Record<string, string> = {
  publish: 'Published',
  replace: 'Replaced',
  rollback: 'Rolled back',
  regenerate: 'Regenerated',
  approve: 'Approved',
  reject: 'Rejected',
  config_change: 'Config changed',
  manual_publish: 'Manual publish',
};

export default function AuditHistoryPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filter) params.set('action', filter);
      const res = await fetch(`/api/admin/audit?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-1">Audit history</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-text-2">
            Immutable log of every admin action. {total > 0 && `${total} entries total.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input text-sm py-1.5"
            style={{ width: 160 }}
          >
            <option value="">All actions</option>
            <option value="publish">Publish</option>
            <option value="replace">Replace</option>
            <option value="rollback">Rollback</option>
            <option value="regenerate">Regenerate</option>
            <option value="reject">Reject</option>
            <option value="config_change">Config change</option>
            <option value="manual_publish">Manual publish</option>
          </select>
          <Button variant="secondary" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-shimmer h-16 rounded-xl" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card padding="lg" className="text-center text-sm text-text-3">
          No audit entries {filter ? `for action "${filter}"` : 'recorded yet'}.
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((entry) => (
            <Card key={entry.id} padding="md" className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="secondary" size="sm">{ACTION_LABELS[entry.action] || entry.action}</Badge>
                  <span className="text-xs text-text-3">
                    {entry.target_type}
                    {entry.target_id && (
                      <span className="font-mono text-text-4 ml-1">{entry.target_id.slice(0, 8)}…</span>
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-text-3">
                  <span>
                    by{' '}
                    <span className="text-text-2 font-medium">
                      {entry.actor?.username || entry.actor?.full_name || 'system'}
                    </span>
                  </span>
                  <span className="font-mono text-text-4">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
                {Object.keys(entry.metadata).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-[11px] text-text-4 cursor-pointer hover:text-text-3">
                      Metadata
                    </summary>
                    <pre className="mt-1 text-[11px] text-text-3 font-mono bg-bg-muted rounded-lg p-3 overflow-x-auto">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

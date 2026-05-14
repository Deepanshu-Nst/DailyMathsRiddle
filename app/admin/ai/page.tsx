'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface AIConfig {
  is_enabled: boolean;
  safe_mode: boolean;
  max_retries: number;
  mode: string;
}

interface TelemetryRow {
  day: string;
  total_runs: number;
  successes: number;
  failures: number;
  success_rate_pct: number;
  avg_duration_ms: number;
  duplicate_rate_pct: number;
}

interface PipelineLog {
  id: string;
  event_type: string;
  difficulty: string;
  duration_ms: number;
  attempts_made: number;
  failure_reason: string | null;
  created_at: string;
}

export default function GenerationSettingsPage() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [stats, setStats] = useState<TelemetryRow[]>([]);
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/admin/ai/stats'),
        fetch('/api/admin/ai/logs?limit=15'),
      ]);

      const statsData = await statsRes.json();
      const logsData = await logsRes.json();

      if (statsData.error) throw new Error(statsData.error);

      setStats(statsData.stats || []);
      setConfig(statsData.config);
      setLogs(logsData.logs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<AIConfig>) => {
    if (!config) return;
    setIsSaving(true);
    try {
      const updated = { ...config, ...newConfig };
      const res = await fetch('/api/admin/ai/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error('Failed to update config');
      setConfig(updated);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton-shimmer h-8 w-48 rounded-md" />
        <div className="skeleton-shimmer h-4 w-96 rounded-md" />
        <div className="grid gap-4 sm:grid-cols-3 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const latestStats = stats[0];

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <header className="flex flex-col gap-2 border-b border-border pb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-text-1">Generation settings</h1>
          <Button variant="secondary" size="sm" onClick={fetchData} disabled={loading}>
            Refresh
          </Button>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-text-2">
          AI riddle generation configuration and pipeline performance. All metrics are from real
          pipeline events — nothing is sampled or estimated.
        </p>
      </header>

      {error && (
        <Card padding="md" className="border-error/30 bg-error-bg text-sm text-error">
          {error}
        </Card>
      )}

      {/* Config Controls */}
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          {/* Status Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card padding="md" className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">
                Status
              </span>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    config?.is_enabled ? 'bg-success' : 'bg-error'
                  }`}
                />
                <span className="text-lg font-semibold text-text-1">
                  {config?.is_enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </Card>
            <Card padding="md" className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">
                Success rate (latest day)
              </span>
              <span className="text-2xl font-semibold tabular-nums text-text-1">
                {latestStats?.success_rate_pct ?? '—'}%
              </span>
            </Card>
            <Card padding="md" className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">
                Avg latency
              </span>
              <span className="text-2xl font-semibold tabular-nums text-text-1">
                {latestStats?.avg_duration_ms ? `${Math.round(latestStats.avg_duration_ms)}ms` : '—'}
              </span>
            </Card>
          </div>

          {/* Daily breakdown */}
          {stats.length > 0 && (
            <Card padding="none" className="overflow-hidden">
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold text-text-1">Daily breakdown</h2>
                <p className="text-xs text-text-3">Most recent 14 days with activity</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-text-3">
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Runs</th>
                      <th className="px-5 py-3 font-medium">Success</th>
                      <th className="px-5 py-3 font-medium">Failed</th>
                      <th className="px-5 py-3 font-medium">Rate</th>
                      <th className="px-5 py-3 font-medium">Avg ms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.slice(0, 14).map((s, i) => (
                      <tr key={`${s.day}-${i}`} className="border-b border-border-subtle">
                        <td className="px-5 py-3 font-mono text-text-2">
                          {new Date(s.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-5 py-3 font-mono tabular-nums text-text-1">{s.total_runs}</td>
                        <td className="px-5 py-3 font-mono tabular-nums text-success">{s.successes}</td>
                        <td className="px-5 py-3 font-mono tabular-nums text-error">{s.failures}</td>
                        <td className="px-5 py-3 font-mono tabular-nums text-text-1">{s.success_rate_pct}%</td>
                        <td className="px-5 py-3 font-mono tabular-nums text-text-2">{Math.round(s.avg_duration_ms)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Recent events */}
          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-text-1">Recent pipeline events</h2>
              <p className="text-xs text-text-3">Newest first · last 15 events</p>
            </div>
            {logs.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-text-3">
                No pipeline events recorded yet. Events appear after the next generation run.
              </div>
            ) : (
              <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
                {logs.map((log) => (
                  <li key={log.id} className="flex flex-col gap-1 px-5 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={log.event_type === 'success' ? 'success' : 'secondary'}
                        size="sm"
                        className="font-mono"
                      >
                        {log.event_type}
                      </Badge>
                      <span className="text-text-3">{log.difficulty}</span>
                      {log.duration_ms != null && (
                        <span className="font-mono text-[11px] text-text-4">{log.duration_ms}ms</span>
                      )}
                    </div>
                    <div className="flex justify-between gap-2 font-mono text-[11px] text-text-3">
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                      {log.failure_reason && (
                        <span className="truncate text-error max-w-[300px]">{log.failure_reason}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Sidebar: Config */}
        <div className="flex flex-col gap-6">
          <Card padding="md" className="flex flex-col gap-5">
            <h3 className="text-sm font-semibold text-text-1">Engine configuration</h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-1">Generation enabled</p>
                <p className="text-xs text-text-3">Master switch for all AI calls</p>
              </div>
              <ToggleSwitch
                active={config?.is_enabled ?? false}
                onChange={(v) => updateConfig({ is_enabled: v })}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-1">Safe mode</p>
                <p className="text-xs text-text-3">Stricter validation rules</p>
              </div>
              <ToggleSwitch
                active={config?.safe_mode ?? false}
                onChange={(v) => updateConfig({ safe_mode: v })}
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-text-3 mb-2 block">
                Max retries per run
              </label>
              <div className="flex gap-1">
                {[1, 3, 5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => updateConfig({ max_retries: n })}
                    disabled={isSaving}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                      config?.max_retries === n
                        ? 'bg-text-1 text-bg'
                        : 'bg-surface text-text-3 hover:bg-surface-hover'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-text-3 mb-2 block">
                Generation mode
              </label>
              <select
                value={config?.mode}
                onChange={(e) => updateConfig({ mode: e.target.value })}
                disabled={isSaving}
                className="input"
              >
                <option value="standard">Standard</option>
                <option value="creative">Creative</option>
                <option value="deterministic">Deterministic priority</option>
              </select>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function ToggleSwitch({
  active,
  onChange,
  disabled,
}: {
  active: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!active)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
        active
          ? 'border-success/40 bg-success/20'
          : 'border-border bg-surface'
      }`}
      role="switch"
      aria-checked={active}
    >
      <div
        className={`absolute top-[3px] h-4 w-4 rounded-full bg-text-1 transition-[left] ${
          active ? 'left-[23px]' : 'left-[3px]'
        }`}
      />
    </button>
  );
}

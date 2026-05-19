'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SkeletonGroup } from '@/components/ui/Feedback';
import { staggerContainer, fadeUp, spring } from '@/lib/motion';
import { Cpu, RefreshCw } from 'lucide-react';

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
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
          <div className="skeleton-shimmer h-7 w-48 rounded-md" />
        </div>
        <div className="skeleton-shimmer h-4 w-96 rounded-md" />
        <div className="grid gap-4 sm:grid-cols-3 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer h-24 rounded-xl" />
          ))}
        </div>
        <SkeletonGroup count={5} itemClassName="h-16 w-full" />
      </div>
    );
  }

  const latestStats = stats[0];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-10"
    >
      {/* Header */}
      <motion.header variants={fadeUp} className="flex flex-col gap-2 border-b border-white/[0.06] pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Cpu size={16} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-1">Generation settings</h1>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-text-2">
          AI riddle generation configuration and pipeline performance. All metrics are from real
          pipeline events — nothing is sampled or estimated.
        </p>
      </motion.header>

      {error && (
        <Card padding="md" className="border-error/30 bg-error/[0.05] text-sm text-error">
          {error}
        </Card>
      )}

      {/* Config Controls */}
      <motion.section variants={fadeUp} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          {/* Status Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card variant="metric" padding="md" className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">
                Status
              </span>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    config?.is_enabled ? 'bg-success shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'bg-error shadow-[0_0_8px_rgba(248,113,113,0.4)]'
                  }`}
                />
                <span className="text-lg font-semibold text-text-1">
                  {config?.is_enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </Card>
            <Card variant="metric" padding="md" className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">
                Success rate (latest day)
              </span>
              <span className="text-2xl font-semibold tabular-nums text-text-1">
                {latestStats?.success_rate_pct ?? '—'}%
              </span>
            </Card>
            <Card variant="metric" padding="md" className="flex flex-col gap-1.5">
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
              <div className="border-b border-white/[0.06] px-5 py-3.5 bg-white/[0.02]">
                <h2 className="text-sm font-semibold text-text-1">Daily breakdown</h2>
                <p className="text-xs text-text-3">Most recent 14 days with activity</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left text-[11px] font-bold uppercase tracking-[0.1em] text-text-3">
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Runs</th>
                      <th className="px-5 py-3.5">Success</th>
                      <th className="px-5 py-3.5">Failed</th>
                      <th className="px-5 py-3.5">Rate</th>
                      <th className="px-5 py-3.5">Avg ms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.slice(0, 14).map((s, i) => (
                      <tr 
                        key={`${s.day}-${i}`} 
                        className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-3.5 font-mono text-text-2">
                          {new Date(s.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5 font-mono tabular-nums text-text-1">{s.total_runs}</td>
                        <td className="px-5 py-3.5 font-mono tabular-nums text-success">{s.successes}</td>
                        <td className="px-5 py-3.5 font-mono tabular-nums text-error">{s.failures}</td>
                        <td className="px-5 py-3.5 font-mono tabular-nums text-text-1">{s.success_rate_pct}%</td>
                        <td className="px-5 py-3.5 font-mono tabular-nums text-text-2">{Math.round(s.avg_duration_ms)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Recent events */}
          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-3.5 bg-white/[0.02]">
              <h2 className="text-sm font-semibold text-text-1">Recent pipeline events</h2>
              <p className="text-xs text-text-3">Newest first · last 15 events</p>
            </div>
            {logs.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-text-3">
                No pipeline events recorded yet. Events appear after the next generation run.
              </div>
            ) : (
              <ul className="max-h-[420px] divide-y divide-white/[0.04] overflow-y-auto">
                {logs.map((log) => (
                  <li key={log.id} className="flex items-start gap-3 px-5 py-4 text-sm transition-colors hover:bg-white/[0.02]">
                    {/* Timeline dot */}
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      log.event_type === 'success' ? 'bg-success shadow-[0_0_6px_rgba(52,211,153,0.4)]' : 'bg-text-4'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={log.event_type === 'success' ? 'success' : 'secondary'}
                          size="sm"
                          className="font-mono uppercase"
                        >
                          {log.event_type}
                        </Badge>
                        <span className="text-text-3">{log.difficulty}</span>
                        {log.duration_ms != null && (
                          <span className="font-mono text-[11px] text-text-4">{log.duration_ms}ms</span>
                        )}
                      </div>
                      <div className="flex justify-between gap-2 font-mono text-[11px] text-text-3 mt-1.5">
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                        {log.failure_reason && (
                          <span className="truncate text-error max-w-[300px]">{log.failure_reason}</span>
                        )}
                      </div>
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
              <label className="text-[11px] font-medium uppercase tracking-wide text-text-3 mb-3 block">
                Max retries per run
              </label>
              <div className="flex gap-1.5">
                {[1, 3, 5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => updateConfig({ max_retries: n })}
                    disabled={isSaving}
                    className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                      config?.max_retries === n
                        ? 'bg-primary text-white shadow-[0_0_16px_rgba(108,123,255,0.25)]'
                        : 'bg-white/[0.04] text-text-3 hover:bg-white/[0.08] border border-white/[0.06]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-text-3 mb-3 block">
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
      </motion.section>
    </motion.div>
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
      className={`relative h-7 w-12 shrink-0 rounded-full border transition-all ${
        active
          ? 'border-success/40 bg-success/20 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
          : 'border-white/[0.08] bg-white/[0.04]'
      }`}
      role="switch"
      aria-checked={active}
    >
      <motion.div
        className="absolute top-[3px] h-5 w-5 rounded-full bg-text-1 shadow-sm"
        animate={{ left: active ? 23 : 3 }}
        transition={{ type: 'spring', damping: 20, stiffness: 400 }}
      />
    </button>
  );
}

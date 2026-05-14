'use client';
import { useEffect, useState } from 'react';
import type { PipelineStats, PipelineEventType } from '@/types/analytics';

const EVENT_LABELS: Record<PipelineEventType, string> = {
  success: 'Success',
  validation_failed: 'Validation failed',
  duplicate_rejected: 'Duplicate rejected',
  structural_rejected: 'Structural rejected',
  generator_error: 'Generator error',
  rate_limited: 'Rate limited (429)',
  db_insert_failed: 'DB insert failed',
};

const EVENT_COLORS: Record<PipelineEventType, string> = {
  success: '#4ade80',
  validation_failed: '#fb923c',
  duplicate_rejected: '#f59e0b',
  structural_rejected: '#a78bfa',
  generator_error: '#ef4444',
  rate_limited: '#f87171',
  db_insert_failed: '#dc2626',
};

export default function AdminObservabilityPage() {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const fetchStats = async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stats?days=${d}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(days); }, [days]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 32px', fontFamily: 'var(--font-body, sans-serif)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
              Admin / Observability
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
              Generation Pipeline
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 7, 30].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  background: days === d ? 'var(--text-1)' : 'transparent',
                  color: days === d ? 'var(--bg)' : 'var(--text-3)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {d}d
              </button>
            ))}
            <button
              onClick={() => fetchStats(days)}
              style={{ padding: '6px 14px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--text-3)', cursor: 'pointer' }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '14px 18px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, marginBottom: 24, color: 'var(--error, #ef4444)', fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading && !stats && (
          <div style={{ color: 'var(--text-4)', fontSize: 14 }}>Loading metrics...</div>
        )}

        {stats && (
          <>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
              <KpiCard label="Success Rate" value={`${stats.rates.successPct}%`} sub={`${stats.totals.successes} / ${stats.totals.runs} runs`} color="#4ade80" />
              <KpiCard label="Avg Latency" value={stats.performance.avgSuccessMs ? `${(stats.performance.avgSuccessMs / 1000).toFixed(1)}s` : '—'} sub="successful generations" />
              <KpiCard label="Avg Score" value={stats.performance.avgValidationScore?.toFixed(2) ?? '—'} sub="validation score /10" />
              <KpiCard label="Duplicate Rate" value={`${stats.rates.duplicateRatePct}%`} sub="of all attempts" color={stats.rates.duplicateRatePct > 30 ? '#f59e0b' : undefined} />
            </div>

            {/* Breakdown + By Difficulty */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>

              {/* Event type breakdown */}
              <SectionCard title="Event Breakdown">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(stats.breakdown).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                    const pct = stats.totals.runs > 0 ? Math.round((count / stats.totals.runs) * 100) : 0;
                    return (
                      <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: EVENT_COLORS[type as PipelineEventType] ?? '#888', flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: 12, color: 'var(--text-2)' }}>
                          {EVENT_LABELS[type as PipelineEventType] ?? type}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 36, textAlign: 'right' }}>{count}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-4)', minWidth: 36, textAlign: 'right' }}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              {/* By difficulty */}
              <SectionCard title="By Difficulty">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Object.entries(stats.byDifficulty).map(([diff, d]) => (
                    <div key={diff}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-2)', textTransform: 'capitalize' }}>{diff}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{d.successes}/{d.runs} ({d.successPct}%)</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                        <div style={{ height: '100%', borderRadius: 2, background: d.successPct > 60 ? '#4ade80' : '#f59e0b', width: `${d.successPct}%`, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            {/* Additional KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
              <KpiCard label="Validation Fail Rate" value={`${stats.rates.validationFailPct}%`} />
              <KpiCard label="Rate Limit Rate" value={`${stats.rates.rateLimitedPct}%`} color={stats.rates.rateLimitedPct > 15 ? '#ef4444' : undefined} />
              <KpiCard label="Avg Candidates / Run" value={stats.performance.avgCandidatesTried?.toString() ?? '—'} sub="per pipeline call" />
            </div>

            {/* Recent events */}
            <SectionCard title="Recent Events (last 20)">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Time', 'Type', 'Diff', 'Daily', 'Score', 'Duration', 'Failure'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-4)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentEvents.map((e, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '7px 10px', color: 'var(--text-4)', whiteSpace: 'nowrap' }}>
                          {new Date(e.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '7px 10px' }}>
                          <span style={{ color: EVENT_COLORS[e.eventType] ?? '#888', fontWeight: 600 }}>
                            {EVENT_LABELS[e.eventType] ?? e.eventType}
                          </span>
                        </td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-3)', textTransform: 'capitalize' }}>{e.difficulty}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-4)' }}>{e.isDaily ? 'Yes' : '—'}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-3)' }}>{e.validationScore?.toFixed(1) ?? '—'}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-4)' }}>{e.durationMs ? `${(e.durationMs / 1000).toFixed(1)}s` : '—'}</td>
                        <td style={{ padding: '7px 10px', color: 'var(--text-4)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.failureReason ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ padding: '18px 20px', border: '1px solid var(--border)', borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
      <p style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: color ?? 'var(--text-1)', margin: '0 0 4px', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-4)', margin: 0 }}>{sub}</p>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '20px 22px', border: '1px solid var(--border)', borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
      <p style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px', fontWeight: 600 }}>{title}</p>
      {children}
    </div>
  );
}

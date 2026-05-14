'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  user?: { username: string } | null;
}

export default function AIObservabilityDashboard() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [stats, setStats] = useState<TelemetryRow[]>([]);
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/admin/ai/stats'),
        fetch('/api/admin/ai/logs?limit=10')
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

  if (loading) return (
    <div style={{ background: '#050505', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f0' }}>
      <div className="font-mono">INITIALIZING OBSERVERS...</div>
    </div>
  );

  return (
    <div style={{ background: '#050505', minHeight: '100vh', color: '#fff', padding: '40px 20px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <header style={{ marginBottom: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: config?.is_enabled ? '#0f0' : '#f00', boxShadow: config?.is_enabled ? '0 0 10px #0f0' : '0 0 10px #f00' }} />
              <h1 className="font-display" style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>AI OPS CENTER</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <p style={{ color: '#666', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Neural Pipeline Observability & Control</p>
              <button
                onClick={() => { fetchData(); }}
                disabled={loading}
                style={{
                  background: 'transparent', border: '1px solid #222', borderRadius: 6,
                  color: '#444', fontSize: 10, padding: '4px 8px', cursor: 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.05em'
                }}
              >
                {loading ? 'SYNCING...' : 'RE-SYNC'}
              </button>
            </div>
          </div>
          <div className="font-mono" style={{ fontSize: 12, color: '#333' }}>
            NODE_ID: {Math.random().toString(36).substring(7).toUpperCase()}
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>

          <main style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Stats Overview */}
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              <StatCard label="Success Rate" value={`${stats[0]?.success_rate_pct || 0}%`} sub="Last 24h" trend={+5} />
              <StatCard label="Avg Latency" value={`${Math.round(stats[0]?.avg_duration_ms || 0)}ms`} sub="Global" color="#0af" />
              <StatCard label="Duplicate Rate" value={`${stats[0]?.duplicate_rate_pct || 0}%`} sub="Rejection %" color="#f0f" />
              <StatCard label="System Load" value="NOMINAL" sub="Engine Status" color="#0f0" />
            </section>

            {/* Charts Section */}
            <section style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 20, padding: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
                <h3 className="font-mono" style={{ fontSize: 14, color: '#666' }}>// PERFORMANCE_TIMELINE</h3>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#444' }}>
                    <div style={{ width: 8, height: 8, background: '#0f0' }} /> SUCCESS
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#444' }}>
                    <div style={{ width: 8, height: 8, background: '#f00' }} /> FAILURE
                  </div>
                </div>
              </div>
              <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                {stats.slice(0, 14).reverse().map((s, i) => (
                  <div key={`${s.day}-${i}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', background: '#111', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: `${s.success_rate_pct}%`, background: '#0f0', opacity: 0.8 }} />
                      <div style={{ height: `${100 - s.success_rate_pct}%`, background: '#f00', opacity: 0.4 }} />
                    </div>
                    <div style={{ fontSize: 9, color: '#444', textAlign: 'center', fontWeight: 'bold' }}>{new Date(s.day).getDate()}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent Logs */}
            <section style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #1a1a1a' }}>
                <h3 className="font-mono" style={{ fontSize: 14, color: '#666' }}>// PIPELINE_TRACES</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#444', textTransform: 'uppercase', fontSize: 10 }}>
                    <th style={{ padding: '16px 32px' }}>Event</th>
                    <th style={{ padding: '16px 32px' }}>Difficulty</th>
                    <th style={{ padding: '16px 32px' }}>Latency</th>
                    <th style={{ padding: '16px 32px' }}>Outcome</th>
                    <th style={{ padding: '16px 32px' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                      <td style={{ padding: '16px 32px' }}>
                        <span style={{ color: log.event_type === 'success' ? '#0f0' : '#f00' }}>▶</span> {log.event_type}
                      </td>
                      <td style={{ padding: '16px 32px', color: '#666' }}>{log.difficulty}</td>
                      <td style={{ padding: '16px 32px' }}>{log.duration_ms}ms</td>
                      <td style={{ padding: '16px 32px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#aaa' }}>
                        {log.failure_reason || 'STABLE_SAVE'}
                      </td>
                      <td style={{ padding: '16px 32px', color: '#333' }}>{new Date(log.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

          </main>

          {/* Sidebar Controls */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 20, padding: 24 }}>
              <h3 className="font-mono" style={{ fontSize: 12, color: '#666', marginBottom: 20, textTransform: 'uppercase' }}>Engine Override</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ControlToggle
                  label="Master Generation"
                  description="Enable/Disable all AI calls"
                  active={config?.is_enabled ?? false}
                  onChange={(v) => updateConfig({ is_enabled: v })}
                  disabled={isSaving}
                />

                <ControlToggle
                  label="Safe Mode"
                  description="Enforce strict validation"
                  active={config?.safe_mode ?? false}
                  onChange={(v) => updateConfig({ safe_mode: v })}
                  disabled={isSaving}
                />

                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Max Pipeline Retries</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 3, 5, 10].map(n => (
                      <button
                        key={n}
                        onClick={() => updateConfig({ max_retries: n })}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 'bold',
                          background: config?.max_retries === n ? '#fff' : '#111',
                          color: config?.max_retries === n ? '#000' : '#444',
                          border: 'none', cursor: 'pointer'
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Active Mode</label>
                  <select
                    value={config?.mode}
                    onChange={(e) => updateConfig({ mode: e.target.value })}
                    style={{
                      width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8,
                      padding: 10, color: '#fff', fontSize: 13, outline: 'none'
                    }}
                  >
                    <option value="standard">Standard Engine</option>
                    <option value="creative">Creative / High-Entropy</option>
                    <option value="deterministic">Deterministic Priority</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #050505, #111)', border: '1px solid #222', borderRadius: 20, padding: 24 }}>
              <h3 className="font-mono" style={{ fontSize: 11, color: '#0f0', marginBottom: 12 }}>SYSTEM_LOGS</h3>
              <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', lineHeight: 1.6 }}>
                <div>[AI SETTINGS LOADED] OK</div>
                <div>[PIPELINE STATUS] NOMINAL</div>
                <div>[RETRY ADAPTATION] ACTIVE</div>
                <div style={{ color: '#666' }}>// waiting for telemetry...</div>
              </div>
            </div>

          </aside>

        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, trend, color = '#fff' }: { label: string, value: string, sub: string, trend?: number, color?: string }) {
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 20, padding: 24 }}>
      <p style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color }}>{value}</h2>
        {trend && (
          <span style={{ fontSize: 10, color: trend > 0 ? '#0f0' : '#f00' }}>
            {trend > 0 ? '↑' : '↓'}{Math.abs(trend)}%
          </span>
        )}
      </div>
      <p style={{ fontSize: 10, color: '#333', marginTop: 4 }}>{sub}</p>
    </div>
  );
}

function ControlToggle({ label, description, active, onChange, disabled }: { label: string, description: string, active: boolean, onChange: (v: boolean) => void, disabled?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{label}</p>
        <p style={{ fontSize: 11, color: '#444' }}>{description}</p>
      </div>
      <button
        disabled={disabled}
        onClick={() => onChange(!active)}
        style={{
          width: 44, height: 22, borderRadius: 11, background: active ? '#0f0' : '#222',
          border: 'none', cursor: 'pointer', position: 'relative', transition: '0.2s'
        }}
      >
        <div style={{
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3, left: active ? 25 : 3, transition: '0.2s'
        }} />
      </button>
    </div>
  );
}

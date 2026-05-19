import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getAdminOverview } from '@/lib/admin/overview';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Activity, Zap, AlertTriangle, ArrowRight, Clock, Shield, Database, Copy } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireAdmin();
  const { counts, pipeline, pipelineError, operationalHealth } = await getAdminOverview(7);
  const oh = operationalHealth;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3 border-b border-white/[0.06] pb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Activity size={16} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-1">Overview</h1>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-text-2">
          Live counts from the database and generation pipeline events from the last seven days. No sampled
          telemetry — if a metric is empty, the underlying table has no rows yet.
        </p>
        <p className="font-mono text-xs text-text-3 flex items-center gap-2">
          <Clock size={12} className="text-text-4" />
          IST Date: {oh.currentISTDate} · Next rollover: {new Date(oh.nextRolloverISO).toISOString()}
        </p>
      </header>

      {/* ── Operational Health ── */}
      <div className="flex flex-col gap-5">
        <h2 className="text-sm font-semibold text-text-1 flex items-center gap-2">
          <Shield size={14} className="text-primary" />
          System Health
        </h2>

        {oh.missingDifficulties.length > 0 && (
          <Card padding="md" className="border-error/30 bg-error/[0.05]">
            <div className="flex items-center gap-2 text-sm font-semibold text-error">
              <AlertTriangle size={16} />
              Missing daily riddles for: {oh.missingDifficulties.join(', ')}
            </div>
            <p className="mt-1.5 text-xs text-text-2 pl-6">
              These difficulties have no published riddle for today ({oh.currentISTDate}).
              The system will auto-generate on first request, but this adds latency.
            </p>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card variant="metric" padding="md" className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">Last Publish</span>
            <span className="font-mono text-sm text-text-1">
              {oh.lastPublishTimestamp
                ? new Date(oh.lastPublishTimestamp).toISOString().replace('T', ' ').slice(0, 19)
                : 'No publishes yet'}
            </span>
          </Card>
          <Card variant="metric" padding="md" className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">Gen Success (24h)</span>
            <span className="font-mono text-lg text-text-1">
              {oh.generationSuccess24h !== null ? `${oh.generationSuccess24h}%` : '—'}
              <span className="text-xs text-text-3 ml-1.5">({oh.generationTotal24h} total)</span>
            </span>
          </Card>
          <Card variant="metric" padding="md" className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">Fallbacks (24h)</span>
            <span className="font-mono text-lg text-text-1">{oh.fallbackActivations24h}</span>
          </Card>
          <Card variant="metric" padding="md" className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <Copy size={12} className="text-text-4" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">Dupe Rejects (24h)</span>
            </div>
            <span className="font-mono text-lg text-text-1">{oh.duplicateRejections24h}</span>
          </Card>
        </div>

        {/* Active daily riddles */}
        <Card padding="md" className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-text-1 flex items-center gap-2">
            <Zap size={14} className="text-primary" />
            Active Daily Riddles — {oh.currentISTDate}
          </h3>
          {oh.activeDailyRiddles.length === 0 ? (
            <p className="text-xs text-text-3">No daily riddles published for today yet.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              {oh.activeDailyRiddles.map((r: any) => (
                <div key={r.riddleId} className="rounded-xl border border-white/[0.06] bg-bg-subtle/60 p-3.5 transition-colors hover:bg-white/[0.03]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge
                      variant={r.difficulty === 'hard' ? 'danger' : r.difficulty === 'medium' ? 'warning' : 'success'}
                      size="sm"
                      className="font-mono uppercase"
                    >
                      {r.difficulty}
                    </Badge>
                    <Badge variant="secondary" size="sm" className="font-mono">{r.category}</Badge>
                  </div>
                  <p className="font-mono text-[10px] text-text-4 truncate">{r.riddleId}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Queue health */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card variant="metric" padding="md" className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">Queue: Pending</span>
            <span className="font-mono text-lg text-text-1">{oh.queueHealth.pending}</span>
          </Card>
          <Card variant="metric" padding="md" className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">Queue: Published</span>
            <span className="font-mono text-lg text-text-1">{oh.queueHealth.published}</span>
          </Card>
          <Card variant="metric" padding="md" className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">Jobs: Failed</span>
            <span className="font-mono text-lg text-text-1">{oh.queueHealth.failed}</span>
          </Card>
        </div>
      </div>

      {/* ── Core Counts ── */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text-1 flex items-center gap-2">
          <Database size={14} className="text-primary" />
          Core Counts
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card variant="metric" padding="md" className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">Profiles</span>
            <span className="text-2xl font-semibold tabular-nums text-text-1">{counts.profiles.toLocaleString()}</span>
          </Card>
          <Card variant="metric" padding="md" className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">Published riddles</span>
            <span className="text-2xl font-semibold tabular-nums text-text-1">
              {counts.publishedRiddles.toLocaleString()}
            </span>
          </Card>
          <Card variant="metric" padding="md" className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">Recorded solves</span>
            <span className="text-2xl font-semibold tabular-nums text-text-1">
              {counts.solvedAttempts.toLocaleString()}
            </span>
          </Card>
        </div>
      </div>

      {/* ── Pipeline Stats ── */}
      {pipelineError ? (
        <Card padding="md" className="border-error/30 bg-error/[0.05] text-sm text-error">
          Pipeline query failed: {pipelineError}
        </Card>
      ) : pipeline && pipeline.totals.runs > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card padding="md" className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-text-1 flex items-center gap-2">
              <Activity size={14} className="text-primary" />
              Generation pipeline (7d)
            </h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
                <dt className="text-text-3 text-[11px] uppercase tracking-wide mb-1">Runs</dt>
                <dd className="font-mono text-lg text-text-1">{pipeline.totals.runs}</dd>
              </div>
              <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
                <dt className="text-text-3 text-[11px] uppercase tracking-wide mb-1">Success rate</dt>
                <dd className="font-mono text-lg text-text-1">{pipeline.rates.successPct}%</dd>
              </div>
              <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
                <dt className="text-text-3 text-[11px] uppercase tracking-wide mb-1">Duplicate reject</dt>
                <dd className="font-mono text-text-1">{pipeline.rates.duplicateRatePct}%</dd>
              </div>
              <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
                <dt className="text-text-3 text-[11px] uppercase tracking-wide mb-1">Validation fail</dt>
                <dd className="font-mono text-text-1">{pipeline.rates.validationFailPct}%</dd>
              </div>
              <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
                <dt className="text-text-3 text-[11px] uppercase tracking-wide mb-1">Avg success latency</dt>
                <dd className="font-mono text-text-1">
                  {pipeline.performance.avgSuccessMs != null ? `${pipeline.performance.avgSuccessMs} ms` : '—'}
                </dd>
              </div>
              <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
                <dt className="text-text-3 text-[11px] uppercase tracking-wide mb-1">Avg validation score</dt>
                <dd className="font-mono text-text-1">
                  {pipeline.performance.avgValidationScore ?? '—'}
                </dd>
              </div>
            </dl>
            <Link href="/admin/ai" className="text-xs font-medium text-primary hover:underline flex items-center gap-1 group">
              Open AI ops
              <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-3.5 bg-white/[0.02]">
              <h2 className="text-sm font-semibold text-text-1">Recent pipeline events</h2>
              <p className="text-xs text-text-3">Newest first · capped at 20</p>
            </div>
            <ul className="max-h-[420px] divide-y divide-white/[0.04] overflow-y-auto">
              {pipeline.recentEvents.map((ev, idx) => (
                <li key={`${ev.createdAt}-${idx}`} className="flex flex-col gap-1.5 px-5 py-3.5 text-sm transition-colors hover:bg-white/[0.02]">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${ev.eventType === 'success' ? 'bg-success' : 'bg-text-4'}`} />
                    <Badge
                      variant={ev.eventType === 'success' ? 'success' : 'secondary'}
                      size="sm"
                      className="font-mono uppercase"
                    >
                      {ev.eventType}
                    </Badge>
                    <span className="text-text-3">{ev.difficulty}</span>
                    {ev.isDaily && <Badge variant="info" size="sm" className="font-mono">daily</Badge>}
                  </div>
                  <div className="flex justify-between gap-2 font-mono text-[11px] text-text-3 pl-3.5">
                    <span>{new Date(ev.createdAt).toISOString()}</span>
                    {ev.failureReason && <span className="truncate text-error">{ev.failureReason}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : (
        <Card padding="md" className="text-sm text-text-2">
          No pipeline events in the selected window. After the next generation run, metrics will appear here.
        </Card>
      )}

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3">
        {[
          { href: '/admin/riddles', label: 'Scheduled riddles' },
          { href: '/admin/challenges', label: 'Challenges' },
          { href: '/admin/failures', label: 'Failures' },
          { href: '/admin/users', label: 'Users' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-text-2 transition-all hover:border-primary/25 hover:text-text-1 hover:bg-white/[0.04]"
          >
            {link.label}
            <ArrowRight size={12} className="text-text-4 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </div>
  );
}

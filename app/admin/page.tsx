import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getAdminOverview } from '@/lib/admin/overview';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getOfficialDailyDate, OFFICIAL_DAILY_TZ } from '@/lib/timezone';

export default async function AdminDashboard() {
  await requireAdmin();
  const { counts, pipeline, pipelineError } = await getAdminOverview(7);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2 border-b border-border pb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-text-1">Overview</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-text-2">
          Live counts from the database and generation pipeline events from the last seven days. No sampled
          telemetry — if a metric is empty, the underlying table has no rows yet.
        </p>
        <p className="font-mono text-xs text-text-3">
          Official daily date: {getOfficialDailyDate()} · {OFFICIAL_DAILY_TZ}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card padding="md" className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">Profiles</span>
          <span className="text-2xl font-semibold tabular-nums text-text-1">{counts.profiles.toLocaleString()}</span>
        </Card>
        <Card padding="md" className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">Published riddles</span>
          <span className="text-2xl font-semibold tabular-nums text-text-1">
            {counts.publishedRiddles.toLocaleString()}
          </span>
        </Card>
        <Card padding="md" className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">Recorded solves</span>
          <span className="text-2xl font-semibold tabular-nums text-text-1">
            {counts.solvedAttempts.toLocaleString()}
          </span>
        </Card>
      </div>

      {pipelineError ? (
        <Card padding="md" className="border-error/30 bg-error-bg text-sm text-error">
          Pipeline query failed: {pipelineError}
        </Card>
      ) : pipeline && pipeline.totals.runs > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card padding="md" className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-text-1">Generation pipeline (7d)</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-text-3">Runs</dt>
                <dd className="font-mono text-lg text-text-1">{pipeline.totals.runs}</dd>
              </div>
              <div>
                <dt className="text-text-3">Success rate</dt>
                <dd className="font-mono text-lg text-text-1">{pipeline.rates.successPct}%</dd>
              </div>
              <div>
                <dt className="text-text-3">Duplicate reject</dt>
                <dd className="font-mono text-text-1">{pipeline.rates.duplicateRatePct}%</dd>
              </div>
              <div>
                <dt className="text-text-3">Validation fail</dt>
                <dd className="font-mono text-text-1">{pipeline.rates.validationFailPct}%</dd>
              </div>
              <div>
                <dt className="text-text-3">Avg success latency</dt>
                <dd className="font-mono text-text-1">
                  {pipeline.performance.avgSuccessMs != null ? `${pipeline.performance.avgSuccessMs} ms` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-text-3">Avg validation score</dt>
                <dd className="font-mono text-text-1">
                  {pipeline.performance.avgValidationScore ?? '—'}
                </dd>
              </div>
            </dl>
            <Link href="/admin/ai" className="text-xs font-medium text-primary hover:underline">
              Open AI ops →
            </Link>
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-text-1">Recent pipeline events</h2>
              <p className="text-xs text-text-3">Newest first · capped at 20</p>
            </div>
            <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
              {pipeline.recentEvents.map((ev, idx) => (
                <li key={`${ev.createdAt}-${idx}`} className="flex flex-col gap-1 px-5 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={ev.eventType === 'success' ? 'success' : 'secondary'}
                      size="sm"
                      className="font-mono uppercase"
                    >
                      {ev.eventType}
                    </Badge>
                    <span className="text-text-3">{ev.difficulty}</span>
                    {ev.isDaily && <span className="text-[10px] uppercase text-text-4">daily</span>}
                  </div>
                  <div className="flex justify-between gap-2 font-mono text-[11px] text-text-3">
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

      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/admin/riddles" className="font-medium text-primary hover:underline">
          Scheduled riddles
        </Link>
        <Link href="/admin/challenges" className="font-medium text-primary hover:underline">
          Challenges
        </Link>
        <Link href="/admin/failures" className="font-medium text-primary hover:underline">
          Failures
        </Link>
        <Link href="/admin/users" className="font-medium text-primary hover:underline">
          Users
        </Link>
      </div>
    </div>
  );
}

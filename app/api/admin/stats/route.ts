import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAdminOverview } from '@/lib/admin/overview';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats?days=7
 *
 * Pipeline + volume metrics. Admin role required.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get('days') ?? '7', 10), 90);

  try {
    const overview = await getAdminOverview(days);
    if (overview.pipelineError) {
      return NextResponse.json({
        success: false,
        error: overview.pipelineError,
        counts: overview.counts,
      }, { status: 500 });
    }
    return NextResponse.json({ success: true, stats: overview.pipeline, counts: overview.counts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

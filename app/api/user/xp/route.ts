import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/getUser';
import { createClient } from '@/lib/supabase/server';

/** GET /api/user/xp — returns total_xp and last 10 XP events. */
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  const [statsRes, eventsRes] = await Promise.all([
    supabase
      .from('user_stats')
      .select('total_xp')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('xp_events')
      .select('amount, reason, riddle_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const s = statsRes.data as any;
  return NextResponse.json({
    total_xp: s?.total_xp ?? 0,
    events: eventsRes.data ?? [],
  });
}

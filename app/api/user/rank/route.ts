import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/** GET /api/user/rank — global XP rank (1-based), server-derived. */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ rank: null as number | null });
    }

    const { data: mine } = await supabase
      .from('user_stats')
      .select('total_xp')
      .eq('user_id', user.id)
      .maybeSingle();

    const myXp = (mine as { total_xp: number } | null)?.total_xp ?? 0;

    const { count, error } = await supabase
      .from('user_stats')
      .select('*', { head: true, count: 'exact' })
      .gt('total_xp', myXp);

    if (error) {
      console.error('[GET /api/user/rank]', error);
      return NextResponse.json({ rank: null as number | null }, { status: 500 });
    }

    return NextResponse.json({ rank: (count ?? 0) + 1 });
  } catch (e) {
    console.error('[GET /api/user/rank]', e);
    return NextResponse.json({ rank: null as number | null }, { status: 500 });
  }
}

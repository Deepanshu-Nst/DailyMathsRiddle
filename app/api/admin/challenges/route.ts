import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

/**
 * GET /api/admin/challenges
 * 
 * Lists all riddle disputes for moderators/admins.
 */
export async function GET(req: NextRequest) {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';

    const { data: challenges, error } = await supabase
      .from('challenge_submissions')
      .select(`
        *,
        user:profiles!user_id(username, email),
        riddle:riddles!riddle_id(question, answer, difficulty, category)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ADMIN CHALLENGES GET ERROR]', error);
      return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });
    }

    return NextResponse.json({ challenges });

  } catch (err) {
    console.error('[ADMIN API ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

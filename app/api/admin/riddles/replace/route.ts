import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { replaceCurrentLive, rollbackChallenge } from '@/lib/admin/publishPipeline';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/admin/riddles/replace — Replace the live riddle for a date+difficulty.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, date, difficulty, riddleId } = body;

  if (action === 'rollback') {
    if (!date || !difficulty) {
      return NextResponse.json({ error: 'date and difficulty are required for rollback.' }, { status: 400 });
    }
    const result = await rollbackChallenge(date, difficulty, user.id);
    return NextResponse.json({ success: result.success, error: result.error });
  }

  // Default: replace
  if (!date || !difficulty || !riddleId) {
    return NextResponse.json({ error: 'date, difficulty, and riddleId are required.' }, { status: 400 });
  }

  const result = await replaceCurrentLive(date, difficulty, riddleId, user.id);
  return NextResponse.json({ success: result.success, error: result.error });
}

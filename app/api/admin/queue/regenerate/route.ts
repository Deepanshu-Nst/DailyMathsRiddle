import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { regenerateQueue } from '@/lib/admin/publishPipeline';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 300;

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
  const { date, difficulty } = body;

  if (!date || !difficulty) {
    return NextResponse.json({ error: 'date and difficulty are required.' }, { status: 400 });
  }

  const result = await regenerateQueue(date, difficulty, user.id);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, job: result.job });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { publishFromQueue } from '@/lib/admin/publishPipeline';
import { createClient } from '@/utils/supabase/server';

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

  const result = await publishFromQueue(date, difficulty, user.id);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, riddleId: result.riddleId });
}

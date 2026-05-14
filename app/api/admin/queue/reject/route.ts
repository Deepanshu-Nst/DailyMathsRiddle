import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { rejectQueueEntry } from '@/lib/admin/publishPipeline';
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
  const { entryId, reason } = body;

  if (!entryId || !reason) {
    return NextResponse.json({ error: 'entryId and reason are required.' }, { status: 400 });
  }

  const result = await rejectQueueEntry(entryId, reason, user.id);
  return NextResponse.json({ success: result.success });
}

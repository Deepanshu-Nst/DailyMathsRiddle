import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getQueueEntries } from '@/lib/admin/publishPipeline';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const entries = await getQueueEntries({ status, limit });

  return NextResponse.json({ success: true, entries });
}

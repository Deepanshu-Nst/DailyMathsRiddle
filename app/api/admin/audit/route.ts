import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getAuditLogs } from '@/lib/admin/auditLog';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const result = await getAuditLogs({ action, limit, offset });

  return NextResponse.json({ success: true, logs: result.logs, total: result.total });
}

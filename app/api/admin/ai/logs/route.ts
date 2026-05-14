import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

/**
 * GET /api/admin/ai/logs
 * 
 * Fetches recent raw pipeline events.
 */
export async function GET(req: NextRequest) {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');

    let query = supabase
      .from('pipeline_events')
      .select(`
        *,
        user:profiles!user_id(username)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') {
      if (status === 'success') {
        query = query.eq('event_type', 'success');
      } else {
        query = query.neq('event_type', 'success');
      }
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('[ADMIN AI LOGS ERROR]', error);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    return NextResponse.json({ logs });

  } catch (err) {
    console.error('[ADMIN API ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

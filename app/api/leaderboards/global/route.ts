import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createClient();
    
    const { data, error, count } = await supabase
      .from('v_leaderboard_global')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[LEADERBOARD REFRESH] Global error:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    return NextResponse.json({ 
      data, 
      total: count,
      limit,
      offset
    });

  } catch (err) {
    console.error('[LEADERBOARD ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

/**
 * GET /api/admin/ai/stats
 * 
 * Fetches aggregated AI pipeline telemetry for charts.
 */
export async function GET(req: NextRequest) {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = await createClient();
    
    // Fetch aggregated daily stats from the view
    const { data: stats, error: statsError } = await supabase
      .from('v_pipeline_stats')
      .select('*')
      .limit(30)
      .order('day', { ascending: false });

    if (statsError) {
      console.error('[ADMIN AI STATS ERROR]', statsError);
      return NextResponse.json({ error: 'Failed to fetch telemetry' }, { status: 500 });
    }

    // Fetch current AI settings
    const { data: config, error: configError } = await supabase
      .from('ai_settings')
      .select('value')
      .eq('key', 'engine_config')
      .maybeSingle();

    const engineConfig = (config as any)?.value || { is_enabled: true, safe_mode: false, max_retries: 3, mode: 'standard' };

    return NextResponse.json({ stats, config: engineConfig });

  } catch (err) {
    console.error('[ADMIN API ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

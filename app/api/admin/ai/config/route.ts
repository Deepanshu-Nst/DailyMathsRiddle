import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

/**
 * PATCH /api/admin/ai/config
 * 
 * Updates global AI engine settings.
 */
export async function PATCH(req: NextRequest) {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const supabase = await createClient();

    console.log('[API/ADMIN/AI/CONFIG] Received update request:', body);

    const { error, data: updatedData } = await (supabase as any)
      .from('ai_settings')
      .upsert({ 
        key: 'engine_config',
        value: body,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select('value')
      .single();

    if (error) {
      console.error('[ADMIN AI CONFIG ERROR]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[AI SETTINGS UPDATED] Success:`, updatedData?.value);
    if (body.safe_mode) console.log(`[AI SAFE MODE] Enabled`);

    return NextResponse.json({ success: true, config: updatedData?.value });

  } catch (err) {
    console.error('[ADMIN API ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

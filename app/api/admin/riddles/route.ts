import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { logAdminAction } from '@/lib/admin/auditLog';
import { insertRiddle } from '@/lib/riddles/queries';
import { forceManualSlot } from '@/lib/riddles/slots';
import { slugify } from '@/utils/slugify';

/**
 * GET /api/admin/riddles — Fetch all scheduled riddles.
 */
export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createClient();
    
    const { data, error } = await (supabase
      .from('scheduled_riddles') as any)
      .select('*')
      .order('publish_date', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, riddles: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

/**
 * POST /api/admin/riddles — Create a new scheduled riddle, or publish immediately.
 */
export async function POST(req: Request) {
  try {
    const { user } = await requireAdmin();
    const supabase = await createClient();
    const body = await req.json();

    const { action, publish_date, difficulty, question, answer, explanation, hint1, hint2, category } = body;

    // Validation
    if (!publish_date || !difficulty || !question || !answer || !explanation) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'publish_now') {
      // 1. Create immutable riddle record
      const promoted = await insertRiddle({
        question,
        answer,
        explanation,
        hint1: hint1 || null,
        hint2: hint2 || null,
        difficulty,
        is_daily: false, // Legacy flag, bypassed by slots
        daily_date: publish_date,
        status: 'published',
        slug: slugify(question.slice(0, 50)) + '-' + Date.now().toString(36),
        source_type: 'admin',
        category: category || 'Editorial',
      });

      if (!promoted) {
        throw new Error('Failed to insert riddle record.');
      }

      // 2. Force manual slot (immediate overwrite)
      await forceManualSlot({
        date: publish_date,
        difficulty,
        riddleId: promoted.id,
        publishedBy: user.id,
      });

      await logAdminAction({
        actorId: user.id,
        action: 'slot_override',
        targetType: 'riddle',
        targetId: promoted.id,
        metadata: { date: publish_date, difficulty, source: 'publish_now' },
      });

      return NextResponse.json({ success: true, riddle: promoted });
    } else {
      // Normal schedule (draft/scheduled)
      const { data, error } = await (supabase
        .from('scheduled_riddles') as any)
        .insert({
          publish_date,
          difficulty,
          question,
          answer,
          explanation,
          status: body.status || 'scheduled',
          source: 'admin',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ success: false, error: 'A riddle is already scheduled for this date and difficulty.' }, { status: 409 });
        }
        throw error;
      }

      await logAdminAction({
        actorId: user.id,
        action: 'slot_schedule',
        targetType: 'scheduled_riddle',
        targetId: data.id,
        metadata: { date: publish_date, difficulty },
      });

      return NextResponse.json({ success: true, riddle: data });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

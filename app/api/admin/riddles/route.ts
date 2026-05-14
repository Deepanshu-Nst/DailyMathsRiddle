import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

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
 * POST /api/admin/riddles — Create a new scheduled riddle.
 */
export async function POST(req: Request) {
  try {
    const { user } = await requireAdmin();
    const supabase = await createClient();
    const body = await req.json();

    // Validation
    if (!body.publish_date || !body.question || !body.answer || !body.explanation) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await (supabase
      .from('scheduled_riddles') as any)
      .insert({
        ...body,
        created_by: user.id,
        source: 'admin'
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, error: 'A riddle is already scheduled for this date and difficulty.' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, riddle: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'rewarded']),
  adminNotes: z.string().optional(),
  compensationXP: z.number().int().min(0).optional(),
});

/**
 * PATCH /api/admin/challenges/[id]
 * 
 * Resolves a riddle challenge.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: challengeId } = await params;
    const body = await req.json();
    const { status, adminNotes, compensationXP } = updateSchema.parse(body);

    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    // 1. Fetch challenge details
    const { data: challenge, error: fetchError } = await supabase
      .from('challenge_submissions')
      .select('*, user_id, riddle_id')
      .eq('id', challengeId)
      .single();

    if (fetchError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // 2. Process Approval Logic
    if (status === 'approved' && (challenge as any).status !== 'approved') {
      // Mark riddle as invalid globally
      await (supabase as any)
        .from('riddles')
        .update({ is_invalid: true })
        .eq('id', (challenge as any).riddle_id);

      console.log(`[RIDDLE INVALIDATED] riddle: ${(challenge as any).riddle_id} due to challenge: ${challengeId}`);

      // Award compensation XP if provided
      if (compensationXP && compensationXP > 0 && (challenge as any).user_id) {
        const { awardXP } = await import('@/lib/gamification/xp');
        await awardXP({
          userId: (challenge as any).user_id,
          base: compensationXP,
          bonuses: [],
          riddleId: (challenge as any).riddle_id
        });
        console.log(`[REWARDED] user: ${(challenge as any).user_id}, xp: ${compensationXP}`);
      }
      
      console.log(`[CHALLENGE APPROVED] challenge: ${challengeId}`);
    }

    // 3. Update Challenge Record
    const { error: updateError } = await (supabase as any)
      .from('challenge_submissions')
      .update({
        status,
        admin_notes: adminNotes,
        reviewed_by: adminUser?.id,
      })
      .eq('id', challengeId);

    if (updateError) {
      console.error('[CHALLENGE UPDATE ERROR]', updateError);
      return NextResponse.json({ error: 'Failed to update challenge' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[CHALLENGE RESOLVE ERROR]', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

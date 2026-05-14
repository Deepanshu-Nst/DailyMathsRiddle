import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const challengeSchema = z.object({
  riddleId: z.string().uuid(),
  proposedAnswer: z.string().min(1),
  reasoning: z.string().min(10),
  proofText: z.string().optional(),
});

/**
 * POST /api/challenges
 * 
 * Allows a user to dispute a riddle answer.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { riddleId, proposedAnswer, reasoning, proofText } = challengeSchema.parse(body);

    // 1. Verify riddle exists
    const { data: riddle, error: riddleError } = await supabase
      .from('riddles')
      .select('id')
      .eq('id', riddleId)
      .single();

    if (riddleError || !riddle) {
      return NextResponse.json({ error: 'Riddle not found' }, { status: 404 });
    }

    // 2. Insert challenge
    const { data: challenge, error: challengeError } = await (supabase as any)
      .from('challenge_submissions')
      .insert({
        user_id: user.id,
        riddle_id: riddleId,
        proposed_answer: proposedAnswer,
        reasoning,
        proof_text: proofText || null,
        status: 'pending'
      })
      .select()
      .single();

    if (challengeError) {
      console.error('[CHALLENGE ERROR]', challengeError);
      return NextResponse.json({ error: 'Failed to submit challenge' }, { status: 500 });
    }

    console.log(`[CHALLENGE SUBMITTED] user: ${user.id}, riddle: ${riddleId}, challenge: ${(challenge as any).id}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Challenge submitted for review.',
      challengeId: (challenge as any).id 
    });

  } catch (err) {
    console.error('[API CHALLENGE ERROR]', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

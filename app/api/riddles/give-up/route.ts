import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { insertAttempt } from '@/lib/riddles/queries';

/**
 * POST /api/riddles/give-up
 *
 * User abandons the riddle. 
 * Status: 'gave_up'
 * XP: 0 (No award for quitting)
 * Streak: Not updated (will break if no solve by end of day)
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { riddleId } = await req.json();

    if (!riddleId) {
      return NextResponse.json({ error: 'Missing riddleId' }, { status: 400 });
    }

    console.log(`[GIVE UP] user: ${user?.id || 'anon'}, riddle: ${riddleId}`);

    // 1. Record the attempt as 'gave_up'
    await insertAttempt({
      userId: user?.id || null,
      riddleId,
      submittedAnswer: 'ABANDONED',
      isCorrect: false,
      status: 'gave_up'
    });

    // 2. Update user stats total_attempts even if it's a give up
    if (user) {
      const { createServiceClient } = await import('@/utils/supabase/server');
      const serviceSupabase = (await createServiceClient()) as any;

      const { data: stats } = await serviceSupabase
        .from('user_stats')
        .select('total_attempts')
        .eq('user_id', user.id)
        .single();

      await serviceSupabase
        .from('user_stats')
        .upsert({
          user_id: user.id,
          total_attempts: (stats?.total_attempts || 0) + 1,
        });
    }

    // 3. Fetch the solution to reveal to the user
    const { getRiddleById } = await import('@/lib/riddles/queries');
    const dbRiddle = await getRiddleById(riddleId);

    console.log(`[ABANDONED] riddle: ${riddleId}`);

    return NextResponse.json({
      success: true,
      xpAwarded: 0,
      newStreak: null,
      answer: dbRiddle?.answer,
      explanation: dbRiddle?.explanation
    });

  } catch (err: any) {
    console.error('[GIVE UP API ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateUsername, isUsernameUpdateAllowed } from '@/lib/username';

/** 
 * POST /api/profile/username — Claim or update a username.
 * Optimized for RLS safety and resilient profile synchronization.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { username: rawUsername } = await req.json();
  const username = (rawUsername || '').toLowerCase().trim();

  console.log(`[USERNAME CLAIM] user: ${user.id}, attempt: "${username}"`);

  // 1. Validate format
  const validation = validateUsername(username);
  if (!validation.valid) {
    console.log(`[USERNAME INVALID] "${username}": ${validation.error}`);
    return NextResponse.json({ 
      status: 'INVALID_USERNAME',
      error: validation.error 
    }, { status: 400 });
  }
  console.log(`[USERNAME VALID] "${username}"`);

  // 2. Safely fetch profile
  let { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id, username, username_updated_at')
    .eq('id', user.id)
    .maybeSingle() as { data: any | null; error: any };

  if (fetchError) {
    console.error('[PROFILE FETCH FAILED]', fetchError);
    // If recursion occurs, it usually happens here or on insert
  }

  if (!profile) {
    console.log(`[PROFILE MISSING] for ${user.id}`);
    
    const { data: newProfile, error: insertError } = await (supabase
      .from('profiles') as any)
      .insert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name,
        avatar_url: user.user_metadata?.avatar_url,
        streak_count: 0,
        xp: 0
      })
      .select('id, username, username_updated_at')
      .single();

    if (insertError) {
      console.error('[PROFILE INSERT FAILED]', insertError);
      return NextResponse.json({ 
        error: insertError.message || 'Failed to initialize profile.',
        details: insertError
      }, { status: 500 });
    }
    
    profile = newProfile;
    console.log(`[PROFILE INSERT OK] Auto-created for ${user.id}`);
    console.log(`[RLS POLICY OK] Insert succeeded`);
  } else {
    console.log(`[PROFILE FETCHED] for ${user.id}`);
  }

  // Double check profile exists for TS
  if (!profile) {
    return NextResponse.json({ error: 'Critical: Profile unavailable after initialization attempt.' }, { status: 500 });
  }

  // 3. Check cooldown
  if (profile.username) {
    const cooldown = isUsernameUpdateAllowed(profile.username_updated_at);
    if (!cooldown.allowed) {
      return NextResponse.json({ 
        status: 'RENAME_COOLDOWN',
        error: `Username changes are limited to once every 30 days. Please wait ${cooldown.daysRemaining} days.`,
      }, { status: 429 });
    }
  }

  // 4. Check uniqueness
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle() as { data: any | null };

  if (existing && existing.id !== user.id) {
    console.log(`[USERNAME TAKEN] "${username}"`);
    return NextResponse.json({ 
      status: 'USERNAME_TAKEN',
      error: 'This username is already claimed by another user.' 
    }, { status: 409 });
  }

  // 5. Update profile
  const { error: updateError } = await (supabase.from('profiles') as any)
    .update({ 
      username, 
      username_updated_at: new Date().toISOString() 
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('[PROFILE UPDATE FAILED]', updateError);
    return NextResponse.json({ 
      error: 'Failed to update username.',
      details: updateError 
    }, { status: 500 });
  }

  console.log(`[PROFILE UPDATE OK] user: ${user.id}, new_username: "${username}"`);
  console.log(`[RLS POLICY OK] Update succeeded`);

  return NextResponse.json({ 
    status: 'PROFILE_UPDATED',
    success: true, 
    username 
  });
}

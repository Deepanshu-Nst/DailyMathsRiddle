/**
 * Username validation and slugification utilities.
 */

/** Validates if a username is slug-safe and meets length requirements. */
export function validateUsername(username: string): { valid: boolean; error?: string; code?: string } {
  // Regex: 3-20 chars, lowercase letters, numbers, underscore only.
  const regex = /^[a-z0-9_]{3,20}$/;
  
  if (!regex.test(username)) {
    if (username.length < 3 || username.length > 20) {
      return { valid: false, error: 'Username must be between 3 and 20 characters.', code: 'INVALID_LENGTH' };
    }
    return { valid: false, error: 'Username can only contain lowercase letters, numbers, and underscores.', code: 'INVALID_CHARS' };
  }

  return { valid: true };
}

/** Checks if a username update is allowed based on the last update timestamp. */
export function isUsernameUpdateAllowed(lastUpdated: string | null): { allowed: boolean; daysRemaining?: number } {
  if (!lastUpdated) return { allowed: true };

  const lastUpdateDate = new Date(lastUpdated);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastUpdateDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const COOLDOWN_DAYS = 30;
  
  if (diffDays < COOLDOWN_DAYS) {
    return { allowed: false, daysRemaining: COOLDOWN_DAYS - diffDays };
  }

  return { allowed: true };
}

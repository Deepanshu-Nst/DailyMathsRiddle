export type Difficulty = 'easy' | 'medium' | 'hard';

export type ChallengeState =
  | 'LOCKED'        // Challenge not yet available
  | 'AVAILABLE'     // Ready to be played
  | 'SUBMITTING'    // Answer is being validated
  | 'SOLVED'        // Successfully completed
  | 'FAILED'        // Failed (if limits apply, or abandoned)
  | 'ABANDONED'     // User clicked 'give up'
  | 'EXPIRED';      // Missed the day window

export interface Riddle {
  id: string;
  question: string;
  answer: string;
  answerVariants: string[];
  hint1: string;
  hint2: string;
  explanation: string;
  difficulty: Difficulty;
  category: string;
}

export interface AttemptResult {
  isCorrect: boolean;
  normalizedInput: string;
  message: string;
}

export interface DailySolvedEntry {
  date: string;
  difficulty: Difficulty;
  hintsUsed: number;
}

export interface UserSessionState {
  user: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
  streak: {
    currentStreak: number;
    bestStreak: number;
    totalXP: number;
    totalSolved: number;
  };
  solvedToday: boolean;
  solvedRiddleIds: string[]; // For checking if extra generated riddles are solved
  activityMap: DailySolvedEntry[];
}

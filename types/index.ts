export type Difficulty = 'easy' | 'medium' | 'hard';
export type ProgressState = 'unsolved' | 'solved' | 'missed';

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

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastSolvedDate: string | null;
  totalSolved: number;
  solvedDates: DailySolvedEntry[];
  progressState: ProgressState;
  solvedDifficulty: Difficulty | null;
}

export interface DailySolvedEntry {
  date: string;
  difficulty: Difficulty;
  hintsUsed: number;
}

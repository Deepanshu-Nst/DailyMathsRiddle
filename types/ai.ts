import { Riddle } from './index';

export interface AIRiddle extends Riddle {
  ai_generated: true;
  validation_score: number;
  generated_at: string;
  version: string;
  generator_model: string;
  validator_model: string;
}

export interface ValidationResult {
  is_valid: boolean;
  difficulty_match: boolean;
  correctness_confidence: number; // 0 to 1
  reasoning_depth_score: number; // 1 to 10
  clarity_score: number; // 1 to 10
  originality_score: number; // 1 to 10
  issues: string[];
  final_score: number; // 0 to 10
}

export interface ScoredRiddle {
  riddle: Omit<AIRiddle, 'validation_score' | 'generated_at' | 'id'>;
  validation: ValidationResult;
  overall_score: number;
}

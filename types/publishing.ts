// ── Publishing System Types ──────────────────────────────────────
// New file — does NOT modify types/index.ts

export type Platform = 'linkedin' | 'instagram' | 'twitter' | 'whatsapp';
export type PostStatus = 'draft' | 'scheduled' | 'posted' | 'failed' | 'partial';
export type PlatformResult = 'pending' | 'success' | 'failed' | 'skipped';

export interface CaptionVariants {
  linkedin: string;
  instagram: string;
  twitter: string;
  whatsapp: string;
}

export interface HashtagSets {
  linkedin: string[];
  instagram: string[];
  twitter: string[];
  whatsapp: string[];
}

export interface PlatformStatus {
  linkedin: PlatformResult;
  instagram: PlatformResult;
  twitter: PlatformResult;
  whatsapp: PlatformResult;
}

export interface PostMetrics {
  platform: Platform;
  posted_at: string;
  attempts: number;
  post_id?: string;   // returned by platform API
  clicks: number;     // future: webhook data
  conversions: number; // future: riddle solves from this post
}

export interface Post {
  id: string;
  date: string;           // YYYY-MM-DD
  riddle_text: string;
  difficulty: string;
  hint: string;
  answer: string;
  image_url?: string;     // base64 data URL or CDN URL
  caption_variants: CaptionVariants;
  hashtag_sets: HashtagSets;
  status: PostStatus;
  scheduled_at?: string;  // ISO timestamp
  posted_at?: string;     // ISO timestamp
  platform_status: PlatformStatus;
  retries: number;
  metrics: PostMetrics[];
  created_at: string;
  updated_at: string;
}

export interface AdapterResult {
  success: boolean;
  postId?: string;
  error?: string;
  raw?: unknown;
}

export interface PublishRequest {
  date: string;
  difficulty: string;
  platforms: Platform[];
  captions?: Partial<CaptionVariants>;
  scheduledAt?: string;
}

export interface PublishResult {
  postId: string;
  results: Record<Platform, AdapterResult>;
  overallStatus: PostStatus;
}

export interface PreviewPayload {
  date: string;
  difficulty: string;
  riddle: {
    id: string;
    question: string;
    hint1: string;
    difficulty: string;
    category: string;
  };
  captions: CaptionVariants;
  hashtags: HashtagSets;
  image_data_url: string;
  existing_post?: Post | null;
}

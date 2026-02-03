/**
 * Dashboard types. Replace dummy data with Supabase realtime/subscription later.
 */

export interface ProfileSummary {
  id: string;
  user_id: string;
  name: string;
  photo_url?: string | null;
  age?: number | null;
  location?: string | null;
  headline?: string | null;
  verification_status: "verified" | "pending" | "none";
  match_score?: number | null;
  last_active?: string | null;
}

export interface DashboardStats {
  pending_requests: number;
  recent_views: number;
  match_score: number; // 0–100 or similar
}

export interface QuickActionCounts {
  interests: number;
  messages: number;
  shortlisted: number;
}

/**
 * CivicPulse API Client
 * Thin wrapper around fetch that:
 *  - Prefixes all paths with EXPO_PUBLIC_API_URL
 *  - Auto-injects the Supabase session Bearer token
 *  - Throws typed errors on non-2xx responses
 */
import { supabase } from './supabase';
import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL
  ?? (Platform.OS === 'android' ? 'http://10.0.2.2:3001/api/v1' : 'http://localhost:3001/api/v1');

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: Record<string, unknown> | FormData;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const authHeaders = await getAuthHeader();
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...authHeaders,
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body: isFormData
      ? (options.body as FormData)
      : options.body
      ? JSON.stringify(options.body)
      : undefined,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ── Convenience helpers ──────────────────────────────────────
export const api = {
  get:    <T>(path: string) => request<T>(path, { method: 'GET' }),
  post:   <T>(path: string, body: Record<string, unknown>) => request<T>(path, { method: 'POST',  body }),
  patch:  <T>(path: string, body: Record<string, unknown>) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ── Typed service helpers ────────────────────────────────────

// PROFILES
export const ProfilesAPI = {
  me:     () => api.get<{ profile: Profile }>('/profiles/me'),
  update: (body: Partial<Profile>) => api.patch<{ profile: Profile }>('/profiles/me', body as Record<string, unknown>),
  impact: () => api.get<{ impact: NeighborhoodImpact }>('/profiles/me/impact'),
  badges: () => api.get<{ badges: UserBadge[] }>('/profiles/me/badges'),
};

// REPORTS
export const ReportsAPI = {
  feed:   (params?: { ward_id?: string; status?: string; limit?: number; offset?: number }) =>
    api.get<{ reports: Report[] }>(`/reports?${new URLSearchParams(params as Record<string,string> ?? {}).toString()}`),
  mine:   () => api.get<{ reports: Report[] }>('/reports/mine'),
  get:    (id: string) => api.get<{ report: Report }>(`/reports/${id}`),
  create: (body: CreateReportPayload) => api.post<{ report: Report; xp_awarded: number }>('/reports', body as unknown as Record<string, unknown>),
  updateStatus: (id: string, status: string, note?: string) =>
    api.patch<{ report: Report }>(`/reports/${id}/status`, { status, note }),
};

// CHALLENGES
export const ChallengesAPI = {
  list:     (type?: string) => api.get<{ challenges: Challenge[] }>(`/challenges${type ? `?type=${type}` : ''}`),
  mine:     () => api.get<{ challenges: UserChallenge[] }>('/challenges/me'),
  join:     (id: string) => api.post<{ participation: UserChallenge }>(`/challenges/${id}/join`, {}),
  progress: (id: string, increment: number) =>
    api.patch<{ participation: UserChallenge; completed: boolean; xp_awarded: number }>(`/challenges/${id}/progress`, { increment }),
};

// LEADERBOARD
export const LeaderboardAPI = {
  get: (scope = 'city', time_period = 'all_time', limit = 20) =>
    api.get<{ leaderboard: LeaderboardEntry[] }>(`/leaderboard?scope=${scope}&time_period=${time_period}&limit=${limit}`),
};

// REWARDS
export const RewardsAPI = {
  list:   () => api.get<{ rewards: Reward[] }>('/rewards'),
  mine:   () => api.get<{ redemptions: Redemption[] }>('/rewards/me'),
  redeem: (id: string) => api.post<{ redemption: Redemption; voucher_code: string }>(`/rewards/${id}/redeem`, {}),
};

// CATEGORIES
export const CategoriesAPI = {
  list: () => api.get<{ categories: Category[] }>('/categories'),
};

// LOCATIONS
export const LocationsAPI = {
  cities: () => api.get<{ cities: City[] }>('/locations/cities'),
  wards:  (city_id?: string) => api.get<{ wards: Ward[] }>(`/locations/wards${city_id ? `?city_id=${city_id}` : ''}`),
};

// ── Types ────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
  xp_total: number;
  level: number;
  role: string;
  title: string;
  streak_days: number;
  last_active: string;
  avatar_url: string | null;
  created_at: string;
  wards?: Ward & { cities?: City };
}

export interface NeighborhoodImpact {
  user_id: string;
  name: string;
  xp_total: number;
  level: number;
  title: string;
  streak_days: number;
  total_reports: number;
  resolved_reports: number;
  impact_score: number;
}

export interface UserBadge {
  earned_at: string;
  badges: {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    tier: string;
  };
}

export interface Report {
  id: string;
  title: string | null;
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  priority: string;
  ai_classified: boolean;
  ai_confidence: number | null;
  xp_awarded: number;
  authority_routed_to: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { id: string; name: string; avatar_url: string | null; title: string };
  issue_categories?: Category;
  issue_subcategories?: { id: string; name: string };
  wards?: Ward;
  report_media?: { id: string; url: string; type: string; uploaded_at: string }[];
  report_status_history?: { id: string; from_status: string; to_status: string; changed_by: string; note: string | null; changed_at: string }[];
}

export interface CreateReportPayload {
  title?: string;
  description?: string;
  category_id?: string;
  subcategory_id?: string;
  ward_id?: string;
  lat?: number;
  lng?: number;
  address?: string;
  priority?: 'low' | 'medium' | 'high';
  ai_classified?: boolean;
  ai_confidence?: number;
  authority_routed_to?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  type: string;
  category: string | null;
  xp_reward: number;
  target_count: number;
  metric: string;
  recurrence: string;
  participant_count: number;
  expires_at: string | null;
}

export interface UserChallenge {
  id: string;
  progress: number;
  status: string;
  completed_at: string | null;
  created_at: string;
  challenges: Challenge;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar_url: string | null;
  level: number;
  title: string;
  xp: number;
  rank_change: number;
  is_me: boolean;
}

export interface Reward {
  id: string;
  title: string;
  description: string | null;
  partner: string | null;
  xp_cost: number;
  type: string;
  valid_until: string | null;
}

export interface Redemption {
  id: string;
  voucher_code: string | null;
  status: string;
  redeemed_at: string;
  rewards: Reward;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  default_authority: string | null;
  base_xp: number;
  issue_subcategories?: { id: string; name: string; priority_default: string; priority_score: number }[];
}

export interface City {
  id: string;
  name: string;
  state: string;
}

export interface Ward {
  id: string;
  name: string;
  ward_number: number;
  zone: string | null;
  city_id?: string;
  cities?: City;
}

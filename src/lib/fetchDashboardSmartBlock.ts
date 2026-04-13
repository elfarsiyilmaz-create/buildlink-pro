import { supabase } from '@/integrations/supabase/client';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alhan-chat`;
const DASHBOARD_COACH_STORAGE_KEY = 'alhan_dashboard_coach';
const CACHE_TTL_MS = 1800000;
const FETCH_TIMEOUT_MS = 5000;

export type AlhanChatResponse = {
  message: string;
  priority?: 'low' | 'medium' | 'high';
};

/** leaderboardPosition: 1–999999 (API); client gebruikt 999999 als sentinel voor geen plek. */
export type DashboardSmartBlockRequest = {
  weather: string;
  temperature: number;
  hoursLoggedYesterday: boolean;
  leaderboardPosition: number;
  context: 'dashboard_smart_block';
};

type CachedPayload = {
  message: string;
  priority?: 'low' | 'medium' | 'high';
  timestamp: number;
};

let memoryCache: CachedPayload | null = null;

function normalizePriority(p: unknown): 'low' | 'medium' | 'high' {
  if (p === 'medium' || p === 'high' || p === 'low') return p;
  return 'low';
}

function isFresh(entry: CachedPayload | null): entry is CachedPayload {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

function readSessionCache(): CachedPayload | null {
  try {
    const raw = sessionStorage.getItem(DASHBOARD_COACH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedPayload>;
    if (typeof parsed.message !== 'string' || typeof parsed.timestamp !== 'number') return null;
    return {
      message: parsed.message,
      priority: normalizePriority(parsed.priority),
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

function writeCaches(payload: CachedPayload): void {
  memoryCache = payload;
  try {
    sessionStorage.setItem(DASHBOARD_COACH_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* silent — memoryCache is fallback */
  }
}

export type FetchSmartBlockResult =
  | { status: 'ok'; data: AlhanChatResponse; fromCache: boolean }
  | { status: 'error' }
  | { status: 'timeout' };

export async function fetchDashboardSmartBlock(
  body: DashboardSmartBlockRequest,
): Promise<FetchSmartBlockResult> {
  const fromSession = readSessionCache();
  if (isFresh(fromSession)) {
    return {
      status: 'ok',
      data: {
        message: fromSession.message,
        priority: normalizePriority(fromSession.priority),
      },
      fromCache: true,
    };
  }

  if (isFresh(memoryCache)) {
    return {
      status: 'ok',
      data: {
        message: memoryCache.message,
        priority: normalizePriority(memoryCache.priority),
      },
      fromCache: true,
    };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      return { status: 'error' };
    }

    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      return { status: 'error' };
    }

    const json = (await resp.json()) as Partial<AlhanChatResponse>;
    if (typeof json.message !== 'string' || !json.message.trim()) {
      return { status: 'error' };
    }

    const payload: CachedPayload = {
      message: json.message.trim(),
      priority: normalizePriority(json.priority),
      timestamp: Date.now(),
    };
    writeCaches(payload);

    return {
      status: 'ok',
      data: { message: payload.message, priority: payload.priority },
      fromCache: false,
    };
  } catch (e) {
    const aborted =
      (e instanceof DOMException && e.name === 'AbortError') || (e instanceof Error && e.name === 'AbortError');
    if (aborted) {
      return { status: 'timeout' };
    }
    return { status: 'error' };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

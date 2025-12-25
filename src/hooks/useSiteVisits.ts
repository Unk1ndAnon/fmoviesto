import { useEffect, useRef, useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getVisitData, SourceType } from '@/lib/referrer-parser';

// Session storage keys
const VISIT_SESSION_KEY = 'fmov_visit_session';
const LAST_VISIT_KEY = 'fmov_last_visit';
const GEO_CACHE_KEY = 'fmov_geo_cache';
const VISIT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// Get or create anonymous session ID (reuse from watch stats if available)
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem('watch_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('watch_session_id', sessionId);
  }
  return sessionId;
}

// Check if we should track this visit (prevent duplicates within cooldown)
function shouldTrackVisit(pagePath: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const lastVisitData = sessionStorage.getItem(LAST_VISIT_KEY);
  if (!lastVisitData) return true;
  
  try {
    const { path, timestamp } = JSON.parse(lastVisitData);
    const timeSinceLastVisit = Date.now() - timestamp;
    
    // Allow tracking if different page or cooldown passed
    if (path !== pagePath || timeSinceLastVisit > VISIT_COOLDOWN_MS) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

// Record that we tracked this visit
function recordVisitTracked(pagePath: string): void {
  if (typeof window === 'undefined') return;
  
  sessionStorage.setItem(LAST_VISIT_KEY, JSON.stringify({
    path: pagePath,
    timestamp: Date.now(),
  }));
}

// Check if this is the first visit of the session (for referrer tracking)
function isFirstVisitOfSession(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hasVisited = sessionStorage.getItem(VISIT_SESSION_KEY);
  if (!hasVisited) {
    sessionStorage.setItem(VISIT_SESSION_KEY, 'true');
    return true;
  }
  return false;
}

// Get cached geo data or fetch from API
async function getGeoData(): Promise<{ country: string | null }> {
  if (typeof window === 'undefined') return { country: null };
  
  // Check cache first
  const cached = sessionStorage.getItem(GEO_CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Continue to fetch
    }
  }
  
  try {
    // Use ipapi.co free tier (no API key needed, 1000 requests/day)
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      const geoData = {
        country: data.country_name || null,
      };
      sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geoData));
      return geoData;
    }
  } catch (error) {
    console.warn('Failed to fetch geo data:', error);
  }
  
  return { country: null };
}

/**
 * Hook to track site visits with referrer and geo data
 */
export function useSiteVisitTracking(tmdbId?: number, mediaType?: string) {
  const location = useLocation();
  const lastTrackedPath = useRef<string>('');

  useEffect(() => {
    const pagePath = location.pathname;
    
    // Skip if we already tracked this path in this render cycle
    if (lastTrackedPath.current === pagePath) return;
    
    // Only track if cooldown passed for this page
    if (!shouldTrackVisit(pagePath)) {
      lastTrackedPath.current = pagePath;
      return;
    }

    const trackVisit = async () => {
      const sessionId = getSessionId();
      const visitData = getVisitData(tmdbId, mediaType);
      const isFirstVisit = isFirstVisitOfSession();
      
      // For non-first visits, only track if it's a content page or significant navigation
      // Skip internal navigation unless it's to content pages
      if (!isFirstVisit && visitData.source_type === 'internal') {
        // Still track content page visits for analytics
        if (!pagePath.includes('/watch/') && !pagePath.includes('/movie/') && !pagePath.includes('/tv')) {
          lastTrackedPath.current = pagePath;
          return;
        }
      }

      // Get geo data (cached or fresh)
      const geoData = await getGeoData();

      try {
        const { error } = await supabase
          .from('site_visits')
          .insert({
            session_id: sessionId,
            country: geoData.country,
            ...visitData,
          });

        if (error) {
          console.error('Failed to track visit:', error);
        } else {
          recordVisitTracked(pagePath);
        }
      } catch (err) {
        console.error('Error tracking visit:', err);
      }
      
      lastTrackedPath.current = pagePath;
    };

    trackVisit();
  }, [location.pathname, tmdbId, mediaType]);
}

/**
 * Hook to get referrer analytics data (admin only)
 */
export function useReferrerAnalytics(days: number = 30) {
  const fetchTopReferrers = useCallback(async (limit: number = 100) => {
    const { data, error } = await supabase.rpc('get_top_referrers', {
      p_days: days,
      p_limit: limit,
    });
    
    if (error) throw error;
    return data as Array<{
      referrer_domain: string;
      visit_count: number;
      unique_sessions: number;
      source_type: SourceType;
    }>;
  }, [days]);

  const fetchSourceDistribution = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_source_distribution', {
      p_days: days,
    });
    
    if (error) throw error;
    return data as Array<{
      source_type: SourceType;
      visit_count: number;
      percentage: number;
    }>;
  }, [days]);

  const fetchGeoDistribution = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_geo_distribution', {
      p_days: days,
    });
    
    if (error) throw error;
    return data as Array<{
      country: string;
      visit_count: number;
      unique_sessions: number;
      percentage: number;
    }>;
  }, [days]);

  const fetchReferrerWatchStats = useCallback(async (limit: number = 50) => {
    const { data, error } = await supabase.rpc('get_referrer_watch_stats', {
      p_days: days,
      p_limit: limit,
    });
    
    if (error) throw error;
    return data as Array<{
      referrer_domain: string;
      visit_count: number;
      unique_sessions: number;
      avg_pages_per_session: number;
      watch_events: number;
    }>;
  }, [days]);

  const fetchRecentVisits = useCallback(async (limit: number = 50) => {
    const { data, error } = await supabase
      .from('site_visits')
      .select('*')
      .order('visited_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }, []);

  const fetchLiveVisitors = useCallback(async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('site_visits')
      .select('session_id, referrer_domain, source_type, page_path, tmdb_id, media_type, visited_at, country')
      .gte('visited_at', fiveMinutesAgo)
      .order('visited_at', { ascending: false });
    
    if (error) throw error;
    
    // Deduplicate by session_id, keep most recent
    const uniqueSessions = new Map();
    data?.forEach(visit => {
      if (!uniqueSessions.has(visit.session_id)) {
        uniqueSessions.set(visit.session_id, visit);
      }
    });
    
    return Array.from(uniqueSessions.values());
  }, []);

  const fetchRealtimeStats = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_realtime_site_stats');
    
    if (error) throw error;
    return data?.[0] as {
      active_visitors: number;
      visitors_last_hour: number;
      visitors_today: number;
      top_countries: Array<{ country: string; count: number }>;
      top_pages: Array<{ path: string; count: number }>;
    } | null;
  }, []);

  return {
    fetchTopReferrers,
    fetchSourceDistribution,
    fetchGeoDistribution,
    fetchReferrerWatchStats,
    fetchRecentVisits,
    fetchLiveVisitors,
    fetchRealtimeStats,
  };
}

/**
 * Hook for real-time site stats with auto-refresh
 */
export function useRealtimeSiteStats(refreshInterval: number = 30000) {
  const [stats, setStats] = useState<{
    active_visitors: number;
    visitors_last_hour: number;
    visitors_today: number;
    top_countries: Array<{ country: string; count: number }>;
    top_pages: Array<{ path: string; count: number }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { fetchRealtimeStats } = useReferrerAnalytics();

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchRealtimeStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch realtime stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchRealtimeStats, refreshInterval]);

  return { stats, isLoading };
}

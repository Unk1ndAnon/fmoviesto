import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getVisitData, parseReferrer, SourceType } from '@/lib/referrer-parser';

// Session storage keys
const VISIT_SESSION_KEY = 'fmov_visit_session';
const LAST_VISIT_KEY = 'fmov_last_visit';
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

/**
 * Hook to track site visits with referrer data
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

      try {
        const { error } = await supabase
          .from('site_visits')
          .insert({
            session_id: sessionId,
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
      .select('session_id, referrer_domain, source_type, page_path, tmdb_id, media_type, visited_at')
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

  return {
    fetchTopReferrers,
    fetchSourceDistribution,
    fetchReferrerWatchStats,
    fetchRecentVisits,
    fetchLiveVisitors,
  };
}

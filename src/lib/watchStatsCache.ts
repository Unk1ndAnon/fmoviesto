/**
 * In-memory cache for watch stats to reduce database load
 * and handle graceful degradation during outages
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface WatchingNowCache {
  [key: string]: CacheEntry<number>;
}

interface AllWatchingNowCache {
  items: CacheEntry<Array<{ tmdb_id: number; media_type: string; viewer_count: number }>>;
}

interface MostWatchedCache {
  [key: string]: CacheEntry<Array<{ tmdb_id: number; media_type: string; view_count: number }>>;
}

// Cache TTL in milliseconds
const CACHE_TTL = 30 * 1000; // 30 seconds
const STALE_TTL = 5 * 60 * 1000; // 5 minutes for stale data fallback

// In-memory caches
const watchingNowCache: WatchingNowCache = {};
let allWatchingNowCache: AllWatchingNowCache | null = null;
const mostWatchedCache: MostWatchedCache = {};

// Rate limiting
const lastFetchTime: { [key: string]: number } = {};
const MIN_FETCH_INTERVAL = 30 * 1000; // 30 seconds minimum between fetches

export function getCacheKey(type: string, ...args: (string | number)[]): string {
  return `${type}:${args.join(':')}`;
}

export function canFetch(cacheKey: string): boolean {
  const now = Date.now();
  const lastFetch = lastFetchTime[cacheKey] || 0;
  return now - lastFetch >= MIN_FETCH_INTERVAL;
}

export function markFetched(cacheKey: string): void {
  lastFetchTime[cacheKey] = Date.now();
}

// Watching Now Cache
export function getWatchingNowFromCache(tmdbId: number, mediaType: string): number | null {
  const key = getCacheKey('watching', tmdbId, mediaType);
  const entry = watchingNowCache[key];
  
  if (!entry) return null;
  
  const now = Date.now();
  // Return cached data if still fresh
  if (now < entry.expiresAt) {
    return entry.data;
  }
  
  // Return stale data if within stale window (for error fallback)
  if (now < entry.timestamp + STALE_TTL) {
    return entry.data;
  }
  
  return null;
}

export function setWatchingNowCache(tmdbId: number, mediaType: string, count: number): void {
  const key = getCacheKey('watching', tmdbId, mediaType);
  const now = Date.now();
  
  watchingNowCache[key] = {
    data: count,
    timestamp: now,
    expiresAt: now + CACHE_TTL,
  };
}

export function isWatchingNowCacheFresh(tmdbId: number, mediaType: string): boolean {
  const key = getCacheKey('watching', tmdbId, mediaType);
  const entry = watchingNowCache[key];
  
  if (!entry) return false;
  return Date.now() < entry.expiresAt;
}

// All Watching Now Cache
export function getAllWatchingNowFromCache(): Array<{ tmdb_id: number; media_type: string; viewer_count: number }> | null {
  if (!allWatchingNowCache?.items) return null;
  
  const now = Date.now();
  const entry = allWatchingNowCache.items;
  
  // Return cached data if still fresh
  if (now < entry.expiresAt) {
    return entry.data;
  }
  
  // Return stale data if within stale window
  if (now < entry.timestamp + STALE_TTL) {
    return entry.data;
  }
  
  return null;
}

export function setAllWatchingNowCache(items: Array<{ tmdb_id: number; media_type: string; viewer_count: number }>): void {
  const now = Date.now();
  
  allWatchingNowCache = {
    items: {
      data: items,
      timestamp: now,
      expiresAt: now + CACHE_TTL,
    },
  };
}

export function isAllWatchingNowCacheFresh(): boolean {
  if (!allWatchingNowCache?.items) return false;
  return Date.now() < allWatchingNowCache.items.expiresAt;
}

// Most Watched Cache
export function getMostWatchedFromCache(hours: number, limit: number): Array<{ tmdb_id: number; media_type: string; view_count: number }> | null {
  const key = getCacheKey('most_watched', hours, limit);
  const entry = mostWatchedCache[key];
  
  if (!entry) return null;
  
  const now = Date.now();
  // Return cached data if still fresh
  if (now < entry.expiresAt) {
    return entry.data;
  }
  
  // Return stale data if within stale window
  if (now < entry.timestamp + STALE_TTL) {
    return entry.data;
  }
  
  return null;
}

export function setMostWatchedCache(hours: number, limit: number, items: Array<{ tmdb_id: number; media_type: string; view_count: number }>): void {
  const key = getCacheKey('most_watched', hours, limit);
  const now = Date.now();
  
  mostWatchedCache[key] = {
    data: items,
    timestamp: now,
    expiresAt: now + CACHE_TTL,
  };
}

export function isMostWatchedCacheFresh(hours: number, limit: number): boolean {
  const key = getCacheKey('most_watched', hours, limit);
  const entry = mostWatchedCache[key];
  
  if (!entry) return false;
  return Date.now() < entry.expiresAt;
}

// Error tracking to prevent retry storms
const errorCounts: { [key: string]: { count: number; firstError: number } } = {};
const ERROR_BACKOFF_THRESHOLD = 3;
const ERROR_BACKOFF_WINDOW = 60 * 1000; // 1 minute

export function shouldBackoff(cacheKey: string): boolean {
  const entry = errorCounts[cacheKey];
  if (!entry) return false;
  
  const now = Date.now();
  // Reset error count after window expires
  if (now - entry.firstError > ERROR_BACKOFF_WINDOW) {
    delete errorCounts[cacheKey];
    return false;
  }
  
  return entry.count >= ERROR_BACKOFF_THRESHOLD;
}

export function recordError(cacheKey: string): void {
  const now = Date.now();
  const entry = errorCounts[cacheKey];
  
  if (!entry || now - entry.firstError > ERROR_BACKOFF_WINDOW) {
    errorCounts[cacheKey] = { count: 1, firstError: now };
  } else {
    entry.count++;
  }
}

export function clearError(cacheKey: string): void {
  delete errorCounts[cacheKey];
}

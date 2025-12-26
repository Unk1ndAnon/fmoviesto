const CACHE_PREFIX = 'tmdb_cache_';
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    const isExpired = Date.now() - entry.timestamp > CACHE_DURATION;
    
    // Return data even if expired (as fallback), freshness is checked separately
    return entry.data;
  } catch {
    return null;
  }
}

export function isCacheFresh(key: string): boolean {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return false;
    
    const entry = JSON.parse(cached);
    return Date.now() - entry.timestamp < CACHE_DURATION;
  } catch {
    return false;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // localStorage might be full, try to clear old entries
    clearOldCache();
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // Still failed, ignore
    }
  }
}

function clearOldCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    const now = Date.now();
    
    for (const key of keys) {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry = JSON.parse(cached);
          // Remove entries older than 24 hours
          if (now - entry.timestamp > 1000 * 60 * 60 * 24) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore errors
  }
}

export function generateCacheKey(endpoint: string, params: Record<string, string> = {}): string {
  const sortedParams = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return `${endpoint}${sortedParams ? '?' + sortedParams : ''}`;
}

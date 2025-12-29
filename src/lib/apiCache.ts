const CACHE_PREFIX = 'tmdb_cache_';
const CACHE_DURATION = 1000 * 60 * 60 * 2; // 2 hours
const STALE_DURATION = 1000 * 60 * 60 * 6; // 6 hours - can use stale data up to this

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;
    
    // Return data if within stale duration (6 hours)
    if (age < STALE_DURATION) {
      return entry.data;
    }
    
    // Too old, remove it
    localStorage.removeItem(CACHE_PREFIX + key);
    return null;
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

export function isCacheStale(key: string): boolean {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return true;
    
    const entry = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;
    return age >= CACHE_DURATION && age < STALE_DURATION;
  } catch {
    return true;
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

// Preload images for faster rendering
export function preloadImages(urls: string[]): void {
  urls.forEach(url => {
    if (url && url !== '/placeholder.svg') {
      const img = new Image();
      img.src = url;
    }
  });
}

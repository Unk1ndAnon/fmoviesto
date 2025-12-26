/**
 * Simple view counter using localStorage
 * Tracks how many times each movie/TV show has been opened
 */

interface ViewRecord {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  view_count: number;
  last_viewed: number;
}

const STORAGE_KEY = 'fmov_view_counts';

function getViewRecords(): ViewRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveViewRecords(records: ViewRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save view records:', e);
  }
}

/**
 * Increment view count for a movie or TV show
 */
export function incrementViewCount(tmdbId: number, mediaType: 'movie' | 'tv'): void {
  const records = getViewRecords();
  const existingIndex = records.findIndex(
    r => r.tmdb_id === tmdbId && r.media_type === mediaType
  );

  if (existingIndex >= 0) {
    records[existingIndex].view_count += 1;
    records[existingIndex].last_viewed = Date.now();
  } else {
    records.push({
      tmdb_id: tmdbId,
      media_type: mediaType,
      view_count: 1,
      last_viewed: Date.now(),
    });
  }

  saveViewRecords(records);
}

/**
 * Get view count for a specific movie or TV show
 */
export function getViewCount(tmdbId: number, mediaType: 'movie' | 'tv'): number {
  const records = getViewRecords();
  const record = records.find(
    r => r.tmdb_id === tmdbId && r.media_type === mediaType
  );
  return record?.view_count || 0;
}

/**
 * Get most viewed items sorted by view count
 */
export function getMostViewed(limit: number = 50): ViewRecord[] {
  const records = getViewRecords();
  return records
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, limit);
}

/**
 * Get most viewed movies only
 */
export function getMostViewedMovies(limit: number = 20): ViewRecord[] {
  const records = getViewRecords();
  return records
    .filter(r => r.media_type === 'movie')
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, limit);
}

/**
 * Get most viewed TV shows only
 */
export function getMostViewedTV(limit: number = 20): ViewRecord[] {
  const records = getViewRecords();
  return records
    .filter(r => r.media_type === 'tv')
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, limit);
}

/**
 * Get recently viewed items (last 7 days)
 */
export function getRecentlyViewed(limit: number = 20): ViewRecord[] {
  const records = getViewRecords();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  return records
    .filter(r => r.last_viewed >= weekAgo)
    .sort((a, b) => b.last_viewed - a.last_viewed)
    .slice(0, limit);
}

/**
 * Clear all view records
 */
export function clearViewRecords(): void {
  localStorage.removeItem(STORAGE_KEY);
}

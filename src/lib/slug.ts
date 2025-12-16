// Generate URL-friendly slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Convert slug back to searchable title
export function slugToTitle(slug: string): string {
  return slug.replace(/-/g, " ");
}

// Generate movie URL
export function getMovieUrl(title: string): string {
  return `/movie/${generateSlug(title)}`;
}

// Generate TV show URL
export function getTVShowUrl(name: string): string {
  return `/tvshow/${generateSlug(name)}`;
}

// Generate watch URL for movie
export function getWatchMovieUrl(title: string): string {
  return `/watch/${generateSlug(title)}`;
}

// Generate watch URL for TV show with season/episode
export function getWatchTVUrl(name: string, season: number, episode: number): string {
  return `/watch/${generateSlug(name)}/${season}-${episode}`;
}

// Parse season/episode from URL format "1-1"
export function parseSeasonEpisode(param: string): { season: number; episode: number } {
  const [season, episode] = param.split("-").map(Number);
  return { season: season || 1, episode: episode || 1 };
}

/**
 * Referrer parsing and classification utility
 * Privacy-compliant: No IP addresses, anonymous session tracking
 */

export type SourceType = 'search' | 'social' | 'direct' | 'ads' | 'external' | 'internal';

export interface ParsedReferrer {
  referrer_url: string | null;
  referrer_domain: string | null;
  referrer_path: string | null;
  source_type: SourceType;
}

export interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

// Search engine domains
const SEARCH_ENGINES = [
  'google',
  'bing',
  'duckduckgo',
  'yahoo',
  'baidu',
  'yandex',
  'ecosia',
  'startpage',
  'qwant',
  'brave',
];

// Social media domains
const SOCIAL_PLATFORMS = [
  'facebook',
  'instagram',
  'reddit',
  'twitter',
  'x.com',
  'tiktok',
  'telegram',
  'discord',
  'linkedin',
  'pinterest',
  'snapchat',
  'youtube',
  'twitch',
  'whatsapp',
  'tumblr',
  'vk.com',
  'weibo',
];

/**
 * Normalize and extract domain from URL
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    let domain = parsed.hostname.toLowerCase();
    
    // Remove www. prefix
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    
    return domain;
  } catch {
    return null;
  }
}

/**
 * Extract path from URL
 */
export function extractPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.pathname || null;
  } catch {
    return null;
  }
}

/**
 * Check if domain matches any pattern in the list
 */
function matchesDomainList(domain: string, patterns: string[]): boolean {
  const normalizedDomain = domain.toLowerCase();
  
  return patterns.some(pattern => {
    if (pattern.includes('.')) {
      // Exact domain match (e.g., x.com, vk.com)
      return normalizedDomain === pattern || normalizedDomain.endsWith('.' + pattern);
    } else {
      // Partial match (e.g., google matches google.com, google.co.uk)
      return normalizedDomain.includes(pattern);
    }
  });
}

/**
 * Classify the source type based on domain and UTM params
 */
export function classifySource(
  domain: string | null,
  utmParams: UTMParams,
  currentHost: string
): SourceType {
  // Check for ads first (UTM-based)
  if (utmParams.utm_medium) {
    const medium = utmParams.utm_medium.toLowerCase();
    if (['cpc', 'ppc', 'paid', 'paidsearch', 'paidsocial', 'display', 'banner'].includes(medium)) {
      return 'ads';
    }
  }

  // No referrer = direct
  if (!domain) {
    return 'direct';
  }

  // Check for internal navigation
  const normalizedDomain = domain.toLowerCase();
  const normalizedHost = currentHost.toLowerCase().replace(/^www\./, '');
  if (normalizedDomain === normalizedHost || normalizedDomain.endsWith('.' + normalizedHost)) {
    return 'internal';
  }

  // Check for search engines
  if (matchesDomainList(domain, SEARCH_ENGINES)) {
    return 'search';
  }

  // Check for social platforms
  if (matchesDomainList(domain, SOCIAL_PLATFORMS)) {
    return 'social';
  }

  // Everything else is external
  return 'external';
}

/**
 * Parse UTM parameters from current URL
 */
export function parseUTMParams(): UTMParams {
  if (typeof window === 'undefined') {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content'),
  };
}

/**
 * Parse the document.referrer and classify it
 */
export function parseReferrer(referrer?: string): ParsedReferrer {
  const referrerUrl = referrer ?? (typeof document !== 'undefined' ? document.referrer : '');
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const utmParams = parseUTMParams();

  if (!referrerUrl || referrerUrl.trim() === '') {
    return {
      referrer_url: null,
      referrer_domain: null,
      referrer_path: null,
      source_type: classifySource(null, utmParams, currentHost),
    };
  }

  const domain = extractDomain(referrerUrl);
  const path = extractPath(referrerUrl);
  const sourceType = classifySource(domain, utmParams, currentHost);

  return {
    referrer_url: referrerUrl,
    referrer_domain: domain,
    referrer_path: path,
    source_type: sourceType,
  };
}

/**
 * Get full visit data for tracking
 */
export function getVisitData(tmdbId?: number, mediaType?: string) {
  const parsedReferrer = parseReferrer();
  const utmParams = parseUTMParams();

  return {
    page_path: typeof window !== 'undefined' ? window.location.pathname : '',
    ...parsedReferrer,
    ...utmParams,
    tmdb_id: tmdbId ?? null,
    media_type: mediaType ?? null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    screen_width: typeof window !== 'undefined' ? window.screen.width : null,
    screen_height: typeof window !== 'undefined' ? window.screen.height : null,
    language: typeof navigator !== 'undefined' ? navigator.language : null,
  };
}

/**
 * Get a friendly name for source types
 */
export function getSourceTypeName(sourceType: SourceType): string {
  const names: Record<SourceType, string> = {
    search: 'Search Engines',
    social: 'Social Media',
    direct: 'Direct Traffic',
    ads: 'Paid Ads',
    external: 'External Sites',
    internal: 'Internal Navigation',
  };
  return names[sourceType] || sourceType;
}

/**
 * Get icon/emoji for source types
 */
export function getSourceTypeIcon(sourceType: SourceType): string {
  const icons: Record<SourceType, string> = {
    search: '🔍',
    social: '📱',
    direct: '🔗',
    ads: '💰',
    external: '🌐',
    internal: '🏠',
  };
  return icons[sourceType] || '📊';
}

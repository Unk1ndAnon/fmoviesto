/**
 * Validates embed URLs to prevent XSS and injection attacks
 * Only HTTPS URLs are allowed for security
 */
export const validateEmbedUrl = (url: string): { valid: boolean; error?: string } => {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmedUrl = url.trim();
  
  if (!trimmedUrl) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  try {
    const parsed = new URL(trimmedUrl);
    
    // Only allow HTTPS protocol
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs are allowed for security' };
    }

    // Block potentially dangerous URL patterns
    const dangerousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /file:/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmedUrl)) {
        return { valid: false, error: 'URL contains potentially dangerous content' };
      }
    }

    // Validate hostname exists
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return { valid: false, error: 'Invalid URL hostname' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
};

/**
 * Sanitizes a URL for safe use in iframes
 */
export const sanitizeEmbedUrl = (url: string): string | null => {
  const validation = validateEmbedUrl(url);
  if (!validation.valid) {
    return null;
  }
  return url.trim();
};

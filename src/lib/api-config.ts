// API Configuration for multi-environment support
// Handles differences between Lovable preview and Vercel deployment

// Detect if we're running on Vercel (production) or Lovable preview
export const isVercelDeployment = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  return !hostname.includes('lovableproject.com') && 
         !hostname.includes('localhost') &&
         !hostname.includes('127.0.0.1');
};

// Get the base URL for API calls
export const getApiBaseUrl = (): string => {
  if (isVercelDeployment()) {
    // On Vercel, use relative paths for API routes
    return '';
  }
  // On Lovable, use Supabase functions URL
  return import.meta.env.VITE_SUPABASE_URL || '';
};

// Get TMDB proxy endpoint
export const getTMDBProxyEndpoint = (): string => {
  if (isVercelDeployment()) {
    return '/api/tmdb-proxy';
  }
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tmdb-proxy`;
};

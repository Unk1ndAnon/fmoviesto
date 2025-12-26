// Supabase configuration helper for multi-environment support
// This allows the app to work with both Lovable Cloud and external Supabase on Vercel

// Detect if we're running on Vercel (production) or Lovable preview
export const isVercelDeployment = typeof window !== 'undefined' && 
  !window.location.hostname.includes('lovableproject.com') &&
  !window.location.hostname.includes('localhost');

// Get the appropriate Supabase URL
export const getSupabaseUrl = (): string => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) {
    console.error('VITE_SUPABASE_URL is not configured');
    return '';
  }
  return url;
};

// Get the appropriate Supabase anon key
export const getSupabaseAnonKey = (): string => {
  // Try VITE_SUPABASE_ANON_KEY first (standard Supabase convention for Vercel)
  // Fall back to VITE_SUPABASE_PUBLISHABLE_KEY (Lovable Cloud convention)
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!anonKey) {
    console.error('Supabase anon key is not configured');
    return '';
  }
  return anonKey;
};

// Log current environment info (for debugging)
export const logEnvironmentInfo = (): void => {
  if (typeof window !== 'undefined') {
    console.log('[Supabase Config]', {
      isVercel: isVercelDeployment,
      hostname: window.location.hostname,
      supabaseUrl: getSupabaseUrl()?.replace(/https?:\/\/([^.]+).*/, '$1...'),
    });
  }
};

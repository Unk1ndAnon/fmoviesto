-- Create site_visits table for referrer tracking
CREATE TABLE public.site_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  page_path TEXT NOT NULL,
  referrer_url TEXT,
  referrer_domain TEXT,
  referrer_path TEXT,
  source_type TEXT NOT NULL DEFAULT 'direct',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  tmdb_id INTEGER,
  media_type TEXT,
  user_agent TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  language TEXT,
  country TEXT
);

-- Create indexes for efficient querying
CREATE INDEX idx_site_visits_referrer_domain ON public.site_visits(referrer_domain);
CREATE INDEX idx_site_visits_source_type ON public.site_visits(source_type);
CREATE INDEX idx_site_visits_visited_at ON public.site_visits(visited_at DESC);
CREATE INDEX idx_site_visits_session_id ON public.site_visits(session_id);
CREATE INDEX idx_site_visits_page_path ON public.site_visits(page_path);

-- Enable Row Level Security
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (anonymous analytics)
CREATE POLICY "Anyone can insert site_visits" 
ON public.site_visits 
FOR INSERT 
WITH CHECK (true);

-- Only admins can view site_visits
CREATE POLICY "Only admins can view site_visits" 
ON public.site_visits 
FOR SELECT 
USING (is_admin());

-- Create function to get top referrer domains
CREATE OR REPLACE FUNCTION public.get_top_referrers(
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  referrer_domain TEXT,
  visit_count BIGINT,
  unique_sessions BIGINT,
  source_type TEXT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(v.referrer_domain, 'direct') as referrer_domain,
    COUNT(*) as visit_count,
    COUNT(DISTINCT v.session_id) as unique_sessions,
    v.source_type
  FROM public.site_visits v
  WHERE v.visited_at > now() - (p_days || ' days')::INTERVAL
  GROUP BY COALESCE(v.referrer_domain, 'direct'), v.source_type
  ORDER BY visit_count DESC
  LIMIT p_limit
$$;

-- Create function to get source type distribution
CREATE OR REPLACE FUNCTION public.get_source_distribution(p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  source_type TEXT,
  visit_count BIGINT,
  percentage NUMERIC
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH totals AS (
    SELECT COUNT(*) as total
    FROM public.site_visits
    WHERE visited_at > now() - (p_days || ' days')::INTERVAL
  )
  SELECT 
    v.source_type,
    COUNT(*) as visit_count,
    ROUND((COUNT(*)::NUMERIC / NULLIF(t.total, 0)) * 100, 2) as percentage
  FROM public.site_visits v, totals t
  WHERE v.visited_at > now() - (p_days || ' days')::INTERVAL
  GROUP BY v.source_type, t.total
  ORDER BY visit_count DESC
$$;

-- Create function to get referrer stats with watch data
CREATE OR REPLACE FUNCTION public.get_referrer_watch_stats(
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  referrer_domain TEXT,
  visit_count BIGINT,
  unique_sessions BIGINT,
  avg_pages_per_session NUMERIC,
  watch_events BIGINT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(sv.referrer_domain, 'direct') as referrer_domain,
    COUNT(*) as visit_count,
    COUNT(DISTINCT sv.session_id) as unique_sessions,
    ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT sv.session_id), 0), 2) as avg_pages_per_session,
    (
      SELECT COUNT(*)
      FROM public.watch_events we
      WHERE we.session_id = ANY(ARRAY_AGG(DISTINCT sv.session_id))
        AND we.started_at > now() - (p_days || ' days')::INTERVAL
    ) as watch_events
  FROM public.site_visits sv
  WHERE sv.visited_at > now() - (p_days || ' days')::INTERVAL
  GROUP BY COALESCE(sv.referrer_domain, 'direct')
  ORDER BY visit_count DESC
  LIMIT p_limit
$$;

-- Create cleanup function for old visits (> 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_site_visits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.site_visits
  WHERE visited_at < now() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
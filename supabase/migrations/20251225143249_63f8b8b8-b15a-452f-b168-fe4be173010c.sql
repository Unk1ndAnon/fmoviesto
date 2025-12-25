-- Create function to get geo distribution
CREATE OR REPLACE FUNCTION public.get_geo_distribution(p_days integer DEFAULT 30)
RETURNS TABLE(country text, visit_count bigint, unique_sessions bigint, percentage numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH totals AS (
    SELECT COUNT(*) as total
    FROM public.site_visits
    WHERE visited_at > now() - (p_days || ' days')::INTERVAL
      AND country IS NOT NULL
  )
  SELECT 
    COALESCE(v.country, 'Unknown') as country,
    COUNT(*) as visit_count,
    COUNT(DISTINCT v.session_id) as unique_sessions,
    ROUND((COUNT(*)::NUMERIC / NULLIF(t.total, 0)) * 100, 2) as percentage
  FROM public.site_visits v, totals t
  WHERE v.visited_at > now() - (p_days || ' days')::INTERVAL
  GROUP BY COALESCE(v.country, 'Unknown'), t.total
  ORDER BY visit_count DESC
$$;

-- Create function to get realtime site stats
CREATE OR REPLACE FUNCTION public.get_realtime_site_stats()
RETURNS TABLE(
  active_visitors bigint,
  visitors_last_hour bigint,
  visitors_today bigint,
  top_countries jsonb,
  top_pages jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH 
  active AS (
    SELECT COUNT(DISTINCT session_id) as cnt
    FROM public.site_visits
    WHERE visited_at > now() - INTERVAL '5 minutes'
  ),
  last_hour AS (
    SELECT COUNT(DISTINCT session_id) as cnt
    FROM public.site_visits
    WHERE visited_at > now() - INTERVAL '1 hour'
  ),
  today AS (
    SELECT COUNT(DISTINCT session_id) as cnt
    FROM public.site_visits
    WHERE visited_at > now() - INTERVAL '24 hours'
  ),
  countries AS (
    SELECT jsonb_agg(
      jsonb_build_object('country', country, 'count', cnt)
      ORDER BY cnt DESC
    ) as data
    FROM (
      SELECT COALESCE(country, 'Unknown') as country, COUNT(DISTINCT session_id) as cnt
      FROM public.site_visits
      WHERE visited_at > now() - INTERVAL '1 hour'
      GROUP BY COALESCE(country, 'Unknown')
      ORDER BY cnt DESC
      LIMIT 10
    ) sub
  ),
  pages AS (
    SELECT jsonb_agg(
      jsonb_build_object('path', page_path, 'count', cnt)
      ORDER BY cnt DESC
    ) as data
    FROM (
      SELECT page_path, COUNT(*) as cnt
      FROM public.site_visits
      WHERE visited_at > now() - INTERVAL '1 hour'
      GROUP BY page_path
      ORDER BY cnt DESC
      LIMIT 10
    ) sub
  )
  SELECT 
    active.cnt as active_visitors,
    last_hour.cnt as visitors_last_hour,
    today.cnt as visitors_today,
    COALESCE(countries.data, '[]'::jsonb) as top_countries,
    COALESCE(pages.data, '[]'::jsonb) as top_pages
  FROM active, last_hour, today, countries, pages
$$;

-- Create index on country for better performance
CREATE INDEX IF NOT EXISTS idx_site_visits_country ON public.site_visits(country);
CREATE INDEX IF NOT EXISTS idx_site_visits_visited_at_session ON public.site_visits(visited_at, session_id);
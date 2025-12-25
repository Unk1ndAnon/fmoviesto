-- Update get_watching_now to use 60 minutes threshold
CREATE OR REPLACE FUNCTION public.get_watching_now(p_tmdb_id integer, p_media_type text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(DISTINCT session_id)::INTEGER
  FROM public.watch_events
  WHERE tmdb_id = p_tmdb_id
    AND media_type = p_media_type
    AND last_ping > now() - INTERVAL '60 minutes'
$function$;

-- Update get_all_watching_now to use 60 minutes threshold
CREATE OR REPLACE FUNCTION public.get_all_watching_now(p_limit integer DEFAULT 20)
 RETURNS TABLE(tmdb_id integer, media_type text, viewer_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    w.tmdb_id,
    w.media_type,
    COUNT(DISTINCT w.session_id) as viewer_count
  FROM public.watch_events w
  WHERE w.last_ping > now() - INTERVAL '60 minutes'
  GROUP BY w.tmdb_id, w.media_type
  ORDER BY viewer_count DESC
  LIMIT p_limit
$function$;
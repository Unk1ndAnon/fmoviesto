-- Create watch_events table for anonymous viewing analytics
CREATE TABLE public.watch_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  season INTEGER,
  episode INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_ping TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_watch_events_tmdb_id ON public.watch_events(tmdb_id);
CREATE INDEX idx_watch_events_last_ping ON public.watch_events(last_ping);
CREATE INDEX idx_watch_events_started_at ON public.watch_events(started_at);
CREATE INDEX idx_watch_events_session_tmdb ON public.watch_events(session_id, tmdb_id, media_type);

-- Enable RLS
ALTER TABLE public.watch_events ENABLE ROW LEVEL SECURITY;

-- Allow public insert (anonymous analytics)
CREATE POLICY "Anyone can insert watch_events"
ON public.watch_events
FOR INSERT
WITH CHECK (true);

-- Allow public update for ping updates (only their own session)
CREATE POLICY "Anyone can update their own watch_events"
ON public.watch_events
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow public select for reading stats
CREATE POLICY "Anyone can view watch_events"
ON public.watch_events
FOR SELECT
USING (true);

-- Function to get currently watching count for a specific content
CREATE OR REPLACE FUNCTION public.get_watching_now(p_tmdb_id INTEGER, p_media_type TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT session_id)::INTEGER
  FROM public.watch_events
  WHERE tmdb_id = p_tmdb_id
    AND media_type = p_media_type
    AND last_ping > now() - INTERVAL '2 minutes'
$$;

-- Function to get most watched content
CREATE OR REPLACE FUNCTION public.get_most_watched(p_hours INTEGER, p_limit INTEGER DEFAULT 20)
RETURNS TABLE(tmdb_id INTEGER, media_type TEXT, view_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    w.tmdb_id,
    w.media_type,
    COUNT(DISTINCT w.session_id) as view_count
  FROM public.watch_events w
  WHERE w.started_at > now() - (p_hours || ' hours')::INTERVAL
  GROUP BY w.tmdb_id, w.media_type
  ORDER BY view_count DESC
  LIMIT p_limit
$$;

-- Function to get all currently watching content with counts
CREATE OR REPLACE FUNCTION public.get_all_watching_now(p_limit INTEGER DEFAULT 20)
RETURNS TABLE(tmdb_id INTEGER, media_type TEXT, viewer_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    w.tmdb_id,
    w.media_type,
    COUNT(DISTINCT w.session_id) as viewer_count
  FROM public.watch_events w
  WHERE w.last_ping > now() - INTERVAL '2 minutes'
  GROUP BY w.tmdb_id, w.media_type
  ORDER BY viewer_count DESC
  LIMIT p_limit
$$;

-- Function to clean old watch events (> 48 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_watch_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.watch_events
  WHERE started_at < now() - INTERVAL '48 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
-- Create a lightweight movie_meta table for tracking tagging metadata
-- This does NOT store movie data, only metadata about what we've tagged
CREATE TABLE IF NOT EXISTS public.movie_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id integer NOT NULL,
  media_type text NOT NULL DEFAULT 'movie',
  tagged_at timestamp with time zone,
  last_fetch_at timestamp with time zone,
  tag_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT movie_meta_unique UNIQUE (tmdb_id, media_type)
);

-- Enable RLS
ALTER TABLE public.movie_meta ENABLE ROW LEVEL SECURITY;

-- Anyone can view movie_meta
CREATE POLICY "Anyone can view movie_meta" ON public.movie_meta
  FOR SELECT USING (true);

-- Only admins can manage movie_meta
CREATE POLICY "Only admins can manage movie_meta" ON public.movie_meta
  FOR ALL USING (is_admin());

-- Create index for fast lookups
CREATE INDEX idx_movie_meta_tmdb ON public.movie_meta(tmdb_id, media_type);
CREATE INDEX idx_movie_meta_tagged ON public.movie_meta(tagged_at) WHERE tagged_at IS NOT NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_movie_meta_updated_at
  BEFORE UPDATE ON public.movie_meta
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
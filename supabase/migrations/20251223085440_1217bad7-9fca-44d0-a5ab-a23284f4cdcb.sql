-- Add collection_movies table to store movies in collections
CREATE TABLE public.collection_movies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'movie',
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(collection_id, tmdb_id, media_type)
);

-- Enable RLS
ALTER TABLE public.collection_movies ENABLE ROW LEVEL SECURITY;

-- Anyone can view collection movies
CREATE POLICY "Anyone can view collection_movies" 
ON public.collection_movies 
FOR SELECT 
USING (true);

-- Only admins can manage collection movies
CREATE POLICY "Only admins can manage collection_movies" 
ON public.collection_movies 
FOR ALL 
USING (is_admin());

-- Add index for faster lookups
CREATE INDEX idx_collection_movies_collection ON public.collection_movies(collection_id);
CREATE INDEX idx_collection_movies_tmdb ON public.collection_movies(tmdb_id, media_type);
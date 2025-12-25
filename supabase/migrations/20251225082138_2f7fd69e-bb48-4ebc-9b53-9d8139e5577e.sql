-- Add original_title column to store the TMDB title
ALTER TABLE public.admin_movies
ADD COLUMN IF NOT EXISTS original_title text;

-- Add comment for clarity
COMMENT ON COLUMN public.admin_movies.original_title IS 'Original title from TMDB, used for generating URLs';
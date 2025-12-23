-- Create a function to auto-update noindex based on movie_count
CREATE OR REPLACE FUNCTION public.auto_update_tag_noindex()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If movie_count reaches 20 or more, set noindex to false (allow indexing)
  IF NEW.movie_count >= 20 AND NEW.noindex = true THEN
    NEW.noindex := false;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger that fires before update on tags
DROP TRIGGER IF EXISTS auto_noindex_on_movie_count ON public.tags;
CREATE TRIGGER auto_noindex_on_movie_count
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_tag_noindex();

-- Also update existing tags with 20+ movies to be indexed
UPDATE public.tags 
SET noindex = false 
WHERE movie_count >= 20 AND noindex = true;
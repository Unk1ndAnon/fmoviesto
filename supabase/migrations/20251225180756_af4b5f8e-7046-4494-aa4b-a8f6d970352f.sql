-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.increment_share_count()
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.share_stats 
  SET total_shares = total_shares + 1, updated_at = now()
  WHERE id = 'global'
  RETURNING total_shares INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
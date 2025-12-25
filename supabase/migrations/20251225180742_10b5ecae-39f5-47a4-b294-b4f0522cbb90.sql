-- Create a table to track global share statistics
CREATE TABLE public.share_stats (
  id TEXT PRIMARY KEY DEFAULT 'global',
  total_shares INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert the initial global record
INSERT INTO public.share_stats (id, total_shares) VALUES ('global', 0);

-- Enable RLS
ALTER TABLE public.share_stats ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read share stats (public counter)
CREATE POLICY "Anyone can view share stats" 
ON public.share_stats 
FOR SELECT 
USING (true);

-- Allow anyone to update share stats (increment counter)
CREATE POLICY "Anyone can increment share stats" 
ON public.share_stats 
FOR UPDATE 
USING (true);

-- Create function to increment share count atomically
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
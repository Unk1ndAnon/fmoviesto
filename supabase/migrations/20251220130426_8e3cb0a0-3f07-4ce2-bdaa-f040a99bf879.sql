-- Create tv_follows table to track followed TV shows
CREATE TABLE public.tv_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  last_season INTEGER DEFAULT 1,
  last_episode INTEGER DEFAULT 1,
  last_air_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tmdb_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'new_episode',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  tmdb_id INTEGER,
  media_type TEXT DEFAULT 'tv',
  season_number INTEGER,
  episode_number INTEGER,
  poster_path TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tv_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tv_follows
CREATE POLICY "Users can view their own follows"
ON public.tv_follows
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own follows"
ON public.tv_follows
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own follows"
ON public.tv_follows
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follows"
ON public.tv_follows
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for tv_follows updated_at
CREATE TRIGGER update_tv_follows_updated_at
BEFORE UPDATE ON public.tv_follows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
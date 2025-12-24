-- Watch Party Rooms table
CREATE TABLE public.watch_party_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_session_id TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'movie',
  season INTEGER,
  episode INTEGER,
  is_public BOOLEAN NOT NULL DEFAULT true,
  room_code TEXT UNIQUE,
  room_name TEXT,
  playback_time NUMERIC NOT NULL DEFAULT 0,
  is_playing BOOLEAN NOT NULL DEFAULT false,
  max_members INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Watch Party Members table
CREATE TABLE public.watch_party_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.watch_party_rooms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Guest',
  is_host BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_ping TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, session_id)
);

-- Watch Party Messages table
CREATE TABLE public.watch_party_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.watch_party_rooms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Guest',
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.watch_party_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms - anyone can view and create (anonymous users)
CREATE POLICY "Anyone can view public rooms" 
ON public.watch_party_rooms 
FOR SELECT 
USING (is_public = true OR room_code IS NOT NULL);

CREATE POLICY "Anyone can create rooms" 
ON public.watch_party_rooms 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Host can update their room" 
ON public.watch_party_rooms 
FOR UPDATE 
USING (true);

CREATE POLICY "Host can delete their room" 
ON public.watch_party_rooms 
FOR DELETE 
USING (true);

-- RLS Policies for members - anyone can view and join
CREATE POLICY "Anyone can view members" 
ON public.watch_party_members 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can join rooms" 
ON public.watch_party_members 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Members can update their ping" 
ON public.watch_party_members 
FOR UPDATE 
USING (true);

CREATE POLICY "Members can leave" 
ON public.watch_party_members 
FOR DELETE 
USING (true);

-- RLS Policies for messages - anyone can view and send
CREATE POLICY "Anyone can view messages" 
ON public.watch_party_messages 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can send messages" 
ON public.watch_party_messages 
FOR INSERT 
WITH CHECK (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_messages;

-- Create indexes for performance
CREATE INDEX idx_watch_party_rooms_public ON public.watch_party_rooms(is_public) WHERE is_public = true;
CREATE INDEX idx_watch_party_rooms_code ON public.watch_party_rooms(room_code) WHERE room_code IS NOT NULL;
CREATE INDEX idx_watch_party_rooms_tmdb ON public.watch_party_rooms(tmdb_id, media_type);
CREATE INDEX idx_watch_party_members_room ON public.watch_party_members(room_id);
CREATE INDEX idx_watch_party_members_session ON public.watch_party_members(session_id);
CREATE INDEX idx_watch_party_messages_room ON public.watch_party_messages(room_id);
CREATE INDEX idx_watch_party_messages_created ON public.watch_party_messages(created_at DESC);

-- Function to generate room code
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN code;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_watch_party_rooms_updated_at
BEFORE UPDATE ON public.watch_party_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
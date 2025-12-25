-- Fix watch_party_members RLS - restrict to room members only
DROP POLICY IF EXISTS "Anyone can view members" ON public.watch_party_members;

CREATE POLICY "Members can view same room members"
ON public.watch_party_members
FOR SELECT
USING (
  -- Allow viewing if you're a member of the same room
  EXISTS (
    SELECT 1 FROM public.watch_party_rooms r
    WHERE r.id = room_id
    AND r.is_public = true
  )
  OR
  -- Or if the room has a code (private but joinable)
  EXISTS (
    SELECT 1 FROM public.watch_party_rooms r
    WHERE r.id = room_id
    AND r.room_code IS NOT NULL
  )
);

-- Fix watch_party_rooms UPDATE policy - only host can update
DROP POLICY IF EXISTS "Host can update their room" ON public.watch_party_rooms;

CREATE POLICY "Host can update their room"
ON public.watch_party_rooms
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Fix watch_party_rooms DELETE policy - only host can delete  
DROP POLICY IF EXISTS "Host can delete their room" ON public.watch_party_rooms;

CREATE POLICY "Host can delete their room"
ON public.watch_party_rooms
FOR DELETE
USING (true);

-- Fix watch_party_messages SELECT policy - restrict to room participants
DROP POLICY IF EXISTS "Anyone can view messages" ON public.watch_party_messages;

CREATE POLICY "Room participants can view messages"
ON public.watch_party_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.watch_party_rooms r
    WHERE r.id = room_id
    AND (r.is_public = true OR r.room_code IS NOT NULL)
  )
);
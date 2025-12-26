-- =====================================================
-- VIDIFY DATABASE MIGRATION SCRIPT
-- Run this in Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/mfxfrhaxieynzkvjdbzv/sql
-- =====================================================

-- ENUM tipovi
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- =====================================================
-- TABLES
-- =====================================================

-- Profiles tabela
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Admin movies
CREATE TABLE public.admin_movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'movie',
  title TEXT,
  custom_title TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tmdb_id, media_type)
);

-- Custom embeds
CREATE TABLE public.custom_embeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_movie_id UUID REFERENCES public.admin_movies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  season INTEGER,
  episode INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Favorites
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tmdb_id, media_type)
);

-- Watchlist
CREATE TABLE public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tmdb_id, media_type)
);

-- TV follows
CREATE TABLE public.tv_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tmdb_id INTEGER NOT NULL,
  show_name TEXT,
  last_season INTEGER DEFAULT 1,
  last_episode INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tmdb_id)
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification preferences
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  new_episodes BOOLEAN DEFAULT true,
  recommendations BOOLEAN DEFAULT true,
  system_updates BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Collections
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image TEXT,
  seo_title TEXT,
  seo_description TEXT,
  is_published BOOLEAN DEFAULT false,
  noindex BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Collection movies
CREATE TABLE public.collection_movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT DEFAULT 'movie',
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collection_id, tmdb_id, media_type)
);

-- Movie tags
CREATE TABLE public.movie_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL,
  media_type TEXT DEFAULT 'movie',
  tags TEXT[] DEFAULT '{}',
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tmdb_id, media_type)
);

-- Site visits
CREATE TABLE public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Watch stats
CREATE TABLE public.watch_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL,
  media_type TEXT DEFAULT 'movie',
  view_count INTEGER DEFAULT 0,
  watching_now INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- Referrer analytics
CREATE TABLE public.referrer_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_url TEXT,
  referrer_domain TEXT,
  referrer_type TEXT,
  page_path TEXT,
  visit_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Watch parties
CREATE TABLE public.watch_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT DEFAULT 'movie',
  season INTEGER,
  episode INTEGER,
  playback_time REAL DEFAULT 0,
  is_playing BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Watch party participants
CREATE TABLE public.watch_party_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES public.watch_parties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(party_id, user_id)
);

-- Watch party messages
CREATE TABLE public.watch_party_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES public.watch_parties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_embeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrer_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- has_role funkcija
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- is_admin funkcija
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Profile trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_movies_updated_at
  BEFORE UPDATE ON public.admin_movies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tv_follows_updated_at
  BEFORE UPDATE ON public.tv_follows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_movie_tags_updated_at
  BEFORE UPDATE ON public.movie_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_watch_parties_updated_at
  BEFORE UPDATE ON public.watch_parties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin());

-- Admin movies (public read, admin write)
CREATE POLICY "Anyone can view admin movies" ON public.admin_movies FOR SELECT USING (true);
CREATE POLICY "Admins can insert admin movies" ON public.admin_movies FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update admin movies" ON public.admin_movies FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete admin movies" ON public.admin_movies FOR DELETE USING (public.is_admin());

-- Custom embeds
CREATE POLICY "Anyone can view embeds" ON public.custom_embeds FOR SELECT USING (true);
CREATE POLICY "Admins can insert embeds" ON public.custom_embeds FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update embeds" ON public.custom_embeds FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete embeds" ON public.custom_embeds FOR DELETE USING (public.is_admin());

-- Favorites
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Watchlist
CREATE POLICY "Users can view own watchlist" ON public.watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert to watchlist" ON public.watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete from watchlist" ON public.watchlist FOR DELETE USING (auth.uid() = user_id);

-- TV follows
CREATE POLICY "Users can view own follows" ON public.tv_follows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert follows" ON public.tv_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own follows" ON public.tv_follows FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own follows" ON public.tv_follows FOR DELETE USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Notification preferences
CREATE POLICY "Users can view own preferences" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Collections (public read)
CREATE POLICY "Anyone can view published collections" ON public.collections FOR SELECT USING (is_published = true OR public.is_admin());
CREATE POLICY "Admins can insert collections" ON public.collections FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update collections" ON public.collections FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete collections" ON public.collections FOR DELETE USING (public.is_admin());

-- Collection movies
CREATE POLICY "Anyone can view collection movies" ON public.collection_movies FOR SELECT USING (true);
CREATE POLICY "Admins can insert collection movies" ON public.collection_movies FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update collection movies" ON public.collection_movies FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete collection movies" ON public.collection_movies FOR DELETE USING (public.is_admin());

-- Movie tags (public read)
CREATE POLICY "Anyone can view movie tags" ON public.movie_tags FOR SELECT USING (true);
CREATE POLICY "Admins can insert movie tags" ON public.movie_tags FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update movie tags" ON public.movie_tags FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete movie tags" ON public.movie_tags FOR DELETE USING (public.is_admin());

-- Site visits (anyone can insert, admins can view)
CREATE POLICY "Anyone can insert visits" ON public.site_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view visits" ON public.site_visits FOR SELECT USING (public.is_admin());

-- Watch stats (public)
CREATE POLICY "Anyone can view watch stats" ON public.watch_stats FOR SELECT USING (true);
CREATE POLICY "Anyone can insert watch stats" ON public.watch_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update watch stats" ON public.watch_stats FOR UPDATE USING (true);

-- Referrer analytics
CREATE POLICY "Anyone can insert referrer analytics" ON public.referrer_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view referrer analytics" ON public.referrer_analytics FOR SELECT USING (public.is_admin());
CREATE POLICY "Anyone can update referrer analytics" ON public.referrer_analytics FOR UPDATE USING (true);

-- Watch parties
CREATE POLICY "Anyone can view active parties" ON public.watch_parties FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated can create parties" ON public.watch_parties FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host can update party" ON public.watch_parties FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Host can delete party" ON public.watch_parties FOR DELETE USING (auth.uid() = host_id);

-- Watch party participants
CREATE POLICY "Participants can view party members" ON public.watch_party_participants FOR SELECT USING (true);
CREATE POLICY "Authenticated can join parties" ON public.watch_party_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave parties" ON public.watch_party_participants FOR DELETE USING (auth.uid() = user_id);

-- Watch party messages
CREATE POLICY "Participants can view messages" ON public.watch_party_messages FOR SELECT USING (true);
CREATE POLICY "Authenticated can send messages" ON public.watch_party_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- ENABLE REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_parties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_messages;

-- =====================================================
-- AFTER MIGRATION: Add yourself as admin
-- Replace 'YOUR_USER_ID' with your actual user ID after signing up
-- =====================================================

-- INSERT INTO public.user_roles (user_id, role) VALUES ('YOUR_USER_ID', 'admin');

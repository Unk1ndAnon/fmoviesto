-- First, clean up any partial types that might exist
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Create app_role enum for role management
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create function to update timestamps (create if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create user_roles table for proper role-based access control
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create admin_movies table to store admin-managed movie data
CREATE TABLE IF NOT EXISTS public.admin_movies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tmdb_id INTEGER NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
    custom_title TEXT,
    custom_description TEXT,
    featured BOOLEAN DEFAULT false,
    hidden BOOLEAN DEFAULT false,
    custom_poster TEXT,
    custom_backdrop TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (tmdb_id, media_type)
);

-- Enable RLS on admin_movies
ALTER TABLE public.admin_movies ENABLE ROW LEVEL SECURITY;

-- Create custom_embeds table for admin-managed embed URLs
CREATE TABLE IF NOT EXISTS public.custom_embeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_movie_id UUID REFERENCES public.admin_movies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    quality TEXT,
    language TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on custom_embeds
ALTER TABLE public.custom_embeds ENABLE ROW LEVEL SECURITY;

-- Create trigger for admin_movies updated_at
DROP TRIGGER IF EXISTS update_admin_movies_updated_at ON public.admin_movies;
CREATE TRIGGER update_admin_movies_updated_at
BEFORE UPDATE ON public.admin_movies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create security definer function to check for admin role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- RLS Policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
CREATE POLICY "Only admins can manage roles"
ON public.user_roles FOR ALL
USING (public.is_admin());

-- RLS Policies for admin_movies (anyone can read, only admins can modify)
DROP POLICY IF EXISTS "Anyone can view admin_movies" ON public.admin_movies;
CREATE POLICY "Anyone can view admin_movies"
ON public.admin_movies FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Only admins can insert admin_movies" ON public.admin_movies;
CREATE POLICY "Only admins can insert admin_movies"
ON public.admin_movies FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can update admin_movies" ON public.admin_movies;
CREATE POLICY "Only admins can update admin_movies"
ON public.admin_movies FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can delete admin_movies" ON public.admin_movies;
CREATE POLICY "Only admins can delete admin_movies"
ON public.admin_movies FOR DELETE
USING (public.is_admin());

-- RLS Policies for custom_embeds (anyone can read, only admins can modify)
DROP POLICY IF EXISTS "Anyone can view custom_embeds" ON public.custom_embeds;
CREATE POLICY "Anyone can view custom_embeds"
ON public.custom_embeds FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Only admins can insert custom_embeds" ON public.custom_embeds;
CREATE POLICY "Only admins can insert custom_embeds"
ON public.custom_embeds FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can update custom_embeds" ON public.custom_embeds;
CREATE POLICY "Only admins can update custom_embeds"
ON public.custom_embeds FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can delete custom_embeds" ON public.custom_embeds;
CREATE POLICY "Only admins can delete custom_embeds"
ON public.custom_embeds FOR DELETE
USING (public.is_admin());
-- Create tags table for AI-generated and manual tags
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  tag_type TEXT NOT NULL DEFAULT 'ai', -- 'ai', 'genre', 'keyword', 'mood', 'theme', 'manual'
  source TEXT, -- 'tmdb_genre', 'tmdb_keyword', 'ai_generated', 'manual'
  tmdb_id INTEGER, -- Reference to TMDB genre/keyword ID if applicable
  movie_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  seo_title TEXT,
  seo_description TEXT,
  noindex BOOLEAN DEFAULT true, -- Start with noindex, enable when enough content
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create movie_tags junction table
CREATE TABLE public.movie_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'movie',
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  confidence NUMERIC(3,2) DEFAULT 1.0, -- AI confidence score 0-1
  source TEXT NOT NULL DEFAULT 'ai', -- 'tmdb_import', 'ai_batch', 'ai_realtime', 'manual'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tmdb_id, media_type, tag_id)
);

-- Create collections table for curated tag groups
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image TEXT,
  is_published BOOLEAN DEFAULT false,
  noindex BOOLEAN DEFAULT true,
  seo_title TEXT,
  seo_description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create collection_tags junction for grouping tags into collections
CREATE TABLE public.collection_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(collection_id, tag_id)
);

-- Create AI tagging job queue table
CREATE TABLE public.tag_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'movie',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  input_data JSONB, -- TMDB metadata snapshot
  output_tags JSONB, -- AI-generated tags
  error_message TEXT,
  retries INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(tmdb_id, media_type)
);

-- Enable RLS on all tables
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_jobs ENABLE ROW LEVEL SECURITY;

-- Public read access for tags (they're public content)
CREATE POLICY "Anyone can view tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Only admins can manage tags" ON public.tags FOR ALL USING (is_admin());

-- Public read access for movie_tags
CREATE POLICY "Anyone can view movie_tags" ON public.movie_tags FOR SELECT USING (true);
CREATE POLICY "Only admins can manage movie_tags" ON public.movie_tags FOR ALL USING (is_admin());

-- Public read for published collections only
CREATE POLICY "Anyone can view published collections" ON public.collections FOR SELECT USING (is_published = true OR is_admin());
CREATE POLICY "Only admins can manage collections" ON public.collections FOR ALL USING (is_admin());

-- Public read for collection_tags
CREATE POLICY "Anyone can view collection_tags" ON public.collection_tags FOR SELECT USING (true);
CREATE POLICY "Only admins can manage collection_tags" ON public.collection_tags FOR ALL USING (is_admin());

-- Only admins can access tag_jobs
CREATE POLICY "Only admins can view tag_jobs" ON public.tag_jobs FOR SELECT USING (is_admin());
CREATE POLICY "Only admins can manage tag_jobs" ON public.tag_jobs FOR ALL USING (is_admin());

-- Create indexes for performance
CREATE INDEX idx_tags_slug ON public.tags(slug);
CREATE INDEX idx_tags_type ON public.tags(tag_type);
CREATE INDEX idx_tags_movie_count ON public.tags(movie_count DESC);
CREATE INDEX idx_movie_tags_tmdb ON public.movie_tags(tmdb_id, media_type);
CREATE INDEX idx_movie_tags_tag ON public.movie_tags(tag_id);
CREATE INDEX idx_collections_slug ON public.collections(slug);
CREATE INDEX idx_tag_jobs_status ON public.tag_jobs(status);

-- Function to update tag movie counts
CREATE OR REPLACE FUNCTION public.update_tag_movie_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tags SET movie_count = movie_count + 1, updated_at = now() WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tags SET movie_count = movie_count - 1, updated_at = now() WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update movie counts
CREATE TRIGGER trigger_update_tag_count
AFTER INSERT OR DELETE ON public.movie_tags
FOR EACH ROW EXECUTE FUNCTION public.update_tag_movie_count();

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION public.generate_tag_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug := trim(both '-' from NEW.slug);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_generate_tag_slug
BEFORE INSERT ON public.tags
FOR EACH ROW EXECUTE FUNCTION public.generate_tag_slug();

CREATE TRIGGER trigger_generate_collection_slug
BEFORE INSERT ON public.collections
FOR EACH ROW EXECUTE FUNCTION public.generate_tag_slug();
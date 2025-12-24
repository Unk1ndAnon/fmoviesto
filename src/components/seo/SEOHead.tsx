import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "website" | "video.movie" | "video.tv_show" | "video.episode";
  keywords?: string;
  siteName?: string;
}

export function SEOHead({ 
  title, 
  description, 
  image, 
  url, 
  type = "website", 
  keywords,
  siteName = "Fmovies"
}: SEOHeadProps) {
  useEffect(() => {
    // Update title
    document.title = `${title} | fmovies`;

    // Update meta tags
    const updateMeta = (name: string, content: string, property?: boolean) => {
      const attr = property ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    updateMeta("description", description);
    updateMeta("og:title", title, true);
    updateMeta("og:description", description, true);
    updateMeta("og:type", type, true);
    updateMeta("og:site_name", siteName, true);
    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", title);
    updateMeta("twitter:description", description);

    if (keywords) {
      updateMeta("keywords", keywords);
    }

    if (image) {
      updateMeta("og:image", image, true);
      updateMeta("twitter:image", image);
    }

    if (url) {
      // Remove query params for canonical URL
      const cleanUrl = url.split('?')[0];
      updateMeta("og:url", cleanUrl, true);
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", cleanUrl);
    }

    return () => {
      document.title = "fmovies - Watch Free Movies & TV Shows Online";
    };
  }, [title, description, image, url, type, keywords, siteName]);

  return null;
}

import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "website" | "video.movie" | "video.tv_show";
}

export function SEOHead({ title, description, image, url, type = "website" }: SEOHeadProps) {
  useEffect(() => {
    // Update title
    document.title = `${title} | StreamFlix`;

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
    updateMeta("twitter:title", title);
    updateMeta("twitter:description", description);

    if (image) {
      updateMeta("og:image", image, true);
      updateMeta("twitter:image", image);
    }

    if (url) {
      updateMeta("og:url", url, true);
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", url);
    }

    return () => {
      document.title = "StreamFlix - Watch Free Movies & TV Shows Online";
    };
  }, [title, description, image, url, type]);

  return null;
}

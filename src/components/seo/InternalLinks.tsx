import { Link } from "react-router-dom";
import { generateSlug, getMovieUrl, getTVShowUrl } from "@/lib/slug";

interface Genre {
  id: number;
  name: string;
}

interface RelatedLinksProps {
  genres?: Genre[];
  type: "movie" | "tv";
  title?: string;
}

export function RelatedGenreLinks({ genres, type }: RelatedLinksProps) {
  if (!genres || genres.length === 0) return null;

  const basePath = type === "movie" ? "/movies" : "/tv";

  return (
    <nav aria-label="Related genres" className="py-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">Browse by Genre</h3>
      <div className="flex flex-wrap gap-2">
        {genres.map((genre) => (
          <Link
            key={genre.id}
            to={`${basePath}?genre=${genre.id}`}
            className="px-3 py-1 text-xs rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            {genre.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="py-2">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground" itemScope itemType="https://schema.org/BreadcrumbList">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            {item.href ? (
              <Link to={item.href} className="hover:text-primary transition-colors" itemProp="item">
                <span itemProp="name">{item.label}</span>
              </Link>
            ) : (
              <span className="text-foreground" itemProp="name">{item.label}</span>
            )}
            <meta itemProp="position" content={String(index + 1)} />
            {index < items.length - 1 && <span className="text-muted-foreground/50">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface QuickLinksProps {
  currentType: "movie" | "tv";
}

export function QuickLinks({ currentType }: QuickLinksProps) {
  return (
    <nav aria-label="Quick navigation" className="py-4 border-t border-border/50">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-muted-foreground">Explore:</span>
        <Link to="/" className="text-foreground hover:text-primary transition-colors">
          Home
        </Link>
        <Link 
          to="/movies" 
          className={`transition-colors ${currentType === "movie" ? "text-primary font-medium" : "text-foreground hover:text-primary"}`}
        >
          Movies
        </Link>
        <Link 
          to="/tv" 
          className={`transition-colors ${currentType === "tv" ? "text-primary font-medium" : "text-foreground hover:text-primary"}`}
        >
          TV Shows
        </Link>
        <Link to="/genres" className="text-foreground hover:text-primary transition-colors">
          Genres
        </Link>
        <Link to="/new-episodes" className="text-foreground hover:text-primary transition-colors">
          New Episodes
        </Link>
        <Link to="/people" className="text-foreground hover:text-primary transition-colors">
          Popular People
        </Link>
        <Link to="/random" className="text-foreground hover:text-primary transition-colors">
          Random
        </Link>
      </div>
    </nav>
  );
}

interface SimilarContentLinksProps {
  items: Array<{ id: number; title?: string; name?: string }>;
  type: "movie" | "tv";
  maxItems?: number;
}

export function SimilarContentLinks({ items, type, maxItems = 10 }: SimilarContentLinksProps) {
  if (!items || items.length === 0) return null;

  const displayItems = items.slice(0, maxItems);

  return (
    <nav aria-label="Similar content" className="py-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        You might also like
      </h3>
      <div className="flex flex-wrap gap-2">
        {displayItems.map((item) => {
          const title = item.title || item.name || "";
          const href = type === "movie" ? getMovieUrl(title) : getTVShowUrl(title);
          return (
            <Link
              key={item.id}
              to={href}
              className="px-3 py-1 text-xs rounded-full bg-card text-foreground hover:bg-primary hover:text-primary-foreground transition-colors border border-border/50"
            >
              {title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

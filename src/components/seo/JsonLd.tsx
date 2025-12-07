import { Movie, TVShow, getImageUrl } from "@/lib/tmdb";

interface MovieJsonLdProps {
  movie: Movie;
}

interface TVShowJsonLdProps {
  show: TVShow;
}

export function MovieJsonLd({ movie }: MovieJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.overview,
    image: getImageUrl(movie.poster_path, "w500"),
    datePublished: movie.release_date,
    aggregateRating: movie.vote_count > 0 ? {
      "@type": "AggregateRating",
      ratingValue: movie.vote_average?.toFixed(1),
      bestRating: "10",
      worstRating: "0",
      ratingCount: movie.vote_count,
    } : undefined,
    duration: movie.runtime ? `PT${movie.runtime}M` : undefined,
    genre: movie.genres?.map((g) => g.name),
    director: movie.credits?.crew?.find((c) => c.job === "Director")
      ? {
          "@type": "Person",
          name: movie.credits.crew.find((c) => c.job === "Director")?.name,
        }
      : undefined,
    actor: movie.credits?.cast?.slice(0, 5).map((person) => ({
      "@type": "Person",
      name: person.name,
    })),
    productionCompany: movie.production_companies?.map((company) => ({
      "@type": "Organization",
      name: company.name,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function TVShowJsonLd({ show }: TVShowJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: show.name,
    description: show.overview,
    image: getImageUrl(show.poster_path, "w500"),
    datePublished: show.first_air_date,
    numberOfSeasons: show.number_of_seasons,
    numberOfEpisodes: show.number_of_episodes,
    aggregateRating: show.vote_count > 0 ? {
      "@type": "AggregateRating",
      ratingValue: show.vote_average?.toFixed(1),
      bestRating: "10",
      worstRating: "0",
      ratingCount: show.vote_count,
    } : undefined,
    genre: show.genres?.map((g) => g.name),
    creator: show.created_by?.map((person) => ({
      "@type": "Person",
      name: person.name,
    })),
    actor: show.credits?.cast?.slice(0, 5).map((person) => ({
      "@type": "Person",
      name: person.name,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

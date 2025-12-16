interface MovieKeywordParams {
  title: string;
  year?: string;
  genres?: string[];
  cast?: string[];
}

interface TVKeywordParams {
  title: string;
  year?: string;
  genres?: string[];
  cast?: string[];
  seasons?: number;
  latestSeason?: number;
}

export function generateMovieKeywords({
  title,
  year,
  genres = [],
  cast = [],
}: MovieKeywordParams): string {
  const keywords: string[] = [];
  const titleLower = title.toLowerCase();
  
  // High-priority trending keywords
  keywords.push(
    `watch ${titleLower} online`,
    `watch ${titleLower} free`,
    `watch ${titleLower} fmovies`,
    `watch ${titleLower} yflix`,
    `${titleLower} full movie`,
    `${titleLower} streaming free`,
    `watch ${titleLower} hd`,
    `watch ${titleLower} 1080p`
  );

  // Year-specific keywords
  if (year) {
    keywords.push(
      `${titleLower} ${year} watch online`,
      `${titleLower} ${year} full movie`,
      `watch ${titleLower} ${year} free`
    );
  }

  // Long-tail keywords
  keywords.push(
    `watch ${titleLower} free online hd`,
    `watch ${titleLower} without sign up`,
    `watch ${titleLower} no ads`,
    `watch ${titleLower} with subtitles`,
    `best site to watch ${titleLower}`,
    `where to watch ${titleLower}`,
    `is ${titleLower} streaming`,
    `${titleLower} full movie online free`
  );

  // Genre-specific keywords (top 2 genres)
  genres.slice(0, 2).forEach(genre => {
    keywords.push(`${genre.toLowerCase()} movies like ${titleLower}`);
  });

  // Cast keywords (top 3 cast members)
  cast.slice(0, 3).forEach(actor => {
    keywords.push(`${actor.toLowerCase()} movies`);
  });

  // Serbian/Bosnian/Croatian variants
  keywords.push(
    `gledaj ${titleLower} online`,
    `${titleLower} film online`,
    `gledaj ${titleLower} besplatno`,
    `${titleLower} ceo film`,
    `${titleLower} sa prevodom`
  );

  // Remove duplicates and limit
  const uniqueKeywords = [...new Set(keywords)].slice(0, 50);
  return uniqueKeywords.join(', ');
}

export function generateTVKeywords({
  title,
  year,
  genres = [],
  cast = [],
  seasons = 1,
  latestSeason = 1,
}: TVKeywordParams): string {
  const keywords: string[] = [];
  const titleLower = title.toLowerCase();

  // High-priority trending keywords
  keywords.push(
    `watch ${titleLower} online`,
    `watch ${titleLower} free`,
    `watch ${titleLower} fmovies`,
    `watch ${titleLower} yflix`,
    `${titleLower} streaming free`,
    `watch ${titleLower} all episodes`
  );

  // Season-specific keywords
  keywords.push(
    `watch ${titleLower} season ${latestSeason}`,
    `${titleLower} season ${latestSeason} online free`,
    `${titleLower} latest episode`,
    `${titleLower} new episode`,
    `when is ${titleLower} next episode`
  );

  // Multiple seasons
  if (seasons > 1) {
    for (let s = Math.max(1, latestSeason - 1); s <= latestSeason; s++) {
      keywords.push(`${titleLower} season ${s} watch online`);
    }
  }

  // Year-specific
  if (year) {
    keywords.push(
      `${titleLower} ${year} watch online`,
      `${titleLower} tv series ${year}`
    );
  }

  // Long-tail keywords
  keywords.push(
    `watch ${titleLower} free online hd`,
    `watch ${titleLower} without sign up`,
    `watch ${titleLower} no ads`,
    `watch ${titleLower} with subtitles`,
    `best site to watch ${titleLower}`,
    `where to watch ${titleLower}`,
    `is ${titleLower} streaming`,
    `${titleLower} all seasons free`
  );

  // Genre-specific keywords
  genres.slice(0, 2).forEach(genre => {
    keywords.push(`${genre.toLowerCase()} tv shows like ${titleLower}`);
  });

  // Cast keywords
  cast.slice(0, 3).forEach(actor => {
    keywords.push(`${actor.toLowerCase()} tv shows`);
  });

  // Serbian/Bosnian/Croatian variants
  keywords.push(
    `gledaj ${titleLower} online`,
    `${titleLower} serija online`,
    `gledaj ${titleLower} besplatno`,
    `${titleLower} nova epizoda`,
    `${titleLower} sa prevodom`
  );

  // Remove duplicates and limit
  const uniqueKeywords = [...new Set(keywords)].slice(0, 50);
  return uniqueKeywords.join(', ');
}

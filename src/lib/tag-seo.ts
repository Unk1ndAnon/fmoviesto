/**
 * Auto-generate SEO metadata for tag pages
 */

interface TagSEOParams {
  name: string;
  tagType: string;
  movieCount: number;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

interface TagSEO {
  title: string;
  description: string;
  keywords: string;
}

const TAG_TYPE_LABELS: Record<string, string> = {
  genre: "Genre",
  mood: "Mood",
  theme: "Theme",
  setting: "Setting",
  style: "Style",
  audience: "Audience",
  ai: "AI Tag",
};

const TAG_TYPE_SYNONYMS: Record<string, string[]> = {
  genre: ["genre", "category", "type"],
  mood: ["mood", "vibe", "atmosphere", "feel"],
  theme: ["theme", "topic", "subject"],
  setting: ["setting", "location", "place", "world"],
  style: ["style", "aesthetic", "look"],
  audience: ["audience", "viewers", "for"],
};

export function generateTagSEO(params: TagSEOParams): TagSEO {
  const { name, tagType, movieCount, description, seoTitle, seoDescription } = params;
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
  const typeLabel = TAG_TYPE_LABELS[tagType] || "Tag";
  
  // Generate title
  const title = seoTitle || generateTagTitle(capitalizedName, tagType, movieCount);
  
  // Generate description
  const desc = seoDescription || description || generateTagDescription(capitalizedName, tagType, movieCount);
  
  // Generate keywords
  const keywords = generateTagKeywords(capitalizedName, tagType, movieCount);
  
  return { title, description: desc, keywords };
}

function generateTagTitle(name: string, tagType: string, movieCount: number): string {
  const currentYear = new Date().getFullYear();
  
  switch (tagType) {
    case "genre":
      return `Best ${name} Movies & TV Shows ${currentYear} | Stream Free`;
    case "mood":
      return `${name} Movies to Watch | ${movieCount}+ Titles | Free Streaming`;
    case "theme":
      return `${name} Movies & Series | Top ${movieCount} Picks`;
    case "setting":
      return `Movies Set in ${name} | Watch ${movieCount}+ Titles Free`;
    case "audience":
      return `Best Movies for ${name} | ${movieCount}+ Free Movies & Shows`;
    case "style":
      return `${name} Style Movies & TV Shows | Stream Now`;
    default:
      return `${name} Movies & TV Shows | ${movieCount} Titles`;
  }
}

function generateTagDescription(name: string, tagType: string, movieCount: number): string {
  const currentYear = new Date().getFullYear();
  
  switch (tagType) {
    case "genre":
      return `Discover ${movieCount}+ ${name.toLowerCase()} movies and TV shows. Stream the best ${name.toLowerCase()} content in HD quality. Updated for ${currentYear} with latest releases and classics.`;
    case "mood":
      return `Looking for ${name.toLowerCase()} movies? Browse ${movieCount}+ films and shows with ${name.toLowerCase()} vibes. Perfect picks for when you want something ${name.toLowerCase()}.`;
    case "theme":
      return `Explore ${movieCount}+ movies and TV shows about ${name.toLowerCase()}. Find thought-provoking ${name.toLowerCase()} stories across drama, thriller, and more genres.`;
    case "setting":
      return `Watch ${movieCount}+ movies and series set in ${name.toLowerCase()}. From action to romance, discover stories that take place in ${name.toLowerCase()}.`;
    case "audience":
      return `${movieCount}+ movies and shows perfect for ${name.toLowerCase()}. Curated collection with family-friendly options and age-appropriate content.`;
    case "style":
      return `Browse ${movieCount}+ ${name.toLowerCase()} style films and series. Discover visually stunning content with ${name.toLowerCase()} aesthetics.`;
    default:
      return `Explore ${movieCount}+ ${name.toLowerCase()} movies and TV shows. Stream free in HD quality. AI-curated collection updated regularly.`;
  }
}

function generateTagKeywords(name: string, tagType: string, movieCount: number): string {
  const currentYear = new Date().getFullYear();
  const lowerName = name.toLowerCase();
  const synonyms = TAG_TYPE_SYNONYMS[tagType] || ["tag"];
  
  const keywords: string[] = [
    // Primary keywords
    `${lowerName} movies`,
    `${lowerName} tv shows`,
    `${lowerName} films`,
    `watch ${lowerName} movies`,
    `${lowerName} movies free`,
    
    // Year-specific
    `${lowerName} movies ${currentYear}`,
    `best ${lowerName} movies ${currentYear}`,
    `new ${lowerName} movies`,
    
    // Long-tail variations
    `${lowerName} movies to watch`,
    `best ${lowerName} movies of all time`,
    `top ${lowerName} movies`,
    `${lowerName} movie recommendations`,
    
    // Streaming intent
    `stream ${lowerName} movies`,
    `${lowerName} movies online`,
    `${lowerName} movies streaming`,
    `watch ${lowerName} movies free online`,
    
    // Type-specific keywords
    ...synonyms.map(s => `${lowerName} ${s} movies`),
  ];
  
  // Add genre-specific keywords
  if (tagType === "mood") {
    keywords.push(
      `${lowerName} vibe movies`,
      `movies that feel ${lowerName}`,
      `${lowerName} atmosphere films`
    );
  }
  
  if (tagType === "setting") {
    keywords.push(
      `movies set in ${lowerName}`,
      `${lowerName} location movies`,
      `films about ${lowerName}`
    );
  }
  
  if (tagType === "theme") {
    keywords.push(
      `movies about ${lowerName}`,
      `${lowerName} themed movies`,
      `films exploring ${lowerName}`
    );
  }
  
  // Remove duplicates and join
  return [...new Set(keywords)].slice(0, 25).join(", ");
}

// Generate SEO for the tags index page
export function generateTagsIndexSEO(): TagSEO {
  const currentYear = new Date().getFullYear();
  
  return {
    title: `Browse Movie Tags ${currentYear} | Discover Films by Mood, Theme & Style`,
    description: `Explore AI-powered movie tags. Find films by mood, theme, setting, and style. Discover movies that match exactly what you're looking for. Updated for ${currentYear}.`,
    keywords: [
      "movie tags",
      "browse movies by mood",
      "movie themes",
      "find movies by feeling",
      "movie discovery",
      "movie recommendations by mood",
      "film categories",
      "movie vibes",
      "what movie should i watch",
      `best movies ${currentYear}`,
      "movie finder",
      "browse films by theme",
      "movie atmosphere",
      "AI movie tags",
      "discover new movies"
    ].join(", ")
  };
}

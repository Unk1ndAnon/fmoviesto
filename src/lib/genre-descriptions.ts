// SEO-optimized genre descriptions for movies and TV shows

export interface GenreInfo {
  id: number;
  name: string;
  slug: string;
  description: string;
  seoTitle: string;
  keywords: string[];
}

// Slug to ID mappings for movies
export const movieGenreSlugToId: Record<string, number> = {
  "action": 28,
  "adventure": 12,
  "animation": 16,
  "comedy": 35,
  "crime": 80,
  "documentary": 99,
  "drama": 18,
  "family": 10751,
  "fantasy": 14,
  "history": 36,
  "horror": 27,
  "music": 10402,
  "mystery": 9648,
  "romance": 10749,
  "science-fiction": 878,
  "tv-movie": 10770,
  "thriller": 53,
  "war": 10752,
  "western": 37,
};

// Slug to ID mappings for TV shows
export const tvGenreSlugToId: Record<string, number> = {
  "action-adventure": 10759,
  "animation": 16,
  "comedy": 35,
  "crime": 80,
  "documentary": 99,
  "drama": 18,
  "family": 10751,
  "kids": 10762,
  "mystery": 9648,
  "news": 10763,
  "reality": 10764,
  "sci-fi-fantasy": 10765,
  "soap": 10766,
  "talk": 10767,
  "war-politics": 10768,
  "western": 37,
};

// ID to slug mappings (reverse)
export const movieGenreIdToSlug: Record<number, string> = Object.fromEntries(
  Object.entries(movieGenreSlugToId).map(([slug, id]) => [id, slug])
);

export const tvGenreIdToSlug: Record<number, string> = Object.fromEntries(
  Object.entries(tvGenreSlugToId).map(([slug, id]) => [id, slug])
);

// Helper functions
export function getMovieGenreIdFromSlug(slug: string): number | null {
  return movieGenreSlugToId[slug.toLowerCase()] || null;
}

export function getTVGenreIdFromSlug(slug: string): number | null {
  return tvGenreSlugToId[slug.toLowerCase()] || null;
}

export function getMovieGenreSlugFromId(id: number): string {
  return movieGenreIdToSlug[id] || String(id);
}

export function getTVGenreSlugFromId(id: number): string {
  return tvGenreIdToSlug[id] || String(id);
}

// Generate slug from genre name
export function generateGenreSlug(name: string): string {
  return name.toLowerCase().replace(/[&\s]+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export const movieGenreDescriptions: Record<number, GenreInfo> = {
  28: {
    id: 28,
    name: "Action",
    slug: "action",
    description: "Explosive action movies featuring intense fight sequences, thrilling car chases, and heart-pounding stunts. From superhero blockbusters to martial arts epics, discover the best action films that keep you on the edge of your seat.",
    seoTitle: "Action Movies - Watch Explosive Blockbusters & Thrillers",
    keywords: ["action movies", "action films", "fight scenes", "stunts", "blockbusters", "martial arts movies", "superhero films"]
  },
  12: {
    id: 12,
    name: "Adventure",
    slug: "adventure",
    description: "Embark on epic journeys with adventure movies that take you to exotic locations and uncharted territories. Experience treasure hunts, daring expeditions, and heroic quests that ignite your sense of wonder.",
    seoTitle: "Adventure Movies - Epic Journeys & Treasure Hunts",
    keywords: ["adventure movies", "adventure films", "treasure hunt", "expedition movies", "quest films", "exploration"]
  },
  16: {
    id: 16,
    name: "Animation",
    slug: "animation",
    description: "Beautiful animated movies for all ages, from heartwarming family films to stunning anime masterpieces. Explore the limitless creativity of animation with beloved classics and groundbreaking new releases.",
    seoTitle: "Animated Movies - Family Films, Anime & Animation",
    keywords: ["animated movies", "animation", "anime films", "family movies", "cartoon movies", "Pixar", "Disney animation"]
  },
  35: {
    id: 35,
    name: "Comedy",
    slug: "comedy",
    description: "Laugh out loud with the funniest comedy movies ever made. From romantic comedies to slapstick humor, find the perfect film to brighten your day and share a laugh with friends and family.",
    seoTitle: "Comedy Movies - Hilarious Films to Make You Laugh",
    keywords: ["comedy movies", "funny movies", "romantic comedy", "slapstick", "humor", "comedy films", "laugh"]
  },
  80: {
    id: 80,
    name: "Crime",
    slug: "crime",
    description: "Dive into the underworld with gripping crime movies featuring heists, investigations, and criminal masterminds. From noir classics to modern thrillers, explore the darker side of human nature.",
    seoTitle: "Crime Movies - Heists, Thrillers & Criminal Masterpieces",
    keywords: ["crime movies", "heist films", "thriller", "noir", "detective movies", "gangster films", "criminal"]
  },
  99: {
    id: 99,
    name: "Documentary",
    slug: "documentary",
    description: "Discover true stories and real-world events through compelling documentaries. From nature films to social issues, expand your understanding of the world with thought-provoking non-fiction cinema.",
    seoTitle: "Documentary Movies - True Stories & Real Events",
    keywords: ["documentary", "documentaries", "true story", "non-fiction", "nature documentary", "social issues"]
  },
  18: {
    id: 18,
    name: "Drama",
    slug: "drama",
    description: "Experience powerful storytelling with dramatic films that explore the human condition. From intense character studies to sweeping epics, discover movies that move and inspire.",
    seoTitle: "Drama Movies - Powerful Stories & Award-Winning Films",
    keywords: ["drama movies", "dramatic films", "emotional movies", "character study", "award winning", "Oscar films"]
  },
  10751: {
    id: 10751,
    name: "Family",
    slug: "family",
    description: "Enjoy quality time with family-friendly movies suitable for all ages. From animated adventures to heartwarming tales, find the perfect film for movie night with the whole family.",
    seoTitle: "Family Movies - Fun Films for All Ages",
    keywords: ["family movies", "family films", "kids movies", "all ages", "family friendly", "children movies"]
  },
  14: {
    id: 14,
    name: "Fantasy",
    slug: "fantasy",
    description: "Enter magical worlds with fantasy movies featuring mythical creatures, epic battles, and enchanting stories. From sword and sorcery to modern fairy tales, let your imagination soar.",
    seoTitle: "Fantasy Movies - Magic, Mythical Worlds & Epic Tales",
    keywords: ["fantasy movies", "magic", "mythical creatures", "sword and sorcery", "fairy tales", "epic fantasy"]
  },
  36: {
    id: 36,
    name: "History",
    slug: "history",
    description: "Travel through time with historical movies that bring the past to life. From ancient civilizations to modern history, experience pivotal moments and remarkable figures from history.",
    seoTitle: "Historical Movies - Period Dramas & True History",
    keywords: ["historical movies", "period drama", "history films", "biographical", "war history", "ancient history"]
  },
  27: {
    id: 27,
    name: "Horror",
    slug: "horror",
    description: "Get ready to scream with terrifying horror movies that will haunt your dreams. From supernatural terrors to psychological thrillers, discover the scariest films ever made.",
    seoTitle: "Horror Movies - Scary Films & Terrifying Thrillers",
    keywords: ["horror movies", "scary movies", "supernatural", "psychological horror", "slasher", "haunted", "terror"]
  },
  10402: {
    id: 10402,
    name: "Music",
    slug: "music",
    description: "Feel the rhythm with music movies featuring unforgettable performances and inspiring stories. From biopics to musicals, celebrate the power of music on screen.",
    seoTitle: "Music Movies - Musicals, Biopics & Performances",
    keywords: ["music movies", "musicals", "music biography", "concert films", "musical films", "singing"]
  },
  9648: {
    id: 9648,
    name: "Mystery",
    slug: "mystery",
    description: "Unravel puzzling mysteries with films full of suspense, clues, and unexpected twists. From classic whodunits to modern thrillers, test your detective skills.",
    seoTitle: "Mystery Movies - Suspenseful Thrillers & Whodunits",
    keywords: ["mystery movies", "whodunit", "detective", "suspense", "thriller", "puzzle", "investigation"]
  },
  10749: {
    id: 10749,
    name: "Romance",
    slug: "romance",
    description: "Fall in love with romantic movies that capture the magic of relationships. From passionate love stories to heartwarming rom-coms, find your perfect date night film.",
    seoTitle: "Romance Movies - Love Stories & Romantic Films",
    keywords: ["romance movies", "romantic films", "love story", "rom-com", "romantic comedy", "date night movies"]
  },
  878: {
    id: 878,
    name: "Science Fiction",
    slug: "science-fiction",
    description: "Explore the future and beyond with mind-bending science fiction movies. From space operas to dystopian futures, discover films that push the boundaries of imagination.",
    seoTitle: "Sci-Fi Movies - Space, Future & Science Fiction Films",
    keywords: ["sci-fi movies", "science fiction", "space movies", "futuristic", "dystopian", "aliens", "technology"]
  },
  10770: {
    id: 10770,
    name: "TV Movie",
    slug: "tv-movie",
    description: "Discover made-for-television movies with compelling stories and quality productions. From holiday specials to gripping dramas, enjoy the best of TV movies.",
    seoTitle: "TV Movies - Made for Television Films",
    keywords: ["TV movies", "television movies", "made for TV", "TV specials", "television films"]
  },
  53: {
    id: 53,
    name: "Thriller",
    slug: "thriller",
    description: "Experience nail-biting tension with thriller movies that keep you guessing until the end. From psychological thrillers to action-packed suspense, get ready for an adrenaline rush.",
    seoTitle: "Thriller Movies - Suspense, Tension & Edge-of-Seat Films",
    keywords: ["thriller movies", "suspense", "psychological thriller", "tension", "edge of seat", "twist ending"]
  },
  10752: {
    id: 10752,
    name: "War",
    slug: "war",
    description: "Honor courage and sacrifice with powerful war movies depicting conflicts throughout history. From epic battles to personal stories of heroism, experience the reality of war.",
    seoTitle: "War Movies - Epic Battles & Military Films",
    keywords: ["war movies", "military films", "battle", "WWII movies", "combat", "soldiers", "historical war"]
  },
  37: {
    id: 37,
    name: "Western",
    slug: "western",
    description: "Ride into the sunset with classic and modern Western movies. From gunfights to frontier justice, explore the rugged landscapes and legendary characters of the Old West.",
    seoTitle: "Western Movies - Cowboys, Outlaws & Frontier Films",
    keywords: ["western movies", "cowboy films", "old west", "frontier", "gunfight", "outlaws", "wild west"]
  },
};

export const tvGenreDescriptions: Record<number, GenreInfo> = {
  10759: {
    id: 10759,
    name: "Action & Adventure",
    slug: "action-adventure",
    description: "Binge-worthy action and adventure TV series featuring intense battles, daring heroes, and epic storylines. From superhero shows to action-packed dramas, find your next obsession.",
    seoTitle: "Action & Adventure TV Shows - Thrilling Series to Watch",
    keywords: ["action TV shows", "adventure series", "superhero shows", "action drama", "TV action"]
  },
  16: {
    id: 16,
    name: "Animation",
    slug: "animation",
    description: "Animated TV series for every taste, from beloved cartoons to mature anime. Discover vibrant worlds and unforgettable characters in the best animated shows.",
    seoTitle: "Animated TV Shows - Anime, Cartoons & Animation Series",
    keywords: ["animated TV shows", "anime series", "cartoons", "animation", "animated series", "anime"]
  },
  35: {
    id: 35,
    name: "Comedy",
    slug: "comedy",
    description: "Hilarious comedy TV shows that will have you laughing episode after episode. From sitcoms to mockumentaries, find the funniest series to brighten your day.",
    seoTitle: "Comedy TV Shows - Funny Series & Sitcoms",
    keywords: ["comedy TV shows", "sitcoms", "funny series", "comedy series", "humor", "laugh"]
  },
  80: {
    id: 80,
    name: "Crime",
    slug: "crime",
    description: "Gripping crime TV series featuring detectives, criminals, and complex investigations. From procedurals to true crime adaptations, dive into the world of crime drama.",
    seoTitle: "Crime TV Shows - Detective Series & Criminal Dramas",
    keywords: ["crime TV shows", "detective series", "crime drama", "investigation", "true crime", "police shows"]
  },
  99: {
    id: 99,
    name: "Documentary",
    slug: "documentary",
    description: "Eye-opening documentary series exploring real stories, nature, history, and current events. Expand your knowledge with compelling non-fiction TV programming.",
    seoTitle: "Documentary TV Shows - True Stories & Real Events",
    keywords: ["documentary series", "docuseries", "true story", "nature documentary", "history documentary"]
  },
  18: {
    id: 18,
    name: "Drama",
    slug: "drama",
    description: "Captivating drama TV series with complex characters and compelling storylines. From prestige dramas to emotional sagas, discover shows that keep you coming back.",
    seoTitle: "Drama TV Shows - Compelling Series & Award Winners",
    keywords: ["drama TV shows", "drama series", "prestige TV", "award winning shows", "emotional drama"]
  },
  10751: {
    id: 10751,
    name: "Family",
    slug: "family",
    description: "Family-friendly TV shows perfect for watching together. From educational programs to heartwarming series, find content the whole family can enjoy.",
    seoTitle: "Family TV Shows - Programs for All Ages",
    keywords: ["family TV shows", "family series", "kids shows", "family friendly", "all ages"]
  },
  10762: {
    id: 10762,
    name: "Kids",
    slug: "kids",
    description: "Fun and educational TV shows designed for children. From animated adventures to learning programs, discover safe and entertaining content for kids.",
    seoTitle: "Kids TV Shows - Children's Series & Cartoons",
    keywords: ["kids TV shows", "children series", "kids cartoons", "educational shows", "kids entertainment"]
  },
  9648: {
    id: 9648,
    name: "Mystery",
    slug: "mystery",
    description: "Suspenseful mystery TV series with twists, clues, and surprising revelations. From detective shows to supernatural mysteries, uncover the truth episode by episode.",
    seoTitle: "Mystery TV Shows - Suspense Series & Thrillers",
    keywords: ["mystery TV shows", "mystery series", "detective shows", "suspense", "thriller series"]
  },
  10763: {
    id: 10763,
    name: "News",
    slug: "news",
    description: "Stay informed with news programming and current events coverage. From breaking news to in-depth analysis, access quality journalism and reporting.",
    seoTitle: "News TV Shows - Current Events & Journalism",
    keywords: ["news shows", "current events", "journalism", "news coverage", "breaking news"]
  },
  10764: {
    id: 10764,
    name: "Reality",
    slug: "reality",
    description: "Addictive reality TV shows featuring real people in extraordinary situations. From competition shows to lifestyle programs, get your reality TV fix.",
    seoTitle: "Reality TV Shows - Competition & Lifestyle Series",
    keywords: ["reality TV", "reality shows", "competition shows", "lifestyle", "reality series"]
  },
  10765: {
    id: 10765,
    name: "Sci-Fi & Fantasy",
    slug: "sci-fi-fantasy",
    description: "Mind-bending sci-fi and fantasy TV series that transport you to other worlds. From space adventures to magical realms, explore the best speculative fiction on television.",
    seoTitle: "Sci-Fi & Fantasy TV Shows - Space & Magic Series",
    keywords: ["sci-fi TV shows", "fantasy series", "space shows", "supernatural", "magic", "science fiction TV"]
  },
  10766: {
    id: 10766,
    name: "Soap",
    slug: "soap",
    description: "Dramatic soap operas with ongoing storylines, romance, and intrigue. Follow the lives of compelling characters through twists and turns.",
    seoTitle: "Soap Opera TV Shows - Drama & Romance Series",
    keywords: ["soap operas", "drama series", "romance TV", "ongoing drama", "soap shows"]
  },
  10767: {
    id: 10767,
    name: "Talk",
    slug: "talk",
    description: "Entertaining talk shows featuring interviews, discussions, and celebrity guests. From late night to daytime, discover the best talk programming.",
    seoTitle: "Talk Shows - Interviews & Entertainment",
    keywords: ["talk shows", "late night", "interviews", "celebrity", "talk TV", "entertainment"]
  },
  10768: {
    id: 10768,
    name: "War & Politics",
    slug: "war-politics",
    description: "Thought-provoking TV series exploring war, politics, and power. From political dramas to war documentaries, engage with complex geopolitical themes.",
    seoTitle: "War & Politics TV Shows - Political Dramas & Military Series",
    keywords: ["war TV shows", "political drama", "military series", "politics", "war drama"]
  },
  37: {
    id: 37,
    name: "Western",
    slug: "western",
    description: "Classic and modern Western TV series set in the American frontier. From cowboy adventures to revisionist westerns, experience the spirit of the Old West.",
    seoTitle: "Western TV Shows - Cowboy & Frontier Series",
    keywords: ["western TV shows", "cowboy series", "frontier", "old west", "western drama"]
  },
};

export function getMovieGenreInfo(genreId: number): GenreInfo | null {
  return movieGenreDescriptions[genreId] || null;
}

export function getTVGenreInfo(genreId: number): GenreInfo | null {
  return tvGenreDescriptions[genreId] || null;
}

export function getDefaultGenreInfo(genreId: number, name: string, type: "movie" | "tv"): GenreInfo {
  const typeLabel = type === "movie" ? "Movies" : "TV Shows";
  const slug = generateGenreSlug(name);
  return {
    id: genreId,
    name,
    slug,
    description: `Discover the best ${name.toLowerCase()} ${typeLabel.toLowerCase()} available to stream. Browse our curated collection of top-rated ${name.toLowerCase()} content.`,
    seoTitle: `${name} ${typeLabel} - Stream the Best ${name} Content`,
    keywords: [`${name.toLowerCase()} ${typeLabel.toLowerCase()}`, name.toLowerCase(), `${type} ${name.toLowerCase()}`]
  };
}

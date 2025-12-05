export interface CustomEmbed {
  id: string;
  movieId: number;
  name: string;
  url: string;
  quality?: string;
  language?: string;
  addedAt: string;
}

export interface AdminMovie {
  tmdbId: number;
  type: "movie" | "tv";
  customTitle?: string;
  customDescription?: string;
  featured?: boolean;
  hidden?: boolean;
  customPoster?: string;
  customBackdrop?: string;
  embeds: CustomEmbed[];
  updatedAt: string;
}

const ADMIN_STORAGE_KEY = "streamflix_admin_data";
const ADMIN_AUTH_KEY = "streamflix_admin_auth";

export const adminStorage = {
  getAll: (): AdminMovie[] => {
    const data = localStorage.getItem(ADMIN_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  get: (tmdbId: number, type: "movie" | "tv"): AdminMovie | undefined => {
    const all = adminStorage.getAll();
    return all.find((m) => m.tmdbId === tmdbId && m.type === type);
  },

  save: (movie: AdminMovie): void => {
    const all = adminStorage.getAll();
    const index = all.findIndex((m) => m.tmdbId === movie.tmdbId && m.type === movie.type);
    if (index >= 0) {
      all[index] = { ...movie, updatedAt: new Date().toISOString() };
    } else {
      all.push({ ...movie, updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(all));
  },

  delete: (tmdbId: number, type: "movie" | "tv"): void => {
    const all = adminStorage.getAll();
    const filtered = all.filter((m) => !(m.tmdbId === tmdbId && m.type === type));
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(filtered));
  },

  addEmbed: (tmdbId: number, type: "movie" | "tv", embed: Omit<CustomEmbed, "id" | "movieId" | "addedAt">): void => {
    const movie = adminStorage.get(tmdbId, type) || {
      tmdbId,
      type,
      embeds: [],
      updatedAt: new Date().toISOString(),
    };
    
    const newEmbed: CustomEmbed = {
      ...embed,
      id: crypto.randomUUID(),
      movieId: tmdbId,
      addedAt: new Date().toISOString(),
    };
    
    movie.embeds.push(newEmbed);
    adminStorage.save(movie);
  },

  removeEmbed: (tmdbId: number, type: "movie" | "tv", embedId: string): void => {
    const movie = adminStorage.get(tmdbId, type);
    if (movie) {
      movie.embeds = movie.embeds.filter((e) => e.id !== embedId);
      adminStorage.save(movie);
    }
  },

  getFeatured: (): AdminMovie[] => {
    return adminStorage.getAll().filter((m) => m.featured);
  },

  getHidden: (): number[] => {
    return adminStorage.getAll().filter((m) => m.hidden).map((m) => m.tmdbId);
  },
};

// Simple admin authentication (for demo - in production use proper auth)
export const adminAuth = {
  isAuthenticated: (): boolean => {
    return localStorage.getItem(ADMIN_AUTH_KEY) === "authenticated";
  },

  login: (password: string): boolean => {
    // Default password: admin123 (change in production)
    if (password === "admin123") {
      localStorage.setItem(ADMIN_AUTH_KEY, "authenticated");
      return true;
    }
    return false;
  },

  logout: (): void => {
    localStorage.removeItem(ADMIN_AUTH_KEY);
  },
};

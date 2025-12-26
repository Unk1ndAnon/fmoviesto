import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface LocalUser {
  id: string;
  email: string;
  createdAt: string;
}

interface AuthContextType {
  user: LocalUser | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AUTH_STORAGE_KEY = "fmovies_auth";
const USERS_STORAGE_KEY = "fmovies_users";

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

// Simple hash function for password (not secure for production, but works for localStorage demo)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuth) {
      try {
        const parsedUser = JSON.parse(storedAuth) as LocalUser;
        setUser(parsedUser);
      } catch (e) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const getUsers = (): StoredUser[] => {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored) as StoredUser[];
    } catch {
      return [];
    }
  };

  const saveUsers = (users: StoredUser[]) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  };

  const signUp = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const users = getUsers();
    
    // Check if user already exists
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { error: new Error("User with this email already exists") };
    }

    const newUser: StoredUser = {
      id: generateId(),
      email: email.toLowerCase(),
      passwordHash: simpleHash(password),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);

    // Auto login after signup
    const localUser: LocalUser = {
      id: newUser.id,
      email: newUser.email,
      createdAt: newUser.createdAt,
    };
    
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(localUser));
    setUser(localUser);

    return { error: null };
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const users = getUsers();
    const foundUser = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === simpleHash(password)
    );

    if (!foundUser) {
      return { error: new Error("Invalid email or password") };
    }

    const localUser: LocalUser = {
      id: foundUser.id,
      email: foundUser.email,
      createdAt: foundUser.createdAt,
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(localUser));
    setUser(localUser);

    return { error: null };
  };

  const signOut = async () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

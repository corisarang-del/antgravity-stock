import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AuthProvider = "google" | "kakao";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: AuthProvider, redirectPath?: string) => Promise<{ error: Error | null }>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  signInWithOAuth: async () => ({ error: null }),
});

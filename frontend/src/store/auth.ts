import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TokenPair, UserOut } from "@/types";

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: UserOut | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserOut | null;
  hydrated: boolean;
  setSession: (tokens: TokenPair) => void;
  setUser: (user: UserOut) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hydrated: true,
      setSession: (tokens) =>
        set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token, user: tokens.user }),
      setUser: (user) => set({ user }),
      clearSession: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: "tikesho.sessions",
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user }),
      version: 1,
    },
  ),
);

export function useIsAuthenticated(): boolean {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  return Boolean(accessToken && user);
}
import { create } from "zustand";

export type AuthUser = {
  id: string;
  name?: string | null;
  role?: string | null;
};

type AuthState = {
  isLoggedIn: boolean;
  user: AuthUser | null;
  token?: string | null;

  login: () => void;
  logout: () => void;
  setToken: (t: string | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: true,
  user: { id: "demo", name: "Andreas", role: "admin" },
  token: null,

  setToken: (t) => set({ token: t }),

  login: () =>
    set({
      isLoggedIn: true,
      user: { id: "demo", name: "Andreas", role: "admin" },
    }),

  logout: () =>
    set({
      isLoggedIn: false,
      user: null,
      token: null,
    }),
}));

export default useAuthStore;
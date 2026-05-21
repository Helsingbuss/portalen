import { create } from "zustand";

type AuthUser = {
  email: string;
  name?: string;
  role?: string;
};

export type AuthState = {
  isLoggedIn: boolean;
  email: string | null;
  user: AuthUser | null;
  login: (email?: string, password?: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  email: null,
  user: null,

  login: async (email = "demo@helsingbuss.se", _password = "") => {
    set({
      isLoggedIn: true,
      email,
      user: {
        email,
        name: "Helsingbuss Admin",
        role: "admin",
      },
    });
  },

  loginDemo: async () => {
    set({
      isLoggedIn: true,
      email: "demo@helsingbuss.se",
      user: {
        email: "demo@helsingbuss.se",
        name: "Helsingbuss Demo",
        role: "admin",
      },
    });
  },

  logout: () => {
    set({
      isLoggedIn: false,
      email: null,
      user: null,
    });
  },
}));

export default useAuthStore;

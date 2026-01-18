import { create } from "zustand";
export type ThemeMode = "dark" | "light";
type ThemeState = { mode: ThemeMode; setMode: (m: ThemeMode) => void; toggle: () => void; };
export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "dark",
  setMode: (m) => set({ mode: m }),
  toggle: () => set({ mode: get().mode === "dark" ? "light" : "dark" }),
}));
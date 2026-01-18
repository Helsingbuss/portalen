import { useThemeStore } from "../store/theme";
import { DarkTheme, LightTheme } from "./colors";
export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  return mode === "light" ? LightTheme : DarkTheme;
}
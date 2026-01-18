export type Theme = {
  bg: string; header: string; tabBg: string; tabBorder: string;
  text: string; muted: string; card: string; cardBorder: string; accent: string;
};

export const DarkTheme: Theme = {
  bg: "#0F1722",
  header: "#1D2937",
  tabBg: "#0F1722",
  tabBorder: "rgba(255,255,255,0.10)",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.65)",
  card: "rgba(255,255,255,0.06)",
  cardBorder: "rgba(255,255,255,0.10)",
  accent: "#1A545F",
};

# LJUS – samma “glass”/soft som din bild
export const LightTheme: Theme = {
  bg: "#EEF1F6",
  header: "#2A3348",
  tabBg: "rgba(255,255,255,0.72)",
  tabBorder: "rgba(0,0,0,0.10)",
  text: "#0E1522",
  muted: "rgba(14,21,34,0.55)",
  card: "rgba(255,255,255,0.68)",
  cardBorder: "rgba(255,255,255,0.55)",
  accent: "#3B6FD6",
};
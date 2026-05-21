export type Theme = {
  bg: string;
  header: string;
  tabBg: string;
  tabBorder: string;
  text: string;
  muted: string;
  card: string;
  cardBorder: string;
  accent: string;
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

export const LightTheme: Theme = {
  bg: "#F4F7FA",
  header: "#FFFFFF",
  tabBg: "#FFFFFF",
  tabBorder: "rgba(15,23,34,0.08)",
  text: "#0F1722",
  muted: "rgba(15,23,34,0.65)",
  card: "rgba(255,255,255,0.75)",
  cardBorder: "rgba(15,23,34,0.08)",
  accent: "#1A545F",
};

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ||
  "http://192.168.0.10:3000";

export function apiUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

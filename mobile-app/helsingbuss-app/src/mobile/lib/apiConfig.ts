import Constants from "expo-constants";

function getLanBase(): string {
  const env = process.env.EXPO_PUBLIC_API_BASE;
  if (env && env.startsWith("http")) return env.replace(/\/$/, "");

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri ? hostUri.split(":")[0] : null;

  return `http://${host ?? "192.168.0.10"}:3000`;
}

export const API_BASE = getLanBase();

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    ...(init ?? {}),
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text}`);
  return text ? (JSON.parse(text) as T) : ({} as T);
}
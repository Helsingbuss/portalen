export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://192.168.0.10:3000";

export function joinUrl(path: string) {
  if (!path.startsWith("/")) path = "/" + path;
  return `${API_BASE_URL}${path}`;
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000); // 20s

  try {
    const res = await fetch(joinUrl(path), {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${text || res.statusText}`);
    }
    return (await res.json()) as T;
  } catch (e: any) {
    const msg =
      e?.name === "AbortError"
        ? "Network request timed out (mobilen når inte portalen)."
        : e?.message ?? "Network request failed";
    throw new Error(msg);
  } finally {
    clearTimeout(timeout);
  }
}

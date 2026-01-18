const BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${txt || "Request failed"}`);
  }
  return res.json();
}

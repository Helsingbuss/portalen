const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

type RequestOptions = RequestInit & {
  token?: string | null;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined)
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error(`API-fel: ${response.status}`);
  }

  return response.json();
}

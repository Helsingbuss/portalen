export async function apiGet<T = any>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`API GET failed: ${res.status}`);
  }

  return res.json();
}

export async function apiPost<T = any>(url: string, body?: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`API POST failed: ${res.status}`);
  }

  return res.json();
}

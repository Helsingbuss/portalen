import { supabase } from "../lib/supabase";

export type DriverNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  in_app_title?: string | null;
  in_app_body?: string | null;
  priority?: "low" | "normal" | "high" | "urgent" | string | null;
  target_route?: string | null;
  action_label?: string | null;
  secondary_action_label?: string | null;
  read_at?: string | null;
  created_at?: string | null;
  data?: Record<string, any> | null;
};

function getApiBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (!value) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL saknas.");
  }

  return value.replace(/\/$/, "");
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;

  return data.user;
}

async function getAuthToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

export async function listDriverNotifications() {
  const user = await getCurrentUser();
  const email = String(user?.email || "").trim().toLowerCase();

  if (!email) {
    throw new Error("Kunde inte hitta inloggad förares e-post.");
  }

  const token = await getAuthToken();
  const baseUrl = getApiBaseUrl();

  const res = await fetch(
    `${baseUrl}/api/driver/notifications?driverEmail=${encodeURIComponent(email)}&limit=50`,
    {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "Kunde inte hämta notiser.");
  }

  return (json.notifications || []) as DriverNotification[];
}

export async function markDriverNotificationRead(id: string) {
  const token = await getAuthToken();
  const baseUrl = getApiBaseUrl();

  const res = await fetch(`${baseUrl}/api/driver/notifications/read`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ id }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "Kunde inte markera notisen som läst.");
  }

  return json.notification as DriverNotification;
}

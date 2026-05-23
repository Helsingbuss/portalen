import { supabase } from "../lib/supabase";

export async function inviteUserAndAssignRole(input: {
  email: string;
  role: string;
  displayName: string;
  phone: string;
  notes: string;
  sendInvite?: boolean;
}) {
  const apiBaseUrl =
    process.env.EXPO_PUBLIC_PORTAL_API_URL ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    "";

  if (!apiBaseUrl) {
    throw new Error(
      "Saknar EXPO_PUBLIC_PORTAL_API_URL. Lägg in portalens API-adress i mobilappens .env."
    );
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new Error("Du är inte inloggad.");
  }

  const response = await fetch(`${apiBaseUrl}/api/admin/invite-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({
      email: input.email,
      role: input.role,
      displayName: input.displayName,
      phone: input.phone,
      notes: input.notes,
      sendInvite: input.sendInvite ?? true,
    }),
  });

  const raw = await response.json().catch(() => null);

  if (!response.ok || !raw?.ok) {
    throw new Error(raw?.error || "Kunde inte bjuda in användaren.");
  }

  return raw;
}

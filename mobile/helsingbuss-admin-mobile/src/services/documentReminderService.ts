import { supabase } from "../lib/supabase";

function getApiBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (!value) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL saknas. Exempel: http://192.168.10.114:3000");
  }

  return value.replace(/\/$/, "");
}

export async function sendDocumentReminderViaPortal(documentId: string, to?: string) {
  if (!documentId) {
    throw new Error("Dokument-ID saknas.");
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Du är inte inloggad.");
  }

  const response = await fetch(`${getApiBaseUrl()}/api/admin/documents/send-reminder`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      documentId,
      to: to || "",
    }),
  });

  const json = await response.json();

  if (!response.ok || !json?.ok) {
    throw new Error(json?.error || "Kunde inte skicka dokumentpåminnelsen.");
  }

  return json as {
    ok: true;
    emailId: string;
    documentId: string;
    sentTo: string;
    reminderCount: number;
  };
}

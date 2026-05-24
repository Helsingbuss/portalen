import { supabase } from "../lib/supabase";

function getApiBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (!value) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL saknas. Exempel: https://login.helsingbuss.se");
  }

  return value.replace(/\/$/, "");
}

export async function sendInvoiceReminderViaPortal(invoiceId: string) {
  if (!invoiceId) {
    throw new Error("Fakturan måste sparas innan påminnelse kan skickas.");
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Du är inte inloggad.");
  }

  const response = await fetch(`${getApiBaseUrl()}/api/admin/invoices/remind`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      invoiceId,
    }),
  });

  const json = await response.json();

  if (!response.ok || !json?.ok) {
    throw new Error(json?.error || "Kunde inte skicka fakturapåminnelsen.");
  }

  return json as {
    ok: true;
    emailId: string;
    invoiceId: string;
    sentTo: string;
    reminderCount: number;
  };
}

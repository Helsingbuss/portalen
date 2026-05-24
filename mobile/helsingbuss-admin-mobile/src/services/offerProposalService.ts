import { supabase } from "../lib/supabase";

function getApiBaseUrl() {
  const envUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_PORTAL_API_URL ||
    process.env.EXPO_PUBLIC_PORTAL_URL ||
    "https://login.helsingbuss.se";

  console.log("[OFFER_SEND] ENV EXPO_PUBLIC_API_BASE_URL:", process.env.EXPO_PUBLIC_API_BASE_URL);
  console.log("[OFFER_SEND] ENV EXPO_PUBLIC_PORTAL_API_URL:", process.env.EXPO_PUBLIC_PORTAL_API_URL);
  console.log("[OFFER_SEND] ENV EXPO_PUBLIC_PORTAL_URL:", process.env.EXPO_PUBLIC_PORTAL_URL);

  const clean = String(envUrl || "").trim().replace(/\/$/, "");

  if (!clean) {
    throw new Error(
      "API-adress saknas. Lägg EXPO_PUBLIC_API_BASE_URL i mobilappens .env."
    );
  }

  return clean;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 45000
) {
  const controller = new AbortController();
  const startedAt = Date.now();

  const timeout = setTimeout(() => {
    console.log("[OFFER_SEND] TIMEOUT efter", timeoutMs, "ms");
    controller.abort();
  }, timeoutMs);

  try {
    console.log("[OFFER_SEND] Fetch start:", url);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    console.log("[OFFER_SEND] Fetch klar på", Date.now() - startedAt, "ms");
    console.log("[OFFER_SEND] HTTP status:", response.status);

    return response;
  } catch (error: any) {
    console.log("[OFFER_SEND] Fetch error name:", error?.name);
    console.log("[OFFER_SEND] Fetch error message:", error?.message);
    console.log("[OFFER_SEND] Fetch error full:", error);

    if (error?.name === "AbortError") {
      throw new Error(
        `Timeout: Portalens API svarade inte inom ${Math.round(timeoutMs / 1000)} sekunder. URL: ${url}`
      );
    }

    throw new Error(
      `Network error: Kunde inte nå portalens API. URL: ${url}. Fel: ${error?.message || String(error)}`
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendOfferProposalViaPortal(offerId: string) {
  console.log("========== OFFER_SEND DEBUG START ==========");

  if (!offerId) {
    console.log("[OFFER_SEND] Saknar offerId");
    throw new Error("Offert-ID saknas.");
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/admin/offers/send-proposal`;

  console.log("[OFFER_SEND] offerId:", offerId);
  console.log("[OFFER_SEND] baseUrl:", baseUrl);
  console.log("[OFFER_SEND] url:", url);

  const { data, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.log("[OFFER_SEND] sessionError:", sessionError.message);
  }

  const token = data.session?.access_token;

  console.log("[OFFER_SEND] token finns:", Boolean(token));
  console.log("[OFFER_SEND] token längd:", token ? token.length : 0);

  if (!token) {
    throw new Error("Du är inte inloggad. Logga in igen och försök skicka offerten.");
  }

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        offerId,
      }),
    },
    45000
  );

  const text = await response.text();

  console.log("[OFFER_SEND] response text:", text);

  let json: any = {};

  try {
    json = text ? JSON.parse(text) : {};
  } catch (parseError: any) {
    console.log("[OFFER_SEND] JSON parse error:", parseError?.message);
    json = { raw: text };
  }

  console.log("[OFFER_SEND] response json:", json);
  console.log("========== OFFER_SEND DEBUG END ==========");

  if (!response.ok || !json?.ok) {
    throw new Error(
      json?.error ||
        json?.message ||
        json?.raw ||
        `Portalen kunde inte skicka offerten. Status ${response.status}. URL: ${url}`
    );
  }

  return json as {
    ok: true;
    emailId: string;
    offerId: string;
    sentTo: string;
    reference: string;
  };
}

import { supabase } from "../lib/supabase";
import type { StoreOverview, StorePaymentItem } from "../types/store";

const fallbackOverview: StoreOverview = {
  todaySales: 0,
  pendingPayments: 0,
  reservedItems: 0,
  paidToday: 0,
  products: [
    {
      id: "shuttle",
      title: "Flygbussbiljett",
      subtitle: "Skapa eller reservera biljett till Airport Shuttle.",
      type: "shuttle_ticket",
      priceFrom: 129,
      available: 48,
      status: "Tillgänglig",
    },
    {
      id: "trip",
      title: "Sundra resa",
      subtitle: "Reservera plats på dagsresa, event eller paketresa.",
      type: "trip_ticket",
      priceFrom: 299,
      available: 32,
      status: "Tillgänglig",
    },
    {
      id: "booking",
      title: "Bokning/offert",
      subtitle: "Skapa betalningslänk kopplad till bokning eller offert.",
      type: "booking",
      priceFrom: 0,
      available: 0,
      status: "Manuell",
    },
    {
      id: "custom",
      title: "Annan betalning",
      subtitle: "Skicka valfri betalningslänk till kund.",
      type: "custom",
      priceFrom: 0,
      available: 0,
      status: "Manuell",
    },
  ],
  recentPayments: [],
};

function getApiBaseUrl() {
  return process.env.EXPO_PUBLIC_API_BASE_URL || "";
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL saknas i mobilappens .env.local.");
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  console.log("API REQUEST:", `${baseUrl}${path}`, token ? "TOKEN OK" : "TOKEN SAKNAS");

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(json?.error || json?.message || `API-fel ${response.status}`);
  }

  return json as T;
}

export async function getStoreOverview(): Promise<StoreOverview> {
  try {
    return await apiRequest<StoreOverview>("/api/admin/store/overview");
  } catch (error) {
    console.log("Store overview fallback:", error);
    return fallbackOverview;
  }
}

export async function createAndSendPaymentLink(payload: {
  amount: number;
  title: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  reference?: string;
  message?: string;
}) {
  return apiRequest<{
    ok: boolean;
    paymentUrl: string;
    paymentId?: string;
    reference?: string;
    sumupDryrun?: boolean;
    sms?: {
      sent?: boolean;
      dryrun?: boolean;
      localDryrun?: boolean;
      error?: string;
    };
  }>("/api/admin/store/create-and-send-link", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendSmsViaPortal(payload: {
  to: string;
  message: string;
  customerName?: string;
  sourceType?: string;
  sourceId?: string;
}) {
  return apiRequest<{
    ok: boolean;
    dryrun?: boolean;
    smsLogId?: string;
    providerMessageId?: string;
    providerStatus?: string;
    parts?: number;
    estimatedCost?: number;
  }>("/api/admin/sms/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function getFallbackStoreOverview() {
  return fallbackOverview;
}

export function statusLabel(status: StorePaymentItem["status"]) {
  if (status === "reserved") return "Reserverad";
  if (status === "pending") return "Väntar betalning";
  if (status === "paid") return "Betald";
  if (status === "cancelled") return "Avbruten";
  if (status === "refunded") return "Återbetald";
  return status || "Okänd";
}

export const createPaymentLink = createAndSendPaymentLink;


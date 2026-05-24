import { supabase } from "../lib/supabase";

export type DriverScanStatus =
  | "idle"
  | "approved"
  | "already_used"
  | "invalid"
  | "not_paid"
  | "wrong_departure";

export type DriverScanResult = {
  ok: boolean;
  status: DriverScanStatus;
  title: string;
  message: string;
  bookingNumber?: string | null;
  passengerName?: string | null;
  tripTitle?: string | null;
  departureDate?: string | null;
  departureTime?: string | null;
  seatNumbers?: string[];
  passengerCount?: number | null;
  firstScannedAt?: string | null;
};

function getApiBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (!value) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL saknas.");
  }

  return value.replace(/\/$/, "");
}

async function getAuthToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

export async function scanDriverTicket(qrData: string, expectedDepartureId?: string | null) {
  const token = await getAuthToken();
  const baseUrl = getApiBaseUrl();

  const response = await fetch(`${baseUrl}/api/driver/scanner/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      qrData,
      expectedDepartureId: expectedDepartureId || null,
    }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || json?.error || "Kunde inte kontrollera biljetten.");
  }

  return json as DriverScanResult;
}

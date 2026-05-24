import { supabase } from "../lib/supabase";

export type PortalBusPriceProfile = {
  id: string;
  category: string;
  busType: string;
  segment: string;
  baseFee: number;
  hourWeekdayDay: number;
  hourWeekdayEvening: number;
  hourWeekend: number;
  km025: number;
  km26100: number;
  km101250: number;
  km251Plus: number;
  updatedAt: string;
};

function toNumber(value: any) {
  const clean = String(value ?? "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  const number = Number(clean || 0);

  return Number.isFinite(number) ? number : 0;
}

export async function getPortalBusPriceProfiles(): Promise<PortalBusPriceProfile[]> {
  const { data, error } = await supabase.rpc("admin_get_portal_price_rules");

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte hämta prisprofiler.");
  }

  const profiles = Array.isArray(raw.profiles)
    ? raw.profiles
    : Array.isArray(raw.rules)
      ? raw.rules
      : [];

  return profiles.map((row: any) => ({
    id: String(row.id || ""),
    category: String(row.category || ""),
    busType: String(row.busType || row.bus_type || ""),
    segment: String(row.segment || ""),
    baseFee: toNumber(row.baseFee ?? row.base_fee ?? row.base_price),
    hourWeekdayDay: toNumber(row.hourWeekdayDay ?? row.hour_weekday_day ?? row.hour_price_day),
    hourWeekdayEvening: toNumber(row.hourWeekdayEvening ?? row.hour_weekday_evening ?? row.hour_price_evening),
    hourWeekend: toNumber(row.hourWeekend ?? row.hour_weekend ?? row.hour_price_weekend),
    km025: toNumber(row.km025 ?? row.km_0_25 ?? row.km_price_0_25),
    km26100: toNumber(row.km26100 ?? row.km_26_100 ?? row.km_price_26_100),
    km101250: toNumber(row.km101250 ?? row.km_101_250 ?? row.km_price_101_250),
    km251Plus: toNumber(row.km251Plus ?? row.km_251_plus ?? row.km_price_251_plus),
    updatedAt: String(row.updatedAt || row.updated_at || ""),
  }));
}

export function getKmPriceForDistance(profile: PortalBusPriceProfile | null, km: number) {
  if (!profile) return 0;

  if (km <= 25) return profile.km025;
  if (km <= 100) return profile.km26100;
  if (km <= 250) return profile.km101250;

  return profile.km251Plus;
}

export function getHourPriceForMode(
  profile: PortalBusPriceProfile | null,
  mode: "day" | "evening" | "weekend"
) {
  if (!profile) return 0;

  if (mode === "evening") return profile.hourWeekdayEvening;
  if (mode === "weekend") return profile.hourWeekend;

  return profile.hourWeekdayDay;
}

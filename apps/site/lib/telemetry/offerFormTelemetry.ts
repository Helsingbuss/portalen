type TelemetryEvent =
  | { type: "view"; step: number }
  | { type: "next"; stepFrom: number; stepTo: number }
  | { type: "back"; stepFrom: number; stepTo: number }
  | { type: "submit_click" }
  | { type: "submit_ok"; offerNo: string }
  | { type: "submit_error"; message: string; code?: string };

export async function trackOfferFormEvent(evt: TelemetryEvent) {
  try {
    // snabb lokal räknare (så du kan se “hur många tryckte” även om api strular)
    const key = "hb_offerform_events_count";
    const current = Number(localStorage.getItem(key) || "0");
    localStorage.setItem(key, String(current + 1));

    // server-logg (icke-blockerande)
    const body = JSON.stringify({ evt, ts: new Date().toISOString() });
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/offer-request?telemetry=1", blob);
      return;
    }
    await fetch("/api/offer-request?telemetry=1", { method: "POST", headers: { "content-type": "application/json" }, body });
  } catch {
    // tyst (telemetri får aldrig krascha formuläret)
  }
}

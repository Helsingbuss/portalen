import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { fetchOverview, type OverviewDTO } from "@/mobile/api/dashboard";

const BG = "#1D2937";
const CARD = "rgba(255,255,255,0.06)";
const BORDER = "rgba(255,255,255,0.08)";
const ACCENT = "#1A545F";

function kr(n: number) {
  return `${Math.round(Number(n || 0)).toLocaleString("sv-SE")} kr`;
}

export default function OverviewTab() {
  const [data, setData] = useState<OverviewDTO | null>(null);
  const [err, setErr] = useState<string>("");

  async function load() {
    setErr("");
    try {
      const dto = await fetchOverview();
      setData(dto);
    } catch (e: any) {
      setErr(e?.message ?? "Network request failed");
      setData(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totals = data?.totals ?? {
    offers_answered_kr: 0,
    offers_approved_kr: 0,
    bookings_kr: 0,
    completed_kr: 0,
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ color: "white", fontSize: 34, fontWeight: "800" }}>Översikt</Text>
      <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 6 }}>2026-01-01  2026-12-31</Text>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
        <View style={{ flex: 1, backgroundColor: CARD, borderColor: BORDER, borderWidth: 1, borderRadius: 18, padding: 14 }}>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "700" }}>Offerter (besvarade)</Text>
          <Text style={{ color: "white", fontSize: 26, fontWeight: "900", marginTop: 6 }}>{kr(totals.offers_answered_kr)}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: CARD, borderColor: BORDER, borderWidth: 1, borderRadius: 18, padding: 14 }}>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "700" }}>Godkända</Text>
          <Text style={{ color: "white", fontSize: 26, fontWeight: "900", marginTop: 6 }}>{kr(totals.offers_approved_kr)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <View style={{ flex: 1, backgroundColor: CARD, borderColor: BORDER, borderWidth: 1, borderRadius: 18, padding: 14 }}>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "700" }}>Bokningar</Text>
          <Text style={{ color: "white", fontSize: 26, fontWeight: "900", marginTop: 6 }}>{kr(totals.bookings_kr)}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: CARD, borderColor: BORDER, borderWidth: 1, borderRadius: 18, padding: 14 }}>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "700" }}>Genomförda</Text>
          <Text style={{ color: "white", fontSize: 26, fontWeight: "900", marginTop: 6 }}>{kr(totals.completed_kr)}</Text>
        </View>
      </View>

      <Text style={{ color: "white", fontSize: 28, fontWeight: "900", marginTop: 18 }}>Inkomna offerter</Text>

      <View style={{ marginTop: 10, backgroundColor: CARD, borderColor: BORDER, borderWidth: 1, borderRadius: 22, padding: 14 }}>
        {!data && (
          <>
            <Text style={{ color: "rgba(255,255,255,0.6)" }}>
              {err ? "Kunde inte hämta data." : "Laddar..."}
            </Text>
            {err ? <Text style={{ color: "#ff6b6b", marginTop: 8 }}>{err}</Text> : null}

            <Pressable onPress={load} style={{ marginTop: 12, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 }}>
              <Text style={{ color: "white", fontWeight: "800" }}>Uppdatera</Text>
            </Pressable>
          </>
        )}

        {data && data.incoming_offers.length === 0 && (
          <>
            <Text style={{ color: "rgba(255,255,255,0.75)" }}>Inga offerter har kommit in än.</Text>
            <Pressable onPress={load} style={{ marginTop: 12, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 }}>
              <Text style={{ color: "white", fontWeight: "800" }}>Uppdatera</Text>
            </Pressable>
          </>
        )}

        {data && data.incoming_offers.map((o) => (
          <View key={o.id} style={{ marginTop: 10, backgroundColor: "rgba(0,0,0,0.18)", borderColor: BORDER, borderWidth: 1, borderRadius: 18, padding: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>{o.offer_number}</Text>
              <View style={{ backgroundColor: ACCENT, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
                <Text style={{ color: "white", fontWeight: "900" }}>NY</Text>
              </View>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 6 }}>
              {o.from}  →  {o.to}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
              {o.departure_date ?? ""}  {o.departure_time ?? ""}  •  {o.passengers ?? "-"} pax
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}


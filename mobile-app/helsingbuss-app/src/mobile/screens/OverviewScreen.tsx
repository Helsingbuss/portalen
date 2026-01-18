import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useAuthStore } from "../store/auth";
import { fetchOverview, type OverviewDTO } from "../api/dashboard";

const BG = "#1D2937";
const CARD = "rgba(255,255,255,0.06)";
const STROKE = "rgba(255,255,255,0.08)";
const MUTED = "rgba(255,255,255,0.70)";
const WHITE = "#FFFFFF";

function formatKr(n?: number | null) {
  const value = Number(n || 0);
  return value.toLocaleString("sv-SE", { maximumFractionDigits: 0 }) + " kr";
}

export default function OverviewScreen() {
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((s) => s.logout);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<OverviewDTO | null>(null);

  const year = 2026; // <- vi kör 2026 nu (sen kan vi göra dropdown)

  const load = async () => {
    try {
      setErr(null);
      setLoading(true);
      const dto = await fetchOverview(year);
      setData(dto);
    } catch (e: any) {
      setErr(e?.message ?? "Något gick fel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onLogout = () => {
    logout();
    // Viktigt: byt route så du inte stannar kvar i tabs
    router.replace("/(auth)");
  };

  const totals = data?.totals;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{
        paddingTop: insets.top + 14, // <- mer luft så klockan aldrig krockar
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ color: WHITE, fontSize: 40, fontWeight: "800", letterSpacing: -0.5 }}>Översikt</Text>
          <Text style={{ color: MUTED, marginTop: 6, fontSize: 14 }}>
            {year}-01-01  {year}-12-31
          </Text>
        </View>

        <Pressable
          onPress={onLogout}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 16,
            backgroundColor: "rgba(255,0,0,0.10)",
            borderWidth: 1,
            borderColor: "rgba(255,0,0,0.22)",
          }}
        >
          <Text style={{ color: "#FF6B6B", fontWeight: "800" }}>Logga ut</Text>
        </Pressable>
      </View>

      {/* Stat cards */}
      <View style={{ marginTop: 18, flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: STROKE }}>
          <Text style={{ color: MUTED, fontSize: 14, fontWeight: "700" }}>Offerter (besvarade)</Text>
          <Text style={{ color: WHITE, fontSize: 28, fontWeight: "900", marginTop: 10 }}>
            {formatKr(totals?.offers_answered_kr)}
          </Text>
        </View>
        <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: STROKE }}>
          <Text style={{ color: MUTED, fontSize: 14, fontWeight: "700" }}>Godkända</Text>
          <Text style={{ color: WHITE, fontSize: 28, fontWeight: "900", marginTop: 10 }}>
            {formatKr(totals?.offers_approved_kr)}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 12, flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: STROKE }}>
          <Text style={{ color: MUTED, fontSize: 14, fontWeight: "700" }}>Bokningar</Text>
          <Text style={{ color: WHITE, fontSize: 28, fontWeight: "900", marginTop: 10 }}>
            {formatKr(totals?.bookings_kr)}
          </Text>
        </View>
        <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: STROKE }}>
          <Text style={{ color: MUTED, fontSize: 14, fontWeight: "700" }}>Genomförda</Text>
          <Text style={{ color: WHITE, fontSize: 28, fontWeight: "900", marginTop: 10 }}>
            {formatKr(totals?.completed_kr)}
          </Text>
        </View>
      </View>

      {/* Incoming offers */}
      <View style={{ marginTop: 20 }}>
        <Text style={{ color: WHITE, fontSize: 30, fontWeight: "900", letterSpacing: -0.3 }}>Inkomna offerter</Text>

        <View style={{ marginTop: 12, backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: STROKE }}>
          {loading ? (
            <View style={{ paddingVertical: 8 }}>
              <ActivityIndicator />
              <Text style={{ color: MUTED, marginTop: 10 }}>Hämtar…</Text>
            </View>
          ) : err ? (
            <Text style={{ color: "#FF6B6B", fontWeight: "700" }}>{err}</Text>
          ) : (data?.incoming_offers?.length ?? 0) === 0 ? (
            <Text style={{ color: MUTED }}>Inga offerter har kommit in än.</Text>
          ) : (
            <Text style={{ color: WHITE, fontWeight: "700" }}>
              {data?.incoming_offers?.length} st inkomna offerter
            </Text>
          )}

          <Pressable
            onPress={load}
            style={{
              marginTop: 14,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: STROKE,
              alignItems: "center",
            }}
          >
            <Text style={{ color: WHITE, fontWeight: "900", fontSize: 16 }}>Uppdatera</Text>
          </Pressable>
        </View>
      </View>

      {/* News */}
      <View style={{ marginTop: 18, backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: STROKE }}>
        <Text style={{ color: WHITE, fontSize: 26, fontWeight: "900" }}>God dag, Andreas!</Text>
        <Text style={{ color: MUTED, marginTop: 6 }}>Här bjuder vi på lite nyheter och roligheter.</Text>

        <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: STROKE, paddingTop: 14 }}>
          {[
            "Nya betalningsvillkor för privatpersoner",
            "Ny hemsida lanserad",
            "Nya resor ligger ute på hemsidan",
            "Välkommen till Helsingbuss Portal",
          ].map((t) => (
            <View key={t} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: STROKE }}>
              <Text style={{ color: WHITE, fontWeight: "800", fontSize: 16 }}>{t}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={{
            marginTop: 14,
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: STROKE,
            alignItems: "center",
          }}
        >
          <Text style={{ color: WHITE, fontWeight: "900", fontSize: 16 }}>Visa alla nyheter</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

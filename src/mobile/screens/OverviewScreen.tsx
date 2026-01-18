import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { fetchOverview, type OverviewDTO } from "@/mobile/api/dashboard";
import { useAuthStore } from "@/mobile/store/auth";
import ProfileMenu from "@/mobile/components/ProfileMenu";

const BG = "#1D2937";
const CARD = "rgba(255,255,255,0.06)";

function formatKr(v: any) {
  const n = Number(String(v).replace(",", "."));
  if (!isFinite(n)) return "0 kr";
  return `${Math.round(n).toLocaleString("sv-SE")} kr`;
}

export default function OverviewScreen() {
  const user = useAuthStore((s) => s.user);
  const [dto, setDto] = useState<OverviewDTO | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  async function load() {
    setErr(null);
    try {
      const d = await fetchOverview();
      setDto(d);
    } catch (e: any) {
      setErr(e?.message ?? "Network error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => dto?.totals ?? null, [dto]);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ProfileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 54, paddingBottom: 20 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ color: "white", fontSize: 38, fontWeight: "900" }}>Översikt</Text>

          {/* Profilbild (tryck för meny) */}
          <Pressable
            onPress={() => setMenuOpen(true)}
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.10)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.16)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>
              {(user?.name ?? "A").slice(0, 1).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        <Text style={{ color: "rgba(255,255,255,0.65)", marginBottom: 12 }}>
          2026-01-01  2026-12-31
        </Text>

        {/* Cards */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "700" }}>Offerter (besvarade)</Text>
            <Text style={{ color: "white", fontSize: 26, fontWeight: "900", marginTop: 6 }}>
              {formatKr(totals?.offers_answered_kr)}
            </Text>
          </View>

          <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "700" }}>Godkända</Text>
            <Text style={{ color: "white", fontSize: 26, fontWeight: "900", marginTop: 6 }}>
              {formatKr(totals?.offers_approved_kr)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "700" }}>Bokningar</Text>
            <Text style={{ color: "white", fontSize: 26, fontWeight: "900", marginTop: 6 }}>
              {formatKr(totals?.bookings_kr)}
            </Text>
          </View>

          <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "700" }}>Genomförda</Text>
            <Text style={{ color: "white", fontSize: 26, fontWeight: "900", marginTop: 6 }}>
              {formatKr(totals?.completed_kr)}
            </Text>
          </View>
        </View>

        {/* Incoming */}
        <Text style={{ color: "white", fontSize: 30, fontWeight: "900", marginTop: 18, marginBottom: 8 }}>
          Inkomna offerter
        </Text>

        <View style={{ backgroundColor: CARD, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          {!err && (dto?.incoming_offers?.length ?? 0) === 0 && (
            <Text style={{ color: "rgba(255,255,255,0.7)" }}>Inga offerter har kommit in än.</Text>
          )}

          {!!err && <Text style={{ color: "#ff6b6b", fontWeight: "700" }}>{err}</Text>}

          <Pressable
            onPress={load}
            style={{
              marginTop: 12,
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "800" }}>Uppdatera</Text>
          </Pressable>
        </View>

        {/* News */}
        <Text style={{ color: "white", fontSize: 30, fontWeight: "900", marginTop: 18, marginBottom: 8 }}>
          God dag, Andreas!
        </Text>

        <View style={{ backgroundColor: CARD, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: "rgba(255,255,255,0.7)", marginBottom: 10 }}>
            Här bjuder vi på lite nyheter och roligheter.
          </Text>
          {[
            "Nya betalningsvillkor för privatpersoner",
            "Ny hemsida lanserad",
            "Nya resor ligger ute på hemsidan",
            "Välkommen till Helsingbuss Portal",
          ].map((t) => (
            <View key={t} style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
              <Text style={{ color: "white", fontSize: 16, fontWeight: "800" }}>{t}</Text>
            </View>
          ))}

          <Pressable
            style={{
              marginTop: 10,
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "800" }}>Visa alla nyheter</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
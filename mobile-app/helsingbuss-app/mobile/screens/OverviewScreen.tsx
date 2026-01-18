import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useAuthStore } from "@/mobile/store/auth";
import { fetchOverview } from "@/mobile/api/offers";
import type { Offer } from "@/mobile/types/offers";
import { router } from "expo-router";

const BG = "#1D2937";
const CARD = "rgba(255,255,255,0.06)";
const BORDER = "rgba(255,255,255,0.10)";
const ACCENT = "#1A545F";

const formatKr = (n: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);

function MoneyCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

export default function OverviewScreen() {
  const logout = useAuthStore((s) => s.logout);

  const [incoming, setIncoming] = useState<Offer[]>([]);
  const [totals, setTotals] = useState({
    offers_answered_kr: 0,
    offers_approved_kr: 0,
    bookings_kr: 0,
    completed_kr: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const d = await fetchOverview();
      setTotals(d.totals);
      setIncoming(d.incoming_offers ?? []);
    } catch (e: any) {
      setIncoming([]);
      setTotals({ offers_answered_kr: 0, offers_approved_kr: 0, bookings_kr: 0, completed_kr: 0 });
      setError(e?.message ?? "Fel vid hämtning");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>Översikt</Text>
            <Text style={styles.range}>2026-01-01  2026-12-31</Text>
          </View>

          <Pressable onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logga ut</Text>
          </Pressable>
        </View>

        <View style={styles.kpiGrid}>
          <MoneyCard title="Offerter (besvarade)" value={loading ? "…" : formatKr(totals.offers_answered_kr)} />
          <MoneyCard title="Godkända" value={loading ? "…" : formatKr(totals.offers_approved_kr)} />
          <MoneyCard title="Bokningar" value={loading ? "…" : formatKr(totals.bookings_kr)} />
          <MoneyCard title="Genomförda" value={loading ? "…" : formatKr(totals.completed_kr)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inkomna offerter</Text>
          <View style={styles.panel}>
            {loading ? <Text style={styles.dim}>Hämtar…</Text> : null}

            {!loading && incoming.length === 0 ? (
              <Text style={styles.dim}>Inga offerter har kommit in än.</Text>
            ) : (
              incoming.map((o) => (
                <Pressable
                  key={o.id}
                  onPress={() => router.push(`/offer/${o.id}`)}
                  style={styles.offerRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offerNo}>{o.offer_number}</Text>
                    <Text style={styles.offerSub}>{o.from}  {o.to}</Text>
                    <Text style={styles.offerMeta}>
                      {(o.departure_date ?? "-")}  {(o.departure_time ?? "--:--")}   {(o.passengers ?? 0)} pax
                    </Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>NY</Text>
                  </View>
                </Pressable>
              ))
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {!loading ? (
              <Pressable onPress={load} style={styles.refreshBtn}>
                <Text style={styles.refreshText}>Uppdatera</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* NYHETER (Tillbaka) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>God dag, Andreas!</Text>
          <View style={styles.panel}>
            <Text style={styles.dim}>Här bjuder vi på lite nyheter och roligheter.</Text>

            <View style={styles.newsRow}><Text style={styles.newsTitle}>Nya betalningsvillkor för privatpersoner</Text></View>
            <View style={styles.newsRow}><Text style={styles.newsTitle}>Ny hemsida lanserad</Text></View>
            <View style={styles.newsRow}><Text style={styles.newsTitle}>Nya resor ligger ute på hemsidan</Text></View>
            <View style={styles.newsRow}><Text style={styles.newsTitle}>Välkommen till Helsingbuss Portal</Text></View>

            <Pressable style={styles.newsBtn}>
              <Text style={styles.newsBtnText}>Visa alla nyheter</Text>
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { paddingTop: 54, paddingHorizontal: 16, paddingBottom: 120 },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  h1: { color: "white", fontSize: 34, fontWeight: "900" },
  range: { color: "rgba(255,255,255,0.55)", marginTop: 4 },

  logoutBtn: {
    backgroundColor: "rgba(255,80,80,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,80,80,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  logoutText: { color: "#ff6b6b", fontWeight: "900" },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  kpiCard: {
    width: "48%",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 14,
  },
  kpiTitle: { color: "rgba(255,255,255,0.75)", fontWeight: "800" },
  kpiValue: { color: "white", fontSize: 22, fontWeight: "900", marginTop: 8 },

  section: { marginTop: 16 },
  sectionTitle: { color: "white", fontSize: 22, fontWeight: "900", marginBottom: 10 },
  panel: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 24,
    padding: 14,
  },

  offerRow: {
    backgroundColor: "rgba(0,0,0,0.12)",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  offerNo: { color: "white", fontSize: 18, fontWeight: "900" },
  offerSub: { color: "rgba(255,255,255,0.80)", marginTop: 4 },
  offerMeta: { color: "rgba(255,255,255,0.60)", marginTop: 2 },

  badge: { backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { color: "white", fontWeight: "900" },

  refreshBtn: { marginTop: 10, alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 12 },
  refreshText: { color: "rgba(255,255,255,0.85)", fontWeight: "900" },

  newsRow: {
    marginTop: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  newsTitle: { color: "rgba(255,255,255,0.92)", fontWeight: "800" },

  newsBtn: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  newsBtnText: { color: "rgba(255,255,255,0.92)", fontWeight: "900" },

  dim: { color: "rgba(255,255,255,0.65)" },
  error: { color: "#ff7b7b", marginTop: 8, fontSize: 12 },
});
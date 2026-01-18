import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, StyleSheet, ActivityIndicator } from "react-native";
import type { OfferRow } from "../types/dashboard";
import { fetchAllOffers } from "../api/dashboard";
import { BG, CARD, CARD_BORDER, TEXT, MUTED, radius } from "../lib/ui";

function kr(v: any) {
  const n = Number(String(v ?? 0).replace(",", "."));
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(isNaN(n) ? 0 : n);
}

export default function OffersScreen() {
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const list = await fetchAllOffers(ac.signal);
        setRows(list);
      } catch (e: any) {
        setErr(e?.message ?? "Network error");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      <Text style={styles.h1}>Offerter</Text>
      <Text style={styles.sub}>Alla offerter (senaste först)</Text>

      {loading && <View style={{ marginTop: 14 }}><ActivityIndicator /></View>}
      {!loading && err && <Text style={{ color: "#ffb4b4", marginTop: 12 }}>{err}</Text>}

      {(rows ?? []).map((o) => (
        <View key={o.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.no}>{o.offer_number}</Text>
            <Text style={styles.meta}>{o.from}  •  {o.to}</Text>
            <Text style={styles.meta}>{o.departure_date ?? ""}  {o.departure_time ?? ""}  •  {o.passengers ?? ""} pax</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.price}>{kr(o.total_price)}</Text>
            <Text style={styles.status}>{String(o.status ?? "").toUpperCase()}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { color: TEXT, fontSize: 34, fontWeight: "800" },
  sub: { color: MUTED, marginTop: 6, fontSize: 14 },
  row: { marginTop: 12, backgroundColor: CARD, borderRadius: radius, borderWidth: 1, borderColor: CARD_BORDER, padding: 14, flexDirection: "row", gap: 12 },
  no: { color: TEXT, fontSize: 18, fontWeight: "900" },
  meta: { color: MUTED, marginTop: 4, fontSize: 13 },
  price: { color: TEXT, fontSize: 16, fontWeight: "900" },
  status: { color: MUTED, marginTop: 6, fontSize: 12, fontWeight: "800" },
});

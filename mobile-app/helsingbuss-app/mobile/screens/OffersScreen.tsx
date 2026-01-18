import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { fetchOffers } from "@/mobile/api/offers";
import type { Offer } from "@/mobile/types/offers";
import { OfferListItem } from "@/mobile/components/offers/OfferListItem";
import { router } from "expo-router";

const BG = "#1D2937";
const CARD = "rgba(255,255,255,0.06)";
const BORDER = "rgba(255,255,255,0.10)";

export default function OffersScreen() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const data = await fetchOffers();
      setOffers(data ?? []);
    } catch (e: any) {
      setOffers([]);
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
        <View style={styles.headerRow}>
          <Text style={styles.h1}>Offerter</Text>
          <Pressable onPress={load} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>Uppdatera</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          {loading ? <Text style={styles.dim}>Hämtar…</Text> : null}
          {!loading && offers.length === 0 ? <Text style={styles.dim}>Inga offerter.</Text> : null}

          {offers.map((o) => (
            <OfferListItem key={o.id} offer={o} onPress={() => router.push(`/offer/${o.id}`)} />
          ))}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { paddingTop: 54, paddingHorizontal: 16, paddingBottom: 120 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  h1: { color: "white", fontSize: 30, fontWeight: "900" },

  panel: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 24, padding: 14 },

  smallBtn: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  smallBtnText: { color: "rgba(255,255,255,0.9)", fontWeight: "900" },

  dim: { color: "rgba(255,255,255,0.65)" },
  error: { color: "#ff7b7b", marginTop: 8, fontSize: 12 },
});

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/mobile/store/auth";
import { router } from "expo-router";

import { fetchDashboardSummary, fetchIncomingOffers, fetchNews } from "@/mobile/api/dashboard";
import type { DashboardSummary, Offer, NewsItem } from "@/mobile/types/dashboard";

import { KpiGrid } from "@/mobile/components/dashboard/KpiGrid";
import { IncomingOffersList } from "@/mobile/components/dashboard/IncomingOffersList";
import { NewsPanel } from "@/mobile/components/dashboard/NewsPanel";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    (async () => {
      const [s, o, n] = await Promise.all([
        fetchDashboardSummary(),
        fetchIncomingOffers(),
        fetchNews(),
      ]);
      setSummary(s);
      setOffers(o);
      setNews(n);
    })();
  }, []);

  const doLogout = () => {
    logout();
    router.replace("/(auth)/login");
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: Math.max(insets.bottom, 16),
        paddingHorizontal: 16,
        gap: 14,
      }}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.h1}>Översikt</Text>
          <Text style={styles.sub}>
            {summary?.periodLabel ?? "Laddar period…"}
          </Text>
        </View>

        <Pressable onPress={doLogout} style={styles.logout}>
          <Text style={styles.logoutText}>Logga ut</Text>
        </Pressable>
      </View>

      {summary ? (
        <KpiGrid summary={summary} />
      ) : (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Laddar översikt…</Text>
        </View>
      )}

      <IncomingOffersList
        offers={offers}
        onPressOffer={(o) => {
          // Sen: router.push(`/offers/${o.id}`)
          // Nu: placeholder
        }}
      />

      <NewsPanel name={user?.name ?? "Andreas"} news={news} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#1D2937" },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  h1: { color: "white", fontSize: 24, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.70)", marginTop: 4 },

  logout: {
    backgroundColor: "rgba(255,107,107,0.18)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  logoutText: { color: "#ff6b6b", fontWeight: "900" },

  loadingCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    padding: 16,
  },
  loadingText: { color: "rgba(255,255,255,0.7)", fontWeight: "700" },
});

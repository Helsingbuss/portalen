import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, } from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  FileText,
  Route,
  WalletCards,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { ActiveOfferItem, ActiveOffersOverview } from "../../types/activeOffers";
import {
  formatActiveOfferDate,
  formatActiveOfferMoney,
  getActiveOfferStatusLabel,
  getActiveOffers,
  getFallbackActiveOffers,
} from "../../services/activeOffersService";

export default function ActiveOffersScreen() {
  const [data, setData] = useState<ActiveOffersOverview>(getFallbackActiveOffers());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getActiveOffers();
      setData(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Aktiva offerter</Text>
            <Text style={styles.subtitle}>Ej arkiverade offerter</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <FileText size={38} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>OFFERTER</Text>
          <Text style={styles.heroTitle}>Aktiva offerter som kräver uppföljning.</Text>
          <Text style={styles.heroText}>
            Arkiverade offerter syns inte här, men deras belopp räknas fortfarande i rapporter och ekonomi.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar aktiva offerter...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            title="Aktiva"
            value={String(data.summary.total)}
            text="Ej arkiverade"
            icon={<FileText size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Aktivt värde"
            value={formatActiveOfferMoney(data.summary.value)}
            text="Synligt i aktiva listan"
            icon={<WalletCards size={22} color={colors.primary} />}
          />
        </View>

        <Pressable
          style={styles.archiveLinkButton}
          onPress={() => router.push("/admin/offer-archive" as any)}
        >
          <Text style={styles.archiveLinkButtonText}>Öppna offertarkiv</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Aktiva offerter</Text>

        <View style={styles.list}>
          {data.offers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Inga aktiva offerter</Text>
              <Text style={styles.emptyText}>
                När nya offerter skapas och inte är arkiverade visas de här.
              </Text>
            </View>
          ) : (
            data.offers.map((offer) => (
              <ActiveOfferCard key={offer.id} offer={offer} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function MetricCard({
  title,
  value,
  text,
  icon,
}: {
  title: string;
  value: string;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricText}>{text}</Text>
    </View>
  );
}

function ActiveOfferCard({ offer }: { offer: ActiveOfferItem }) {
  return (
    <Pressable
      style={styles.offerCard}
      onPress={() =>
        router.push({
          pathname: "/admin/offer-calculator",
          params: { id: offer.id },
        } as any)
      }
    >
      <View style={styles.offerIcon}>
        <BriefcaseBusiness size={22} color={colors.primary} strokeWidth={2.4} />
      </View>

      <View style={styles.offerContent}>
        <View style={styles.offerTop}>
          <View style={styles.offerTitleBox}>
            <Text style={styles.offerTitle}>{offer.destination || "Offert"}</Text>
            <Text style={styles.offerRef}>{offer.reference}</Text>
          </View>

          <Text style={styles.offerAmount}>{formatActiveOfferMoney(offer.amount)}</Text>
        </View>

        <Text style={styles.offerCustomer}>
          {offer.customerName || offer.customerEmail || offer.customerPhone || "Kund saknas"}
        </Text>

        <View style={styles.routeBox}>
          <Route size={15} color={colors.textMuted} strokeWidth={2.4} />
          <Text style={styles.routeText}>
            {offer.departure || "Start saknas"} → {offer.destination || "Destination saknas"}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{getActiveOfferStatusLabel(offer.status || "")}</Text>
          </View>

          {offer.travelDate ? (
            <View style={styles.datePill}>
              <CalendarClock size={13} color={colors.primary} strokeWidth={2.4} />
              <Text style={styles.dateText}>{formatActiveOfferDate(offer.travelDate)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 110 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 25, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 },

  heroCard: { backgroundColor: colors.primary, borderRadius: 26, padding: 20, marginBottom: 14 },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 24, lineHeight: 30, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 7 },

  loadingBox: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: "800", marginLeft: 10 },

  grid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  metricCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: "900" },
  metricTitle: { color: colors.text, fontSize: 12, fontWeight: "900", marginTop: 4 },
  metricText: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 3 },

  archiveLinkButton: {
    backgroundColor: colors.gold,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 18,
  },
  archiveLinkButtonText: {
    color: colors.primaryDeep,
    fontSize: 14,
    fontWeight: "900",
  },

  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },
  list: { gap: 10 },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  emptyText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 5 },

  offerCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
  },
  offerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  offerContent: { flex: 1 },
  offerTop: { flexDirection: "row", alignItems: "flex-start" },
  offerTitleBox: { flex: 1 },
  offerTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  offerRef: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800", marginTop: 2 },
  offerAmount: { color: colors.primary, fontSize: 13, fontWeight: "900", marginLeft: 8 },
  offerCustomer: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 6 },

  routeBox: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  routeText: { color: colors.textMuted, fontSize: 11.5, fontWeight: "800", marginLeft: 6, flex: 1 },

  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 9 },
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  pillText: { color: colors.primary, fontSize: 10.5, fontWeight: "900" },
  datePill: {
    backgroundColor: colors.cardSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: { color: colors.primary, fontSize: 10.5, fontWeight: "900", marginLeft: 4 },
});






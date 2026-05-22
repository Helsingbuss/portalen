import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MailCheck,
  Plus,
  Route,
  XCircle,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  formatAgentOfferDate,
  formatAgentOfferMoney,
  getAgentOfferStatusLabel,
  getAgentOffersOverview,
  type AgentOfferItem,
  type AgentOffersOverview,
} from "../../services/agentOffersService";

type FilterKey = "incoming" | "answered" | "accepted" | "declined" | "all";

const emptyData: AgentOffersOverview = {
  summary: {
    total: 0,
    incoming: 0,
    answered: 0,
    accepted: 0,
    declined: 0,
  },
  offers: [],
};

export default function AgentOffersScreen() {
  const [data, setData] = useState<AgentOffersOverview>(emptyData);
  const [filter, setFilter] = useState<FilterKey>("incoming");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getAgentOffersOverview();
      setData(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const rows = useMemo(() => {
    if (filter === "incoming") return data.offers.filter((item) => isIncoming(item.status));
    if (filter === "answered") return data.offers.filter((item) => isAnswered(item.status));
    if (filter === "accepted") return data.offers.filter((item) => isAccepted(item.status));
    if (filter === "declined") return data.offers.filter((item) => isDeclined(item.status));

    return data.offers;
  }, [data.offers, filter]);

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
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Offerter</Text>
            <Text style={styles.subtitle}>Alla inkomna och aktiva offerter</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <FileText size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>AGENT OFFERTER</Text>
          <Text style={styles.heroTitle}>Hantera förfrågningar och prisförslag.</Text>
          <Text style={styles.heroText}>
            Här ser agenten alla offerter som finns i systemet och kan följa inkomna, besvarade och godkända ärenden.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar offerter...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            title="Inkomna"
            value={String(data.summary.incoming)}
            icon={<Clock3 size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Besvarade"
            value={String(data.summary.answered)}
            icon={<MailCheck size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Godkända"
            value={String(data.summary.accepted)}
            icon={<CheckCircle2 size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Totalt"
            value={String(data.summary.total)}
            icon={<FileText size={22} color={colors.primary} />}
          />
        </View>

        <Pressable style={styles.primaryButton}>
          <Plus size={20} color={colors.white} strokeWidth={2.5} />
          <Text style={styles.primaryButtonText}>Skapa ny offert</Text>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <FilterButton label="Inkomna" active={filter === "incoming"} onPress={() => setFilter("incoming")} />
          <FilterButton label="Besvarade" active={filter === "answered"} onPress={() => setFilter("answered")} />
          <FilterButton label="Godkända" active={filter === "accepted"} onPress={() => setFilter("accepted")} />
          <FilterButton label="Avböjda" active={filter === "declined"} onPress={() => setFilter("declined")} />
          <FilterButton label="Alla" active={filter === "all"} onPress={() => setFilter("all")} />
        </ScrollView>

        <Text style={styles.sectionTitle}>{getSectionTitle(filter)} ({rows.length})</Text>

        <View style={styles.list}>
          {rows.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Inga offerter hittades</Text>
              <Text style={styles.emptyText}>
                Kontrollera att offerterna har status inkommen, eller välj filtret Alla.
              </Text>
            </View>
          ) : (
            rows.map((offer) => <OfferCard key={offer.id || offer.reference} offer={offer} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function normalizeStatus(status?: string) {
  return String(status || "").toLowerCase().trim();
}

function isIncoming(status?: string) {
  return ["", "inkommen", "ny", "new", "incoming", "draft"].includes(normalizeStatus(status));
}

function isAnswered(status?: string) {
  return ["besvarad", "answered", "sent", "proposal_sent", "calculated", "ready_to_send"].includes(normalizeStatus(status));
}

function isAccepted(status?: string) {
  return ["godkänd", "godkand", "accepted", "bokad", "booked", "confirmed", "bekräftad", "bekraftad"].includes(normalizeStatus(status));
}

function isDeclined(status?: string) {
  return ["avböjd", "avbojd", "declined", "rejected", "lost"].includes(normalizeStatus(status));
}

function getSectionTitle(filter: FilterKey) {
  if (filter === "incoming") return "Inkomna offerter";
  if (filter === "answered") return "Besvarade offerter";
  if (filter === "accepted") return "Godkända offerter";
  if (filter === "declined") return "Avböjda offerter";
  return "Alla offerter";
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  );
}

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function OfferCard({ offer }: { offer: AgentOfferItem }) {
  const declined = isDeclined(offer.status);

  return (
    <Pressable
      style={[styles.offerCard, declined && styles.offerCardDeclined]}
      onPress={() =>
        router.push({
          pathname: "/agent/offer-detail",
          params: { id: offer.id },
        } as any)
      }
    >
      <View style={styles.offerIcon}>
        {declined ? (
          <XCircle size={22} color="#B42318" strokeWidth={2.4} />
        ) : (
          <FileText size={22} color={colors.primary} strokeWidth={2.4} />
        )}
      </View>

      <View style={styles.offerContent}>
        <View style={styles.offerTop}>
          <View style={styles.offerTitleBox}>
            <Text style={styles.offerTitle}>
              {offer.destination || "Offert utan destination"}
            </Text>
            <Text style={styles.offerRef}>{offer.reference || offer.id}</Text>
          </View>

          <Text style={styles.offerAmount}>{formatAgentOfferMoney(offer.amount)}</Text>
        </View>

        <Text style={styles.offerCustomer}>
          {offer.customerName || offer.customerEmail || offer.customerPhone || "Kund saknas"}
        </Text>

        <View style={styles.routeRow}>
          <Route size={15} color={colors.textMuted} strokeWidth={2.4} />
          <Text style={styles.routeText}>
            {offer.departure || "Start saknas"} → {offer.destination || "Destination saknas"}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{getAgentOfferStatusLabel(offer.status)}</Text>
          </View>

          {offer.travelDate ? (
            <View style={styles.datePill}>
              <CalendarDays size={13} color={colors.primary} strokeWidth={2.4} />
              <Text style={styles.dateText}>{formatAgentOfferDate(offer.travelDate)}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.openHint}>Nästa steg: öppna offert, chatta och ge prisförslag</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 110 },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backButton: {
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
  title: { color: colors.text, fontSize: 25, fontWeight: "900" },
  subtitle: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 20,
    marginBottom: 14,
  },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginTop: 12, marginBottom: 5 },
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

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  metricCard: {
    width: "48.5%",
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
    marginBottom: 9,
  },
  metricValue: { color: colors.text, fontSize: 20, fontWeight: "900" },
  metricTitle: { color: colors.text, fontSize: 12, fontWeight: "900", marginTop: 3 },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 14,
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 8 },

  tabsScroll: { gap: 8, paddingBottom: 14 },
  tab: {
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  tabTextActive: { color: colors.white },

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
  offerCardDeclined: { borderColor: "#F3C2C2" },
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

  routeRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  routeText: { color: colors.textMuted, fontSize: 11.5, fontWeight: "700", marginLeft: 6, flex: 1 },

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
  dateText: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800", marginLeft: 4 },
  openHint: { color: colors.textMuted, fontSize: 10.5, fontWeight: "700", marginTop: 8 },
});

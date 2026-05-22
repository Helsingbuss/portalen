import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, } from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Plane,
  RefreshCcw,
  ShoppingBag,
  Ticket,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { ReportTicketItem, ReportTicketsOverview } from "../../types/reportTickets";
import {
  formatTicketDate,
  formatTicketMoney,
  getFallbackReportTickets,
  getReportTickets,
  getTicketCategoryLabel,
  getTicketStatusLabel,
} from "../../services/reportTicketsService";

type FilterKey = "all" | "paid" | "pending" | "reserved";

export default function ReportTicketsScreen() {
  const [data, setData] = useState<ReportTicketsOverview>(getFallbackReportTickets());
  const [filter, setFilter] = useState<FilterKey>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getReportTickets();
      setData(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const filteredTickets = useMemo(() => {
    if (filter === "all") return data.recentTickets;

    return data.recentTickets.filter((item) => {
      const status = String(item.status || "").toLowerCase();
      return status === filter;
    });
  }, [data.recentTickets, filter]);

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
            <Text style={styles.title}>Sålda biljetter</Text>
            <Text style={styles.subtitle}>Flygbuss, Sundra och kassa</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ticket size={36} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>BILJETTRAPPORT</Text>
          <Text style={styles.heroTitle}>Följ försäljning och reservationer.</Text>
          <Text style={styles.heroText}>
            Här visas betalningslänkar, biljetter och reservationer från kassan.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar sålda biljetter...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            title="Idag"
            value={String(data.totals.today)}
            text={formatTicketMoney(data.totals.salesToday)}
            icon={<CalendarDays size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Denna vecka"
            value={String(data.totals.week)}
            text={formatTicketMoney(data.totals.salesWeek)}
            icon={<ShoppingBag size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Denna månad"
            value={String(data.totals.month)}
            text={formatTicketMoney(data.totals.salesMonth)}
            icon={<CreditCard size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Betalda"
            value={String(data.totals.paid)}
            text="Slutförda"
            icon={<CheckCircle2 size={22} color={colors.primary} />}
          />
        </View>

        <Text style={styles.sectionTitle}>Fördelning</Text>

        <View style={styles.card}>
          <CategoryRow
            icon={<Plane size={20} color={colors.primary} />}
            title="Flygbuss"
            value={data.categories.shuttle}
          />

          <CategoryRow
            icon={<Ticket size={20} color={colors.primary} />}
            title="Sundra resor"
            value={data.categories.trips}
          />

          <CategoryRow
            icon={<ShoppingBag size={20} color={colors.primary} />}
            title="Övrigt/kassa"
            value={data.categories.other}
            noBorder
          />
        </View>

        <Text style={styles.sectionTitle}>Status</Text>

        <View style={styles.statusGrid}>
          <StatusBox label="Väntar" value={data.totals.pending} />
          <StatusBox label="Reserverade" value={data.totals.reserved} />
          <StatusBox label="Återbetalda" value={data.totals.refunded} />
        </View>

        <Text style={styles.sectionTitle}>Senaste biljetter</Text>

        <View style={styles.tabs}>
          <FilterButton label="Alla" active={filter === "all"} onPress={() => setFilter("all")} />
          <FilterButton label="Betalda" active={filter === "paid"} onPress={() => setFilter("paid")} />
          <FilterButton label="Väntar" active={filter === "pending"} onPress={() => setFilter("pending")} />
          <FilterButton label="Reserverade" active={filter === "reserved"} onPress={() => setFilter("reserved")} />
        </View>

        <View style={styles.ticketList}>
          {filteredTickets.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Inga biljetter hittades</Text>
              <Text style={styles.emptyText}>
                När biljetter, betalningslänkar eller reservationer skapas i kassan visas de här.
              </Text>
            </View>
          ) : (
            filteredTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
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

function CategoryRow({
  icon,
  title,
  value,
  noBorder,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  noBorder?: boolean;
}) {
  return (
    <View style={[styles.categoryRow, noBorder && styles.noBorder]}>
      <View style={styles.categoryIcon}>{icon}</View>
      <Text style={styles.categoryTitle}>{title}</Text>
      <View style={styles.categoryPill}>
        <Text style={styles.categoryValue}>{value}</Text>
      </View>
    </View>
  );
}

function StatusBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statusBox}>
      <Clock size={20} color={colors.primary} />
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusLabel}>{label}</Text>
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

function TicketCard({ ticket }: { ticket: ReportTicketItem }) {
  const status = getTicketStatusLabel(ticket.status);
  const category = getTicketCategoryLabel(ticket.category);

  function openPayment() {
    if (ticket.paymentUrl) {
      Linking.openURL(ticket.paymentUrl);
    }
  }

  return (
    <Pressable style={styles.ticketCard} onPress={openPayment}>
      <View style={styles.ticketIcon}>
        <Ticket size={22} color={colors.primary} strokeWidth={2.4} />
      </View>

      <View style={styles.ticketContent}>
        <View style={styles.ticketTop}>
          <View style={styles.ticketTitleBox}>
            <Text style={styles.ticketTitle}>{ticket.title}</Text>
            <Text style={styles.ticketRef}>{ticket.reference}</Text>
          </View>

          <Text style={styles.ticketAmount}>{formatTicketMoney(ticket.amount)}</Text>
        </View>

        <Text style={styles.ticketCustomer}>
          {ticket.customerName || ticket.customerEmail || ticket.customerPhone || "Kund saknas"}
        </Text>

        <View style={styles.ticketBottom}>
          <View style={styles.smallPill}>
            <Text style={styles.smallPillText}>{category}</Text>
          </View>

          <View style={styles.smallPill}>
            <Text style={styles.smallPillText}>{status}</Text>
          </View>

          {ticket.createdAt ? (
            <Text style={styles.ticketDate}>{formatTicketDate(ticket.createdAt)}</Text>
          ) : null}

          {ticket.paymentUrl ? (
            <RefreshCcw size={14} color={colors.primary} />
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
  title: { color: colors.text, fontSize: 24, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 },
  heroCard: { backgroundColor: colors.primary, borderRadius: 26, padding: 20, marginBottom: 14 },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
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
    marginBottom: 10,
  },
  metricValue: { color: colors.text, fontSize: 22, fontWeight: "900" },
  metricTitle: { color: colors.text, fontSize: 12, fontWeight: "900", marginTop: 4 },
  metricText: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 3 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  categoryRow: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  categoryTitle: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "900" },
  categoryPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  categoryValue: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  noBorder: { borderBottomWidth: 0 },
  statusGrid: { flexDirection: "row", gap: 10, marginBottom: 18 },
  statusBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    alignItems: "center",
  },
  statusValue: { color: colors.text, fontSize: 22, fontWeight: "900", marginTop: 6 },
  statusLabel: { color: colors.textMuted, fontSize: 10.5, fontWeight: "900", marginTop: 2 },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 5,
    marginBottom: 14,
  },
  tab: { flex: 1, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 10.5, fontWeight: "900" },
  tabTextActive: { color: colors.white },
  ticketList: { gap: 10 },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  emptyText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 5 },
  ticketCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
  },
  ticketIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  ticketContent: { flex: 1 },
  ticketTop: { flexDirection: "row", alignItems: "flex-start" },
  ticketTitleBox: { flex: 1 },
  ticketTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  ticketRef: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800", marginTop: 2 },
  ticketAmount: { color: colors.primary, fontSize: 13, fontWeight: "900", marginLeft: 8 },
  ticketCustomer: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 6 },
  ticketBottom: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 9 },
  smallPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  smallPillText: { color: colors.primary, fontSize: 10.5, fontWeight: "900" },
  ticketDate: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800" },
});

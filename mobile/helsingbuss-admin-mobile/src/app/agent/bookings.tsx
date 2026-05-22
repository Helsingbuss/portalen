import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, } from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  Bus,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Route,
  UsersRound,
  XCircle,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  formatAgentBookingDate,
  formatAgentBookingMoney,
  getAgentBookingStatusLabel,
  getAgentBookingsOverview,
  type AgentBookingItem,
  type AgentBookingsOverview,
} from "../../services/agentBookingsService";

type FilterKey = "upcoming" | "confirmed" | "completed" | "cancelled" | "all";

const emptyData: AgentBookingsOverview = {
  summary: {
    total: 0,
    upcoming: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  },
  bookings: [],
};

export default function AgentBookingsScreen() {
  const [data, setData] = useState<AgentBookingsOverview>(emptyData);
  const [filter, setFilter] = useState<FilterKey>("upcoming");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getAgentBookingsOverview();
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
    if (filter === "upcoming") return data.bookings.filter((item) => isUpcoming(item.departureDate));
    if (filter === "confirmed") return data.bookings.filter((item) => isConfirmed(item.status));
    if (filter === "completed") return data.bookings.filter((item) => isCompleted(item.status));
    if (filter === "cancelled") return data.bookings.filter((item) => isCancelled(item.status));

    return data.bookings;
  }, [data.bookings, filter]);

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
            <Text style={styles.title}>Bokningar</Text>
            <Text style={styles.subtitle}>Alla bokningar för agentöversikten</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <CalendarDays size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>AGENT BOKNINGAR</Text>
          <Text style={styles.heroTitle}>Se bokningar och kommande resor.</Text>
          <Text style={styles.heroText}>
            Här ser agenten bokningar från systemet och kan följa kommande, bekräftade och avbokade resor.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar bokningar...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            title="Kommande"
            value={String(data.summary.upcoming)}
            icon={<Clock3 size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Bekräftade"
            value={String(data.summary.confirmed)}
            icon={<CheckCircle2 size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Avbokade"
            value={String(data.summary.cancelled)}
            icon={<XCircle size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Totalt"
            value={String(data.summary.total)}
            icon={<FileText size={22} color={colors.primary} />}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <FilterButton label="Kommande" active={filter === "upcoming"} onPress={() => setFilter("upcoming")} />
          <FilterButton label="Bekräftade" active={filter === "confirmed"} onPress={() => setFilter("confirmed")} />
          <FilterButton label="Slutförda" active={filter === "completed"} onPress={() => setFilter("completed")} />
          <FilterButton label="Avbokade" active={filter === "cancelled"} onPress={() => setFilter("cancelled")} />
          <FilterButton label="Alla" active={filter === "all"} onPress={() => setFilter("all")} />
        </ScrollView>

        <Text style={styles.sectionTitle}>{getSectionTitle(filter)} ({rows.length})</Text>

        <View style={styles.list}>
          {rows.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Inga bokningar hittades</Text>
              <Text style={styles.emptyText}>
                Välj filtret Alla om du vill se allt som finns i systemet.
              </Text>
            </View>
          ) : (
            rows.map((booking) => (
              <BookingCard key={booking.id || booking.reference} booking={booking} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function normalizeStatus(status?: string) {
  return String(status || "").toLowerCase().trim();
}

function isConfirmed(status?: string) {
  return ["bekräftad", "bekraftad", "confirmed", "bokad", "booked", "active"].includes(normalizeStatus(status));
}

function isCompleted(status?: string) {
  return ["slutförd", "slutford", "completed", "done", "finished"].includes(normalizeStatus(status));
}

function isCancelled(status?: string) {
  return ["avbokad", "cancelled", "canceled", "avbruten"].includes(normalizeStatus(status));
}

function isUpcoming(date?: string) {
  if (!date) return false;

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return parsed.getTime() >= today.getTime();
}

function getSectionTitle(filter: FilterKey) {
  if (filter === "upcoming") return "Kommande bokningar";
  if (filter === "confirmed") return "Bekräftade bokningar";
  if (filter === "completed") return "Slutförda bokningar";
  if (filter === "cancelled") return "Avbokade bokningar";
  return "Alla bokningar";
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

function BookingCard({ booking }: { booking: AgentBookingItem }) {
  const cancelled = isCancelled(booking.status);

  return (
    <Pressable
      style={[styles.bookingCard, cancelled && styles.bookingCardCancelled]}
      onPress={() =>
        router.push({
          pathname: "/agent/booking-detail",
          params: { id: booking.id },
        } as any)
      }
    >
      <View style={styles.bookingIcon}>
        {cancelled ? (
          <XCircle size={22} color="#B42318" strokeWidth={2.4} />
        ) : (
          <Bus size={22} color={colors.primary} strokeWidth={2.4} />
        )}
      </View>

      <View style={styles.bookingContent}>
        <View style={styles.bookingTop}>
          <View style={styles.bookingTitleBox}>
            <Text style={styles.bookingTitle}>{booking.reference || "Bokning"}</Text>
            <Text style={styles.bookingCustomer}>
              {booking.customerName || booking.customerEmail || booking.customerPhone || "Kund saknas"}
            </Text>
          </View>

          {booking.amount > 0 ? (
            <Text style={styles.bookingAmount}>{formatAgentBookingMoney(booking.amount)}</Text>
          ) : null}
        </View>

        <View style={styles.routeRow}>
          <Route size={15} color={colors.textMuted} strokeWidth={2.4} />
          <Text style={styles.routeText}>
            {booking.departure || "Start saknas"} → {booking.destination || "Destination saknas"}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{getAgentBookingStatusLabel(booking.status)}</Text>
          </View>

          {booking.departureDate ? (
            <View style={styles.datePill}>
              <CalendarDays size={13} color={colors.primary} strokeWidth={2.4} />
              <Text style={styles.dateText}>
                {formatAgentBookingDate(booking.departureDate)}
                {booking.departureTime ? ` ${booking.departureTime}` : ""}
              </Text>
            </View>
          ) : null}

          {booking.passengers > 0 ? (
            <View style={styles.datePill}>
              <UsersRound size={13} color={colors.primary} strokeWidth={2.4} />
              <Text style={styles.dateText}>{booking.passengers} resenärer</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.openHint}>Nästa steg: öppna bokning och se körning/livekarta</Text>
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

  bookingCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
  },
  bookingCardCancelled: { borderColor: "#F3C2C2" },
  bookingIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  bookingContent: { flex: 1 },
  bookingTop: { flexDirection: "row", alignItems: "flex-start" },
  bookingTitleBox: { flex: 1 },
  bookingTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  bookingCustomer: { color: colors.textMuted, fontSize: 11.5, fontWeight: "800", marginTop: 2 },
  bookingAmount: { color: colors.primary, fontSize: 13, fontWeight: "900", marginLeft: 8 },

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

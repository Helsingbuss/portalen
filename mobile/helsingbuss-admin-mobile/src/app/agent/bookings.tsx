import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  CalendarDays,
  CreditCard,
  Plane,
  RefreshCw,
  ShoppingBag,
  UsersRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  formatAgentBookingMoney,
  getAgentBookingsOverview,
  getPaymentStatusLabel,
  type AgentBookingListItem,
} from "../../services/agentBookingsService";

type FilterKey = "all" | "sundra" | "shuttle" | "unpaid" | "paid";

export default function AgentBookingsScreen() {
  const [bookings, setBookings] = useState<AgentBookingListItem[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadBookings = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getAgentBookingsOverview();
      setBookings(result);
    } catch (error: any) {
      Alert.alert("Kunde inte hämta bokningar", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings(false);
  }, [loadBookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const status = booking.paymentStatus.toLowerCase();

      if (filter === "sundra") return booking.type === "sundra";
      if (filter === "shuttle") return booking.type === "shuttle";
      if (filter === "paid") return status === "paid" || status === "betald";
      if (filter === "unpaid") return status !== "paid" && status !== "betald";

      return true;
    });
  }, [bookings, filter]);

  const stats = useMemo(() => {
    const paid = bookings.filter((item) => {
      const status = item.paymentStatus.toLowerCase();
      return status === "paid" || status === "betald";
    }).length;

    return {
      total: bookings.length,
      unpaid: bookings.length - paid,
      paid,
      value: bookings.reduce((sum, item) => sum + item.totalPrice, 0),
    };
  }, [bookings]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadBookings(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.heroCard}>
          <CalendarDays size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>AGENTAPPEN</Text>
          <Text style={styles.heroTitle}>Mina bokningar</Text>
          <Text style={styles.heroText}>
            Följ upp Sundra-bokningar, flygbussbiljetter, betalningsstatus och kunduppgifter.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard title="Totalt" value={String(stats.total)} />
          <StatCard title="Obetalda" value={String(stats.unpaid)} />
          <StatCard title="Värde" value={formatAgentBookingMoney(stats.value)} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <FilterButton title="Alla" active={filter === "all"} onPress={() => setFilter("all")} />
          <FilterButton title="Sundra" active={filter === "sundra"} onPress={() => setFilter("sundra")} />
          <FilterButton title="Flygbuss" active={filter === "shuttle"} onPress={() => setFilter("shuttle")} />
          <FilterButton title="Obetalda" active={filter === "unpaid"} onPress={() => setFilter("unpaid")} />
          <FilterButton title="Betalda" active={filter === "paid"} onPress={() => setFilter("paid")} />
        </ScrollView>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar bokningar...</Text>
          </View>
        ) : null}

        {!isLoading && filteredBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <RefreshCw size={30} color={colors.primary} />
            <Text style={styles.emptyTitle}>Inga bokningar hittades</Text>
            <Text style={styles.emptyText}>
              När agenten skapar Sundra- eller flygbussbokningar visas de här.
            </Text>
          </View>
        ) : null}

        {filteredBookings.map((booking) => (
          <Pressable
            key={`${booking.type}-${booking.id}`}
            style={styles.bookingCard}
            onPress={() =>
              router.push({
                pathname: "/agent/booking-detail",
                params: {
                  id: booking.id,
                  type: booking.type,
                },
              } as any)
            }
          >
            <View style={styles.bookingTop}>
              <View style={styles.bookingIcon}>
                {booking.type === "sundra" ? (
                  <ShoppingBag size={22} color={colors.primary} />
                ) : (
                  <Plane size={22} color={colors.primary} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.bookingTitle}>{booking.title}</Text>
                <Text style={styles.bookingText}>{booking.customerName || "Kund saknas"}</Text>
              </View>

              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{getPaymentStatusLabel(booking.paymentStatus)}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <CalendarDays size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {booking.travelDate || "Datum saknas"}
                {booking.travelTime ? ` · ${booking.travelTime}` : ""}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <UsersRound size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {booking.passengers} resenär(er)
                {booking.pickupPlace ? ` · ${booking.pickupPlace}` : ""}
              </Text>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.routeText}>{booking.routeText}</Text>
              <Text style={styles.priceText}>{formatAgentBookingMoney(booking.totalPrice)}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <CreditCard size={18} color={colors.primary} />
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function FilterButton({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.filterButton, active && styles.filterButtonActive]} onPress={onPress}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
  },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginTop: 12, marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 27, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 7 },

  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  statTitle: { color: colors.textMuted, fontSize: 11, fontWeight: "900", marginTop: 7 },
  statValue: { color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 2 },

  filterScroll: { marginBottom: 14 },
  filterButton: {
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
  },
  filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: "900" },
  filterTextActive: { color: colors.white },

  loadingCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: "800", marginLeft: 10 },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: "center",
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "900", marginTop: 10 },
  emptyText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 4, textAlign: "center" },

  bookingCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  bookingTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  bookingIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  bookingTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  bookingText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 3 },

  statusPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: { color: colors.primary, fontSize: 10.5, fontWeight: "900" },

  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  metaText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginLeft: 7 },

  footerRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 12,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  routeText: { flex: 1, color: colors.text, fontSize: 12, fontWeight: "800" },
  priceText: { color: colors.primary, fontSize: 14, fontWeight: "900" },
});

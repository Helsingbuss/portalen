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
  BusFront,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ClipboardList,
  Filter,
  MapPin,
  UsersRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  formatDriverDate,
  getDriverStatusLabel,
  getMyDriverOrders,
  isTodayDriverOrder,
  type DriverOrder,
  type DriverOrderStatus,
} from "../../services/driverOrdersService";

type FilterKey = "all" | "today" | "upcoming" | "request" | "confirmed";

export default function DriverTripsScreen() {
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadOrders = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getMyDriverOrders();
      setOrders(result);
    } catch (error: any) {
      Alert.alert("Kunde inte hämta körningar", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(false);
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filter === "today") return isTodayDriverOrder(order.travelDate);
      if (filter === "upcoming") return !isTodayDriverOrder(order.travelDate);
      if (filter === "request") return order.status === "request";
      if (filter === "confirmed") return order.status === "confirmed";
      return true;
    });
  }, [orders, filter]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      requests: orders.filter((order) => order.status === "request").length,
      confirmed: orders.filter((order) => order.status === "confirmed").length,
    };
  }, [orders]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadOrders(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.heroCard}>
          <ClipboardList size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>FÖRARAPP</Text>
          <Text style={styles.heroTitle}>Körningar</Text>
          <Text style={styles.heroText}>
            Se dina riktiga körorder, öppna detaljer och hantera förfrågningar.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard title="Totalt" value={String(stats.total)} />
          <StatCard title="Förfrågningar" value={String(stats.requests)} />
          <StatCard title="Bekräftade" value={String(stats.confirmed)} />
        </View>

        <View style={styles.filterTitleBox}>
          <Filter size={18} color={colors.primary} strokeWidth={2.5} />
          <Text style={styles.filterTitle}>Filtrera körningar</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <FilterButton title="Alla" active={filter === "all"} onPress={() => setFilter("all")} />
          <FilterButton title="Idag" active={filter === "today"} onPress={() => setFilter("today")} />
          <FilterButton title="Kommande" active={filter === "upcoming"} onPress={() => setFilter("upcoming")} />
          <FilterButton title="Förfrågan" active={filter === "request"} onPress={() => setFilter("request")} />
          <FilterButton title="Bekräftad" active={filter === "confirmed"} onPress={() => setFilter("confirmed")} />
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Resultat</Text>
          <Text style={styles.resultCount}>{filteredOrders.length} körningar</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar körningar...</Text>
          </View>
        ) : null}

        {!isLoading && filteredOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <CalendarDays size={30} color={colors.primary} />
            <Text style={styles.emptyTitle}>Inga körningar hittades</Text>
            <Text style={styles.emptyText}>Testa ett annat filter eller kontrollera att körorder är kopplade till dig.</Text>
          </View>
        ) : null}

        {filteredOrders.map((order) => (
          <OrderListCard key={order.id} order={order} />
        ))}
      </ScrollView>
    </View>
  );
}

function OrderListCard({ order }: { order: DriverOrder }) {
  return (
    <Pressable
      style={styles.tripCard}
      onPress={() =>
        router.push({
          pathname: "/driver/order-detail",
          params: { id: order.id },
        } as any)
      }
    >
      <View style={styles.tripTop}>
        <View style={styles.tripIcon}>
          <BusFront size={24} color={colors.primary} strokeWidth={2.5} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.tripTitle}>{order.title}</Text>
          <Text style={styles.tripCustomer}>Kund: {order.customerName || "-"}</Text>
        </View>

        <StatusPill status={order.status} />
      </View>

      <View style={styles.metaGrid}>
        <MetaItem icon="calendar" label="Datum" value={formatDriverDate(order.travelDate)} />
        <MetaItem icon="clock" label="Tid" value={`${order.startTime || "--:--"} – ${order.endTime || "--:--"}`} />
        <MetaItem icon="map" label="Rutt" value={`${order.pickupPlace || "-"} → ${order.destination || "-"}`} />
        <MetaItem icon="users" label="Resenärer" value={`${order.passengerCount} personer`} />
      </View>

      <View style={styles.footerRow}>
        <View style={styles.vehicleRow}>
          <BusFront size={16} color={colors.textMuted} strokeWidth={2.4} />
          <Text style={styles.vehicleText}>{order.vehicleLabel || "Fordon ej angivet"}</Text>
        </View>

        <View style={styles.openRow}>
          <Text style={styles.openText}>Öppna körorder</Text>
          <ChevronRight size={18} color={colors.primary} strokeWidth={2.5} />
        </View>
      </View>
    </Pressable>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

function FilterButton({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.filterButton, active && styles.filterButtonActive]} onPress={onPress}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{title}</Text>
    </Pressable>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: "calendar" | "clock" | "map" | "users";
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaItem}>
      <View style={styles.metaIcon}>
        {icon === "calendar" ? <CalendarDays size={16} color={colors.primary} /> : null}
        {icon === "clock" ? <Clock3 size={16} color={colors.primary} /> : null}
        {icon === "map" ? <MapPin size={16} color={colors.primary} /> : null}
        {icon === "users" ? <UsersRound size={16} color={colors.primary} /> : null}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
      </View>
    </View>
  );
}

function StatusPill({ status }: { status: DriverOrderStatus }) {
  const isConfirmed = status === "confirmed";
  const isRequest = status === "request";

  return (
    <View
      style={[
        styles.statusPill,
        isConfirmed && styles.statusConfirmed,
        isRequest && styles.statusRequest,
        status === "planned" && styles.statusPlanned,
        status === "started" && styles.statusStarted,
        status === "completed" && styles.statusCompleted,
      ]}
    >
      {isConfirmed ? <CheckCircle2 size={13} color="#1F7A4D" strokeWidth={2.5} /> : null}

      <Text
        style={[
          styles.statusText,
          isConfirmed && styles.statusTextConfirmed,
          isRequest && styles.statusTextRequest,
          status === "planned" && styles.statusTextPlanned,
          status === "started" && styles.statusTextStarted,
          status === "completed" && styles.statusTextCompleted,
        ]}
      >
        {getDriverStatusLabel(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },

  heroCard: { backgroundColor: colors.primary, borderRadius: 28, padding: 20, marginBottom: 14 },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginTop: 12, marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 28, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 7 },

  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
  },
  statValue: { color: colors.primary, fontSize: 22, fontWeight: "900" },
  statTitle: { color: colors.textMuted, fontSize: 10.5, fontWeight: "900", marginTop: 3 },

  filterTitleBox: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  filterTitle: { color: colors.text, fontSize: 14, fontWeight: "900", marginLeft: 7 },
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

  sectionRow: { marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  resultCount: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },

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
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "900", marginTop: 10 },
  emptyText: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18, fontWeight: "700", marginTop: 4, textAlign: "center" },

  tripCard: { backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  tripTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  tripIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tripTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  tripCustomer: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 3 },

  metaGrid: { gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  metaLabel: { color: colors.textMuted, fontSize: 10.5, fontWeight: "900" },
  metaValue: { color: colors.text, fontSize: 12.5, fontWeight: "800", marginTop: 1 },

  footerRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 12,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vehicleRow: { flexDirection: "row", alignItems: "center" },
  vehicleText: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginLeft: 5 },
  openRow: { flexDirection: "row", alignItems: "center" },
  openText: { color: colors.primary, fontSize: 12, fontWeight: "900", marginRight: 2 },

  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, flexDirection: "row", alignItems: "center" },
  statusConfirmed: { backgroundColor: "#DDF6E8" },
  statusRequest: { backgroundColor: "#FFF0D5" },
  statusPlanned: { backgroundColor: "#E8EEF4" },
  statusStarted: { backgroundColor: "#E0F2FE" },
  statusCompleted: { backgroundColor: "#DCFCE7" },
  statusText: { fontSize: 10.5, fontWeight: "900" },
  statusTextConfirmed: { color: "#1F7A4D", marginLeft: 3 },
  statusTextRequest: { color: "#B76E00" },
  statusTextPlanned: { color: "#526070" },
  statusTextStarted: { color: "#0369A1" },
  statusTextCompleted: { color: "#166534" },
});

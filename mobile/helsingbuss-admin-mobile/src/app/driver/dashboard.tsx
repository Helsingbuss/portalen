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
  BellRing,
  BusFront,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Menu,
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

export default function DriverDashboardScreen() {
  const [orders, setOrders] = useState<DriverOrder[]>([]);
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

  const todayOrders = useMemo(
    () => orders.filter((order) => isTodayDriverOrder(order.travelDate)),
    [orders]
  );

  const upcomingOrders = useMemo(
    () => orders.filter((order) => !isTodayDriverOrder(order.travelDate)),
    [orders]
  );

  const stats = useMemo(() => {
    return {
      today: todayOrders.length,
      upcoming: upcomingOrders.length,
      requests: orders.filter((order) => order.status === "request").length,
    };
  }, [orders, todayOrders.length, upcomingOrders.length]);

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
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.push("/driver/more" as any)}>
            <Menu size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>

          <Text style={styles.topTitle}>Mina körningar</Text>

          <Pressable style={styles.iconButton}>
            <BellRing size={22} color={colors.text} strokeWidth={2.5} />
            {stats.requests > 0 ? <View style={styles.notificationDot} /> : null}
          </Pressable>
        </View>

        <View style={styles.welcomeBox}>
          <Text style={styles.welcomeTitle}>Hej förare! 👋</Text>
          <Text style={styles.welcomeText}>Här ser du dina riktiga körorder från Helsingbuss.</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon="calendar" value={String(stats.today)} label="Dagens körningar" />
          <StatCard icon="clock" value={String(stats.upcoming)} label="Kommande körningar" />
          <StatCard icon="bell" value={String(stats.requests)} label="Förfrågningar" />
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar körningar...</Text>
          </View>
        ) : null}

        {!isLoading && orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <BusFront size={32} color={colors.primary} />
            <Text style={styles.emptyTitle}>Inga körningar ännu</Text>
            <Text style={styles.emptyText}>
              När trafikledningen lägger upp körorder till dig visas de här.
            </Text>
          </View>
        ) : null}

        {todayOrders.length > 0 ? (
          <>
            <SectionTitle title="Idag" />
            {todayOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </>
        ) : null}

        {upcomingOrders.length > 0 ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Kommande</Text>
              <Pressable onPress={() => router.push("/driver/trips" as any)}>
                <Text style={styles.showAllText}>Visa alla</Text>
              </Pressable>
            </View>

            {upcomingOrders.slice(0, 3).map((order) => (
              <OrderCard key={order.id} order={order} compact />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: "calendar" | "clock" | "bell";
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      {icon === "calendar" ? <CalendarDays size={22} color={colors.primary} /> : null}
      {icon === "clock" ? <Clock3 size={22} color={colors.primary} /> : null}
      {icon === "bell" ? <BellRing size={22} color={colors.primary} /> : null}

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function OrderCard({ order, compact }: { order: DriverOrder; compact?: boolean }) {
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
      <View style={styles.tripTimeBox}>
        <Text style={styles.tripStart}>{order.startTime || "--:--"}</Text>
        <Text style={styles.tripDash}>–</Text>
        <Text style={styles.tripEnd}>{order.endTime || "--:--"}</Text>
      </View>

      <View style={styles.tripMain}>
        <View style={styles.tripTop}>
          <Text style={styles.tripTitle}>{order.title}</Text>
          <StatusPill status={order.status} />
        </View>

        <Text style={styles.tripCustomer}>Kund: {order.customerName || "-"}</Text>

        <View style={styles.vehicleRow}>
          <BusFront size={15} color={colors.textMuted} strokeWidth={2.4} />
          <Text style={styles.vehicleText}>{order.vehicleLabel || "Fordon ej angivet"}</Text>
        </View>

        {!compact ? (
          <Text style={styles.routeText}>
            {order.pickupPlace || "-"} → {order.destination || "-"}
          </Text>
        ) : (
          <Text style={styles.routeText}>{formatDriverDate(order.travelDate)}</Text>
        )}
      </View>

      <ChevronRight size={20} color={colors.textMuted} />
    </Pressable>
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

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.goldSoft,
  },
  topTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },

  welcomeBox: { marginBottom: 14 },
  welcomeTitle: { color: colors.text, fontSize: 20, fontWeight: "900" },
  welcomeText: { color: colors.textMuted, fontSize: 12.5, fontWeight: "700", marginTop: 3 },

  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 18 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    alignItems: "center",
    minHeight: 104,
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: "900", marginTop: 8 },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 3,
  },

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
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "900", marginTop: 10 },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },

  sectionRow: {
    marginTop: 18,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: 10, marginTop: 2 },
  showAllText: { color: colors.primary, fontSize: 12, fontWeight: "900" },

  tripCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  tripTimeBox: { width: 62, alignItems: "center", marginRight: 10 },
  tripStart: { color: colors.text, fontSize: 15, fontWeight: "900" },
  tripDash: { color: colors.textMuted, fontSize: 12, fontWeight: "900", marginVertical: -2 },
  tripEnd: { color: colors.textMuted, fontSize: 13, fontWeight: "800" },
  tripMain: { flex: 1 },
  tripTop: { flexDirection: "row", alignItems: "center" },
  tripTitle: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "900", marginRight: 6 },
  tripCustomer: { color: colors.textMuted, fontSize: 11.5, fontWeight: "700", marginTop: 4 },
  vehicleRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  vehicleText: { color: colors.textMuted, fontSize: 11.5, fontWeight: "800", marginLeft: 5 },
  routeText: { color: colors.text, fontSize: 11.5, fontWeight: "800", marginTop: 5 },

  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center" },
  statusConfirmed: { backgroundColor: "#DDF6E8" },
  statusRequest: { backgroundColor: "#FFF0D5" },
  statusPlanned: { backgroundColor: "#E8EEF4" },
  statusStarted: { backgroundColor: "#E0F2FE" },
  statusCompleted: { backgroundColor: "#DCFCE7" },
  statusText: { fontSize: 10, fontWeight: "900" },
  statusTextConfirmed: { color: "#1F7A4D", marginLeft: 3 },
  statusTextRequest: { color: "#B76E00" },
  statusTextPlanned: { color: "#526070" },
  statusTextStarted: { color: "#0369A1" },
  statusTextCompleted: { color: "#166534" },
});

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
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  QrCode,
  RefreshCw,
  Ticket,
  UserRound,
  UsersRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  getMyDriverOrders,
  type DriverOrder,
} from "../../services/driverOrdersService";
import {
  checkInDriverOrderPassenger,
  getMyDriverOrderPassengers,
  type DriverOrderPassenger,
} from "../../services/driverPassengersService";

export default function DriverPassengersScreen() {
  const params = useLocalSearchParams<{ orderId?: string }>();
  const orderId = String(params.orderId || "");

  const [order, setOrder] = useState<DriverOrder | null>(null);
  const [passengers, setPassengers] = useState<DriverOrderPassenger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const orders = await getMyDriverOrders();
      const foundOrder = orders.find((item) => item.id === orderId) || null;
      setOrder(foundOrder);

      const result = await getMyDriverOrderPassengers(orderId);
      setPassengers(result);
    } catch (error: any) {
      Alert.alert("Kunde inte hämta resenärer", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const stats = useMemo(() => {
    const checkedIn = passengers.filter((item) => item.checkedIn).length;

    return {
      total: passengers.length,
      checkedIn,
      remaining: passengers.length - checkedIn,
    };
  }, [passengers]);

  async function checkIn(passenger: DriverOrderPassenger) {
    try {
      await checkInDriverOrderPassenger({
        orderId,
        passengerId: passenger.id,
      });

      await loadData(true);
    } catch (error: any) {
      Alert.alert("Kunde inte checka in", error?.message || "Försök igen.");
    }
  }

  if (!orderId) {
    return (
      <View style={styles.centerScreen}>
        <UsersRound size={34} color={colors.primary} />
        <Text style={styles.emptyTitle}>Välj en körning först</Text>
        <Text style={styles.emptyText}>
          Öppna en Sundra- eller flygbusskörning och tryck på Resenärer.
        </Text>
      </View>
    );
  }

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
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>

          <Text style={styles.topTitle}>Resenärer</Text>

          <Pressable style={styles.iconButton} onPress={() => loadData(true)}>
            <RefreshCw size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <UsersRound size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>FÖRARAPP</Text>
          <Text style={styles.heroTitle}>Passagerarlista</Text>
          <Text style={styles.heroText}>
            {order?.title || "Körning"} · {stats.checkedIn} av {stats.total} incheckade
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard title="Totalt" value={String(stats.total)} />
          <StatCard title="Incheckade" value={String(stats.checkedIn)} />
          <StatCard title="Kvar" value={String(stats.remaining)} />
        </View>

        <Pressable
          style={styles.scanButton}
          onPress={() => router.push(`/driver/scan?orderId=${orderId}` as any)}
        >
          <QrCode size={21} color={colors.white} strokeWidth={2.5} />
          <Text style={styles.scanButtonText}>Öppna scanner</Text>
        </Pressable>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar resenärer...</Text>
          </View>
        ) : null}

        {!isLoading && passengers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ticket size={30} color={colors.primary} />
            <Text style={styles.emptyTitle}>Inga resenärer hittades</Text>
            <Text style={styles.emptyText}>
              Resenärer visas här när biljetter/passagerarlista är kopplade till körordern.
            </Text>
          </View>
        ) : null}

        {passengers.map((passenger) => (
          <View key={passenger.id} style={styles.passengerCard}>
            <View style={styles.passengerIcon}>
              {passenger.checkedIn ? (
                <CheckCircle2 size={22} color="#1F7A4D" strokeWidth={2.5} />
              ) : (
                <UserRound size={22} color={colors.primary} strokeWidth={2.5} />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.passengerName}>{passenger.passengerName}</Text>

              <View style={styles.metaRow}>
                <Ticket size={14} color={colors.textMuted} />
                <Text style={styles.metaText}>
                  {passenger.ticketType || "Biljett"}
                  {passenger.seatNumber ? ` · Plats ${passenger.seatNumber}` : ""}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <MapPin size={14} color={colors.textMuted} />
                <Text style={styles.metaText}>{passenger.pickupPlace || "Upphämtning ej angiven"}</Text>
              </View>
            </View>

            {passenger.checkedIn ? (
              <View style={styles.checkedPill}>
                <Text style={styles.checkedText}>Incheckad</Text>
              </View>
            ) : (
              <Pressable style={styles.checkButton} onPress={() => checkIn(passenger)}>
                <Text style={styles.checkButtonText}>Checka in</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },

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

  scanButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 14,
  },
  scanButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 8 },

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
  emptyText: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18, fontWeight: "700", marginTop: 4, textAlign: "center" },

  passengerCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  passengerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  passengerName: { color: colors.text, fontSize: 14.5, fontWeight: "900" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  metaText: { color: colors.textMuted, fontSize: 11.5, fontWeight: "700", marginLeft: 5 },

  checkedPill: {
    backgroundColor: "#DDF6E8",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  checkedText: { color: "#1F7A4D", fontSize: 10.5, fontWeight: "900" },

  checkButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  checkButtonText: { color: colors.primary, fontSize: 11, fontWeight: "900" },
});

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
  ArrowLeft,
  BusFront,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  deleteAdminDriverOrder,
  getAdminDriverOrderStatusLabel,
  getAdminDriverOrders,
  type AdminDriverOrder,
} from "../../services/adminDriverOrdersService";

export default function AdminDriverOrdersScreen() {
  const [orders, setOrders] = useState<AdminDriverOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadOrders = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getAdminDriverOrders();
      setOrders(result);
    } catch (error: any) {
      Alert.alert("Kunde inte hämta körorder", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(false);
  }, [loadOrders]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      requests: orders.filter((item) => item.status === "request").length,
      confirmed: orders.filter((item) => item.status === "confirmed").length,
    };
  }, [orders]);

  function confirmDelete(order: AdminDriverOrder) {
    Alert.alert(
      "Ta bort körorder",
      "Vill du ta bort/arkivera denna körorder? Den försvinner då från både admin och föraren.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Ta bort",
          style: "destructive",
          onPress: () => deleteOrder(order.id),
        },
      ]
    );
  }

  async function deleteOrder(orderId: string) {
    try {
      setDeletingId(orderId);
      await deleteAdminDriverOrder(orderId);
      await loadOrders(true);
    } catch (error: any) {
      Alert.alert("Kunde inte ta bort körorder", error?.message || "Försök igen.");
    } finally {
      setDeletingId(null);
    }
  }

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
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>

          <Text style={styles.topTitle}>Körorder förare</Text>

          <Pressable style={styles.iconButton} onPress={() => loadOrders(true)}>
            <RefreshCw size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <ClipboardList size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>ADMIN</Text>
          <Text style={styles.heroTitle}>Körorder till förare</Text>
          <Text style={styles.heroText}>
            Skapa, följ upp och ta bort körorder som inte längre ska synas.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard title="Totalt" value={String(stats.total)} />
          <StatCard title="Förfrågningar" value={String(stats.requests)} />
          <StatCard title="Bekräftade" value={String(stats.confirmed)} />
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/admin/driver-order-form" as any)}
        >
          <Plus size={20} color={colors.white} strokeWidth={2.5} />
          <Text style={styles.primaryButtonText}>Skapa körorder</Text>
        </Pressable>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar körorder...</Text>
          </View>
        ) : null}

        {!isLoading && orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <BusFront size={30} color={colors.primary} />
            <Text style={styles.emptyTitle}>Inga körorder</Text>
            <Text style={styles.emptyText}>
              När du skapar körorder till förare visas de här.
            </Text>
          </View>
        ) : null}

        {orders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderTop}>
              <View style={styles.orderIcon}>
                <BusFront size={24} color={colors.primary} strokeWidth={2.5} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.orderTitle}>{order.title || "Körorder"}</Text>
                <Text style={styles.orderText}>Förare: {order.driverEmail || "-"}</Text>
              </View>

              <ChevronRight size={19} color={colors.textMuted} />
            </View>

            <InfoRow label="Datum" value={`${order.travelDate || "-"} · ${order.startTime || "--:--"}–${order.endTime || "--:--"}`} />
            <InfoRow label="Kund" value={order.customerName || "-"} />
            <InfoRow label="Rutt" value={`${order.pickupPlace || "-"} → ${order.destination || "-"}`} />
            <InfoRow label="Status" value={getAdminDriverOrderStatusLabel(order.status)} />

            <Pressable
              style={[styles.deleteButton, deletingId === order.id && styles.disabled]}
              onPress={() => confirmDelete(order)}
              disabled={deletingId === order.id}
            >
              {deletingId === order.id ? (
                <ActivityIndicator color="#B42318" />
              ) : (
                <Trash2 size={18} color="#B42318" strokeWidth={2.5} />
              )}
              <Text style={styles.deleteButtonText}>Ta bort / arkivera</Text>
            </Pressable>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
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
  heroTitle: { color: colors.white, fontSize: 27, lineHeight: 33, fontWeight: "900" },
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

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 14,
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 8 },

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

  orderCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  orderTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  orderIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  orderTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  orderText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 3 },

  infoRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 8,
  },
  infoLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  infoValue: { color: colors.text, fontSize: 12.5, fontWeight: "800", marginTop: 2 },

  deleteButton: {
    backgroundColor: "#FFF1F0",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFDAD6",
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 12,
  },
  deleteButtonText: { color: "#B42318", fontSize: 13, fontWeight: "900", marginLeft: 7 },
  disabled: { opacity: 0.65 },
});

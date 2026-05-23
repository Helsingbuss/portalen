import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  BusFront,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  MapPin,
  MessageSquareText,
  Phone,
  PlayCircle,
  QrCode,
  RefreshCw,
  Route,
  Star,
  UsersRound,
  XCircle,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  formatDriverDate,
  getDriverStatusLabel,
  getMyDriverOrders,
  updateMyDriverOrderStatus,
  hideMyDriverOrder,
  type DriverOrder,
  type DriverOrderStatus,
} from "../../services/driverOrdersService";

export default function DriverOrderDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const orderId = String(params.id || "");

  const [order, setOrder] = useState<DriverOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadOrder = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const orders = await getMyDriverOrders();
      const found = orders.find((item) => item.id === orderId) || null;

      setOrder(found);

      if (!found) {
        Alert.alert("Körningen hittades inte", "Körordern kunde inte hittas eller är inte kopplad till dig.");
      }
    } catch (error: any) {
      Alert.alert("Kunde inte hämta körorder", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder(false);
  }, [loadOrder]);

  const isTicketBasedOrder = useMemo(() => {
    const sourceType = String(order?.sourceType || "").toLowerCase();

    return (
      sourceType.includes("sundra") ||
      sourceType.includes("shuttle") ||
      sourceType.includes("airport") ||
      sourceType.includes("flygbuss") ||
      sourceType.includes("ticket")
    );
  }, [order?.sourceType]);

  async function changeStatus(nextStatus: DriverOrderStatus) {
    if (!order) return;

    try {
      setIsUpdating(true);

      await updateMyDriverOrderStatus({
        orderId: order.id,
        status: nextStatus,
      });

      await loadOrder(true);
    } catch (error: any) {
      Alert.alert("Kunde inte uppdatera körningen", error?.message || "Försök igen.");
    } finally {
      setIsUpdating(false);
    }
  }

  function acceptTrip() {
    Alert.alert("Acceptera körning", "Vill du tacka ja till detta uppdrag?", [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Acceptera",
        onPress: () => changeStatus("confirmed"),
      },
    ]);
  }

  function declineTrip() {
    Alert.alert("Kan inte köra", "Vill du markera att du inte kan köra detta uppdrag?", [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Ja, markera",
        style: "destructive",
        onPress: () => changeStatus("cancelled"),
      },
    ]);
  }

  function startTrip() {
    Alert.alert("Påbörja körning", "Vill du markera körningen som påbörjad?", [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Påbörja",
        onPress: () => changeStatus("started"),
      },
    ]);
  }

  function completeTrip() {
    Alert.alert("Slutför körning", "Vill du markera körningen som slutförd?", [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Slutför",
        onPress: () => changeStatus("completed"),
      },
    ]);
  }

  function confirmHideOrder() {
    if (!order) return;

    Alert.alert(
      "Dölj körorder",
      "Vill du dölja denna körorder från dina körningar? Admin kan fortfarande se historiken.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Dölj",
          style: "destructive",
          onPress: hideOrder,
        },
      ]
    );
  }

  async function hideOrder() {
    if (!order) return;

    try {
      setIsUpdating(true);
      await hideMyDriverOrder(order.id);

      Alert.alert("Körorder dold", "Körordern har tagits bort från din lista.", [
        {
          text: "OK",
          onPress: () => router.replace("/driver/trips" as any),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Kunde inte dölja körorder", error?.message || "Försök igen.");
    } finally {
      setIsUpdating(false);
    }
  }

  function callContact() {
    const phone = String(order?.contactPhone || "").replace(/\s/g, "");

    if (!phone) {
      Alert.alert("Telefon saknas", "Det finns inget telefonnummer kopplat till kontaktpersonen.");
      return;
    }

    Linking.openURL(`tel:${phone}`);
  }

  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Hämtar körorder...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerScreen}>
        <BusFront size={34} color={colors.primary} />
        <Text style={styles.notFoundTitle}>Körorder saknas</Text>
        <Text style={styles.notFoundText}>Gå tillbaka och uppdatera listan.</Text>

        <Pressable style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Gå tillbaka</Text>
        </Pressable>
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
            onRefresh={() => loadOrder(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>

          <Text style={styles.topTitle}>Körorder</Text>

          <Pressable style={styles.iconButton} onPress={() => loadOrder(true)}>
            <RefreshCw size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.orderCard}>
          <View style={styles.orderTop}>
            <StatusPill status={order.status} />

            <View style={styles.busImageBox}>
              <BusFront size={42} color={colors.primary} strokeWidth={2.2} />
              <Text style={styles.busImageText}>{order.vehicleLabel || "Fordon"}</Text>
            </View>
          </View>

          <Text style={styles.orderTitle}>{order.title}</Text>
          <Text style={styles.orderCustomer}>Kund: {order.customerName || "-"}</Text>

          <View style={styles.divider} />

          <InfoRow icon="calendar" label="Datum" value={formatDriverDate(order.travelDate)} />
          <InfoRow icon="clock" label="Avgång" value={`${order.pickupPlace || "-"} · ${order.startTime || "--:--"}`} />
          <InfoRow icon="map" label="Destination" value={order.destination || "-"} />
          <InfoRow icon="clock" label="Hemkomst" value={order.endTime ? `${order.endTime} beräknad` : "Ej angiven"} />
          <InfoRow icon="bus" label="Fordon" value={order.vehicleLabel || "Fordon ej angivet"} />
          <InfoRow icon="users" label="Antal resenärer" value={`${order.passengerCount || 0} personer`} />
          <InfoRow icon="route" label="Typ av körning" value={getOrderTypeLabel(order.sourceType)} />
        </View>

        <StatusActionCard
          order={order}
          isUpdating={isUpdating}
          onAccept={acceptTrip}
          onDecline={declineTrip}
          onStart={startTrip}
          onComplete={completeTrip}
        />

        <View style={styles.sectionCard}>
          <ActionRow
            title="Kontakt på plats"
            text={
              order.contactName || order.contactPhone
                ? `${order.contactName || "Kontakt"}${order.contactPhone ? " · " + order.contactPhone : ""}`
                : "Kontakt saknas"
            }
            icon={<Phone size={21} color={colors.primary} strokeWidth={2.5} />}
            onPress={callContact}
          />

          <ActionRow
            title="Påstigningsplatser"
            text={order.pickupStops.length > 0 ? order.pickupStops.join(", ") : order.pickupPlace || "Ej angivet"}
            icon={<MapPin size={21} color={colors.primary} strokeWidth={2.5} />}
            onPress={() =>
              Alert.alert(
                "Påstigningsplatser",
                order.pickupStops.length > 0
                  ? order.pickupStops.map((stop, index) => `${index + 1}. ${stop}`).join("\n")
                  : order.pickupPlace || "Inga påstigningsplatser angivna."
              )
            }
          />

          <ActionRow
            title="Instruktioner"
            text={order.instructions || "Inga särskilda instruktioner"}
            icon={<ClipboardList size={21} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => Alert.alert("Instruktioner", order.instructions || "Inga särskilda instruktioner.")}
          />

          <ActionRow
            title="Noteringar"
            text={order.notes || "Inga noteringar"}
            icon={<MessageSquareText size={21} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => Alert.alert("Noteringar", order.notes || "Inga noteringar.")}
          />
        </View>

        {isTicketBasedOrder ? (
          <View style={styles.ticketNoticeCard}>
            <QrCode size={23} color={colors.primary} strokeWidth={2.5} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.ticketNoticeTitle}>Biljettbaserad körning</Text>
              <Text style={styles.ticketNoticeText}>
                Scanner och resenärslista används för Sundra Resor och flygbuss.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.normalNoticeCard}>
            <Star size={23} color={colors.primary} strokeWidth={2.5} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.normalNoticeTitle}>Vanlig körorder</Text>
              <Text style={styles.normalNoticeText}>
                Scanner behövs inte för denna typ av körning.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.quickActions}>
          {isTicketBasedOrder ? (
            <>
              <Pressable
                style={styles.quickButton}
                onPress={() => router.push(`/driver/passengers?orderId=${order.id}` as any)}
              >
                <UsersRound size={21} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.quickButtonText}>Resenärer</Text>
              </Pressable>

              <Pressable
                style={styles.quickButton}
                onPress={() => router.push(`/driver/scan?orderId=${order.id}` as any)}
              >
                <QrCode size={21} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.quickButtonText}>Skanna</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={styles.quickButtonWide}
              onPress={() => Alert.alert("Körorder", "Denna körning kräver ingen scanning.")}
            >
              <Route size={21} color={colors.white} strokeWidth={2.5} />
              <Text style={styles.quickButtonText}>Vanlig körorder</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          style={[styles.hideOrderButton, isUpdating && styles.disabled]}
          onPress={confirmHideOrder}
          disabled={isUpdating}
        >
          <Text style={styles.hideOrderButtonText}>Dölj från mina körningar</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function getOrderTypeLabel(sourceType: string) {
  const value = String(sourceType || "").toLowerCase();

  if (value.includes("sundra")) return "Sundra Resor";
  if (value.includes("shuttle") || value.includes("airport") || value.includes("flygbuss")) return "Flygbuss";
  if (value.includes("charter") || value.includes("booking") || value.includes("bestallning")) return "Beställningstrafik";

  return "Vanlig körorder";
}

function StatusActionCard({
  order,
  isUpdating,
  onAccept,
  onDecline,
  onStart,
  onComplete,
}: {
  order: DriverOrder;
  isUpdating: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onStart: () => void;
  onComplete: () => void;
}) {
  if (order.status === "request") {
    return (
      <View style={styles.requestCard}>
        <Text style={styles.requestTitle}>Förfrågan</Text>
        <Text style={styles.requestText}>
          Detta uppdrag behöver besvaras. Bekräfta om du kan köra eller markera att du inte kan.
        </Text>

        <Pressable style={[styles.acceptButton, isUpdating && styles.disabled]} onPress={onAccept} disabled={isUpdating}>
          {isUpdating ? <ActivityIndicator color={colors.white} /> : <CheckCircle2 size={20} color={colors.white} strokeWidth={2.5} />}
          <Text style={styles.acceptButtonText}>Acceptera körning</Text>
        </Pressable>

        <Pressable style={[styles.declineButton, isUpdating && styles.disabled]} onPress={onDecline} disabled={isUpdating}>
          <XCircle size={20} color="#B42318" strokeWidth={2.5} />
          <Text style={styles.declineButtonText}>Kan inte köra</Text>
        </Pressable>
      </View>
    );
  }

  if (order.status === "confirmed" || order.status === "planned") {
    return (
      <View style={styles.requestCard}>
        <Text style={styles.requestTitle}>Körningen är klar för start</Text>
        <Text style={styles.requestText}>
          När du börjar köra kan du markera körningen som påbörjad.
        </Text>

        <Pressable style={[styles.acceptButton, isUpdating && styles.disabled]} onPress={onStart} disabled={isUpdating}>
          {isUpdating ? <ActivityIndicator color={colors.white} /> : <PlayCircle size={20} color={colors.white} strokeWidth={2.5} />}
          <Text style={styles.acceptButtonText}>Påbörja körning</Text>
        </Pressable>
      </View>
    );
  }

  if (order.status === "started") {
    return (
      <View style={styles.requestCard}>
        <Text style={styles.requestTitle}>Körning pågår</Text>
        <Text style={styles.requestText}>
          När körningen är färdig kan du markera den som slutförd.
        </Text>

        <Pressable style={[styles.acceptButton, isUpdating && styles.disabled]} onPress={onComplete} disabled={isUpdating}>
          {isUpdating ? <ActivityIndicator color={colors.white} /> : <CheckCircle2 size={20} color={colors.white} strokeWidth={2.5} />}
          <Text style={styles.acceptButtonText}>Slutför körning</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.confirmedCard}>
      <CheckCircle2 size={22} color="#1F7A4D" strokeWidth={2.5} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.confirmedTitle}>Status: {getDriverStatusLabel(order.status)}</Text>
        <Text style={styles.confirmedText}>Denna körning är markerad som {getDriverStatusLabel(order.status).toLowerCase()}.</Text>
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: "calendar" | "clock" | "map" | "bus" | "users" | "route";
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        {icon === "calendar" ? <CalendarDays size={18} color={colors.primary} /> : null}
        {icon === "clock" ? <Clock3 size={18} color={colors.primary} /> : null}
        {icon === "map" ? <MapPin size={18} color={colors.primary} /> : null}
        {icon === "bus" ? <BusFront size={18} color={colors.primary} /> : null}
        {icon === "users" ? <UsersRound size={18} color={colors.primary} /> : null}
        {icon === "route" ? <Route size={18} color={colors.primary} /> : null}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionRow({
  title,
  text,
  icon,
  onPress,
}: {
  title: string;
  text: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionRow} onPress={onPress}>
      <View style={styles.actionIcon}>{icon}</View>

      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionText} numberOfLines={2}>{text}</Text>
      </View>

      <ChevronRight size={19} color={colors.textMuted} strokeWidth={2.5} />
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
        status === "cancelled" && styles.statusCancelled,
      ]}
    >
      <Text
        style={[
          styles.statusText,
          isConfirmed && styles.statusTextConfirmed,
          isRequest && styles.statusTextRequest,
          status === "planned" && styles.statusTextPlanned,
          status === "started" && styles.statusTextStarted,
          status === "completed" && styles.statusTextCompleted,
          status === "cancelled" && styles.statusTextCancelled,
        ]}
      >
        {getDriverStatusLabel(status)}
      </Text>
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

  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: "800", marginTop: 12 },
  notFoundTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginTop: 12 },
  notFoundText: { color: colors.textMuted, fontSize: 13, fontWeight: "700", marginTop: 5, textAlign: "center" },

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

  orderCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  orderTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  busImageBox: {
    width: 112,
    height: 78,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  busImageText: { color: colors.primary, fontSize: 11, fontWeight: "900", marginTop: 4, textAlign: "center" },
  orderTitle: { color: colors.text, fontSize: 19, fontWeight: "900" },
  orderCustomer: { color: colors.textMuted, fontSize: 12.5, fontWeight: "700", marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },

  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  infoLabel: { color: colors.textMuted, fontSize: 11.5, fontWeight: "900" },
  infoValue: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 2 },

  requestCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  requestTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  requestText: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18, fontWeight: "700", marginTop: 4, marginBottom: 12 },

  acceptButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 10,
  },
  acceptButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 8 },
  declineButton: {
    backgroundColor: "#FFF1F0",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FFDAD6",
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  declineButtonText: { color: "#B42318", fontSize: 14, fontWeight: "900", marginLeft: 8 },

  confirmedCard: {
    backgroundColor: "#DDF6E8",
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  confirmedTitle: { color: "#1F7A4D", fontSize: 14, fontWeight: "900" },
  confirmedText: { color: "#1F7A4D", fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 2 },

  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
    marginBottom: 14,
  },
  actionRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 18 },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  actionTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  actionText: { color: colors.textMuted, fontSize: 11.5, lineHeight: 16, fontWeight: "700", marginTop: 2 },

  ticketNoticeCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  ticketNoticeTitle: { color: colors.primary, fontSize: 14, fontWeight: "900" },
  ticketNoticeText: { color: colors.text, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 2 },

  normalNoticeCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  normalNoticeTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  normalNoticeText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 2 },

  quickActions: { flexDirection: "row", gap: 10 },
  quickButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  quickButtonWide: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  quickButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 8 },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 52,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900" },

  hideOrderButton: {
    backgroundColor: "#FFF1F0",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FFDAD6",
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  hideOrderButtonText: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "900",
  },

  disabled: { opacity: 0.65 },

  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusConfirmed: { backgroundColor: "#DDF6E8" },
  statusRequest: { backgroundColor: "#FFF0D5" },
  statusPlanned: { backgroundColor: "#E8EEF4" },
  statusStarted: { backgroundColor: "#E0F2FE" },
  statusCompleted: { backgroundColor: "#DCFCE7" },
  statusCancelled: { backgroundColor: "#FFF1F0" },
  statusText: { fontSize: 11, fontWeight: "900" },
  statusTextConfirmed: { color: "#1F7A4D" },
  statusTextRequest: { color: "#B76E00" },
  statusTextPlanned: { color: "#526070" },
  statusTextStarted: { color: "#0369A1" },
  statusTextCompleted: { color: "#166534" },
  statusTextCancelled: { color: "#B42318" },
});

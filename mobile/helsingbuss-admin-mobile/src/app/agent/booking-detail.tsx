import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Link as LinkIcon,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Ticket,
  UserRound,
  UsersRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import { createAndSendPaymentLink } from "../../services/storeService";
import {
  formatAgentBookingMoney,
  getAgentBookingDetail,
  getPaymentStatusLabel,
  saveAgentBookingPaymentInfo,
  type AgentBookingDetail,
  type AgentBookingType,
} from "../../services/agentBookingsService";

export default function AgentBookingDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; type?: string }>();

  const [booking, setBooking] = useState<AgentBookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  const bookingId = String(params.id || "");
  const bookingType = String(params.type || "sundra") as AgentBookingType;

  const loadBooking = useCallback(async () => {
    try {
      setIsLoading(true);

      const result = await getAgentBookingDetail({
        id: bookingId,
        type: bookingType,
      });

      setBooking(result);
    } catch (error: any) {
      Alert.alert("Kunde inte hämta bokningen", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, bookingType]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  function openPayment() {
    const url = String(booking?.payment_url || "");

    if (!url) {
      Alert.alert("Ingen betalningslänk", "Skapa en betalningslänk först.");
      return;
    }

    Linking.openURL(url);
  }

  async function createPaymentLink() {
    if (!booking) return;

    const totalPrice = Number(booking.total_price || 0);

    if (totalPrice <= 0) {
      Alert.alert("Saknar belopp", "Bokningen saknar totalpris.");
      return;
    }

    try {
      setIsCreatingPayment(true);

      const title =
        bookingType === "sundra"
          ? `Sundra resa - ${booking.title || "Bokning"}`
          : "Airport Shuttle - Bokning";

      const customerName = String(booking.customer_name || "Kund");
      const customerEmail = String(booking.customer_email || "");
      const customerPhone = String(booking.customer_phone || "");

      const paymentMessage =
        `Hej ${customerName}! Här kommer din betalningslänk.\n\n` +
        `Bokning: ${title}\n` +
        `Datum: ${booking.travel_date || "-"}\n` +
        `Belopp: ${formatAgentBookingMoney(totalPrice)}`;

      const paymentResult: any = await createAndSendPaymentLink({
        title,
        productTitle: title,
        customerName,
        customerEmail,
        customerPhone,
        amount: totalPrice,
        totalAmount: totalPrice,
        currency: "SEK",
        message: paymentMessage,
        sendEmail: Boolean(customerEmail),
        sendSms: Boolean(customerPhone),
        sourceType: bookingType === "sundra" ? "agent_sundra_booking" : "agent_shuttle_booking",
        sourceId: bookingId,
        businessUnit: bookingType === "sundra" ? "sundra" : "airport_shuttle",
      } as any);

      const paymentUrl =
        paymentResult?.paymentUrl ||
        paymentResult?.url ||
        paymentResult?.checkoutUrl ||
        paymentResult?.checkout_url ||
        "";

      const paymentReference =
        paymentResult?.paymentId ||
        paymentResult?.checkoutId ||
        paymentResult?.checkout_id ||
        paymentResult?.id ||
        "";

      if (!paymentUrl) {
        Alert.alert(
          "Länk skapades inte",
          "Bokningen finns kvar, men betalningslänken kunde inte läsas från svaret."
        );
        return;
      }

      await saveAgentBookingPaymentInfo({
        type: bookingType,
        id: bookingId,
        paymentUrl,
        paymentReference: String(paymentReference || ""),
        paymentStatus: "pending",
        paymentProvider: "sumup",
      });

      await loadBooking();

      Alert.alert("Betalningslänk skapad", "Länken är sparad på bokningen.", [
        {
          text: "Öppna länk",
          onPress: () => Linking.openURL(paymentUrl),
        },
        {
          text: "Stäng",
          style: "cancel",
        },
      ]);
    } catch (error: any) {
      Alert.alert("Kunde inte skapa betalningslänk", error?.message || "Försök igen.");
    } finally {
      setIsCreatingPayment(false);
    }
  }

  const title = String(booking?.title || (bookingType === "sundra" ? "Sundra resa" : "Airport Shuttle"));
  const customerName = String(booking?.customer_name || "");
  const paymentStatus = String(booking?.payment_status || "pending");
  const totalPrice = Number(booking?.total_price || 0);
  const hasPaymentUrl = Boolean(booking?.payment_url);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
        </Pressable>

        <View style={styles.heroCard}>
          <Ticket size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>BOKNINGSDETALJ</Text>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroText}>
            Kund, resa, betalningsstatus och bokningsinformation.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar bokning...</Text>
          </View>
        ) : null}

        {booking ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Kund</Text>
              <InfoRow icon="user" label="Namn" value={customerName || "-"} />
              <InfoRow icon="mail" label="E-post" value={String(booking.customer_email || "-")} />
              <InfoRow icon="phone" label="Telefon" value={String(booking.customer_phone || "-")} />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Resa</Text>
              <InfoRow
                icon="calendar"
                label="Datum"
                value={`${booking.travel_date || "-"}${booking.travel_time ? " · " + booking.travel_time : ""}`}
              />

              {bookingType === "sundra" ? (
                <>
                  <InfoRow icon="map" label="Upphämtning" value={String(booking.pickup_place || booking.departure_place || "-")} />
                  <InfoRow icon="users" label="Resenärer" value={String(booking.passengers || 0)} />
                  <InfoRow
                    icon="ticket"
                    label="Platser"
                    value={
                      Array.isArray(booking.seat_numbers) && booking.seat_numbers.length > 0
                        ? booking.seat_numbers.join(", ")
                        : "Inget platsval"
                    }
                  />
                </>
              ) : (
                <>
                  <InfoRow icon="map" label="Från" value={String(booking.from_stop || "-")} />
                  <InfoRow icon="map" label="Till" value={String(booking.to_stop || "-")} />
                  <InfoRow icon="users" label="Resenärer" value={String(booking.passengers || 0)} />
                  <InfoRow icon="ticket" label="Biljettyp" value={String(booking.ticket_type || "-")} />
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Betalning</Text>

              <View style={styles.paymentBox}>
                <View>
                  <Text style={styles.paymentLabel}>Status</Text>
                  <Text style={styles.paymentStatus}>{getPaymentStatusLabel(paymentStatus)}</Text>
                </View>

                <Text style={styles.paymentAmount}>{formatAgentBookingMoney(totalPrice)}</Text>
              </View>

              {bookingType === "sundra" ? (
                <>
                  <InfoRow icon="ticket" label="Biljetter" value={formatAgentBookingMoney(Number(booking.ticket_total_price || 0))} />
                  <InfoRow icon="ticket" label="Platstillval" value={formatAgentBookingMoney(Number(booking.seat_selection_price || 0))} />
                </>
              ) : null}

              {hasPaymentUrl ? (
                <Pressable style={styles.primaryButton} onPress={openPayment}>
                  <LinkIcon size={20} color={colors.white} />
                  <Text style={styles.primaryButtonText}>Öppna betalningslänk</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.primaryButton, isCreatingPayment && styles.disabled]}
                  onPress={createPaymentLink}
                  disabled={isCreatingPayment}
                >
                  {isCreatingPayment ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <CreditCard size={20} color={colors.white} />
                  )}
                  <Text style={styles.primaryButtonText}>Skapa betalningslänk</Text>
                </Pressable>
              )}

              <Pressable style={styles.secondaryButton} onPress={loadBooking}>
                <RefreshCw size={18} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Uppdatera status</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: "user" | "mail" | "phone" | "calendar" | "map" | "users" | "ticket";
  label: string;
  value: string;
}) {
  const iconColor = colors.primary;

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        {icon === "user" ? <UserRound size={18} color={iconColor} /> : null}
        {icon === "mail" ? <Mail size={18} color={iconColor} /> : null}
        {icon === "phone" ? <Phone size={18} color={iconColor} /> : null}
        {icon === "calendar" ? <CalendarDays size={18} color={iconColor} /> : null}
        {icon === "map" ? <MapPin size={18} color={iconColor} /> : null}
        {icon === "users" ? <UsersRound size={18} color={iconColor} /> : null}
        {icon === "ticket" ? <Ticket size={18} color={iconColor} /> : null}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
  },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginTop: 12, marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 27, lineHeight: 33, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 7 },

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

  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: 10 },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
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

  paymentBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  paymentLabel: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  paymentStatus: { color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 2 },
  paymentAmount: { color: colors.primary, fontSize: 20, fontWeight: "900" },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 10,
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 8 },
  secondaryButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 10,
  },
  secondaryButtonText: { color: colors.primary, fontSize: 13, fontWeight: "900", marginLeft: 7 },
  disabled: { opacity: 0.65 },
});

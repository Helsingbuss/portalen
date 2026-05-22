import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  Bus,
  CalendarDays,
  FileText,
  Mail,
  Map,
  Phone,
  Route,
  Ticket,
  UserRound,
  UsersRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  formatAgentBookingDetailDate,
  formatAgentBookingDetailMoney,
  getAgentBookingDetail,
  type AgentBookingDetail,
  type AgentBookingPerson,
} from "../../services/agentBookingDetailService";

export default function AgentBookingDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const bookingId = String(params.id || "");

  const [booking, setBooking] = useState<AgentBookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getAgentBookingDetail(bookingId);
      setBooking(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  function callCustomer() {
    if (!booking?.customerPhone) return;
    Linking.openURL("tel:" + booking.customerPhone);
  }

  function mailCustomer() {
    if (!booking?.customerEmail) return;
    Linking.openURL("mailto:" + booking.customerEmail);
  }

  const people =
    booking && booking.passengers.length > 0
      ? booking.passengers
      : booking?.tickets || [];

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
            <Text style={styles.title}>Bokningsdetalj</Text>
            <Text style={styles.subtitle}>{booking?.reference || "Laddar bokning..."}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar bokning...</Text>
          </View>
        ) : null}

        {!isLoading && !booking ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Bokningen hittades inte</Text>
            <Text style={styles.emptyText}>
              Kontrollera att bokningen finns och att du har rätt behörighet.
            </Text>
          </View>
        ) : null}

        {booking ? (
          <>
            <View style={styles.heroCard}>
              <Bus size={38} color={colors.goldSoft} strokeWidth={2.4} />
              <Text style={styles.heroKicker}>BOKNING</Text>
              <Text style={styles.heroTitle}>{booking.reference || "Bokning"}</Text>
              <Text style={styles.heroText}>
                {booking.departure || "Start saknas"} → {booking.destination || "Destination saknas"}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <InfoPill title="Status" value={booking.status || "Bokad"} />
              <InfoPill
                title="Pris"
                value={booking.amount > 0 ? formatAgentBookingDetailMoney(booking.amount) : "Ej angivet"}
              />
            </View>

            <Section title="Kund">
              <InfoRow icon={<UserRound size={20} color={colors.primary} />} title="Namn" value={booking.customerName || "Kund saknas"} />
              <InfoRow icon={<Mail size={20} color={colors.primary} />} title="E-post" value={booking.customerEmail || "Saknas"} />
              <InfoRow icon={<Phone size={20} color={colors.primary} />} title="Telefon" value={booking.customerPhone || "Saknas"} />

              <View style={styles.actionRow}>
                <Pressable style={styles.secondaryButton} onPress={mailCustomer}>
                  <Mail size={18} color={colors.primary} />
                  <Text style={styles.secondaryButtonText}>Mejla</Text>
                </Pressable>

                <Pressable style={styles.secondaryButton} onPress={callCustomer}>
                  <Phone size={18} color={colors.primary} />
                  <Text style={styles.secondaryButtonText}>Ring</Text>
                </Pressable>
              </View>
            </Section>

            <Section title="Resa">
              <InfoRow icon={<Route size={20} color={colors.primary} />} title="Från" value={booking.departure || "Saknas"} />
              <InfoRow icon={<Route size={20} color={colors.primary} />} title="Till" value={booking.destination || "Saknas"} />
              <InfoRow
                icon={<CalendarDays size={20} color={colors.primary} />}
                title="Avresa"
                value={
                  formatAgentBookingDetailDate(booking.departureDate) +
                  (booking.departureTime ? " kl. " + booking.departureTime : "")
                }
              />

              {booking.returnDate || booking.returnTime ? (
                <InfoRow
                  icon={<CalendarDays size={20} color={colors.primary} />}
                  title="Retur"
                  value={
                    formatAgentBookingDetailDate(booking.returnDate) +
                    (booking.returnTime ? " kl. " + booking.returnTime : "")
                  }
                />
              ) : null}

              <InfoRow
                icon={<UsersRound size={20} color={colors.primary} />}
                title="Resenärer"
                value={booking.passengersCount > 0 ? booking.passengersCount + " personer" : "Ej angivet"}
              />
            </Section>

            <Section title="Livebuss">
              {booking.liveVehicle ? (
                <>
                  <InfoRow
                    icon={<Bus size={20} color={colors.primary} />}
                    title="Fordon"
                    value={
                      booking.liveVehicle.vehicleName +
                      (booking.liveVehicle.registrationNumber
                        ? " · " + booking.liveVehicle.registrationNumber
                        : "")
                    }
                  />
                  <InfoRow
                    icon={<UserRound size={20} color={colors.primary} />}
                    title="Chaufför"
                    value={booking.liveVehicle.driverName || "Ej angivet"}
                  />
                  <InfoRow
                    icon={<Map size={20} color={colors.primary} />}
                    title="Status"
                    value={booking.liveVehicle.status || "Live"}
                  />
                </>
              ) : (
                <View style={styles.liveCard}>
                  <View style={styles.liveIcon}>
                    <Map size={24} color={colors.primary} strokeWidth={2.5} />
                  </View>

                  <View style={styles.liveTextBox}>
                    <Text style={styles.liveTitle}>Ingen livebuss kopplad ännu</Text>
                    <Text style={styles.liveText}>
                      När bokningen har tilldelad buss visas position, status och ETA här.
                    </Text>
                  </View>
                </View>
              )}

              <Pressable style={styles.primaryButton} onPress={() => router.push("/agent/live-map" as any)}>
                <Map size={20} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.primaryButtonText}>Visa livekarta</Text>
              </Pressable>
            </Section>

            <Section title={"Biljetter (" + booking.tickets.length + ")"}>
              {booking.tickets.length === 0 ? (
                <Text style={styles.emptyText}>Inga biljetter är kopplade till bokningen ännu.</Text>
              ) : (
                booking.tickets.map((ticket) => (
                  <PersonRow key={"ticket-" + ticket.id + ticket.ticketNumber} person={ticket} type="ticket" />
                ))
              )}
            </Section>

            <Section title={"Passagerare (" + people.length + ")"}>
              {people.length === 0 ? (
                <Text style={styles.emptyText}>Ingen passagerarlista är kopplad ännu.</Text>
              ) : (
                people.map((person) => (
                  <PersonRow key={"person-" + person.id + person.name + person.seat} person={person} type="passenger" />
                ))
              )}
            </Section>

            {booking.notes ? (
              <Section title="Anteckningar">
                <View style={styles.noteBox}>
                  <FileText size={20} color={colors.primary} />
                  <Text style={styles.noteText}>{booking.notes}</Text>
                </View>
              </Section>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function InfoPill({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillTitle}>{title}</Text>
      <Text style={styles.infoPillValue}>{value}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>

      <View style={styles.infoTextBox}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function PersonRow({ person, type }: { person: AgentBookingPerson; type: "ticket" | "passenger" }) {
  return (
    <View style={styles.personRow}>
      <View style={styles.personIcon}>
        {type === "ticket" ? (
          <Ticket size={19} color={colors.primary} />
        ) : (
          <UsersRound size={19} color={colors.primary} />
        )}
      </View>

      <View style={styles.personTextBox}>
        <Text style={styles.personName}>{person.name}</Text>
        <Text style={styles.personMeta}>
          {[person.category, person.seat ? "Plats " + person.seat : "", person.ticketNumber]
            .filter(Boolean)
            .join(" · ") || "Detaljer saknas"}
        </Text>
      </View>
    </View>
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

  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  emptyText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 18 },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 20,
    marginBottom: 14,
  },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginTop: 12, marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 25, lineHeight: 31, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 7 },

  statusRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  infoPill: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  infoPillTitle: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  infoPillValue: { color: colors.primary, fontSize: 15, fontWeight: "900", marginTop: 4 },

  section: { marginBottom: 15 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },

  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9 },
  infoIcon: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  infoTextBox: { flex: 1 },
  infoTitle: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  infoValue: { color: colors.text, fontSize: 13.5, fontWeight: "800", marginTop: 2 },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  secondaryButtonText: { color: colors.primary, fontSize: 12, fontWeight: "900", marginLeft: 6 },

  liveCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 13,
    flexDirection: "row",
    marginBottom: 12,
  },
  liveIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  liveTextBox: { flex: 1 },
  liveTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  liveText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 3 },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 17,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 6,
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 8 },

  personRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  personIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  personTextBox: { flex: 1 },
  personName: { color: colors.text, fontSize: 13.5, fontWeight: "900" },
  personMeta: { color: colors.textMuted, fontSize: 11.5, fontWeight: "700", marginTop: 2 },

  noteBox: { flexDirection: "row", alignItems: "flex-start" },
  noteText: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "700", marginLeft: 10 },
});

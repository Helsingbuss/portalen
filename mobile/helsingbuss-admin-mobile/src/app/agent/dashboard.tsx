import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, } from "react-native";
import { router } from "expo-router";
import {
  Bell,
  Bus,
  CalendarDays,
  CheckCircle2,
  FileText,
  Map,
  MessageCircle,
  Plus,
  Ticket,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  formatAgentDate,
  formatAgentMoney,
  getAgentDashboardOverview,
  getFallbackAgentDashboardOverview,
  type AgentDashboardOverview,
  type AgentDashboardRow,
} from "../../services/agentDashboardService";

export default function AgentDashboardScreen() {
  const [data, setData] = useState<AgentDashboardOverview>(
    getFallbackAgentDashboardOverview()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getAgentDashboardOverview();
      setData(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const agentName = data.agent.name || "Agent";

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
          <View>
            <Text style={styles.kicker}>AGENTAPP</Text>
            <Text style={styles.title}>Agentöversikt</Text>
            <Text style={styles.subtitle}>Hej {agentName}! Här är läget idag.</Text>
          </View>

          <Pressable style={styles.notificationButton}>
            <Bell size={22} color={colors.primary} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>HELSINGBUSS AGENT</Text>
          <Text style={styles.heroTitle}>Allt du behöver för bokningar och försäljning.</Text>
          <Text style={styles.heroText}>
            Se inkomna offerter, bokningar, sålda biljetter och kopplade körningar.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar agentdata...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            icon={<FileText size={22} color={colors.primary} />}
            value={String(data.summary.incomingOffers)}
            title="Inkomna offerter"
            text="Behöver hanteras"
          />

          <MetricCard
            icon={<CalendarDays size={22} color={colors.primary} />}
            value={String(data.summary.bookings)}
            title="Bokningar"
            text="Alla bokningar"
          />

          <MetricCard
            icon={<Ticket size={22} color={colors.primary} />}
            value={String(data.summary.tickets)}
            title="Biljetter"
            text="Flygbuss & Sundra"
          />

          <MetricCard
            icon={<MessageCircle size={22} color={colors.primary} />}
            value={String(data.summary.newMessages)}
            title="Meddelanden"
            text="Nya ärenden"
          />
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <CheckCircle2 size={24} color={colors.primary} strokeWidth={2.6} />
          </View>

          <View style={styles.statusTextBox}>
            <Text style={styles.statusTitle}>Trafikläge just nu</Text>
            <Text style={styles.statusText}>
              Trafiken flyter på. Inga större störningar rapporterade.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Snabbval</Text>

        <View style={styles.quickGrid}>
          <QuickAction
            title="Ny offert"
            icon={<Plus size={21} color={colors.primary} />}
            onPress={() => router.push("/agent/offers" as any)}
          />
          <QuickAction
            title="Offerter"
            icon={<FileText size={21} color={colors.primary} />}
            onPress={() => router.push("/agent/offers" as any)}
          />
          <QuickAction
            title="Livekarta"
            icon={<Map size={21} color={colors.primary} />}
            onPress={() => router.push("/agent/live-map" as any)}
          />
          <QuickAction
            title="Boka biljett"
            icon={<Ticket size={21} color={colors.primary} />}
            onPress={() => router.push("/agent/tickets" as any)}
          />
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Senaste offerter</Text>
          <Pressable onPress={() => router.push("/agent/offers" as any)}>
            <Text style={styles.sectionLink}>Visa alla</Text>
          </Pressable>
        </View>

        {data.recentOffers.length === 0 ? (
          <EmptyCard text="Inga offerter hittades ännu." />
        ) : (
          data.recentOffers.map((item) => (
            <SmallRow key={`offer-${item.id}-${item.title}`} item={item} type="offer" />
          ))
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Senaste bokningar</Text>
        </View>

        {data.recentBookings.length === 0 ? (
          <EmptyCard text="Inga bokningar hittades ännu." />
        ) : (
          data.recentBookings.map((item) => (
            <SmallRow key={`booking-${item.id}-${item.title}`} item={item} type="booking" />
          ))
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Mina pågående körningar</Text>
        </View>

        <View style={styles.tripCard}>
          <View style={styles.tripIcon}>
            <Bus size={24} color={colors.primary} strokeWidth={2.5} />
          </View>

          <View style={styles.tripTextBox}>
            <Text style={styles.tripTitle}>Inga livekörningar kopplade ännu</Text>
            <Text style={styles.tripText}>
              När en buss kopplas till en bokning visas den här.
            </Text>
            <Text style={styles.tripMeta}>Nästa steg: koppla livekarta till riktiga körningar.</Text>
          </View>

          <Pressable style={styles.mapButton} onPress={() => router.push("/agent/live-map" as any)}>
            <Text style={styles.mapButtonText}>Karta</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function MetricCard({
  icon,
  value,
  title,
  text,
}: {
  icon: React.ReactNode;
  value: string;
  title: string;
  text: string;
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

function QuickAction({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickCard} onPress={onPress}>
      <View style={styles.quickIcon}>{icon}</View>
      <Text style={styles.quickText}>{title}</Text>
    </Pressable>
  );
}

function SmallRow({ item, type }: { item: AgentDashboardRow; type: "offer" | "booking" }) {
  return (
    <View style={styles.smallRow}>
      <View style={styles.smallIcon}>
        {type === "offer" ? (
          <FileText size={20} color={colors.primary} strokeWidth={2.5} />
        ) : (
          <CalendarDays size={20} color={colors.primary} strokeWidth={2.5} />
        )}
      </View>

      <View style={styles.smallTextBox}>
        <Text style={styles.smallTitle}>{item.title}</Text>
        <Text style={styles.smallText}>{item.subtitle}</Text>

        <View style={styles.smallMetaRow}>
          <Text style={styles.smallPill}>{item.status || "status saknas"}</Text>
          {item.date ? <Text style={styles.smallDate}>{formatAgentDate(item.date)}</Text> : null}
          {item.amount > 0 ? <Text style={styles.smallAmount}>{formatAgentMoney(item.amount)}</Text> : null}
        </View>
      </View>
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 110 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  kicker: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  title: { color: colors.text, fontSize: 27, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 13, fontWeight: "800", marginTop: 2 },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 20,
    marginBottom: 14,
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
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 10,
  },

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
  metricText: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 2 },

  statusCard: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statusTextBox: { flex: 1 },
  statusTitle: { color: colors.white, fontSize: 14, fontWeight: "900" },
  statusText: { color: "#DDEBE8", fontSize: 12, fontWeight: "700", lineHeight: 17, marginTop: 2 },

  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },
  sectionRow: {
    marginTop: 4,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLink: { color: colors.primary, fontSize: 12, fontWeight: "900" },

  quickGrid: { flexDirection: "row", gap: 9, marginBottom: 18 },
  quickCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
    alignItems: "center",
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  quickText: { color: colors.text, fontSize: 10.5, fontWeight: "900", textAlign: "center" },

  smallRow: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    flexDirection: "row",
    marginBottom: 9,
  },
  smallIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  smallTextBox: { flex: 1 },
  smallTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  smallText: { color: colors.textMuted, fontSize: 11.5, fontWeight: "800", marginTop: 2 },
  smallMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  smallPill: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10.5,
    fontWeight: "900",
  },
  smallDate: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800", paddingTop: 4 },
  smallAmount: { color: colors.primary, fontSize: 10.5, fontWeight: "900", paddingTop: 4 },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  emptyText: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },

  tripCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  tripIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  tripTextBox: { flex: 1 },
  tripTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  tripText: { color: colors.textMuted, fontSize: 11.5, fontWeight: "800", marginTop: 2 },
  tripMeta: { color: colors.primary, fontSize: 11, fontWeight: "900", marginTop: 4 },
  mapButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mapButtonText: { color: colors.primary, fontSize: 11, fontWeight: "900" },
});

import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import {
  Menu,
  Bell,
  CalendarDays,
  FileText,
  Bus,
  MessageSquare,
  CheckCircle2,
  Plus,
  Send,
  MapPin
} from "lucide-react-native";
import { colors } from "../../theme/colors";

const stats = [
  { title: "Dagens bokningar", value: "42", note: "+6 från igår", icon: CalendarDays },
  { title: "Aktiva offerter", value: "18", note: "+3 från igår", icon: FileText },
  { title: "Kommande avgångar", value: "24", note: "Idag", icon: Bus },
  { title: "Nya meddelanden", value: "7", note: "Olästa", icon: MessageSquare }
];

const bars = [
  { day: "Mån", value: 80 },
  { day: "Tis", value: 120 },
  { day: "Ons", value: 92 },
  { day: "Tor", value: 110 },
  { day: "Fre", value: 138 },
  { day: "Lör", value: 70 },
  { day: "Sön", value: 35 }
];

export default function DashboardScreen() {
  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Menu size={24} color={colors.text} />
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSub}>Översikt</Text>
          </View>
          <Bell size={23} color={colors.text} />
        </View>

        <Text style={styles.hello}>Hej Andreas! 👋</Text>
        <Text style={styles.muted}>Här är läget i dag.</Text>

        <View style={styles.statsGrid}>
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <View key={item.title} style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Icon size={18} color={colors.primary} />
                </View>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statTitle}>{item.title}</Text>
                <Text style={styles.statNote}>{item.note}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.trafficCard}>
          <View>
            <Text style={styles.trafficSmall}>Trafikläge idag</Text>
            <Text style={styles.trafficTitle}>Allt enligt plan</Text>
            <Text style={styles.trafficText}>Inga större störningar rapporterade.</Text>
          </View>
          <CheckCircle2 size={34} color={colors.goldSoft} />
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.sectionTitle}>Bokningar</Text>
              <Text style={styles.muted}>Vecka 20</Text>
            </View>
            <View style={styles.chartTotal}>
              <Text style={styles.chartTotalValue}>186</Text>
              <Text style={styles.chartTotalText}>Totalt</Text>
            </View>
          </View>

          <View style={styles.chart}>
            {bars.map((bar) => (
              <View key={bar.day} style={styles.barItem}>
                <View style={[styles.bar, { height: bar.value }]} />
                <Text style={styles.barLabel}>{bar.day}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Snabbval</Text>

        <View style={styles.quickGrid}>
          <QuickAction title="Skapa offert" icon={<FileText size={21} color={colors.primary} />} />
          <QuickAction title="Ny bokning" icon={<Plus size={21} color={colors.primary} />} />
          <QuickAction title="Skicka info" icon={<Send size={21} color={colors.primary} />} />
          <QuickAction title="Se trafik" icon={<MapPin size={21} color={colors.primary} />} />
        </View>
      </ScrollView>
    </View>
  );
}

function QuickAction({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <Pressable style={styles.quickCard}>
      <View style={styles.quickIcon}>{icon}</View>
      <Text style={styles.quickText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 110
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22
  },
  headerTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center"
  },
  headerSub: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2
  },
  hello: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  muted: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16
  },
  statCard: {
    width: "48.5%",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  statTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  statNote: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4
  },
  trafficCard: {
    marginTop: 14,
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  trafficSmall: {
    color: colors.goldSoft,
    fontSize: 12,
    fontWeight: "800"
  },
  trafficTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 5
  },
  trafficText: {
    color: "#DDEBE8",
    fontSize: 12,
    marginTop: 4
  },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    marginTop: 14,
    marginBottom: 18
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10
  },
  chartTotal: {
    alignItems: "flex-end"
  },
  chartTotalValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  chartTotalText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700"
  },
  chart: {
    height: 160,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 15
  },
  barItem: {
    alignItems: "center",
    justifyContent: "flex-end"
  },
  bar: {
    width: 22,
    borderRadius: 8,
    backgroundColor: colors.primary
  },
  barLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6
  },
  quickGrid: {
    flexDirection: "row",
    gap: 10
  },
  quickCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 15,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7
  },
  quickText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center"
  }
});

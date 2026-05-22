import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { Bus, CalendarDays, FileText, MessageSquare } from "lucide-react-native";
import { colors } from "../../theme/colors";

type Props = {
  todayBookings: number;
  todayBookingsDiff: number;
  activeOffers: number;
  activeOffersDiff: number;
  upcomingDepartures: number;
  unreadMessages: number;
  onTodayBookingsPress?: () => void;
  onActiveOffersPress?: () => void;
  onDeparturesPress?: () => void;
  onMessagesPress?: () => void;
};

function diffText(diff: number, fallback: string) {
  if (diff > 0) return `+${diff} från igår`;
  if (diff < 0) return `${diff} från igår`;
  return fallback;
}

export default function StatCards({
  todayBookings,
  todayBookingsDiff,
  activeOffers,
  activeOffersDiff,
  upcomingDepartures,
  unreadMessages,
  onTodayBookingsPress,
  onActiveOffersPress,
  onDeparturesPress,
  onMessagesPress,
}: Props) {
  const stats = [
    {
      title: "Dagens bokningar",
      value: String(todayBookings),
      note: diffText(todayBookingsDiff, "Oförändrat"),
      icon: CalendarDays,
      noteType: todayBookingsDiff >= 0 ? "positive" : "negative",
      onPress: onTodayBookingsPress,
    },
    {
      title: "Aktiva offerter",
      value: String(activeOffers),
      note: diffText(activeOffersDiff, "Oförändrat"),
      icon: FileText,
      noteType: activeOffersDiff >= 0 ? "positive" : "negative",
      onPress: onActiveOffersPress,
    },
    {
      title: "Kommande avgångar",
      value: String(upcomingDepartures),
      note: "Från idag",
      icon: Bus,
      noteType: "positive",
      onPress: onDeparturesPress,
    },
    {
      title: "Nya meddelanden",
      value: String(unreadMessages),
      note: unreadMessages === 1 ? "Oläst" : "Olästa",
      icon: MessageSquare,
      noteType: unreadMessages > 0 ? "warning" : "positive",
      onPress: onMessagesPress,
    },
  ];

  return (
    <View style={styles.grid}>
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <Pressable key={item.title} style={styles.card} onPress={item.onPress}>
            <View style={styles.topRow}>
              <View style={styles.iconBox}>
                <Icon size={18} color={colors.primary} strokeWidth={2.3} />
              </View>
              <Text style={styles.value}>{item.value}</Text>
            </View>

            <Text style={styles.title}>{item.title}</Text>
            <Text
              style={[
                styles.note,
                item.noteType === "negative" && styles.noteNegative,
                item.noteType === "warning" && styles.noteWarning,
              ]}
            >
              {item.note}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  card: {
    width: "48.5%",
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  title: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 10,
  },
  note: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  noteNegative: {
    color: colors.danger,
  },
  noteWarning: {
    color: colors.warning,
  },
});

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CalendarDays, ChevronRight, FileText, TicketCheck, Bus } from "lucide-react-native";
import { router } from "expo-router";
import { colors } from "../../theme/colors";
import type { AdminBookingFeedItem } from "../../types/bookings";

function getStatusStyle(statusKey: string) {
  if (statusKey === "confirmed") return { box: styles.statusConfirmed, text: styles.statusConfirmedText };
  if (statusKey === "answered" || statusKey === "open") return { box: styles.statusOpen, text: styles.statusOpenText };
  if (statusKey === "waiting" || statusKey === "incoming") return { box: styles.statusWaiting, text: styles.statusWaitingText };
  if (statusKey === "declined" || statusKey === "completed") return { box: styles.statusDeclined, text: styles.statusDeclinedText };
  return { box: styles.statusOpen, text: styles.statusOpenText };
}

function getIcon(kind: string) {
  if (kind.includes("ticket")) return TicketCheck;
  if (kind.includes("shuttle")) return Bus;
  if (kind === "offer") return FileText;
  return CalendarDays;
}

function formatDate(date: string) {
  if (!date) return "Datum saknas";

  const parsed = new Date(`${date}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatTime(start?: string, end?: string) {
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  return "Tid saknas";
}

type Props = {
  item: AdminBookingFeedItem;
};

export default function BookingCard({ item }: Props) {
  const status = getStatusStyle(item.statusKey);
  const Icon = getIcon(item.kind);

  function openDetails() {
    router.push({
      pathname: "/admin/booking-detail",
      params: {
        id: item.id,
        kind: item.kind,
      },
    });
  }

  return (
    <Pressable style={styles.card} onPress={openDetails}>
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <Icon size={22} color={colors.primary} strokeWidth={2.4} />
        </View>

        <View style={styles.main}>
          <View style={styles.typeRow}>
            <Text style={styles.sourceLabel}>{item.sourceLabel || "ÄRENDE"}</Text>
            {item.isArchived ? <Text style={styles.archiveLabel}>ARKIV</Text> : null}
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>

            <View style={[styles.statusPill, status.box]}>
              <Text style={[styles.statusText, status.text]}>{item.status}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            <Text style={styles.timeText}>{formatTime(item.startTime, item.endTime)}</Text>
          </View>

          <Text style={styles.passengers}>
            {item.passengers > 0 ? `${item.passengers} passagerare` : "Passagerare saknas"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.footerRow}>
        <Text style={styles.footerText} numberOfLines={1}>
          Kund: <Text style={styles.footerStrong}>{item.customer}</Text>
        </Text>

        <View style={styles.referenceBox}>
          <Text style={styles.referenceText}>Ref: {item.reference || item.id}</Text>
          <ChevronRight size={18} color={colors.text} strokeWidth={2.4} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 19,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 11,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  main: {
    flex: 1,
  },
  typeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 5,
  },
  sourceLabel: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontSize: 9.5,
    fontWeight: "900",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  archiveLabel: {
    alignSelf: "flex-start",
    backgroundColor: "#ECE7DC",
    color: colors.textMuted,
    fontSize: 9.5,
    fontWeight: "900",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
    paddingRight: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  statusConfirmed: { backgroundColor: colors.successSoft },
  statusConfirmedText: { color: colors.success },
  statusOpen: { backgroundColor: colors.infoSoft },
  statusOpenText: { color: colors.info },
  statusWaiting: { backgroundColor: colors.warningSoft },
  statusWaitingText: { color: "#9A6800" },
  statusDeclined: { backgroundColor: colors.dangerSoft },
  statusDeclinedText: { color: colors.danger },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },
  dateText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    width: 92,
  },
  timeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  passengers: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEAE2",
    marginTop: 13,
    marginBottom: 9,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: "700",
    paddingRight: 8,
  },
  footerStrong: {
    color: colors.text,
    fontWeight: "900",
  },
  referenceBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  referenceText: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: "800",
  },
});

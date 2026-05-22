import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import type { WeekBookingItem } from "../../types/dashboard";

type Props = {
  data: WeekBookingItem[];
};

export default function BookingsWeekCard({ data }: Props) {
  const safeData = data.length
    ? data
    : [
        { day: "Mån", count: 0 },
        { day: "Tis", count: 0 },
        { day: "Ons", count: 0 },
        { day: "Tor", count: 0 },
        { day: "Fre", count: 0 },
        { day: "Lör", count: 0 },
        { day: "Sön", count: 0 },
      ];

  const total = safeData.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...safeData.map((item) => item.count), 1);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bokningar</Text>
          <Text style={styles.subtitle}>Denna vecka</Text>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.total}>{total}</Text>
          <Text style={styles.totalText}>Totalt</Text>
        </View>
      </View>

      <View style={styles.chart}>
        {safeData.map((bar) => {
          const height = Math.max(12, Math.round((bar.count / maxCount) * 120));

          return (
            <View key={bar.day} style={styles.barItem}>
              <View style={[styles.bar, { height }]} />
              <Text style={styles.barValue}>{bar.count}</Text>
              <Text style={styles.barLabel}>{bar.day}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.trend}>
        Uppdateras från Helsingbuss Portal
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  totalBox: {
    alignItems: "flex-end",
  },
  total: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "900",
  },
  totalText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  chart: {
    height: 170,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 14,
  },
  barItem: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: 23,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  barValue: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 5,
  },
  barLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  trend: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 14,
  },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { DashboardSummary } from "@/mobile/types/dashboard";
import { Card } from "@/mobile/components/ui/Card";

export function KpiGrid({ summary }: { summary: DashboardSummary }) {
  const items = [
    { label: "Offerter (besvarade)", value: `${summary.offers.answeredValueSek.toLocaleString("sv-SE")} kr` },
    { label: "Godkända", value: `${summary.offers.approvedValueSek.toLocaleString("sv-SE")} kr` },
    { label: "Bokningar", value: `${summary.bookings.bookedValueSek.toLocaleString("sv-SE")} kr` },
    { label: "Genomförda", value: `${summary.bookings.completedValueSek.toLocaleString("sv-SE")} kr` },
  ];

  return (
    <View style={styles.grid}>
      {items.map((it) => (
        <Card key={it.label} style={styles.kpi}>
          <Text style={styles.kpiLabel}>{it.label}</Text>
          <Text style={styles.kpiValue}>{it.value}</Text>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  kpi: { width: "48%" },
  kpiLabel: { color: "rgba(255,255,255,0.75)", fontWeight: "700", fontSize: 12 },
  kpiValue: { color: "white", fontWeight: "900", fontSize: 16, marginTop: 8 },
});

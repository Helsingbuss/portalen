import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { OfferStatus } from "@/mobile/types/dashboard";

const ACCENT = "#1A545F";

const options: { label: string; value: OfferStatus | "alla" }[] = [
  { label: "Alla", value: "alla" },
  { label: "Inkomna", value: "inkommen" },
  { label: "Besvarade", value: "besvarad" },
  { label: "Godkända", value: "godkand" },
];

export function OfferFilterPills({
  value,
  onChange,
}: {
  value: OfferStatus | "alla";
  onChange: (v: OfferStatus | "alla") => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  pillActive: {
    backgroundColor: "rgba(26,84,95,0.55)",
    borderColor: "rgba(26,84,95,0.65)",
  },
  text: { color: "rgba(255,255,255,0.75)", fontWeight: "800", fontSize: 12 },
  textActive: { color: "white" },
});

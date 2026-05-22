import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CheckCircle2, TriangleAlert } from "lucide-react-native";
import { colors } from "../../theme/colors";

type Props = {
  status: string;
  text: string;
};

export default function TrafficStatusCard({ status, text }: Props) {
  const hasWarning =
    status.toLowerCase().includes("försening") ||
    status.toLowerCase().includes("störning") ||
    status.toLowerCase().includes("saknas");

  const Icon = hasWarning ? TriangleAlert : CheckCircle2;

  return (
    <View style={[styles.card, hasWarning && styles.warningCard]}>
      <View style={styles.textBlock}>
        <Text style={styles.kicker}>Trafikläge idag</Text>
        <Text style={styles.title}>{status}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>

      <View style={styles.iconCircle}>
        <Icon size={31} color={colors.goldSoft} strokeWidth={2.5} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    backgroundColor: colors.primary,
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  warningCard: {
    backgroundColor: "#5A3A12",
  },
  textBlock: {
    flex: 1,
  },
  kicker: {
    color: colors.goldSoft,
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    color: colors.white,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 5,
    letterSpacing: -0.4,
  },
  text: {
    color: "#DDEBE8",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },
});

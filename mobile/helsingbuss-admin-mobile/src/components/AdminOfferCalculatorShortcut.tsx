import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Calculator, ChevronRight } from "lucide-react-native";

import { colors } from "../theme/colors";

export default function AdminOfferCalculatorShortcut() {
  const params = useLocalSearchParams<{
    id?: string;
    offerId?: string;
    sourceId?: string;
  }>();

  const offerId = String(params.offerId || params.sourceId || params.id || "");

  if (!offerId) return null;

  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/admin/offer-calculator",
          params: { id: offerId },
        } as any)
      }
    >
      <View style={styles.iconBox}>
        <Calculator size={23} color={colors.primary} strokeWidth={2.5} />
      </View>

      <View style={styles.textBox}>
        <Text style={styles.title}>Offertkalkyl</Text>
        <Text style={styles.text}>
          Fyll i pris, spara kalkyl och skicka offert till kund.
        </Text>
      </View>

      <ChevronRight size={20} color={colors.textMuted} strokeWidth={2.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primarySoft,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textBox: {
    flex: 1,
  },
  title: {
    color: colors.primary,
    fontSize: 15.5,
    fontWeight: "900",
  },
  text: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3,
  },
});

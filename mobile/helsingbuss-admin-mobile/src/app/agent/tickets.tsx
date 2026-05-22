import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Plane, ShoppingBag, Ticket } from "lucide-react-native";
import { colors } from "../../theme/colors";

export default function AgentTicketsScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Ticket size={38} color={colors.goldSoft} />
          <Text style={styles.heroTitle}>Boka biljetter</Text>
          <Text style={styles.heroText}>
            Välj om du vill boka flygbussbiljett eller Sundra-resa.
          </Text>
        </View>

        <Pressable
          style={styles.bigCard}
          onPress={() => router.push("/agent/shuttle-booking" as any)}
        >
          <View style={styles.iconBox}>
            <Plane size={28} color={colors.primary} strokeWidth={2.5} />
          </View>

          <View style={styles.cardTextBox}>
            <Text style={styles.cardTitle}>Airport Shuttle</Text>
            <Text style={styles.cardText}>
              Boka flygbussbiljetter för kund.
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.bigCard}
          onPress={() => router.push("/agent/sundra-booking" as any)}
        >
          <View style={styles.iconBox}>
            <ShoppingBag size={28} color={colors.primary} strokeWidth={2.5} />
          </View>

          <View style={styles.cardTextBox}>
            <Text style={styles.cardTitle}>Sundra resor</Text>
            <Text style={styles.cardText}>
              Välj riktig resa, avgång, pris och platser.
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 110 },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 20,
    marginBottom: 18,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 12,
  },
  heroText: {
    color: "#DDEBE8",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 6,
  },

  bigCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  cardTextBox: { flex: 1 },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  cardText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 4,
  },
});

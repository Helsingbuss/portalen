import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MessageCircle } from "lucide-react-native";
import { colors } from "../../theme/colors";

export default function AgentChatScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <MessageCircle size={38} color={colors.goldSoft} />
          <Text style={styles.heroTitle}>Chatt & support</Text>
          <Text style={styles.heroText}>Här kommer agenten kunna chatta med kund och support.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kommande funktion</Text>
          <Text style={styles.cardText}>Vi kopplar chatt till offert och bokning i nästa steg.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 110 },
  heroCard: { backgroundColor: colors.primary, borderRadius: 26, padding: 20, marginBottom: 16 },
  heroTitle: { color: colors.white, fontSize: 25, fontWeight: "900", marginTop: 12 },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 6 },
  card: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 15 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  cardText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 4 },
});

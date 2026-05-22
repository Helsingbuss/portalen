import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Bus, Map } from "lucide-react-native";
import { colors } from "../../theme/colors";

export default function AgentLiveMapScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Map size={38} color={colors.goldSoft} />
          <Text style={styles.heroTitle}>Livekarta</Text>
          <Text style={styles.heroText}>Agenten ska bara se bussar kopplade till egna bokningar.</Text>
        </View>

        <View style={styles.mapMock}>
          <Text style={styles.mapText}>Karta kommer här</Text>
        </View>

        <BusCard title="HB-210 · Airport Shuttle" text="Helsingborg C → Kastrup · Försenad 10 min" />
        <BusCard title="HB-305 · Sundra resa" text="Helsingborg C → Ullared · I tid" />
      </ScrollView>
    </View>
  );
}

function BusCard({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.card}>
      <Bus size={22} color={colors.primary} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 110 },
  heroCard: { backgroundColor: colors.primary, borderRadius: 26, padding: 20, marginBottom: 16 },
  heroTitle: { color: colors.white, fontSize: 25, fontWeight: "900", marginTop: 12 },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 6 },
  mapMock: { height: 250, borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  mapText: { color: colors.textMuted, fontSize: 14, fontWeight: "900" },
  card: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 15, marginBottom: 10, flexDirection: "row", alignItems: "center" },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  cardText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 4 },
});

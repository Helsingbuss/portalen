import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ArrowLeft, ScanQrCode } from "lucide-react-native";
import { colors } from "../../theme/colors";

export default function ScannerScreen() {
  const params = useLocalSearchParams<{
    kind?: string;
    id?: string;
    reference?: string;
  }>();

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>

          <View>
            <Text style={styles.title}>Biljettscanner</Text>
            <Text style={styles.subtitle}>{params.reference || params.id || "Ingen referens"}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.iconBox}>
            <ScanQrCode size={44} color={colors.goldSoft} />
          </View>

          <Text style={styles.cardTitle}>Scanner kommer här</Text>
          <Text style={styles.cardText}>
            Nästa steg blir att koppla kameran, läsa QR-koder och markera biljetter som skannade.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Typ</Text>
            <Text style={styles.infoValue}>{params.kind || "Okänd"}</Text>

            <Text style={styles.infoLabel}>ID</Text>
            <Text style={styles.infoValue}>{params.id || "Saknas"}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 58,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 22,
    alignItems: "center",
  },
  iconBox: {
    width: 86,
    height: 86,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  cardTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  cardText: {
    color: "#DDEBE8",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },
  infoBox: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: 14,
    width: "100%",
    marginTop: 22,
  },
  infoLabel: {
    color: colors.goldSoft,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 7,
  },
  infoValue: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
});

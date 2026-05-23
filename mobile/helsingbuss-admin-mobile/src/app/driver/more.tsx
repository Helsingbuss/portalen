import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LogOut, RefreshCw, UserRoundCog } from "lucide-react-native";

import { colors } from "../../theme/colors";
import { supabase } from "../../lib/supabase";

export default function DriverMoreScreen() {
  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/" as any);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <UserRoundCog size={38} color={colors.goldSoft} />
          <Text style={styles.heroKicker}>FÖRARAPP</Text>
          <Text style={styles.heroTitle}>Mer</Text>
          <Text style={styles.heroText}>Inställningar, rollbyte och utloggning för förare.</Text>
        </View>

        <Pressable style={styles.card} onPress={() => router.push("/role-select" as any)}>
          <RefreshCw size={22} color={colors.primary} />
          <View style={styles.cardTextBox}>
            <Text style={styles.cardTitle}>Byt roll</Text>
            <Text style={styles.cardText}>Växla mellan admin, agent och förare.</Text>
          </View>
        </Pressable>

        <Pressable style={styles.logoutCard} onPress={signOut}>
          <LogOut size={22} color="#B42318" />
          <View style={styles.cardTextBox}>
            <Text style={styles.logoutTitle}>Logga ut</Text>
            <Text style={styles.logoutText}>Avsluta förarkontot och gå tillbaka till inloggningen.</Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },
  heroCard: { backgroundColor: colors.primary, borderRadius: 28, padding: 20, marginBottom: 14 },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginTop: 12, marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 28, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 7 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  logoutCard: {
    backgroundColor: "#FFF1F0",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#FFDAD6",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  cardTextBox: { flex: 1, marginLeft: 12 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  cardText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 3 },
  logoutTitle: { color: "#B42318", fontSize: 15, fontWeight: "900" },
  logoutText: { color: "#B42318", fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 3 },
});

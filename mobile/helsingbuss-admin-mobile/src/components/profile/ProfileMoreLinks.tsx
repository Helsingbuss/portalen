import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ShieldCheck, UserRound } from "lucide-react-native";

import { colors } from "../../theme/colors";

export default function ProfileMoreLinks({ mode }: { mode: "admin" | "agent" }) {
  const profilePath = mode === "agent" ? "/agent/profile" : "/admin/profile";

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.card} onPress={() => router.push(profilePath as any)}>
        <View style={styles.iconBox}>
          <UserRound size={22} color={colors.primary} strokeWidth={2.5} />
        </View>

        <View style={styles.textBox}>
          <Text style={styles.title}>Min profil</Text>
          <Text style={styles.text}>Kontaktuppgifter, roll och konto</Text>
        </View>
      </Pressable>

      {mode === "agent" ? (
        <Pressable style={styles.card} onPress={() => router.push("/agent/agent-rules" as any)}>
          <View style={styles.iconBox}>
            <ShieldCheck size={22} color={colors.primary} strokeWidth={2.5} />
          </View>

          <View style={styles.textBox}>
            <Text style={styles.title}>Agentregler</Text>
            <Text style={styles.text}>Regler för offerter, betalning och kundkontakt</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
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
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textBox: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
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

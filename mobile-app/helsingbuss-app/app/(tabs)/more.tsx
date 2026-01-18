import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/mobile/theme/useTheme";

export default function More() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, padding: 20 }}>
      <Text style={{ color: t.text, fontSize: 26, fontWeight: "900" }}>Mer</Text>
      <Text style={{ color: t.muted, marginTop: 6 }}>Här kommer din meny.</Text>

      <Pressable
        onPress={() => router.push("/settings")}
        style={{ marginTop: 16, backgroundColor: t.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: t.cardBorder }}
      >
        <Text style={{ color: t.text, fontWeight: "900" }}>Inställningar</Text>
        <Text style={{ color: t.muted, marginTop: 4 }}>Välj tema (mörkt/ljust)</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/account")}
        style={{ marginTop: 12, backgroundColor: t.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: t.cardBorder }}
      >
        <Text style={{ color: t.text, fontWeight: "900" }}>Konto</Text>
        <Text style={{ color: t.muted, marginTop: 4 }}>Profil, logga ut</Text>
      </Pressable>
    </View>
  );
}
import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/mobile/store/auth";

const BG = "#1D2937";
const CARD = "rgba(255,255,255,0.06)";
const ACCENT = "#1A545F";

export default function Account() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const doLogout = () => {
    logout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG, padding: 20 }}>
      <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>Konto</Text>

      <View style={{ marginTop: 14, backgroundColor: CARD, borderRadius: 16, padding: 14 }}>
        <Text style={{ color: "rgba(255,255,255,0.75)" }}>Namn</Text>
        <Text style={{ color: "white", fontSize: 18, fontWeight: "800", marginTop: 4 }}>
          {user?.name ?? "-"}
        </Text>

        <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 12 }}>Roll</Text>
        <Text style={{ color: "white", fontSize: 16, fontWeight: "700", marginTop: 4 }}>
          {user?.role ?? "-"}
        </Text>
      </View>

      <Pressable
        onPress={() => router.push("/settings")}
        style={{ marginTop: 14, backgroundColor: CARD, borderRadius: 16, padding: 14 }}
      >
        <Text style={{ color: "white", fontSize: 16, fontWeight: "800" }}>Inställningar</Text>
      </Pressable>

      <Pressable
        onPress={doLogout}
        style={{ marginTop: 14, backgroundColor: ACCENT, borderRadius: 16, padding: 14, alignItems: "center" }}
      >
        <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }}>Logga ut</Text>
      </Pressable>
    </View>
  );
}
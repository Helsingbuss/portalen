import React from "react";
import { View, Text, Pressable } from "react-native";
import { useAuthStore } from "@/mobile/store/auth";
import { router } from "expo-router";

const BG = "#1D2937";
const ACCENT = "#1A545F";

export default function Login() {
  const login = useAuthStore((s) => s.login);

  const submit = () => {
    login();
    router.replace("/(tabs)/overview");
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG, padding: 24, justifyContent: "center" }}>
      <Text style={{ color: "white", fontSize: 28, fontWeight: "900" }}>Helsingbuss</Text>
      <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 8 }}>
        Demo-inloggning (investerare)
      </Text>

      <Pressable
        onPress={submit}
        style={{ marginTop: 18, backgroundColor: ACCENT, paddingVertical: 14, borderRadius: 14, alignItems: "center" }}
      >
        <Text style={{ color: "white", fontSize: 16, fontWeight: "800" }}>Logga in</Text>
      </Pressable>
    </View>
  );
}
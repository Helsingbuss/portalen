import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../src/mobile/store/auth";

const BG = "#1D2937";
const CARD = "rgba(255,255,255,0.06)";
const STROKE = "rgba(255,255,255,0.10)";
const WHITE = "#fff";
const MUTED = "rgba(255,255,255,0.70)";

export default function LoginScreen() {
  const loginDemo = useAuthStore((s) => s.loginDemo);

  const onLogin = () => {
    loginDemo();
    router.replace("/(tabs)");
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG, padding: 18, justifyContent: "center" }}>
      <View style={{ backgroundColor: CARD, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: STROKE }}>
        <Text style={{ color: WHITE, fontSize: 34, fontWeight: "900" }}>Helsingbuss</Text>
        <Text style={{ color: MUTED, marginTop: 8, fontSize: 15 }}>
          Demo-inloggning (tills vi kopplar riktig auth)
        </Text>

        <Pressable
          onPress={onLogin}
          style={{
            marginTop: 16,
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            borderColor: STROKE,
            alignItems: "center",
          }}
        >
          <Text style={{ color: WHITE, fontWeight: "900", fontSize: 16 }}>Logga in (demo)</Text>
        </Pressable>
      </View>
    </View>
  );
}

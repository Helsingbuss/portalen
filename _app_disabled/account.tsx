import React from "react";
import { View, Text } from "react-native";
import { useAuthStore } from "@/mobile/store/auth";

export default function Account() {
  const user = useAuthStore((s) => s.user);

  return (
    <View style={{ flex: 1, backgroundColor: "#1D2937", padding: 20 }}>
      <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>Konto</Text>
      <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 12 }}>
        Namn: {user?.name ?? "-"}
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
        Roll: {user?.role ?? "-"}
      </Text>
    </View>
  );
}
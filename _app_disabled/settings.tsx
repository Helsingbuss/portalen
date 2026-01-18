import React from "react";
import { View, Text } from "react-native";

export default function Settings() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1D2937", padding: 20 }}>
      <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>Inställningar</Text>
      <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 8 }}>
        Här lägger vi senare: notiser, språk, tema, säkerhet, PIN/FaceID.
      </Text>
    </View>
  );
}
import { View, Text } from "react-native";

export default function OrdersTab() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1D2937", paddingTop: 60, paddingHorizontal: 16 }}>
      <Text style={{ color: "white", fontSize: 26, fontWeight: "900" }}>Körorder</Text>
      <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 8 }}>
        Kopplas till riktiga körorder i nästa steg.
      </Text>
    </View>
  );
}

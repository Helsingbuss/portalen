import { View, Text } from "react-native";

export default function BookingsTab() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1D2937", paddingTop: 60, paddingHorizontal: 16 }}>
      <Text style={{ color: "white", fontSize: 26, fontWeight: "900" }}>Bokningar</Text>
      <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 8 }}>
        Kopplas till riktiga bokningar i nästa steg.
      </Text>
    </View>
  );
}

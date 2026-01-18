import React from "react";
import { View, Text, StyleSheet } from "react-native";

const BG = "#1D2937";

export default function OrdersScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.h1}>Körorder</Text>
      <Text style={styles.dim}>Nästa steg: koppla /api/mobile/driver-orders</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, paddingTop: 54, paddingHorizontal: 16 },
  h1: { color: "white", fontSize: 28, fontWeight: "900", marginBottom: 10 },
  dim: { color: "rgba(255,255,255,0.65)" },
});

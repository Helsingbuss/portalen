import React from "react";
import { Text, StyleSheet, View } from "react-native";

export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title: { color: "white", fontSize: 16, fontWeight: "900" },
});

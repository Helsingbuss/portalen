import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export default function BookingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bokningar</Text>
      <Text style={styles.text}>Här kommer bokningar, offerter och kundflöden.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 22, paddingTop: 70 },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  text: { color: colors.textMuted, marginTop: 8, fontSize: 15 }
});

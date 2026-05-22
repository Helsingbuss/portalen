import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/colors";

export default function SplashScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
      (navigation as any).replace("Intro");
    }, 1200);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <LinearGradient
      colors={[colors.primaryDark, colors.primary]}
      style={styles.container}
    >
      <Text style={styles.logo}>Helsingbuss</Text>
      <Text style={styles.subtitle}>Admin app för portal & drift</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  logo: {
    color: colors.white,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1
  },
  subtitle: {
    color: colors.goldSoft,
    marginTop: 10,
    fontSize: 15,
    fontWeight: "600"
  }
});

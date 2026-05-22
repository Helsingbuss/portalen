import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { ShieldCheck } from "lucide-react-native";
import { colors } from "../../theme/colors";

export default function IntroScreen() {
  const navigation = useNavigation();

  return (
    <LinearGradient
      colors={[colors.background, "#FFFFFF"]}
      style={styles.container}
    >
      <View style={styles.logoBox}>
        <Text style={styles.logo}>Helsingbuss</Text>
        <Text style={styles.logoSub}>Admin app för portal & drift</Text>
      </View>

      <View style={styles.iconCircle}>
        <ShieldCheck size={42} color={colors.gold} strokeWidth={2.4} />
      </View>

      <Text style={styles.title}>Full kontroll – var du än är.</Text>

      <Text style={styles.text}>
        Hantera bokningar, offerter, avgångar, personal och trafikinfo direkt i mobilen.
      </Text>

      <Pressable style={styles.button} onPress={() => (navigation as any).navigate("Login")}>
        <Text style={styles.buttonText}>Logga in</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 28,
    justifyContent: "center"
  },
  logoBox: {
    alignItems: "center",
    marginBottom: 50
  },
  logo: {
    color: colors.primaryDark,
    fontSize: 34,
    fontWeight: "800"
  },
  logoSub: {
    color: colors.textMuted,
    marginTop: 6,
    fontSize: 14,
    fontWeight: "600"
  },
  iconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.primary,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28
  },
  title: {
    color: colors.text,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.8
  },
  text: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 14,
    marginBottom: 34
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800"
  }
});

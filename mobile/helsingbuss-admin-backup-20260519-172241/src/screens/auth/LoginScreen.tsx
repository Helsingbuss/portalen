import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Mail, LockKeyhole } from "lucide-react-native";
import { colors } from "../../theme/colors";

type Props = {
  onLogin: () => void;
};

export default function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        style={styles.top}
      >
        <Text style={styles.logo}>Helsingbuss</Text>
        <Text style={styles.subtitle}>Logga in i adminappen</Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.title}>Välkommen tillbaka</Text>
        <Text style={styles.text}>Fyll i dina uppgifter för att komma åt portal & drift.</Text>

        <View style={styles.inputBox}>
          <Mail size={19} color={colors.textMuted} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="E-post"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.inputBox}>
          <LockKeyhole size={19} color={colors.textMuted} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Lösenord"
            secureTextEntry
            style={styles.input}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <Pressable style={styles.button} onPress={onLogin}>
          <Text style={styles.buttonText}>Logga in</Text>
        </Pressable>

        <Text style={styles.forgot}>Glömt lösenord?</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background
  },
  top: {
    height: 260,
    paddingTop: 82,
    paddingHorizontal: 28
  },
  logo: {
    color: colors.white,
    fontSize: 34,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.goldSoft,
    marginTop: 8,
    fontSize: 15,
    fontWeight: "600"
  },
  card: {
    flex: 1,
    marginTop: -52,
    marginHorizontal: 18,
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "900"
  },
  text: {
    color: colors.textMuted,
    marginTop: 7,
    marginBottom: 24,
    fontSize: 14,
    lineHeight: 21
  },
  inputBox: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FAFAF8",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: colors.text,
    fontSize: 15
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 17,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900"
  },
  forgot: {
    color: colors.primary,
    textAlign: "center",
    marginTop: 18,
    fontWeight: "700"
  }
});

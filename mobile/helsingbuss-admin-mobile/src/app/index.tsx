import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";
import { redirectUserByRole } from "../services/authRoleService";

const TEXT = {
  appText: "Admin app f\u00f6r portal & drift",
  headline: "Full kontroll \u2013 var du \u00e4n \u00e4r.",
  subheadline: "Hantera bokningar, offerter, avg\u00e5ngar och drift direkt i mobilen.",
  login: "Logga in",
  loginHelp: "Anv\u00e4nd ditt konto f\u00f6r att komma \u00e5t Helsingbuss Portal.",
  email: "E-post",
  password: "L\u00f6senord",
  passwordPlaceholder: "Ditt l\u00f6senord",
  forgotPassword: "Gl\u00f6mt l\u00f6senord?",
  secure: "S\u00e4ker anslutning till Helsingbuss Portal",
};

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    try {
      const { data } = await supabase.auth.getSession();

      if (data.session?.user) {
        const role = await redirectUserByRole();

        if (role !== "blocked") {
          return;
        }
      }
    } catch (error: any) {
      console.log("checkExistingSession error:", error?.message || error);
    } finally {
      setIsCheckingSession(false);
    }
  }

  async function handleLogin() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      Alert.alert("Saknar uppgifter", "Fyll i e-post och l\u00f6senord.");
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        Alert.alert("Kunde inte logga in", error.message);
        return;
      }

      const role = await redirectUserByRole();

      if (role === "blocked") {
        await supabase.auth.signOut();

        Alert.alert(
          "Saknar beh\u00f6righet",
          "Kontot finns, men saknar aktiv roll i appen."
        );
      }
    } catch (error: any) {
      Alert.alert("Fel vid inloggning", error?.message || "F\u00f6rs\u00f6k igen.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert("E-post saknas", "Fyll i din e-postadress f\u00f6rst.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

    if (error) {
      Alert.alert("Kunde inte skicka \u00e5terst\u00e4llning", error.message);
      return;
    }

    Alert.alert(
      "Mejl skickat",
      "Om adressen finns registrerad skickas ett mejl med instruktioner."
    );
  }

  if (isCheckingSession) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#D7A84A" />
        <Text style={styles.loadingText}>Kontrollerar inloggning...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.logoText}>Helsingbuss</Text>
            <Text style={styles.appText}>{TEXT.appText}</Text>
            <Text style={styles.headline}>{TEXT.headline}</Text>
            <Text style={styles.subheadline}>{TEXT.subheadline}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLogo}>Helsingbuss</Text>

            <Text style={styles.formTitle}>{TEXT.login}</Text>
            <Text style={styles.formText}>{TEXT.loginHelp}</Text>

            <Text style={styles.label}>{TEXT.email}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="namn@helsingbuss.se"
              placeholderTextColor="#8B9694"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
            />

            <Text style={styles.label}>{TEXT.password}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={TEXT.passwordPlaceholder}
              placeholderTextColor="#8B9694"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            <Pressable
              style={[styles.loginButton, isLoading && styles.disabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>{TEXT.login}</Text>
              )}
            </Pressable>

            <Pressable onPress={handleForgotPassword} disabled={isLoading}>
              <Text style={styles.forgotText}>{TEXT.forgotPassword}</Text>
            </Pressable>

            <View style={styles.secureBox}>
              <Text style={styles.secureText}>{TEXT.secure}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F3EE",
  },
  keyboard: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#003C3A",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  hero: {
    backgroundColor: "#003C3A",
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 110,
    alignItems: "center",
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: -1.4,
  },
  appText: {
    color: "#EFE1B6",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 22,
    textAlign: "center",
  },
  headline: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 34,
    letterSpacing: -0.8,
  },
  subheadline: {
    color: "#DDEBE8",
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 22,
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 18,
    marginTop: -72,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 26,
    shadowColor: "#001F1E",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardLogo: {
    color: "#1D2937",
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 28,
  },
  formTitle: {
    color: "#003C3A",
    fontSize: 31,
    fontWeight: "900",
    marginBottom: 12,
  },
  formText: {
    color: "#65706E",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    marginBottom: 24,
  },
  label: {
    color: "#0E2927",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 6,
  },
  input: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDE4E1",
    backgroundColor: "#FAFAF7",
    paddingHorizontal: 16,
    color: "#1D2937",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 18,
  },
  loginButton: {
    backgroundColor: "#004C49",
    borderRadius: 18,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 22,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  forgotText: {
    color: "#004C49",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 22,
  },
  secureBox: {
    backgroundColor: "#F0EEE9",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  secureText: {
    color: "#6A6E68",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  disabled: {
    opacity: 0.65,
  },
});

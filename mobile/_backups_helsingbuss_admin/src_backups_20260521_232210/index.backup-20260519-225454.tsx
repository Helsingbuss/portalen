import { Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

const logoWhite = require("../assets/logo/logo_helsingbuss_vit.png");
const logoColor = require("../assets/logo/logo_helsingbuss_farg.png");

const colors = {
  primary: "#003C3A",
  primaryDark: "#002B29",
  primaryDeep: "#001F1E",
  gold: "#C99A3A",
  goldSoft: "#F7E7BF",
  background: "#F6F4EF",
  card: "#FFFFFF",
  border: "#E5E0D8",
  text: "#102322",
  textMuted: "#6B7674",
  white: "#FFFFFF",
  danger: "#D9534F",
  dangerSoft: "#FFE7E4",
};

export default function IndexScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const splashOpacity = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.88)).current;
  const loginOpacity = useRef(new Animated.Value(0)).current;
  const loginTranslate = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    let mounted = true;

    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession();

      if (data.session && mounted) {
        setShowSplash(false);
        router.replace("/dashboard");
      }
    }

    checkExistingSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(splashOpacity, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(splashScale, {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 450,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);

        Animated.parallel([
          Animated.timing(loginOpacity, {
            toValue: 1,
            duration: 550,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(loginTranslate, {
            toValue: 0,
            duration: 550,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 1900);

    return () => clearTimeout(timer);
  }, []);

  async function handleLogin() {
    setLoginError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setLoginError("Fyll i både e-post och lösenord.");
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setLoginError("Fel e-post eller lösenord. Kontrollera uppgifterna och försök igen.");
        return;
      }

      if (!data.session) {
        setLoginError("Inloggningen lyckades inte. Försök igen.");
        return;
      }

      router.replace("/dashboard");
    } catch (error) {
      console.log("Login error:", error);
      setLoginError("Något gick fel vid inloggningen. Försök igen.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setLoginError("Skriv in din e-post först, så kan du återställa lösenordet.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

    if (error) {
      setLoginError("Kunde inte skicka återställning just nu.");
      return;
    }

    Alert.alert(
      "Återställning skickad",
      "Om e-posten finns i systemet skickas en länk för att återställa lösenordet."
    );
  }

  if (showSplash) {
    return (
      <LinearGradient
        colors={[colors.primaryDeep, colors.primaryDark, colors.primary]}
        style={styles.splash}
      >
        <Animated.View
          style={[
            styles.splashInner,
            {
              opacity: splashOpacity,
              transform: [{ scale: splashScale }],
            },
          ]}
        >
          <View style={styles.splashLogoBox}>
            <Image source={logoWhite} style={styles.splashLogo} resizeMode="contain" />
          </View>

          <Text style={styles.splashTitle}>Admin app</Text>
          <Text style={styles.splashText}>Portal & drift</Text>

          <View style={styles.loadingLine}>
            <View style={styles.loadingFill} />
          </View>
        </Animated.View>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.primaryDeep, colors.primaryDark, colors.primary]}
          style={styles.hero}
        >
          <Animated.View
            style={{
              opacity: loginOpacity,
              transform: [{ translateY: loginTranslate }],
              alignItems: "center",
            }}
          >
            <Image source={logoWhite} style={styles.heroLogo} resizeMode="contain" />

            <Text style={styles.heroKicker}>Admin app för portal & drift</Text>

            <Text style={styles.heroTitle}>Full kontroll – var du än är.</Text>

            <Text style={styles.heroText}>
              Hantera bokningar, offerter, avgångar och drift direkt i mobilen.
            </Text>
          </Animated.View>
        </LinearGradient>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: loginOpacity,
              transform: [{ translateY: loginTranslate }],
            },
          ]}
        >
          <Image source={logoColor} style={styles.cardLogo} resizeMode="contain" />

          <Text style={styles.title}>Logga in</Text>

          <Text style={styles.text}>
            Använd ditt adminkonto för att komma åt Helsingbuss Portal.
          </Text>

          {loginError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-post</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="namn@helsingbuss.se"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lösenord</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Ditt lösenord"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={styles.input}
            />
          </View>

          <Pressable
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Loggar in..." : "Logga in"}
            </Text>
          </Pressable>

          <Pressable onPress={handleForgotPassword}>
            <Text style={styles.forgot}>Glömt lösenord?</Text>
          </Pressable>

          <View style={styles.secureBox}>
            <Text style={styles.secureText}>Säker anslutning till Helsingbuss Portal</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  splashInner: {
    alignItems: "center",
    paddingHorizontal: 26,
  },
  splashLogoBox: {
    width: 245,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  splashLogo: {
    width: 245,
    height: 90,
  },
  splashTitle: {
    color: colors.white,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  splashText: {
    color: colors.goldSoft,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 6,
  },
  loadingLine: {
    width: 120,
    height: 4,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginTop: 34,
    overflow: "hidden",
  },
  loadingFill: {
    width: "72%",
    height: "100%",
    borderRadius: 99,
    backgroundColor: colors.gold,
  },

  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  hero: {
    minHeight: 385,
    paddingTop: 76,
    paddingHorizontal: 26,
    alignItems: "center",
  },
  heroLogo: {
    width: 260,
    height: 82,
  },
  heroKicker: {
    color: colors.goldSoft,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 34,
    letterSpacing: -0.8,
  },
  heroText: {
    color: "#D8E7E4",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 315,
  },
  card: {
    marginTop: -48,
    marginHorizontal: 18,
    backgroundColor: colors.card,
    borderRadius: 30,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  cardLogo: {
    width: 185,
    height: 48,
    alignSelf: "center",
    marginBottom: 18,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  text: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 22,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F4B8B1",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 7,
  },
  input: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FAFAF8",
    paddingHorizontal: 15,
    color: colors.text,
    fontSize: 15,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 17,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900",
  },
  forgot: {
    color: colors.primary,
    textAlign: "center",
    fontWeight: "900",
    marginTop: 18,
  },
  secureBox: {
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: "#F5F3EE",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  secureText: {
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
});

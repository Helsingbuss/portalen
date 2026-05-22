import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  Send,
  ShieldAlert,
} from "lucide-react-native";

import { colors } from "../../theme/colors";

Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    } as any),
});

export default function NotificationsScreen() {
  const [permissionStatus, setPermissionStatus] = useState("Kontrollerar...");
  const [isLoading, setIsLoading] = useState(false);

  async function checkPermission() {
    const permissions = await Notifications.getPermissionsAsync();

    if (permissions.granted) {
      setPermissionStatus("Tillåtet");
      return true;
    }

    if (permissions.status === "denied") {
      setPermissionStatus("Nekat");
      return false;
    }

    setPermissionStatus("Inte aktiverat");
    return false;
  }

  useEffect(() => {
    checkPermission();
  }, []);

  async function requestPermission() {
    try {
      setIsLoading(true);

      const result = await Notifications.requestPermissionsAsync();

      if (result.granted) {
        setPermissionStatus("Tillåtet");

        Alert.alert(
          "Notiser är aktiverade",
          "Nu kan appen visa notiser på telefonen."
        );
      } else {
        setPermissionStatus("Nekat");

        Alert.alert(
          "Notiser är inte aktiverade",
          "Du behöver tillåta notiser i telefonens inställningar för att de ska fungera."
        );
      }
    } catch (error: any) {
      Alert.alert("Fel", error?.message || "Kunde inte aktivera notiser.");
    } finally {
      setIsLoading(false);
    }
  }

  async function sendLocalTestNotification() {
    try {
      setIsLoading(true);

      const hasPermission = await checkPermission();

      if (!hasPermission) {
        Alert.alert(
          "Notiser är inte aktiverade",
          "Tryck först på Aktivera notiser."
        );
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Helsingbuss",
          body: "Testnotis fungerar ✅",
          sound: true,
        },
        trigger: null,
      });

      Alert.alert(
        "Testnotis skickad",
        "Om du inte ser den direkt, lås skärmen eller dra ner notiscenter."
      );
    } catch (error: any) {
      Alert.alert("Kunde inte skicka testnotis", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
    }
  }

  const isAllowed = permissionStatus === "Tillåtet";

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Notiser</Text>
            <Text style={styles.subtitle}>Aktivera och testa pushnotiser</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <BellRing size={38} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>NOTISER</Text>
          <Text style={styles.heroTitle}>Testa att mobilen kan visa notiser.</Text>
          <Text style={styles.heroText}>
            Börja med att aktivera notiser. Tryck sedan på testknappen för att skicka en lokal testnotis direkt.
          </Text>
        </View>

        <View style={styles.statusCard}>
          <View style={[styles.statusIcon, isAllowed ? styles.statusIconOk : styles.statusIconWarning]}>
            {isAllowed ? (
              <CheckCircle2 size={25} color={colors.primary} strokeWidth={2.5} />
            ) : (
              <ShieldAlert size={25} color={colors.danger} strokeWidth={2.5} />
            )}
          </View>

          <View style={styles.statusTextBox}>
            <Text style={styles.statusTitle}>Status</Text>
            <Text style={[styles.statusValue, !isAllowed && styles.statusValueWarning]}>
              {permissionStatus}
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.primaryButton, isLoading && styles.disabled]}
          onPress={requestPermission}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <BellRing size={20} color={colors.white} strokeWidth={2.5} />
              <Text style={styles.primaryButtonText}>Aktivera notiser</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={[styles.testButton, isLoading && styles.disabled]}
          onPress={sendLocalTestNotification}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Send size={20} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.testButtonText}>Testa lokal notis</Text>
            </>
          )}
        </Pressable>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Om notisen inte syns</Text>
          <Text style={styles.infoText}>
            Kontrollera att notiser är tillåtna i telefonens inställningar. På vissa telefoner syns notisen tydligare om appen ligger i bakgrunden eller om skärmen är låst.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 110 },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 25, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 },

  heroCard: { backgroundColor: colors.primary, borderRadius: 26, padding: 20, marginBottom: 16 },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 24, lineHeight: 30, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 7 },

  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statusIconOk: { backgroundColor: colors.primarySoft },
  statusIconWarning: { backgroundColor: colors.dangerSoft },
  statusTextBox: { flex: 1 },
  statusTitle: { color: colors.textMuted, fontSize: 12, fontWeight: "900" },
  statusValue: { color: colors.primary, fontSize: 18, fontWeight: "900", marginTop: 2 },
  statusValueWarning: { color: colors.danger },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 10,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },

  testButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 16,
  },
  testButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },

  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
  },
  infoTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  infoText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 5,
  },

  disabled: { opacity: 0.65 },
});

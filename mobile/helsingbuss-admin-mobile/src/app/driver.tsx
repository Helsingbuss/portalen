import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { LocationSubscription } from "expo-location";
import { router } from "expo-router";
import {
  Bus,
  CheckCircle2,
  LogOut,
  MapPin,
  Navigation,
  ScanQrCode,
} from "lucide-react-native";

import { colors } from "../theme/colors";
import { supabase } from "../lib/supabase";
import {
  requestDriverLocationPermission,
  sendDriverLiveLocation,
  stopDriverLiveLocation,
  watchDriverPosition,
} from "../services/driverLocationService";

const activeRun = {
  sourceKind: "driver_run",
  sourceId: "driver-test-run-001",
  vehicleName: "HB-210",
  driverName: "Chaufför test",
  title: "Airport Shuttle – Helsingborg till Kastrup",
  routeText: "Helsingborg → Kastrup",
};

export default function DriverScreen() {
  const watcherRef = useRef<LocationSubscription | null>(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");
  const [lastPosition, setLastPosition] = useState("");
  const [updates, setUpdates] = useState(0);

  async function startRun() {
    try {
      setIsStarting(true);

      const allowed = await requestDriverLocationPermission();

      if (!allowed) {
        Alert.alert(
          "Platsbehörighet saknas",
          "Appen behöver platsbehörighet för att kunna visa bussen på driftkartan."
        );
        return;
      }

      const watcher = await watchDriverPosition(
        async (location) => {
          const lat = location.coords.latitude;
          const lng = location.coords.longitude;
          const speedKmh =
            typeof location.coords.speed === "number" && location.coords.speed !== null
              ? Math.max(0, Math.round(location.coords.speed * 3.6))
              : null;

          const heading =
            typeof location.coords.heading === "number" && location.coords.heading !== null
              ? Math.round(location.coords.heading)
              : null;

          await sendDriverLiveLocation({
            ...activeRun,
            lat,
            lng,
            speedKmh,
            heading,
            status: "active",
            delayMinutes: 0,
          });

          const now = new Date();

          setLastUpdate(
            now.toLocaleTimeString("sv-SE", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          );

          setLastPosition(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          setUpdates((value) => value + 1);
        },
        (error) => {
          console.log("Driver location watch error:", error);
        }
      );

      watcherRef.current = watcher;
      setIsTracking(true);

      Alert.alert(
        "Körning startad",
        "Din position skickas nu till Helsingbuss Admin Drift."
      );
    } catch (error) {
      console.log("Start run error:", error);
      Alert.alert("Fel", "Kunde inte starta GPS-spårning just nu.");
    } finally {
      setIsStarting(false);
    }
  }

  async function stopRun() {
    try {
      watcherRef.current?.remove();
      watcherRef.current = null;

      await stopDriverLiveLocation(activeRun.sourceKind, activeRun.sourceId);

      setIsTracking(false);

      Alert.alert("Körning stoppad", "Bussen visas inte längre som aktiv på kartan.");
    } catch (error) {
      console.log("Stop run error:", error);
      Alert.alert("Fel", "Kunde inte stoppa körningen.");
    }
  }

  async function logout() {
    watcherRef.current?.remove();
    watcherRef.current = null;

    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Chaufför</Text>
            <Text style={styles.subtitle}>Dagens körning</Text>
          </View>

          <Pressable style={styles.logoutButton} onPress={logout}>
            <LogOut size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Bus size={35} color={colors.goldSoft} strokeWidth={2.5} />
          </View>

          <Text style={styles.heroLabel}>Aktuell körning</Text>
          <Text style={styles.heroTitle}>{activeRun.title}</Text>
          <Text style={styles.heroText}>{activeRun.routeText}</Text>

          <View style={styles.vehiclePill}>
            <Text style={styles.vehiclePillText}>Buss {activeRun.vehicleName}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <InfoRow
            icon={<Navigation size={21} color={colors.primary} />}
            title="GPS-status"
            text={isTracking ? "Aktiv – skickar position" : "Inte aktiv"}
            success={isTracking}
          />

          <InfoRow
            icon={<MapPin size={21} color={colors.primary} />}
            title="Senaste position"
            text={lastPosition || "Ingen position skickad ännu"}
          />

          <InfoRow
            icon={<CheckCircle2 size={21} color={colors.primary} />}
            title="Senast uppdaterad"
            text={lastUpdate || "Inte uppdaterad"}
          />

          <InfoRow
            icon={<CheckCircle2 size={21} color={colors.primary} />}
            title="Antal skickade positioner"
            text={`${updates}`}
            noBorder
          />
        </View>

        {!isTracking ? (
          <Pressable
            style={[styles.primaryButton, isStarting && styles.buttonDisabled]}
            onPress={startRun}
            disabled={isStarting}
          >
            {isStarting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Starta körning</Text>
            )}
          </Pressable>
        ) : (
          <Pressable style={styles.stopButton} onPress={stopRun}>
            <Text style={styles.stopButtonText}>Stoppa körning</Text>
          </Pressable>
        )}

        <Pressable
          style={styles.scannerButton}
          onPress={() =>
            router.push({
              pathname: "/admin/scanner",
              params: {
                kind: activeRun.sourceKind,
                id: activeRun.sourceId,
                reference: activeRun.vehicleName,
              },
            } as any)
          }
        >
          <ScanQrCode size={22} color={colors.primary} strokeWidth={2.5} />
          <Text style={styles.scannerButtonText}>Öppna biljettscanner</Text>
        </Pressable>

        <Text style={styles.notice}>
          Detta är första versionen. I nästa steg kopplar vi chaufförens riktiga körningar från portalen.
        </Text>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  title,
  text,
  success,
  noBorder,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  success?: boolean;
  noBorder?: boolean;
}) {
  return (
    <View style={[styles.infoRow, noBorder && styles.noBorder]}>
      <View style={styles.infoIcon}>{icon}</View>

      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={[styles.infoText, success && styles.successText]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  logoutButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 20,
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroLabel: {
    color: colors.goldSoft,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 5,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroText: {
    color: "#DDEBE8",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 7,
  },
  vehiclePill: {
    alignSelf: "flex-start",
    backgroundColor: colors.gold,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 14,
  },
  vehiclePillText: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: "900",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 3,
  },
  successText: {
    color: colors.success,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 19,
    paddingVertical: 17,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900",
  },
  stopButton: {
    backgroundColor: colors.danger,
    borderRadius: 19,
    paddingVertical: 17,
    alignItems: "center",
    marginBottom: 10,
  },
  stopButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  scannerButton: {
    backgroundColor: colors.card,
    borderRadius: 19,
    paddingVertical: 16,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  scannerButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  notice: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 10,
  },
});

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  ArrowLeft,
  BusFront,
  CheckCircle2,
  Keyboard,
  QrCode,
  RefreshCw,
  Ticket,
  XCircle,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  getMyDriverOrders,
  type DriverOrder,
} from "../../services/driverOrdersService";
import {
  checkInDriverOrderPassenger,
  getMyDriverOrderPassengers,
  type DriverOrderPassenger,
} from "../../services/driverPassengersService";

export default function DriverScanScreen() {
  const params = useLocalSearchParams<{ orderId?: string }>();
  const orderId = String(params.orderId || "");

  const [permission, requestPermission] = useCameraPermissions();

  const [order, setOrder] = useState<DriverOrder | null>(null);
  const [passengers, setPassengers] = useState<DriverOrderPassenger[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [lastResult, setLastResult] = useState<{
    ok: boolean;
    title: string;
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const loadData = useCallback(async () => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const orders = await getMyDriverOrders();
      const foundOrder = orders.find((item) => item.id === orderId) || null;
      setOrder(foundOrder);

      const result = await getMyDriverOrderPassengers(orderId);
      setPassengers(result);
    } catch (error: any) {
      Alert.alert("Kunde inte hämta scannerdata", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isTicketBasedOrder = useMemo(() => {
    const sourceType = String(order?.sourceType || "").toLowerCase();

    return (
      sourceType.includes("sundra") ||
      sourceType.includes("shuttle") ||
      sourceType.includes("airport") ||
      sourceType.includes("flygbuss") ||
      sourceType.includes("ticket")
    );
  }, [order?.sourceType]);

  const stats = useMemo(() => {
    const checkedIn = passengers.filter((item) => item.checkedIn).length;

    return {
      total: passengers.length,
      checkedIn,
      remaining: passengers.length - checkedIn,
    };
  }, [passengers]);

  async function checkInByCode(code: string) {
    const cleanCode = String(code || "").trim();

    if (!cleanCode) {
      Alert.alert("Kod saknas", "Skanna eller skriv in en biljettkod.");
      setHasScanned(false);
      return;
    }

    try {
      setIsCheckingIn(true);

      const passenger = passengers.find(
        (item) => item.ticketCode.toLowerCase() === cleanCode.toLowerCase()
      );

      await checkInDriverOrderPassenger({
        orderId,
        ticketCode: cleanCode,
      });

      setLastResult({
        ok: true,
        title: "Incheckad",
        text: passenger
          ? `${passenger.passengerName} är nu incheckad.`
          : `Biljett ${cleanCode} är nu incheckad.`,
      });

      setManualCode("");
      await loadData();
    } catch (error: any) {
      setLastResult({
        ok: false,
        title: "Hittades inte",
        text: error?.message || "Biljetten/resenären kunde inte checkas in.",
      });
    } finally {
      setIsCheckingIn(false);

      setTimeout(() => {
        setHasScanned(false);
      }, 1300);
    }
  }

  function handleBarcodeScanned(result: any) {
    if (hasScanned || isCheckingIn) return;

    setHasScanned(true);
    checkInByCode(String(result?.data || ""));
  }

  if (!orderId) {
    return (
      <View style={styles.centerScreen}>
        <QrCode size={36} color={colors.primary} />
        <Text style={styles.emptyTitle}>Välj en körning först</Text>
        <Text style={styles.emptyText}>
          Öppna en Sundra- eller flygbusskörning och tryck på Skanna.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Hämtar scanner...</Text>
      </View>
    );
  }

  if (!isTicketBasedOrder) {
    return (
      <View style={styles.centerScreen}>
        <BusFront size={38} color={colors.primary} />
        <Text style={styles.emptyTitle}>Scanner behövs inte</Text>
        <Text style={styles.emptyText}>
          Detta är en vanlig körorder. Scanner används bara för Sundra Resor och flygbuss.
        </Text>

        <Pressable style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Gå tillbaka</Text>
        </Pressable>
      </View>
    );
  }

  const hasPermission = permission?.granted === true;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>

          <Text style={styles.topTitle}>Skanna biljett</Text>

          <Pressable style={styles.iconButton} onPress={loadData}>
            <RefreshCw size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <QrCode size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>FÖRARAPP</Text>
          <Text style={styles.heroTitle}>Biljettskanning</Text>
          <Text style={styles.heroText}>
            {order?.title || "Körning"} · {stats.checkedIn} av {stats.total} incheckade
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard title="Totalt" value={String(stats.total)} />
          <StatCard title="Incheckade" value={String(stats.checkedIn)} />
          <StatCard title="Kvar" value={String(stats.remaining)} />
        </View>

        {lastResult ? (
          <View style={[styles.resultCard, lastResult.ok ? styles.resultCardOk : styles.resultCardError]}>
            {lastResult.ok ? (
              <CheckCircle2 size={24} color="#1F7A4D" strokeWidth={2.5} />
            ) : (
              <XCircle size={24} color="#B42318" strokeWidth={2.5} />
            )}

            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.resultTitle, lastResult.ok ? styles.resultTitleOk : styles.resultTitleError]}>
                {lastResult.title}
              </Text>
              <Text style={[styles.resultText, lastResult.ok ? styles.resultTextOk : styles.resultTextError]}>
                {lastResult.text}
              </Text>
            </View>
          </View>
        ) : null}

        {!permission ? (
          <View style={styles.cameraFallbackCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.cameraFallbackText}>Kontrollerar kamerabehörighet...</Text>
          </View>
        ) : !hasPermission ? (
          <View style={styles.cameraFallbackCard}>
            <QrCode size={32} color={colors.primary} />
            <Text style={styles.cameraFallbackTitle}>Kamerabehörighet krävs</Text>
            <Text style={styles.cameraFallbackText}>
              Tillåt kamera för att kunna skanna QR-koder.
            </Text>

            <Pressable style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText}>Tillåt kamera</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cameraCard}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr"] as any,
              }}
              onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
            />

            <View style={styles.scanFrame} />

            <Text style={styles.cameraHint}>
              Placera QR-koden i rutan
            </Text>
          </View>
        )}

        <View style={styles.manualCard}>
          <View style={styles.manualTitleRow}>
            <Keyboard size={20} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.manualTitle}>Manuell biljettkod</Text>
          </View>

          <TextInput
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="Skriv eller klistra in biljettkod"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="none"
          />

          <Pressable
            style={[styles.primaryButton, isCheckingIn && styles.disabled]}
            onPress={() => checkInByCode(manualCode)}
            disabled={isCheckingIn}
          >
            {isCheckingIn ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Ticket size={20} color={colors.white} strokeWidth={2.5} />
            )}
            <Text style={styles.primaryButtonText}>Checka in biljett</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push(`/driver/passengers?orderId=${orderId}` as any)}
        >
          <Text style={styles.secondaryButtonText}>Visa resenärslista</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },

  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: "800", marginTop: 12 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginTop: 12 },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 5,
    textAlign: "center",
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
  },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginTop: 12, marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 28, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 7 },

  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
  },
  statValue: { color: colors.primary, fontSize: 22, fontWeight: "900" },
  statTitle: { color: colors.textMuted, fontSize: 10.5, fontWeight: "900", marginTop: 3 },

  resultCard: {
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  resultCardOk: { backgroundColor: "#DDF6E8" },
  resultCardError: { backgroundColor: "#FFF1F0" },
  resultTitle: { fontSize: 14, fontWeight: "900" },
  resultTitleOk: { color: "#1F7A4D" },
  resultTitleError: { color: "#B42318" },
  resultText: { fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 2 },
  resultTextOk: { color: "#1F7A4D" },
  resultTextError: { color: "#B42318" },

  cameraCard: {
    height: 330,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: 14,
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  scanFrame: {
    position: "absolute",
    top: 72,
    left: 52,
    right: 52,
    height: 185,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: colors.goldSoft,
  },
  cameraHint: {
    position: "absolute",
    bottom: 18,
    left: 16,
    right: 16,
    color: colors.white,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "900",
  },

  cameraFallbackCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: "center",
    marginBottom: 14,
  },
  cameraFallbackTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
  },
  cameraFallbackText: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 5,
    textAlign: "center",
  },

  manualCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  manualTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  manualTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 7,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 13,
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 52,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 8 },

  secondaryButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { color: colors.primary, fontSize: 14, fontWeight: "900" },

  disabled: { opacity: 0.65 },
});

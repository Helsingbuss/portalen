import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Audio } from "expo-av";
import { router } from "expo-router";
import {
  DriverScanResult,
  scanDriverTicket,
} from "@/services/driverScannerService";

const successSound = require("../../../assets/sounds/scanner-success.wav");
const errorSound = require("../../../assets/sounds/scanner-error.wav");

function formatDateTime(value?: string | null) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function isApproved(result: DriverScanResult | null) {
  return result?.status === "approved";
}

function isWarning(result: DriverScanResult | null) {
  return result?.status === "wrong_departure" || result?.status === "not_paid";
}

function resultColors(result: DriverScanResult | null) {
  if (isApproved(result)) {
    return {
      background: "#dcfce7",
      border: "#22c55e",
      iconBg: "#16a34a",
      icon: "✓",
      title: "#14532d",
      text: "#166534",
    };
  }

  if (isWarning(result)) {
    return {
      background: "#fef3c7",
      border: "#f59e0b",
      iconBg: "#d97706",
      icon: "!",
      title: "#78350f",
      text: "#92400e",
    };
  }

  return {
    background: "#fee2e2",
    border: "#ef4444",
    iconBg: "#dc2626",
    icon: "×",
    title: "#7f1d1d",
    text: "#991b1b",
  };
}

async function playFeedback(ok: boolean) {
  try {
    Vibration.vibrate(ok ? 80 : [0, 120, 80, 120]);

    const { sound } = await Audio.Sound.createAsync(ok ? successSound : errorSound, {
      shouldPlay: true,
    });

    setTimeout(() => {
      sound.unloadAsync().catch(() => {});
    }, 900);
  } catch {
    // Ljud får aldrig stoppa scanning.
  }
}

export default function DriverScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [result, setResult] = useState<DriverScanResult | null>(null);
  const lastScannedRef = useRef("");

  const colors = useMemo(() => resultColors(result), [result]);

  const handleBarcodeScanned = useCallback(
    async ({ data }: any) => {
      const qrData = String(data || "").trim();

      if (!qrData || isProcessing || isLocked) return;
      if (lastScannedRef.current === qrData) return;

      lastScannedRef.current = qrData;
      setIsProcessing(true);
      setIsLocked(true);

      try {
        const scanResult = await scanDriverTicket(qrData);
        setResult(scanResult);
        await playFeedback(scanResult.status === "approved");
      } catch (e: any) {
        const errorResult: DriverScanResult = {
          ok: false,
          status: "invalid",
          title: "Kunde inte kontrollera biljetten",
          message: e?.message || "Ett tekniskt fel uppstod vid scanning.",
        };

        setResult(errorResult);
        await playFeedback(false);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, isLocked]
  );

  function scanAgain() {
    lastScannedRef.current = "";
    setResult(null);
    setIsLocked(false);
  }

  if (!permission) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="white" />
        <Text style={{ color: "white", marginTop: 12 }}>Kontrollerar kamerabehörighet...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f4f6f8", padding: 20, justifyContent: "center" }}>
        <View style={{ backgroundColor: "white", borderRadius: 24, padding: 22 }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: "#0f172a" }}>
            Kamerabehörighet behövs
          </Text>
          <Text style={{ marginTop: 8, color: "#64748b", lineHeight: 20 }}>
            För att scanna biljetter behöver förarappen tillgång till kameran.
          </Text>

          <Pressable
            onPress={requestPermission}
            style={{
              marginTop: 18,
              backgroundColor: "#194C66",
              borderRadius: 16,
              padding: 15,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>Tillåt kamera</Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={{ marginTop: 14, alignItems: "center" }}>
            <Text style={{ color: "#194C66", fontWeight: "800" }}>Tillbaka</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <View style={{ padding: 18, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 14 }}>
          <Text style={{ color: "white", fontSize: 15, fontWeight: "800" }}>Tillbaka</Text>
        </Pressable>

        <Text style={{ color: "white", fontSize: 28, fontWeight: "900" }}>
          Scanna biljett
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 5, lineHeight: 20 }}>
          Rikta kameran mot QR-koden. Resultatet visas direkt med ljud och tydlig markering.
        </Text>
      </View>

      <View style={{ flex: 1, margin: 18, marginTop: 6, borderRadius: 28, overflow: "hidden", backgroundColor: "#111827" }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={isLocked ? undefined : handleBarcodeScanned}
        />

        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 32,
            right: 32,
            top: "28%",
            height: 220,
            borderWidth: 3,
            borderColor: "rgba(255,255,255,0.9)",
            borderRadius: 28,
          }}
        />

        {isProcessing && (
          <View
            style={{
              position: "absolute",
              left: 20,
              right: 20,
              bottom: 20,
              borderRadius: 22,
              backgroundColor: "rgba(15,23,42,0.92)",
              padding: 18,
              alignItems: "center",
            }}
          >
            <ActivityIndicator color="white" />
            <Text style={{ color: "white", marginTop: 10, fontWeight: "800" }}>
              Kontrollerar biljett...
            </Text>
          </View>
        )}
      </View>

      {result && (
        <View
          style={{
            marginHorizontal: 18,
            marginBottom: 18,
            borderRadius: 28,
            backgroundColor: colors.background,
            borderWidth: 2,
            borderColor: colors.border,
            padding: 18,
          }}
        >
          <View style={{ flexDirection: "row", gap: 14 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                backgroundColor: colors.iconBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "white", fontSize: 36, fontWeight: "900", lineHeight: 42 }}>
                {colors.icon}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.title, fontSize: 22, fontWeight: "900" }}>
                {result.title}
              </Text>
              <Text style={{ color: colors.text, marginTop: 5, lineHeight: 20 }}>
                {result.message}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 16, gap: 7 }}>
            {result.passengerName && (
              <Text style={{ color: colors.text, fontWeight: "800" }}>
                Passagerare: {result.passengerName}
              </Text>
            )}

            {result.tripTitle && (
              <Text style={{ color: colors.text, fontWeight: "800" }}>
                Resa: {result.tripTitle}
              </Text>
            )}

            {result.bookingNumber && (
              <Text style={{ color: colors.text, fontWeight: "800" }}>
                Bokningsnummer: {result.bookingNumber}
              </Text>
            )}

            {result.seatNumbers?.length ? (
              <Text style={{ color: colors.text, fontWeight: "800" }}>
                Säte: {result.seatNumbers.join(", ")}
              </Text>
            ) : null}

            {result.firstScannedAt && (
              <Text style={{ color: colors.text, fontWeight: "800" }}>
                Scannades tidigare: {formatDateTime(result.firstScannedAt)}
              </Text>
            )}
          </View>

          <Pressable
            onPress={scanAgain}
            style={{
              marginTop: 18,
              backgroundColor: "#0f172a",
              borderRadius: 18,
              padding: 15,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>
              Scanna nästa biljett
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

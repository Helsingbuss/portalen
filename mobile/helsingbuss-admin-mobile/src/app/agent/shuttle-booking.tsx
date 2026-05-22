import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Plane, Save } from "lucide-react-native";

import { colors } from "../../theme/colors";
import { agentCreateShuttleBooking } from "../../services/agentWorkflowService";

export default function AgentShuttleBookingScreen() {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [fromStop, setFromStop] = useState("Helsingborg C");
  const [toStop, setToStop] = useState("Kastrup Airport");
  const [travelDate, setTravelDate] = useState("");
  const [travelTime, setTravelTime] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [ticketType, setTicketType] = useState("single");
  const [isSaving, setIsSaving] = useState(false);

  const totalPrice = useMemo(() => {
    const count = Number(passengers || 1) || 1;
    const base = ticketType === "return" ? 398 : 249;
    return String(count * base);
  }, [passengers, ticketType]);

  async function save() {
    if (!customerName.trim() || !travelDate.trim()) {
      Alert.alert("Saknar uppgifter", "Fyll i kundnamn och resdatum.");
      return;
    }

    try {
      setIsSaving(true);

      await agentCreateShuttleBooking({
        customerName,
        customerEmail,
        customerPhone,
        fromStop,
        toStop,
        travelDate,
        travelTime,
        passengers,
        ticketType,
        totalPrice,
      });

      Alert.alert("Flygbuss bokad", "Agentbokningen är skapad.");
      router.back();
    } catch (error: any) {
      Alert.alert("Kunde inte boka", error?.message || "Försök igen.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Boka flygbuss" text="Sälj Airport Shuttle-biljett från agentappen." />

        <Field label="Kundnamn" value={customerName} onChangeText={setCustomerName} placeholder="Kundnamn" />
        <Field label="E-post" value={customerEmail} onChangeText={setCustomerEmail} placeholder="kund@mail.se" />
        <Field label="Telefon" value={customerPhone} onChangeText={setCustomerPhone} placeholder="070..." />
        <Field label="Från" value={fromStop} onChangeText={setFromStop} placeholder="Helsingborg C" />
        <Field label="Till" value={toStop} onChangeText={setToStop} placeholder="Kastrup Airport" />
        <Field label="Datum" value={travelDate} onChangeText={setTravelDate} placeholder="YYYY-MM-DD" />
        <Field label="Tid" value={travelTime} onChangeText={setTravelTime} placeholder="HH:MM" />
        <Field label="Antal resenärer" value={passengers} onChangeText={setPassengers} placeholder="1" keyboardType="numeric" />

        <View style={styles.optionRow}>
          <Pressable
            style={[styles.option, ticketType === "single" && styles.optionActive]}
            onPress={() => setTicketType("single")}
          >
            <Text style={[styles.optionText, ticketType === "single" && styles.optionTextActive]}>Enkel</Text>
          </Pressable>

          <Pressable
            style={[styles.option, ticketType === "return" && styles.optionActive]}
            onPress={() => setTicketType("return")}
          >
            <Text style={[styles.optionText, ticketType === "return" && styles.optionTextActive]}>Tur & retur</Text>
          </Pressable>
        </View>

        <View style={styles.priceBox}>
          <Text style={styles.priceTitle}>Totalpris</Text>
          <Text style={styles.priceValue}>{totalPrice} kr</Text>
        </View>

        <Pressable style={[styles.primaryButton, isSaving && styles.disabled]} onPress={save} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color={colors.white} /> : <Save size={20} color={colors.white} />}
          <Text style={styles.primaryButtonText}>Skapa bokning</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Header({ title, text }: { title: string; text: string }) {
  return (
    <>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={22} color={colors.text} />
      </Pressable>

      <View style={styles.heroCard}>
        <Plane size={38} color={colors.goldSoft} />
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroText}>{text}</Text>
      </View>
    </>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: any) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        keyboardType={keyboardType || "default"}
        autoCapitalize="none"
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroCard: { backgroundColor: colors.primary, borderRadius: 26, padding: 20, marginBottom: 18 },
  heroTitle: { color: colors.white, fontSize: 25, fontWeight: "900", marginTop: 12 },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 6 },
  label: { color: colors.text, fontSize: 12, fontWeight: "900", marginBottom: 7, marginTop: 6 },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 13,
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  optionRow: { flexDirection: "row", gap: 10, marginTop: 6, marginBottom: 12 },
  option: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { color: colors.textMuted, fontSize: 12, fontWeight: "900" },
  optionTextActive: { color: colors.white },
  priceBox: { backgroundColor: colors.primary, borderRadius: 20, padding: 16, marginBottom: 12 },
  priceTitle: { color: colors.goldSoft, fontSize: 12, fontWeight: "900" },
  priceValue: { color: colors.white, fontSize: 28, fontWeight: "900", marginTop: 3 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 8 },
  disabled: { opacity: 0.65 },
});

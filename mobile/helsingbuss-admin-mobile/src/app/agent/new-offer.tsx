import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, FileText, Save } from "lucide-react-native";

import { colors } from "../../theme/colors";
import { agentCreateOffer } from "../../services/agentWorkflowService";

export default function AgentNewOfferScreen() {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [passengers, setPassengers] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (!customerName.trim() || !departure.trim() || !destination.trim() || !departureDate.trim()) {
      Alert.alert("Saknar uppgifter", "Fyll i kund, från, till och datum.");
      return;
    }

    try {
      setIsSaving(true);

      const result = await agentCreateOffer({
        customerName,
        customerEmail,
        customerPhone,
        departure,
        destination,
        departureDate,
        departureTime,
        passengers,
        notes,
      });

      Alert.alert("Offert skapad", "Offerten har lagts in som inkommen.");

      router.replace({
        pathname: "/agent/offer-detail",
        params: { id: result.offerId },
      } as any);
    } catch (error: any) {
      Alert.alert("Kunde inte skapa offert", error?.message || "Försök igen.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Skapa ny offert" text="Lägg in en ny offertförfrågan som agent." />

        <Field label="Kundnamn" value={customerName} onChangeText={setCustomerName} placeholder="Ex. Anna Andersson" />
        <Field label="E-post" value={customerEmail} onChangeText={setCustomerEmail} placeholder="kund@mail.se" />
        <Field label="Telefon" value={customerPhone} onChangeText={setCustomerPhone} placeholder="070..." />
        <Field label="Från" value={departure} onChangeText={setDeparture} placeholder="Ex. Helsingborg C" />
        <Field label="Till" value={destination} onChangeText={setDestination} placeholder="Ex. Gekås Ullared" />
        <Field label="Datum" value={departureDate} onChangeText={setDepartureDate} placeholder="YYYY-MM-DD" />
        <Field label="Tid" value={departureTime} onChangeText={setDepartureTime} placeholder="HH:MM" />
        <Field label="Passagerare" value={passengers} onChangeText={setPassengers} placeholder="Ex. 50" keyboardType="numeric" />

        <Text style={styles.label}>Anteckning</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Önskemål, stopp, typ av resa..."
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.textArea]}
          multiline
        />

        <Pressable style={[styles.primaryButton, isSaving && styles.disabled]} onPress={save} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color={colors.white} /> : <Save size={20} color={colors.white} />}
          <Text style={styles.primaryButtonText}>Skapa offert</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Header({ title, text }: { title: string; text: string }) {
  return (
    <>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <FileText size={38} color={colors.goldSoft} />
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroText}>{text}</Text>
      </View>
    </>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
}) {
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
  header: { marginBottom: 14 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
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
  textArea: { minHeight: 90, paddingTop: 13, textAlignVertical: "top" },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 10,
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 8 },
  disabled: { opacity: 0.65 },
});

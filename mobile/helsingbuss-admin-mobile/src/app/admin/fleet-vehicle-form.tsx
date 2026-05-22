import React, { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Bus, Save } from "lucide-react-native";

import { colors } from "../../theme/colors";
import { saveVehicle } from "../../services/fleetManageService";

export default function FleetVehicleFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    model?: string;
    km?: string;
    nextService?: string;
    status?: string;
  }>();

  const isEdit = Boolean(params.id);

  const [vehicleCode, setVehicleCode] = useState(String(params.name || ""));
  const [registrationNumber, setRegistrationNumber] = useState(String(params.name || ""));
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState(String(params.model || ""));
  const [vehicleType, setVehicleType] = useState("Turistbuss");
  const [mileageKm, setMileageKm] = useState(String(params.km || "0").replace(/\s/g, ""));
  const [nextServiceKm, setNextServiceKm] = useState(String(params.nextService || "").replace(/\s/g, "").replace("km", ""));
  const [status, setStatus] = useState(String(params.status || "available"));
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!vehicleCode.trim()) {
      Alert.alert("Fordon saknas", "Fyll i fordonsnummer, till exempel HB-123.");
      return;
    }

    try {
      setIsSaving(true);

      await saveVehicle({
        id: params.id,
        vehicleCode,
        registrationNumber,
        brand,
        model,
        vehicleType,
        mileageKm: Number(mileageKm || 0),
        nextServiceKm: Number(nextServiceKm || 0),
        status,
        notes,
      });

      Alert.alert(
        isEdit ? "Fordon uppdaterat" : "Fordon skapat",
        isEdit ? "Fordonsinformationen har sparats." : "Nytt fordon har lagts till.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/admin/fleet" as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Kunde inte spara", error?.message || "Kontrollera uppgifterna.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable style={styles.iconButton} onPress={() => router.back()}>
              <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
            </Pressable>

            <View>
              <Text style={styles.title}>{isEdit ? "Redigera fordon" : "Lägg till fordon"}</Text>
              <Text style={styles.subtitle}>Flotta, status och service</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Bus size={34} color={colors.goldSoft} strokeWidth={2.5} />
            </View>

            <Text style={styles.heroKicker}>FORDON</Text>
            <Text style={styles.heroTitle}>Håll fordonsflottan uppdaterad.</Text>
            <Text style={styles.heroText}>
              Ange fordonsnummer, modell, mätarställning och serviceintervall.
            </Text>
          </View>

          <View style={styles.card}>
            <InputField label="Fordonsnummer" value={vehicleCode} onChangeText={setVehicleCode} placeholder="HB-123" />
            <InputField label="Registreringsnummer" value={registrationNumber} onChangeText={setRegistrationNumber} placeholder="ABC123" />
            <InputField label="Fabrikat" value={brand} onChangeText={setBrand} placeholder="Mercedes-Benz" />
            <InputField label="Modell" value={model} onChangeText={setModel} placeholder="Tourismo" />
            <InputField label="Fordonstyp" value={vehicleType} onChangeText={setVehicleType} placeholder="Turistbuss" />

            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <InputField label="Km" value={mileageKm} onChangeText={setMileageKm} placeholder="82310" keyboardType="number-pad" />
              </View>

              <View style={styles.column}>
                <InputField label="Nästa service km" value={nextServiceKm} onChangeText={setNextServiceKm} placeholder="9000" keyboardType="number-pad" />
              </View>
            </View>

            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.statusRow}>
              <StatusButton label="Tillgänglig" value="available" active={status === "available"} onPress={setStatus} />
              <StatusButton label="Service" value="service_soon" active={status === "service_soon"} onPress={setStatus} />
              <StatusButton label="I trafik" value="in_traffic" active={status === "in_traffic"} onPress={setStatus} />
            </View>

            <InputField label="Notering" value={notes} onChangeText={setNotes} placeholder="Intern notering..." multiline />
          </View>

          <Pressable style={[styles.saveButton, isSaving && styles.disabled]} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Save size={21} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.saveButtonText}>Spara fordon</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad";
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType || "default"}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

function StatusButton({
  label,
  value,
  active,
  onPress,
}: {
  label: string;
  value: string;
  active: boolean;
  onPress: (value: string) => void;
}) {
  return (
    <Pressable style={[styles.statusButton, active && styles.statusButtonActive]} onPress={() => onPress(value)}>
      <Text style={[styles.statusButtonText, active && styles.statusButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
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
  title: { color: colors.text, fontSize: 25, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 },
  heroCard: { backgroundColor: colors.primary, borderRadius: 26, padding: 20, marginBottom: 18 },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 24, lineHeight: 30, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 7 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  inputWrap: { marginBottom: 13 },
  inputLabel: { color: colors.text, fontSize: 12, fontWeight: "900", marginBottom: 7 },
  input: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  inputMultiline: { minHeight: 86, paddingTop: 12, textAlignVertical: "top" },
  twoColumns: { flexDirection: "row", gap: 10 },
  column: { flex: 1 },
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 13 },
  statusButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    alignItems: "center",
  },
  statusButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusButtonText: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  statusButtonTextActive: { color: colors.white },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 19,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  saveButtonText: { color: colors.white, fontSize: 15, fontWeight: "900", marginLeft: 8 },
  disabled: { opacity: 0.7 },
});

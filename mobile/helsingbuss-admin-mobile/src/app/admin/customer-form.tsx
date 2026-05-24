import React, { useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Save, UserRound } from "lucide-react-native";

import { colors } from "../../theme/colors";
import { saveCustomer } from "../../services/crmService";

export default function CustomerFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    customerType?: string;
    companyName?: string;
    orgNumber?: string;
    email?: string;
    phone?: string;
    city?: string;
    notes?: string;
  }>();

  const isEdit = Boolean(params.id);

  const [customerType, setCustomerType] = useState(String(params.customerType || "private"));
  const [name, setName] = useState(String(params.name || ""));
  const [companyName, setCompanyName] = useState(String(params.companyName || ""));
  const [orgNumber, setOrgNumber] = useState(String(params.orgNumber || ""));
  const [email, setEmail] = useState(String(params.email || ""));
  const [phone, setPhone] = useState(String(params.phone || ""));
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState(String(params.city || ""));
  const [notes, setNotes] = useState(String(params.notes || ""));
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Namn saknas", "Fyll i kundens namn.");
      return;
    }

    try {
      setIsSaving(true);

      const saved = await saveCustomer({
        id: params.id,
        customerType,
        name,
        companyName,
        orgNumber,
        email,
        phone,
        address,
        postalCode,
        city,
        notes,
        status: "active",
      });

      Alert.alert(
        isEdit ? "Kund uppdaterad" : "Kund skapad",
        "Kundinformationen har sparats.",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace({
                pathname: "/admin/customer-detail",
                params: { id: saved.id },
              } as any),
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
              <Text style={styles.title}>{isEdit ? "Redigera kund" : "Lägg till kund"}</Text>
              <Text style={styles.subtitle}>Kundregister och kontaktuppgifter</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <UserRound size={34} color={colors.goldSoft} strokeWidth={2.5} />
            </View>

            <Text style={styles.heroKicker}>CRM</Text>
            <Text style={styles.heroTitle}>Samla kundens uppgifter på ett ställe.</Text>
            <Text style={styles.heroText}>
              Koppla senare kunden till bokningar, offerter, betalningar och kommunikation.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.inputLabel}>Kundtyp</Text>
            <View style={styles.statusRow}>
              <TypeButton label="Privat" value="private" active={customerType === "private"} onPress={setCustomerType} />
              <TypeButton label="Företag" value="company" active={customerType === "company"} onPress={setCustomerType} />
              <TypeButton label="Förening" value="association" active={customerType === "association"} onPress={setCustomerType} />
            </View>

            <InputField label="Namn / kontaktperson" value={name} onChangeText={setName} placeholder="Anna Svensson" />

            {customerType !== "private" ? (
              <>
                <InputField label="Företag / förening" value={companyName} onChangeText={setCompanyName} placeholder="Företag AB" />
                <InputField label="Org.nr" value={orgNumber} onChangeText={setOrgNumber} placeholder="556..." />
              </>
            ) : null}

            <InputField label="E-post" value={email} onChangeText={setEmail} placeholder="kund@example.se" keyboardType="email-address" />
            <InputField label="Telefon" value={phone} onChangeText={setPhone} placeholder="+467..." keyboardType="phone-pad" />
            <InputField label="Adress" value={address} onChangeText={setAddress} placeholder="Gata 1" />

            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <InputField label="Postnr" value={postalCode} onChangeText={setPostalCode} placeholder="25200" />
              </View>

              <View style={styles.column}>
                <InputField label="Ort" value={city} onChangeText={setCity} placeholder="Helsingborg" />
              </View>
            </View>

            <InputField label="Intern notering" value={notes} onChangeText={setNotes} placeholder="Skriv notering..." multiline />
          </View>

          <Pressable style={[styles.saveButton, isSaving && styles.disabled]} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Save size={21} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.saveButtonText}>Spara kund</Text>
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
  keyboardType?: "default" | "email-address" | "phone-pad";
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
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

function TypeButton({
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
    <Pressable style={[styles.typeButton, active && styles.typeButtonActive]} onPress={() => onPress(value)}>
      <Text style={[styles.typeButtonText, active && styles.typeButtonTextActive]}>{label}</Text>
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
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 13 },
  typeButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    alignItems: "center",
  },
  typeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeButtonText: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  typeButtonTextActive: { color: colors.white },
  twoColumns: { flexDirection: "row", gap: 10 },
  column: { flex: 1 },
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

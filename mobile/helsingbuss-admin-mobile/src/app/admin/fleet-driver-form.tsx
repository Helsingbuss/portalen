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
import { saveDriver } from "../../services/fleetManageService";

export default function FleetDriverFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    assignment?: string;
    phone?: string;
    status?: string;
  }>();

  const isEdit = Boolean(params.id);

  const [fullName, setFullName] = useState(String(params.name || ""));
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(String(params.phone || ""));
  const [currentAssignment, setCurrentAssignment] = useState(String(params.assignment || ""));
  const [status, setStatus] = useState(String(params.status || "available"));
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert("Namn saknas", "Fyll i chaufförens namn.");
      return;
    }

    try {
      setIsSaving(true);

      await saveDriver({
        id: params.id,
        fullName,
        email,
        phone,
        currentAssignment,
        status,
      });

      Alert.alert(
        isEdit ? "Personal uppdaterad" : "Personal skapad",
        isEdit ? "Chaufförsinformationen har sparats." : "Ny chaufför har lagts till.",
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
              <Text style={styles.title}>{isEdit ? "Redigera chaufför" : "Lägg till chaufför"}</Text>
              <Text style={styles.subtitle}>Chaufförer och kontaktuppgifter</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <UserRound size={34} color={colors.goldSoft} strokeWidth={2.5} />
            </View>

            <Text style={styles.heroKicker}>PERSONAL</Text>
            <Text style={styles.heroTitle}>Håll personalregistret uppdaterat.</Text>
            <Text style={styles.heroText}>
              Lägg till chaufförer, kontaktuppgifter och aktuell status.
            </Text>
          </View>

          <View style={styles.card}>
            <InputField label="Namn" value={fullName} onChangeText={setFullName} placeholder="Anna Svensson" />
            <InputField label="E-post" value={email} onChangeText={setEmail} placeholder="anna@exempel.se" keyboardType="email-address" />
            <InputField label="Telefon" value={phone} onChangeText={setPhone} placeholder="+467..." keyboardType="phone-pad" />
            <InputField label="Aktuell körning/uppdrag" value={currentAssignment} onChangeText={setCurrentAssignment} placeholder="Linje 200 – Ullared" />

            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.statusRow}>
              <StatusButton label="Tillgänglig" value="available" active={status === "available"} onPress={setStatus} />
              <StatusButton label="I trafik" value="in_traffic" active={status === "in_traffic"} onPress={setStatus} />
              <StatusButton label="Inaktiv" value="inactive" active={status === "inactive"} onPress={setStatus} />
            </View>
          </View>

          <Pressable style={[styles.saveButton, isSaving && styles.disabled]} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Save size={21} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.saveButtonText}>Spara personal</Text>
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
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
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
        style={styles.input}
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
  statusRow: { flexDirection: "row", gap: 8 },
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


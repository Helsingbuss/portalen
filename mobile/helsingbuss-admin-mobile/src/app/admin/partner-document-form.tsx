import React, { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, FileText, Save } from "lucide-react-native";

import { colors } from "../../theme/colors";
import { savePartnerDocument } from "../../services/partnersService";

export default function PartnerDocumentFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    partnerId?: string;
    partnerName?: string;
    title?: string;
    documentType?: string;
    status?: string;
    dueDate?: string;
    fileUrl?: string;
    notes?: string;
  }>();

  const isEdit = Boolean(params.id);

  const [title, setTitle] = useState(String(params.title || ""));
  const [documentType, setDocumentType] = useState(String(params.documentType || "agreement"));
  const [status, setStatus] = useState(String(params.status || "active"));
  const [dueDate, setDueDate] = useState(String(params.dueDate || ""));
  const [fileUrl, setFileUrl] = useState(String(params.fileUrl || ""));
  const [notes, setNotes] = useState(String(params.notes || ""));
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!params.partnerId) {
      Alert.alert("Partner saknas", "Kunde inte koppla dokumentet till operatören.");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Titel saknas", "Fyll i vad dokumentet gäller.");
      return;
    }

    try {
      setIsSaving(true);

      await savePartnerDocument({
        id: params.id,
        partnerId: String(params.partnerId),
        title,
        documentType,
        status,
        dueDate,
        fileUrl,
        notes,
      });

      Alert.alert(
        isEdit ? "Dokument uppdaterat" : "Dokument tillagt",
        "Dokumentet/avtalet har sparats.",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace({
                pathname: "/admin/partner-detail",
                params: { id: params.partnerId },
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

            <View style={styles.headerText}>
              <Text style={styles.title}>{isEdit ? "Redigera dokument" : "Lägg till dokument"}</Text>
              <Text style={styles.subtitle}>{params.partnerName || "Operatör/partner"}</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <FileText size={34} color={colors.goldSoft} strokeWidth={2.5} />
            </View>

            <Text style={styles.heroKicker}>AVTAL & DOKUMENT</Text>
            <Text style={styles.heroTitle}>Samla avtal, tillstånd och filer.</Text>
            <Text style={styles.heroText}>
              Lägg in avtal, tillstånd, försäkring, kvalitetsdokument eller andra viktiga underlag.
            </Text>
          </View>

          <View style={styles.card}>
            <InputField label="Titel" value={title} onChangeText={setTitle} placeholder="Ex. Samarbetsavtal 2026" />

            <Text style={styles.inputLabel}>Dokumenttyp</Text>
            <View style={styles.typeGrid}>
              <TypeButton label="Avtal" value="agreement" active={documentType === "agreement"} onPress={setDocumentType} />
              <TypeButton label="Tillstånd" value="permit" active={documentType === "permit"} onPress={setDocumentType} />
              <TypeButton label="Försäkring" value="insurance" active={documentType === "insurance"} onPress={setDocumentType} />
              <TypeButton label="Kvalitet" value="quality" active={documentType === "quality"} onPress={setDocumentType} />
            </View>

            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.statusRow}>
              <StatusButton label="Aktiv" value="active" active={status === "active"} onPress={setStatus} />
              <StatusButton label="Väntar" value="pending" active={status === "pending"} onPress={setStatus} />
              <StatusButton label="Utgått" value="expired" active={status === "expired"} onPress={setStatus} />
            </View>

            <InputField label="Förfallodatum" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
            <InputField label="Fillänk" value={fileUrl} onChangeText={setFileUrl} placeholder="https://..." autoCapitalize="none" />
            <InputField label="Anteckning" value={notes} onChangeText={setNotes} placeholder="Intern notering..." multiline />
          </View>

          <Pressable style={[styles.saveButton, isSaving && styles.disabled]} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Save size={21} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.saveButtonText}>Spara dokument</Text>
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
  autoCapitalize,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize?: "none" | "sentences";
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
        autoCapitalize={autoCapitalize || "sentences"}
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
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900", letterSpacing: -0.4 },
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
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 13 },
  typeButton: {
    width: "48.5%",
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
  statusButtonText: { color: colors.textMuted, fontSize: 10.5, fontWeight: "900" },
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

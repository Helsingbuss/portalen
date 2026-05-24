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
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ClipboardList,
  FileText,
  Lock,
  Save,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  saveDocument,
  uploadAdminDocumentFile,
} from "../../services/documentsService";

const documentTypes = [
  { label: "Avtal", value: "agreement", icon: ClipboardList },
  { label: "Tillstånd", value: "permit", icon: ShieldCheck },
  { label: "Internt", value: "internal", icon: FileText },
  { label: "Fordon", value: "vehicle", icon: BriefcaseBusiness },
  { label: "Operatör", value: "operator", icon: BriefcaseBusiness },
  { label: "Personal", value: "staff", icon: FileText },
];

const statuses = [
  { label: "Aktiv", value: "active" },
  { label: "Utkast", value: "draft" },
  { label: "Arkiverad", value: "archived" },
  { label: "Utgången", value: "expired" },
];

export default function DocumentFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    documentType?: string;
    category?: string;
    description?: string;
    status?: string;
    linkedType?: string;
    linkedId?: string;
    validFrom?: string;
    expiresAt?: string;
    fileName?: string;
    fileMimeType?: string;
    fileSize?: string;
    storageBucket?: string;
    storagePath?: string;
    externalUrl?: string;
    isConfidential?: string;
  }>();

  const isEdit = Boolean(params.id);

  const [title, setTitle] = useState(String(params.title || ""));
  const [documentType, setDocumentType] = useState(String(params.documentType || "internal"));
  const [category, setCategory] = useState(String(params.category || ""));
  const [description, setDescription] = useState(String(params.description || ""));
  const [status, setStatus] = useState(String(params.status || "active"));
  const [linkedType, setLinkedType] = useState(String(params.linkedType || ""));
  const [linkedId, setLinkedId] = useState(String(params.linkedId || ""));
  const [validFrom, setValidFrom] = useState(String(params.validFrom || ""));
  const [expiresAt, setExpiresAt] = useState(String(params.expiresAt || ""));
  const [externalUrl, setExternalUrl] = useState(String(params.externalUrl || ""));
  const [isConfidential, setIsConfidential] = useState(
    String(params.isConfidential || "false") === "true"
  );

  const [existingFileName, setExistingFileName] = useState(String(params.fileName || ""));
  const [existingMimeType, setExistingMimeType] = useState(String(params.fileMimeType || ""));
  const [existingFileSize, setExistingFileSize] = useState(Number(params.fileSize || 0));
  const [existingStorageBucket, setExistingStorageBucket] = useState(String(params.storageBucket || "admin-documents"));
  const [existingStoragePath, setExistingStoragePath] = useState(String(params.storagePath || ""));

  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  async function pickFile() {
    try {
      setIsPicking(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "image/png",
          "image/jpeg",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const file = result.assets?.[0];

      if (!file) {
        Alert.alert("Ingen fil vald", "Välj en fil och försök igen.");
        return;
      }

      setSelectedFile(file);
    } catch (error: any) {
      Alert.alert("Kunde inte välja fil", error?.message || "Försök igen.");
    } finally {
      setIsPicking(false);
    }
  }

  function clearSelectedFile() {
    setSelectedFile(null);
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Titel saknas", "Fyll i dokumentets titel.");
      return;
    }

    try {
      setIsSaving(true);

      let fileData = {
        bucket: existingStorageBucket,
        path: existingStoragePath,
        fileName: existingFileName,
        fileMimeType: existingMimeType,
        fileSize: existingFileSize,
      };

      if (selectedFile) {
        fileData = await uploadAdminDocumentFile(selectedFile, documentType);
      }

      await saveDocument({
        id: String(params.id || ""),
        title,
        documentType,
        category,
        description,
        status,
        linkedType,
        linkedId,
        validFrom,
        expiresAt,
        fileName: fileData.fileName,
        fileMimeType: fileData.fileMimeType,
        fileSize: fileData.fileSize,
        storageBucket: fileData.bucket,
        storagePath: fileData.path,
        externalUrl,
        isConfidential,
      });

      Alert.alert(
        isEdit ? "Dokument uppdaterat" : "Dokument sparat",
        "Dokumentet har sparats.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/admin/documents" as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Kunde inte spara dokument", error?.message || "Kontrollera uppgifterna.");
    } finally {
      setIsSaving(false);
    }
  }

  const shownFileName = selectedFile?.name || existingFileName;

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable style={styles.iconButton} onPress={() => router.back()}>
              <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.title}>{isEdit ? "Redigera dokument" : "Lägg till dokument"}</Text>
              <Text style={styles.subtitle}>Avtal, tillstånd och interna underlag</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <FileText size={38} color={colors.goldSoft} strokeWidth={2.4} />
            </View>

            <Text style={styles.heroKicker}>DOKUMENT</Text>
            <Text style={styles.heroTitle}>Spara viktiga filer säkert.</Text>
            <Text style={styles.heroText}>
              Lägg upp avtal, trafiktillstånd, interna rutiner, fordonsdokument och andra underlag.
            </Text>
          </View>

          <View style={styles.card}>
            <InputField
              label="Titel"
              value={title}
              onChangeText={setTitle}
              placeholder="Ex. Trafiktillstånd, leasingavtal, intern rutin..."
            />

            <Text style={styles.inputLabel}>Dokumenttyp</Text>
            <View style={styles.choiceGrid}>
              {documentTypes.map((item) => {
                const Icon = item.icon;
                const active = documentType === item.value;

                return (
                  <Pressable
                    key={item.value}
                    style={[styles.choiceButton, active && styles.choiceButtonActive]}
                    onPress={() => setDocumentType(item.value)}
                  >
                    <Icon
                      size={18}
                      color={active ? colors.white : colors.primary}
                      strokeWidth={2.4}
                    />
                    <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <InputField
              label="Kategori"
              value={category}
              onChangeText={setCategory}
              placeholder="Ex. Leasing, försäkring, tillstånd, rutin..."
            />

            <InputField
              label="Beskrivning"
              value={description}
              onChangeText={setDescription}
              placeholder="Kort beskrivning av dokumentet..."
              multiline
            />

            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.statusGrid}>
              {statuses.map((item) => (
                <Pressable
                  key={item.value}
                  style={[styles.statusButton, status === item.value && styles.statusButtonActive]}
                  onPress={() => setStatus(item.value)}
                >
                  <Text style={[styles.statusText, status === item.value && styles.statusTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ToggleRow
              label="Konfidentiellt dokument"
              value={isConfidential}
              onChange={setIsConfidential}
              icon={<Lock size={18} color={colors.primary} strokeWidth={2.4} />}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Giltighet</Text>

            <InputField
              label="Giltigt från"
              value={validFrom}
              onChangeText={setValidFrom}
              placeholder="YYYY-MM-DD"
              icon={<CalendarClock size={18} color={colors.primary} strokeWidth={2.4} />}
            />

            <InputField
              label="Giltigt till / utgångsdatum"
              value={expiresAt}
              onChangeText={setExpiresAt}
              placeholder="YYYY-MM-DD"
              icon={<CalendarClock size={18} color={colors.primary} strokeWidth={2.4} />}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Koppling</Text>

            <InputField
              label="Kopplat till typ"
              value={linkedType}
              onChangeText={setLinkedType}
              placeholder="Ex. vehicle, operator, staff, booking..."
            />

            <InputField
              label="Kopplat ID"
              value={linkedId}
              onChangeText={setLinkedId}
              placeholder="Valfritt ID från annan post"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Fil</Text>

            <Pressable
              style={[styles.uploadBox, isPicking && styles.disabled]}
              onPress={pickFile}
              disabled={isPicking}
            >
              {isPicking ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <UploadCloud size={30} color={colors.primary} strokeWidth={2.4} />
                  <Text style={styles.uploadTitle}>Välj fil</Text>
                  <Text style={styles.uploadText}>
                    PDF, bild, Word eller Excel. Maxstorlek styrs av Supabase bucket.
                  </Text>
                </>
              )}
            </Pressable>

            {shownFileName ? (
              <View style={styles.fileBox}>
                <View style={styles.fileIcon}>
                  <FileText size={21} color={colors.primary} strokeWidth={2.4} />
                </View>

                <View style={styles.fileTextBox}>
                  <Text style={styles.fileName}>{shownFileName}</Text>
                  <Text style={styles.fileMeta}>
                    {selectedFile ? "Ny fil vald" : "Befintlig fil"}
                  </Text>
                </View>

                {selectedFile ? (
                  <Pressable style={styles.clearFileButton} onPress={clearSelectedFile}>
                    <X size={18} color={colors.danger} strokeWidth={2.5} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <InputField
              label="Extern länk"
              value={externalUrl}
              onChangeText={setExternalUrl}
              placeholder="Valfritt: https://..."
            />
          </View>

          <Pressable
            style={[styles.saveButton, isSaving && styles.disabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
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
  multiline,
  icon,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>

      <View style={[styles.inputBox, multiline && styles.inputBoxMultiline]}>
        {icon ? <View style={styles.inputIcon}>{icon}</View> : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable style={styles.toggleRow} onPress={() => onChange(!value)}>
      <View style={styles.toggleIcon}>{icon}</View>

      <Text style={styles.toggleText}>{label}</Text>

      <View style={[styles.checkbox, value && styles.checkboxActive]}>
        {value ? <Check size={15} color={colors.white} strokeWidth={3} /> : null}
      </View>
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

  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "900", marginBottom: 12 },

  inputWrap: { marginBottom: 13 },
  inputLabel: { color: colors.text, fontSize: 12, fontWeight: "900", marginBottom: 7 },
  inputBox: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },
  inputBoxMultiline: {
    minHeight: 92,
    alignItems: "flex-start",
    paddingTop: 12,
  },
  inputIcon: { marginRight: 9, marginTop: 1 },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 10,
  },
  inputMultiline: {
    minHeight: 74,
    textAlignVertical: "top",
    paddingTop: 0,
  },

  choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 13 },
  choiceButton: {
    width: "48.5%",
    minHeight: 46,
    borderRadius: 15,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  choiceButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.primary, fontSize: 11.5, fontWeight: "900", marginLeft: 7 },
  choiceTextActive: { color: colors.white },

  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 13 },
  statusButton: {
    width: "48.5%",
    borderRadius: 14,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    alignItems: "center",
  },
  statusButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusText: { color: colors.textMuted, fontSize: 11.5, fontWeight: "900" },
  statusTextActive: { color: colors.white },

  toggleRow: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  toggleIcon: { width: 28 },
  toggleText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "800" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.4,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },

  uploadBox: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardSoft,
    padding: 18,
    alignItems: "center",
    marginBottom: 13,
  },
  uploadTitle: { color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 8 },
  uploadText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },

  fileBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },
  fileIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  fileTextBox: { flex: 1 },
  fileName: { color: colors.text, fontSize: 13, fontWeight: "900" },
  fileMeta: { color: colors.textMuted, fontSize: 11, fontWeight: "700", marginTop: 2 },
  clearFileButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 19,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },
  disabled: { opacity: 0.65 },
});

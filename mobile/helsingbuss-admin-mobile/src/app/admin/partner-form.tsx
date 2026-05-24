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
import { ArrowLeft, Handshake, Save } from "lucide-react-native";

import { colors } from "../../theme/colors";
import { savePartner } from "../../services/partnersService";

export default function PartnerFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    partnerType?: string;
    name?: string;
    orgNumber?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    website?: string;
    city?: string;
    address?: string;
    status?: string;
    qualityLevel?: string;
    notes?: string;
  }>();

  const isEdit = Boolean(params.id);

  const [partnerType, setPartnerType] = useState(String(params.partnerType || "operator"));
  const [name, setName] = useState(String(params.name || ""));
  const [orgNumber, setOrgNumber] = useState(String(params.orgNumber || ""));
  const [contactPerson, setContactPerson] = useState(String(params.contactPerson || ""));
  const [email, setEmail] = useState(String(params.email || ""));
  const [phone, setPhone] = useState(String(params.phone || ""));
  const [website, setWebsite] = useState(String(params.website || ""));
  const [city, setCity] = useState(String(params.city || ""));
  const [address, setAddress] = useState(String(params.address || ""));
  const [status, setStatus] = useState(String(params.status || "active"));
  const [qualityLevel, setQualityLevel] = useState(String(params.qualityLevel || "normal"));
  const [notes, setNotes] = useState(String(params.notes || ""));
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Namn saknas", "Fyll i namn på operatör eller partner.");
      return;
    }

    try {
      setIsSaving(true);

      const saved = await savePartner({
        id: params.id,
        partnerType,
        name,
        orgNumber,
        contactPerson,
        email,
        phone,
        website,
        city,
        address,
        status,
        qualityLevel,
        notes,
      });

      Alert.alert(
        isEdit ? "Partner uppdaterad" : "Partner skapad",
        "Uppgifterna har sparats.",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace({
                pathname: "/admin/partner-detail",
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
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable style={styles.iconButton} onPress={() => router.back()}>
              <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
            </Pressable>

            <View>
              <Text style={styles.title}>{isEdit ? "Redigera partner" : "Lägg till partner"}</Text>
              <Text style={styles.subtitle}>Operatörer, leverantörer och avtal</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Handshake size={34} color={colors.goldSoft} strokeWidth={2.5} />
            </View>

            <Text style={styles.heroKicker}>PARTNER</Text>
            <Text style={styles.heroTitle}>Bygg ert nätverk av samarbetspartners.</Text>
            <Text style={styles.heroText}>
              Lägg till bussbolag, hotell, restauranger, färjor, guider och andra leverantörer.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.inputLabel}>Typ</Text>
            <View style={styles.typeGrid}>
              <TypeButton label="Operatör" value="operator" active={partnerType === "operator"} onPress={setPartnerType} />
              <TypeButton label="Hotell" value="hotel" active={partnerType === "hotel"} onPress={setPartnerType} />
              <TypeButton label="Leverantör" value="supplier" active={partnerType === "supplier"} onPress={setPartnerType} />
              <TypeButton label="Restaurang" value="restaurant" active={partnerType === "restaurant"} onPress={setPartnerType} />
              <TypeButton label="Färja" value="ferry" active={partnerType === "ferry"} onPress={setPartnerType} />
              <TypeButton label="Aktivitet" value="activity" active={partnerType === "activity"} onPress={setPartnerType} />
            </View>

            <InputField label="Namn" value={name} onChangeText={setName} placeholder="Ex. Bergkvara, hotell, restaurang..." />
            <InputField label="Org.nr" value={orgNumber} onChangeText={setOrgNumber} placeholder="556..." />
            <InputField label="Kontaktperson" value={contactPerson} onChangeText={setContactPerson} placeholder="Anna Svensson" />
            <InputField label="E-post" value={email} onChangeText={setEmail} placeholder="kontakt@example.se" keyboardType="email-address" />
            <InputField label="Telefon" value={phone} onChangeText={setPhone} placeholder="+467..." keyboardType="phone-pad" />
            <InputField label="Webbplats" value={website} onChangeText={setWebsite} placeholder="www.exempel.se" autoCapitalize="none" />
            <InputField label="Adress" value={address} onChangeText={setAddress} placeholder="Gata 1" />
            <InputField label="Ort" value={city} onChangeText={setCity} placeholder="Helsingborg" />

            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.statusRow}>
              <SmallButton label="Aktiv" value="active" active={status === "active"} onPress={setStatus} />
              <SmallButton label="Pågående" value="pending" active={status === "pending"} onPress={setStatus} />
              <SmallButton label="Inaktiv" value="inactive" active={status === "inactive"} onPress={setStatus} />
            </View>

            <Text style={styles.inputLabel}>Kvalitet</Text>
            <View style={styles.statusRow}>
              <SmallButton label="Hög" value="high" active={qualityLevel === "high"} onPress={setQualityLevel} />
              <SmallButton label="Normal" value="normal" active={qualityLevel === "normal"} onPress={setQualityLevel} />
              <SmallButton label="Följ upp" value="watch" active={qualityLevel === "watch"} onPress={setQualityLevel} />
            </View>

            <InputField label="Anteckningar" value={notes} onChangeText={setNotes} placeholder="Intern notering..." multiline />
          </View>

          <Pressable style={[styles.saveButton, isSaving && styles.disabled]} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Save size={21} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.saveButtonText}>Spara partner</Text>
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
  autoCapitalize,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
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
        keyboardType={keyboardType || "default"}
        autoCapitalize={autoCapitalize || (keyboardType === "email-address" ? "none" : "sentences")}
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

function SmallButton({
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
    <Pressable style={[styles.smallButton, active && styles.smallButtonActive]} onPress={() => onPress(value)}>
      <Text style={[styles.smallButtonText, active && styles.smallButtonTextActive]}>{label}</Text>
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
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 13 },
  typeButton: {
    width: "31.8%",
    borderRadius: 14,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    alignItems: "center",
  },
  typeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeButtonText: { color: colors.textMuted, fontSize: 10.5, fontWeight: "900" },
  typeButtonTextActive: { color: colors.white },
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 13 },
  smallButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    alignItems: "center",
  },
  smallButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  smallButtonText: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  smallButtonTextActive: { color: colors.white },
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

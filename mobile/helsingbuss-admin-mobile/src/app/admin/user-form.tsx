import React, { useMemo, useState } from "react";
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
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  BusFront,
  ShieldCheck,
  UserPlus,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import { getRoleLabel } from "../../services/adminUsersService";
import { inviteUserAndAssignRole } from "../../services/adminInviteUsersService";

const ALLOWED_ROLES = ["admin", "agent", "driver", "partner"] as const;

export default function AdminUserFormScreen() {
  const params = useLocalSearchParams<{ role?: string; email?: string }>();

  const initialRole = String(params.role || "agent");
  const safeInitialRole = ALLOWED_ROLES.includes(initialRole as any) ? initialRole : "agent";

  const [email, setEmail] = useState(String(params.email || ""));
  const [role, setRole] = useState(safeInitialRole);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const roleDescription = useMemo(() => {
    if (role === "admin") return "Admin kan hantera portal, anvÃ¤ndare, offerter, ekonomi och drift.";
    if (role === "agent") return "Bokningsagent kan arbeta med kunder, offerter, bokningar och biljetter.";
    if (role === "driver") return "FÃ¶rare fÃ¥r tillgÃ¥ng till fÃ¶rarvyn, kÃ¶rorder, passagerare och scanning.";
    if (role === "partner") return "Partner fÃ¥r tillgÃ¥ng till partnerflÃ¶de och uppdrag.";
    return "";
  }, [role]);

  async function saveRole() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.includes("@")) {
      Alert.alert("E-post saknas", "Fyll i en giltig e-postadress.");
      return;
    }

    try {
      setIsSaving(true);

      await inviteUserAndAssignRole({
        email: cleanEmail,
        role,
        displayName: displayName.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        sendInvite: true,
      });

      Alert.alert(
        "BehÃ¶righet tillagd",
        `${getRoleLabel(role)} Ã¤r nu kopplad till ${cleanEmail}.`,
        [
          {
            text: "Till listan",
            onPress: () => router.replace("/admin/users" as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Kunde inte lÃ¤gga till roll", error?.message || "FÃ¶rsÃ¶k igen.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
        </Pressable>

        <View style={styles.heroCard}>
          <UserPlus size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>ADMIN</Text>
          <Text style={styles.heroTitle}>LÃ¤gg till behÃ¶righet</Text>
          <Text style={styles.heroText}>
            Koppla en befintlig Supabase-anvÃ¤ndare till rÃ¤tt roll i appen.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Viktigt</Text>
          <Text style={styles.infoText}>
            AnvÃ¤ndaren mÃ¥ste redan finnas i Supabase Auth. Om personen Ã¤r ny behÃ¶ver du fÃ¶rst skapa eller bjuda in anvÃ¤ndaren dÃ¤r.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>VÃ¤lj roll</Text>

          <View style={styles.roleGrid}>
            <RoleButton role="admin" currentRole={role} onPress={() => setRole("admin")} />
            <RoleButton role="agent" currentRole={role} onPress={() => setRole("agent")} />
            <RoleButton role="driver" currentRole={role} onPress={() => setRole("driver")} />
            <RoleButton role="partner" currentRole={role} onPress={() => setRole("partner")} />
          </View>

          <Text style={styles.roleDescription}>{roleDescription}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>AnvÃ¤ndare</Text>

          <Field
            label="E-post"
            value={email}
            onChangeText={setEmail}
            placeholder="namn@helsingbuss.se"
            keyboardType="email-address"
          />

          <Field
            label="Namn"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Ex. Andreas EkelÃ¶f"
          />

          <Field
            label="Telefon"
            value={phone}
            onChangeText={setPhone}
            placeholder="070..."
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Anteckning</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex. Agent, fÃ¶rare helg, partnerkontakt..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.textArea]}
            multiline
          />

          <Pressable
            style={[styles.primaryButton, isSaving && styles.disabled]}
            onPress={saveRole}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <UserPlus size={20} color={colors.white} />
            )}
            <Text style={styles.primaryButtonText}>Spara behÃ¶righet</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function RoleButton({
  role,
  currentRole,
  onPress,
}: {
  role: string;
  currentRole: string;
  onPress: () => void;
}) {
  const active = role === currentRole;

  return (
    <Pressable style={[styles.roleButton, active && styles.roleButtonActive]} onPress={onPress}>
      {role === "driver" ? (
        <BusFront size={22} color={active ? colors.white : colors.primary} />
      ) : role === "agent" ? (
        <BriefcaseBusiness size={22} color={active ? colors.white : colors.primary} />
      ) : role === "partner" ? (
        <BadgeCheck size={22} color={active ? colors.white : colors.primary} />
      ) : (
        <ShieldCheck size={22} color={active ? colors.white : colors.primary} />
      )}

      <Text style={[styles.roleButtonText, active && styles.roleButtonTextActive]}>
        {getRoleLabel(role)}
      </Text>
    </Pressable>
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
  keyboardType?: "default" | "email-address" | "phone-pad";
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

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
  },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginTop: 12, marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 27, lineHeight: 33, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 7 },

  infoCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  infoTitle: { color: colors.primary, fontSize: 15, fontWeight: "900" },
  infoText: { color: colors.text, fontSize: 12.5, lineHeight: 19, fontWeight: "700", marginTop: 5 },

  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: 12 },

  roleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  roleButton: {
    width: "47.5%",
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 12,
    justifyContent: "center",
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleButtonText: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "900",
    marginTop: 8,
  },
  roleButtonTextActive: { color: colors.white },
  roleDescription: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 12,
  },

  label: { color: colors.text, fontSize: 12, fontWeight: "900", marginBottom: 7, marginTop: 6 },
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
  textArea: { minHeight: 92, paddingTop: 13, textAlignVertical: "top" },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 8,
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 8 },
  disabled: { opacity: 0.65 },
});

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  RefreshCw,
  Save,
  ShieldCheck,
  UserPlus,
  UserRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  getAdminUsersAndRoles,
  getRoleLabel,
  setUserRoleActive,
  updateAdminUserProfileFields,
  type AdminUserGroup,
  type AdminUserRoleRow,
} from "../../services/adminUsersService";

export default function AdminUserDetailScreen() {
  const params = useLocalSearchParams<{ userId?: string; email?: string }>();

  const userId = String(params.userId || "");
  const emailParam = String(params.email || "");

  const [user, setUser] = useState<AdminUserGroup | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const initials = useMemo(() => {
    const source = displayName || user?.email || "HB";
    return source.slice(0, 2).toUpperCase();
  }, [displayName, user?.email]);

  const loadUser = useCallback(async () => {
    try {
      setIsLoading(true);

      const users = await getAdminUsersAndRoles();
      const found =
        users.find((item) => item.userId === userId) ||
        users.find((item) => item.email.toLowerCase() === emailParam.toLowerCase()) ||
        null;

      setUser(found);

      if (found) {
        const firstRole = found.roles[0];
        setDisplayName(found.displayName || firstRole?.displayName || "");
        setPhone(found.phone || firstRole?.phone || "");
        setNotes(firstRole?.notes || "");
      }
    } catch (error: any) {
      Alert.alert("Kunde inte hämta användare", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
    }
  }, [userId, emailParam]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  async function saveUser() {
    if (!user?.userId) {
      Alert.alert("Saknar användare", "Kunde inte hitta användarens id.");
      return;
    }

    try {
      setIsSaving(true);

      await updateAdminUserProfileFields({
        userId: user.userId,
        displayName: displayName.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
      });

      Alert.alert("Sparat", "Användaren är uppdaterad.");
      await loadUser();
    } catch (error: any) {
      Alert.alert("Kunde inte spara", error?.message || "Försök igen.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleRole(role: AdminUserRoleRow) {
    const nextActive = !role.isActive;

    Alert.alert(
      nextActive ? "Aktivera roll" : "Inaktivera roll",
      `Vill du ${nextActive ? "aktivera" : "inaktivera"} rollen ${getRoleLabel(role.role)}?`,
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: nextActive ? "Aktivera" : "Inaktivera",
          style: nextActive ? "default" : "destructive",
          onPress: async () => {
            try {
              await setUserRoleActive({
                roleId: role.roleId,
                isActive: nextActive,
              });

              await loadUser();
            } catch (error: any) {
              Alert.alert("Kunde inte ändra roll", error?.message || "Försök igen.");
            }
          },
        },
      ]
    );
  }

  function addRole() {
    const email = user?.email || emailParam;
    router.push(`/admin/user-form?email=${encodeURIComponent(email)}` as any);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
        </Pressable>

        <View style={styles.heroCard}>
          <UserRound size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>ADMIN</Text>
          <Text style={styles.heroTitle}>Användare</Text>
          <Text style={styles.heroText}>
            Uppdatera kontaktuppgifter och behörigheter för användaren.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar användare...</Text>
          </View>
        ) : null}

        {!isLoading && !user ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Användaren hittades inte</Text>
            <Text style={styles.emptyText}>
              Gå tillbaka och uppdatera listan.
            </Text>
          </View>
        ) : null}

        {user ? (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{displayName || user.email}</Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Uppgifter</Text>

              <Field
                label="Namn"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Ex. Andreas Ekelöf"
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
                placeholder="Ex. Agent, förare helg, admin..."
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.textArea]}
                multiline
              />

              <Pressable
                style={[styles.primaryButton, isSaving && styles.disabled]}
                onPress={saveUser}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Save size={20} color={colors.white} />
                )}
                <Text style={styles.primaryButtonText}>Spara uppgifter</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionTop}>
                <Text style={styles.sectionTitle}>Behörigheter</Text>

                <Pressable style={styles.smallButton} onPress={addRole}>
                  <UserPlus size={17} color={colors.primary} />
                  <Text style={styles.smallButtonText}>Lägg till</Text>
                </Pressable>
              </View>

              {user.roles.length === 0 ? (
                <Text style={styles.emptyText}>Ingen roll tilldelad ännu.</Text>
              ) : (
                user.roles.map((role) => (
                  <View key={role.roleId} style={styles.roleRow}>
                    <View style={styles.roleIcon}>
                      {role.isActive ? (
                        <ShieldCheck size={19} color={colors.primary} />
                      ) : (
                        <BadgeCheck size={19} color="#B42318" />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.roleTitle}>{getRoleLabel(role.role)}</Text>
                      <Text style={styles.roleText}>
                        {role.isActive ? "Aktiv behörighet" : "Inaktiv behörighet"}
                      </Text>
                    </View>

                    <Pressable
                      style={[
                        styles.roleToggle,
                        role.isActive ? styles.roleToggleActive : styles.roleToggleInactive,
                      ]}
                      onPress={() => toggleRole(role)}
                    >
                      <Text
                        style={[
                          styles.roleToggleText,
                          role.isActive ? styles.roleToggleTextActive : styles.roleToggleTextInactive,
                        ]}
                      >
                        {role.isActive ? "Aktiv" : "Inaktiv"}
                      </Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            <Pressable style={styles.secondaryButton} onPress={loadUser}>
              <RefreshCw size={18} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Uppdatera</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
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
  keyboardType?: "default" | "phone-pad";
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
  heroTitle: { color: colors.white, fontSize: 27, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 7 },

  loadingCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: "800", marginLeft: 10 },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: "center",
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  emptyText: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18, fontWeight: "700", marginTop: 4 },

  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  avatarText: { color: colors.primary, fontSize: 17, fontWeight: "900" },
  profileName: { color: colors.text, fontSize: 16, fontWeight: "900" },
  profileEmail: { color: colors.textMuted, fontSize: 12.5, fontWeight: "700", marginTop: 3 },

  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: 12 },

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

  smallButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
  },
  smallButtonText: { color: colors.primary, fontSize: 12, fontWeight: "900", marginLeft: 5 },

  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 8,
  },
  roleIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  roleTitle: { color: colors.text, fontSize: 13.5, fontWeight: "900" },
  roleText: { color: colors.textMuted, fontSize: 11.5, fontWeight: "700", marginTop: 2 },

  roleToggle: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  roleToggleActive: { backgroundColor: colors.primarySoft },
  roleToggleInactive: { backgroundColor: "#FFF1F0" },
  roleToggleText: { fontSize: 11.5, fontWeight: "900" },
  roleToggleTextActive: { color: colors.primary },
  roleToggleTextInactive: { color: "#B42318" },

  secondaryButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  secondaryButtonText: { color: colors.primary, fontSize: 14, fontWeight: "900", marginLeft: 7 },
});

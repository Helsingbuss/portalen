import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  LogOut,
  Mail,
  Phone,
  Save,
  UserRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  getMainRoleLabel,
  getMyAppProfile,
  updateMyAppProfile,
  type MyAppProfile,
} from "../../services/profileService";
import { supabase } from "../../lib/supabase";

export default function ProfileScreen({ mode }: { mode: "admin" | "agent" }) {
  const [profile, setProfile] = useState<MyAppProfile | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initials = useMemo(() => {
    const source = displayName || profile?.email || "HB";
    return source
      .split(" ")
      .map((part) => part.trim().charAt(0))
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [displayName, profile?.email]);

  const roleLabel = useMemo(() => {
    return getMainRoleLabel(profile?.roles || []);
  }, [profile?.roles]);

  const loadProfile = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getMyAppProfile();

      setProfile(result);
      setDisplayName(result.displayName);
      setPhone(result.phone);
      setTitle(result.title);
      setDepartment(result.department);
      setNotes(result.notes);
    } catch (error: any) {
      Alert.alert("Kunde inte hämta profil", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile(false);
  }, [loadProfile]);

  async function saveProfile() {
    try {
      setIsSaving(true);

      await updateMyAppProfile({
        displayName,
        phone,
        title,
        department,
        notes,
      });

      Alert.alert("Sparat", "Din profil är uppdaterad.");
      await loadProfile(true);
    } catch (error: any) {
      Alert.alert("Kunde inte spara", error?.message || "Försök igen.");
    } finally {
      setIsSaving(false);
    }
  }

  async function signOut() {
    Alert.alert("Logga ut", "Vill du logga ut från appen?", [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Logga ut",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/" as any);
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadProfile(true)}
            tintColor={colors.primary}
          />
        }
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
        </Pressable>

        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <Text style={styles.heroKicker}>{mode === "agent" ? "AGENTPROFIL" : "ADMINPROFIL"}</Text>
          <Text style={styles.heroTitle}>{displayName || "Min profil"}</Text>
          <Text style={styles.heroText}>
            Hantera dina kontaktuppgifter, roll och intern information i Helsingbuss app.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar profil...</Text>
          </View>
        ) : null}

        <View style={styles.infoGrid}>
          <InfoCard icon="mail" title="E-post" value={profile?.email || "-"} />
          <InfoCard icon="role" title="Roll" value={roleLabel} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profiluppgifter</Text>

          <Field label="Namn" value={displayName} onChangeText={setDisplayName} placeholder="Ditt namn" />
          <Field label="Telefon" value={phone} onChangeText={setPhone} placeholder="070..." keyboardType="phone-pad" />
          <Field label="Titel" value={title} onChangeText={setTitle} placeholder="Ex. Bokningsagent" />
          <Field label="Avdelning" value={department} onChangeText={setDepartment} placeholder="Ex. Sundra / Airport Shuttle" />

          <Text style={styles.label}>Intern anteckning</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex. Ansvarsområde, språk, arbetstider..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.textArea]}
            multiline
          />

          <Pressable
            style={[styles.primaryButton, isSaving && styles.disabled]}
            onPress={saveProfile}
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator color={colors.white} /> : <Save size={20} color={colors.white} />}
            <Text style={styles.primaryButtonText}>Spara profil</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Konto</Text>

          <View style={styles.accountRow}>
            <UserRound size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.accountTitle}>Inloggad som</Text>
              <Text style={styles.accountText}>{profile?.email || "-"}</Text>
            </View>
          </View>

          <Pressable style={styles.logoutButton} onPress={signOut}>
            <LogOut size={20} color="#B42318" />
            <Text style={styles.logoutText}>Logga ut</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoCard({ icon, title, value }: { icon: "mail" | "role"; title: string; value: string }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>
        {icon === "mail" ? (
          <Mail size={20} color={colors.primary} />
        ) : (
          <BadgeCheck size={20} color={colors.primary} />
        )}
      </View>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
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
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 28,
    backgroundColor: colors.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: { color: colors.primary, fontSize: 24, fontWeight: "900" },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 27, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 6 },

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

  infoGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  infoCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  infoTitle: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  infoValue: { color: colors.text, fontSize: 13, fontWeight: "900", marginTop: 3 },

  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
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

  accountRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  accountTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  accountText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 2 },

  logoutButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#FFF1F0",
    borderWidth: 1,
    borderColor: "#FFDAD6",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  logoutText: { color: "#B42318", fontSize: 14, fontWeight: "900", marginLeft: 8 },
});

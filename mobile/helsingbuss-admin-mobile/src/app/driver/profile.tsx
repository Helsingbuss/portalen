import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

type ProfileState = {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string;
  createdAt: string;
};

function getDisplayName(user: any) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.display_name ||
    user?.email ||
    "Förare"
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Ej tillgängligt";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "Ej tillgängligt";
  }
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        marginBottom: 10,
      }}
    >
      <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>
        {label}
      </Text>
      <Text style={{ marginTop: 5, color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
        {value || "Ej angivet"}
      </Text>
    </View>
  );
}

function EditField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "email-address";
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "800", marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        style={{
          backgroundColor: "white",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#e2e8f0",
          paddingHorizontal: 14,
          paddingVertical: 13,
          fontSize: 16,
          color: "#0f172a",
          fontWeight: "700",
        }}
      />
    </View>
  );
}

export default function DriverProfileScreen() {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const [nameDraft, setNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");

  const initials = useMemo(() => {
    const name = profile?.name || profile?.email || "Förare";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "F";
  }, [profile]);

  const loadProfile = useCallback(async () => {
    setError("");

    try {
      const { data, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;

      const user = data.user;

      if (!user) {
        throw new Error("Du är inte inloggad.");
      }

      const metadata = user.user_metadata || {};

      const nextProfile = {
        id: user.id,
        email: user.email || "",
        name: getDisplayName(user),
        role: metadata.app_role || metadata.role || "Förare",
        phone: metadata.phone || metadata.phone_number || "",
        createdAt: user.created_at || "",
      };

      setProfile(nextProfile);
      setNameDraft(nextProfile.name);
      setPhoneDraft(nextProfile.phone);
    } catch (e: any) {
      setError(e?.message || "Kunde inte hämta profilen.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function saveProfile() {
    const cleanName = nameDraft.trim();
    const cleanPhone = phoneDraft.trim();

    if (!cleanName) {
      Alert.alert("Namn saknas", "Fyll i ditt namn innan du sparar.");
      return;
    }

    try {
      setSaving(true);

      const { data, error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: cleanName,
          name: cleanName,
          phone: cleanPhone,
          phone_number: cleanPhone,
        },
      });

      if (updateError) throw updateError;

      const user = data.user;

      const nextProfile = {
        id: user?.id || profile?.id || "",
        email: user?.email || profile?.email || "",
        name: cleanName,
        role: user?.user_metadata?.app_role || user?.user_metadata?.role || profile?.role || "Förare",
        phone: cleanPhone,
        createdAt: user?.created_at || profile?.createdAt || "",
      };

      setProfile(nextProfile);
      setEditing(false);

      Alert.alert("Profil uppdaterad", "Dina profiluppgifter har sparats.");
    } catch (e: any) {
      Alert.alert("Kunde inte spara", e?.message || "Något gick fel när profilen skulle uppdateras.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setNameDraft(profile?.name || "");
    setPhoneDraft(profile?.phone || "");
    setEditing(false);
  }

  async function signOut() {
    Alert.alert(
      "Logga ut",
      "Vill du logga ut från förarappen?",
      [
        {
          text: "Avbryt",
          style: "cancel",
        },
        {
          text: "Logga ut",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace("/" as any);
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f4f6f8" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadProfile();
            }}
          />
        }
      >
        <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: "#194C66", fontSize: 15, fontWeight: "800" }}>
            Tillbaka
          </Text>
        </Pressable>

        <Text style={{ fontSize: 30, fontWeight: "900", color: "#0f172a" }}>
          Min profil
        </Text>

        <Text style={{ marginTop: 6, color: "#64748b", fontSize: 14, lineHeight: 20 }}>
          Här ser du och uppdaterar dina uppgifter som förare i Helsingbuss-appen.
        </Text>

        {loading ? (
          <View style={{ marginTop: 40, alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 10, color: "#64748b" }}>Laddar profil...</Text>
          </View>
        ) : error ? (
          <View
            style={{
              marginTop: 24,
              borderRadius: 20,
              backgroundColor: "#fee2e2",
              padding: 16,
            }}
          >
            <Text style={{ color: "#991b1b", fontWeight: "900", fontSize: 16 }}>
              Något gick fel
            </Text>
            <Text style={{ marginTop: 6, color: "#991b1b" }}>{error}</Text>

            <Pressable onPress={loadProfile} style={{ marginTop: 14 }}>
              <Text style={{ color: "#194C66", fontWeight: "900" }}>Försök igen</Text>
            </Pressable>
          </View>
        ) : profile ? (
          <>
            <View
              style={{
                marginTop: 24,
                backgroundColor: "#003f38",
                borderRadius: 26,
                padding: 20,
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: "white", fontSize: 26, fontWeight: "900" }}>
                  {initials}
                </Text>
              </View>

              <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>
                {profile.name}
              </Text>

              <Text style={{ marginTop: 5, color: "rgba(255,255,255,0.75)", fontSize: 14 }}>
                {profile.email}
              </Text>

              <View
                style={{
                  alignSelf: "flex-start",
                  marginTop: 14,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: "white", fontSize: 12, fontWeight: "900" }}>
                  {profile.role}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 18 }}>
              {editing ? (
                <View
                  style={{
                    backgroundColor: "#eef5f9",
                    borderRadius: 22,
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: "#0f172a", fontSize: 18, fontWeight: "900", marginBottom: 12 }}>
                    Uppdatera profil
                  </Text>

                  <EditField
                    label="Namn"
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    placeholder="Ditt namn"
                  />

                  <EditField
                    label="Telefon"
                    value={phoneDraft}
                    onChangeText={setPhoneDraft}
                    placeholder="Telefonnummer"
                    keyboardType="phone-pad"
                  />

                  <Pressable
                    onPress={saveProfile}
                    disabled={saving}
                    style={{
                      marginTop: 4,
                      backgroundColor: "#194C66",
                      borderRadius: 16,
                      padding: 15,
                      alignItems: "center",
                      opacity: saving ? 0.65 : 1,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>
                      {saving ? "Sparar..." : "Spara ändringar"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={cancelEdit}
                    disabled={saving}
                    style={{
                      marginTop: 10,
                      backgroundColor: "white",
                      borderRadius: 16,
                      padding: 15,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#dbe5ea",
                    }}
                  >
                    <Text style={{ color: "#194C66", fontWeight: "900", fontSize: 15 }}>
                      Avbryt
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <InfoCard label="Namn" value={profile.name} />
                  <InfoCard label="E-post" value={profile.email} />
                  <InfoCard label="Telefon" value={profile.phone || "Ej angivet"} />
                  <InfoCard label="Roll" value={profile.role} />
                  <InfoCard label="Konto skapat" value={formatDate(profile.createdAt)} />

                  <Pressable
                    onPress={() => setEditing(true)}
                    style={{
                      marginTop: 4,
                      backgroundColor: "#194C66",
                      borderRadius: 18,
                      padding: 16,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>
                      Redigera profil
                    </Text>
                  </Pressable>
                </>
              )}
            </View>

            <View
              style={{
                marginTop: 14,
                borderRadius: 20,
                backgroundColor: "#e8f3f1",
                padding: 16,
              }}
            >
              <Text style={{ color: "#194C66", fontSize: 15, fontWeight: "900" }}>
                Förarnotiser
              </Text>
              <Text style={{ marginTop: 6, color: "#194C66", lineHeight: 20 }}>
                När trafikledningen skickar körförfrågningar, ändringar eller meddelanden visas de under Notiser & meddelanden.
              </Text>
            </View>

            <Pressable
              onPress={() => router.push("/driver/notifications" as any)}
              style={{
                marginTop: 14,
                backgroundColor: "#194C66",
                borderRadius: 18,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>
                Öppna notiser & meddelanden
              </Text>
            </Pressable>

            <Pressable
              onPress={signOut}
              style={{
                marginTop: 12,
                backgroundColor: "#fee2e2",
                borderRadius: 18,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#991b1b", fontWeight: "900", fontSize: 15 }}>
                Logga ut
              </Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

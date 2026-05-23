import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  BriefcaseBusiness,
  BusFront,
  LogOut,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react-native";

import { colors } from "../theme/colors";
import { supabase } from "../lib/supabase";
import {
  getMyActiveRoles,
  getRoleDescription,
  getRoleLabel,
  getRoleStartPath,
  type MyActiveRole,
} from "../services/roleService";

export default function RoleSelectScreen() {
  const [roles, setRoles] = useState<MyActiveRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const visibleRoles = useMemo(() => {
    return roles.filter((role) => role.isActive);
  }, [roles]);

  const loadRoles = useCallback(async () => {
    try {
      setIsLoading(true);

      const result = await getMyActiveRoles();
      setRoles(result);

      if (result.length === 0) {
        Alert.alert(
          "Ingen roll hittades",
          "Ditt konto saknar behörighet. Kontakta admin."
        );
        return;
      }

      if (result.length === 1) {
        setIsRedirecting(true);
        router.replace(getRoleStartPath(result[0].roleKey) as any);
      }
    } catch (error: any) {
      Alert.alert("Kunde inte hämta roller", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/" as any);
  }

  function chooseRole(role: MyActiveRole) {
    router.replace(getRoleStartPath(role.roleKey) as any);
  }

  if (isLoading || isRedirecting) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>
          {isRedirecting ? "Öppnar rätt vy..." : "Hämtar dina roller..."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <UserRoundCog size={40} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>HELSINGBUSS</Text>
          <Text style={styles.heroTitle}>Välj roll</Text>
          <Text style={styles.heroText}>
            Ditt konto har flera behörigheter. Välj vilken del av appen du vill öppna.
          </Text>
        </View>

        {visibleRoles.map((role) => (
          <Pressable
            key={`${role.roleKey}-${role.role}`}
            style={styles.roleCard}
            onPress={() => chooseRole(role)}
          >
            <View style={styles.roleIcon}>
              {role.roleKey === "driver" ? (
                <BusFront size={25} color={colors.primary} strokeWidth={2.5} />
              ) : role.roleKey === "agent" ? (
                <BriefcaseBusiness size={25} color={colors.primary} strokeWidth={2.5} />
              ) : (
                <ShieldCheck size={25} color={colors.primary} strokeWidth={2.5} />
              )}
            </View>

            <View style={styles.roleTextBox}>
              <Text style={styles.roleTitle}>{getRoleLabel(role.roleKey)}</Text>
              <Text style={styles.roleText}>{getRoleDescription(role.roleKey)}</Text>
            </View>
          </Pressable>
        ))}

        <Pressable style={styles.logoutButton} onPress={signOut}>
          <LogOut size={20} color="#B42318" />
          <Text style={styles.logoutText}>Logga ut</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 12,
    textAlign: "center",
  },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
  },
  heroKicker: {
    color: colors.goldSoft,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 5,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 30,
    fontWeight: "900",
  },
  heroText: {
    color: "#DDEBE8",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 7,
  },

  roleCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  roleIcon: {
    width: 54,
    height: 54,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  roleTextBox: { flex: 1 },
  roleTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  roleText: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 3,
  },

  logoutButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#FFF1F0",
    borderWidth: 1,
    borderColor: "#FFDAD6",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 8,
  },
  logoutText: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
});

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  BadgeCheck,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  getAdminUsersAndRoles,
  getRoleLabel,
  setUserRoleActive,
  type AdminUserGroup,
  type AdminUserRoleRow,
} from "../../services/adminUsersService";

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadUsers = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getAdminUsersAndRoles();
      setUsers(result);
    } catch (error: any) {
      Alert.alert("Kunde inte hämta användare", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers(false);
  }, [loadUsers]);

  const stats = useMemo(() => {
    const roleRows = users.flatMap((user) => user.roles);
    const active = roleRows.filter((role) => role.isActive).length;

    return {
      users: users.length,
      roles: roleRows.length,
      active,
    };
  }, [users]);

  async function toggleRole(role: AdminUserRoleRow) {
    const nextActive = !role.isActive;

    Alert.alert(
      nextActive ? "Aktivera roll" : "Inaktivera roll",
      `Vill du ${nextActive ? "aktivera" : "inaktivera"} rollen ${getRoleLabel(role.role)} för ${role.email}?`,
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

              await loadUsers(true);
            } catch (error: any) {
              Alert.alert("Kunde inte ändra roll", error?.message || "Försök igen.");
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadUsers(true)}
            tintColor={colors.primary}
          />
        }
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
        </Pressable>

        <View style={styles.heroCard}>
          <UsersRound size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>ADMIN</Text>
          <Text style={styles.heroTitle}>Användare & behörigheter</Text>
          <Text style={styles.heroText}>
            Hantera agenter, förare, partners och administratörer i Helsingbuss-appen.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard title="Användare" value={String(stats.users)} />
          <StatCard title="Roller" value={String(stats.roles)} />
          <StatCard title="Aktiva" value={String(stats.active)} />
        </View>

        <View style={styles.quickCard}>
          <Text style={styles.sectionTitle}>Lägg till behörighet</Text>

          <ActionRow
            title="Lägg till agent"
            text="Ge en användare tillgång till bokningsagent-vyn."
            icon={<UserPlus size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => router.push("/admin/user-form?role=agent" as any)}
          />

          <ActionRow
            title="Lägg till förare"
            text="Ge en användare tillgång till förarappen."
            icon={<UsersRound size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => router.push("/admin/user-form?role=driver" as any)}
          />

          <ActionRow
            title="Lägg till partner"
            text="Ge en användare tillgång till partnerflödet."
            icon={<BadgeCheck size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => router.push("/admin/user-form?role=partner" as any)}
          />

          <ActionRow
            title="Lägg till admin"
            text="Ge intern användare administratörsbehörighet."
            icon={<ShieldCheck size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => router.push("/admin/user-form?role=admin" as any)}
          />
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Alla användare</Text>

          <Pressable style={styles.refreshButton} onPress={() => loadUsers(true)}>
            <RefreshCw size={17} color={colors.primary} />
            <Text style={styles.refreshText}>Uppdatera</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar användare...</Text>
          </View>
        ) : null}

        {!isLoading && users.length === 0 ? (
          <View style={styles.emptyCard}>
            <UsersRound size={30} color={colors.primary} />
            <Text style={styles.emptyTitle}>Inga användare hittades</Text>
            <Text style={styles.emptyText}>
              Användare måste finnas i Supabase Auth innan de kan få roll i appen.
            </Text>
          </View>
        ) : null}

        {users.map((user) => (
          <Pressable key={user.userId || user.email} style={styles.userCard} onPress={() => router.push(`/admin/user-detail?userId=${encodeURIComponent(user.userId)}&email=${encodeURIComponent(user.email)}` as any)}>
            <View style={styles.userTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user.displayName || user.email || "HB").slice(0, 2).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>
                  {user.displayName || user.email}
                </Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            </View>

            {user.roles.length === 0 ? (
              <Text style={styles.noRoleText}>Ingen approll tilldelad ännu.</Text>
            ) : (
              user.roles.map((role) => (
                <View key={role.roleId} style={styles.roleRow}>
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
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

function ActionRow({
  title,
  text,
  icon,
  onPress,
}: {
  title: string;
  text: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionRow} onPress={onPress}>
      <View style={styles.actionIcon}>{icon}</View>

      <View style={styles.actionTextBox}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionText}>{text}</Text>
      </View>
    </Pressable>
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

  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
  },
  statValue: { color: colors.primary, fontSize: 21, fontWeight: "900" },
  statTitle: { color: colors.textMuted, fontSize: 11, fontWeight: "900", marginTop: 2 },

  quickCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionRow: {
    marginTop: 4,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionTextBox: { flex: 1 },
  actionTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  actionText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 3 },

  refreshButton: { flexDirection: "row", alignItems: "center" },
  refreshText: { color: colors.primary, fontSize: 12, fontWeight: "900", marginLeft: 5 },

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
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "900", marginTop: 10 },
  emptyText: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18, fontWeight: "700", marginTop: 4, textAlign: "center" },

  userCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  userTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: colors.primary, fontSize: 15, fontWeight: "900" },
  userName: { color: colors.text, fontSize: 15, fontWeight: "900" },
  userEmail: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 3 },

  noRoleText: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontWeight: "700",
    marginTop: 3,
  },

  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 8,
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
});

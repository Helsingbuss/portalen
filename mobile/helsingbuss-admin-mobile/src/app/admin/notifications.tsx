import React, { useCallback, useEffect, useState } from "react";
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
import * as Notifications from "expo-notifications";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  getMyAdminNotifications,
  markAdminNotificationRead,
  sendUnpushedAdminNotifications,
  type AdminNotificationItem,
} from "../../services/adminNotificationsService";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function AgentNotificationsScreen() {
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusText, setStatusText] = useState("Inte testat ännu");

  const loadNotifications = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getMyAdminNotifications();
      setItems(result);
    } catch (error: any) {
      Alert.alert("Kunde inte hämta notiser", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications(false);
  }, [loadNotifications]);

  async function requestPermission() {
    try {
      setIsLoading(true);

      const permission = await Notifications.requestPermissionsAsync();

      if (permission.status === "granted") {
        setStatusText("Notiser är aktiverade");
        Alert.alert("Notiser aktiverade", "Adminappen kan nu visa notiser.");
      } else {
        setStatusText("Notiser är inte aktiverade");
        Alert.alert("Notiser ej aktiverade", "Du behöver tillåta notiser i mobilen.");
      }
    } catch (error: any) {
      Alert.alert("Fel", error?.message || "Kunde inte aktivera notiser.");
    } finally {
      setIsLoading(false);
    }
  }

  async function sendTestNotification() {
    try {
      setIsLoading(true);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Ny adminnotis",
          body: "Detta är en testnotis från Helsingbuss Adminapp.",
          data: { type: "agent_test" },
          sound: true,
        },
        trigger: null,
      });

      setStatusText("Testnotis skickad");
    } catch (error: any) {
      Alert.alert("Fel", error?.message || "Kunde inte skicka testnotis.");
    } finally {
      setIsLoading(false);
    }
  }

  async function sendRealUnreadNotifications() {
    try {
      setIsLoading(true);

      const count = await sendUnpushedAdminNotifications();
      await loadNotifications(true);

      setStatusText(count > 0 ? `${count} riktiga notiser skickades` : "Inga nya notiser att skicka");
    } catch (error: any) {
      Alert.alert("Fel", error?.message || "Kunde inte skicka riktiga notiser.");
    } finally {
      setIsLoading(false);
    }
  }

  async function clearOldNotifications() {
    try {
      setIsLoading(true);

      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();

      setStatusText("Gamla notiser rensade");
      Alert.alert("Rensat", "Gamla schemalagda notiser är borttagna.");
    } catch (error: any) {
      Alert.alert("Fel", error?.message || "Kunde inte rensa notiser.");
    } finally {
      setIsLoading(false);
    }
  }

  async function markRead(item: AdminNotificationItem) {
    try {
      await markAdminNotificationRead(item.id);
      await loadNotifications(true);
    } catch (error: any) {
      Alert.alert("Kunde inte markera som läst", error?.message || "Försök igen.");
    }
  }

  const unreadCount = items.filter((item) => !item.isRead).length;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadNotifications(true)}
            tintColor={colors.primary}
          />
        }
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
        </Pressable>

        <View style={styles.heroCard}>
          <BellRing size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>ADMINAPPEN</Text>
          <Text style={styles.heroTitle}>Notiser</Text>
          <Text style={styles.heroText}>
            Se riktiga adminnotiser för offerter, bokningar och betalningar.
          </Text>
        </View>

        <View style={styles.statusCard}>
          <CheckCircle2 size={24} color={colors.primary} strokeWidth={2.5} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.statusTitle}>Status</Text>
            <Text style={styles.statusText}>
              {statusText} · {unreadCount} olästa notiser
            </Text>
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={requestPermission} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color={colors.white} /> : <BellRing size={20} color={colors.white} />}
          <Text style={styles.primaryButtonText}>Aktivera notiser</Text>
        </Pressable>

        <Pressable style={styles.primaryButton} onPress={sendRealUnreadNotifications} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color={colors.white} /> : <Send size={20} color={colors.white} />}
          <Text style={styles.primaryButtonText}>Skicka nya riktiga notiser</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={sendTestNotification} disabled={isLoading}>
          <Send size={20} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>Skicka testnotis</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={clearOldNotifications} disabled={isLoading}>
          <Trash2 size={20} color={colors.primary} strokeWidth={2.5} />
          <Text style={styles.secondaryButtonText}>Rensa gamla notiser</Text>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Senaste notiser</Text>
          <Pressable style={styles.refreshButton} onPress={() => loadNotifications(true)}>
            <RefreshCw size={17} color={colors.primary} />
            <Text style={styles.refreshText}>Uppdatera</Text>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <BellRing size={30} color={colors.primary} />
            <Text style={styles.emptyTitle}>Inga notiser ännu</Text>
            <Text style={styles.emptyText}>
              Nya offerter, bokningar och betalningshändelser visas här.
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.notificationCard, !item.isRead && styles.notificationCardUnread]}
              onPress={() => markRead(item)}
            >
              <View style={styles.notificationTop}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                {!item.isRead ? <View style={styles.unreadDot} /> : null}
              </View>

              <Text style={styles.notificationBody}>{item.body}</Text>

              <View style={styles.notificationFooter}>
                <Text style={styles.notificationMeta}>{item.type}</Text>
                <Text style={styles.notificationMeta}>
                  {item.isRead ? "Läst" : "Tryck för att markera som läst"}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
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

  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  statusTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  statusText: { color: colors.textMuted, fontSize: 12.5, fontWeight: "700", marginTop: 3 },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 10,
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 8 },

  secondaryButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 10,
  },
  secondaryButtonText: { color: colors.primary, fontSize: 14, fontWeight: "900", marginLeft: 8 },

  sectionHeader: {
    marginTop: 8,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  refreshButton: { flexDirection: "row", alignItems: "center" },
  refreshText: { color: colors.primary, fontSize: 12, fontWeight: "900", marginLeft: 5 },

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

  notificationCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  notificationCardUnread: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  notificationTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  notificationBody: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 6,
  },
  notificationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  notificationMeta: {
    color: colors.primary,
    fontSize: 10.5,
    fontWeight: "900",
  },
});

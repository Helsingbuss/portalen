import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  DriverNotification,
  listDriverNotifications,
  markDriverNotificationRead,
} from "@/services/driverNotificationsService";

function formatDate(value?: string | null) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function priorityLabel(priority?: string | null) {
  if (priority === "urgent") return "Viktig";
  if (priority === "high") return "Prioriterad";
  if (priority === "low") return "Låg";
  return "Normal";
}

export default function DriverNotificationsScreen() {
  const [items, setItems] = useState<DriverNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read_at).length,
    [items]
  );

  const load = useCallback(async () => {
    setError("");

    try {
      const data = await listDriverNotifications();
      setItems(data);
    } catch (e: any) {
      setError(e?.message || "Kunde inte hämta notiser.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openNotification(item: DriverNotification) {
    try {
      if (!item.read_at) {
        const updated = await markDriverNotificationRead(item.id);
        setItems((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, read_at: updated.read_at || new Date().toISOString() } : x))
        );
      }
    } catch {
      // Notisen ska ändå kunna öppnas även om läskvitto misslyckas.
    }

    if (item.target_route) {
      router.push(item.target_route as any);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f4f6f8" }}>
      <View style={{ padding: 20, paddingBottom: 10 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: "#194C66", fontSize: 15, fontWeight: "700" }}>
            Tillbaka
          </Text>
        </Pressable>

        <Text style={{ fontSize: 28, fontWeight: "800", color: "#0f172a" }}>
          Notiser
        </Text>

        <Text style={{ marginTop: 6, color: "#64748b", fontSize: 14 }}>
          Meddelanden, körförfrågningar och påminnelser från trafikledningen.
        </Text>

        <View
          style={{
            marginTop: 14,
            alignSelf: "flex-start",
            borderRadius: 999,
            backgroundColor: unreadCount > 0 ? "#194C66" : "#e2e8f0",
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              color: unreadCount > 0 ? "white" : "#334155",
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {unreadCount} olästa
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 10, color: "#64748b" }}>Laddar notiser...</Text>
        </View>
      ) : error ? (
        <View style={{ margin: 20, borderRadius: 18, backgroundColor: "#fee2e2", padding: 16 }}>
          <Text style={{ color: "#991b1b", fontWeight: "700" }}>Något gick fel</Text>
          <Text style={{ marginTop: 6, color: "#991b1b" }}>{error}</Text>
          <Pressable onPress={load} style={{ marginTop: 12 }}>
            <Text style={{ color: "#194C66", fontWeight: "800" }}>Försök igen</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListEmptyComponent={
            <View style={{ borderRadius: 22, backgroundColor: "white", padding: 20 }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: "#0f172a" }}>
                Inga notiser ännu
              </Text>
              <Text style={{ marginTop: 6, color: "#64748b", lineHeight: 20 }}>
                När trafikledningen skickar körförfrågningar, ändringar eller meddelanden visas de här.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const unread = !item.read_at;

            return (
              <Pressable
                onPress={() => openNotification(item)}
                style={{
                  marginBottom: 12,
                  borderRadius: 22,
                  backgroundColor: "white",
                  padding: 16,
                  borderWidth: unread ? 2 : 1,
                  borderColor: unread ? "#194C66" : "#e2e8f0",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: "#0f172a" }}>
                      {item.in_app_title || item.title}
                    </Text>

                    <Text style={{ marginTop: 6, color: "#475569", lineHeight: 20 }}>
                      {item.in_app_body || item.body}
                    </Text>
                  </View>

                  {unread && (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: "#194C66",
                        marginTop: 5,
                      }}
                    />
                  )}
                </View>

                <View
                  style={{
                    marginTop: 14,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Text style={{ color: "#64748b", fontSize: 12 }}>
                    {formatDate(item.created_at)}
                  </Text>

                  <Text
                    style={{
                      color: item.priority === "urgent" ? "#b91c1c" : "#194C66",
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    {priorityLabel(item.priority)}
                  </Text>
                </View>

                {item.action_label && (
                  <Text style={{ marginTop: 12, color: "#194C66", fontWeight: "800" }}>
                    {item.action_label}
                  </Text>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

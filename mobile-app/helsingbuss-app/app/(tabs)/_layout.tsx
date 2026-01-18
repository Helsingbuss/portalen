import React from "react";
import { Tabs, router } from "expo-router";
import { Pressable, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/mobile/theme/useTheme";

function Icon({ name, color }: { name: any; color: string }) {
  return <Ionicons name={name} size={22} color={color} />;
}

export default function TabsLayout() {
  const t = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.header },
        headerTintColor: t.text,
        tabBarStyle: {
          backgroundColor: t.tabBg,
          borderTopColor: t.tabBorder,
          height: 86,
          paddingTop: 10,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: t.text,
        tabBarInactiveTintColor: t.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="overview"
        options={{
          title: "Översikt",
          headerTitle: "Helsingbuss",
          tabBarIcon: ({ color }) => <Icon name="grid-outline" color={color} />,
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 10, marginRight: 12, alignItems: "center" }}>
              <Pressable onPress={() => {}} style={{ padding: 6 }}>
                <Ionicons name="notifications-outline" size={20} color={t.text} />
              </Pressable>
              <Pressable onPress={() => {}} style={{ padding: 6 }}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={t.text} />
              </Pressable>
              <Pressable onPress={() => router.push("/account")} style={{ padding: 6 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="person" size={18} color={t.text} />
                </View>
              </Pressable>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="offers"
        options={{
          title: "Offerter",
          tabBarIcon: ({ color }) => <Icon name="document-text-outline" color={color} />,
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: "",
          tabBarLabel: "",
          href: null,
          tabBarButton: () => (
            <Pressable onPress={() => router.push("/(tabs)/create")} style={{ position: "relative", top: -20, flex: 1, alignItems: "center", justifyContent: "center" }}>
              <View
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  backgroundColor: t.accent,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOpacity: 0.25,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 10,
                }}
              >
                <Ionicons name="add" size={34} color="white" />
              </View>
              <Text style={{ marginTop: 6, fontSize: 11, fontWeight: "800", color: t.muted }}>Skapa</Text>
            </Pressable>
          ),
        }}
      />

      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bokningar",
          tabBarIcon: ({ color }) => <Icon name="calendar-outline" color={color} />,
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          title: "Mer",
          tabBarIcon: ({ color }) => <Icon name="menu-outline" color={color} />,
        }}
      />

      # dölj ev extra routes om de finns
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="economy" options={{ href: null }} />
      <Tabs.Screen name="trips" options={{ href: null }} />
    </Tabs>
  );
}
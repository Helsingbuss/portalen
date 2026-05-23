import React from "react";
import { Tabs } from "expo-router";
import {
  CalendarDays,
  ClipboardList,
  Home,
  Menu,
  QrCode,
  UsersRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";

function TabIcon({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  return children;
}

export default function DriverLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.goldSoft,
        tabBarInactiveTintColor: "#DDEBE8",
        tabBarStyle: {
          backgroundColor: colors.primary,
          borderTopWidth: 0,
          height: 82,
          paddingTop: 8,
          paddingBottom: 18,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800",
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Hem",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Home size={22} color={color} strokeWidth={2.5} />
            </TabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="trips"
        options={{
          title: "Körningar",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <CalendarDays size={22} color={color} strokeWidth={2.5} />
            </TabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: "Skanna",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <QrCode size={22} color={color} strokeWidth={2.5} />
            </TabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="passengers"
        options={{
          title: "Resenärer",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <UsersRound size={22} color={color} strokeWidth={2.5} />
            </TabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          title: "Mer",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Menu size={22} color={color} strokeWidth={2.5} />
            </TabIcon>
          ),
        }}
      />

            <Tabs.Screen name="order-detail" options={{ href: null }} />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}

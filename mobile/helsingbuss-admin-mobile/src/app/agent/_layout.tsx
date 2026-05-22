import React from "react";
import { Tabs } from "expo-router";
import {
  FileText,
  Home,
  Map,
  Menu,
  MessageCircle,
  Ticket,
} from "lucide-react-native";

import { colors } from "../../theme/colors";

export default function AgentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: "#B8C7C4",
        tabBarStyle: {
          backgroundColor: colors.primary,
          borderTopWidth: 0,
          height: 82,
          paddingBottom: 18,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "900",
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Hem",
          tabBarIcon: ({ color }) => <Home size={22} color={color} strokeWidth={2.5} />,
        }}
      />

      <Tabs.Screen
        name="offers"
        options={{
          title: "Offerter",
          tabBarIcon: ({ color }) => <FileText size={22} color={color} strokeWidth={2.5} />,
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "Chatt",
          tabBarIcon: ({ color }) => <MessageCircle size={22} color={color} strokeWidth={2.5} />,
        }}
      />

      <Tabs.Screen
        name="live-map"
        options={{
          title: "Karta",
          tabBarIcon: ({ color }) => <Map size={22} color={color} strokeWidth={2.5} />,
        }}
      />

      <Tabs.Screen
        name="tickets"
        options={{
          title: "Biljetter",
          tabBarIcon: ({ color }) => <Ticket size={22} color={color} strokeWidth={2.5} />,
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          title: "Mer",
          tabBarIcon: ({ color }) => <Menu size={22} color={color} strokeWidth={2.5} />,
        }}
      />

            <Tabs.Screen name="agent-rules-accept" options={{ href: null }} />
            <Tabs.Screen name="documents-help" options={{ href: null }} />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="new-offer" options={{ href: null }} />
      <Tabs.Screen name="send-offer" options={{ href: null }} />
      <Tabs.Screen name="shuttle-booking" options={{ href: null }} />
      <Tabs.Screen name="sundra-booking" options={{ href: null }} />
      <Tabs.Screen name="live-tracking" options={{ href: null }} />
      <Tabs.Screen name="bookings" options={{ href: null }} />
      <Tabs.Screen name="booking-detail" options={{ href: null }} />
      <Tabs.Screen name="offer-detail" options={{ href: null }} />
      <Tabs.Screen name="offer-map" options={{ href: null }} />
          <Tabs.Screen name="profile" options={{ href: null }} />
          <Tabs.Screen name="agent-rules" options={{ href: null }} />
    </Tabs>
  );
}




import React, { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Bell, CalendarDays, Home, Menu, Route } from "lucide-react-native";
import * as Notifications from "expo-notifications";
import { colors } from "../../theme/colors";
import { registerPushTokenForCurrentUser } from "../../lib/notifications";

export default function AdminTabsLayout() {
  useEffect(() => {
    registerPushTokenForCurrentUser().then((result) => {
      console.log("Push registration:", result.message);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;

      if (typeof route === "string" && route.startsWith("/")) {
        router.push(route as any);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: "#DCE8E5",
        tabBarStyle: {
          backgroundColor: colors.primaryDeep,
          borderTopWidth: 0,
          height: 76,
          paddingTop: 8,
          paddingBottom: 12,
          shadowColor: "#000",
          shadowOpacity: 0.22,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -6 },
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "900",
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Hem",
          tabBarIcon: ({ color, focused }) => (
            <Home size={22} color={color} strokeWidth={focused ? 2.8 : 2.2} />
          ),
        }}
      />

      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bokningar",
          tabBarIcon: ({ color, focused }) => (
            <CalendarDays size={22} color={color} strokeWidth={focused ? 2.8 : 2.2} />
          ),
        }}
      />

      <Tabs.Screen
        name="traffic"
        options={{
          title: "Drift",
          tabBarIcon: ({ color, focused }) => (
            <Route size={22} color={color} strokeWidth={focused ? 2.8 : 2.2} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notiser",
          tabBarIcon: ({ color, focused }) => (
            <Bell size={22} color={color} strokeWidth={focused ? 2.8 : 2.2} />
          ),
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          title: "Mer",
          tabBarIcon: ({ color, focused }) => (
            <Menu size={23} color={color} strokeWidth={focused ? 2.8 : 2.2} />
          ),
        }}
      />

      <Tabs.Screen name="booking-detail" options={{ href: null }} />
      <Tabs.Screen name="scanner" options={{ href: null }} />
      <Tabs.Screen name="store" options={{ href: null }} />
      <Tabs.Screen name="store-new-sale" options={{ href: null }} />
      <Tabs.Screen name="fleet" options={{ href: null }} />
      <Tabs.Screen name="fleet-vehicle" options={{ href: null }} />
      <Tabs.Screen name="fleet-driver" options={{ href: null }} />
      <Tabs.Screen name="fleet-documents" options={{ href: null }} />
      <Tabs.Screen name="fleet-vehicle-form" options={{ href: null }} />
      <Tabs.Screen name="fleet-driver-form" options={{ href: null }} />
          <Tabs.Screen name="crm" options={{ href: null }} />
      <Tabs.Screen name="customer-detail" options={{ href: null }} />
      <Tabs.Screen name="customer-form" options={{ href: null }} />
          <Tabs.Screen name="partners" options={{ href: null }} />
      <Tabs.Screen name="partner-detail" options={{ href: null }} />
      <Tabs.Screen name="partner-form" options={{ href: null }} />
      <Tabs.Screen name="partner-vehicle-form" options={{ href: null }} />
      <Tabs.Screen name="partner-document-form" options={{ href: null }} />
          <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="report-tickets" options={{ href: null }} />
      <Tabs.Screen name="report-summary" options={{ href: null }} />
      <Tabs.Screen name="report-business-units" options={{ href: null }} />
          <Tabs.Screen name="report-export" options={{ href: null }} />
          <Tabs.Screen name="economy" options={{ href: null }} />
          <Tabs.Screen name="invoices" options={{ href: null }} />
      <Tabs.Screen name="invoice-form" options={{ href: null }} />
      <Tabs.Screen name="invoice-detail" options={{ href: null }} />
          <Tabs.Screen name="reconciliation" options={{ href: null }} />
          <Tabs.Screen name="expenses" options={{ href: null }} />
      <Tabs.Screen name="expense-form" options={{ href: null }} />
          <Tabs.Screen name="active-offers" options={{ href: null }} />
          <Tabs.Screen name="business-results" options={{ href: null }} />
          <Tabs.Screen name="offer-calculator" options={{ href: null }} />
          <Tabs.Screen name="offer-detail" options={{ href: null }} />
          <Tabs.Screen name="documents" options={{ href: null }} />
          <Tabs.Screen name="document-form" options={{ href: null }} />
          <Tabs.Screen name="document-reminders" options={{ href: null }} />
          <Tabs.Screen name="offers" options={{ href: null }} />
          <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}



































import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, CalendarDays, Route, Bell, Menu } from "lucide-react-native";

import DashboardScreen from "../screens/dashboard/DashboardScreen";
import BookingsScreen from "../screens/bookings/BookingsScreen";
import TrafficScreen from "../screens/traffic/TrafficScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import MoreScreen from "../screens/more/MoreScreen";
import { colors } from "../theme/colors";

export type MainTabParamList = {
  Hem: undefined;
  Bokningar: undefined;
  Drift: undefined;
  Notiser: undefined;
  Mer: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function tabIcon(routeName: string, color: string, focused: boolean) {
  const size = 22;
  const strokeWidth = focused ? 2.8 : 2.1;

  if (routeName === "Hem") return <Home size={size} color={color} strokeWidth={strokeWidth} />;
  if (routeName === "Bokningar") return <CalendarDays size={size} color={color} strokeWidth={strokeWidth} />;
  if (routeName === "Drift") return <Route size={size} color={color} strokeWidth={strokeWidth} />;
  if (routeName === "Notiser") return <Bell size={size} color={color} strokeWidth={strokeWidth} />;
  return <Menu size={size} color={color} strokeWidth={strokeWidth} />;
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.white,
        tabBarStyle: {
          backgroundColor: colors.primaryDark,
          borderTopWidth: 0,
          height: 72,
          paddingTop: 8,
          paddingBottom: 10
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700"
        },
        tabBarIcon: ({ color, focused }) => tabIcon(route.name, color, focused)
      })}
    >
      <Tab.Screen name="Hem" component={DashboardScreen} />
      <Tab.Screen name="Bokningar" component={BookingsScreen} />
      <Tab.Screen name="Drift" component={TrafficScreen} />
      <Tab.Screen name="Notiser" component={NotificationsScreen} />
      <Tab.Screen name="Mer" component={MoreScreen} />
    </Tab.Navigator>
  );
}

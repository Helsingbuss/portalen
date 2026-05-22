import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { router } from "expo-router";

import DashboardHeader from "../../components/dashboard/DashboardHeader";
import StatCards from "../../components/dashboard/StatCards";
import TrafficStatusCard from "../../components/dashboard/TrafficStatusCard";
import BookingsWeekCard from "../../components/dashboard/BookingsWeekCard";
import QuickActions from "../../components/dashboard/QuickActions";
import RecentActivity from "../../components/dashboard/RecentActivity";
import { colors } from "../../theme/colors";
import {
  getAdminDashboardSummary,
  getFallbackDashboardSummary,
} from "../../services/dashboardService";
import type { AdminDashboardSummary } from "../../types/dashboard";

export default function DashboardScreen() {
  const [summary, setSummary] = useState<AdminDashboardSummary>(
    getFallbackDashboardSummary()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState("");

  const loadDashboard = useCallback(async (refreshing = false) => {
    try {
      setErrorText("");

      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await getAdminDashboardSummary();
      setSummary(data);
    } catch (error) {
      console.log("Dashboard load error:", error);
      setErrorText("Kunde inte hämta dashboard-data just nu.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadDashboard(true)}
            tintColor={colors.primary}
          />
        }
      >
        <DashboardHeader
          onMenuPress={() => router.push("/admin/more")}
          onBellPress={() => router.push("/admin/notifications")}
        />

        <View style={styles.welcome}>
          <Text style={styles.hello}>Hej Andreas! 👋</Text>
          <Text style={styles.subText}>Här är läget i dag.</Text>
        </View>

        {errorText ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Dashboard kunde inte uppdateras</Text>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar statistik...</Text>
          </View>
        ) : null}

        <StatCards
          todayBookings={summary.todayBookings}
          todayBookingsDiff={summary.todayBookingsDiff}
          activeOffers={summary.activeOffers}
          activeOffersDiff={summary.activeOffersDiff}
          upcomingDepartures={summary.upcomingDepartures}
          unreadMessages={summary.unreadMessages}
          onTodayBookingsPress={() => router.push("/admin/bookings?filter=today")}
          onActiveOffersPress={() => router.push("/admin/bookings?filter=offers")}
          onDeparturesPress={() => router.push("/admin/bookings?filter=shuttle")}
          onMessagesPress={() => router.push("/admin/notifications")}
        />

        <Pressable onPress={() => router.push("/admin/traffic")}>
          <TrafficStatusCard
            status={summary.trafficStatus}
            text={summary.trafficText}
          />
        </Pressable>

        <Pressable onPress={() => router.push("/admin/bookings?filter=bookings")}>
          <BookingsWeekCard data={summary.weekBookings} />
        </Pressable>

        <QuickActions />

        <Pressable onPress={() => router.push("/admin/bookings?filter=all")}>
          <RecentActivity data={summary.recentActivity} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  welcome: {
    marginBottom: 0,
  },
  hello: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 3,
  },
  loadingBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 10,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F4B8B1",
    padding: 14,
    marginTop: 14,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "900",
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import { ArrowLeft, Bus, MapPin } from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  getAgentLiveTracking,
  type AgentLivePosition,
} from "../../services/agentWorkflowService";

export default function AgentLiveTrackingScreen() {
  const params = useLocalSearchParams<{ offerId?: string; bookingId?: string }>();

  const mapRef = useRef<MapView | null>(null);

  const [positions, setPositions] = useState<AgentLivePosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getAgentLiveTracking({
        offerId: params.offerId ? String(params.offerId) : undefined,
        bookingId: params.bookingId ? String(params.bookingId) : undefined,
      });

      setPositions(result);
    } catch (error: any) {
      console.log("live tracking error:", error?.message || error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [params.offerId, params.bookingId]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const first = positions[0];

  const region = useMemo(() => {
    if (!first) {
      return {
        latitude: 56.0465,
        longitude: 12.6945,
        latitudeDelta: 0.25,
        longitudeDelta: 0.25,
      };
    }

    return {
      latitude: first.latitude,
      longitude: first.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [first]);

  useEffect(() => {
    if (positions.length > 0) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          positions.map((item) => ({
            latitude: item.latitude,
            longitude: item.longitude,
          })),
          {
            edgePadding: { top: 80, right: 60, bottom: 80, left: 60 },
            animated: true,
          }
        );
      }, 500);
    }
  }, [positions]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
          />
        }
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>

        <View style={styles.heroCard}>
          <Bus size={38} color={colors.goldSoft} />
          <Text style={styles.heroTitle}>Live tracking</Text>
          <Text style={styles.heroText}>
            Här visas bussar som är kopplade till offert eller bokning.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar livepositioner...</Text>
          </View>
        ) : null}

        <View style={styles.mapCard}>
          {positions.length > 0 ? (
            <MapView ref={mapRef} style={styles.map} initialRegion={region}>
              {positions.map((item) => (
                <Marker
                  key={item.id}
                  coordinate={{
                    latitude: item.latitude,
                    longitude: item.longitude,
                  }}
                  title={item.vehicleName}
                  description={`${item.status}${item.driverName ? " · " + item.driverName : ""}`}
                />
              ))}
            </MapView>
          ) : (
            <View style={styles.noMapBox}>
              <MapPin size={34} color={colors.primary} />
              <Text style={styles.noMapTitle}>Ingen liveposition ännu</Text>
              <Text style={styles.noMapText}>
                När en buss skickar position visas den här.
              </Text>
            </View>
          )}
        </View>

        {positions.map((item) => (
          <View key={`row-${item.id}`} style={styles.busCard}>
            <Text style={styles.busTitle}>{item.vehicleName}</Text>
            <Text style={styles.busText}>
              {item.registrationNumber || "Reg.nr saknas"} · {item.status}
            </Text>
            <Text style={styles.busMeta}>
              {item.driverName || "Chaufför saknas"} · {item.speedKmh} km/h
            </Text>
          </View>
        ))}
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
  heroCard: { backgroundColor: colors.primary, borderRadius: 26, padding: 20, marginBottom: 14 },
  heroTitle: { color: colors.white, fontSize: 25, fontWeight: "900", marginTop: 12 },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 6 },
  loadingBox: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: "800", marginLeft: 10 },
  mapCard: {
    height: 360,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  map: { flex: 1 },
  noMapBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  noMapTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginTop: 12 },
  noMapText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
  },
  busCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  busTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  busText: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 3 },
  busMeta: { color: colors.primary, fontSize: 12, fontWeight: "900", marginTop: 5 },
});

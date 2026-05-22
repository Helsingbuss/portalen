import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MapView, { Marker, Polyline } from "react-native-maps";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Map,
  MapPin,
  Route,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  getAgentOfferMapData,
  type AgentOfferMapData,
  type AgentOfferRoutePoint,
} from "../../services/agentOfferMapService";

export default function AgentOfferMapScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const offerId = String(params.id || "");

  const mapRef = useRef<MapView | null>(null);

  const [data, setData] = useState<AgentOfferMapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getAgentOfferMapData(offerId);
      setData(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [offerId]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const points = data?.routePoints || [];
  const roadPolyline = data?.roadPolyline || [];

  const visibleLine = useMemo(() => {
    if (roadPolyline.length >= 2) return roadPolyline;

    return points.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    }));
  }, [points, roadPolyline]);

  const mapRegion = useMemo(() => {
    if (points.length === 0) {
      return {
        latitude: 56.0465,
        longitude: 12.6945,
        latitudeDelta: 0.25,
        longitudeDelta: 0.25,
      };
    }

    const latitudes = points.map((p) => p.latitude);
    const longitudes = points.map((p) => p.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.04, Math.abs(maxLat - minLat) + 0.08),
      longitudeDelta: Math.max(0.04, Math.abs(maxLng - minLng) + 0.08),
    };
  }, [points]);

  useEffect(() => {
    if (points.length >= 2) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          points.map((point) => ({
            latitude: point.latitude,
            longitude: point.longitude,
          })),
          {
            edgePadding: {
              top: 80,
              right: 60,
              bottom: 80,
              left: 60,
            },
            animated: true,
          }
        );
      }, 600);
    }
  }, [points]);

  function openExternalMap() {
    if (points.length < 2) return;

    const first = points[0];
    const last = points[points.length - 1];
    const middle = points.slice(1, -1);

    let url =
      "https://www.google.com/maps/dir/?api=1" +
      "&origin=" +
      first.latitude +
      "," +
      first.longitude +
      "&destination=" +
      last.latitude +
      "," +
      last.longitude +
      "&travelmode=driving";

    if (middle.length > 0) {
      url +=
        "&waypoints=" +
        encodeURIComponent(
          middle
            .map((point) => point.latitude + "," + point.longitude)
            .join("|")
        );
    }

    Linking.openURL(url);
  }

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
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Offertkarta</Text>
            <Text style={styles.subtitle}>{data?.offer.reference || "Rutt per offert"}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Map size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>LIVEKARTA</Text>
          <Text style={styles.heroTitle}>
            {data?.offer.destination || "Rutt och väg för offert"}
          </Text>
          <Text style={styles.heroText}>
            Här visas start, stopp, destination och tydlig ruttlinje för den valda offerten.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar karta...</Text>
          </View>
        ) : null}

        <View style={styles.mapCard}>
          {points.length >= 2 ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={mapRegion}
              showsUserLocation={false}
              showsCompass
              showsScale
            >
              <Polyline
                coordinates={visibleLine}
                strokeWidth={7}
                strokeColor="#003C3A"
                lineCap="round"
                lineJoin="round"
                zIndex={10}
              />

              <Polyline
                coordinates={visibleLine}
                strokeWidth={3}
                strokeColor="#D7A84A"
                lineCap="round"
                lineJoin="round"
                zIndex={11}
              />

              {points.map((point, index) => (
                <Marker
                  key={point.id || `${point.latitude}-${point.longitude}-${index}`}
                  coordinate={{
                    latitude: point.latitude,
                    longitude: point.longitude,
                  }}
                  title={`${index + 1}. ${point.label}`}
                  description={point.address || point.pointType}
                />
              ))}
            </MapView>
          ) : (
            <View style={styles.noMapBox}>
              <MapPin size={34} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.noMapTitle}>Koordinater saknas</Text>
              <Text style={styles.noMapText}>
                Offerten behöver tydlig start och destination för att kartan ska kunna skapa rutt.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>Kartstatus</Text>
          <Text style={styles.debugText}>Ruttpunkter: {points.length}</Text>
          <Text style={styles.debugText}>Väglinje: {visibleLine.length} punkter</Text>
          <Text style={styles.debugText}>
            Källa:{" "}
            {data?.source === "database"
              ? "Koordinater från databasen"
              : data?.source === "geocoded"
              ? "Automatiskt skapad från adress"
              : "Saknas"}
          </Text>
        </View>

        <View style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <Route size={22} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.routeTitle}>Ruttpunkter</Text>
          </View>

          {points.length === 0 ? (
            <Text style={styles.emptyText}>
              Inga ruttpunkter kunde skapas. Kontrollera att offerten har tydlig start och destination.
            </Text>
          ) : (
            points.map((point, index) => (
              <RoutePointRow key={point.id || index} point={point} index={index} />
            ))
          )}
        </View>

        <Pressable
          style={[styles.primaryButton, points.length < 2 && styles.disabled]}
          onPress={openExternalMap}
          disabled={points.length < 2}
        >
          <ExternalLink size={20} color={colors.white} strokeWidth={2.5} />
          <Text style={styles.primaryButtonText}>Öppna väg i Google Maps</Text>
        </Pressable>

        <View style={styles.infoCard}>
          <FileText size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Kartan visar ruttlinje mellan alla ruttpunkter. Finns riktig väg från karttjänsten används den, annars visas en tydlig linje mellan punkterna.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function RoutePointRow({ point, index }: { point: AgentOfferRoutePoint; index: number }) {
  return (
    <View style={styles.routePointRow}>
      <View style={styles.routeNumber}>
        <Text style={styles.routeNumberText}>{index + 1}</Text>
      </View>

      <View style={styles.routePointTextBox}>
        <Text style={styles.routePointTitle}>{point.label}</Text>
        <Text style={styles.routePointText}>
          {point.address || `${point.latitude}, ${point.longitude}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 25, fontWeight: "900" },
  subtitle: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 20,
    marginBottom: 14,
  },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginTop: 12, marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 25, lineHeight: 31, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 7 },

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

  noMapBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  noMapTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 12,
  },
  noMapText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
  },

  debugCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 13,
    marginBottom: 14,
  },
  debugTitle: { color: colors.primary, fontSize: 13, fontWeight: "900", marginBottom: 4 },
  debugText: { color: colors.text, fontSize: 11.5, fontWeight: "800", marginTop: 2 },

  routeCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  routeHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  routeTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginLeft: 8 },
  emptyText: { color: colors.textMuted, fontSize: 12, fontWeight: "800", lineHeight: 18 },

  routePointRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  routeNumber: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  routeNumberText: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  routePointTextBox: { flex: 1 },
  routePointTitle: { color: colors.text, fontSize: 13.5, fontWeight: "900" },
  routePointText: { color: colors.textMuted, fontSize: 11.5, fontWeight: "700", marginTop: 2 },

  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 14,
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 8 },
  disabled: { opacity: 0.5 },

  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
  },
  infoText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginLeft: 10,
  },
});

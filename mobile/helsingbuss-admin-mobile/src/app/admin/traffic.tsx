import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, } from "react-native";
import { router } from "expo-router";
import {
  Bus,
  Clock3,
  Menu,
  Navigation,
  RefreshCw,
} from "lucide-react-native";
import MapView, { Marker, Polyline, type Region } from "react-native-maps";

import { colors } from "../../theme/colors";
import {
  getAdminTrafficOverview,
  getFallbackTrafficOverview,
} from "../../services/trafficService";
import type {
  AdminTrafficOverview,
  LiveVehicle,
  TrafficDeparture,
} from "../../types/traffic";

const HELSINGBORG_REGION: Region = {
  latitude: 56.0465,
  longitude: 12.6945,
  latitudeDelta: 0.22,
  longitudeDelta: 0.22,
};

const fallbackRoute = [
  { latitude: 56.0465, longitude: 12.6945 },
  { latitude: 56.085, longitude: 12.72 },
  { latitude: 56.15, longitude: 12.78 },
  { latitude: 56.24, longitude: 12.86 },
];

export default function TrafficScreen() {
  const [overview, setOverview] = useState<AdminTrafficOverview>(
    getFallbackTrafficOverview()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState("");

  const loadTraffic = useCallback(async (refreshing = false) => {
    try {
      setErrorText("");

      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await getAdminTrafficOverview();
      setOverview(data);
    } catch (error) {
      console.log("Traffic load error:", error);
      setErrorText("Kunde inte hämta driftdata just nu.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTraffic(false);
  }, [loadTraffic]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadTraffic(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.push("/admin/more")}>
            <Menu size={23} color={colors.text} strokeWidth={2.3} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Drift & trafik</Text>
          </View>

          <Pressable style={styles.iconButton} onPress={() => loadTraffic(true)}>
            <RefreshCw size={21} color={colors.text} strokeWidth={2.4} />
          </Pressable>
        </View>

        {errorText ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Drift kunde inte uppdateras</Text>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar driftdata...</Text>
          </View>
        ) : null}

        <TrafficMapCard overview={overview} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kommande avgångar</Text>
          <Pressable onPress={() => router.push("/admin/bookings?filter=shuttle")}>
            <Text style={styles.sectionLink}>Visa alla</Text>
          </Pressable>
        </View>

        <View style={styles.departureCard}>
          {overview.departures.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Inga avgångar hittades</Text>
              <Text style={styles.emptyText}>
                När flygbussar, resor eller körningar finns i portalen visas de här.
              </Text>
            </View>
          ) : (
            overview.departures.map((item, index) => (
              <DepartureRow
                key={`${item.kind}-${item.id}-${index}`}
                item={item}
                isLast={index === overview.departures.length - 1}
              />
            ))
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aktiva bussar</Text>
          <Pressable onPress={() => router.push("/admin/bookings?filter=today")}>
            <Text style={styles.sectionLink}>Visa körningar</Text>
          </Pressable>
        </View>

        <View style={styles.vehicleList}>
          {overview.liveVehicles.length === 0 ? (
            <View style={styles.emptyVehicleCard}>
              <Text style={styles.emptyTitle}>Ingen liveposition ännu</Text>
              <Text style={styles.emptyText}>
                När chaufförsappen börjar skicka GPS visas varje buss både här och på kartan.
              </Text>
            </View>
          ) : (
            overview.liveVehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Snabbstatus</Text>
        </View>

        <View style={styles.statusCard}>
          {overview.quickStatus.map((item, index) => (
            <View
              key={`${item.time}-${index}`}
              style={[
                styles.statusRow,
                index === overview.quickStatus.length - 1 && styles.noBorder,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  item.type === "warning" || item.type === "danger"
                    ? styles.statusDotWarning
                    : styles.statusDotOk,
                ]}
              />

              <Text style={styles.statusMessage}>{item.text}</Text>
              <Text style={styles.statusTime}>{item.time}</Text>
            </View>
          ))}

          <Pressable
            style={styles.allNoticesButton}
            onPress={() => router.push("/admin/notifications")}
          >
            <Text style={styles.allNoticesText}>Visa alla notiser</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function TrafficMapCard({ overview }: { overview: AdminTrafficOverview }) {
  const liveVehiclesWithPosition = useMemo(
    () =>
      overview.liveVehicles.filter(
        (vehicle) =>
          typeof vehicle.lat === "number" &&
          typeof vehicle.lng === "number" &&
          !Number.isNaN(vehicle.lat) &&
          !Number.isNaN(vehicle.lng)
      ),
    [overview.liveVehicles]
  );

  const region: Region = useMemo(() => {
    const firstVehicle = liveVehiclesWithPosition[0];

    if (!firstVehicle?.lat || !firstVehicle?.lng) {
      return HELSINGBORG_REGION;
    }

    return {
      latitude: firstVehicle.lat,
      longitude: firstVehicle.lng,
      latitudeDelta: 0.12,
      longitudeDelta: 0.12,
    };
  }, [liveVehiclesWithPosition]);

  function openVehicle(vehicle: LiveVehicle) {
    const late =
      vehicle.delayMinutes > 0 || vehicle.status.toLowerCase().includes("late");

    Alert.alert(
      vehicle.vehicleName,
      [
        vehicle.title,
        vehicle.route ? `Rutt: ${vehicle.route}` : "",
        `Förare: ${vehicle.driverName}`,
        vehicle.speedKmh ? `Hastighet: ${vehicle.speedKmh} km/h` : "",
        late ? `Försening: ${vehicle.delayMinutes} min` : "Status: Aktiv",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return (
    <View style={styles.mapCard}>
      <View style={styles.mapHeader}>
        <Text style={styles.mapTitle}>Trafiköversikt</Text>
        <Text style={styles.updated}>
          {liveVehiclesWithPosition.length > 0
            ? `${liveVehiclesWithPosition.length} bussar live`
            : "Väntar på GPS"}
        </Text>
      </View>

      <View style={styles.realMapBox}>
        <MapView
          style={styles.realMap}
          initialRegion={region}
          region={region}
          showsCompass
          showsScale
          showsUserLocation={false}
        >
          <Polyline
            coordinates={fallbackRoute}
            strokeColor={colors.primary}
            strokeWidth={4}
          />

          <Marker
            coordinate={{ latitude: 56.0465, longitude: 12.6945 }}
            title="Helsingborg"
            description="Startområde"
          >
            <View style={styles.stopMarker}>
              <View style={styles.stopMarkerDot} />
            </View>
          </Marker>

          {liveVehiclesWithPosition.map((vehicle) => {
            const late =
              vehicle.delayMinutes > 0 ||
              vehicle.status.toLowerCase().includes("late");

            return (
              <Marker
                key={vehicle.id}
                coordinate={{
                  latitude: vehicle.lat!,
                  longitude: vehicle.lng!,
                }}
                title={vehicle.vehicleName}
                description={vehicle.title}
                onPress={() => openVehicle(vehicle)}
              >
                <View style={[styles.vehicleMapMarker, late && styles.vehicleMapMarkerLate]}>
                  <Bus size={20} color={late ? colors.danger : colors.goldSoft} strokeWidth={2.6} />
                </View>
              </Marker>
            );
          })}
        </MapView>

        {liveVehiclesWithPosition.length === 0 ? (
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayTitle}>Ingen buss live ännu</Text>
            <Text style={styles.mapOverlayText}>
              När chaufförsappen skickar GPS dyker bussarna upp här.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statsRow}>
        <Pressable
          style={styles.statItem}
          onPress={() => router.push("/admin/bookings?filter=today")}
        >
          <Text style={styles.statValue}>{overview.summary.departuresToday}</Text>
          <Text style={styles.statLabel}>Avgångar idag</Text>
        </Pressable>

        <View style={styles.statDivider} />

        <Pressable style={styles.statItem}>
          <Text style={styles.statValue}>{overview.summary.delayedToday}</Text>
          <Text style={styles.statLabel}>Försenade</Text>
        </Pressable>

        <View style={styles.statDivider} />

        <Pressable style={styles.statItem}>
          <Text style={styles.statValue}>{overview.summary.cancelledToday}</Text>
          <Text style={styles.statLabel}>Inställda</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DepartureRow({
  item,
  isLast,
}: {
  item: TrafficDeparture;
  isLast: boolean;
}) {
  const isLate = item.statusKey === "late";
  const isCancelled = item.statusKey === "cancelled";

  function openDetail() {
    router.push({
      pathname: "/admin/booking-detail",
      params: {
        id: item.id,
        kind: item.kind,
      },
    } as any);
  }

  return (
    <Pressable
      style={[styles.departureRow, isLast && styles.noBorder]}
      onPress={openDetail}
    >
      <Text style={styles.departureTime}>{item.time || "--:--"}</Text>

      <View style={styles.departureLine}>
        <View
          style={[
            styles.lineDot,
            isLate && styles.lineDotLate,
            isCancelled && styles.lineDotCancelled,
          ]}
        />
        {!isLast ? <View style={styles.lineStroke} /> : null}
      </View>

      <View style={styles.departureContent}>
        <Text style={styles.departureType}>{item.sourceLabel}</Text>
        <Text style={styles.departureTitle}>{item.title}</Text>
        <Text style={styles.departureRoute}>{item.route}</Text>
        <Text style={styles.departureMeta}>Förare: {item.driver}</Text>
      </View>

      <View style={styles.rightBox}>
        <View
          style={[
            styles.statusPill,
            isLate ? styles.statusLate : isCancelled ? styles.statusCancelled : styles.statusOk,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isLate ? styles.statusLateText : isCancelled ? styles.statusCancelledText : styles.statusOkText,
            ]}
          >
            {item.status}
          </Text>
        </View>

        {item.delayMinutes > 0 ? (
          <Text style={styles.delayText}>+{item.delayMinutes} min</Text>
        ) : null}

        <Text style={styles.busText}>Buss: {item.vehicle}</Text>
      </View>
    </Pressable>
  );
}

function VehicleCard({ vehicle }: { vehicle: LiveVehicle }) {
  const late =
    vehicle.delayMinutes > 0 || vehicle.status.toLowerCase().includes("late");

  return (
    <View style={styles.vehicleCard}>
      <View style={[styles.vehicleIconBox, late && styles.vehicleIconLate]}>
        <Navigation size={22} color={late ? colors.danger : colors.primary} />
      </View>

      <View style={styles.vehicleContent}>
        <Text style={styles.vehicleTitle}>{vehicle.vehicleName}</Text>
        <Text style={styles.vehicleText}>{vehicle.title}</Text>
        <Text style={styles.vehicleMeta}>
          Förare: {vehicle.driverName}
          {vehicle.speedKmh ? ` · ${vehicle.speedKmh} km/h` : ""}
        </Text>
      </View>

      <View style={[styles.vehicleStatus, late && styles.vehicleStatusLate]}>
        <Text style={[styles.vehicleStatusText, late && styles.vehicleStatusLateText]}>
          {late ? "Försenad" : "Aktiv"}
        </Text>
      </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
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
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 10,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F4B8B1",
    padding: 14,
    marginBottom: 12,
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

  mapCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  mapHeader: {
    height: 42,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  updated: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
  },
  realMapBox: {
    height: 170,
    position: "relative",
    overflow: "hidden",
  },
  realMap: {
    width: "100%",
    height: "100%",
  },
  stopMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stopMarkerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  vehicleMapMarker: {
    width: 38,
    height: 38,
    borderRadius: 17,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  vehicleMapMarkerLate: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  mapOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapOverlayTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  mapOverlayText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  statsRow: {
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "900",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    height: 43,
    backgroundColor: colors.border,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  sectionLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },

  departureCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    paddingVertical: 4,
  },
  departureRow: {
    flexDirection: "row",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  departureTime: {
    width: 48,
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  departureLine: {
    width: 20,
    alignItems: "center",
    position: "relative",
  },
  lineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  lineDotLate: {
    backgroundColor: colors.danger,
  },
  lineDotCancelled: {
    backgroundColor: colors.warning,
  },
  lineStroke: {
    position: "absolute",
    top: 19,
    width: 1.5,
    height: 58,
    backgroundColor: "#DAD5CA",
  },
  departureContent: {
    flex: 1,
    paddingRight: 7,
  },
  departureType: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    alignSelf: "flex-start",
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 4,
  },
  departureTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  departureRoute: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  departureMeta: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 5,
  },
  rightBox: {
    alignItems: "flex-end",
    minWidth: 82,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusOk: {
    backgroundColor: colors.successSoft,
  },
  statusLate: {
    backgroundColor: colors.dangerSoft,
  },
  statusCancelled: {
    backgroundColor: colors.warningSoft,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  statusOkText: {
    color: colors.success,
  },
  statusLateText: {
    color: colors.danger,
  },
  statusCancelledText: {
    color: "#9A6800",
  },
  delayText: {
    color: colors.danger,
    fontSize: 10.5,
    fontWeight: "900",
    marginTop: 5,
  },
  busText: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
    marginTop: 7,
  },

  vehicleList: {
    gap: 10,
  },
  vehicleCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  vehicleIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vehicleIconLate: {
    backgroundColor: colors.dangerSoft,
  },
  vehicleContent: {
    flex: 1,
  },
  vehicleTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  vehicleText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  vehicleMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  vehicleStatus: {
    backgroundColor: colors.successSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  vehicleStatusLate: {
    backgroundColor: colors.dangerSoft,
  },
  vehicleStatusText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "900",
  },
  vehicleStatusLateText: {
    color: colors.danger,
  },

  emptyBox: {
    paddingVertical: 18,
    paddingHorizontal: 10,
  },
  emptyVehicleCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4,
  },

  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingTop: 7,
    paddingBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  statusDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 10,
  },
  statusDotOk: {
    backgroundColor: colors.success,
  },
  statusDotWarning: {
    backgroundColor: "#F28A2E",
  },
  statusMessage: {
    flex: 1,
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 18,
  },
  statusTime: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 8,
  },
  allNoticesButton: {
    alignItems: "center",
    paddingTop: 12,
  },
  allNoticesText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
});

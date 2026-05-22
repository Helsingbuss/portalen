import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, } from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  Bus,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  ShieldCheck,
  UserRound,
  Wrench,
  FileText
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { FleetDriver, FleetOverview, FleetVehicle } from "../../types/fleet";
import { getFallbackFleetOverview, getFleetOverview } from "../../services/fleetService";

type TabKey = "vehicles" | "staff";

export default function FleetScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("vehicles");
  const [overview, setOverview] = useState<FleetOverview>(getFallbackFleetOverview());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFleet = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await getFleetOverview();
      setOverview(data);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFleet(false);
  }, [loadFleet]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadFleet(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <Text style={styles.title}>Fordon & personal</Text>
        </View>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === "vehicles" && styles.tabActive]}
            onPress={() => setActiveTab("vehicles")}
          >
            <Text style={[styles.tabText, activeTab === "vehicles" && styles.tabTextActive]}>
              Fordon
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === "staff" && styles.tabActive]}
            onPress={() => setActiveTab("staff")}
          >
            <Text style={[styles.tabText, activeTab === "staff" && styles.tabTextActive]}>
              Personal
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() =>
            router.push(
              (activeTab === "vehicles"
                ? "/admin/fleet-vehicle-form"
                : "/admin/fleet-driver-form") as any
            )
          }
        >
          <Text style={styles.addButtonText}>
            {activeTab === "vehicles" ? "+ Lägg till fordon" : "+ Lägg till chaufför"}
          </Text>
        </Pressable>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar fordon och personal...</Text>
          </View>
        ) : null}

        {activeTab === "vehicles" ? (
          <>
            <View style={styles.vehicleList}>
              {overview.vehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Chaufförer</Text>
              <Pressable onPress={() => setActiveTab("staff")}>
                <Text style={styles.sectionLink}>Visa alla</Text>
              </Pressable>
            </View>

            <View style={styles.driverCard}>
              {overview.drivers.slice(0, 3).map((driver, index) => (
                <DriverRow
                  key={driver.id}
                  driver={driver}
                  isLast={index === Math.min(overview.drivers.length, 3) - 1}
                />
              ))}
            </View>

            <DocumentsSection documents={overview.documents} />
          </>
        ) : (
          <>
            <View style={styles.staffHero}>
              <View style={styles.staffHeroIcon}>
                <UserRound size={30} color={colors.goldSoft} strokeWidth={2.5} />
              </View>
              <View style={styles.staffHeroText}>
                <Text style={styles.staffHeroTitle}>Personalöversikt</Text>
                <Text style={styles.staffHeroSub}>
                  Chaufförer, tillgänglighet och dagens uppdrag.
                </Text>
              </View>
            </View>

            <View style={styles.driverCard}>
              {overview.drivers.map((driver, index) => (
                <DriverRow
                  key={driver.id}
                  driver={driver}
                  isLast={index === overview.drivers.length - 1}
                />
              ))}
            </View>

            <DocumentsSection documents={overview.documents} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function VehicleCard({ vehicle }: { vehicle: FleetVehicle }) {
  const status = getVehicleStatus(vehicle.status);

  return (
    <Pressable
      style={styles.vehicleCard}
      onPress={() =>
        router.push({
          pathname: "/admin/fleet-vehicle",
          params: {
            id: vehicle.id,
            name: vehicle.name,
            model: vehicle.model,
            km: vehicle.km,
            nextService: vehicle.nextService,
            status: vehicle.status,
          },
        } as any)
      }
    >
      <View style={styles.busImageBox}>
        <Bus size={42} color={colors.primary} strokeWidth={2.2} />
        <Text style={styles.busImageText}>Helsingbuss</Text>
      </View>

      <View style={styles.vehicleContent}>
        <View style={styles.vehicleTop}>
          <View style={styles.vehicleTitleBox}>
            <Text style={styles.vehicleName}>{vehicle.name}</Text>
            <Text style={styles.vehicleModel}>{vehicle.model || "Modell saknas"}</Text>
          </View>

          <View style={[styles.statusPill, status.box]}>
            <Text style={[styles.statusText, status.text]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.vehicleBottom}>
          <Text style={styles.vehicleMeta}>Km: {vehicle.km}</Text>
          <Text style={styles.vehicleMeta}>Nästa service: {vehicle.nextService || "Ej satt"}</Text>
          <ChevronRight size={17} color={colors.textMuted} strokeWidth={2.4} />
        </View>
      </View>
    </Pressable>
  );
}

function DriverRow({
  driver,
  isLast,
}: {
  driver: FleetDriver;
  isLast: boolean;
}) {
  const inTraffic = driver.status === "in_traffic";

  return (
    <Pressable
      style={[styles.driverRow, isLast && styles.noBorder]}
      onPress={() =>
        router.push({
          pathname: "/admin/fleet-driver",
          params: {
            id: driver.id,
            name: driver.name,
            assignment: driver.assignment,
            phone: driver.phone || "",
            status: driver.status,
          },
        } as any)
      }
    >
      <View style={styles.avatar}>
        <UserRound size={22} color={colors.primary} strokeWidth={2.4} />
      </View>

      <View style={styles.driverContent}>
        <Text style={styles.driverName}>{driver.name}</Text>
        <Text style={styles.driverAssignment}>{driver.assignment}</Text>
      </View>

      <View style={[styles.driverStatus, inTraffic ? styles.driverStatusTraffic : styles.driverStatusAvailable]}>
        <Text
          style={[
            styles.driverStatusText,
            inTraffic ? styles.driverStatusTrafficText : styles.driverStatusAvailableText,
          ]}
        >
          {inTraffic ? "I trafik" : "Tillgänglig"}
        </Text>
      </View>
    </Pressable>
  );
}

function DocumentsSection({ documents }: { documents: FleetOverview["documents"] }) {
  const items = [
    {
      title: "Besiktning",
      value: String(documents.inspectionIssues),
      text: "att åtgärda",
      icon: ClipboardCheck,
      valueType: "danger",
    },
    {
      title: "Service",
      value: String(documents.serviceSoon),
      text: "snart",
      icon: Wrench,
      valueType: "warning",
    },
    {
      title: "Försäkring",
      value: documents.insuranceOk ? "OK" : "Fel",
      text: "giltig",
      icon: ShieldCheck,
      valueType: documents.insuranceOk ? "success" : "danger",
    },
    {
      title: "Checklistor",
      value: String(documents.checklistsTodo),
      text: "att göra",
      icon: CalendarCheck,
      valueType: "warning",
    },
  ];

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dokument & påminnelser</Text>
      </View>

      <View style={styles.documentGrid}>
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Pressable
              key={item.title}
              style={styles.documentBox}
              onPress={() =>
                router.push({
                  pathname: "/admin/fleet-documents",
                  params: {
                    title: item.title,
                    source: "Fordon & personal",
                    kind: item.title.toLowerCase(),
                  },
                } as any)
              }
            >
              <View style={styles.documentIcon}>
                <Icon size={21} color={colors.primary} strokeWidth={2.4} />
              </View>

              <Text style={styles.documentTitle}>{item.title}</Text>
              <Text
                style={[
                  styles.documentValue,
                  item.valueType === "danger" && styles.valueDanger,
                  item.valueType === "warning" && styles.valueWarning,
                  item.valueType === "success" && styles.valueSuccess,
                ]}
              >
                {item.value}
              </Text>
              <Text style={styles.documentText}>{item.text}</Text>
            </Pressable>

          );
        })}
      </View>
    </>
  );
}

function getVehicleStatus(status: string) {
  if (status === "service_soon") {
    return {
      label: "Service snart",
      box: styles.statusWarning,
      text: styles.statusWarningText,
    };
  }

  if (status === "in_traffic") {
    return {
      label: "I trafik",
      box: styles.statusInfo,
      text: styles.statusInfoText,
    };
  }

  return {
    label: "Tillgänglig",
    box: styles.statusSuccess,
    text: styles.statusSuccessText,
  };
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
    marginBottom: 16,
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
    marginRight: 11,
  },
  title: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 5,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    height: 39,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "900",
  },
  tabTextActive: {
    color: colors.white,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
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
  vehicleList: {
    gap: 10,
  },
  vehicleCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  busImageBox: {
    width: 92,
    height: 70,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  busImageText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "900",
    marginTop: 2,
  },
  vehicleContent: {
    flex: 1,
  },
  vehicleTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  vehicleTitleBox: {
    flex: 1,
  },
  vehicleName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  vehicleModel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: "900",
  },
  statusSuccess: {
    backgroundColor: colors.successSoft,
  },
  statusSuccessText: {
    color: colors.success,
  },
  statusWarning: {
    backgroundColor: colors.warningSoft,
  },
  statusWarningText: {
    color: "#9A6800",
  },
  statusInfo: {
    backgroundColor: colors.infoSoft,
  },
  statusInfoText: {
    color: colors.info,
  },
  vehicleBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
    gap: 8,
  },
  vehicleMeta: {
    color: colors.text,
    fontSize: 10.5,
    fontWeight: "800",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 17,
    marginBottom: 9,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  sectionLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  driverCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  driverContent: {
    flex: 1,
  },
  driverName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  driverAssignment: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: "800",
    marginTop: 3,
  },
  driverStatus: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  driverStatusTraffic: {
    backgroundColor: colors.successSoft,
  },
  driverStatusAvailable: {
    backgroundColor: colors.primarySoft,
  },
  driverStatusText: {
    fontSize: 10.5,
    fontWeight: "900",
  },
  driverStatusTrafficText: {
    color: colors.success,
  },
  driverStatusAvailableText: {
    color: colors.primary,
  },
  documentGrid: {
    flexDirection: "row",
    gap: 8,
  },
  documentBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    paddingVertical: 13,
    minHeight: 112,
  },
  documentIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  documentTitle: {
    color: colors.text,
    fontSize: 10.5,
    fontWeight: "900",
    textAlign: "center",
  },
  documentValue: {
    fontSize: 20,
    fontWeight: "900",
    marginTop: 6,
  },
  valueDanger: {
    color: colors.danger,
  },
  valueWarning: {
    color: "#C88400",
  },
  valueSuccess: {
    color: colors.success,
  },
  documentText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
    textAlign: "center",
  },
  staffHero: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  staffHeroIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  staffHeroText: {
    flex: 1,
  },
  staffHeroTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "900",
  },
  staffHeroSub: {
    color: "#DDEBE8",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4,
  },
});






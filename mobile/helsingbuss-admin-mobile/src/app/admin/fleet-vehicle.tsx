import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Bus,
  CalendarCheck,
  ClipboardCheck,
  Gauge,
  ShieldCheck,
  Wrench,
} from "lucide-react-native";
import { colors } from "../../theme/colors";

export default function FleetVehicleDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    model?: string;
    km?: string;
    nextService?: string;
    status?: string;
  }>();

  const name = params.name || params.id || "Fordon";
  const model = params.model || "Modell saknas";
  const km = params.km || "0";
  const nextService = params.nextService || "Ej satt";
  const status = params.status || "available";

  const statusText =
    status === "in_traffic"
      ? "I trafik"
      : status === "service_soon"
        ? "Service snart"
        : "Tillgänglig";

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>{name}</Text>
            <Text style={styles.subtitle}>{model}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.busBox}>
            <Bus size={58} color={colors.goldSoft} strokeWidth={2.4} />
            <Text style={styles.busBrand}>Helsingbuss</Text>
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.heroKicker}>FORDON</Text>
            <Text style={styles.heroTitle}>{name}</Text>
            <Text style={styles.heroText}>{model}</Text>

            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{statusText}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <InfoBox
            title="Mätarställning"
            value={`${km} km`}
            icon={<Gauge size={22} color={colors.primary} />}
          />

          <InfoBox
            title="Nästa service"
            value={nextService}
            icon={<Wrench size={22} color={colors.primary} />}
          />
        </View>

        <Text style={styles.sectionTitle}>Dokument & status</Text>

        <View style={styles.card}>
          <DetailRow
            icon={<ClipboardCheck size={21} color={colors.primary} />}
            title="Besiktning"
            text="2 saker att åtgärda"
            value="Kontrollera"
          />

          <DetailRow
            icon={<Wrench size={21} color={colors.primary} />}
            title="Service"
            text="Serviceintervall och kommande underhåll"
            value="Planera"
          />

          <DetailRow
            icon={<ShieldCheck size={21} color={colors.primary} />}
            title="Försäkring"
            text="Försäkringen är markerad som giltig"
            value="OK"
          />

          <DetailRow
            icon={<CalendarCheck size={21} color={colors.primary} />}
            title="Checklistor"
            text="Daglig kontroll och fordonscheck"
            value="Öppna"
            noBorder
          />
        </View>

        <Text style={styles.sectionTitle}>Snabbåtgärder</Text>

        <Pressable
          style={styles.editButton}
          onPress={() =>
            router.push({
              pathname: "/admin/fleet-vehicle-form",
              params: {
                id: params.id || "",
                name,
                model,
                km,
                nextService,
                status,
              },
            } as any)
          }
        >
          <Text style={styles.editButtonText}>Redigera fordon</Text>
        </Pressable>

        <View style={styles.actionGrid}>
          <Pressable
            style={styles.actionButton}
            onPress={() =>
              router.push({
                pathname: "/admin/fleet-documents",
                params: {
                  title: "Service",
                  source: name,
                  kind: "service",
                },
              } as any)
            }
          >
            <Wrench size={22} color={colors.primary} />
            <Text style={styles.actionText}>Service</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() =>
              router.push({
                pathname: "/admin/fleet-documents",
                params: {
                  title: "Checklistor",
                  source: name,
                  kind: "checklists",
                },
              } as any)
            }
          >
            <ClipboardCheck size={22} color={colors.primary} />
            <Text style={styles.actionText}>Checklistor</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoBox({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.infoBox}>
      <View style={styles.infoIcon}>{icon}</View>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoTitle}>{title}</Text>
    </View>
  );
}

function DetailRow({
  icon,
  title,
  text,
  value,
  noBorder,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  value: string;
  noBorder?: boolean;
}) {
  return (
    <View style={[styles.detailRow, noBorder && styles.noBorder]}>
      <View style={styles.detailIcon}>{icon}</View>

      <View style={styles.detailContent}>
        <Text style={styles.detailTitle}>{title}</Text>
        <Text style={styles.detailText}>{text}</Text>
      </View>

      <Text style={styles.detailValue}>{value}</Text>
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
    marginBottom: 18,
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
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  busBox: {
    width: 118,
    height: 98,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  busBrand: {
    color: colors.goldSoft,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 5,
  },
  heroInfo: {
    flex: 1,
  },
  heroKicker: {
    color: colors.goldSoft,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 5,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 25,
    fontWeight: "900",
  },
  heroText: {
    color: "#DDEBE8",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.gold,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 12,
  },
  statusText: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: "900",
  },
  infoGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  infoBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  infoValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  infoTitle: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: "800",
    marginTop: 3,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  detailIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  detailContent: {
    flex: 1,
  },
  detailTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  detailText: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 3,
  },
  detailValue: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  editButton: {
    backgroundColor: colors.gold,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
  },
  editButtonText: {
    color: colors.primaryDeep,
    fontSize: 14,
    fontWeight: "900",
  },
  actionGrid: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    alignItems: "center",
  },
  actionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 7,
  },
});


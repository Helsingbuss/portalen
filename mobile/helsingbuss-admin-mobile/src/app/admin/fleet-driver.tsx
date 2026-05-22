import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  Mail,
  MessageSquare,
  Phone,
  Route,
  UserRound,
} from "lucide-react-native";
import { colors } from "../../theme/colors";

export default function FleetDriverDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    assignment?: string;
    phone?: string;
    status?: string;
  }>();

  const name = params.name || "Chaufför";
  const assignment = params.assignment || "Tillgänglig";
  const phone = params.phone || "";
  const status = params.status || "available";
  const inTraffic = status === "in_traffic";

  function callDriver() {
    if (phone) Linking.openURL(`tel:${phone}`);
  }

  function smsDriver() {
    if (phone) Linking.openURL(`sms:${phone}`);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>{name}</Text>
            <Text style={styles.subtitle}>Personal & körningar</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <UserRound size={44} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.heroKicker}>CHAUFFÖR</Text>
            <Text style={styles.heroTitle}>{name}</Text>
            <Text style={styles.heroText}>{assignment}</Text>

            <View style={[styles.statusPill, inTraffic ? styles.statusTraffic : styles.statusAvailable]}>
              <Text style={[styles.statusText, inTraffic ? styles.statusTrafficText : styles.statusAvailableText]}>
                {inTraffic ? "I trafik" : "Tillgänglig"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionGrid}>
          <Pressable style={[styles.actionButton, !phone && styles.disabled]} onPress={callDriver} disabled={!phone}>
            <Phone size={21} color={colors.primary} />
            <Text style={styles.actionText}>Ring</Text>
          </Pressable>

          <Pressable style={[styles.actionButton, !phone && styles.disabled]} onPress={smsDriver} disabled={!phone}>
            <MessageSquare size={21} color={colors.primary} />
            <Text style={styles.actionText}>SMS</Text>
          </Pressable>

          <Pressable style={styles.actionButton}>
            <Mail size={21} color={colors.primary} />
            <Text style={styles.actionText}>E-post</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.editButton}
          onPress={() =>
            router.push({
              pathname: "/admin/fleet-driver-form",
              params: {
                id: params.id || "",
                name,
                assignment,
                phone,
                status,
              },
            } as any)
          }
        >
          <Text style={styles.editButtonText}>Redigera personal</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Dagens uppdrag</Text>

        <View style={styles.card}>
          <InfoRow
            icon={<Route size={21} color={colors.primary} />}
            title="Aktuell körning"
            text={assignment}
          />

          <InfoRow
            icon={<CalendarDays size={21} color={colors.primary} />}
            title="Schema"
            text="Dagens uppdrag visas här när körningar kopplas från portalen."
          />

          <InfoRow
            icon={<ClipboardCheck size={21} color={colors.primary} />}
            title="Checklistor"
            text="Kommande fordonskontroller och körordercheckar."
            noBorder
          />
        </View>

        <Text style={styles.sectionTitle}>Kommande funktioner</Text>

        <View style={styles.card}>
          <InfoRow
            icon={<Route size={21} color={colors.primary} />}
            title="Körorder"
            text="Här kopplar vi chaufförens riktiga körorder."
          />

          <InfoRow
            icon={<MessageSquare size={21} color={colors.primary} />}
            title="Avvikelser"
            text="Chauffören ska kunna rapportera förseningar och händelser."
          />

          <InfoRow
            icon={<ClipboardCheck size={21} color={colors.primary} />}
            title="Dokument"
            text="Anställningsdokument, intyg, utbildningar och behörigheter."
            noBorder
          />
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  title,
  text,
  noBorder,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  noBorder?: boolean;
}) {
  return (
    <View style={[styles.infoRow, noBorder && styles.noBorder]}>
      <View style={styles.infoIcon}>{icon}</View>

      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{text}</Text>
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
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
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
    fontSize: 24,
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
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 12,
  },
  statusTraffic: {
    backgroundColor: colors.successSoft,
  },
  statusAvailable: {
    backgroundColor: colors.gold,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "900",
  },
  statusTrafficText: {
    color: colors.success,
  },
  statusAvailableText: {
    color: colors.primaryDeep,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 15,
    alignItems: "center",
  },
  disabled: {
    opacity: 0.45,
  },
  actionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 6,
  },
  editButton: {
    backgroundColor: colors.gold,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 18,
  },
  editButtonText: {
    color: colors.primaryDeep,
    fontSize: 14,
    fontWeight: "900",
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
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  infoIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 3,
  },
});


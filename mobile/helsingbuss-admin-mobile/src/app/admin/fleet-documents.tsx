import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  Wrench,
} from "lucide-react-native";
import { colors } from "../../theme/colors";

const demoItems = [
  {
    title: "Daglig fordonskontroll",
    text: "Checklista före körning",
    status: "Att göra",
    type: "warning",
  },
  {
    title: "Servicepåminnelse",
    text: "Kontrollera kommande serviceintervall",
    status: "Snart",
    type: "warning",
  },
  {
    title: "Försäkringsbevis",
    text: "Dokument markerat som giltigt",
    status: "OK",
    type: "success",
  },
  {
    title: "Besiktningsanmärkning",
    text: "Åtgärd behöver följas upp",
    status: "Åtgärda",
    type: "danger",
  },
];

export default function FleetDocumentsScreen() {
  const params = useLocalSearchParams<{
    title?: string;
    source?: string;
    kind?: string;
  }>();

  const title = params.title || "Dokument";
  const source = params.source || "Fordon & personal";

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{source}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            {getHeroIcon(String(params.kind || ""))}
          </View>

          <Text style={styles.heroKicker}>DOKUMENT & PÅMINNELSER</Text>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroText}>
            Här samlar vi checklistor, service, försäkring och besiktning.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Aktuella punkter</Text>

        <View style={styles.card}>
          {demoItems.map((item, index) => (
            <DocumentRow
              key={item.title}
              title={item.title}
              text={item.text}
              status={item.status}
              type={item.type}
              noBorder={index === demoItems.length - 1}
            />
          ))}
        </View>

        <Text style={styles.note}>
          Nästa steg blir att koppla dessa punkter till riktiga dokumenttabeller i Supabase.
        </Text>
      </ScrollView>
    </View>
  );
}

function getHeroIcon(kind: string) {
  if (kind === "service") return <Wrench size={34} color={colors.goldSoft} strokeWidth={2.4} />;
  if (kind === "insurance") return <ShieldCheck size={34} color={colors.goldSoft} strokeWidth={2.4} />;
  if (kind === "checklists") return <ClipboardCheck size={34} color={colors.goldSoft} strokeWidth={2.4} />;
  return <FileText size={34} color={colors.goldSoft} strokeWidth={2.4} />;
}

function DocumentRow({
  title,
  text,
  status,
  type,
  noBorder,
}: {
  title: string;
  text: string;
  status: string;
  type: string;
  noBorder?: boolean;
}) {
  const success = type === "success";
  const danger = type === "danger";

  return (
    <View style={[styles.documentRow, noBorder && styles.noBorder]}>
      <View
        style={[
          styles.documentIcon,
          success && styles.iconSuccess,
          danger && styles.iconDanger,
        ]}
      >
        {success ? (
          <CheckCircle2 size={21} color={colors.success} />
        ) : danger ? (
          <ClipboardCheck size={21} color={colors.danger} />
        ) : (
          <CalendarCheck size={21} color={colors.primary} />
        )}
      </View>

      <View style={styles.documentContent}>
        <Text style={styles.documentTitle}>{title}</Text>
        <Text style={styles.documentText}>{text}</Text>
      </View>

      <View
        style={[
          styles.statusPill,
          success && styles.statusSuccess,
          danger && styles.statusDanger,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            success && styles.statusSuccessText,
            danger && styles.statusDangerText,
          ]}
        >
          {status}
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
    padding: 20,
    marginBottom: 18,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
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
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 7,
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
    marginBottom: 14,
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  documentIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  iconSuccess: {
    backgroundColor: colors.successSoft,
  },
  iconDanger: {
    backgroundColor: colors.dangerSoft,
  },
  documentContent: {
    flex: 1,
  },
  documentTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  documentText: {
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3,
  },
  statusPill: {
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusSuccess: {
    backgroundColor: colors.successSoft,
  },
  statusDanger: {
    backgroundColor: colors.dangerSoft,
  },
  statusText: {
    color: "#9A6800",
    fontSize: 10.5,
    fontWeight: "900",
  },
  statusSuccessText: {
    color: colors.success,
  },
  statusDangerText: {
    color: colors.danger,
  },
  note: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 14,
  },
});

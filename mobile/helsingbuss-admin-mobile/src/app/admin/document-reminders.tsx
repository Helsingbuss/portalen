import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  CalendarClock,
  FileText,
  Mail,
  ShieldCheck,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { AppDocumentItem, DocumentsOverview } from "../../types/documents";
import {
  formatDocumentDate,
  getDocumentStatusLabel,
  getDocumentTypeLabel,
  getDocumentsOverview,
  getFallbackDocumentsOverview,
} from "../../services/documentsService";
import { sendDocumentReminderViaPortal } from "../../services/documentReminderService";

export default function DocumentRemindersScreen() {
  const [data, setData] = useState<DocumentsOverview>(getFallbackDocumentsOverview());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sendingId, setSendingId] = useState("");

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getDocumentsOverview();
      setData(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const rows = useMemo(() => {
    return data.documents
      .filter((item) => item.status === "expired" || isExpiringSoon(item))
      .sort((a, b) => {
        const aDate = a.expiresAt ? new Date(a.expiresAt).getTime() : 0;
        const bDate = b.expiresAt ? new Date(b.expiresAt).getTime() : 0;
        return aDate - bDate;
      });
  }, [data.documents]);

  async function handleSendReminder(document: AppDocumentItem) {
    try {
      setSendingId(document.id);

      const result = await sendDocumentReminderViaPortal(document.id);

      Alert.alert(
        "Påminnelse skickad",
        `Påminnelsen har skickats till:\n${result.sentTo}\n\nAntal påminnelser: ${result.reminderCount}`
      );

      await loadData(true);
    } catch (error: any) {
      Alert.alert("Kunde inte skicka påminnelse", error?.message || "Försök igen.");
    } finally {
      setSendingId("");
    }
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
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Dokumentpåminnelser</Text>
            <Text style={styles.subtitle}>Dokument som går ut snart eller redan har gått ut</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <BellRing size={38} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>PÅMINNELSER</Text>
          <Text style={styles.heroTitle}>Missa aldrig viktiga avtal och tillstånd.</Text>
          <Text style={styles.heroText}>
            Här visas dokument som går ut inom 30 dagar samt dokument som redan är utgångna.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar dokumentpåminnelser...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            title="Går ut snart"
            value={String(data.summary.expiringCount)}
            text="Inom 30 dagar"
            icon={<CalendarClock size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Utgångna"
            value={String(data.summary.expiredCount)}
            text="Behöver åtgärdas"
            icon={<AlertTriangle size={22} color={colors.primary} />}
          />
        </View>

        <Text style={styles.sectionTitle}>Dokument att följa upp</Text>

        <View style={styles.list}>
          {rows.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Inga dokument behöver följas upp</Text>
              <Text style={styles.emptyText}>
                När avtal, tillstånd eller andra dokument närmar sig utgångsdatum visas de här.
              </Text>
            </View>
          ) : (
            rows.map((document) => (
              <ReminderCard
                key={document.id}
                document={document}
                isSending={sendingId === document.id}
                onSend={() => handleSendReminder(document)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function isExpiringSoon(item: AppDocumentItem) {
  if (!item.expiresAt) return false;

  const expires = new Date(`${item.expiresAt.slice(0, 10)}T00:00:00`);
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");

  if (Number.isNaN(expires.getTime())) return false;

  const diff = Math.ceil((expires.getTime() - today.getTime()) / 86400000);
  return diff >= 0 && diff <= 30;
}

function MetricCard({
  title,
  value,
  text,
  icon,
}: {
  title: string;
  value: string;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricText}>{text}</Text>
    </View>
  );
}

function ReminderCard({
  document,
  isSending,
  onSend,
}: {
  document: AppDocumentItem;
  isSending: boolean;
  onSend: () => void;
}) {
  const expired = document.status === "expired";

  return (
    <View style={[styles.reminderCard, expired && styles.reminderCardDanger]}>
      <View style={[styles.reminderIcon, expired && styles.reminderIconDanger]}>
        {expired ? (
          <AlertTriangle size={22} color={colors.danger} strokeWidth={2.4} />
        ) : (
          <ShieldCheck size={22} color={colors.primary} strokeWidth={2.4} />
        )}
      </View>

      <View style={styles.reminderContent}>
        <Text style={styles.reminderTitle}>{document.title}</Text>
        <Text style={styles.reminderType}>{getDocumentTypeLabel(document.documentType)}</Text>

        <View style={styles.metaRow}>
          <View style={[styles.pill, expired && styles.pillDanger]}>
            <Text style={[styles.pillText, expired && styles.pillTextDanger]}>
              {getDocumentStatusLabel(document.status)}
            </Text>
          </View>

          {document.expiresAt ? (
            <Text style={styles.dateText}>Giltig till: {formatDocumentDate(document.expiresAt)}</Text>
          ) : null}
        </View>

        {document.description ? (
          <Text style={styles.description}>{document.description}</Text>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            style={styles.openButton}
            onPress={() =>
              router.push({
                pathname: "/admin/document-form",
                params: {
                  id: document.id,
                  title: document.title,
                  documentType: document.documentType,
                  category: document.category || "",
                  description: document.description || "",
                  status: document.status,
                  linkedType: document.linkedType || "",
                  linkedId: document.linkedId || "",
                  validFrom: document.validFrom || "",
                  expiresAt: document.expiresAt || "",
                  fileName: document.fileName || "",
                  fileMimeType: document.fileMimeType || "",
                  fileSize: String(document.fileSize || 0),
                  storageBucket: document.storageBucket || "",
                  storagePath: document.storagePath || "",
                  externalUrl: document.externalUrl || "",
                  isConfidential: String(Boolean(document.isConfidential)),
                },
              } as any)
            }
          >
            <FileText size={17} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.openButtonText}>Öppna</Text>
          </Pressable>

          <Pressable
            style={[styles.sendButton, isSending && styles.disabled]}
            onPress={onSend}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Mail size={17} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.sendButtonText}>Skicka påminnelse</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 110 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
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
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 },

  heroCard: { backgroundColor: colors.primary, borderRadius: 26, padding: 20, marginBottom: 14 },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 24, lineHeight: 30, fontWeight: "900" },
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

  grid: { flexDirection: "row", gap: 10, marginBottom: 18 },
  metricCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: "900" },
  metricTitle: { color: colors.text, fontSize: 12, fontWeight: "900", marginTop: 4 },
  metricText: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 3 },

  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },
  list: { gap: 10 },

  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  emptyText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 5 },

  reminderCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
  },
  reminderCardDanger: { borderColor: "#F3C2C2" },
  reminderIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  reminderIconDanger: { backgroundColor: colors.dangerSoft },
  reminderContent: { flex: 1 },
  reminderTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  reminderType: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 2 },

  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 9 },
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  pillDanger: { backgroundColor: colors.dangerSoft },
  pillText: { color: colors.primary, fontSize: 10.5, fontWeight: "900" },
  pillTextDanger: { color: colors.danger },
  dateText: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800" },
  description: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 8 },

  actionRow: { flexDirection: "row", gap: 9, marginTop: 13 },
  openButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  openButtonText: { color: colors.primary, fontSize: 11.5, fontWeight: "900", marginLeft: 6 },
  sendButton: {
    flex: 1.4,
    minHeight: 42,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  sendButtonText: { color: colors.white, fontSize: 11.5, fontWeight: "900", marginLeft: 6 },
  disabled: { opacity: 0.65 },
});

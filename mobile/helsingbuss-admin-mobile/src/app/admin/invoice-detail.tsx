import React, { useCallback, useEffect, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  Edit3,
  Mail,
  ReceiptText,
  Send,
  Share2,
  UserRound,
  WalletCards,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { InvoiceItem } from "../../types/invoices";
import {
  formatInvoiceDate,
  formatInvoiceMoney,
  getInvoiceById,
  getInvoiceStatusLabel,
  updateInvoiceStatus,
} from "../../services/invoicesService";
import { sendInvoiceViaPortal } from "../../services/invoicePortalService";
import { sendInvoiceReminderViaPortal } from "../../services/invoiceReminderService";
import { shareInvoicePdf } from "../../services/invoicePdfService";

export default function InvoiceDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();

  const [invoice, setInvoice] = useState<InvoiceItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isReminding, setIsReminding] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadInvoice = useCallback(async (refreshing = false) => {
    if (!params.id) return;

    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await getInvoiceById(String(params.id));
      setInvoice(data);
    } catch (error: any) {
      Alert.alert("Kunde inte hämta faktura", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadInvoice(false);
  }, [loadInvoice]);

  function getPdfInput() {
    if (!invoice) throw new Error("Faktura saknas.");

    return {
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerPhone: invoice.customerPhone,
      title: invoice.title,
      amount: invoice.amount,
      vatRate: invoice.vatRate,
      dueDate: invoice.dueDate,
      notes: invoice.notes,
      status: invoice.status,
    };
  }

  async function handleSharePdf() {
    if (!invoice) return;

    try {
      setIsSharing(true);
      await shareInvoicePdf(getPdfInput());
    } catch (error: any) {
      Alert.alert("Kunde inte dela PDF", error?.message || "Försök igen.");
    } finally {
      setIsSharing(false);
    }
  }

  async function handleSendInvoice() {
    if (!invoice) return;

    if (!invoice.customerEmail) {
      Alert.alert("E-post saknas", "Fakturan saknar kundens e-postadress.");
      return;
    }

    try {
      setIsSending(true);

      const result = await sendInvoiceViaPortal(invoice.id);

      Alert.alert(
        "Faktura skickad",
        `Fakturan har skickats till:\n${result.sentTo}`
      );

      await loadInvoice(true);
    } catch (error: any) {
      Alert.alert("Kunde inte skicka faktura", error?.message || "Försök igen.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendReminder() {
    if (!invoice) return;

    if (!invoice.customerEmail) {
      Alert.alert("E-post saknas", "Fakturan saknar kundens e-postadress.");
      return;
    }

    try {
      setIsReminding(true);

      const result = await sendInvoiceReminderViaPortal(invoice.id);

      Alert.alert(
        "Påminnelse skickad",
        `Påminnelsen har skickats till:\n${result.sentTo}\n\nAntal påminnelser: ${result.reminderCount}`
      );

      await loadInvoice(true);
    } catch (error: any) {
      Alert.alert("Kunde inte skicka påminnelse", error?.message || "Försök igen.");
    } finally {
      setIsReminding(false);
    }
  }

  async function handleMarkPaid() {
    if (!invoice) return;

    Alert.alert("Markera som betald", "Vill du markera fakturan som betald?", [
      {
        text: "Avbryt",
        style: "cancel",
      },
      {
        text: "Markera betald",
        onPress: async () => {
          try {
            setIsUpdatingStatus(true);
            await updateInvoiceStatus(invoice.id, "paid");
            await loadInvoice(true);
          } catch (error: any) {
            Alert.alert("Kunde inte uppdatera", error?.message || "Försök igen.");
          } finally {
            setIsUpdatingStatus(false);
          }
        },
      },
    ]);
  }

  function openEdit() {
    if (!invoice) return;

    router.push({
      pathname: "/admin/invoice-form",
      params: {
        id: invoice.id,
        sourceType: invoice.sourceType || "",
        sourceId: invoice.sourceId || "",
        invoiceNumber: invoice.invoiceNumber || "",
        customerName: invoice.customerName || "",
        customerEmail: invoice.customerEmail || "",
        customerPhone: invoice.customerPhone || "",
        businessUnit: (invoice as any).businessUnit || "",
        title: invoice.title || "",
        amount: String(invoice.amount || 0),
        vatRate: String(invoice.vatRate || 6),
        status: invoice.status || "draft",
        dueDate: invoice.dueDate || "",
        notes: invoice.notes || "",
      },
    } as any);
  }

  if (isLoading && !invoice) {
    return (
      <View style={styles.screen}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Hämtar faktura...</Text>
        </View>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.screen}>
        <View style={styles.loadingCenter}>
          <Text style={styles.emptyTitle}>Fakturan hittades inte</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Gå tillbaka</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isPaid = invoice.status === "paid";

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadInvoice(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Faktura</Text>
            <Text style={styles.subtitle}>{invoice.invoiceNumber || "Fakturautkast"}</Text>
          </View>

          <Pressable style={styles.editIconButton} onPress={openEdit}>
            <Edit3 size={20} color={colors.white} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <ReceiptText size={38} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>FAKTURA</Text>
          <Text style={styles.heroTitle}>{formatInvoiceMoney(invoice.amount)}</Text>
          <Text style={styles.heroText}>
            {getInvoiceStatusLabel(invoice.status)} · {invoice.customerName || "Kund saknas"}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={styles.statusValue}>{getInvoiceStatusLabel(invoice.status)}</Text>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Förfallodatum</Text>
            <Text style={styles.statusValue}>
              {invoice.dueDate ? formatInvoiceDate(invoice.dueDate) : "Saknas"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Åtgärder</Text>

        <View style={styles.actionGrid}>
          <ActionButton
            title="Skicka"
            icon={<Send size={20} color={colors.white} />}
            primary
            loading={isSending}
            disabled={isPaid}
            onPress={handleSendInvoice}
          />

          <ActionButton
            title="Påminn"
            icon={<BellRing size={20} color={colors.primary} />}
            loading={isReminding}
            disabled={isPaid}
            onPress={handleSendReminder}
          />

          <ActionButton
            title="Dela PDF"
            icon={<Share2 size={20} color={colors.primary} />}
            loading={isSharing}
            onPress={handleSharePdf}
          />

          <ActionButton
            title="Betald"
            icon={<CheckCircle2 size={20} color={colors.primary} />}
            loading={isUpdatingStatus}
            disabled={isPaid}
            onPress={handleMarkPaid}
          />
        </View>

        <Text style={styles.sectionTitle}>Kund</Text>

        <View style={styles.card}>
          <InfoRow
            icon={<UserRound size={20} color={colors.primary} />}
            title="Kundnamn"
            text={invoice.customerName || "Saknas"}
          />

          <InfoRow
            icon={<Mail size={20} color={colors.primary} />}
            title="E-post"
            text={invoice.customerEmail || "Saknas"}
          />

          <InfoRow
            icon={<WalletCards size={20} color={colors.primary} />}
            title="Telefon"
            text={invoice.customerPhone || "Saknas"}
            noBorder
          />
        </View>

        <Text style={styles.sectionTitle}>Fakturadetaljer</Text>

        <View style={styles.card}>
          <DetailRow label="Titel" value={invoice.title} />
          <DetailRow label="Belopp inkl. moms" value={formatInvoiceMoney(invoice.amount)} />
          <DetailRow label="Exkl. moms" value={formatInvoiceMoney(invoice.exVat)} />
          <DetailRow label={`Moms ${invoice.vatRate}%`} value={formatInvoiceMoney(invoice.vatAmount)} />
          <DetailRow label="Skickad till" value={invoice.sentTo || "Ej skickad"} />
          <DetailRow
            label="Skickad datum"
            value={invoice.sentAt ? formatInvoiceDate(invoice.sentAt) : "Ej skickad"}
          />
          <DetailRow
            label="Påminnelser"
            value={String(invoice.reminderCount || 0)}
            noBorder
          />
        </View>

        {invoice.notes ? (
          <>
            <Text style={styles.sectionTitle}>Anteckning</Text>
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>{invoice.notes}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ActionButton({
  title,
  icon,
  primary,
  loading,
  disabled,
  onPress,
}: {
  title: string;
  icon: React.ReactNode;
  primary?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.actionButton,
        primary && styles.actionButtonPrimary,
        disabled && styles.disabled,
      ]}
      disabled={disabled || loading}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.white : colors.primary} />
      ) : (
        <>
          {icon}
          <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
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

function DetailRow({
  label,
  value,
  noBorder,
}: {
  label: string;
  value: string;
  noBorder?: boolean;
}) {
  return (
    <View style={[styles.detailRow, noBorder && styles.noBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 110 },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: "800", marginTop: 10 },
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
  editIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 20,
    marginBottom: 14,
  },
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
  heroTitle: { color: colors.white, fontSize: 30, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, fontWeight: "800", marginTop: 5 },
  statusRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  statusCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  statusLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  statusValue: { color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 5 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  actionButton: {
    width: "48.5%",
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 7,
  },
  actionTextPrimary: { color: colors.white },
  disabled: { opacity: 0.45 },
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
  infoIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  infoContent: { flex: 1 },
  infoTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  infoText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 3 },
  detailRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  detailLabel: { flex: 1, color: colors.textMuted, fontSize: 12, fontWeight: "900" },
  detailValue: { color: colors.text, fontSize: 13, fontWeight: "900", maxWidth: "55%", textAlign: "right" },
  noBorder: { borderBottomWidth: 0 },
  noteBox: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    marginBottom: 18,
  },
  noteText: { color: colors.text, fontSize: 13, lineHeight: 19, fontWeight: "700" },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "900", marginBottom: 10 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 19,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    marginTop: 12,
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900" },
});


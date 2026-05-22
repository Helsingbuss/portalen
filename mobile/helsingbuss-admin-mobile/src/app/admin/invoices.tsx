import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, } from "react-native";
import { router } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  FilePlus2,
  FileText,
  ReceiptText,
  WalletCards,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { InvoiceItem, InvoicesOverview } from "../../types/invoices";
import {
  formatInvoiceDate,
  formatInvoiceMoney,
  getFallbackInvoicesOverview,
  getInvoiceStatusLabel,
  getInvoicesOverview,
} from "../../services/invoicesService";

type FilterKey =
  | "all"
  | "unpaid"
  | "due_soon"
  | "overdue"
  | "draft"
  | "sent"
  | "paid"
  | "candidates";

export default function InvoicesScreen() {
  const [data, setData] = useState<InvoicesOverview>(getFallbackInvoicesOverview());
  const [filter, setFilter] = useState<FilterKey>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getInvoicesOverview();
      setData(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const invoiceStats = useMemo(() => {
    const invoices = data.invoices;

    const unpaid = invoices.filter((item) => isUnpaidInvoice(item));
    const dueSoon = invoices.filter((item) => isDueSoonInvoice(item));
    const overdue = invoices.filter((item) => isOverdueInvoice(item));

    return {
      unpaidCount: unpaid.length,
      unpaidAmount: unpaid.reduce((sum, item) => sum + Number(item.amount || 0), 0),

      dueSoonCount: dueSoon.length,
      dueSoonAmount: dueSoon.reduce((sum, item) => sum + Number(item.amount || 0), 0),

      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    };
  }, [data.invoices]);

  const rows = useMemo(() => {
    if (filter === "candidates") return data.candidates;

    const allInvoices = data.invoices;

    if (filter === "all") return allInvoices;

    if (filter === "unpaid") {
      return allInvoices.filter((item) => isUnpaidInvoice(item));
    }

    if (filter === "due_soon") {
      return allInvoices.filter((item) => isDueSoonInvoice(item));
    }

    if (filter === "overdue") {
      return allInvoices.filter((item) => isOverdueInvoice(item));
    }

    return allInvoices.filter((item) => item.status === filter);
  }, [data, filter]);

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
            <Text style={styles.title}>Fakturor</Text>
            <Text style={styles.subtitle}>Utkast, obetalda, förfallna och bokningar att fakturera</Text>
          </View>

          <Pressable
            style={styles.addIconButton}
            onPress={() => router.push("/admin/invoice-form" as any)}
          >
            <FilePlus2 size={21} color={colors.white} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <ReceiptText size={36} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>FAKTUROR</Text>
          <Text style={styles.heroTitle}>Följ fakturor från utkast till betald.</Text>
          <Text style={styles.heroText}>
            Här ser du vad som är obetalt, vad som förfaller snart och vad som redan är förfallet.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar fakturor...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            title="Obetalt"
            value={formatInvoiceMoney(invoiceStats.unpaidAmount)}
            text={`${invoiceStats.unpaidCount} fakturor`}
            icon={<WalletCards size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Förfaller snart"
            value={String(invoiceStats.dueSoonCount)}
            text={formatInvoiceMoney(invoiceStats.dueSoonAmount)}
            icon={<CalendarClock size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Förfallet"
            value={String(invoiceStats.overdueCount)}
            text={formatInvoiceMoney(invoiceStats.overdueAmount)}
            icon={<AlertTriangle size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Betalt"
            value={formatInvoiceMoney(data.summary.paidAmount)}
            text={`${data.summary.paidCount} betalda`}
            icon={<CheckCircle2 size={22} color={colors.primary} />}
          />
        </View>

        <View style={styles.warningGrid}>
          {invoiceStats.overdueCount > 0 ? (
            <Pressable
              style={styles.warningCard}
              onPress={() => setFilter("overdue")}
            >
              <AlertTriangle size={22} color={colors.danger} strokeWidth={2.5} />
              <View style={styles.warningTextBox}>
                <Text style={styles.warningTitle}>Du har förfallna fakturor</Text>
                <Text style={styles.warningText}>
                  {invoiceStats.overdueCount} fakturor behöver följas upp.
                </Text>
              </View>
            </Pressable>
          ) : null}

          {invoiceStats.dueSoonCount > 0 ? (
            <Pressable
              style={styles.dueSoonCard}
              onPress={() => setFilter("due_soon")}
            >
              <Clock3 size={22} color={colors.primary} strokeWidth={2.5} />
              <View style={styles.warningTextBox}>
                <Text style={styles.dueSoonTitle}>Förfaller snart</Text>
                <Text style={styles.warningText}>
                  {invoiceStats.dueSoonCount} fakturor förfaller inom 7 dagar.
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          <FilterButton label="Alla" active={filter === "all"} onPress={() => setFilter("all")} />
          <FilterButton label="Obetalda" active={filter === "unpaid"} onPress={() => setFilter("unpaid")} />
          <FilterButton label="Förfaller snart" active={filter === "due_soon"} onPress={() => setFilter("due_soon")} />
          <FilterButton label="Förfallna" active={filter === "overdue"} onPress={() => setFilter("overdue")} />
          <FilterButton label="Utkast" active={filter === "draft"} onPress={() => setFilter("draft")} />
          <FilterButton label="Skickade" active={filter === "sent"} onPress={() => setFilter("sent")} />
          <FilterButton label="Betalda" active={filter === "paid"} onPress={() => setFilter("paid")} />
          <FilterButton label="Att fakturera" active={filter === "candidates"} onPress={() => setFilter("candidates")} />
        </ScrollView>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/admin/invoice-form" as any)}
        >
          <Text style={styles.primaryButtonText}>Skapa fakturautkast</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>{getSectionTitle(filter)}</Text>

        <View style={styles.list}>
          {rows.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Inga poster här just nu</Text>
              <Text style={styles.emptyText}>
                När det finns fakturor i denna kategori visas de här.
              </Text>
            </View>
          ) : (
            rows.map((item, index) => (
              <InvoiceCard key={`${item.source}-${item.id}-${index}`} item={item} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function isUnpaidInvoice(item: InvoiceItem) {
  const status = String(item.status || "").toLowerCase();
  return ["draft", "sent", "overdue"].includes(status);
}

function isOverdueInvoice(item: InvoiceItem) {
  const status = String(item.status || "").toLowerCase();

  if (status === "overdue") return true;
  if (status === "paid" || status === "cancelled") return false;
  if (!item.dueDate) return false;

  const due = parseDateOnly(item.dueDate);
  const today = parseDateOnly(new Date().toISOString());

  if (!due || !today) return false;

  return due.getTime() < today.getTime();
}

function isDueSoonInvoice(item: InvoiceItem) {
  const status = String(item.status || "").toLowerCase();

  if (status === "paid" || status === "cancelled" || status === "overdue") return false;
  if (!item.dueDate) return false;

  const due = parseDateOnly(item.dueDate);
  const today = parseDateOnly(new Date().toISOString());

  if (!due || !today) return false;

  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86400000);

  return diffDays >= 0 && diffDays <= 7;
}

function parseDateOnly(value: string) {
  const clean = String(value || "").slice(0, 10);

  if (!clean) return null;

  const parsed = new Date(`${clean}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

function getSectionTitle(filter: FilterKey) {
  if (filter === "unpaid") return "Obetalda fakturor";
  if (filter === "due_soon") return "Fakturor som förfaller snart";
  if (filter === "overdue") return "Förfallna fakturor";
  if (filter === "draft") return "Fakturautkast";
  if (filter === "sent") return "Skickade fakturor";
  if (filter === "paid") return "Betalda fakturor";
  if (filter === "candidates") return "Bokningar att fakturera";
  return "Alla fakturor";
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

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function InvoiceCard({ item }: { item: InvoiceItem }) {
  const isCandidate = item.source === "booking_candidate";
  const overdue = !isCandidate && isOverdueInvoice(item);
  const dueSoon = !isCandidate && isDueSoonInvoice(item);

  function handlePress() {
    if (isCandidate) {
      router.push({
        pathname: "/admin/invoice-form",
        params: {
          sourceType: item.sourceType || "booking",
          sourceId: item.sourceId || item.id,
          invoiceNumber: "",
          customerName: item.customerName || "",
          customerEmail: item.customerEmail || "",
          customerPhone: item.customerPhone || "",
          title: item.title || "",
          amount: String(item.amount || 0),
          vatRate: String(item.vatRate || 6),
          status: "draft",
          dueDate: item.dueDate || "",
          notes: item.notes || "",
        },
      } as any);
      return;
    }

    router.push({
      pathname: "/admin/invoice-detail",
      params: {
        id: item.id,
      },
    } as any);
  }

  return (
    <Pressable
      style={[
        styles.invoiceCard,
        overdue && styles.invoiceCardOverdue,
        dueSoon && styles.invoiceCardDueSoon,
      ]}
      onPress={handlePress}
    >
      <View style={[
        styles.invoiceIcon,
        overdue && styles.invoiceIconOverdue,
        dueSoon && styles.invoiceIconDueSoon,
      ]}>
        {isCandidate ? (
          <BriefcaseBusiness size={22} color={colors.primary} strokeWidth={2.4} />
        ) : overdue ? (
          <AlertTriangle size={22} color={colors.danger} strokeWidth={2.4} />
        ) : dueSoon ? (
          <Clock3 size={22} color={colors.primary} strokeWidth={2.4} />
        ) : (
          <ReceiptText size={22} color={colors.primary} strokeWidth={2.4} />
        )}
      </View>

      <View style={styles.invoiceContent}>
        <View style={styles.invoiceTop}>
          <View style={styles.invoiceTitleBox}>
            <Text style={styles.invoiceTitle}>{item.title}</Text>
            <Text style={styles.invoiceRef}>
              {isCandidate ? `Bokning ${item.reference || item.id}` : item.invoiceNumber || "Fakturautkast"}
            </Text>
          </View>

          <Text style={styles.invoiceAmount}>{formatInvoiceMoney(item.amount)}</Text>
        </View>

        <Text style={styles.invoiceCustomer}>
          {item.customerName || item.customerEmail || item.customerPhone || "Kund saknas"}
        </Text>

        <View style={styles.invoiceMeta}>
          <View style={[
            styles.pill,
            overdue && styles.pillDanger,
            dueSoon && styles.pillDueSoon,
          ]}>
            <Text style={[
              styles.pillText,
              overdue && styles.pillTextDanger,
            ]}>
              {isCandidate
                ? "Att fakturera"
                : overdue
                  ? "Förfallen"
                  : dueSoon
                    ? "Förfaller snart"
                    : getInvoiceStatusLabel(item.status)}
            </Text>
          </View>

          {item.dueDate ? (
            <Text style={styles.invoiceDate}>Förfallo: {formatInvoiceDate(item.dueDate)}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
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
  addIconButton: {
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
  heroCard: { backgroundColor: colors.primary, borderRadius: 26, padding: 20, marginBottom: 14 },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  metricCard: {
    width: "48.5%",
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
  warningGrid: { gap: 10, marginBottom: 14 },
  warningCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3C2C2",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  dueSoonCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  warningTextBox: { flex: 1, marginLeft: 10 },
  warningTitle: { color: colors.danger, fontSize: 14, fontWeight: "900" },
  dueSoonTitle: { color: colors.primary, fontSize: 14, fontWeight: "900" },
  warningText: { color: colors.text, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 2 },
  tabsScroll: { gap: 8, paddingBottom: 14 },
  tab: {
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  tabTextActive: { color: colors.white },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 18,
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900" },
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
  invoiceCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
  },
  invoiceCardOverdue: { borderColor: "#F3C2C2" },
  invoiceCardDueSoon: { borderColor: colors.primarySoft },
  invoiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  invoiceIconOverdue: { backgroundColor: colors.dangerSoft },
  invoiceIconDueSoon: { backgroundColor: colors.primarySoft },
  invoiceContent: { flex: 1 },
  invoiceTop: { flexDirection: "row", alignItems: "flex-start" },
  invoiceTitleBox: { flex: 1 },
  invoiceTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  invoiceRef: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800", marginTop: 2 },
  invoiceAmount: { color: colors.primary, fontSize: 13, fontWeight: "900", marginLeft: 8 },
  invoiceCustomer: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 6 },
  invoiceMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 9 },
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  pillDanger: { backgroundColor: colors.dangerSoft },
  pillDueSoon: { backgroundColor: colors.primarySoft },
  pillText: { color: colors.primary, fontSize: 10.5, fontWeight: "900" },
  pillTextDanger: { color: colors.danger },
  invoiceDate: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800" },
});

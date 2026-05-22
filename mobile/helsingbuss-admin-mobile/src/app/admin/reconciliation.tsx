import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  BriefcaseBusiness,
  CheckCircle2,
  CreditCard,
  FileText,
  ReceiptText,
  Scale,
  WalletCards,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { ReconciliationOverview, ReconciliationRow } from "../../types/reconciliation";
import {
  formatReconciliationDate,
  formatReconciliationMoney,
  getFallbackReconciliationOverview,
  getReconciliationOverview,
  getReconciliationStatusLabel,
} from "../../services/reconciliationService";

export default function ReconciliationScreen() {
  const [data, setData] = useState<ReconciliationOverview>(getFallbackReconciliationOverview());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getReconciliationOverview();
      setData(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const pendingCosts =
    data.summary.expensesPendingAmount + data.summary.expensesOverdueAmount;

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
            <Text style={styles.title}>Avstämning</Text>
            <Text style={styles.subtitle}>Intäkter, kostnader och resultat</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Scale size={38} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>EKONOMI</Text>
          <Text style={styles.heroTitle}>Stäm av intäkter mot kostnader.</Text>
          <Text style={styles.heroText}>
            Se vad som är betalt, vad som väntar, vad verksamheten kostar och vilket preliminärt resultat du har.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar avstämning...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            title="Mottaget"
            value={formatReconciliationMoney(data.summary.totalReceived)}
            text="Kassa + betalda fakturor"
            icon={<CheckCircle2 size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Kostnader"
            value={formatReconciliationMoney(data.summary.totalCosts)}
            text={`${data.summary.expensesTotalCount} kostnadsposter`}
            icon={<ReceiptText size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Preliminärt resultat"
            value={formatReconciliationMoney(data.summary.preliminaryResult)}
            text="Mottaget - betalda kostnader"
            icon={<Scale size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Väntande"
            value={formatReconciliationMoney(data.summary.totalPending)}
            text="Kassa + obetalda fakturor"
            icon={<WalletCards size={22} color={colors.primary} />}
          />
        </View>

        <Text style={styles.sectionTitle}>Resultat</Text>

        <View style={styles.resultCard}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Mottagna intäkter</Text>
            <Text style={styles.resultValue}>
              {formatReconciliationMoney(data.summary.totalReceived)}
            </Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Betalda kostnader</Text>
            <Text style={styles.resultValueNegative}>
              − {formatReconciliationMoney(data.summary.expensesPaidAmount)}
            </Text>
          </View>

          <View style={styles.resultDivider} />

          <View style={styles.resultRow}>
            <Text style={styles.resultTotalLabel}>Preliminärt resultat</Text>
            <Text
              style={[
                styles.resultTotalValue,
                data.summary.preliminaryResult < 0 && styles.resultTotalNegative,
              ]}
            >
              {formatReconciliationMoney(data.summary.preliminaryResult)}
            </Text>
          </View>

          <Text style={styles.resultNote}>
            Förväntat resultat om väntande intäkter, bokningsvärde, accepterade offerter och kostnader räknas med:{" "}
            {formatReconciliationMoney(data.summary.expectedResult)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Uppdelning</Text>

        <View style={styles.card}>
          <BreakdownRow
            icon={<CreditCard size={20} color={colors.primary} />}
            title="Betalt via kassa"
            text={`${data.summary.storePaidCount} betalda`}
            value={formatReconciliationMoney(data.summary.storePaidAmount)}
          />

          <BreakdownRow
            icon={<ReceiptText size={20} color={colors.primary} />}
            title="Betalda fakturor"
            text={`${data.summary.invoicePaidCount} betalda`}
            value={formatReconciliationMoney(data.summary.invoicePaidAmount)}
          />

          <BreakdownRow
            icon={<WalletCards size={20} color={colors.primary} />}
            title="Väntande kassa"
            text={`${data.summary.storePendingCount} väntande/reserverade`}
            value={formatReconciliationMoney(data.summary.storePendingAmount)}
          />

          <BreakdownRow
            icon={<ReceiptText size={20} color={colors.primary} />}
            title="Obetalda fakturor"
            text={`${data.summary.invoiceUnpaidCount} obetalda · ${data.summary.invoiceOverdueCount} förfallna`}
            value={formatReconciliationMoney(data.summary.invoiceUnpaidAmount)}
          />

          <BreakdownRow
            icon={<ReceiptText size={20} color={colors.primary} />}
            title="Kostnader totalt"
            text={`${data.summary.expensesTotalCount} kostnadsposter`}
            value={formatReconciliationMoney(data.summary.expensesTotalAmount)}
          />

          <BreakdownRow
            icon={<ReceiptText size={20} color={colors.primary} />}
            title="Betalda kostnader"
            text={`${data.summary.expensesPaidCount} betalda`}
            value={formatReconciliationMoney(data.summary.expensesPaidAmount)}
          />

          <BreakdownRow
            icon={<ReceiptText size={20} color={colors.primary} />}
            title="Väntande kostnader"
            text={`${data.summary.expensesPendingCount} väntande · ${data.summary.expensesOverdueCount} förfallna`}
            value={formatReconciliationMoney(pendingCosts)}
          />

          <BreakdownRow
            icon={<BriefcaseBusiness size={20} color={colors.primary} />}
            title="Bokningsvärde"
            text={`${data.summary.bookingsCount} bokningar`}
            value={formatReconciliationMoney(data.summary.bookingsValue)}
          />

          <BreakdownRow
            icon={<FileText size={20} color={colors.primary} />}
            title="Accepterade offerter"
            text={`${data.summary.offersAcceptedCount} accepterade`}
            value={formatReconciliationMoney(data.summary.offersAcceptedValue)}
            noBorder
          />
        </View>

        {data.summary.invoiceOverdueCount > 0 ? (
          <Pressable
            style={styles.warningCard}
            onPress={() => router.push("/admin/invoices" as any)}
          >
            <AlertTriangle size={22} color={colors.danger} strokeWidth={2.5} />
            <View style={styles.warningTextBox}>
              <Text style={styles.warningTitle}>Förfallna fakturor behöver åtgärd</Text>
              <Text style={styles.warningText}>
                {data.summary.invoiceOverdueCount} fakturor är förfallna. Öppna fakturasidan och skicka påminnelse.
              </Text>
            </View>
          </Pressable>
        ) : null}

        {data.summary.expensesOverdueCount > 0 ? (
          <Pressable
            style={styles.warningCard}
            onPress={() => router.push("/admin/expenses" as any)}
          >
            <AlertTriangle size={22} color={colors.danger} strokeWidth={2.5} />
            <View style={styles.warningTextBox}>
              <Text style={styles.warningTitle}>Förfallna kostnader behöver kontrolleras</Text>
              <Text style={styles.warningText}>
                {data.summary.expensesOverdueCount} kostnadsposter är förfallna. Öppna utgifter och kontrollera dem.
              </Text>
            </View>
          </Pressable>
        ) : null}

        <Text style={styles.sectionTitle}>Att följa upp</Text>

        <View style={styles.list}>
          {data.followUpRows.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Inget akut att följa upp</Text>
              <Text style={styles.emptyText}>
                När betalningar väntar, fakturor är obetalda eller kostnader är förfallna visas de här.
              </Text>
            </View>
          ) : (
            data.followUpRows.map((row, index) => (
              <FollowUpCard key={`${row.type}-${row.id}-${index}`} row={row} />
            ))
          )}
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Viktigt</Text>
          <Text style={styles.noteText}>
            Avstämningen är en arbetsvy. Den hjälper dig hitta saker som behöver kontrolleras, men ersätter inte bokföring eller bankavstämning.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
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

function BreakdownRow({
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
    <View style={[styles.breakdownRow, noBorder && styles.noBorder]}>
      <View style={styles.breakdownIcon}>{icon}</View>

      <View style={styles.breakdownTextBox}>
        <Text style={styles.breakdownTitle}>{title}</Text>
        <Text style={styles.breakdownText}>{text}</Text>
      </View>

      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  );
}

function FollowUpCard({ row }: { row: ReconciliationRow }) {
  function handlePress() {
    if (row.type === "invoice") {
      router.push({
        pathname: "/admin/invoice-detail",
        params: { id: row.id },
      } as any);
      return;
    }

    if (row.type === "expense") {
      router.push("/admin/expenses" as any);
      return;
    }

    if (row.type === "store") {
      router.push("/admin/store" as any);
    }
  }

  const isDanger = String(row.status || "").toLowerCase() === "overdue";

  return (
    <Pressable
      style={[styles.followCard, isDanger && styles.followCardDanger]}
      onPress={handlePress}
    >
      <View style={[styles.followIcon, isDanger && styles.followIconDanger]}>
        {row.type === "invoice" ? (
          <ReceiptText
            size={22}
            color={isDanger ? colors.danger : colors.primary}
            strokeWidth={2.4}
          />
        ) : row.type === "expense" ? (
          <ReceiptText
            size={22}
            color={isDanger ? colors.danger : colors.primary}
            strokeWidth={2.4}
          />
        ) : (
          <CreditCard size={22} color={colors.primary} strokeWidth={2.4} />
        )}
      </View>

      <View style={styles.followContent}>
        <View style={styles.followTop}>
          <View style={styles.followTitleBox}>
            <Text style={styles.followTitle}>{row.title || row.label}</Text>
            <Text style={styles.followRef}>{row.reference}</Text>
          </View>

          <Text style={styles.followAmount}>{formatReconciliationMoney(row.amount)}</Text>
        </View>

        <Text style={styles.followCustomer}>{row.customer || "Kund/leverantör saknas"}</Text>

        <View style={styles.followMeta}>
          <View style={[styles.pill, isDanger && styles.pillDanger]}>
            <Text style={[styles.pillText, isDanger && styles.pillTextDanger]}>
              {getReconciliationStatusLabel(row.status)}
            </Text>
          </View>

          <View style={styles.pill}>
            <Text style={styles.pillText}>{row.label}</Text>
          </View>

          {row.dueDate ? (
            <Text style={styles.followDate}>Förfallo: {formatReconciliationDate(row.dueDate)}</Text>
          ) : row.createdAt ? (
            <Text style={styles.followDate}>{formatReconciliationDate(row.createdAt)}</Text>
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
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 25, fontWeight: "900", letterSpacing: -0.4 },
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

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
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
  metricText: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    marginTop: 3,
  },

  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },

  resultCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 18,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  resultLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "900" },
  resultValue: { color: colors.text, fontSize: 14, fontWeight: "900" },
  resultValueNegative: { color: colors.danger, fontSize: 14, fontWeight: "900" },
  resultDivider: { height: 1, backgroundColor: "#EEEAE2", marginVertical: 8 },
  resultTotalLabel: { color: colors.text, fontSize: 15, fontWeight: "900" },
  resultTotalValue: { color: colors.primary, fontSize: 18, fontWeight: "900" },
  resultTotalNegative: { color: colors.danger },
  resultNote: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 4,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  breakdownIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  breakdownTextBox: { flex: 1 },
  breakdownTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  breakdownText: {
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3,
  },
  breakdownValue: {
    color: colors.primary,
    fontSize: 12.5,
    fontWeight: "900",
    marginLeft: 8,
    maxWidth: 105,
    textAlign: "right",
  },
  noBorder: { borderBottomWidth: 0 },

  warningCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3C2C2",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  warningTextBox: { flex: 1, marginLeft: 10 },
  warningTitle: { color: colors.danger, fontSize: 14, fontWeight: "900" },
  warningText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 2,
  },

  list: { gap: 10, marginBottom: 18 },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 5,
  },

  followCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
  },
  followCardDanger: { borderColor: "#F3C2C2" },
  followIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  followIconDanger: { backgroundColor: colors.dangerSoft },
  followContent: { flex: 1 },
  followTop: { flexDirection: "row", alignItems: "flex-start" },
  followTitleBox: { flex: 1 },
  followTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  followRef: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800", marginTop: 2 },
  followAmount: { color: colors.primary, fontSize: 13, fontWeight: "900", marginLeft: 8 },
  followCustomer: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 6 },
  followMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 9,
  },
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  pillDanger: { backgroundColor: colors.dangerSoft },
  pillText: { color: colors.primary, fontSize: 10.5, fontWeight: "900" },
  pillTextDanger: { color: colors.danger },
  followDate: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800" },

  noteBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 14,
  },
  noteTitle: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  noteText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 4,
  },
});

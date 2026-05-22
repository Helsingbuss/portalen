import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, } from "react-native";
import { router } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  BriefcaseBusiness,
  Fuel,
  Hotel,
  Plus,
  ReceiptText,
  Ship,
  UserRound,
  WalletCards,
  Wrench,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { ExpenseItem, ExpensesOverview } from "../../types/expenses";
import {
  archiveCompletedOffers,
  formatExpenseMoney,
  getExpenseCategoryLabel,
  getExpenseStatusLabel,
  getExpensesOverview,
  getFallbackExpensesOverview,
} from "../../services/expensesService";

export default function ExpensesScreen() {
  const [data, setData] = useState<ExpensesOverview>(getFallbackExpensesOverview());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isArchivingOffers, setIsArchivingOffers] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getExpensesOverview();
      setData(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  async function handleArchiveOffers() {
    try {
      setIsArchivingOffers(true);
      await archiveCompletedOffers();
      await loadData(true);
    } finally {
      setIsArchivingOffers(false);
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
            <Text style={styles.title}>Utgifter & kostnader</Text>
            <Text style={styles.subtitle}>Operatörer, bränsle, personal och leverantörer</Text>
          </View>

          <Pressable
            style={styles.addIconButton}
            onPress={() => router.push("/admin/expense-form" as any)}
          >
            <Plus size={21} color={colors.white} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <WalletCards size={38} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>KOSTNADER</Text>
          <Text style={styles.heroTitle}>Få koll på vad verksamheten kostar.</Text>
          <Text style={styles.heroText}>
            Här samlar vi kostnader för operatörer, fordon, personal, hotell, färjor och övriga leverantörer.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar utgifter...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            title="Totala kostnader"
            value={formatExpenseMoney(data.summary.totalAmount)}
            text={`${data.summary.totalCount} poster`}
            icon={<ReceiptText size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Betalt"
            value={formatExpenseMoney(data.summary.paidAmount)}
            text={`${data.summary.paidCount} betalda`}
            icon={<WalletCards size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Väntar"
            value={formatExpenseMoney(data.summary.pendingAmount)}
            text={`${data.summary.pendingCount} väntande`}
            icon={<BriefcaseBusiness size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Denna månad"
            value={formatExpenseMoney(data.summary.monthAmount)}
            text="Kostnader hittills"
            icon={<Wrench size={22} color={colors.primary} />}
          />
        </View>

        {data.summary.overdueCount > 0 ? (
          <View style={styles.warningCard}>
            <AlertTriangle size={22} color={colors.danger} strokeWidth={2.5} />
            <View style={styles.warningTextBox}>
              <Text style={styles.warningTitle}>Förfallna kostnader</Text>
              <Text style={styles.warningText}>
                {data.summary.overdueCount} kostnadsposter är förfallna.
              </Text>
            </View>
          </View>
        ) : null}

        <Pressable
          style={[styles.archiveButton, isArchivingOffers && styles.disabled]}
          onPress={handleArchiveOffers}
          disabled={isArchivingOffers}
        >
          {isArchivingOffers ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.archiveButtonText}>Arkivera körda offerter</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.addExpenseButton}
          onPress={() => router.push("/admin/expense-form" as any)}
        >
          <Text style={styles.addExpenseButtonText}>Lägg till kostnad</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Kategorier</Text>

        <View style={styles.card}>
          {data.categories.length === 0 ? (
            <View style={styles.emptySmall}>
              <Text style={styles.emptyText}>Inga kostnader registrerade ännu.</Text>
            </View>
          ) : (
            data.categories.map((item, index) => (
              <CategoryRow
                key={`${item.category}-${index}`}
                category={item.category}
                amount={item.amount}
                count={item.count}
                noBorder={index === data.categories.length - 1}
              />
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Senaste kostnader</Text>

        <View style={styles.list}>
          {data.recentExpenses.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Inga kostnader ännu</Text>
              <Text style={styles.emptyText}>
                När du lägger in kostnader för operatörer, leverantörer eller drift visas de här.
              </Text>
            </View>
          ) : (
            data.recentExpenses.map((expense) => (
              <ExpenseCard key={expense.id} expense={expense} />
            ))
          )}
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

function CategoryRow({
  category,
  amount,
  count,
  noBorder,
}: {
  category: string;
  amount: number;
  count: number;
  noBorder?: boolean;
}) {
  const Icon = getCategoryIcon(category);

  return (
    <View style={[styles.categoryRow, noBorder && styles.noBorder]}>
      <View style={styles.categoryIcon}>
        <Icon size={20} color={colors.primary} strokeWidth={2.4} />
      </View>

      <View style={styles.categoryTextBox}>
        <Text style={styles.categoryTitle}>{getExpenseCategoryLabel(category)}</Text>
        <Text style={styles.categoryText}>{count} poster</Text>
      </View>

      <Text style={styles.categoryAmount}>{formatExpenseMoney(amount)}</Text>
    </View>
  );
}

function ExpenseCard({ expense }: { expense: ExpenseItem }) {
  const Icon = getCategoryIcon(expense.category);
  const isOverdue = String(expense.status).toLowerCase() === "overdue";

  function openExpense() {
    router.push({
      pathname: "/admin/expense-form",
      params: {
        id: expense.id,
        title: expense.title,
        supplierName: expense.supplierName || "",
        businessUnit: (expense as any).businessUnit || "",
        category: expense.category,
        amount: String(expense.amount || 0),
        vatRate: String(expense.vatRate || 25),
        status: expense.status,
        paymentMethod: expense.paymentMethod || "",
        expenseDate: expense.expenseDate || "",
        dueDate: expense.dueDate || "",
        paidAt: expense.paidAt || "",
        receiptUrl: expense.receiptUrl || "",
        notes: expense.notes || "",
      },
    } as any);
  }

  return (
    <Pressable
      style={[styles.expenseCard, isOverdue && styles.expenseCardDanger]}
      onPress={openExpense}
    >
      <View style={[styles.expenseIcon, isOverdue && styles.expenseIconDanger]}>
        <Icon
          size={22}
          color={isOverdue ? colors.danger : colors.primary}
          strokeWidth={2.4}
        />
      </View>

      <View style={styles.expenseContent}>
        <View style={styles.expenseTop}>
          <View style={styles.expenseTitleBox}>
            <Text style={styles.expenseTitle}>{expense.title}</Text>
            <Text style={styles.expenseSupplier}>
              {expense.supplierName || getExpenseCategoryLabel(expense.category)}
            </Text>
          </View>

          <Text style={styles.expenseAmount}>{formatExpenseMoney(expense.amount)}</Text>
        </View>

        <View style={styles.expenseMeta}>
          <View style={[styles.pill, isOverdue && styles.pillDanger]}>
            <Text style={[styles.pillText, isOverdue && styles.pillTextDanger]}>
              {getExpenseStatusLabel(expense.status)}
            </Text>
          </View>

          <View style={styles.pill}>
            <Text style={styles.pillText}>{getExpenseCategoryLabel(expense.category)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function getCategoryIcon(category: string) {
  const clean = String(category || "").toLowerCase();

  if (clean === "fuel") return Fuel;
  if (clean === "staff") return UserRound;
  if (clean === "hotel") return Hotel;
  if (clean === "ferry") return Ship;
  if (clean === "maintenance") return Wrench;
  if (clean === "operator") return BriefcaseBusiness;

  return ReceiptText;
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
  metricText: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 3 },

  warningCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3C2C2",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  warningTextBox: { flex: 1, marginLeft: 10 },
  warningTitle: { color: colors.danger, fontSize: 14, fontWeight: "900" },
  warningText: { color: colors.text, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 2 },

  archiveButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
  },
  archiveButtonText: { color: colors.white, fontSize: 14, fontWeight: "900" },

  addExpenseButton: {
    backgroundColor: colors.gold,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 18,
  },
  addExpenseButtonText: {
    color: colors.primaryDeep,
    fontSize: 14,
    fontWeight: "900",
  },

  disabled: { opacity: 0.65 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },

  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  categoryIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  categoryTextBox: { flex: 1 },
  categoryTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  categoryText: { color: colors.textMuted, fontSize: 11.5, fontWeight: "700", marginTop: 2 },
  categoryAmount: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  noBorder: { borderBottomWidth: 0 },
  emptySmall: { paddingVertical: 14 },

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

  expenseCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
  },
  expenseCardDanger: { borderColor: "#F3C2C2" },
  expenseIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  expenseIconDanger: { backgroundColor: colors.dangerSoft },
  expenseContent: { flex: 1 },
  expenseTop: { flexDirection: "row", alignItems: "flex-start" },
  expenseTitleBox: { flex: 1 },
  expenseTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  expenseSupplier: { color: colors.textMuted, fontSize: 11.5, fontWeight: "800", marginTop: 2 },
  expenseAmount: { color: colors.primary, fontSize: 13, fontWeight: "900", marginLeft: 8 },
  expenseMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 9 },
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  pillDanger: { backgroundColor: colors.dangerSoft },
  pillText: { color: colors.primary, fontSize: 10.5, fontWeight: "900" },
  pillTextDanger: { color: colors.danger },
});


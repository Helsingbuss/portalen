import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, } from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CreditCard,
  FileSpreadsheet,
  FileText,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { EconomyOverview, EconomyPaymentItem } from "../../types/economy";
import {
  formatEconomyDate,
  formatEconomyMoney,
  getEconomyStatusLabel,
  getEconomyOverview,
  getFallbackEconomyOverview,
} from "../../services/economyService";

export default function EconomyScreen() {
  const [data, setData] = useState<EconomyOverview>(getFallbackEconomyOverview());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getEconomyOverview();
      setData(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

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
            <Text style={styles.title}>Ekonomi</Text>
            <Text style={styles.subtitle}>Intäkter, betalningar och uppföljning</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <WalletCards size={36} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>EKONOMI</Text>
          <Text style={styles.heroTitle}>Få koll på pengar, betalningar och värde.</Text>
          <Text style={styles.heroText}>
            Här samlas kassa, bokningar, accepterade offerter och export till bokföring.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar ekonomi...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            title="Totalt synligt värde"
            value={formatEconomyMoney(data.summary.totalVisibleValue)}
            text="Kassa + bokningar + accepterade offerter"
            icon={<TrendingUp size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Betalt via kassa"
            value={formatEconomyMoney(data.summary.storeSales)}
            text={`${data.payments.paidCount} betalda`}
            icon={<CreditCard size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Väntar betalning"
            value={formatEconomyMoney(data.summary.pendingAmount)}
            text={`${data.payments.pendingCount} väntande/reserverade`}
            icon={<ReceiptText size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Bokningsvärde"
            value={formatEconomyMoney(data.bookings.value)}
            text={`${data.bookings.total} bokningar`}
            icon={<BriefcaseBusiness size={22} color={colors.primary} />}
          />
        </View>

        <Text style={styles.sectionTitle}>Uppföljning</Text>

        <View style={styles.card}>
          <InfoRow
            icon={<FileText size={20} color={colors.primary} />}
            title="Accepterade offerter"
            text={`${data.offers.accepted} av ${data.offers.total} offerter`}
            value={formatEconomyMoney(data.offers.acceptedValue)}
          />

          <InfoRow
            icon={<BriefcaseBusiness size={20} color={colors.primary} />}
            title="Bokningar att följa upp"
            text="Bokningar som kan behöva faktureras eller kontrolleras"
            value={String(data.bookings.toInvoice)}
          />

          <InfoRow
            icon={<ReceiptText size={20} color={colors.primary} />}
            title="Återbetalningar"
            text="Markerade som återbetalda i kassan"
            value={String(data.payments.refundedCount)}
            noBorder
          />
        </View>

        <Text style={styles.sectionTitle}>Snabbvägar</Text>

        <View style={styles.quickGrid}>
          <QuickButton
            title="Utgifter"
            text="Kostnader och leverantörer"
            icon={<ReceiptText size={22} color={colors.primary} />}
            onPress={() => router.push("/admin/expenses" as any)}
          />

          <QuickButton
            title="Aktiva offerter"
            text="Öppna offert och räkna pris"
            icon={<FileText size={22} color={colors.primary} />}
            onPress={() => router.push("/admin/active-offers" as any)}
          />

          <QuickButton
            title="Resultat"
            text="Per verksamhet"
            icon={<FileText size={22} color={colors.primary} />}
            onPress={() => router.push("/admin/business-results" as any)}
          />

          <QuickButton
            title="Avstämning"
            text="Kassa, fakturor och underlag"
            icon={<ReceiptText size={22} color={colors.primary} />}
            onPress={() => router.push("/admin/reconciliation" as any)}
          />

          <QuickButton
            title="Fakturor"
            text="Utkast och bokningar"
            icon={<ReceiptText size={22} color={colors.primary} />}
            onPress={() => router.push("/admin/invoices" as any)}
          />

          <QuickButton
            title="Export / bokföring"
            text="CSV och momsunderlag"
            icon={<FileSpreadsheet size={22} color={colors.primary} />}
            onPress={() => router.push("/admin/report-export" as any)}
          />

          <QuickButton
            title="Intäkter"
            text="Per verksamhet"
            icon={<TrendingUp size={22} color={colors.primary} />}
            onPress={() => router.push("/admin/report-business-units" as any)}
          />

          <QuickButton
            title="Sålda biljetter"
            text="Kassa och biljetter"
            icon={<CreditCard size={22} color={colors.primary} />}
            onPress={() => router.push("/admin/report-tickets" as any)}
          />

          <QuickButton
            title="Ny betalning"
            text="Skicka länk"
            icon={<WalletCards size={22} color={colors.primary} />}
            onPress={() => router.push("/admin/store-new-sale" as any)}
          />

          <QuickButton
            title="Dokument"
            text="Avtal, tillstånd och interna underlag"
            icon={<FileText size={22} color={colors.primary} />}
            onPress={() => router.push("/admin/documents" as any)}
          />
        </View>

        <Text style={styles.sectionTitle}>Senaste betalningar</Text>

        <View style={styles.list}>
          {data.recentPayments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Inga betalningar ännu</Text>
              <Text style={styles.emptyText}>
                När du skapar betalningslänkar eller kassaorder visas de här.
              </Text>
            </View>
          ) : (
            data.recentPayments.map((payment) => (
              <PaymentCard key={payment.id} payment={payment} />
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

function InfoRow({
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
    <View style={[styles.infoRow, noBorder && styles.noBorder]}>
      <View style={styles.infoIcon}>{icon}</View>

      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{text}</Text>
      </View>

      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function QuickButton({
  title,
  text,
  icon,
  onPress,
}: {
  title: string;
  text: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickButton} onPress={onPress}>
      <View style={styles.quickIcon}>{icon}</View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickText}>{text}</Text>
    </Pressable>
  );
}

function PaymentCard({ payment }: { payment: EconomyPaymentItem }) {
  function openPayment() {
    if (payment.paymentUrl) {
      Linking.openURL(payment.paymentUrl);
    }
  }

  return (
    <Pressable style={styles.paymentCard} onPress={openPayment}>
      <View style={styles.paymentIcon}>
        <CreditCard size={22} color={colors.primary} strokeWidth={2.4} />
      </View>

      <View style={styles.paymentContent}>
        <View style={styles.paymentTop}>
          <View style={styles.paymentTitleBox}>
            <Text style={styles.paymentTitle}>{payment.title}</Text>
            <Text style={styles.paymentRef}>{payment.reference}</Text>
          </View>

          <Text style={styles.paymentAmount}>{formatEconomyMoney(payment.amount)}</Text>
        </View>

        <Text style={styles.paymentCustomer}>
          {payment.customerName || payment.customerEmail || payment.customerPhone || "Kund saknas"}
        </Text>

        <View style={styles.paymentMeta}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{getEconomyStatusLabel(payment.status)}</Text>
          </View>

          {payment.createdAt ? (
            <Text style={styles.paymentDate}>{formatEconomyDate(payment.createdAt)}</Text>
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
  metricText: { color: colors.textMuted, fontSize: 11, lineHeight: 15, fontWeight: "800", marginTop: 3 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },
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
  noBorder: { borderBottomWidth: 0 },
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
  infoText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 3 },
  infoValue: { color: colors.primary, fontSize: 13, fontWeight: "900", marginLeft: 8, maxWidth: 95, textAlign: "right" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  quickButton: {
    width: "48.5%",
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  quickText: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 3 },
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
  paymentCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
  },
  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  paymentContent: { flex: 1 },
  paymentTop: { flexDirection: "row", alignItems: "flex-start" },
  paymentTitleBox: { flex: 1 },
  paymentTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  paymentRef: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800", marginTop: 2 },
  paymentAmount: { color: colors.primary, fontSize: 13, fontWeight: "900", marginLeft: 8 },
  paymentCustomer: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 6 },
  paymentMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 9 },
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  pillText: { color: colors.primary, fontSize: 10.5, fontWeight: "900" },
  paymentDate: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800" },
});










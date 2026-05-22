import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  FileText,
  TrendingUp,
  WalletCards,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { ReportSummaryOverview, ReportSummaryPoint } from "../../types/reportSummary";
import {
  formatSummaryMoney,
  getChangePercent,
  getFallbackReportSummary,
  getReportSummary,
} from "../../services/reportSummaryService";

export default function ReportSummaryScreen() {
  const [data, setData] = useState<ReportSummaryOverview>(getFallbackReportSummary());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getReportSummary();
      setData(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const weekChange = useMemo(
    () => getChangePercent(data.summary.weekSales, data.summary.prevWeekSales),
    [data.summary.weekSales, data.summary.prevWeekSales]
  );

  const monthChange = useMemo(
    () => getChangePercent(data.summary.monthSales, data.summary.prevMonthSales),
    [data.summary.monthSales, data.summary.prevMonthSales]
  );

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
            <Text style={styles.title}>Summering</Text>
            <Text style={styles.subtitle}>Vecka, månad och utveckling</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <TrendingUp size={36} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>SUMMERING</Text>
          <Text style={styles.heroTitle}>Följ intäkter och aktivitet över tid.</Text>
          <Text style={styles.heroText}>
            Här ser du veckans och månadens utveckling för betalningar, offerter och bokningar.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar summering...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            title="Denna vecka"
            value={formatSummaryMoney(data.summary.weekSales)}
            text={`${data.summary.weekPayments} betalningar`}
            change={weekChange}
            icon={<CalendarDays size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Denna månad"
            value={formatSummaryMoney(data.summary.monthSales)}
            text={`${data.summary.monthPayments} betalningar`}
            change={monthChange}
            icon={<WalletCards size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Betalda"
            value={String(data.summary.paidPayments)}
            text="Totalt i kassan"
            icon={<CreditCard size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Väntande"
            value={String(data.summary.pendingPayments)}
            text="Pending/reserverade"
            icon={<BarChart3 size={22} color={colors.primary} />}
          />
        </View>

        <Text style={styles.sectionTitle}>Aktivitet denna vecka</Text>

        <View style={styles.card}>
          <InfoRow
            icon={<FileText size={20} color={colors.primary} />}
            title="Offerter denna vecka"
            value={data.activity.offersWeek}
          />

          <InfoRow
            icon={<BriefcaseBusiness size={20} color={colors.primary} />}
            title="Bokningar denna vecka"
            value={data.activity.bookingsWeek}
          />

          <InfoRow
            icon={<CreditCard size={20} color={colors.primary} />}
            title="Betalningar denna vecka"
            value={data.summary.weekPayments}
            noBorder
          />
        </View>

        <Text style={styles.sectionTitle}>Aktivitet denna månad</Text>

        <View style={styles.card}>
          <InfoRow
            icon={<FileText size={20} color={colors.primary} />}
            title="Offerter denna månad"
            value={data.activity.offersMonth}
          />

          <InfoRow
            icon={<BriefcaseBusiness size={20} color={colors.primary} />}
            title="Bokningar denna månad"
            value={data.activity.bookingsMonth}
          />

          <InfoRow
            icon={<CreditCard size={20} color={colors.primary} />}
            title="Betalningar denna månad"
            value={data.summary.monthPayments}
            noBorder
          />
        </View>

        <Text style={styles.sectionTitle}>Trend senaste veckor</Text>
        <TrendCard points={data.trends.weeks} />

        <Text style={styles.sectionTitle}>Trend senaste månader</Text>
        <TrendCard points={data.trends.months} />

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Nästa steg</Text>
          <Text style={styles.noteText}>
            Sen kopplar vi detta till intäkter per verksamhet: Beställningstrafik, Airport Shuttle och Sundra.
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
  change,
  icon,
}: {
  title: string;
  value: string;
  text: string;
  change?: number;
  icon: React.ReactNode;
}) {
  const hasChange = typeof change === "number";
  const positive = (change || 0) >= 0;

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricText}>{text}</Text>

      {hasChange ? (
        <View style={[styles.changePill, positive ? styles.changePositive : styles.changeNegative]}>
          <Text style={[styles.changeText, positive ? styles.changeTextPositive : styles.changeTextNegative]}>
            {positive ? "+" : ""}
            {change}%
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function InfoRow({
  icon,
  title,
  value,
  noBorder,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  noBorder?: boolean;
}) {
  return (
    <View style={[styles.infoRow, noBorder && styles.noBorder]}>
      <View style={styles.infoIcon}>{icon}</View>
      <Text style={styles.infoTitle}>{title}</Text>
      <View style={styles.valuePill}>
        <Text style={styles.valueText}>{value}</Text>
      </View>
    </View>
  );
}

function TrendCard({ points }: { points: ReportSummaryPoint[] }) {
  const max = Math.max(...points.map((point) => point.sales), 0);

  return (
    <View style={styles.card}>
      {points.length === 0 ? (
        <View style={styles.emptyTrend}>
          <Text style={styles.emptyTrendTitle}>Ingen trenddata ännu</Text>
          <Text style={styles.emptyTrendText}>
            När betalningar skapas i kassan kommer trenddata visas här.
          </Text>
        </View>
      ) : (
        points.map((point, index) => {
          const percent = max > 0 ? Math.max(4, Math.round((point.sales / max) * 100)) : 4;

          return (
            <View key={`${point.label}-${index}`} style={[styles.trendRow, index === points.length - 1 && styles.noBorder]}>
              <View style={styles.trendLabelBox}>
                <Text style={styles.trendLabel}>{point.label}</Text>
                <Text style={styles.trendCount}>{point.count} st</Text>
              </View>

              <View style={styles.trendBarTrack}>
                <View style={[styles.trendBarFill, { width: `${percent}%` as any }]} />
              </View>

              <Text style={styles.trendValue}>{formatSummaryMoney(point.sales)}</Text>
            </View>
          );
        })
      )}
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
  metricValue: { color: colors.text, fontSize: 20, fontWeight: "900" },
  metricTitle: { color: colors.text, fontSize: 12, fontWeight: "900", marginTop: 4 },
  metricText: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 3 },
  changePill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8,
  },
  changePositive: { backgroundColor: colors.successSoft },
  changeNegative: { backgroundColor: colors.dangerSoft },
  changeText: { fontSize: 10.5, fontWeight: "900" },
  changeTextPositive: { color: colors.success },
  changeTextNegative: { color: colors.danger },
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
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  noBorder: { borderBottomWidth: 0 },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  infoTitle: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "900" },
  valuePill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  valueText: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  trendRow: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  trendLabelBox: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  trendLabel: { color: colors.text, fontSize: 13, fontWeight: "900" },
  trendCount: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  trendBarTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.cardSoft,
    overflow: "hidden",
    marginBottom: 7,
  },
  trendBarFill: {
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  trendValue: { color: colors.primary, fontSize: 12, fontWeight: "900", textAlign: "right" },
  emptyTrend: { paddingVertical: 16 },
  emptyTrendTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  emptyTrendText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 4 },
  noteBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    padding: 15,
  },
  noteTitle: { color: colors.primary, fontSize: 14, fontWeight: "900" },
  noteText: { color: colors.text, fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 4 },
});

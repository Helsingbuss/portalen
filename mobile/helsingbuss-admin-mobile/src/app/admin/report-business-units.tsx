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
  BriefcaseBusiness,
  Bus,
  CreditCard,
  Plane,
  ShoppingBag,
  TrendingUp,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { BusinessUnitReportItem, BusinessUnitsReport } from "../../types/reportBusinessUnits";
import {
  formatBusinessMoney,
  getBusinessUnitDescription,
  getBusinessUnitsReport,
  getFallbackBusinessUnitsReport,
} from "../../services/reportBusinessUnitsService";

export default function ReportBusinessUnitsScreen() {
  const [data, setData] = useState<BusinessUnitsReport>(getFallbackBusinessUnitsReport());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getBusinessUnitsReport();
      setData(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const bestUnit = useMemo(() => {
    if (!data.units.length) return null;

    return [...data.units].sort((a, b) => b.sales - a.sales)[0];
  }, [data.units]);

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
            <Text style={styles.title}>Intäkter per verksamhet</Text>
            <Text style={styles.subtitle}>Beställningstrafik, Shuttle och Sundra</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <TrendingUp size={36} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>VERKSAMHET</Text>
          <Text style={styles.heroTitle}>Se vilken del som driver intäkterna.</Text>
          <Text style={styles.heroText}>
            Betalningar sorteras automatiskt efter titel, produkt och källa.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar intäkter per verksamhet...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            title="Total intäkt"
            value={formatBusinessMoney(data.totals.sales)}
            text={`${data.totals.paidPayments} betalda`}
            icon={<CreditCard size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Väntande"
            value={String(data.totals.pendingPayments)}
            text={`${data.totals.totalPayments} totalt`}
            icon={<ShoppingBag size={22} color={colors.primary} />}
          />
        </View>

        {bestUnit ? (
          <View style={styles.bestCard}>
            <Text style={styles.bestKicker}>STÖRST JUST NU</Text>
            <Text style={styles.bestTitle}>{bestUnit.label}</Text>
            <Text style={styles.bestText}>
              {formatBusinessMoney(bestUnit.sales)} i betald försäljning.
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Verksamheter</Text>

        <View style={styles.unitList}>
          {data.units.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Ingen data ännu</Text>
              <Text style={styles.emptyText}>
                När betalningar skapas i kassan visas intäkterna per verksamhet här.
              </Text>
            </View>
          ) : (
            data.units.map((unit) => (
              <BusinessUnitCard
                key={unit.key}
                unit={unit}
                maxSales={Math.max(...data.units.map((item) => item.sales), 0)}
              />
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Förklaring</Text>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Så sorteras intäkterna</Text>
          <Text style={styles.noteText}>
            Appen tittar på källa, produkt och titel. Till exempel hamnar “flygbuss”, “airport” och “shuttle” under Airport Shuttle. “Sundra”, “resa”, “Ullared” och liknande hamnar under Sundra Resor.
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

function BusinessUnitCard({
  unit,
  maxSales,
}: {
  unit: BusinessUnitReportItem;
  maxSales: number;
}) {
  const Icon = getBusinessIcon(unit.key);
  const percent = maxSales > 0 ? Math.max(4, Math.round((unit.sales / maxSales) * 100)) : 4;

  return (
    <View style={styles.unitCard}>
      <View style={styles.unitTop}>
        <View style={styles.unitIcon}>
          <Icon size={24} color={colors.primary} strokeWidth={2.4} />
        </View>

        <View style={styles.unitTextBox}>
          <Text style={styles.unitTitle}>{unit.label}</Text>
          <Text style={styles.unitText}>{getBusinessUnitDescription(unit.key)}</Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${percent}%` as any }]} />
      </View>

      <View style={styles.unitStats}>
        <StatPill label="Totalt" value={formatBusinessMoney(unit.sales)} />
        <StatPill label="Idag" value={formatBusinessMoney(unit.salesToday)} />
        <StatPill label="Vecka" value={formatBusinessMoney(unit.salesWeek)} />
        <StatPill label="Månad" value={formatBusinessMoney(unit.salesMonth)} />
      </View>

      <View style={styles.paymentRow}>
        <Text style={styles.paymentText}>{unit.paidPayments} betalda</Text>
        <Text style={styles.paymentText}>{unit.pendingPayments} väntande</Text>
        <Text style={styles.paymentText}>{unit.refundedPayments} återbetalda</Text>
      </View>
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function getBusinessIcon(key: string) {
  if (key === "charter") return Bus;
  if (key === "shuttle") return Plane;
  if (key === "sundra") return ShoppingBag;
  return BriefcaseBusiness;
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
  title: { color: colors.text, fontSize: 23, fontWeight: "900", letterSpacing: -0.4 },
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
  grid: { flexDirection: "row", gap: 10, marginBottom: 14 },
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
  metricValue: { color: colors.text, fontSize: 20, fontWeight: "900" },
  metricTitle: { color: colors.text, fontSize: 12, fontWeight: "900", marginTop: 4 },
  metricText: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 3 },
  bestCard: {
    backgroundColor: colors.gold,
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
  },
  bestKicker: { color: colors.primaryDeep, fontSize: 11, fontWeight: "900" },
  bestTitle: { color: colors.primaryDeep, fontSize: 22, fontWeight: "900", marginTop: 4 },
  bestText: { color: colors.primaryDeep, fontSize: 13, fontWeight: "800", marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },
  unitList: { gap: 10, marginBottom: 18 },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  emptyText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 5 },
  unitCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  unitTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  unitIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  unitTextBox: { flex: 1 },
  unitTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  unitText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 3 },
  barTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.cardSoft,
    overflow: "hidden",
    marginBottom: 12,
  },
  barFill: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  unitStats: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  statPill: {
    width: "48.5%",
    backgroundColor: colors.cardSoft,
    borderRadius: 15,
    padding: 10,
  },
  statLabel: { color: colors.textMuted, fontSize: 10.5, fontWeight: "900" },
  statValue: { color: colors.text, fontSize: 12, fontWeight: "900", marginTop: 3 },
  paymentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  paymentText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  noteBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    padding: 15,
  },
  noteTitle: { color: colors.primary, fontSize: 14, fontWeight: "900" },
  noteText: { color: colors.text, fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 4 },
});

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
  ArrowLeft,
  BriefcaseBusiness,
  Bus,
  Plane,
  ReceiptText,
  Scale,
  ShoppingBag,
  WalletCards,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type {
  BusinessUnitResultItem,
  BusinessUnitResultsOverview,
} from "../../types/businessResults";
import {
  formatBusinessResultMoney,
  getBusinessUnitLabel,
  getBusinessUnitResults,
  getBusinessUnitSubtitle,
  getFallbackBusinessUnitResults,
} from "../../services/businessResultsService";

export default function BusinessResultsScreen() {
  const [data, setData] = useState<BusinessUnitResultsOverview>(
    getFallbackBusinessUnitResults()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getBusinessUnitResults();
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
            <Text style={styles.title}>Resultat per verksamhet</Text>
            <Text style={styles.subtitle}>Se vad varje del tjänar och kostar</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Scale size={38} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>RESULTAT</Text>
          <Text style={styles.heroTitle}>Vilken del av Helsingbuss går bäst?</Text>
          <Text style={styles.heroText}>
            Här delas intäkter, kostnader och resultat upp på Beställningstrafik, Flygbuss och Sundra.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar resultat...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            title="Mottagna intäkter"
            value={formatBusinessResultMoney(data.summary.totalRevenue)}
            text="Kassa + betalda fakturor"
            icon={<WalletCards size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Kostnader"
            value={formatBusinessResultMoney(data.summary.totalCosts)}
            text="Totala kostnader"
            icon={<ReceiptText size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Preliminärt resultat"
            value={formatBusinessResultMoney(data.summary.totalPreliminaryResult)}
            text="Mottaget - betalda kostnader"
            icon={<Scale size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Förväntat resultat"
            value={formatBusinessResultMoney(data.summary.totalExpectedResult)}
            text="Med bokningar/offerter"
            icon={<BriefcaseBusiness size={22} color={colors.primary} />}
          />
        </View>

        <Text style={styles.sectionTitle}>Verksamheter</Text>

        <View style={styles.list}>
          {data.units.map((unit) => (
            <BusinessUnitCard key={unit.unit} item={unit} />
          ))}
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Tips</Text>
          <Text style={styles.noteText}>
            Resultatet blir ännu mer exakt när vi börjar sätta fältet business_unit på nya fakturor, kostnader, bokningar och offerter.
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

function BusinessUnitCard({ item }: { item: BusinessUnitResultItem }) {
  const Icon = getBusinessIcon(item.unit);
  const isNegative = item.preliminaryResult < 0;

  return (
    <View style={styles.unitCard}>
      <View style={styles.unitHeader}>
        <View style={styles.unitIcon}>
          <Icon size={25} color={colors.primary} strokeWidth={2.4} />
        </View>

        <View style={styles.unitTitleBox}>
          <Text style={styles.unitTitle}>{getBusinessUnitLabel(item.unit)}</Text>
          <Text style={styles.unitSubtitle}>{getBusinessUnitSubtitle(item.unit)}</Text>
        </View>
      </View>

      <View style={styles.resultBox}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Mottagna intäkter</Text>
          <Text style={styles.resultValue}>{formatBusinessResultMoney(item.revenue)}</Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Betalda kostnader</Text>
          <Text style={styles.resultValueNegative}>
            − {formatBusinessResultMoney(item.paidCosts)}
          </Text>
        </View>

        <View style={styles.resultDivider} />

        <View style={styles.resultRow}>
          <Text style={styles.resultTotalLabel}>Preliminärt resultat</Text>
          <Text
            style={[
              styles.resultTotalValue,
              isNegative && styles.resultTotalNegative,
            ]}
          >
            {formatBusinessResultMoney(item.preliminaryResult)}
          </Text>
        </View>

        <Text style={styles.expectedText}>
          Förväntat resultat: {formatBusinessResultMoney(item.expectedResult)}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <SmallStat label="Bokningar" value={String(item.bookings)} />
        <SmallStat label="Offerter" value={String(item.offers)} />
        <SmallStat label="Fakturor" value={String(item.invoices)} />
        <SmallStat label="Kostnader" value={String(item.expenses)} />
      </View>

      <View style={styles.extraBox}>
        <Text style={styles.extraText}>
          Förväntat värde: {formatBusinessResultMoney(item.expectedValue)}
        </Text>
        <Text style={styles.extraText}>
          Väntande kostnader: {formatBusinessResultMoney(item.pendingCosts)}
        </Text>
      </View>
    </View>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.smallStat}>
      <Text style={styles.smallStatValue}>{value}</Text>
      <Text style={styles.smallStatLabel}>{label}</Text>
    </View>
  );
}

function getBusinessIcon(unit: string) {
  const clean = String(unit || "").toLowerCase();

  if (clean === "shuttle") return Plane;
  if (clean === "sundra") return ShoppingBag;
  if (clean === "bestallning") return Bus;

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
  metricText: { color: colors.textMuted, fontSize: 11, lineHeight: 15, fontWeight: "800", marginTop: 3 },

  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },
  list: { gap: 12, marginBottom: 18 },

  unitCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  unitHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  unitIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  unitTitleBox: { flex: 1 },
  unitTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  unitSubtitle: { color: colors.textMuted, fontSize: 11.5, lineHeight: 16, fontWeight: "700", marginTop: 3 },

  resultBox: {
    backgroundColor: colors.cardSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },
  resultLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "900" },
  resultValue: { color: colors.text, fontSize: 13, fontWeight: "900" },
  resultValueNegative: { color: colors.danger, fontSize: 13, fontWeight: "900" },
  resultDivider: { height: 1, backgroundColor: "#EEEAE2", marginVertical: 6 },
  resultTotalLabel: { color: colors.text, fontSize: 13, fontWeight: "900" },
  resultTotalValue: { color: colors.primary, fontSize: 16, fontWeight: "900" },
  resultTotalNegative: { color: colors.danger },
  expectedText: { color: colors.textMuted, fontSize: 11.5, fontWeight: "800", marginTop: 2 },

  statsGrid: { flexDirection: "row", gap: 8, marginBottom: 12 },
  smallStat: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  smallStatValue: { color: colors.primary, fontSize: 15, fontWeight: "900" },
  smallStatLabel: { color: colors.primary, fontSize: 9.5, fontWeight: "900", marginTop: 2 },

  extraBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: 12,
  },
  extraText: { color: colors.primary, fontSize: 11.5, lineHeight: 17, fontWeight: "800" },

  noteBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 14,
  },
  noteTitle: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  noteText: { color: colors.text, fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 4 },
});

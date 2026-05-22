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
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Calculator,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  ReceiptText,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { ReportExportOverview, ReportExportRow } from "../../types/reportExport";
import {
  formatExportDate,
  formatExportMoney,
  getExportStatusLabel,
  getFallbackReportExport,
  getReportExport,
} from "../../services/reportExportService";

type FilterKey = "all" | "store" | "booking" | "offer";

export default function ReportExportScreen() {
  const [data, setData] = useState<ReportExportOverview>(getFallbackReportExport());
  const [filter, setFilter] = useState<FilterKey>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getReportExport();
      setData(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return data.rows;
    return data.rows.filter((row) => row.source === filter);
  }, [data.rows, filter]);

  const filteredSummary = useMemo(() => {
    return filteredRows.reduce(
      (sum, row) => ({
        amount: sum.amount + row.amount,
        vat: sum.vat + row.vatAmount,
        exVat: sum.exVat + row.exVat,
      }),
      { amount: 0, vat: 0, exVat: 0 }
    );
  }, [filteredRows]);

  async function handleExportCsv() {
    try {
      if (filteredRows.length === 0) {
        Alert.alert("Ingen export", "Det finns inga poster att exportera.");
        return;
      }

      setIsExporting(true);

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        Alert.alert("Export stöds inte", "Den här enheten kan inte dela filer just nu.");
        return;
      }

      const csv = buildCsv(filteredRows);
      const date = new Date().toISOString().slice(0, 10);
      const filterName = filter === "all" ? "alla" : filter;
      const fileName = `helsingbuss-bokforing-${filterName}-${date}.csv`;
      const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: (FileSystem as any).EncodingType?.UTF8 || "utf8",
      });

      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Exportera bokföringsunderlag",
        UTI: "public.comma-separated-values-text",
      });
    } catch (error: any) {
      Alert.alert("Export misslyckades", error?.message || "Kunde inte skapa CSV-filen.");
    } finally {
      setIsExporting(false);
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
            <Text style={styles.title}>Export / bokföring</Text>
            <Text style={styles.subtitle}>Underlag för ekonomi och moms</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <FileSpreadsheet size={36} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>BOKFÖRINGSUNDERLAG</Text>
          <Text style={styles.heroTitle}>Samla betalningar, bokningar och offerter.</Text>
          <Text style={styles.heroText}>
            Exportera underlaget som CSV och öppna det i Excel eller skicka till bokföringen.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar bokföringsunderlag...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            title="Totalt inkl. moms"
            value={formatExportMoney(filteredSummary.amount)}
            icon={<ReceiptText size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Moms 6%"
            value={formatExportMoney(filteredSummary.vat)}
            icon={<Calculator size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Exkl. moms"
            value={formatExportMoney(filteredSummary.exVat)}
            icon={<FileText size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Antal poster"
            value={String(filteredRows.length)}
            icon={<CreditCard size={22} color={colors.primary} />}
          />
        </View>

        <View style={styles.tabs}>
          <FilterButton label="Alla" active={filter === "all"} onPress={() => setFilter("all")} />
          <FilterButton label="Kassa" active={filter === "store"} onPress={() => setFilter("store")} />
          <FilterButton label="Bokningar" active={filter === "booking"} onPress={() => setFilter("booking")} />
          <FilterButton label="Offerter" active={filter === "offer"} onPress={() => setFilter("offer")} />
        </View>

        <Pressable
          style={[styles.exportButton, isExporting && styles.disabled]}
          onPress={handleExportCsv}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Download size={20} color={colors.white} strokeWidth={2.5} />
              <Text style={styles.exportButtonText}>Exportera CSV</Text>
            </>
          )}
        </Pressable>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Momsberäkning</Text>
          <Text style={styles.infoText}>
            Underlaget räknar med 6% moms enligt persontransport. CSV-filen använder semikolon så den öppnas snyggare i svensk Excel.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Underlag</Text>

        <View style={styles.list}>
          {filteredRows.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Inga poster hittades</Text>
              <Text style={styles.emptyText}>
                När det finns betalningar, bokningar eller offerter visas bokföringsunderlaget här.
              </Text>
            </View>
          ) : (
            filteredRows.map((row, index) => (
              <ExportRowCard key={`${row.source}-${row.id}-${index}`} row={row} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function buildCsv(rows: ReportExportRow[]) {
  const headers = [
    "Datum",
    "Källa",
    "Referens",
    "Kund",
    "E-post",
    "Telefon",
    "Titel",
    "Status",
    "Belopp inkl moms",
    "Moms %",
    "Momsbelopp",
    "Exkl moms",
    "Valuta",
  ];

  const lines = rows.map((row) => [
    formatExportDate(row.date),
    row.sourceLabel,
    row.reference,
    row.customer || "",
    row.email || "",
    row.phone || "",
    row.title || "",
    getExportStatusLabel(row.status),
    toCsvNumber(row.amount),
    String(row.vatRate || 6),
    toCsvNumber(row.vatAmount),
    toCsvNumber(row.exVat),
    row.currency || "SEK",
  ]);

  const csvRows = [headers, ...lines]
    .map((line) => line.map(csvEscape).join(";"))
    .join("\n");

  return `\uFEFF${csvRows}`;
}

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  const escaped = text.replace(/"/g, '""');

  if (escaped.includes(";") || escaped.includes("\n") || escaped.includes('"')) {
    return `"${escaped}"`;
  }

  return escaped;
}

function toCsvNumber(value: number) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
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

function ExportRowCard({ row }: { row: ReportExportRow }) {
  const Icon = row.source === "booking" ? BriefcaseBusiness : row.source === "offer" ? FileText : CreditCard;

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowIcon}>
        <Icon size={22} color={colors.primary} strokeWidth={2.4} />
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <View style={styles.rowTitleBox}>
            <Text style={styles.rowTitle}>{row.title || row.sourceLabel}</Text>
            <Text style={styles.rowRef}>{row.reference}</Text>
          </View>

          <Text style={styles.rowAmount}>{formatExportMoney(row.amount)}</Text>
        </View>

        <Text style={styles.rowCustomer}>
          {row.customer || row.email || row.phone || "Kund saknas"}
        </Text>

        <View style={styles.rowMeta}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{row.sourceLabel}</Text>
          </View>

          <View style={styles.pill}>
            <Text style={styles.pillText}>{getExportStatusLabel(row.status)}</Text>
          </View>

          {row.date ? (
            <Text style={styles.rowDate}>{formatExportDate(row.date)}</Text>
          ) : null}
        </View>

        <View style={styles.vatRow}>
          <Text style={styles.vatText}>Exkl: {formatExportMoney(row.exVat)}</Text>
          <Text style={styles.vatText}>Moms: {formatExportMoney(row.vatAmount)}</Text>
          <Text style={styles.vatText}>Moms: {row.vatRate}%</Text>
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
  metricTitle: { color: colors.textMuted, fontSize: 11, fontWeight: "900", marginTop: 4 },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 5,
    marginBottom: 14,
  },
  tab: { flex: 1, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 10.5, fontWeight: "900" },
  tabTextActive: { color: colors.white },
  exportButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 14,
  },
  exportButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  disabled: { opacity: 0.65 },
  infoBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  infoTitle: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  infoText: { color: colors.text, fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 4 },
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
  rowCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "flex-start" },
  rowTitleBox: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  rowRef: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800", marginTop: 2 },
  rowAmount: { color: colors.primary, fontSize: 13, fontWeight: "900", marginLeft: 8 },
  rowCustomer: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 6 },
  rowMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 9 },
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  pillText: { color: colors.primary, fontSize: 10.5, fontWeight: "900" },
  rowDate: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800" },
  vatRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9 },
  vatText: { color: colors.text, fontSize: 10.5, fontWeight: "800" },
});


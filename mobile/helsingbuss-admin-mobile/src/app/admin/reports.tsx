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
  BellRing,
  BriefcaseBusiness,
  Bus,
  CreditCard,
  FileText,
  Handshake,
  TrendingUp,
  UsersRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { ReportsOverview } from "../../types/reports";
import {
  formatReportMoney,
  getFallbackReportsOverview,
  getReportsOverview,
} from "../../services/reportsService";

export default function ReportsScreen() {
  const [reports, setReports] = useState<ReportsOverview>(getFallbackReportsOverview());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadReports = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await getReportsOverview();
      setReports(data);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports(false);
  }, [loadReports]);

  const offerConversion = useMemo(() => {
    if (!reports.offers.total) return 0;
    return Math.round((reports.offers.accepted / reports.offers.total) * 100);
  }, [reports.offers.accepted, reports.offers.total]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadReports(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Rapporter & analyser</Text>
            <Text style={styles.subtitle}>Översikt, nyckeltal och uppföljning</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <BarChart3 size={36} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>ANALYS</Text>
          <Text style={styles.heroTitle}>Få koll på verksamheten i mobilen.</Text>
          <Text style={styles.heroText}>
            Här samlar vi offerter, bokningar, betalningar, kunder, partners, fordon och SMS.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar rapporter...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            title="Totalt värde"
            value={formatReportMoney(reports.payments.sales)}
            text={`${reports.payments.paid} betalda + bokningar/offerter`}
            icon={<CreditCard size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Väntar betalning"
            value={String(reports.payments.pending)}
            text={`${reports.payments.total} totalt`}
            icon={<TrendingUp size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Offerter"
            value={String(reports.offers.total)}
            text={`${offerConversion}% accepterade`}
            icon={<FileText size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Bokningar"
            value={String(reports.bookings.total)}
            text="Totalt registrerade"
            icon={<BriefcaseBusiness size={22} color={colors.primary} />}
          />
        </View>

        <Text style={styles.sectionTitle}>Offerter per status</Text>

        <View style={styles.card}>
          <StatusRow title="Inkomna" value={reports.offers.incoming} />
          <StatusRow title="Besvarade" value={reports.offers.answered} />
          <StatusRow title="Avböjda" value={reports.offers.declined} />
          <StatusRow title="Accepterade / bokade" value={reports.offers.accepted} noBorder />
        </View>

        <Text style={styles.sectionTitle}>Verksamhetsöversikt</Text>

        <View style={styles.card}>
          <InfoRow
            icon={<UsersRound size={20} color={colors.primary} />}
            title="Kunder / CRM"
            text={`${reports.customers.total} kunder registrerade`}
            route="/admin/crm"
          />

          <InfoRow
            icon={<Handshake size={20} color={colors.primary} />}
            title="Operatörer & partners"
            text={`${reports.partners.total} samarbeten registrerade`}
            route="/admin/partners"
          />

          <InfoRow
            icon={<Bus size={20} color={colors.primary} />}
            title="Fordon & personal"
            text={`${reports.fleet.vehicles} fordon · ${reports.fleet.drivers} chaufförer`}
            route="/admin/fleet"
          />

          <InfoRow
            icon={<BellRing size={20} color={colors.primary} />}
            title="SMS / notiser"
            text={`${reports.sms.sent} skickade/testade av ${reports.sms.total} loggar`}
            noBorder
          />
        </View>

        <Text style={styles.sectionTitle}>Kommande rapporter</Text>

        <View style={styles.card}>
          <InfoRow
            icon={<BarChart3 size={20} color={colors.primary} />}
            title="Sålda biljetter"
            text="Flygbuss, Sundra och paketresor."
            route="/admin/report-tickets"
          />
          <InfoRow
            icon={<TrendingUp size={20} color={colors.primary} />}
            title="Summering vecka/månad"
            text="Intäkter, betalningar, offerter och bokningar över tid."
            route="/admin/report-summary"
          />
          <InfoRow
            icon={<FileText size={20} color={colors.primary} />}
            title="Intäkter per verksamhet"
            text="Beställningstrafik, Airport Shuttle, Sundra och övrigt."
            route="/admin/report-business-units"
            noBorder
          />
        </View>
              <Pressable
          style={styles.exportButton}
          onPress={() => router.push("/admin/report-export" as any)}
        >
          <Text style={styles.exportButtonText}>Öppna export / bokföring</Text>
        </Pressable>
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

function StatusRow({
  title,
  value,
  noBorder,
}: {
  title: string;
  value: number;
  noBorder?: boolean;
}) {
  return (
    <View style={[styles.statusRow, noBorder && styles.noBorder]}>
      <Text style={styles.statusTitle}>{title}</Text>
      <View style={styles.statusPill}>
        <Text style={styles.statusValue}>{value}</Text>
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  title,
  text,
  route,
  noBorder,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  route?: string;
  noBorder?: boolean;
}) {
  return (
    <Pressable
      style={[styles.infoRow, noBorder && styles.noBorder]}
      onPress={() => route ? router.push(route as any) : undefined}
    >
      <View style={styles.infoIcon}>{icon}</View>

      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{text}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  exportButton: {
    backgroundColor: colors.primary,
    borderRadius: 19,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 2,
    marginBottom: 18,
  },
  exportButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
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
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 20,
    marginBottom: 14,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  heroKicker: {
    color: colors.goldSoft,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 5,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },
  heroText: {
    color: "#DDEBE8",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 7,
  },
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
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
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
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  metricTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
  },
  metricText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  statusRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  statusTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  statusPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusValue: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
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
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 3,
  },
});






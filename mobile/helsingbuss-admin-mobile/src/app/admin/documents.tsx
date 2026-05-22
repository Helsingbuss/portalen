import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  ClipboardList,
  ExternalLink,
  FileText,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { AppDocumentItem, DocumentsOverview } from "../../types/documents";
import {
  formatDocumentDate,
  getDocumentStatusLabel,
  getDocumentTypeLabel,
  getDocumentsOverview,
  getFallbackDocumentsOverview,
  openAdminDocument,
} from "../../services/documentsService";

type FilterKey =
  | "all"
  | "agreement"
  | "permit"
  | "internal"
  | "vehicle"
  | "operator"
  | "staff"
  | "confidential"
  | "expiring"
  | "expired";

export default function DocumentsScreen() {
  const [data, setData] = useState<DocumentsOverview>(getFallbackDocumentsOverview());
  const [filter, setFilter] = useState<FilterKey>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getDocumentsOverview();
      setData(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const rows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    let result = data.documents;

    if (filter === "expiring") {
      result = result.filter(isExpiringSoon);
    } else if (filter === "expired") {
      result = result.filter((item) => item.status === "expired");
    } else if (filter === "confidential") {
      result = result.filter((item) => Boolean(item.isConfidential));
    } else if (filter !== "all") {
      result = result.filter((item) => item.documentType === filter);
    }

    if (q) {
      result = result.filter((item) => {
        const haystack = [
          item.title,
          item.documentType,
          item.category,
          item.description,
          item.status,
          item.linkedType,
          item.linkedId,
          item.fileName,
          item.externalUrl,
          getDocumentTypeLabel(item.documentType),
          getDocumentStatusLabel(item.status),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    return [...result].sort((a, b) => {
      const aExpired = a.status === "expired" ? 1 : 0;
      const bExpired = b.status === "expired" ? 1 : 0;

      if (aExpired !== bExpired) return bExpired - aExpired;

      const aExpiring = isExpiringSoon(a) ? 1 : 0;
      const bExpiring = isExpiringSoon(b) ? 1 : 0;

      if (aExpiring !== bExpiring) return bExpiring - aExpiring;

      const aDate = a.expiresAt ? new Date(a.expiresAt).getTime() : 9999999999999;
      const bDate = b.expiresAt ? new Date(b.expiresAt).getTime() : 9999999999999;

      return aDate - bDate;
    });
  }, [data.documents, filter, searchTerm]);

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
            <Text style={styles.title}>Dokument</Text>
            <Text style={styles.subtitle}>Avtal, tillstånd och interna underlag</Text>
          </View>

          <Pressable
            style={styles.addIconButton}
            onPress={() => router.push("/admin/document-form" as any)}
          >
            <Plus size={21} color={colors.white} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <FileText size={38} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>DOKUMENT & TILLSTÅND</Text>
          <Text style={styles.heroTitle}>Hitta viktiga underlag snabbt.</Text>
          <Text style={styles.heroText}>
            Sök bland avtal, trafiktillstånd, interna rutiner, fordonsdokument och andra viktiga filer.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar dokument...</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <MetricCard
            title="Totalt"
            value={String(data.summary.totalCount)}
            text="Dokument"
            icon={<FileText size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Avtal"
            value={String(data.summary.agreementCount)}
            text="Registrerade avtal"
            icon={<ClipboardList size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Tillstånd"
            value={String(data.summary.permitCount)}
            text="Tillstånd & intyg"
            icon={<ShieldCheck size={22} color={colors.primary} />}
          />

          <MetricCard
            title="Går ut snart"
            value={String(data.summary.expiringCount)}
            text="Inom 30 dagar"
            icon={<AlertTriangle size={22} color={colors.primary} />}
          />
        </View>

        <Pressable
          style={styles.reminderButton}
          onPress={() => router.push("/admin/document-reminders" as any)}
        >
          <BellRing size={18} color={colors.primaryDeep} strokeWidth={2.5} />
          <Text style={styles.reminderButtonText}>Dokumentpåminnelser</Text>
        </Pressable>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/admin/document-form" as any)}
        >
          <Text style={styles.primaryButtonText}>Lägg till dokument</Text>
        </Pressable>

        <View style={styles.searchBox}>
          <Search size={19} color={colors.textMuted} strokeWidth={2.4} />

          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Sök dokument, avtal, tillstånd, filnamn..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />

          {searchTerm ? (
            <Pressable style={styles.clearSearchButton} onPress={() => setSearchTerm("")}>
              <X size={17} color={colors.textMuted} strokeWidth={2.5} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <FilterButton label="Alla" active={filter === "all"} onPress={() => setFilter("all")} />
          <FilterButton label="Avtal" active={filter === "agreement"} onPress={() => setFilter("agreement")} />
          <FilterButton label="Tillstånd" active={filter === "permit"} onPress={() => setFilter("permit")} />
          <FilterButton label="Internt" active={filter === "internal"} onPress={() => setFilter("internal")} />
          <FilterButton label="Fordon" active={filter === "vehicle"} onPress={() => setFilter("vehicle")} />
          <FilterButton label="Operatör" active={filter === "operator"} onPress={() => setFilter("operator")} />
          <FilterButton label="Personal" active={filter === "staff"} onPress={() => setFilter("staff")} />
          <FilterButton label="Konfidentiella" active={filter === "confidential"} onPress={() => setFilter("confidential")} />
          <FilterButton label="Går ut snart" active={filter === "expiring"} onPress={() => setFilter("expiring")} />
          <FilterButton label="Utgångna" active={filter === "expired"} onPress={() => setFilter("expired")} />
        </ScrollView>

        <View style={styles.resultHeader}>
          <Text style={styles.sectionTitle}>{getSectionTitle(filter)}</Text>
          <Text style={styles.resultCount}>{rows.length} st</Text>
        </View>

        <View style={styles.list}>
          {rows.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Inga dokument hittades</Text>
              <Text style={styles.emptyText}>
                Testa att ändra sökord eller välj ett annat filter.
              </Text>
            </View>
          ) : (
            rows.map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function isExpiringSoon(item: AppDocumentItem) {
  if (!item.expiresAt) return false;

  const expires = new Date(`${item.expiresAt.slice(0, 10)}T00:00:00`);
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");

  if (Number.isNaN(expires.getTime())) return false;

  const diff = Math.ceil((expires.getTime() - today.getTime()) / 86400000);
  return diff >= 0 && diff <= 30;
}

function getSectionTitle(filter: FilterKey) {
  if (filter === "agreement") return "Avtal";
  if (filter === "permit") return "Tillstånd";
  if (filter === "internal") return "Interna underlag";
  if (filter === "vehicle") return "Fordonsdokument";
  if (filter === "operator") return "Operatörsdokument";
  if (filter === "staff") return "Personalunderlag";
  if (filter === "confidential") return "Konfidentiella dokument";
  if (filter === "expiring") return "Dokument som går ut snart";
  if (filter === "expired") return "Utgångna dokument";
  return "Alla dokument";
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

function DocumentCard({ document }: { document: AppDocumentItem }) {
  const expired = document.status === "expired";
  const expiring = isExpiringSoon(document);

  async function openFile() {
    try {
      await openAdminDocument({
        storageBucket: document.storageBucket,
        storagePath: document.storagePath,
        externalUrl: document.externalUrl,
      });
    } catch (error: any) {
      Alert.alert("Kunde inte öppna dokument", error?.message || "Dokumentet saknar fil.");
    }
  }

  function openEdit() {
    router.push({
      pathname: "/admin/document-form",
      params: {
        id: document.id,
        title: document.title,
        documentType: document.documentType,
        category: document.category || "",
        description: document.description || "",
        status: document.status,
        linkedType: document.linkedType || "",
        linkedId: document.linkedId || "",
        validFrom: document.validFrom || "",
        expiresAt: document.expiresAt || "",
        fileName: document.fileName || "",
        fileMimeType: document.fileMimeType || "",
        fileSize: String(document.fileSize || 0),
        storageBucket: document.storageBucket || "",
        storagePath: document.storagePath || "",
        externalUrl: document.externalUrl || "",
        isConfidential: String(Boolean(document.isConfidential)),
      },
    } as any);
  }

  return (
    <View style={[styles.documentCard, expired && styles.documentCardDanger]}>
      <Pressable style={styles.documentMain} onPress={openEdit}>
        <View style={[styles.documentIcon, expired && styles.documentIconDanger]}>
          {document.isConfidential ? (
            <Lock size={22} color={expired ? colors.danger : colors.primary} strokeWidth={2.4} />
          ) : (
            <FileText size={22} color={expired ? colors.danger : colors.primary} strokeWidth={2.4} />
          )}
        </View>

        <View style={styles.documentContent}>
          <View style={styles.documentTop}>
            <View style={styles.documentTitleBox}>
              <Text style={styles.documentTitle}>{document.title}</Text>
              <Text style={styles.documentType}>{getDocumentTypeLabel(document.documentType)}</Text>
            </View>

            <Pressable style={styles.openButton} onPress={openFile}>
              <ExternalLink size={17} color={colors.primary} strokeWidth={2.5} />
            </Pressable>
          </View>

          {document.description ? (
            <Text style={styles.documentDescription}>{document.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={[styles.pill, expired && styles.pillDanger]}>
              <Text style={[styles.pillText, expired && styles.pillTextDanger]}>
                {getDocumentStatusLabel(document.status)}
              </Text>
            </View>

            {document.isConfidential ? (
              <View style={styles.confidentialPill}>
                <Text style={styles.confidentialPillText}>Konfidentiellt</Text>
              </View>
            ) : null}

            {expiring && !expired ? (
              <View style={styles.warningPill}>
                <Text style={styles.warningPillText}>Går ut snart</Text>
              </View>
            ) : null}

            {document.expiresAt ? (
              <Text style={styles.dateText}>Giltig till: {formatDocumentDate(document.expiresAt)}</Text>
            ) : null}
          </View>

          {document.fileName ? (
            <Text style={styles.fileName}>{document.fileName}</Text>
          ) : null}
        </View>
      </Pressable>
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
  metricText: { color: colors.textMuted, fontSize: 11, lineHeight: 15, fontWeight: "800", marginTop: 3 },

  reminderButton: {
    backgroundColor: colors.gold,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 10,
  },
  reminderButtonText: {
    color: colors.primaryDeep,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 7,
  },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 14,
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900" },

  searchBox: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    paddingVertical: 10,
    marginLeft: 9,
  },
  clearSearchButton: {
    width: 31,
    height: 31,
    borderRadius: 11,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

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

  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900" },
  resultCount: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },

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

  documentCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  documentCardDanger: { borderColor: "#F3C2C2" },
  documentMain: { flexDirection: "row" },
  documentIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  documentIconDanger: { backgroundColor: colors.dangerSoft },
  documentContent: { flex: 1 },
  documentTop: { flexDirection: "row", alignItems: "flex-start" },
  documentTitleBox: { flex: 1 },
  documentTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  documentType: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800", marginTop: 2 },
  documentDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 6 },
  openButton: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 9 },
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  pillDanger: { backgroundColor: colors.dangerSoft },
  pillText: { color: colors.primary, fontSize: 10.5, fontWeight: "900" },
  pillTextDanger: { color: colors.danger },
  warningPill: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  warningPillText: { color: colors.danger, fontSize: 10.5, fontWeight: "900" },
  confidentialPill: {
    backgroundColor: colors.cardSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  confidentialPillText: { color: colors.text, fontSize: 10.5, fontWeight: "900" },
  dateText: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800" },
  fileName: { color: colors.textMuted, fontSize: 10.5, fontWeight: "700", marginTop: 7 },
});

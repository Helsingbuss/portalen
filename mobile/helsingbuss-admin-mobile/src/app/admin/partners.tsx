import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  Building2,
  Bus,
  ChevronRight,
  FileText,
  Handshake,
  Hotel,
  Plus,
  Search,
  Truck,
  UsersRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { PartnerItem } from "../../types/partners";
import {
  getFallbackPartnersOverview,
  getPartnerStatusLabel,
  getPartnerTypeLabel,
  getPartnersOverview,
  getQualityLabel,
} from "../../services/partnersService";

type FilterKey = "all" | "operator" | "partner" | "supplier";

export default function PartnersScreen() {
  const [partners, setPartners] = useState<PartnerItem[]>(getFallbackPartnersOverview().partners);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPartners = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await getPartnersOverview();
      setPartners(data.partners);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPartners(false);
  }, [loadPartners]);

  const filteredPartners = useMemo(() => {
    const q = search.trim().toLowerCase();

    return partners.filter((partner) => {
      const matchesFilter =
        filter === "all" ||
        partner.partnerType === filter ||
        (filter === "partner" &&
          !["operator", "supplier"].includes(partner.partnerType));

      const matchesSearch =
        !q ||
        partner.name.toLowerCase().includes(q) ||
        String(partner.city || "").toLowerCase().includes(q) ||
        String(partner.contactPerson || "").toLowerCase().includes(q) ||
        String(partner.email || "").toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [partners, filter, search]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadPartners(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Operatörer & partners</Text>
            <Text style={styles.subtitle}>Underleverantörer, avtal och samarbeten</Text>
          </View>

          <Pressable
            style={styles.addIconButton}
            onPress={() => router.push("/admin/partner-form" as any)}
          >
            <Plus size={22} color={colors.white} strokeWidth={2.6} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Handshake size={35} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <Text style={styles.heroKicker}>PARTNERNÄTVERK</Text>
          <Text style={styles.heroTitle}>Samla operatörer, leverantörer och avtal.</Text>
          <Text style={styles.heroText}>
            Här bygger vi registret för bussbolag, hotell, restauranger, färjor, guider och andra samarbeten.
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Search size={20} color={colors.textMuted} strokeWidth={2.4} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Sök operatör, kontakt eller stad..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.tabs}>
          <FilterButton label="Alla" active={filter === "all"} onPress={() => setFilter("all")} />
          <FilterButton label="Operatörer" active={filter === "operator"} onPress={() => setFilter("operator")} />
          <FilterButton label="Partners" active={filter === "partner"} onPress={() => setFilter("partner")} />
          <FilterButton label="Leverantörer" active={filter === "supplier"} onPress={() => setFilter("supplier")} />
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar operatörer och partners...</Text>
          </View>
        ) : null}

        <Pressable
          style={styles.addButton}
          onPress={() => router.push("/admin/partner-form" as any)}
        >
          <Plus size={20} color={colors.white} strokeWidth={2.5} />
          <Text style={styles.addButtonText}>Lägg till operatör/partner</Text>
        </Pressable>

        <View style={styles.list}>
          {filteredPartners.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Inga operatörer eller partners ännu</Text>
              <Text style={styles.emptyText}>
                Lägg till första samarbetspartnern för att samla kontakt, avtal, fordon och uppföljning.
              </Text>
            </View>
          ) : (
            filteredPartners.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))
          )}
        </View>
      </ScrollView>
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

function PartnerCard({ partner }: { partner: PartnerItem }) {
  const Icon = getPartnerIcon(partner.partnerType);

  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/admin/partner-detail",
          params: { id: partner.id },
        } as any)
      }
    >
      <View style={styles.avatar}>
        <Icon size={23} color={colors.primary} strokeWidth={2.4} />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitleBox}>
            <Text style={styles.cardTitle}>{partner.name}</Text>
            <Text style={styles.cardType}>{getPartnerTypeLabel(partner.partnerType)}</Text>
          </View>

          <ChevronRight size={18} color={colors.textMuted} strokeWidth={2.4} />
        </View>

        {partner.contactPerson ? (
          <Text style={styles.meta}>Kontakt: {partner.contactPerson}</Text>
        ) : null}

        {partner.city ? (
          <Text style={styles.meta}>Ort: {partner.city}</Text>
        ) : null}

        <View style={styles.pills}>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{getPartnerStatusLabel(partner.status)}</Text>
          </View>

          <View style={styles.qualityPill}>
            <Text style={styles.qualityText}>Kvalitet: {getQualityLabel(partner.qualityLevel)}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Bus size={13} color={colors.primary} />
            <Text style={styles.statText}>{partner.vehicleCount} fordon</Text>
          </View>

          <View style={styles.statPill}>
            <FileText size={13} color={colors.primary} />
            <Text style={styles.statText}>{partner.documentCount} dokument</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function getPartnerIcon(type: string) {
  if (type === "operator") return Bus;
  if (type === "hotel") return Hotel;
  if (type === "supplier") return Truck;
  if (type === "restaurant") return Building2;
  return UsersRound;
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
  searchBox: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "700", marginLeft: 9 },
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
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 14,
  },
  addButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 7 },
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: "row", alignItems: "center" },
  cardTitleBox: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  cardType: { color: colors.primary, fontSize: 11, fontWeight: "900", marginTop: 2 },
  meta: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 5 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  statusPill: {
    backgroundColor: colors.successSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: { color: colors.success, fontSize: 10.5, fontWeight: "900" },
  qualityPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  qualityText: { color: colors.primary, fontSize: 10.5, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  statPill: {
    backgroundColor: colors.cardSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  statText: { color: colors.text, fontSize: 10.5, fontWeight: "900", marginLeft: 4 },
});

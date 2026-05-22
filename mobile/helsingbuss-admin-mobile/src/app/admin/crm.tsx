import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Mail,
  Phone,
  Plus,
  Search,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { CrmCustomer, CrmOverview } from "../../types/crm";
import {
  getCrmOverview,
  getCustomerTypeLabel,
  getFallbackCrmOverview,
} from "../../services/crmService";

type FilterKey = "all" | "private" | "company";

export default function CrmScreen() {
  const [overview, setOverview] = useState<CrmOverview>(getFallbackCrmOverview());
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadCrm = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await getCrmOverview();
      setOverview(data);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCrm(false);
  }, [loadCrm]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return overview.customers.filter((customer) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "private" && customer.customerType === "private") ||
        (filter === "company" && customer.customerType !== "private");

      const matchesSearch =
        !q ||
        customer.name.toLowerCase().includes(q) ||
        String(customer.companyName || "").toLowerCase().includes(q) ||
        String(customer.email || "").toLowerCase().includes(q) ||
        String(customer.phone || "").toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [overview.customers, filter, search]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadCrm(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Kunder / CRM</Text>
            <Text style={styles.subtitle}>Kunder, kontakter och historik</Text>
          </View>

          <Pressable
            style={styles.addIconButton}
            onPress={() => router.push("/admin/customer-form" as any)}
          >
            <Plus size={22} color={colors.white} strokeWidth={2.6} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <UsersRound size={34} color={colors.goldSoft} strokeWidth={2.5} />
          </View>

          <Text style={styles.heroKicker}>CRM</Text>
          <Text style={styles.heroTitle}>Samla kunder, betalningar och kontakt.</Text>
          <Text style={styles.heroText}>
            Här bygger vi kundregister kopplat till offert, bokning, kassa, SMS och e-post.
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Search size={20} color={colors.textMuted} strokeWidth={2.4} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Sök kund, e-post eller telefon..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.tabs}>
          <FilterButton label="Alla" active={filter === "all"} onPress={() => setFilter("all")} />
          <FilterButton label="Privat" active={filter === "private"} onPress={() => setFilter("private")} />
          <FilterButton label="Företag" active={filter === "company"} onPress={() => setFilter("company")} />
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar kunder...</Text>
          </View>
        ) : null}

        <Pressable
          style={styles.addButton}
          onPress={() => router.push("/admin/customer-form" as any)}
        >
          <Plus size={20} color={colors.white} strokeWidth={2.5} />
          <Text style={styles.addButtonText}>Lägg till kund</Text>
        </Pressable>

        <View style={styles.customerList}>
          {filteredCustomers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Inga kunder ännu</Text>
              <Text style={styles.emptyText}>
                Lägg till din första kund för att börja samla kontaktuppgifter, betalningar och noteringar.
              </Text>
            </View>
          ) : (
            filteredCustomers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
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

function CustomerCard({ customer }: { customer: CrmCustomer }) {
  const isCompany = customer.customerType !== "private";

  return (
    <Pressable
      style={styles.customerCard}
      onPress={() =>
        router.push({
          pathname: "/admin/customer-detail",
          params: {
            id: customer.id,
          },
        } as any)
      }
    >
      <View style={styles.avatar}>
        {isCompany ? (
          <Building2 size={23} color={colors.primary} strokeWidth={2.4} />
        ) : (
          <UserRound size={23} color={colors.primary} strokeWidth={2.4} />
        )}
      </View>

      <View style={styles.customerContent}>
        <View style={styles.customerTop}>
          <View style={styles.customerTitleBox}>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.customerType}>{getCustomerTypeLabel(customer.customerType)}</Text>
          </View>

          <ChevronRight size={18} color={colors.textMuted} strokeWidth={2.4} />
        </View>

        {customer.companyName ? (
          <Text style={styles.customerMeta}>{customer.companyName}</Text>
        ) : null}

        <View style={styles.contactRow}>
          {customer.email ? (
            <View style={styles.contactPill}>
              <Mail size={13} color={colors.primary} />
              <Text style={styles.contactText}>{customer.email}</Text>
            </View>
          ) : null}

          {customer.phone ? (
            <View style={styles.contactPill}>
              <Phone size={13} color={colors.primary} />
              <Text style={styles.contactText}>{customer.phone}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <WalletCards size={13} color={colors.primary} />
            <Text style={styles.statText}>
              {customer.paymentCount} betalningar
            </Text>
          </View>

          {customer.pendingPayments > 0 ? (
            <View style={styles.pendingPill}>
              <Text style={styles.pendingText}>
                {customer.pendingPayments} väntar
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  addIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
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
    width: 60,
    height: 60,
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
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 9,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 5,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "900",
  },
  tabTextActive: {
    color: colors.white,
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
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 14,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 7,
  },
  customerList: {
    gap: 10,
  },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 5,
  },
  customerCard: {
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
  customerContent: {
    flex: 1,
  },
  customerTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  customerTitleBox: {
    flex: 1,
  },
  customerName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  customerType: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2,
  },
  customerMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  contactPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  contactText: {
    color: colors.primary,
    fontSize: 10.5,
    fontWeight: "900",
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  statPill: {
    backgroundColor: colors.cardSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    color: colors.text,
    fontSize: 10.5,
    fontWeight: "900",
    marginLeft: 4,
  },
  pendingPill: {
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  pendingText: {
    color: "#9A6800",
    fontSize: 10.5,
    fontWeight: "900",
  },
});

import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, } from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  Banknote,
  CalendarPlus,
  CreditCard,
  Link as LinkIcon,
  ReceiptText,
  RefreshCw,
  Send,
  ShoppingBag,
  Ticket,
  WalletCards,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { StoreOverview, StorePaymentItem, StoreProduct } from "../../types/store";
import {
  createPaymentLink,
  formatCurrency,
  getFallbackStoreOverview,
  getStoreOverview,
  statusLabel,
} from "../../services/storeService";

export default function StoreScreen() {
  const [overview, setOverview] = useState<StoreOverview>(getFallbackStoreOverview());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [errorText, setErrorText] = useState("");

  const loadStore = useCallback(async (refreshing = false) => {
    try {
      setErrorText("");

      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await getStoreOverview();
      setOverview(data);
    } catch (error) {
      console.log("Store load error:", error);
      setErrorText("Kunde inte hämta butik/kassa just nu.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStore(false);
  }, [loadStore]);

  async function handleCreatePaymentLink() {
    try {
      setIsCreatingLink(true);

      const result = await createPaymentLink({
        amount: 199,
        title: "Flygbussbiljett Helsingborg → Kastrup",
        customerName: "Testkund",
        customerEmail: "kund@example.se",
        reference: "APP-TEST",
      });

      Alert.alert(
        "Betalningslänk skapad",
        result.paymentUrl || "Länken skapades via portalens API."
      );
    } catch (error) {
      console.log("Create payment link error:", error);

      Alert.alert(
        "API ej kopplat ännu",
        "Sidan är redo. Nästa steg är att koppla portalens SumUp-endpoint så appen kan skapa riktiga betalningslänkar."
      );
    } finally {
      setIsCreatingLink(false);
    }
  }

  function handleReserve() {
    router.push("/admin/store-new-sale" as any);
  }

  function handleNewSale() {
    router.push("/admin/store-new-sale" as any);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadStore(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Butik / Kassa</Text>
            <Text style={styles.subtitle}>Reservationer, biljetter och SumUp-länkar</Text>
          </View>

          <Pressable style={styles.iconButton} onPress={() => loadStore(true)}>
            <RefreshCw size={20} color={colors.text} strokeWidth={2.4} />
          </Pressable>
        </View>

        {errorText ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Kassa kunde inte uppdateras</Text>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar butik/kassa...</Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <ShoppingBag size={34} color={colors.goldSoft} strokeWidth={2.5} />
          </View>

          <Text style={styles.heroKicker}>Helsingbuss Kassa</Text>
          <Text style={styles.heroTitle}>Sälj, reservera och skicka betalningslänk.</Text>
          <Text style={styles.heroText}>
            Använd samma backend och SumUp-flöde som portalen.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatBox
            title="Försäljning idag"
            value={formatCurrency(overview.todaySales)}
            icon={<Banknote size={20} color={colors.primary} />}
          />
          <StatBox
            title="Väntar betalning"
            value={`${overview.pendingPayments}`}
            icon={<WalletCards size={20} color={colors.primary} />}
          />
          <StatBox
            title="Reservationer"
            value={`${overview.reservedItems}`}
            icon={<CalendarPlus size={20} color={colors.primary} />}
          />
          <StatBox
            title="Betalda idag"
            value={`${overview.paidToday}`}
            icon={<CreditCard size={20} color={colors.primary} />}
          />
        </View>

        <View style={styles.quickActions}>
          <Pressable style={styles.primaryAction} onPress={handleNewSale}>
            <ReceiptText size={22} color={colors.white} strokeWidth={2.5} />
            <Text style={styles.primaryActionText}>Ny försäljning</Text>
          </Pressable>

          <Pressable style={styles.secondaryAction} onPress={handleReserve}>
            <Ticket size={21} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.secondaryActionText}>Reservera</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.paymentLinkButton, isCreatingLink && styles.disabledButton]}
          onPress={() => router.push("/admin/store-new-sale" as any)}
          disabled={isCreatingLink}
        >
          <LinkIcon size={21} color={colors.primaryDeep} strokeWidth={2.5} />
          <Text style={styles.paymentLinkText}>
            "Skapa betalningslänk"
          </Text>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Produkter</Text>
          <Text style={styles.sectionLink}>Visa alla</Text>
        </View>

        <View style={styles.productList}>
          {overview.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Senaste betalningar</Text>
          <Text style={styles.sectionLink}>Visa alla</Text>
        </View>

        <View style={styles.paymentList}>
          {overview.recentPayments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Inga betalningar ännu</Text>
              <Text style={styles.emptyText}>
                När betalningslänkar och reservationer skapas visas de här.
              </Text>
            </View>
          ) : (
            overview.recentPayments.map((payment) => (
              <PaymentCard key={payment.id} payment={payment} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatBox({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.statBox}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

function ProductCard({ product }: { product: StoreProduct }) {
  const Icon = product.type === "shuttle_ticket" || product.type === "trip_ticket"
    ? Ticket
    : product.type === "booking" || product.type === "offer"
      ? ReceiptText
      : CreditCard;

  return (
    <Pressable style={styles.productCard} onPress={() => router.push({ pathname: "/admin/store-new-sale", params: { productId: product.id, title: product.title, type: product.type, priceFrom: product.priceFrom ? String(product.priceFrom) : "" } } as any)}>
      <View style={styles.productIcon}>
        <Icon size={22} color={colors.primary} strokeWidth={2.4} />
      </View>

      <View style={styles.productContent}>
        <Text style={styles.productTitle}>{product.title}</Text>
        <Text style={styles.productText}>{product.subtitle}</Text>

        <View style={styles.productMetaRow}>
          {product.priceFrom ? (
            <Text style={styles.productMeta}>Från {formatCurrency(product.priceFrom)}</Text>
          ) : (
            <Text style={styles.productMeta}>Manuellt belopp</Text>
          )}

          {product.available ? (
            <Text style={styles.productMeta}>{product.available} lediga</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.productStatus}>
        <Text style={styles.productStatusText}>{product.status || "Aktiv"}</Text>
      </View>
    </Pressable>
  );
}

function PaymentCard({ payment }: { payment: StorePaymentItem }) {
  const isPaid = payment.status === "paid";
  const isPending = payment.status === "pending" || payment.status === "reserved";

  return (
    <View style={styles.paymentCard}>
      <View
        style={[
          styles.paymentIcon,
          isPaid && styles.paymentIconPaid,
          isPending && styles.paymentIconPending,
        ]}
      >
        <Send size={20} color={isPaid ? colors.success : colors.primary} strokeWidth={2.4} />
      </View>

      <View style={styles.paymentContent}>
        <Text style={styles.paymentTitle}>{payment.title}</Text>
        <Text style={styles.paymentText}>Kund: {payment.customer}</Text>
        <Text style={styles.paymentRef}>Ref: {payment.reference || payment.id}</Text>
      </View>

      <View style={styles.paymentRight}>
        <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
        <Text
          style={[
            styles.paymentStatus,
            isPaid && styles.paymentStatusPaid,
            isPending && styles.paymentStatusPending,
          ]}
        >
          {statusLabel(payment.status)}
        </Text>
      </View>
    </View>
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
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
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
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F4B8B1",
    padding: 14,
    marginBottom: 12,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "900",
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 20,
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
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
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 5,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroText: {
    color: "#DDEBE8",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 7,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    width: "48.5%",
    backgroundColor: colors.card,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  statTitle: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: "800",
    marginTop: 4,
  },
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryActionText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  paymentLinkButton: {
    backgroundColor: colors.gold,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 18,
  },
  disabledButton: {
    opacity: 0.7,
  },
  paymentLinkText: {
    color: colors.primaryDeep,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  sectionLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  productList: {
    gap: 10,
    marginBottom: 18,
  },
  productCard: {
    backgroundColor: colors.card,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  productIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  productContent: {
    flex: 1,
  },
  productTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  productText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3,
  },
  productMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 7,
  },
  productMeta: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    fontSize: 10.5,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  productStatus: {
    backgroundColor: colors.successSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: 8,
  },
  productStatusText: {
    color: colors.success,
    fontSize: 10.5,
    fontWeight: "900",
  },
  paymentList: {
    gap: 10,
  },
  paymentCard: {
    backgroundColor: colors.card,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  paymentIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  paymentIconPaid: {
    backgroundColor: colors.successSoft,
  },
  paymentIconPending: {
    backgroundColor: colors.warningSoft,
  },
  paymentContent: {
    flex: 1,
  },
  paymentTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  paymentText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  paymentRef: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  paymentRight: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  paymentAmount: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  paymentStatus: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: "900",
    marginTop: 5,
  },
  paymentStatusPaid: {
    color: colors.success,
  },
  paymentStatusPending: {
    color: "#9A6800",
  },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4,
  },
});


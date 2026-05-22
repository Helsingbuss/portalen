import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CreditCard,
  Edit3,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  UserRound,
  WalletCards,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  formatCrmDate,
  formatCrmMoney,
  getCustomerDetail,
  getCustomerTypeLabel,
} from "../../services/crmService";
import type { CustomerActivityItem } from "../../types/crm";

export default function CustomerDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();

  const [customer, setCustomer] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [offers, setOffers] = useState<CustomerActivityItem[]>([]);
  const [bookings, setBookings] = useState<CustomerActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadCustomer = useCallback(async (refreshing = false) => {
    if (!params.id) return;

    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await getCustomerDetail(String(params.id));

      setCustomer(data.customer);
      setLogs(data.logs);
      setPayments(data.payments);
      setOffers(data.offers);
      setBookings(data.bookings);
    } catch (error: any) {
      Alert.alert("Kunde inte hämta kund", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadCustomer(false);
  }, [loadCustomer]);

  function callCustomer() {
    if (customer?.phone) Linking.openURL(`tel:${customer.phone}`);
  }

  function emailCustomer() {
    if (customer?.email) Linking.openURL(`mailto:${customer.email}`);
  }

  function smsCustomer() {
    if (customer?.phone) Linking.openURL(`sms:${customer.phone}`);
  }

  if (isLoading && !customer) {
    return (
      <View style={styles.screen}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Hämtar kund...</Text>
        </View>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.screen}>
        <View style={styles.loadingCenter}>
          <Text style={styles.emptyTitle}>Kunden hittades inte</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Gå tillbaka</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const displayName = customer.name || "Kund";

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadCustomer(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>{displayName}</Text>
            <Text style={styles.subtitle}>{getCustomerTypeLabel(customer.customer_type)}</Text>
          </View>

          <Pressable
            style={styles.editIconButton}
            onPress={() =>
              router.push({
                pathname: "/admin/customer-form",
                params: {
                  id: customer.id,
                  name: customer.name || "",
                  customerType: customer.customer_type || "private",
                  companyName: customer.company_name || "",
                  orgNumber: customer.org_number || "",
                  email: customer.email || "",
                  phone: customer.phone || "",
                  city: customer.city || "",
                  notes: customer.notes || "",
                },
              } as any)
            }
          >
            <Edit3 size={20} color={colors.white} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <UserRound size={42} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <View style={styles.heroTextBox}>
            <Text style={styles.heroKicker}>KUND</Text>
            <Text style={styles.heroTitle}>{displayName}</Text>
            {customer.company_name ? (
              <Text style={styles.heroText}>{customer.company_name}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actionGrid}>
          <Pressable style={[styles.actionButton, !customer.phone && styles.disabled]} onPress={callCustomer} disabled={!customer.phone}>
            <Phone size={20} color={colors.primary} />
            <Text style={styles.actionText}>Ring</Text>
          </Pressable>

          <Pressable style={[styles.actionButton, !customer.phone && styles.disabled]} onPress={smsCustomer} disabled={!customer.phone}>
            <MessageSquare size={20} color={colors.primary} />
            <Text style={styles.actionText}>SMS</Text>
          </Pressable>

          <Pressable style={[styles.actionButton, !customer.email && styles.disabled]} onPress={emailCustomer} disabled={!customer.email}>
            <Mail size={20} color={colors.primary} />
            <Text style={styles.actionText}>E-post</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Kontaktuppgifter</Text>

        <View style={styles.card}>
          <InfoRow icon={<Mail size={20} color={colors.primary} />} title="E-post" text={customer.email || "Saknas"} />
          <InfoRow icon={<Phone size={20} color={colors.primary} />} title="Telefon" text={customer.phone || "Saknas"} />
          <InfoRow icon={<StickyNote size={20} color={colors.primary} />} title="Notering" text={customer.notes || "Ingen notering"} noBorder />
        </View>

        <Text style={styles.sectionTitle}>Offerter</Text>

        <View style={styles.card}>
          {offers.length === 0 ? (
            <InfoRow
              icon={<FileText size={20} color={colors.primary} />}
              title="Inga offerter"
              text="Offerter kopplade via e-post, telefon eller namn visas här."
              noBorder
            />
          ) : (
            offers.map((item, index) => (
              <ActivityRow
                key={`offer-${item.id}-${index}`}
                item={item}
                noBorder={index === offers.length - 1}
              />
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Bokningar</Text>

        <View style={styles.card}>
          {bookings.length === 0 ? (
            <InfoRow
              icon={<BriefcaseBusiness size={20} color={colors.primary} />}
              title="Inga bokningar"
              text="Bokningar kopplade till kunden visas här."
              noBorder
            />
          ) : (
            bookings.map((item, index) => (
              <ActivityRow
                key={`booking-${item.id}-${index}`}
                item={item}
                noBorder={index === bookings.length - 1}
              />
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Betalningar</Text>

        <View style={styles.card}>
          {payments.length === 0 ? (
            <InfoRow
              icon={<WalletCards size={20} color={colors.primary} />}
              title="Inga betalningar"
              text="När kunden får betalningslänkar eller reservationer visas de här."
              noBorder
            />
          ) : (
            payments.map((payment, index) => (
              <InfoRow
                key={payment.id}
                icon={<CreditCard size={20} color={colors.primary} />}
                title={payment.title || "Betalning"}
                text={`${payment.amount || 0} ${payment.currency || "SEK"} · ${payment.status}`}
                noBorder={index === payments.length - 1}
              />
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Kommunikation & noteringar</Text>

        <View style={styles.card}>
          {logs.length === 0 ? (
            <InfoRow
              icon={<StickyNote size={20} color={colors.primary} />}
              title="Inga noteringar"
              text="Här visas samtal, SMS, e-post och interna noteringar."
              noBorder
            />
          ) : (
            logs.map((log, index) => (
              <InfoRow
                key={log.id}
                icon={<StickyNote size={20} color={colors.primary} />}
                title={log.title}
                text={`${log.message || ""}${log.created_at ? `\n${formatCrmDate(log.created_at)}` : ""}`}
                noBorder={index === logs.length - 1}
              />
            ))
          )}
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.push({
              pathname: "/admin/store-new-sale",
              params: {
                title: "Betalning från kund",
                priceFrom: "",
                customerName: customer.name || "",
                customerEmail: customer.email || "",
                customerPhone: customer.phone || "",
              },
            } as any)
          }
        >
          <Text style={styles.primaryButtonText}>Skapa betalningslänk</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ActivityRow({
  item,
  noBorder,
}: {
  item: CustomerActivityItem;
  noBorder?: boolean;
}) {
  const isOffer = item.kind === "offer";

  return (
    <Pressable
      style={[styles.infoRow, noBorder && styles.noBorder]}
      onPress={() =>
        router.push({
          pathname: "/admin/booking-detail",
          params: {
            id: item.id,
            kind: item.kind,
          },
        } as any)
      }
    >
      <View style={styles.infoIcon}>
        {isOffer ? (
          <FileText size={20} color={colors.primary} />
        ) : (
          <BriefcaseBusiness size={20} color={colors.primary} />
        )}
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{item.reference || item.title}</Text>
        <Text style={styles.infoText}>
          {item.title}
          {item.fromText || item.toText ? `\n${item.fromText || ""} → ${item.toText || ""}` : ""}
          {item.date ? `\n${formatCrmDate(item.date)} ${item.time || ""}` : ""}
        </Text>
      </View>

      <View style={styles.activityRight}>
        <Text style={styles.activityStatus}>{item.status}</Text>
        {item.amount ? (
          <Text style={styles.activityAmount}>{formatCrmMoney(item.amount)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function InfoRow({
  icon,
  title,
  text,
  noBorder,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  noBorder?: boolean;
}) {
  return (
    <View style={[styles.infoRow, noBorder && styles.noBorder]}>
      <View style={styles.infoIcon}>{icon}</View>

      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 110 },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: "800", marginTop: 10 },
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
  editIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  heroIcon: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  heroTextBox: { flex: 1 },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 24, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, fontWeight: "800", marginTop: 4 },
  actionGrid: { flexDirection: "row", gap: 10, marginBottom: 18 },
  actionButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 15,
    alignItems: "center",
  },
  disabled: { opacity: 0.45 },
  actionText: { color: colors.primary, fontSize: 12, fontWeight: "900", marginTop: 6 },
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
  infoText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 3 },
  activityRight: {
    alignItems: "flex-end",
    marginLeft: 8,
    maxWidth: 92,
  },
  activityStatus: {
    color: colors.primary,
    fontSize: 10.5,
    fontWeight: "900",
    textAlign: "right",
  },
  activityAmount: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 5,
    textAlign: "right",
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 19,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "900", marginBottom: 10 },
});

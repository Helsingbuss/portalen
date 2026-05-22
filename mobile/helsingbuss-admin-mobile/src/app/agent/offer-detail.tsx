import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Calculator,
  CalendarDays,
  FileText,
  Mail,
  Map,
  Phone,
  Route,
  Save,
  Send,
  UserRound,
  UsersRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import AgentOfferCalculator from "../../components/agent/AgentOfferCalculator";
import {
  formatAgentOfferDetailDate,
  formatAgentOfferDetailMoney,
  getAgentOfferDetail,
  saveAgentOfferPriceProposal,
  type AgentOfferDetail,
  type AgentOfferProposal,
} from "../../services/agentOfferDetailService";

export default function AgentOfferDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const offerId = String(params.id || "");

  const [offer, setOffer] = useState<AgentOfferDetail | null>(null);
  const [proposal, setProposal] = useState<AgentOfferProposal | null>(null);


  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getAgentOfferDetail(offerId);

      setOffer(result.offer);
      setProposal(result.proposal);

    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [offerId]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);


  function callCustomer() {
    if (!offer?.customerPhone) return;
    Linking.openURL("tel:" + offer.customerPhone);
  }

  function mailCustomer() {
    if (!offer?.customerEmail) return;
    Linking.openURL("mailto:" + offer.customerEmail);
  }

  async function handleSaveProposal(input: {
    internalCost: number;
    marginPercent: number;
    priceAmount: number;
    customerPrice: number;
    notes: string;
  }) {
    if (!offer) return;

    try {
      setIsSaving(true);

      await saveAgentOfferPriceProposal({
        offerId: offer.id,
        internalCost: input.internalCost,
        marginPercent: input.marginPercent,
        priceAmount: input.priceAmount,
        customerPrice: input.customerPrice,
        notes: input.notes,
      });

      Alert.alert("Sparat", "Prisförslaget är sparat på offerten.");

      await loadData(true);
    } catch (error: any) {
      Alert.alert("Kunde inte spara", error?.message || "Försök igen.");
    } finally {
      setIsSaving(false);
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
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Offertdetalj</Text>
            <Text style={styles.subtitle}>{offer?.reference || "Laddar offert..."}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar offert...</Text>
          </View>
        ) : null}

        {!isLoading && !offer ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Offerten hittades inte</Text>
            <Text style={styles.emptyText}>
              Kontrollera att offerten finns och att du har rätt behörighet.
            </Text>
          </View>
        ) : null}

        {offer ? (
          <>
            <View style={styles.heroCard}>
              <FileText size={38} color={colors.goldSoft} strokeWidth={2.4} />
              <Text style={styles.heroKicker}>OFFERT</Text>
              <Text style={styles.heroTitle}>
                {offer.destination || "Offert utan destination"}
              </Text>
              <Text style={styles.heroText}>
                {offer.departure || "Start saknas"} → {offer.destination || "Destination saknas"}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <InfoPill title="Status" value={offer.status || "Inkommen"} />
              <InfoPill
                title="Nuvarande pris"
                value={offer.amount > 0 ? formatAgentOfferDetailMoney(offer.amount) : "Ej angivet"}
              />
            </View>

            <Section title="Kund">
              <InfoRow icon={<UserRound size={20} color={colors.primary} />} title="Namn" value={offer.customerName || offer.company || "Kund saknas"} />
              <InfoRow icon={<Mail size={20} color={colors.primary} />} title="E-post" value={offer.customerEmail || "Saknas"} />
              <InfoRow icon={<Phone size={20} color={colors.primary} />} title="Telefon" value={offer.customerPhone || "Saknas"} />

              <View style={styles.actionRow}>
                <Pressable style={styles.secondaryButton} onPress={mailCustomer}>
                  <Mail size={18} color={colors.primary} />
                  <Text style={styles.secondaryButtonText}>Mejla</Text>
                </Pressable>

                <Pressable style={styles.secondaryButton} onPress={callCustomer}>
                  <Phone size={18} color={colors.primary} />
                  <Text style={styles.secondaryButtonText}>Ring</Text>
                </Pressable>
              </View>
            </Section>

            <Section title="Resa">
              <InfoRow icon={<Route size={20} color={colors.primary} />} title="Från" value={offer.departure || "Saknas"} />
              <InfoRow icon={<Route size={20} color={colors.primary} />} title="Till" value={offer.destination || "Saknas"} />
              <InfoRow
                icon={<CalendarDays size={20} color={colors.primary} />}
                title="Avresa"
                value={
                  formatAgentOfferDetailDate(offer.departureDate) +
                  (offer.departureTime ? " kl. " + offer.departureTime : "")
                }
              />
              <InfoRow
                icon={<UsersRound size={20} color={colors.primary} />}
                title="Passagerare"
                value={offer.passengers > 0 ? offer.passengers + " personer" : "Ej angivet"}
              />
            </Section>


            <Section title="Karta & rutt">
              <View style={styles.routeMapBox}>
                <View style={styles.routeMapIcon}>
                  <Map size={24} color={colors.primary} strokeWidth={2.5} />
                </View>

                <View style={styles.routeMapTextBox}>
                  <Text style={styles.routeMapTitle}>Ruttens väg</Text>
                  <Text style={styles.routeMapText}>
                    Visa start, stopp, destination och ruttlinje för denna offert.
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.routeMapButton}
                onPress={() =>
                  router.push({
                    pathname: "/agent/offer-map",
                    params: { id: offer.id },
                  } as any)
                }
              >
                <Map size={20} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.routeMapButtonText}>Visa rutt på karta</Text>
              </Pressable>
            </Section>

            {offer.notes ? (
              <Section title="Kundens meddelande">
                <Text style={styles.noteText}>{offer.notes}</Text>
              </Section>
            ) : null}

            <AgentOfferCalculator
              initialNotes={proposal?.notes || ""}
              isSaving={isSaving}
              onSave={handleSaveProposal}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function InfoPill({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillTitle}>{title}</Text>
      <Text style={styles.infoPillValue}>{value}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoTextBox}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backButton: {
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
  title: { color: colors.text, fontSize: 25, fontWeight: "900" },
  subtitle: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 },

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

  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  emptyText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 5 },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 20,
    marginBottom: 14,
  },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginTop: 12, marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 25, lineHeight: 31, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 7 },

  statusRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  infoPill: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  infoPillTitle: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  infoPillValue: { color: colors.primary, fontSize: 15, fontWeight: "900", marginTop: 4 },

  section: { marginBottom: 15 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },

  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9 },
  infoIcon: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  infoTextBox: { flex: 1 },
  infoTitle: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  infoValue: { color: colors.text, fontSize: 13.5, fontWeight: "800", marginTop: 2 },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  secondaryButtonText: { color: colors.primary, fontSize: 12, fontWeight: "900", marginLeft: 6 },

  noteText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "700" },


  routeMapBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 13,
    flexDirection: "row",
    marginBottom: 12,
  },
  routeMapIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  routeMapTextBox: { flex: 1 },
  routeMapTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  routeMapText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 3 },
  routeMapButton: {
    backgroundColor: colors.primary,
    borderRadius: 17,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  routeMapButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 8 },

  calculatorCard: {
    backgroundColor: colors.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 4,
  },
  calculatorHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  calculatorIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  calculatorTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  calculatorText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 3 },

  savedBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 17,
    padding: 12,
    marginBottom: 13,
  },
  savedTitle: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  savedText: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 3 },

  inputLabel: { color: colors.text, fontSize: 12, fontWeight: "900", marginBottom: 7, marginTop: 6 },
  input: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 13,
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  textArea: {
    minHeight: 84,
    paddingTop: 13,
    textAlignVertical: "top",
  },

  calcPreview: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  calcPreviewTitle: { color: colors.goldSoft, fontSize: 11, fontWeight: "900" },
  calcPreviewValue: { color: colors.white, fontSize: 22, fontWeight: "900", marginTop: 4 },

  saveRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  saveButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  saveButtonText: { color: colors.white, fontSize: 13, fontWeight: "900", marginLeft: 7 },
  sendButton: {
    flex: 1.2,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  sendButtonText: { color: colors.primary, fontSize: 13, fontWeight: "900", marginLeft: 7 },
  disabled: { opacity: 0.65 },
});

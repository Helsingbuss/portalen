import AdminOfferCalculatorShortcut from "../../components/AdminOfferCalculatorShortcut";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View, } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Route,
  Users,
  Wallet,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  getAdminBookingDetail,
  type AdminBookingDetail,
  type AdminBookingLeg,
} from "../../services/bookingDetailService";

export default function BookingDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; kind?: string }>();
  const [detail, setDetail] = useState<AdminBookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        setErrorText("");

        if (!params.id || !params.kind) {
          setErrorText("Saknar id eller typ.");
          return;
        }

        const data = await getAdminBookingDetail(params.kind, params.id);
        setDetail(data);
      } catch (error) {
        console.log("Detail load error:", error);
        setErrorText("Kunde inte hämta detaljer just nu.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [params.id, params.kind]);

  function callCustomer() {
    if (detail?.phone) {
      Linking.openURL(`tel:${detail.phone}`);
    }
  }

  function emailCustomer() {
    if (detail?.email) {
      Linking.openURL(`mailto:${detail.email}`);
    }
  }

  function openScanner() {
    if (!detail) return;

    router.push({
      pathname: "/admin/scanner",
      params: {
        kind: detail.kind,
        id: detail.id,
        reference: detail.reference,
      },
    } as any);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AdminOfferCalculatorShortcut />
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              {detail?.sourceLabel || "Ärende"}
            </Text>
            <Text style={styles.headerSub}>
              {detail?.reference || params.id}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar detaljer...</Text>
          </View>
        ) : null}

        {errorText ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Något gick fel</Text>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        ) : null}

        {!isLoading && !detail ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Hittar inte ärendet</Text>
            <Text style={styles.mutedText}>Gå tillbaka och öppna ärendet igen.</Text>
          </View>
        ) : null}

        {detail ? (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <Text style={styles.sourcePill}>{detail.sourceLabel}</Text>
                <Text style={styles.statusPill}>{detail.status}</Text>
              </View>

              <Text style={styles.heroTitle}>{detail.title}</Text>
              <Text style={styles.heroText}>
                {detail.tripType || "Reseinformation"}
              </Text>
            </View>

            <SectionTitle title="Kund & kontakt" />

            <View style={styles.card}>
              <InfoRow
                icon={<Users size={21} color={colors.primary} />}
                title="Kund"
                text={detail.customer}
              />

              {detail.company ? (
                <InfoRow
                  icon={<Users size={21} color={colors.primary} />}
                  title="Företag/förening"
                  text={detail.company}
                />
              ) : null}

              {detail.orgNumber ? (
                <InfoRow
                  icon={<Users size={21} color={colors.primary} />}
                  title="Org.nr"
                  text={detail.orgNumber}
                />
              ) : null}

              {detail.email ? (
                <InfoRow
                  icon={<Mail size={21} color={colors.primary} />}
                  title="E-post"
                  text={detail.email}
                />
              ) : null}

              {detail.phone ? (
                <InfoRow
                  icon={<Phone size={21} color={colors.primary} />}
                  title="Telefon"
                  text={detail.phone}
                  noBorder
                />
              ) : null}
            </View>

            <View style={styles.actionGrid}>
              <Pressable
                style={[styles.actionButton, !detail.phone && styles.actionDisabled]}
                onPress={callCustomer}
                disabled={!detail.phone}
              >
                <Text style={styles.actionText}>Ring kund</Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, !detail.email && styles.actionDisabled]}
                onPress={emailCustomer}
                disabled={!detail.email}
              >
                <Text style={styles.actionText}>Skicka e-post</Text>
              </Pressable>
            </View>

            <SectionTitle title="Reseinformation" />

            <TripLegCard leg={detail.outbound} />

            {detail.returnLeg ? (
              <TripLegCard leg={detail.returnLeg} />
            ) : null}

            {detail.extraFields.length > 0 ? (
              <>
                <SectionTitle title={detail.extraTitle} />
                <View style={styles.card}>
                  {detail.extraFields.map((field, index) => (
                    <InfoRow
                      key={`${field.label}-${index}`}
                      icon={<Route size={21} color={colors.primary} />}
                      title={field.label}
                      text={field.value}
                      noBorder={index === detail.extraFields.length - 1}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {detail.canOpenScanner ? (
              <Pressable style={styles.scannerButton} onPress={openScanner}>
                <Text style={styles.scannerButtonText}>
                  {detail.scannerText || "Öppna scanner"}
                </Text>
              </Pressable>
            ) : null}

            <SectionTitle title="Övriga uppgifter" />

            <View style={styles.card}>
              <InfoRow
                icon={<Users size={21} color={colors.primary} />}
                title="Passagerare"
                text={`${detail.passengers || "0"} passagerare`}
              />

              <InfoRow
                icon={<Wallet size={21} color={colors.primary} />}
                title="Pris"
                text={detail.price || "Pris saknas"}
              />

              <InfoRow
                icon={<Route size={21} color={colors.primary} />}
                title="Referens"
                text={detail.reference || "Referens saknas"}
                noBorder={!detail.notes && !detail.internalNotes}
              />

              {detail.notes ? (
                <InfoRow
                  icon={<Route size={21} color={colors.primary} />}
                  title="Anteckningar"
                  text={detail.notes}
                  noBorder={!detail.internalNotes}
                />
              ) : null}

              {detail.internalNotes ? (
                <InfoRow
                  icon={<Route size={21} color={colors.primary} />}
                  title="Interna anteckningar"
                  text={detail.internalNotes}
                  noBorder
                />
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function TripLegCard({ leg }: { leg: AdminBookingLeg }) {
  return (
    <View style={styles.legCard}>
      <View style={styles.legHeader}>
        <View style={styles.legIcon}>
          <Route size={22} color={colors.goldSoft} />
        </View>

        <View>
          <Text style={styles.legTitle}>{leg.label}</Text>
          <Text style={styles.legSub}>
            {leg.date || "Datum saknas"}
          </Text>
        </View>
      </View>

      <View style={styles.routeBox}>
        <View style={styles.routeDot} />
        <View style={styles.routeLine} />
        <View style={styles.routeDotEnd} />

        <View style={styles.routeContent}>
          <Text style={styles.routeLabel}>Från</Text>
          <Text style={styles.routeText}>{leg.from}</Text>

          <Text style={[styles.routeLabel, styles.routeToLabel]}>Till</Text>
          <Text style={styles.routeText}>{leg.to}</Text>
        </View>
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeItem}>
          <Clock3 size={17} color={colors.primary} />
          <Text style={styles.timeText}>{leg.time || "Tid saknas"}</Text>
        </View>

        {leg.endTime ? (
          <View style={styles.timeItem}>
            <CalendarDays size={17} color={colors.primary} />
            <Text style={styles.timeText}>Slut {leg.endTime}</Text>
          </View>
        ) : null}
      </View>

      {leg.stops ? (
        <View style={styles.stopBox}>
          <MapPin size={17} color={colors.primary} />
          <Text style={styles.stopText}>Via/stopp: {leg.stops}</Text>
        </View>
      ) : null}
    </View>
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
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  headerSub: {
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
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 10,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F4B8B1",
    marginBottom: 12,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 14,
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
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13,
  },
  sourcePill: {
    color: colors.primary,
    backgroundColor: colors.goldSoft,
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  statusPill: {
    color: colors.white,
    backgroundColor: "rgba(255,255,255,0.14)",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  heroTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroText: {
    color: "#DDEBE8",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 21,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  infoIcon: {
    width: 38,
    height: 38,
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
    fontSize: 13,
    fontWeight: "900",
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 3,
  },
  mutedText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  actionGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 17,
    paddingVertical: 15,
    alignItems: "center",
  },
  actionDisabled: {
    opacity: 0.45,
  },
  actionText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900",
  },
  scannerButton: {
    backgroundColor: colors.gold,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 18,
    shadowColor: colors.gold,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  scannerButtonText: {
    color: colors.primaryDeep,
    fontSize: 14,
    fontWeight: "900",
  },
  legCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 13,
  },
  legHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  legIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  legTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  legSub: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  routeBox: {
    flexDirection: "row",
    position: "relative",
    marginBottom: 14,
  },
  routeDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  routeLine: {
    position: "absolute",
    left: 5,
    top: 18,
    width: 1.5,
    height: 48,
    backgroundColor: "#D6D1C8",
  },
  routeDotEnd: {
    position: "absolute",
    left: 0,
    top: 70,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.gold,
  },
  routeContent: {
    flex: 1,
    marginLeft: 13,
  },
  routeLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  routeToLabel: {
    marginTop: 18,
  },
  routeText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 3,
  },
  timeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  timeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  timeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 6,
  },
  stopBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardSoft,
    borderRadius: 14,
    padding: 11,
    marginTop: 11,
  },
  stopText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 7,
    flex: 1,
  },
});



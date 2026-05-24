import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Clock3,
  Gauge,
  Mail,
  MapPin,
  Percent,
  Save,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  formatOfferCalculatorMoney,
  getOfferCalculator,
  saveOfferCalculator,
} from "../../services/offerCalculatorService";
import { sendOfferProposalViaPortal } from "../../services/offerProposalService";
import {
  getHourPriceForMode,
  getKmPriceForDistance,
  getPortalBusPriceProfiles,
  type PortalBusPriceProfile,
} from "../../services/portalPriceRulesService";

function toNumber(value: string) {
  const clean = String(value || "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  return Number(clean || 0);
}

function toInput(value: any) {
  const number = Number(value || 0);
  if (!number || Number.isNaN(number)) return "";
  return String(Math.round(number));
}

function getInitialCalcValue(calculator: any, keys: string[]) {
  for (const key of keys) {
    if (calculator && calculator[key] !== undefined && calculator[key] !== null && calculator[key] !== "") {
      return calculator[key];
    }
  }

  return "";
}

type HourMode = "day" | "evening" | "weekend";

export default function AdminOfferCalculatorScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    offerId?: string;
    sourceId?: string;
  }>();

  const offerId = String(params.id || params.offerId || params.sourceId || "");

  const [offer, setOffer] = useState<any | null>(null);
  const [profiles, setProfiles] = useState<PortalBusPriceProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [hourMode, setHourMode] = useState<HourMode>("day");

  const [km, setKm] = useState("");
  const [kmPrice, setKmPrice] = useState("");
  const [hours, setHours] = useState("");
  const [hourPrice, setHourPrice] = useState("");
  const [serviceFee, setServiceFee] = useState("");
  const [parkingFee, setParkingFee] = useState("0");
  const [otherCost, setOtherCost] = useState("0");
  const [internalCost, setInternalCost] = useState("");
  const [marginPercentManual, setMarginPercentManual] = useState("");
  const [customerPriceManual, setCustomerPriceManual] = useState("");
  const [priceNote, setPriceNote] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const selectedProfile = useMemo(() => {
    return profiles.find((profile) => profile.id === selectedProfileId) || null;
  }, [profiles, selectedProfileId]);

  const applyProfilePrices = useCallback(
    (profile: PortalBusPriceProfile | null, mode: HourMode, kmValueText: string) => {
      if (!profile) return;

      const kmValue = toNumber(kmValueText);

      setServiceFee(toInput(profile.baseFee));
      setHourPrice(toInput(getHourPriceForMode(profile, mode)));
      setKmPrice(toInput(getKmPriceForDistance(profile, kmValue)));
    },
    []
  );

  const loadOffer = useCallback(async () => {
    if (!offerId) {
      Alert.alert("Offert saknas", "Kunde inte hitta offert-ID.");
      router.back();
      return;
    }

    try {
      setIsLoading(true);

      const [result, portalProfiles] = await Promise.all([
        getOfferCalculator(offerId),
        getPortalBusPriceProfiles().catch(() => []),
      ]);

      const calc = result.calculator || {};
      const savedProfileId = String(
        getInitialCalcValue(calc, ["priceProfileId", "price_profile_id"]) || ""
      );

      const defaultProfile =
        portalProfiles.find((profile) => profile.id === savedProfileId) ||
        portalProfiles.find((profile) => profile.category.toLowerCase().includes("best")) ||
        portalProfiles[0] ||
        null;

      const savedHourMode = String(
        getInitialCalcValue(calc, ["hourMode", "hour_mode"]) || "day"
      ) as HourMode;

      const startKm = String(getInitialCalcValue(calc, ["km", "distanceKm", "distance_km"]) || "");
      const profileToUse = defaultProfile;

      setOffer(result);
      setProfiles(portalProfiles);
      setSelectedProfileId(profileToUse?.id || "");
      setHourMode(["day", "evening", "weekend"].includes(savedHourMode) ? savedHourMode : "day");

      setKm(startKm);
      setHours(String(getInitialCalcValue(calc, ["hours", "totalHours", "time_hours"]) || ""));
      setParkingFee(toInput(getInitialCalcValue(calc, ["parkingFee", "parking_fee"]) || 0));
      setOtherCost(toInput(getInitialCalcValue(calc, ["otherCost", "other_cost"]) || 0));
      setInternalCost(toInput(getInitialCalcValue(calc, ["internalCost", "internal_cost"]) || 0));
      setMarginPercentManual(String(getInitialCalcValue(calc, ["marginPercentManual", "manual_margin_percent"]) || ""));
      setCustomerPriceManual(toInput(result.priceTotal || getInitialCalcValue(calc, ["customerPrice", "customer_price"]) || 0));
      setPriceNote(result.priceNote || "");

      const savedKmPrice = getInitialCalcValue(calc, ["kmPrice", "pricePerKm", "km_price"]);
      const savedHourPrice = getInitialCalcValue(calc, ["hourPrice", "pricePerHour", "hour_price"]);
      const savedServiceFee = getInitialCalcValue(calc, ["serviceFee", "service_fee"]);

      setKmPrice(toInput(savedKmPrice || getKmPriceForDistance(profileToUse, toNumber(startKm))));
      setHourPrice(toInput(savedHourPrice || getHourPriceForMode(profileToUse, savedHourMode)));
      setServiceFee(toInput(savedServiceFee || profileToUse?.baseFee || 0));
    } catch (error: any) {
      Alert.alert("Kunde inte hämta offerten", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    loadOffer();
  }, [loadOffer]);

  useEffect(() => {
    if (!selectedProfile) return;

    applyProfilePrices(selectedProfile, hourMode, km);
  }, [selectedProfileId, hourMode]);

  useEffect(() => {
    if (!selectedProfile) return;

    setKmPrice(toInput(getKmPriceForDistance(selectedProfile, toNumber(km))));
  }, [km, selectedProfileId]);

  const calculation = useMemo(() => {
    const kmValue = toNumber(km);
    const kmPriceValue = toNumber(kmPrice);
    const hoursValue = toNumber(hours);
    const hourPriceValue = toNumber(hourPrice);
    const serviceFeeValue = toNumber(serviceFee);
    const parkingFeeValue = toNumber(parkingFee);
    const otherCostValue = toNumber(otherCost);
    const internalCostValue = toNumber(internalCost);
    const manualMargin = toNumber(marginPercentManual);
    const manualCustomerPrice = toNumber(customerPriceManual);

    const kmTotal = kmValue * kmPriceValue;
    const hoursTotal = hoursValue * hourPriceValue;

    const calculatedExVat =
      kmTotal +
      hoursTotal +
      serviceFeeValue +
      parkingFeeValue +
      otherCostValue;

    const marginAmountFromPercent =
      manualMargin > 0 && internalCostValue > 0
        ? internalCostValue * (manualMargin / 100)
        : 0;

    const exVatBeforeManual =
      manualMargin > 0 && internalCostValue > 0
        ? internalCostValue + marginAmountFromPercent
        : calculatedExVat;

    const totalBeforeManual = exVatBeforeManual * 1.06;

    const total = manualCustomerPrice > 0 ? manualCustomerPrice : totalBeforeManual;
    const exVat = total / 1.06;
    const vatAmount = total - exVat;
    const marginAmount = exVat - internalCostValue;
    const marginPercent =
      internalCostValue > 0 ? (marginAmount / internalCostValue) * 100 : 0;

    return {
      kmValue,
      kmPriceValue,
      hoursValue,
      hourPriceValue,
      serviceFeeValue,
      parkingFeeValue,
      otherCostValue,
      internalCostValue,
      kmTotal,
      hoursTotal,
      calculatedExVat,
      exVat,
      vatAmount,
      total,
      vatRate: 6,
      marginAmount,
      marginPercent,
      manualCustomerPrice,
      manualMargin,
    };
  }, [
    km,
    kmPrice,
    hours,
    hourPrice,
    serviceFee,
    parkingFee,
    otherCost,
    internalCost,
    marginPercentManual,
    customerPriceManual,
  ]);

  async function saveCalculation(markReady = false, showAlert = true) {
    if (!offerId) return;

    if (calculation.total <= 0) {
      Alert.alert("Pris saknas", "Fyll i km/timmar eller pris till kund innan du sparar.");
      return;
    }

    try {
      setIsSaving(true);

      await saveOfferCalculator({
        offerId,
        calculation: {
          priceProfileId: selectedProfile?.id || "",
          category: selectedProfile?.category || "",
          busType: selectedProfile?.busType || "",
          hourMode,

          km: calculation.kmValue,
          kmPrice: calculation.kmPriceValue,
          kmTotal: calculation.kmTotal,

          hours: calculation.hoursValue,
          hourPrice: calculation.hourPriceValue,
          hoursTotal: calculation.hoursTotal,

          serviceFee: calculation.serviceFeeValue,
          parkingFee: calculation.parkingFeeValue,
          otherCost: calculation.otherCostValue,

          internalCost: calculation.internalCostValue,
          marginAmount: calculation.marginAmount,
          marginPercent: calculation.marginPercent,
          marginPercentManual: calculation.manualMargin,

          customerPrice: calculation.total,
          customerPriceManual: calculation.manualCustomerPrice,

          vatRate: calculation.vatRate,
        },
        result: {
          exVat: calculation.exVat,
          vatAmount: calculation.vatAmount,
          total: calculation.total,
          vatRate: calculation.vatRate,
        },
        priceNote,
        proposalStatus: markReady ? "ready_to_send" : "calculated",
      });

      if (showAlert) {
        Alert.alert(
          "Kalkyl sparad",
          markReady
            ? "Kalkylen är sparad och redo att skickas."
            : "Kalkylen är sparad på offerten."
        );
      }

      await loadOffer();
      return true;
    } catch (error: any) {
      if (showAlert) {
        Alert.alert("Kunde inte spara kalkyl", error?.message || "Försök igen.");
      } else {
        throw error;
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function sendOffer() {
    if (!offerId) return;

    if (calculation.total <= 0) {
      Alert.alert("Pris saknas", "Spara ett pris innan du skickar offerten.");
      return;
    }

    try {
      setIsSending(true);

      const saved = await saveCalculation(true, false);

      if (!saved) {
        return;
      }

      const result = await sendOfferProposalViaPortal(offerId);

      Alert.alert(
        "Offert skickad",
        `Offerten har skickats${result?.sentTo ? ` till ${result.sentTo}` : " till kunden"}.`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Kunde inte skicka offert", error?.message || "Försök igen.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>

          <Text style={styles.topTitle}>Offertkalkyl</Text>

          <View style={styles.iconButtonPlaceholder} />
        </View>

        <View style={styles.heroCard}>
          <Calculator size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>ADMIN</Text>
          <Text style={styles.heroTitle}>Kalkyl & prisförslag</Text>
          <Text style={styles.heroText}>
            Räkna med priser från bus_price_profiles och skicka offert till kund.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar offert och prisprofiler...</Text>
          </View>
        ) : null}

        {offer ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Offertuppgifter</Text>
              <InfoRow label="Offertnummer" value={offer.reference || offer.id} />
              <InfoRow label="Kund" value={offer.customerName || offer.customerEmail || "Kund saknas"} />
              <InfoRow label="Telefon" value={offer.customerPhone || "-"} />
              <InfoRow label="Resa" value={`${offer.departure || "Start saknas"} → ${offer.destination || "Destination saknas"}`} />
              <InfoRow label="Datum" value={offer.travelDate || "-"} />
              <InfoRow label="Status" value={offer.status || "-"} />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Prisprofil från portalen</Text>

              {profiles.length === 0 ? (
                <Text style={styles.warningText}>
                  Ingen prisprofil hittades i bus_price_profiles.
                </Text>
              ) : null}

              {profiles.map((profile) => {
                const active = selectedProfileId === profile.id;

                return (
                  <Pressable
                    key={profile.id}
                    style={[styles.profileCard, active && styles.profileCardActive]}
                    onPress={() => {
                      setSelectedProfileId(profile.id);
                      applyProfilePrices(profile, hourMode, km);
                    }}
                  >
                    <Text style={[styles.profileTitle, active && styles.profileTitleActive]}>
                      {profile.category} · {profile.busType}
                    </Text>
                    <Text style={styles.profileText}>
                      Start: {formatOfferCalculatorMoney(profile.baseFee)} · Dag: {formatOfferCalculatorMoney(profile.hourWeekdayDay)} · Kväll: {formatOfferCalculatorMoney(profile.hourWeekdayEvening)} · Helg: {formatOfferCalculatorMoney(profile.hourWeekend)}
                    </Text>
                    <Text style={styles.profileText}>
                      Km: 0–25 {profile.km025} kr · 26–100 {profile.km26100} kr · 101–250 {profile.km101250} kr · 251+ {profile.km251Plus} kr
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Clock3 size={20} color={colors.primary} strokeWidth={2.5} />
                <Text style={styles.sectionTitleInline}>Timpris</Text>
              </View>

              <View style={styles.modeRow}>
                <ModeButton title="Dag" active={hourMode === "day"} onPress={() => setHourMode("day")} />
                <ModeButton title="Kväll" active={hourMode === "evening"} onPress={() => setHourMode("evening")} />
                <ModeButton title="Helg" active={hourMode === "weekend"} onPress={() => setHourMode("weekend")} />
              </View>

              <View style={styles.twoColumns}>
                <Field label="Antal timmar" value={hours} onChangeText={setHours} placeholder="Ex. 4" keyboardType="numeric" />
                <Field label="Kr/timme" value={hourPrice} onChangeText={setHourPrice} placeholder="Från prisprofil" keyboardType="numeric" />
              </View>

              <ResultRow label="Tim-del" value={formatOfferCalculatorMoney(calculation.hoursTotal)} />
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Gauge size={20} color={colors.primary} strokeWidth={2.5} />
                <Text style={styles.sectionTitleInline}>Körsträcka</Text>
              </View>

              <View style={styles.twoColumns}>
                <Field label="Antal km" value={km} onChangeText={setKm} placeholder="Ex. 120" keyboardType="numeric" />
                <Field label="Kr/km" value={kmPrice} onChangeText={setKmPrice} placeholder="Från intervall" keyboardType="numeric" />
              </View>

              <ResultRow label="Km-del" value={formatOfferCalculatorMoney(calculation.kmTotal)} />
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <MapPin size={20} color={colors.primary} strokeWidth={2.5} />
                <Text style={styles.sectionTitleInline}>Avgifter & övrigt</Text>
              </View>

              <Field label="Start/serviceavgift" value={serviceFee} onChangeText={setServiceFee} placeholder="Från prisprofil" keyboardType="numeric" />
              <Field label="Parkering / avgifter" value={parkingFee} onChangeText={setParkingFee} placeholder="Ex. 0" keyboardType="numeric" />
              <Field label="Övrigt" value={otherCost} onChangeText={setOtherCost} placeholder="Ex. 0" keyboardType="numeric" />
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Percent size={20} color={colors.primary} strokeWidth={2.5} />
                <Text style={styles.sectionTitleInline}>Marginal & slutpris</Text>
              </View>

              <Field label="Intern kostnad / inköpspris" value={internalCost} onChangeText={setInternalCost} placeholder="Ex. 2500" keyboardType="numeric" />
              <Field label="Manuell marginal %" value={marginPercentManual} onChangeText={setMarginPercentManual} placeholder="Ex. 20" keyboardType="numeric" />
              <Field label="Pris till kund inkl. moms" value={customerPriceManual} onChangeText={setCustomerPriceManual} placeholder="Lämna tomt för automatiskt pris" keyboardType="numeric" />

              <Text style={styles.label}>Meddelande / prisnotering</Text>
              <TextInput
                value={priceNote}
                onChangeText={setPriceNote}
                placeholder="Ex. Priset gäller buss enligt förfrågan."
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.textArea]}
                multiline
              />
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>Resultat</Text>

              <ResultRow label="Pris exkl. moms" value={formatOfferCalculatorMoney(calculation.exVat)} />
              <ResultRow label="Moms 6%" value={formatOfferCalculatorMoney(calculation.vatAmount)} />
              <ResultRow label="Pris inkl. moms" value={formatOfferCalculatorMoney(calculation.total)} strong />
              <ResultRow label="Intern kostnad" value={formatOfferCalculatorMoney(calculation.internalCostValue)} />
              <ResultRow label="Marginal" value={formatOfferCalculatorMoney(calculation.marginAmount)} />
              <ResultRow label="Marginal %" value={`${calculation.marginPercent.toFixed(1)} %`} />
            </View>

            <View style={styles.buttonGrid}>
              <Pressable
                style={[styles.secondaryButton, isSaving && styles.disabled]}
                onPress={() => saveCalculation(false)}
                disabled={isSaving || isSending}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Save size={19} color={colors.primary} strokeWidth={2.5} />
                )}
                <Text style={styles.secondaryButtonText}>Spara kalkyl</Text>
              </Pressable>

              <Pressable
                style={[styles.primaryButton, isSending && styles.disabled]}
                onPress={sendOffer}
                disabled={isSaving || isSending}
              >
                {isSending ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Mail size={19} color={colors.white} strokeWidth={2.5} />
                )}
                <Text style={styles.primaryButtonText}>Skicka offert</Text>
              </Pressable>
            </View>

            {offer.proposalStatus ? (
              <View style={styles.savedBox}>
                <CheckCircle2 size={19} color="#1F7A4D" strokeWidth={2.5} />
                <Text style={styles.savedText}>Kalkylstatus: {offer.proposalStatus}</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ModeButton({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.modeButton, active && styles.modeButtonActive]} onPress={onPress}>
      <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>
        {title}
      </Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.fieldBox}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        keyboardType={keyboardType || "default"}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ResultRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.resultRow}>
      <Text style={[styles.resultLabel, strong && styles.resultStrong]}>{label}</Text>
      <Text style={[styles.resultValue, strong && styles.resultStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPlaceholder: { width: 42, height: 42 },
  topTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
  },
  heroKicker: {
    color: colors.goldSoft,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 5,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "900",
  },
  heroText: {
    color: "#DDEBE8",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 7,
  },

  loadingCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 10,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleInline: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginLeft: 8,
  },

  profileCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  profileCardActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  profileTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  profileTitleActive: {
    color: colors.primary,
  },
  profileText: {
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  warningText: {
    color: "#B76E00",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginBottom: 10,
  },

  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
    borderRadius: 16,
    minHeight: 42,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeButtonText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "900",
  },
  modeButtonTextActive: {
    color: colors.white,
  },

  twoColumns: {
    flexDirection: "row",
    gap: 10,
  },
  fieldBox: {
    flex: 1,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 7,
    marginTop: 6,
  },
  input: {
    minHeight: 52,
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
    minHeight: 92,
    paddingTop: 13,
    textAlignVertical: "top",
  },

  infoRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 8,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
  },
  infoValue: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "800",
    marginTop: 2,
  },

  resultCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },
  resultTitle: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#D4E7E2",
    paddingTop: 8,
    marginTop: 8,
  },
  resultLabel: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "800",
    flex: 1,
  },
  resultValue: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "900",
    marginLeft: 8,
  },
  resultStrong: {
    color: colors.primary,
    fontSize: 14,
  },

  buttonGrid: {
    gap: 10,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  disabled: { opacity: 0.65 },

  savedBox: {
    backgroundColor: "#ECFDF3",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#B7E4C7",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  savedText: {
    color: "#1F7A4D",
    fontSize: 12.5,
    fontWeight: "900",
    marginLeft: 8,
  },
});

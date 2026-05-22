import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Bus,
  Calculator,
  Check,
  Copy,
  Mail,
  Percent,
  Route,
  Save,
  WalletCards,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import type { OfferCalculatorOffer } from "../../types/offerCalculator";
import {
  formatOfferCalculatorMoney,
  getOfferCalculator,
  saveOfferCalculator,
} from "../../services/offerCalculatorService";
import { sendOfferProposalViaPortal } from "../../services/offerProposalService";

const priceLists = [
  { label: "Beställningstrafik", value: "bestallning" },
  { label: "Bröllop", value: "brollop" },
  { label: "Förening", value: "forening" },
];

const busTypes = [
  { label: "Sprinter upp till 19", value: "sprinter" },
  { label: "Turistbuss upp till 39", value: "turistbuss" },
  { label: "Helturistbuss upp till 63", value: "helturistbuss" },
  { label: "Dubbeldäckare upp till 81", value: "dubbeldackare" },
];

const kmBands = [
  { label: "0–25 km", value: "0-25" },
  { label: "26–100 km", value: "26-100" },
  { label: "101–250 km", value: "101-250" },
  { label: "251+ km", value: "251+" },
];

const synergyRates = [
  { label: "7%", value: 0.07 },
  { label: "9%", value: 0.09 },
  { label: "10%", value: 0.1 },
  { label: "11%", value: 0.11 },
];

function numberFromText(value: string, fallback = 0) {
  const parsed = Number(String(value || "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textFromNumber(value: any, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export default function OfferCalculatorScreen() {
  const params = useLocalSearchParams<{ id?: string }>();

  const [offer, setOffer] = useState<OfferCalculatorOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreparingSend, setIsPreparingSend] = useState(false);

  const [priceList, setPriceList] = useState("bestallning");
  const [busType, setBusType] = useState("turistbuss");
  const [kmBand, setKmBand] = useState("26-100");
  const [busCount, setBusCount] = useState("1");

  const [kmPrice, setKmPrice] = useState("15");
  const [hourDayPrice, setHourDayPrice] = useState("480");
  const [hourEveningPrice, setHourEveningPrice] = useState("535");
  const [hourWeekendPrice, setHourWeekendPrice] = useState("610");
  const [serviceFee, setServiceFee] = useState("2150");

  const [includeServiceFee, setIncludeServiceFee] = useState(true);
  const [serviceFeeMode, setServiceFeeMode] = useState<"once" | "perLeg">("once");

  const [vatMode, setVatMode] = useState<"sweden" | "abroad">("sweden");
  const [includeReturn, setIncludeReturn] = useState(false);

  const [includeBridgeFee, setIncludeBridgeFee] = useState(false);
  const [bridgeFee, setBridgeFee] = useState("2456");

  const [includeFerryFee, setIncludeFerryFee] = useState(false);
  const [ferryFee, setFerryFee] = useState("2397");

  const [synergyEnabled, setSynergyEnabled] = useState(false);
  const [synergyRate, setSynergyRate] = useState(0.07);

  const [outKm, setOutKm] = useState("");
  const [outDayHours, setOutDayHours] = useState("");
  const [outEveningHours, setOutEveningHours] = useState("");
  const [outWeekendHours, setOutWeekendHours] = useState("");

  const [returnKm, setReturnKm] = useState("");
  const [returnDayHours, setReturnDayHours] = useState("");
  const [returnEveningHours, setReturnEveningHours] = useState("");
  const [returnWeekendHours, setReturnWeekendHours] = useState("");

  const [priceNote, setPriceNote] = useState("");

  const loadOffer = useCallback(async (refreshing = false) => {
    if (!params.id) return;

    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await getOfferCalculator(String(params.id));
      setOffer(data);

      const calc = data.calculator || {};

      if (Object.keys(calc).length > 0) {
        setPriceList(textFromNumber(calc.priceList, "bestallning"));
        setBusType(textFromNumber(calc.busType, "turistbuss"));
        setKmBand(textFromNumber(calc.kmBand, "26-100"));
        setBusCount(textFromNumber(calc.busCount, "1"));

        setKmPrice(textFromNumber(calc.kmPrice, "15"));
        setHourDayPrice(textFromNumber(calc.hourDayPrice, "480"));
        setHourEveningPrice(textFromNumber(calc.hourEveningPrice, "535"));
        setHourWeekendPrice(textFromNumber(calc.hourWeekendPrice, "610"));
        setServiceFee(textFromNumber(calc.serviceFee, "2150"));

        setIncludeServiceFee(Boolean(calc.includeServiceFee ?? true));
        setServiceFeeMode(calc.serviceFeeMode === "perLeg" ? "perLeg" : "once");

        setVatMode(calc.vatMode === "abroad" ? "abroad" : "sweden");
        setIncludeReturn(Boolean(calc.includeReturn));

        setIncludeBridgeFee(Boolean(calc.includeBridgeFee));
        setBridgeFee(textFromNumber(calc.bridgeFee, "2456"));

        setIncludeFerryFee(Boolean(calc.includeFerryFee));
        setFerryFee(textFromNumber(calc.ferryFee, "2397"));

        setSynergyEnabled(Boolean(calc.synergyEnabled));
        setSynergyRate(Number(calc.synergyRate || 0.07));

        setOutKm(textFromNumber(calc.outKm, ""));
        setOutDayHours(textFromNumber(calc.outDayHours, ""));
        setOutEveningHours(textFromNumber(calc.outEveningHours, ""));
        setOutWeekendHours(textFromNumber(calc.outWeekendHours, ""));

        setReturnKm(textFromNumber(calc.returnKm, ""));
        setReturnDayHours(textFromNumber(calc.returnDayHours, ""));
        setReturnEveningHours(textFromNumber(calc.returnEveningHours, ""));
        setReturnWeekendHours(textFromNumber(calc.returnWeekendHours, ""));

        setPriceNote(textFromNumber(calc.priceNote, data.priceNote || ""));
      } else {
        setPriceNote(data.priceNote || "");
      }
    } catch (error: any) {
      Alert.alert("Kunde inte hämta offert", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadOffer(false);
  }, [loadOffer]);

  const calculation = useMemo(() => {
    const buses = Math.max(1, Math.round(numberFromText(busCount, 1)));
    const kmRate = numberFromText(kmPrice);
    const dayRate = numberFromText(hourDayPrice);
    const eveningRate = numberFromText(hourEveningPrice);
    const weekendRate = numberFromText(hourWeekendPrice);
    const baseServiceFee = numberFromText(serviceFee);

    const outLeg =
      numberFromText(outKm) * kmRate +
      numberFromText(outDayHours) * dayRate +
      numberFromText(outEveningHours) * eveningRate +
      numberFromText(outWeekendHours) * weekendRate;

    const returnLeg = includeReturn
      ? numberFromText(returnKm) * kmRate +
        numberFromText(returnDayHours) * dayRate +
        numberFromText(returnEveningHours) * eveningRate +
        numberFromText(returnWeekendHours) * weekendRate
      : 0;

    const legCount = includeReturn ? 2 : 1;
    const service = includeServiceFee
      ? baseServiceFee * (serviceFeeMode === "perLeg" ? legCount : 1) * buses
      : 0;

    const bridge = includeBridgeFee ? numberFromText(bridgeFee) : 0;
    const ferry = includeFerryFee ? numberFromText(ferryFee) : 0;

    const taxableBeforeSynergy = (outLeg + returnLeg) * buses + service + bridge;
    const taxFreeBeforeSynergy = ferry;

    const synergyMultiplier = synergyEnabled ? 1 + synergyRate : 1;

    const taxableExVat = taxableBeforeSynergy * synergyMultiplier;
    const taxFreeExVat = taxFreeBeforeSynergy * synergyMultiplier;

    const vatRate = vatMode === "sweden" ? 0.06 : 0;
    const vatAmount = taxableExVat * vatRate;

    const exVat = taxableExVat + taxFreeExVat;
    const total = exVat + vatAmount;

    return {
      buses,
      outLeg,
      returnLeg,
      service,
      bridge,
      ferry,
      taxableExVat,
      taxFreeExVat,
      exVat,
      vatRate,
      vatAmount,
      total,
    };
  }, [
    busCount,
    kmPrice,
    hourDayPrice,
    hourEveningPrice,
    hourWeekendPrice,
    serviceFee,
    includeServiceFee,
    serviceFeeMode,
    vatMode,
    includeReturn,
    includeBridgeFee,
    bridgeFee,
    includeFerryFee,
    ferryFee,
    synergyEnabled,
    synergyRate,
    outKm,
    outDayHours,
    outEveningHours,
    outWeekendHours,
    returnKm,
    returnDayHours,
    returnEveningHours,
    returnWeekendHours,
  ]);

  function buildPayload() {
    return {
      priceList,
      busType,
      kmBand,
      busCount,

      kmPrice,
      hourDayPrice,
      hourEveningPrice,
      hourWeekendPrice,
      serviceFee,

      includeServiceFee,
      serviceFeeMode,
      vatMode,
      includeReturn,

      includeBridgeFee,
      bridgeFee,
      includeFerryFee,
      ferryFee,

      synergyEnabled,
      synergyRate,

      outKm,
      outDayHours,
      outEveningHours,
      outWeekendHours,

      returnKm,
      returnDayHours,
      returnEveningHours,
      returnWeekendHours,

      priceNote,
    };
  }

  async function handleSave(status = "calculated") {
    if (!offer?.id) return;

    try {
      setIsSaving(true);

      await saveOfferCalculator({
        offerId: offer.id,
        calculation: buildPayload(),
        result: {
          exVat: calculation.exVat,
          vatAmount: calculation.vatAmount,
          total: calculation.total,
          vatRate: calculation.vatRate * 100,
        },
        priceNote,
        proposalStatus: status,
      });

      Alert.alert("Kalkyl sparad", "Prisförslaget har sparats på offerten.");
    } catch (error: any) {
      Alert.alert("Kunde inte spara", error?.message || "Försök igen.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePrepareSend() {
    if (!offer?.id) return;

    if (!offer.customerEmail) {
      Alert.alert("E-post saknas", "Offerten saknar kundens e-postadress.");
      return;
    }

    try {
      setIsPreparingSend(true);

      await saveOfferCalculator({
        offerId: offer.id,
        calculation: buildPayload(),
        result: {
          exVat: calculation.exVat,
          vatAmount: calculation.vatAmount,
          total: calculation.total,
          vatRate: calculation.vatRate * 100,
        },
        priceNote,
        proposalStatus: "ready_to_send",
      });

      const result = await sendOfferProposalViaPortal(offer.id);

      Alert.alert(
        "Prisförslag skickat",
        `Prisförslaget har skickats till:\n${result.sentTo}`
      );

      await loadOffer(true);
    } catch (error: any) {
      Alert.alert("Kunde inte skicka prisförslag", error?.message || "Försök igen.");
    } finally {
      setIsPreparingSend(false);
    }
  }
  function copyOutboundToReturn() {
    setReturnKm(outKm);
    setReturnDayHours(outDayHours);
    setReturnEveningHours(outEveningHours);
    setReturnWeekendHours(outWeekendHours);
  }

  if (isLoading && !offer) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.centerText}>Hämtar offertkalkyl...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadOffer(true)}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.header}>
            <Pressable style={styles.iconButton} onPress={() => router.back()}>
              <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.title}>Offertdetalj</Text>
              <Text style={styles.subtitle}>{offer?.reference || "Prisförslag"}</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Calculator size={38} color={colors.goldSoft} strokeWidth={2.4} />
            </View>

            <Text style={styles.heroKicker}>KALKYL & PRISFÖRSLAG</Text>
            <Text style={styles.heroTitle}>Offert med kalkyl längst ner.</Text>
            <Text style={styles.heroText}>
              Kontrollera offertens uppgifter och räkna prisförslag direkt i samma vy.
            </Text>
          </View>

          <View style={styles.offerCard}>
            <Text style={styles.offerTitle}>{offer?.customerName || "Kund saknas"}</Text>
            <Text style={styles.offerText}>
              {offer?.departure || "Start saknas"} → {offer?.destination || "Destination saknas"}
            </Text>
            {offer?.customerEmail ? <Text style={styles.offerMuted}>{offer.customerEmail}</Text> : null}
          </View>

          <Section title="Prislista & buss">
            <ChoiceGrid items={priceLists} value={priceList} onChange={setPriceList} />
            <ChoiceGrid items={busTypes} value={busType} onChange={setBusType} />
            <ChoiceGrid items={kmBands} value={kmBand} onChange={setKmBand} />

            <Input label="Antal bussar" value={busCount} onChangeText={setBusCount} keyboardType="decimal-pad" />
          </Section>

          <Section title="Grundpriser">
            <Input label="Kilometerpris" value={kmPrice} onChangeText={setKmPrice} suffix="kr/km" keyboardType="decimal-pad" />
            <Input label="Timpris dag" value={hourDayPrice} onChangeText={setHourDayPrice} suffix="kr/tim" keyboardType="decimal-pad" />
            <Input label="Timpris kväll" value={hourEveningPrice} onChangeText={setHourEveningPrice} suffix="kr/tim" keyboardType="decimal-pad" />
            <Input label="Timpris helg" value={hourWeekendPrice} onChangeText={setHourWeekendPrice} suffix="kr/tim" keyboardType="decimal-pad" />
            <Input label="Serviceavgift / grundavgift" value={serviceFee} onChangeText={setServiceFee} suffix="kr" keyboardType="decimal-pad" />

            <ToggleRow label="Ta med serviceavgift" value={includeServiceFee} onChange={setIncludeServiceFee} />

            <View style={styles.segmentRow}>
              <SegmentButton label="Per uppdrag" active={serviceFeeMode === "once"} onPress={() => setServiceFeeMode("once")} />
              <SegmentButton label="Per sträcka" active={serviceFeeMode === "perLeg"} onPress={() => setServiceFeeMode("perLeg")} />
            </View>
          </Section>

          <Section title="Utresa">
            <Input label="Kilometer" value={outKm} onChangeText={setOutKm} keyboardType="decimal-pad" />
            <Input label="Timmar dag" value={outDayHours} onChangeText={setOutDayHours} keyboardType="decimal-pad" />
            <Input label="Timmar kväll" value={outEveningHours} onChangeText={setOutEveningHours} keyboardType="decimal-pad" />
            <Input label="Timmar helg" value={outWeekendHours} onChangeText={setOutWeekendHours} keyboardType="decimal-pad" />
          </Section>

          <Section title="Returresa">
            <ToggleRow label="Inkludera returresa" value={includeReturn} onChange={setIncludeReturn} />

            {includeReturn ? (
              <>
                <Pressable style={styles.copyButton} onPress={copyOutboundToReturn}>
                  <Copy size={17} color={colors.primary} strokeWidth={2.5} />
                  <Text style={styles.copyButtonText}>Kopiera utresa till retur</Text>
                </Pressable>

                <Input label="Retur kilometer" value={returnKm} onChangeText={setReturnKm} keyboardType="decimal-pad" />
                <Input label="Retur timmar dag" value={returnDayHours} onChangeText={setReturnDayHours} keyboardType="decimal-pad" />
                <Input label="Retur timmar kväll" value={returnEveningHours} onChangeText={setReturnEveningHours} keyboardType="decimal-pad" />
                <Input label="Retur timmar helg" value={returnWeekendHours} onChangeText={setReturnWeekendHours} keyboardType="decimal-pad" />
              </>
            ) : null}
          </Section>

          <Section title="Avgifter & moms">
            <View style={styles.segmentRow}>
              <SegmentButton label="6% Sverige" active={vatMode === "sweden"} onPress={() => setVatMode("sweden")} />
              <SegmentButton label="Utomlands 0%" active={vatMode === "abroad"} onPress={() => setVatMode("abroad")} />
            </View>

            <ToggleRow label="Inkludera broavgift" value={includeBridgeFee} onChange={setIncludeBridgeFee} />
            {includeBridgeFee ? (
              <Input label="Broavgift" value={bridgeFee} onChangeText={setBridgeFee} suffix="kr" keyboardType="decimal-pad" />
            ) : null}

            <ToggleRow label="Inkludera båtavgift, momsfri" value={includeFerryFee} onChange={setIncludeFerryFee} />
            {includeFerryFee ? (
              <Input label="Båtavgift" value={ferryFee} onChangeText={setFerryFee} suffix="kr" keyboardType="decimal-pad" />
            ) : null}
          </Section>

          <Section title="SynergyBus">
            <ToggleRow label="Aktivera provision" value={synergyEnabled} onChange={setSynergyEnabled} />

            {synergyEnabled ? (
              <View style={styles.rateRow}>
                {synergyRates.map((item) => (
                  <Pressable
                    key={item.label}
                    style={[styles.rateButton, synergyRate === item.value && styles.rateButtonActive]}
                    onPress={() => setSynergyRate(item.value)}
                  >
                    <Percent
                      size={14}
                      color={synergyRate === item.value ? colors.white : colors.primary}
                      strokeWidth={2.5}
                    />
                    <Text style={[styles.rateText, synergyRate === item.value && styles.rateTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Section>

          <Section title="Intern notering / kommentar till priset">
            <TextInput
              value={priceNote}
              onChangeText={setPriceNote}
              placeholder="T.ex. Pris baserat på 2 bussar, retur samma dag, provision inkluderad."
              placeholderTextColor={colors.textMuted}
              multiline
              style={styles.noteInput}
            />
          </Section>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIcon}>
                <WalletCards size={24} color={colors.primary} strokeWidth={2.5} />
              </View>

              <View>
                <Text style={styles.summaryTitle}>Totalt pris</Text>
                <Text style={styles.summarySub}>Alla bussar</Text>
              </View>
            </View>

            <SummaryRow label="Pris exkl. moms" value={formatOfferCalculatorMoney(calculation.exVat)} />
            <SummaryRow label={`Moms ${Math.round(calculation.vatRate * 100)}%`} value={formatOfferCalculatorMoney(calculation.vatAmount)} />
            <SummaryRow label="Totalt inkl. moms" value={formatOfferCalculatorMoney(calculation.total)} strong />

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.secondaryButton, isSaving && styles.disabled]}
                onPress={() => handleSave("calculated")}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Save size={18} color={colors.primary} strokeWidth={2.5} />
                    <Text style={styles.secondaryButtonText}>Spara kalkyl</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.primaryButton, isPreparingSend && styles.disabled]}
                onPress={handlePrepareSend}
                disabled={isPreparingSend}
              >
                {isPreparingSend ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Mail size={18} color={colors.white} strokeWidth={2.5} />
                    <Text style={styles.primaryButtonText}>Skicka prisförslag</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ChoiceGrid({
  items,
  value,
  onChange,
}: {
  items: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.choiceGrid}>
      {items.map((item) => {
        const active = value === item.value;

        return (
          <Pressable
            key={item.value}
            style={[styles.choiceButton, active && styles.choiceButtonActive]}
            onPress={() => onChange(item.value)}
          >
            <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Input({
  label,
  value,
  onChangeText,
  suffix,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  suffix?: string;
  keyboardType?: "default" | "decimal-pad";
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>

      <View style={styles.inputBox}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType || "default"}
          style={styles.input}
        />
        {suffix ? <Text style={styles.inputSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable style={styles.toggleRow} onPress={() => onChange(!value)}>
      <View style={[styles.checkbox, value && styles.checkboxActive]}>
        {value ? <Check size={15} color={colors.white} strokeWidth={3} /> : null}
      </View>

      <Text style={styles.toggleText}>{label}</Text>
    </Pressable>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.segmentButton, active && styles.segmentButtonActive]} onPress={onPress}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={[styles.summaryRow, strong && styles.summaryRowStrong]}>
      <Text style={[styles.summaryLabel, strong && styles.summaryLabelStrong]}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryValueStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  centerText: { color: colors.textMuted, fontSize: 13, fontWeight: "800", marginTop: 10 },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },
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

  offerCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  offerTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  offerText: { color: colors.text, fontSize: 12.5, fontWeight: "800", marginTop: 5 },
  offerMuted: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 3 },

  section: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "900", marginBottom: 10 },
  sectionHelp: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: -4,
    marginBottom: 12,
  },
  choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  choiceButton: {
    minHeight: 39,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 9,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.primary, fontSize: 11.5, fontWeight: "900" },
  choiceTextActive: { color: colors.white },

  inputWrap: { marginBottom: 11 },
  inputLabel: { color: colors.text, fontSize: 12, fontWeight: "900", marginBottom: 7 },
  inputBox: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  input: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "800", paddingVertical: 10 },
  inputSuffix: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginLeft: 8 },

  toggleRow: { flexDirection: "row", alignItems: "center", minHeight: 38, marginBottom: 7 },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 7,
    borderWidth: 1.4,
    borderColor: colors.border,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "800" },

  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { color: colors.primary, fontSize: 11.5, fontWeight: "900" },
  segmentTextActive: { color: colors.white },

  copyButton: {
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 11,
  },
  copyButtonText: { color: colors.primary, fontSize: 12.5, fontWeight: "900", marginLeft: 7 },

  rateRow: { flexDirection: "row", gap: 8 },
  rateButton: {
    flex: 1,
    borderRadius: 15,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  rateButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rateText: { color: colors.primary, fontSize: 12, fontWeight: "900", marginLeft: 3 },
  rateTextActive: { color: colors.white },

  noteInput: {
    minHeight: 92,
    borderRadius: 16,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    paddingTop: 12,
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    textAlignVertical: "top",
  },

  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  summaryHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  summaryTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  summarySub: { color: colors.textMuted, fontSize: 11.5, fontWeight: "800", marginTop: 2 },
  summaryRow: {
    minHeight: 38,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryRowStrong: { borderBottomWidth: 0, marginTop: 5 },
  summaryLabel: { color: colors.textMuted, fontSize: 12.5, fontWeight: "900" },
  summaryValue: { color: colors.text, fontSize: 13.5, fontWeight: "900" },
  summaryLabelStrong: { color: colors.text, fontSize: 14, fontWeight: "900" },
  summaryValueStrong: { color: colors.primary, fontSize: 18, fontWeight: "900" },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  secondaryButtonText: { color: colors.primary, fontSize: 12, fontWeight: "900", marginLeft: 6 },
  primaryButton: {
    flex: 1.25,
    minHeight: 48,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryButtonText: { color: colors.white, fontSize: 12, fontWeight: "900", marginLeft: 6 },
  disabled: { opacity: 0.65 },
});




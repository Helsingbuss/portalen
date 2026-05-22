import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Calculator, Lock, Save, Send } from "lucide-react-native";

import { colors } from "../../theme/colors";
import { formatAgentOfferDetailMoney } from "../../services/agentOfferDetailService";

type BusTypeKey = "sprinter" | "turistbuss" | "helturistbuss" | "dubbeldackare";
type CategoryKey = "bestallning" | "brollop" | "forening";

type BusType = {
  key: BusTypeKey;
  label: string;
  seats: string;
  kmRate: number;
  hourRate: number;
  minimumPrice: number;
};

type Category = {
  key: CategoryKey;
  label: string;
  multiplier: number;
};

const VAT_RATE = 0.06;
const SERVICE_FEE = 495;

const BUS_TYPES: BusType[] = [
  {
    key: "sprinter",
    label: "Sprinter",
    seats: "upp till 19",
    kmRate: 18,
    hourRate: 650,
    minimumPrice: 3490,
  },
  {
    key: "turistbuss",
    label: "Turistbuss",
    seats: "upp till 39",
    kmRate: 26,
    hourRate: 850,
    minimumPrice: 4990,
  },
  {
    key: "helturistbuss",
    label: "Helturistbuss",
    seats: "upp till 63",
    kmRate: 32,
    hourRate: 990,
    minimumPrice: 5990,
  },
  {
    key: "dubbeldackare",
    label: "Dubbeldäckare",
    seats: "upp till 81",
    kmRate: 40,
    hourRate: 1250,
    minimumPrice: 7990,
  },
];

const CATEGORIES: Category[] = [
  { key: "bestallning", label: "Beställning", multiplier: 1 },
  { key: "brollop", label: "Bröllop", multiplier: 1.12 },
  { key: "forening", label: "Förening", multiplier: 0.95 },
];

function toNumber(value: string) {
  return Number(String(value || "0").replace(",", ".")) || 0;
}

export default function AgentOfferCalculator({
  initialNotes,
  isSaving,
  onSave,
}: {
  initialNotes?: string;
  isSaving?: boolean;
  onSave: (input: {
    internalCost: number;
    marginPercent: number;
    priceAmount: number;
    customerPrice: number;
    notes: string;
  }) => void;
}) {
  const [categoryKey, setCategoryKey] = useState<CategoryKey>("bestallning");
  const [busTypeKey, setBusTypeKey] = useState<BusTypeKey>("turistbuss");
  const [kilometers, setKilometers] = useState("");
  const [hours, setHours] = useState("");
  const [waitingHours, setWaitingHours] = useState("");
  const [busCount, setBusCount] = useState("1");
  const [manualAdjustment, setManualAdjustment] = useState("");
  const [notes, setNotes] = useState(initialNotes || "");

  const selectedBus = BUS_TYPES.find((item) => item.key === busTypeKey) || BUS_TYPES[1];
  const selectedCategory = CATEGORIES.find((item) => item.key === categoryKey) || CATEGORIES[0];

  const calculation = useMemo(() => {
    const km = toNumber(kilometers);
    const h = toNumber(hours);
    const wait = toNumber(waitingHours);
    const buses = Math.max(1, Math.round(toNumber(busCount)));
    const adjustment = toNumber(manualAdjustment);

    const kmCost = km * selectedBus.kmRate;
    const hourCost = h * selectedBus.hourRate;
    const waitingCost = wait * selectedBus.hourRate;
    const baseBeforeMinimum = kmCost + hourCost + waitingCost + SERVICE_FEE;
    const baseAfterMinimum = Math.max(selectedBus.minimumPrice, baseBeforeMinimum);
    const categoryAdjusted = Math.round(baseAfterMinimum * selectedCategory.multiplier);
    const subtotalExVat = Math.round(categoryAdjusted * buses + adjustment);
    const vat = Math.round(subtotalExVat * VAT_RATE);
    const totalIncVat = subtotalExVat + vat;

    return {
      km,
      h,
      wait,
      buses,
      kmCost,
      hourCost,
      waitingCost,
      serviceFee: SERVICE_FEE,
      minimumPrice: selectedBus.minimumPrice,
      baseBeforeMinimum,
      baseAfterMinimum,
      categoryAdjusted,
      subtotalExVat,
      vat,
      totalIncVat,
      internalCost: Math.round(kmCost + hourCost + waitingCost),
      marginPercent:
        subtotalExVat > 0 && kmCost + hourCost + waitingCost > 0
          ? Math.round(((subtotalExVat - (kmCost + hourCost + waitingCost)) / (kmCost + hourCost + waitingCost)) * 100)
          : 0,
    };
  }, [
    kilometers,
    hours,
    waitingHours,
    busCount,
    manualAdjustment,
    selectedBus,
    selectedCategory,
  ]);

  function save(sendToCustomer: boolean) {
    const extraNote = sendToCustomer
      ? "\n\nAgent markerade prisförslaget som redo för utskick."
      : "";

    onSave({
      internalCost: calculation.internalCost,
      marginPercent: calculation.marginPercent,
      priceAmount: calculation.totalIncVat,
      customerPrice: calculation.totalIncVat,
      notes:
        `Kategori: ${selectedCategory.label}
Busstyp: ${selectedBus.label}
Km: ${calculation.km}
Timmar: ${calculation.h}
Väntetid: ${calculation.wait}
Antal bussar: ${calculation.buses}
Pris exkl. moms: ${calculation.subtotalExVat}
Moms 6%: ${calculation.vat}
Pris inkl. moms: ${calculation.totalIncVat}

${notes}` + extraNote,
    });
  }

  return (
    <View style={styles.calculatorCard}>
      <View style={styles.calculatorHeader}>
        <View style={styles.calculatorIcon}>
          <Calculator size={24} color={colors.primary} strokeWidth={2.5} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.calculatorTitle}>Kalkyl & prisförslag</Text>
          <Text style={styles.calculatorText}>
            Agenten fyller i uppgifter. Prislistan är låst och kan inte ändras.
          </Text>
        </View>
      </View>

      <View style={styles.lockBox}>
        <Lock size={17} color={colors.primary} strokeWidth={2.5} />
        <Text style={styles.lockText}>
          Låst prislista: km-pris, timpris, minimipris och moms hämtas från Helsingbuss regler.
        </Text>
      </View>

      <Text style={styles.groupTitle}>Kategori</Text>
      <View style={styles.optionRow}>
        {CATEGORIES.map((item) => (
          <Pressable
            key={item.key}
            style={[styles.optionButton, categoryKey === item.key && styles.optionButtonActive]}
            onPress={() => setCategoryKey(item.key)}
          >
            <Text style={[styles.optionText, categoryKey === item.key && styles.optionTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.groupTitle}>Busstyp</Text>
      <View style={styles.busGrid}>
        {BUS_TYPES.map((item) => (
          <Pressable
            key={item.key}
            style={[styles.busOption, busTypeKey === item.key && styles.busOptionActive]}
            onPress={() => setBusTypeKey(item.key)}
          >
            <Text style={[styles.busTitle, busTypeKey === item.key && styles.busTitleActive]}>
              {item.label}
            </Text>
            <Text style={[styles.busText, busTypeKey === item.key && styles.busTextActive]}>
              {item.seats}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.lockedRates}>
        <Text style={styles.lockedRatesTitle}>Låsta priser för vald busstyp</Text>
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>Km-pris</Text>
          <Text style={styles.rateValue}>{selectedBus.kmRate} kr/km</Text>
        </View>
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>Timpris</Text>
          <Text style={styles.rateValue}>{selectedBus.hourRate} kr/tim</Text>
        </View>
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>Minimipris</Text>
          <Text style={styles.rateValue}>{formatAgentOfferDetailMoney(selectedBus.minimumPrice)}</Text>
        </View>
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>Serviceavgift</Text>
          <Text style={styles.rateValue}>{formatAgentOfferDetailMoney(SERVICE_FEE)}</Text>
        </View>
      </View>

      <Text style={styles.groupTitle}>Uppgifter agenten fyller i</Text>

      <View style={styles.inputGrid}>
        <Field label="Antal km" value={kilometers} onChangeText={setKilometers} placeholder="Ex. 120" />
        <Field label="Timmar" value={hours} onChangeText={setHours} placeholder="Ex. 5" />
        <Field label="Väntetid" value={waitingHours} onChangeText={setWaitingHours} placeholder="Ex. 1" />
        <Field label="Antal bussar" value={busCount} onChangeText={setBusCount} placeholder="1" />
      </View>

      <Text style={styles.inputLabel}>Justering / tillägg</Text>
      <TextInput
        value={manualAdjustment}
        onChangeText={setManualAdjustment}
        keyboardType="numeric"
        placeholder="Ex. 500 eller -300"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>Prisberäkning</Text>

        <BreakdownRow label="Km" value={formatAgentOfferDetailMoney(calculation.kmCost)} />
        <BreakdownRow label="Tid" value={formatAgentOfferDetailMoney(calculation.hourCost)} />
        <BreakdownRow label="Väntetid" value={formatAgentOfferDetailMoney(calculation.waitingCost)} />
        <BreakdownRow label="Serviceavgift" value={formatAgentOfferDetailMoney(calculation.serviceFee)} />
        <BreakdownRow label="Minimipris används" value={calculation.baseAfterMinimum > calculation.baseBeforeMinimum ? "Ja" : "Nej"} />
        <BreakdownRow label="Pris exkl. moms" value={formatAgentOfferDetailMoney(calculation.subtotalExVat)} />
        <BreakdownRow label="Moms 6%" value={formatAgentOfferDetailMoney(calculation.vat)} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Pris till kund</Text>
          <Text style={styles.totalValue}>{formatAgentOfferDetailMoney(calculation.totalIncVat)}</Text>
        </View>
      </View>

      <Text style={styles.inputLabel}>Kommentar / intern notering</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Ex. Pris baserat på heldag, framkörning och väntetid..."
        placeholderTextColor={colors.textMuted}
        style={[styles.input, styles.textArea]}
        multiline
      />

      <View style={styles.saveRow}>
        <Pressable
          style={[styles.saveButton, isSaving && styles.disabled]}
          onPress={() => save(false)}
          disabled={isSaving}
        >
          <Save size={18} color={colors.white} />
          <Text style={styles.saveButtonText}>Spara</Text>
        </Pressable>

        <Pressable
          style={[styles.sendButton, isSaving && styles.disabled]}
          onPress={() => save(true)}
          disabled={isSaving}
        >
          <Send size={18} color={colors.primary} />
          <Text style={styles.sendButtonText}>Förbered utskick</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
    </View>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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

  lockBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 17,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  lockText: {
    flex: 1,
    color: colors.primary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginLeft: 8,
  },

  groupTitle: { color: colors.text, fontSize: 14, fontWeight: "900", marginTop: 8, marginBottom: 9 },
  optionRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  optionButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  optionButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  optionTextActive: { color: colors.white },

  busGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  busOption: {
    width: "48.7%",
    backgroundColor: colors.background,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  busOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  busTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  busTitleActive: { color: colors.white },
  busText: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800", marginTop: 2 },
  busTextActive: { color: "#DDEBE8" },

  lockedRates: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    marginTop: 13,
    marginBottom: 8,
  },
  lockedRatesTitle: { color: colors.text, fontSize: 13, fontWeight: "900", marginBottom: 8 },
  rateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  rateLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  rateValue: { color: colors.primary, fontSize: 12, fontWeight: "900" },

  inputGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  field: { width: "48.7%" },
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

  breakdownCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  breakdownTitle: { color: colors.goldSoft, fontSize: 13, fontWeight: "900", marginBottom: 8 },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  breakdownLabel: { color: "#DDEBE8", fontSize: 12, fontWeight: "800" },
  breakdownValue: { color: colors.white, fontSize: 12, fontWeight: "900" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    marginTop: 8,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: { color: colors.goldSoft, fontSize: 14, fontWeight: "900" },
  totalValue: { color: colors.white, fontSize: 20, fontWeight: "900" },

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

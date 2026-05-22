import React, { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Bus,
  Fuel,
  Hotel,
  Plane,
  ReceiptText,
  Save,
  Ship,
  ShoppingBag,
  UserRound,
  Wrench,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import { saveExpense } from "../../services/expensesService";

const businessUnits = [
  { label: "Beställning", value: "bestallning", icon: Bus },
  { label: "Flygbuss", value: "shuttle", icon: Plane },
  { label: "Sundra", value: "sundra", icon: ShoppingBag },
  { label: "Övrigt", value: "other", icon: BriefcaseBusiness },
];

const categories = [
  { label: "Operatör", value: "operator", icon: BriefcaseBusiness },
  { label: "Bränsle", value: "fuel", icon: Fuel },
  { label: "Personal", value: "staff", icon: UserRound },
  { label: "Hotell", value: "hotel", icon: Hotel },
  { label: "Färja", value: "ferry", icon: Ship },
  { label: "Service", value: "maintenance", icon: Wrench },
  { label: "Övrigt", value: "other", icon: ReceiptText },
];

export default function ExpenseFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    supplierName?: string;
    businessUnit?: string;
    category?: string;
    amount?: string;
    vatRate?: string;
    status?: string;
    paymentMethod?: string;
    expenseDate?: string;
    dueDate?: string;
    paidAt?: string;
    receiptUrl?: string;
    notes?: string;
  }>();

  const isEdit = Boolean(params.id);

  const [title, setTitle] = useState(String(params.title || ""));
  const [supplierName, setSupplierName] = useState(String(params.supplierName || ""));
  const [businessUnit, setBusinessUnit] = useState(String(params.businessUnit || "bestallning"));
  const [category, setCategory] = useState(String(params.category || "operator"));
  const [amount, setAmount] = useState(String(params.amount || ""));
  const [vatRate, setVatRate] = useState(String(params.vatRate || "25"));
  const [status, setStatus] = useState(String(params.status || "pending"));
  const [paymentMethod, setPaymentMethod] = useState(String(params.paymentMethod || ""));
  const [expenseDate, setExpenseDate] = useState(
    String(params.expenseDate || new Date().toISOString().slice(0, 10))
  );
  const [dueDate, setDueDate] = useState(String(params.dueDate || ""));
  const [receiptUrl, setReceiptUrl] = useState(String(params.receiptUrl || ""));
  const [notes, setNotes] = useState(String(params.notes || ""));
  const [isSaving, setIsSaving] = useState(false);

  function parseNumber(value: string, fallback = 0) {
    const parsed = Number(String(value || "").replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Titel saknas", "Fyll i vad kostnaden gäller.");
      return;
    }

    const amountNumber = parseNumber(amount);

    if (amountNumber <= 0) {
      Alert.alert("Belopp saknas", "Fyll i ett giltigt belopp.");
      return;
    }

    try {
      setIsSaving(true);

      await saveExpense({
        id: String(params.id || ""),
        title,
        supplierName,
        businessUnit,
        category,
        amount: amountNumber,
        vatRate: parseNumber(vatRate, 25),
        status,
        paymentMethod,
        expenseDate,
        dueDate,
        paidAt: status === "paid" ? String(params.paidAt || new Date().toISOString()) : "",
        receiptUrl,
        notes,
      });

      Alert.alert(
        isEdit ? "Kostnad uppdaterad" : "Kostnad sparad",
        "Kostnaden har sparats.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/admin/expenses" as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Kunde inte spara", error?.message || "Kontrollera uppgifterna.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable style={styles.iconButton} onPress={() => router.back()}>
              <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.title}>{isEdit ? "Redigera kostnad" : "Lägg till kostnad"}</Text>
              <Text style={styles.subtitle}>Koppla kostnaden till rätt verksamhet</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <ReceiptText size={36} color={colors.goldSoft} strokeWidth={2.4} />
            </View>

            <Text style={styles.heroKicker}>KOSTNAD</Text>
            <Text style={styles.heroTitle}>Registrera kostnad på rätt verksamhet.</Text>
            <Text style={styles.heroText}>
              Då kan resultat per verksamhet visa vad Beställning, Flygbuss och Sundra faktiskt tjänar.
            </Text>
          </View>

          <View style={styles.card}>
            <InputField
              label="Titel"
              value={title}
              onChangeText={setTitle}
              placeholder="Ex. Operatörskostnad Malmö - Gekås"
            />

            <InputField
              label="Leverantör / operatör"
              value={supplierName}
              onChangeText={setSupplierName}
              placeholder="Ex. Bergkvara, hotell, färjebolag..."
            />

            <Text style={styles.inputLabel}>Verksamhet</Text>
            <View style={styles.buttonGrid}>
              {businessUnits.map((item) => {
                const Icon = item.icon;
                const active = businessUnit === item.value;

                return (
                  <Pressable
                    key={item.value}
                    style={[styles.choiceButton, active && styles.choiceButtonActive]}
                    onPress={() => setBusinessUnit(item.value)}
                  >
                    <Icon size={18} color={active ? colors.white : colors.primary} strokeWidth={2.4} />
                    <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Kategori</Text>
            <View style={styles.buttonGrid}>
              {categories.map((item) => {
                const Icon = item.icon;
                const active = category === item.value;

                return (
                  <Pressable
                    key={item.value}
                    style={[styles.choiceButton, active && styles.choiceButtonActive]}
                    onPress={() => setCategory(item.value)}
                  >
                    <Icon size={18} color={active ? colors.white : colors.primary} strokeWidth={2.4} />
                    <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <InputField
              label="Belopp inkl. moms"
              value={amount}
              onChangeText={setAmount}
              placeholder="Ex. 8500"
              keyboardType="decimal-pad"
            />

            <InputField
              label="Moms %"
              value={vatRate}
              onChangeText={setVatRate}
              placeholder="25"
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.statusRow}>
              <StatusButton label="Väntar" value="pending" active={status === "pending"} onPress={setStatus} />
              <StatusButton label="Betald" value="paid" active={status === "paid"} onPress={setStatus} />
              <StatusButton label="Förfallen" value="overdue" active={status === "overdue"} onPress={setStatus} />
            </View>

            <InputField label="Betalsätt" value={paymentMethod} onChangeText={setPaymentMethod} placeholder="Ex. Bank, kort, faktura, Swish" />
            <InputField label="Kostnadsdatum" value={expenseDate} onChangeText={setExpenseDate} placeholder="YYYY-MM-DD" />
            <InputField label="Förfallodatum" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
            <InputField label="Kvitto / fil-länk" value={receiptUrl} onChangeText={setReceiptUrl} placeholder="Länk till kvitto eller dokument" />
            <InputField label="Anteckning" value={notes} onChangeText={setNotes} placeholder="Intern notering..." multiline />
          </View>

          <Pressable
            style={[styles.saveButton, isSaving && styles.disabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Save size={21} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.saveButtonText}>Spara kostnad</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "decimal-pad";
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType || "default"}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

function StatusButton({
  label,
  value,
  active,
  onPress,
}: {
  label: string;
  value: string;
  active: boolean;
  onPress: (value: string) => void;
}) {
  return (
    <Pressable style={[styles.statusButton, active && styles.statusButtonActive]} onPress={() => onPress(value)}>
      <Text style={[styles.statusButtonText, active && styles.statusButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
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
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 },
  heroCard: { backgroundColor: colors.primary, borderRadius: 26, padding: 20, marginBottom: 18 },
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  inputWrap: { marginBottom: 13 },
  inputLabel: { color: colors.text, fontSize: 12, fontWeight: "900", marginBottom: 7 },
  input: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  inputMultiline: {
    minHeight: 86,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 13,
  },
  choiceButton: {
    width: "48.5%",
    minHeight: 46,
    borderRadius: 15,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  choiceButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: {
    color: colors.primary,
    fontSize: 11.5,
    fontWeight: "900",
    marginLeft: 7,
  },
  choiceTextActive: {
    color: colors.white,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 13,
  },
  statusButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    alignItems: "center",
  },
  statusButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusButtonText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
  },
  statusButtonTextActive: {
    color: colors.white,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 19,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },
  disabled: { opacity: 0.7 },
});

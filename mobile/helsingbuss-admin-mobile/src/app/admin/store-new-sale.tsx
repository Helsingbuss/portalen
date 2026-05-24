import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  Mail,
  MessageSquare,
  Send,
  User,
  WalletCards,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import { createAndSendPaymentLink, formatCurrency, sendSmsViaPortal } from "../../services/storeService";

type PaymentResult = {
  paymentUrl: string;
  paymentId?: string;
  reference?: string;
};

function parseAmount(value: string) {
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

export default function StoreNewSaleScreen() {
  const params = useLocalSearchParams<{
    productId?: string;
    title?: string;
    type?: string;
    priceFrom?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  }>();

  const defaultTitle = params.title || "Annan betalning";
  const defaultAmount = params.priceFrom || "";

  const [productTitle, setProductTitle] = useState(String(defaultTitle));
  const [customerName, setCustomerName] = useState(String(params.customerName || ""));
  const [customerEmail, setCustomerEmail] = useState(String(params.customerEmail || ""));
  const [customerPhone, setCustomerPhone] = useState(String(params.customerPhone || ""));
  const [amount, setAmount] = useState(String(defaultAmount));
  const [quantity, setQuantity] = useState("1");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("Här kommer din betalningslänk från Helsingbuss.");
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);

  const totalAmount = useMemo(() => {
    const qty = Math.max(1, Math.round(parseAmount(quantity)));
    return parseAmount(amount) * qty;
  }, [amount, quantity]);

  function validate() {
    if (!customerName.trim()) {
      Alert.alert("Kundnamn saknas", "Fyll i kundens namn.");
      return false;
    }

    if (!customerEmail.trim() && !customerPhone.trim()) {
      Alert.alert(
        "Kontaktuppgift saknas",
        "Fyll i minst e-postadress eller telefonnummer."
      );
      return false;
    }

    if (totalAmount <= 0) {
      Alert.alert("Belopp saknas", "Fyll i ett belopp större än 0 kr.");
      return false;
    }

    if (!productTitle.trim()) {
      Alert.alert("Produkt saknas", "Fyll i vad betalningen gäller.");
      return false;
    }

    return true;
  }

  async function handleCreatePaymentLink() {
    if (!validate()) return;

    try {
      setIsCreating(true);

      const response = await createAndSendPaymentLink({
        amount: totalAmount,
        title: productTitle.trim(),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        reference: reference.trim() || undefined,
        message: `${message}

${productTitle}
Belopp: ${formatCurrency(totalAmount)}`,
      });

      setResult({
        paymentUrl: response.paymentUrl,
        paymentId: response.paymentId,
        reference: response.reference || reference,
      });

      if (response.sms?.sent) {
        Alert.alert(
          response.sms.localDryrun
            ? "Test fungerar"
            : response.sms.dryrun
              ? "SMS testat"
              : "Betalningslänk skickad",
          response.sms.localDryrun
            ? "Portalen skapade testlänk och simulerade SMS. Nu fungerar app → portal."
            : response.sms.dryrun
              ? "Portalen skapade länken och testade SMS via 46elks dryrun."
              : "Betalningslänken har skickats automatiskt via SMS till kunden."
        );
      } else if (response.sms?.error) {
        Alert.alert(
          "Länk skapad men SMS misslyckades",
          response.sms.error
        );
      } else {
        Alert.alert(
          "Betalningslänk skapad",
          "Ingen SMS skickades eftersom telefonnummer saknas."
        );
      }
    } catch (error: any) {
      console.log("Create/send payment link error:", error);

      Alert.alert(
        "Kunde inte skicka betalningslänk",
        error?.message || "Kontrollera portalens API."
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function copyLink() {
    if (!result?.paymentUrl) return;

    await Clipboard.setStringAsync(result.paymentUrl);
    Alert.alert("Kopierad", "Betalningslänken är kopierad.");
  }

  function openLink() {
    if (!result?.paymentUrl) return;
    Linking.openURL(result.paymentUrl);
  }

  function sendEmail() {
    if (!result?.paymentUrl) return;

    if (!customerEmail.trim()) {
      Alert.alert("E-post saknas", "Fyll i kundens e-postadress först.");
      return;
    }

    const subject = encodeURIComponent(`Betalningslänk från Helsingbuss`);
    const body = encodeURIComponent(
      `${message}\n\n${productTitle}\nBelopp: ${formatCurrency(totalAmount)}\n\nBetala här:\n${result.paymentUrl}\n\nVänliga hälsningar\nHelsingbuss`
    );

    Linking.openURL(`mailto:${customerEmail.trim()}?subject=${subject}&body=${body}`);
  }

  async function sendSms() {
    if (!result?.paymentUrl) return;

    if (!customerPhone.trim()) {
      Alert.alert("Telefonnummer saknas", "Fyll i kundens telefonnummer först.");
      return;
    }

    try {
      const smsText = `${message}\n\n${productTitle}\nBelopp: ${formatCurrency(totalAmount)}\nBetala här: ${result.paymentUrl}`;

      const response = await sendSmsViaPortal({
        to: customerPhone.trim(),
        message: smsText,
        customerName: customerName.trim(),
        sourceType: "payment_link",
        sourceId: result.paymentId || result.reference || reference || undefined,
      });

      Alert.alert(
        response.dryrun ? "SMS testat" : "SMS skickat",
        response.dryrun
          ? "Dryrun är aktivt i portalen. SMS skickades inte på riktigt, men kopplingen fungerar."
          : "Betalningslänken har skickats till kunden via SMS."
      );
    } catch (error: any) {
      console.log("Send SMS via portal error:", error);

      Alert.alert(
        "Kunde inte skicka SMS",
        error?.message || "Kontrollera 46elks-inställningarna i portalen."
      );
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
              <Text style={styles.title}>Ny försäljning</Text>
              <Text style={styles.subtitle}>Skapa och skicka betalningslänk automatiskt</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <CreditCard size={32} color={colors.goldSoft} strokeWidth={2.5} />
            </View>

            <Text style={styles.heroKicker}>Helsingbuss Kassa</Text>
            <Text style={styles.heroTitle}>Fyll i kunduppgifter och skapa länk.</Text>
            <Text style={styles.heroText}>
              Betalningen skapas via portalens API och SumUp.
            </Text>
          </View>

          <SectionTitle title="Produkt & belopp" />

          <View style={styles.card}>
            <InputField
              label="Vad gäller betalningen?"
              value={productTitle}
              onChangeText={setProductTitle}
              placeholder="Ex. Flygbussbiljett Helsingborg → Kastrup"
              icon={<WalletCards size={20} color={colors.primary} />}
            />

            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <InputField
                  label="Belopp per styck"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="199"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.column}>
                <InputField
                  label="Antal"
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="1"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <InputField
              label="Referens"
              value={reference}
              onChangeText={setReference}
              placeholder="Ex. HB26013 eller kundnamn"
            />

            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Totalt att betala</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
            </View>
          </View>

          <SectionTitle title="Kunduppgifter" />

          <View style={styles.card}>
            <InputField
              label="Kundens namn"
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Anna Svensson"
              icon={<User size={20} color={colors.primary} />}
            />

            <InputField
              label="E-postadress"
              value={customerEmail}
              onChangeText={setCustomerEmail}
              placeholder="kund@example.se"
              keyboardType="email-address"
              autoCapitalize="none"
              icon={<Mail size={20} color={colors.primary} />}
            />

            <InputField
              label="Telefonnummer"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="+46..."
              keyboardType="phone-pad"
              icon={<MessageSquare size={20} color={colors.primary} />}
            />

            <InputField
              label="Meddelande till kund"
              value={message}
              onChangeText={setMessage}
              placeholder="Meddelande"
              multiline
            />
          </View>

          {!result ? (
            <Pressable
              style={[styles.primaryButton, isCreating && styles.disabledButton]}
              onPress={handleCreatePaymentLink}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <CreditCard size={22} color={colors.white} strokeWidth={2.5} />
                  <Text style={styles.primaryButtonText}>Skapa & skicka betalningslänk</Text>
                </>
              )}
            </Pressable>
          ) : (
            <View style={styles.resultCard}>
              <View style={styles.resultTop}>
                <View style={styles.resultIcon}>
                  <CheckCircle2 size={28} color={colors.success} />
                </View>

                <View style={styles.resultTextBox}>
                  <Text style={styles.resultTitle}>Betalningslänk skapad</Text>
                  <Text style={styles.resultText}>
                    {customerName} · {formatCurrency(totalAmount)}
                  </Text>
                </View>
              </View>

              <View style={styles.linkBox}>
                <Text style={styles.linkLabel}>Länk</Text>
                <Text style={styles.linkText} numberOfLines={2}>
                  {result.paymentUrl}
                </Text>
              </View>

              <View style={styles.resultGrid}>
                <Pressable style={styles.resultButton} onPress={sendEmail}>
                  <Mail size={20} color={colors.primary} />
                  <Text style={styles.resultButtonText}>E-post</Text>
                </Pressable>

                <Pressable style={styles.resultButton} onPress={sendSms}>
                  <MessageSquare size={20} color={colors.primary} />
                  <Text style={styles.resultButtonText}>SMS</Text>
                </Pressable>

                <Pressable style={styles.resultButton} onPress={copyLink}>
                  <Copy size={20} color={colors.primary} />
                  <Text style={styles.resultButtonText}>Kopiera</Text>
                </Pressable>

                <Pressable style={styles.resultButton} onPress={openLink}>
                  <Send size={20} color={colors.primary} />
                  <Text style={styles.resultButtonText}>Öppna</Text>
                </Pressable>
              </View>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setResult(null);
                  setCustomerName("");
                  setCustomerEmail("");
                  setCustomerPhone("");
                  setReference("");
                }}
              >
                <Text style={styles.secondaryButtonText}>Skapa ny betalning</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
  icon,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "decimal-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>

      <View style={[styles.inputBox, multiline && styles.inputBoxMultiline]}>
        {icon ? <View style={styles.inputIcon}>{icon}</View> : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, multiline && styles.inputMultiline]}
          keyboardType={keyboardType || "default"}
          autoCapitalize={autoCapitalize || "sentences"}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
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
  },
  title: {
    color: colors.text,
    fontSize: 25,
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
    marginBottom: 18,
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
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 18,
  },
  inputWrap: {
    marginBottom: 13,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 7,
  },
  inputBox: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  inputBoxMultiline: {
    minHeight: 92,
    alignItems: "flex-start",
    paddingTop: 12,
  },
  inputIcon: {
    marginRight: 9,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  twoColumns: {
    flexDirection: "row",
    gap: 10,
  },
  column: {
    flex: 1,
  },
  totalBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 14,
    marginTop: 2,
  },
  totalLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  totalValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 3,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 19,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 14,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  resultTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  resultIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  resultTextBox: {
    flex: 1,
  },
  resultTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  resultText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
  },
  linkBox: {
    backgroundColor: colors.cardSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 13,
  },
  linkLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
  },
  linkText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  resultGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  resultButton: {
    width: "48%",
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  resultButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 7,
  },
  secondaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 17,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 13,
  },
  secondaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
});





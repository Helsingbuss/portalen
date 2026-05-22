import React, { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, BellRing, Mail, ReceiptText, Save, Send, Share2 } from "lucide-react-native";

import { colors } from "../../theme/colors";
import { saveInvoice } from "../../services/invoicesService";
import { sendInvoiceViaPortal } from "../../services/invoicePortalService";
import { sendInvoiceReminderViaPortal } from "../../services/invoiceReminderService";
import {
  emailInvoicePdf,
  shareInvoicePdf,
  type InvoicePdfInput,
} from "../../services/invoicePdfService";

export default 

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
  keyboardType?: "default" | "email-address" | "phone-pad" | "decimal-pad";
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
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
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
  pageTitle: { color: colors.text, fontSize: 24, fontWeight: "900", letterSpacing: -0.4 },
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
  inputMultiline: { minHeight: 86, paddingTop: 12, textAlignVertical: "top" },
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 13 },
  statusButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    alignItems: "center",
  },
  statusButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusButtonText: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  statusButtonTextActive: { color: colors.white },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 19,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 12,
  },
  saveButtonText: { color: colors.white, fontSize: 15, fontWeight: "900", marginLeft: 8 },
  portalButton: {
    backgroundColor: colors.gold,
    borderRadius: 19,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 12,
  },
  portalButtonText: {
    color: colors.primaryDeep,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },
  reminderButton: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 12,
  },
  reminderButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  pdfActions: { flexDirection: "row", gap: 10, marginBottom: 16 },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 7,
  },
  noteBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 14,
  },
  noteTitle: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  noteText: { color: colors.text, fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 4 },
  disabled: { opacity: 0.7 },
});


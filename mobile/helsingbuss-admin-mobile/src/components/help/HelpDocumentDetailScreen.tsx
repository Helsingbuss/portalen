import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  FileText,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import { getHelpDocumentById } from "../../data/helpDocuments";

export default function HelpDocumentDetailScreen({ mode }: { mode: "admin" | "agent" }) {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = String(params.id || "");
  const document = getHelpDocumentById(id);

  if (!document) {
    return (
      <View style={styles.screen}>
        <View style={styles.centerBox}>
          <FileText size={34} color={colors.primary} />
          <Text style={styles.notFoundTitle}>Dokumentet hittades inte</Text>
          <Text style={styles.notFoundText}>
            Gå tillbaka och välj dokumentet igen.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Gå tillbaka</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
        </Pressable>

        <View style={styles.heroCard}>
          <BookOpenCheck size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>
            {mode === "agent" ? "AGENTAPPEN" : "ADMINAPPEN"} · {document.priority}
          </Text>
          <Text style={styles.heroTitle}>{document.title}</Text>
          <Text style={styles.heroText}>{document.text}</Text>
        </View>

        {document.sections.map((section, index) => (
          <View key={`${section.heading}-${index}`} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>{index + 1}</Text>
              </View>

              <Text style={styles.sectionTitle}>{section.heading}</Text>
            </View>

            <Text style={styles.sectionBody}>{section.body}</Text>

            {section.bullets && section.bullets.length > 0 ? (
              <View style={styles.bulletList}>
                {section.bullets.map((bullet) => (
                  <View key={bullet} style={styles.bulletRow}>
                    <CheckCircle2 size={17} color={colors.primary} strokeWidth={2.5} />
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>Kom ihåg</Text>
          <Text style={styles.footerText}>
            Vid osäkerhet ska ärendet skickas vidare till ansvarig person i Helsingbuss. Det är bättre att kontrollera en gång extra än att ge kunden fel besked.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

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
  heroTitle: { color: colors.white, fontSize: 26, lineHeight: 32, fontWeight: "900" },
  heroText: {
    color: "#DDEBE8",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 7,
  },

  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionNumber: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sectionNumberText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  sectionTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  sectionBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },

  bulletList: {
    marginTop: 12,
    gap: 9,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletText: {
    flex: 1,
    color: colors.text,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
    marginLeft: 8,
  },

  footerCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 22,
    padding: 16,
    marginTop: 2,
  },
  footerTitle: { color: colors.primary, fontSize: 15, fontWeight: "900" },
  footerText: {
    color: colors.text,
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 5,
  },

  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  notFoundTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 12,
  },
  notFoundText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 52,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
});
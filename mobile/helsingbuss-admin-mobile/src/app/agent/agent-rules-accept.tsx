import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  acceptAgentRules,
  getAgentRulesForAcceptance,
  type AgentRuleStep,
  type AgentRulesAcceptanceData,
} from "../../services/agentRulesService";

export default function AgentRulesAcceptScreen() {
  const [data, setData] = useState<AgentRulesAcceptanceData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  const rules = data?.rules || [];
  const currentRule: AgentRuleStep | null = rules[currentIndex] || null;
  const isLast = currentIndex >= rules.length - 1;
  const progress = rules.length > 0 ? Math.round(((currentIndex + 1) / rules.length) * 100) : 0;

  const loadRules = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getAgentRulesForAcceptance();
      setData(result);
    } catch (error: any) {
      Alert.alert("Kunde inte hämta agentregler", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const stepTitle = useMemo(() => {
    if (!currentRule) return "Agentregler";
    return currentRule.title;
  }, [currentRule]);

  function nextStep() {
    if (!isLast) {
      setCurrentIndex((value) => value + 1);
    }
  }

  function previousStep() {
    if (currentIndex > 0) {
      setCurrentIndex((value) => value - 1);
    }
  }

  async function approveRules() {
    if (!data) return;

    try {
      setIsAccepting(true);
      await acceptAgentRules(data.rulesVersion);

      Alert.alert(
        "Agentregler godkända",
        "Tack. Du kan nu fortsätta till agentpanelen.",
        [
          {
            text: "Fortsätt",
            onPress: () => router.replace("/agent/dashboard" as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Kunde inte godkänna", error?.message || "Försök igen.");
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.replace("/" as any)}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
        </Pressable>

        <View style={styles.heroCard}>
          <BookOpenCheck size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>FÖRSTA INLOGGNING</Text>
          <Text style={styles.heroTitle}>{data?.introTitle || "Agentregler"}</Text>
          <Text style={styles.heroText}>
            {data?.introText ||
              "Läs igenom reglerna steg för steg och godkänn dem innan du fortsätter."}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar regler...</Text>
          </View>
        ) : null}

        {!isLoading && currentRule ? (
          <>
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>
                Punkt {currentIndex + 1} av {rules.length}
              </Text>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>

              <Text style={styles.progressText}>{progress}% genomfört</Text>
            </View>

            <View style={styles.ruleCard}>
              <View style={styles.ruleHeader}>
                <View style={styles.ruleIcon}>
                  <ShieldCheck size={22} color={colors.primary} strokeWidth={2.5} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.ruleCategory}>{currentRule.category}</Text>
                  <Text style={styles.ruleTitle}>{stepTitle}</Text>
                </View>
              </View>

              <Text style={styles.ruleText}>{currentRule.description}</Text>
            </View>

            {isLast ? (
              <View style={styles.confirmCard}>
                <BadgeCheck size={28} color={colors.primary} strokeWidth={2.5} />
                <Text style={styles.confirmTitle}>{data?.confirmationTitle}</Text>
                <Text style={styles.confirmText}>{data?.confirmationText}</Text>
              </View>
            ) : null}

            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.secondaryButton, currentIndex === 0 && styles.disabled]}
                onPress={previousStep}
                disabled={currentIndex === 0}
              >
                <ChevronLeft size={19} color={colors.primary} strokeWidth={2.5} />
                <Text style={styles.secondaryButtonText}>Tillbaka</Text>
              </Pressable>

              {!isLast ? (
                <Pressable style={styles.primaryButton} onPress={nextStep}>
                  <Text style={styles.primaryButtonText}>Jag förstår – nästa</Text>
                  <ChevronRight size={19} color={colors.white} strokeWidth={2.5} />
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.primaryButton, isAccepting && styles.disabled]}
                  onPress={approveRules}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <CheckCircle2 size={19} color={colors.white} strokeWidth={2.5} />
                  )}
                  <Text style={styles.primaryButtonText}>Godkänn regler</Text>
                </Pressable>
              )}
            </View>
          </>
        ) : null}
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
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginTop: 12, marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 27, lineHeight: 33, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 7 },

  loadingCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: "800", marginLeft: 10 },

  progressCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  progressTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  progressBar: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  progressText: { color: colors.textMuted, fontSize: 11.5, fontWeight: "800", marginTop: 7 },

  ruleCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  ruleHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  ruleIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  ruleCategory: { color: colors.primary, fontSize: 11, fontWeight: "900", marginBottom: 2 },
  ruleTitle: { color: colors.text, fontSize: 18, lineHeight: 23, fontWeight: "900" },
  ruleText: { color: colors.textMuted, fontSize: 13.5, lineHeight: 21, fontWeight: "700" },

  confirmCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  confirmTitle: { color: colors.primary, fontSize: 16, fontWeight: "900", marginTop: 10 },
  confirmText: { color: colors.text, fontSize: 12.5, lineHeight: 19, fontWeight: "700", marginTop: 5 },

  buttonRow: { flexDirection: "row", gap: 10 },
  secondaryButton: {
    flex: 0.9,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  secondaryButtonText: { color: colors.primary, fontSize: 13, fontWeight: "900", marginLeft: 5 },
  primaryButton: {
    flex: 1.4,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 10,
  },
  primaryButtonText: { color: colors.white, fontSize: 13, fontWeight: "900", marginHorizontal: 7 },
  disabled: { opacity: 0.55 },
});

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { ArrowLeft, BadgeCheck, BookOpenCheck, ShieldCheck } from "lucide-react-native";

import { colors } from "../../theme/colors";
import { getAgentRules, type AgentRule } from "../../services/profileService";

export default function AgentRulesScreen() {
  const [rules, setRules] = useState<AgentRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRules = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getAgentRules();
      setRules(result);
    } catch (error: any) {
      Alert.alert("Kunde inte hämta regler", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRules(false);
  }, [loadRules]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadRules(true)}
            tintColor={colors.primary}
          />
        }
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
        </Pressable>

        <View style={styles.heroCard}>
          <BookOpenCheck size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>AGENTREGLER</Text>
          <Text style={styles.heroTitle}>Så arbetar vi med kunder, offerter och bokningar.</Text>
          <Text style={styles.heroText}>
            Här samlas regler och rutiner som gäller för bokningsagenter i Helsingbuss.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar regler...</Text>
          </View>
        ) : null}

        {rules.length === 0 ? (
          <View style={styles.emptyCard}>
            <ShieldCheck size={28} color={colors.primary} />
            <Text style={styles.emptyTitle}>Inga regler ännu</Text>
            <Text style={styles.emptyText}>
              När regler läggs in i systemet visas de här.
            </Text>
          </View>
        ) : (
          rules.map((rule, index) => (
            <View key={rule.id || rule.ruleKey || index} style={styles.ruleCard}>
              <View style={styles.ruleTop}>
                <View style={styles.ruleIcon}>
                  <BadgeCheck size={20} color={colors.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.ruleCategory}>{rule.category}</Text>
                  <Text style={styles.ruleTitle}>{rule.title}</Text>
                </View>
              </View>

              <Text style={styles.ruleText}>{rule.description}</Text>
            </View>
          ))
        )}
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
  heroTitle: { color: colors.white, fontSize: 25, lineHeight: 31, fontWeight: "900" },
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

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: "center",
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "900", marginTop: 10 },
  emptyText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 4, textAlign: "center" },

  ruleCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    marginBottom: 12,
  },
  ruleTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  ruleIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  ruleCategory: { color: colors.primary, fontSize: 11, fontWeight: "900", marginBottom: 2 },
  ruleTitle: { color: colors.text, fontSize: 15, fontWeight: "900", lineHeight: 20 },
  ruleText: { color: colors.textMuted, fontSize: 12.5, lineHeight: 19, fontWeight: "700" },
});

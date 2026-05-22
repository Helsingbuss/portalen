import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { colors } from "../../theme/colors";
import { hasAcceptedAgentRules } from "../../services/agentRulesService";

export default function AgentIndexScreen() {
  const [message, setMessage] = useState("Kontrollerar agentregler...");

  useEffect(() => {
    let mounted = true;

    async function checkRules() {
      try {
        const accepted = await hasAcceptedAgentRules();

        if (!mounted) return;

        if (accepted) {
          router.replace("/agent/dashboard" as any);
        } else {
          router.replace("/agent/agent-rules-accept" as any);
        }
      } catch (error) {
        if (!mounted) return;
        setMessage("Kunde inte kontrollera agentregler.");
      }
    }

    checkRules();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.screen}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  text: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 12,
    textAlign: "center",
  },
});

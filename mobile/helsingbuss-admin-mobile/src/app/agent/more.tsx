import { Pressable, ScrollView, StyleSheet, Text, View, } from "react-native";
import { router } from "expo-router";
import React from "react";
import {
  BellRing,
  CalendarDays,
  FileText,
  HelpCircle,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import { supabase } from "../../lib/supabase";

export default function AgentMoreScreen() {
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/" as any);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>AGENT</Text>
          <Text style={styles.heroTitle}>Mer</Text>
          <Text style={styles.heroText}>
            InstÃ¤llningar, hjÃ¤lp, regler och utloggning fÃ¶r bokningsagenter.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agentkonto</Text>

          <MenuCard
            title="Min profil"
            text="Agentuppgifter och kontaktinformation"
            icon={<UserRound size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => {}}
          />

          
          <MenuCard
            title="Bokningar"
            text="Se och fÃ¶lj upp bokningar"
            icon={<CalendarDays size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => router.push("/agent/bookings" as any)}
          />
          <MenuCard
            title="Agentregler"
            text="Vad agenten fÃ¥r sÃ¤lja, boka och hantera"
            icon={<ShieldCheck size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => {}}
          />

          <MenuCard
            title="Dokument & hjÃ¤lp"
            text="Manualer, interna instruktioner och stÃ¶d"
            icon={<FileText size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => {}}
          />

          <MenuCard
            title="Notiser"
            text="Agentnotiser och meddelanden"
            icon={<BellRing size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => {}}
          />

          <MenuCard
            title="Support"
            text="Kontakta Helsingbuss support"
            icon={<HelpCircle size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => router.push("/agent/chat" as any)}
          />
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <View style={styles.logoutIcon}>
            <LogOut size={22} color="#B42318" strokeWidth={2.5} />
          </View>

          <View style={styles.logoutTextBox}>
            <Text style={styles.logoutTitle}>Logga ut</Text>
            <Text style={styles.logoutText}>
              Avsluta agentkontot och gÃ¥ tillbaka till inloggningen.
            </Text>
          </View>
        </Pressable>
      
        {/* AUTO-LINK: Min profil */}
        <Pressable
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 22,
            borderWidth: 1,
            borderColor: "#E2E8E5",
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12
          }}
          onPress={() => router.push("/agent/profile" as any)}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 17,
              backgroundColor: "#E6F2EF",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12
            }}
          >
            <UserRound size={22} color="#003C3A" strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#102321", fontSize: 16, fontWeight: "900" }}>Min profil</Text>
            <Text style={{ color: "#6B7A78", fontSize: 12, fontWeight: "700", marginTop: 3 }}>
              Kontaktuppgifter, roll och konto
            </Text>
          </View>
        </Pressable>
      
        {/* AUTO-LINK: Agentregler */}
        <Pressable
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 22,
            borderWidth: 1,
            borderColor: "#E2E8E5",
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12
          }}
          onPress={() => router.push("/agent/agent-rules" as any)}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 17,
              backgroundColor: "#E6F2EF",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12
            }}
          >
            <ShieldCheck size={22} color="#003C3A" strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#102321", fontSize: 16, fontWeight: "900" }}>Agentregler</Text>
            <Text style={{ color: "#6B7A78", fontSize: 12, fontWeight: "700", marginTop: 3 }}>
              Regler fÃ¶r offerter, betalning och kundkontakt
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function MenuCard({
  title,
  text,
  icon,
  onPress,
}: {
  title: string;
  text: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.iconBox}>{icon}</View>

      <View style={styles.cardTextBox}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{text}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 110 },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 20,
    marginBottom: 18,
  },
  heroKicker: {
    color: colors.goldSoft,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 5,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
  },
  heroText: {
    color: "#DDEBE8",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 7,
  },

  section: { marginBottom: 18 },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTextBox: { flex: 1 },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  cardText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3,
  },

  logoutButton: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  logoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#FEE4E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  logoutTextBox: { flex: 1 },
  logoutTitle: {
    color: "#B42318",
    fontSize: 15,
    fontWeight: "900",
  },
  logoutText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3,
  },
});




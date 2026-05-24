import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import {
  BellRing,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import { supabase } from "../../lib/supabase";

export default function DriverMoreScreen() {
  async function signOut() {
    Alert.alert("Logga ut", "Vill du logga ut från förarappen?", [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Logga ut",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/" as any);
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* DRIVER_NOTIFICATIONS_MORE_LINK_START */}
        <Pressable
          onPress={() => router.push("/driver/notifications" as any)}
          style={{
            backgroundColor: "white",
            borderRadius: 20,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "#e2e8f0",
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#0f172a" }}>
                Notiser & meddelanden
              </Text>
              <Text style={{ marginTop: 5, fontSize: 13, lineHeight: 18, color: "#64748b" }}>
                Se körförfrågningar, påminnelser och meddelanden från trafikledningen.
              </Text>
            </View>
            <Text style={{ color: "#194C66", fontSize: 22, fontWeight: "800" }}>›</Text>
          </View>
        </Pressable>
        {/* DRIVER_NOTIFICATIONS_MORE_LINK_END */}

        <View style={styles.heroCard}>
          <ShieldCheck size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>FÖRARAPP</Text>
          <Text style={styles.heroTitle}>Mer</Text>
          <Text style={styles.heroText}>
            Inställningar, schema, notiser och funktioner för förare.
          </Text>
        </View>

        <View style={styles.menuCard}>
          <MenuCard
            title="Mina körningar"
            text="Se dina körorder och kommande uppdrag"
            icon={<ClipboardList size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => router.push("/driver/trips" as any)}
          />

          <MenuCard
            title="Mina scheman"
            text="Se ditt arbetsschema och kommande pass"
            icon={<CalendarDays size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => router.push("/driver/schedules" as any)}
          />

          <MenuCard
            title="Notiser"
            text="Meddelanden och viktiga uppdateringar"
            icon={<BellRing size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => router.push("/driver/notifications" as any)}
          />

          <MenuCard
            title="Min profil"
            text="Dina uppgifter och konto"
            icon={<UserRound size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => router.push("/driver/profile" as any)}
          />

          <MenuCard
            title="Byt roll"
            text="Växla mellan admin, agent och förare"
            icon={<ShieldCheck size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => router.push("/role-select" as any)}
          />
        </View>

        <Pressable style={styles.logoutCard} onPress={signOut}>
          <View style={styles.logoutIcon}>
            <LogOut size={22} color="#B42318" strokeWidth={2.5} />
          </View>

          <View style={styles.menuTextBox}>
            <Text style={styles.logoutTitle}>Logga ut</Text>
            <Text style={styles.logoutText}>
              Avsluta förarkontot och gå tillbaka till inloggningen.
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
    <Pressable style={styles.menuRow} onPress={onPress}>
      <View style={styles.menuIcon}>{icon}</View>

      <View style={styles.menuTextBox}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuText}>{text}</Text>
      </View>

      <ChevronRight size={19} color={colors.textMuted} strokeWidth={2.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 120,
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
  heroTitle: {
    color: colors.white,
    fontSize: 30,
    fontWeight: "900",
  },
  heroText: {
    color: "#DDEBE8",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 7,
  },

  menuCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
    marginBottom: 14,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 18,
  },
  menuIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuTextBox: {
    flex: 1,
  },
  menuTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  menuText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3,
  },

  logoutCard: {
    backgroundColor: "#FFF1F0",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#FFDAD6",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  logoutIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  logoutTitle: {
    color: "#B42318",
    fontSize: 15,
    fontWeight: "900",
  },
  logoutText: {
    color: "#B42318",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3,
  },
});

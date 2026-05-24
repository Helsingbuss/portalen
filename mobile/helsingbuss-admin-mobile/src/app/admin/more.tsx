import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  } from "react-native";
import { router } from "expo-router";
import {
  BellRing,
  BriefcaseBusiness,
  Bus,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import { supabase } from "../../lib/supabase";

const menuItems = [
  {
    title: "Dashboard",
    text: "Tillbaka till adminöversikten",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Bokningar & körningar",
    text: "Se bokningar, offerter och kommande körningar",
    href: "/admin/bookings",
    icon: ClipboardList,
  },
  {
    title: "Körorder förare",
    text: "Skapa och följ upp körorder till chaufförer",
    href: "/admin/driver-orders",
    icon: Bus,
  },
  {
    title: "Trafik & drift",
    text: "Trafikläge, avgångar och driftöversikt",
    href: "/admin/traffic",
    icon: BriefcaseBusiness,
  },
  {
    title: "Fordon & personal",
    text: "Fordon, chaufförer och fordonsdokument",
    href: "/admin/fleet",
    icon: Bus,
  },
  {
    title: "Ekonomi",
    text: "Fakturor, utgifter, avstämning och rapporter",
    href: "/admin/economy",
    icon: WalletCards,
  },
  {
    title: "Dokument",
    text: "Avtal, tillstånd och interna underlag",
    href: "/admin/documents",
    icon: FileText,
  },
  {
    title: "Operatörer & partners",
    text: "Samarbetspartners, leverantörer och uppdrag",
    href: "/admin/partners",
    icon: BriefcaseBusiness,
  },
  {
    title: "Användare & behörigheter",
    text: "Lägg till agent, förare, partner eller admin",
    href: "/admin/users",
    icon: UsersRound,
  },
  {
    title: "Notiser",
    text: "Adminnotiser och viktiga händelser",
    href: "/admin/notifications",
    icon: BellRing,
  },
  {
    title: "Min profil",
    text: "Dina uppgifter och konto",
    href: "/admin/profile",
    icon: UserRound,
  },
  {
    title: "Byt roll",
    text: "Växla mellan admin, bokningsagent och förare",
    href: "/role-select",
    icon: ShieldCheck,
  },
];

export default function AdminMoreScreen() {
  async function signOut() {
    Alert.alert("Logga ut", "Vill du logga ut från adminappen?", [
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
        <Pressable
          testID="adminOffersQuickButton"
          onPress={() => router.push("/admin/offers" as any)}
          style={{
            backgroundColor: colors.card,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            marginBottom: 14,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 17,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <FileText size={23} color={colors.primary} strokeWidth={2.5} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
              Offerter
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                lineHeight: 17,
                fontWeight: "700",
                marginTop: 3,
              }}
            >
              Se inkomna offerter, öppna kalkyl och skicka prisförslag
            </Text>
          </View>

          <Text style={{ color: colors.textMuted, fontSize: 24, fontWeight: "900" }}>
            ›
          </Text>
        </Pressable>

        <View style={styles.heroCard}>
          <ShieldCheck size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>ADMIN</Text>
          <Text style={styles.heroTitle}>Mer</Text>
          <Text style={styles.heroText}>
            Inställningar, verktyg och viktiga funktioner för Helsingbuss admin.
          </Text>
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Pressable
                key={item.href}
                style={styles.menuRow}
                onPress={() => router.push(item.href as any)}
              >
                <View style={styles.menuIcon}>
                  <Icon size={22} color={colors.primary} strokeWidth={2.5} />
                </View>

                <View style={styles.menuTextBox}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuText}>{item.text}</Text>
                </View>

                <ChevronRight size={19} color={colors.textMuted} strokeWidth={2.5} />
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.logoutCard} onPress={signOut}>
          <View style={styles.logoutIcon}>
            <LogOut size={22} color="#B42318" strokeWidth={2.5} />
          </View>

          <View style={styles.menuTextBox}>
            <Text style={styles.logoutTitle}>Logga ut</Text>
            <Text style={styles.logoutText}>
              Avsluta adminkontot och gå tillbaka till inloggningen.
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
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 15,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        {icon}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "900" }}>
          {title}
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 12,
            lineHeight: 17,
            fontWeight: "700",
            marginTop: 3,
          }}
        >
          {text}
        </Text>
      </View>

      <Text style={{ color: colors.textMuted, fontSize: 24, fontWeight: "900" }}>
        ›
      </Text>
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
          <MenuCard
            title="Offerter"
            text="Se inkomna offerter, öppna kalkyl och skicka prisförslag"
            icon={<FileText size={22} color={colors.primary} strokeWidth={2.5} />}
            onPress={() => router.push("/admin/offers" as any)}
          />



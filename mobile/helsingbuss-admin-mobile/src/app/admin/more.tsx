import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  } from "react-native";
import { router,
  router } from "expo-router";
import {
  BellRing,
  BriefcaseBusiness,
  Bus,
  CalendarDays,
  FileText,
  Handshake,
  LayoutDashboard,
  QrCode,
  Route,
  Store,
  UsersRound,
  LogOut,
  UserRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import { supabase } from "../../lib/supabase";

type MenuItem = {
  title: string;
  text: string;
  href: string;
  icon: any;
};

const sections: { title: string; items: MenuItem[] }[] = [
  {
    title: "Översikt",
    items: [
      {
        title: "Dashboard",
        text: "Översikt och nyckeltal",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Bokningar",
        text: "Bokningslista och detaljer",
        href: "/admin/bookings",
        icon: CalendarDays,
      },
    ],
  },
  {
    title: "Verksamhet",
    items: [
      {
        title: "Offerter",
        text: "Inkommande, aktiva och godkända",
        href: "/admin/offers",
        icon: BriefcaseBusiness,
      },
      {
        title: "Fordon & Personal",
        text: "Fordon, chaufförer och fordonsdokument",
        href: "/admin/fleet",
        icon: Bus,
      },
      {
        title: "Dokument",
        text: "Avtal, tillstånd och interna underlag",
        href: "/admin/documents",
        icon: FileText,
      },
      {
        title: "Operatörer & partners",
        text: "Samarbetspartners och leverantörer",
        href: "/admin/partners",
        icon: Handshake,
      },
    ],
  },
  {
    title: "Kunder & drift",
    items: [
      {
        title: "Kunder",
        text: "CRM och kundregister",
        href: "/admin/crm",
        icon: UsersRound,
      },
      {
        title: "Kassa",
        text: "Betalningslänkar och försäljning",
        href: "/admin/store",
        icon: Store,
      },
      {
        title: "Scanner",
        text: "QR och biljettkontroll",
        href: "/admin/scanner",
        icon: QrCode,
      },
      {
        title: "Trafik",
        text: "Trafikinfo och drift",
        href: "/admin/traffic",
        icon: Route,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        title: "Notiser",
        text: "Pushnotiser och meddelanden",
        href: "/admin/notifications",
        icon: BellRing,
      },
    ],
  },
];

export default function MoreScreen() {
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/" as any);
  }
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>MER</Text>
          <Text style={styles.heroTitle}>Admin & drift</Text>
          <Text style={styles.heroText}>
            Här hittar du fler delar av Helsingbuss adminapp.
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>

            <View style={styles.grid}>
              {section.items.map((item) => {
                const Icon = item.icon;

                return (
                  <Pressable
                    key={item.title}
                    style={styles.card}
                    onPress={() => router.push(item.href as any)}
                  >
                    <View style={styles.iconBox}>
                      <Icon size={22} color={colors.primary} strokeWidth={2.4} />
                    </View>

                    <View style={styles.cardTextBox}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.cardText}>{item.text}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <View style={styles.logoutIconBox}>
            <LogOut size={22} color={colors.danger} strokeWidth={2.5} />
          </View>

          <View style={styles.cardTextBox}>
            <Text style={styles.logoutTitle}>Logga ut</Text>
            <Text style={styles.logoutText}>Avsluta sessionen och gå tillbaka till inloggning.</Text>
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
          onPress={() => router.push("/admin/profile" as any)}
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
      </ScrollView>
    </View>
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
    paddingBottom: 110,
  },
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  grid: {
    gap: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
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
  cardTextBox: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  logoutButton: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  logoutIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  logoutTitle: {
    color: colors.danger,
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

  cardText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3,
  },
});



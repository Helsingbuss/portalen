import React from "react";
import { Alert, Pressable, Text, View, StyleSheet } from "react-native";
import { Bus, FileText, MapPin, Store } from "lucide-react-native";
import { router } from "expo-router";
import { colors } from "../../theme/colors";

const actions = [
  {
    title: "Skapa offert",
    icon: FileText,
    onPress: () =>
      Alert.alert("Skapa offert", "Här kopplar vi snart formulär för att skapa offert i appen."),
  },
  {
    title: "Ny bokning",
    icon: Bus,
    onPress: () => router.push("/admin/bookings?filter=bookings"),
  },
  {
    title: "Butik/Kassa",
    icon: Store,
    onPress: () => router.push("/admin/store"),
  },
  {
    title: "Se trafik",
    icon: MapPin,
    onPress: () => router.push("/admin/traffic"),
  },
];

export default function QuickActions() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Snabbval</Text>

      <View style={styles.grid}>
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Pressable key={action.title} style={styles.card} onPress={action.onPress}>
              <View style={styles.iconBox}>
                <Icon size={21} color={colors.primary} strokeWidth={2.4} />
              </View>
              <Text style={styles.text}>{action.title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  text: {
    color: colors.text,
    fontSize: 10.5,
    fontWeight: "900",
    textAlign: "center",
  },
});

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Bell, Menu } from "lucide-react-native";
import { colors } from "../../theme/colors";

type Props = {
  title?: string;
  subtitle?: string;
  onMenuPress?: () => void;
  onBellPress?: () => void;
};

export default function DashboardHeader({
  title = "Dashboard",
  subtitle = "Översikt",
  onMenuPress,
  onBellPress,
}: Props) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.iconButton} onPress={onMenuPress}>
        <Menu size={23} color={colors.text} strokeWidth={2.3} />
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <Pressable style={styles.iconButton} onPress={onBellPress}>
        <Bell size={22} color={colors.text} strokeWidth={2.3} />
        <View style={styles.badge} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  center: {
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
});

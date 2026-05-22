import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Menu, Plus } from "lucide-react-native";
import { colors } from "../../theme/colors";

type Props = {
  onCreate?: () => void;
};

export default function BookingsHeader({ onCreate }: Props) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.iconButton}>
        <Menu size={23} color={colors.text} strokeWidth={2.3} />
      </Pressable>

      <View style={styles.titleBox}>
        <Text style={styles.title}>Bokningar</Text>
      </View>

      <Pressable style={styles.addButton} onPress={onCreate}>
        <Plus size={24} color={colors.white} strokeWidth={2.7} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
  },
  titleBox: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
});

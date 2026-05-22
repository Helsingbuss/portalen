import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ListFilter, Search } from "lucide-react-native";
import { colors } from "../../theme/colors";
import type { BookingFilterKey } from "../../types/bookings";

const filters: { key: BookingFilterKey; label: string }[] = [
  { key: "all", label: "Alla" },
  { key: "offers", label: "Offerter" },
  { key: "bookings", label: "Bokningar" },
  { key: "shuttle", label: "Flygbuss" },
  { key: "trips", label: "Resor" },
  { key: "tickets", label: "Biljetter" },
  { key: "today", label: "Idag" },
  { key: "waiting", label: "Väntar svar" },
  { key: "archive", label: "Arkiv" },
];

type Props = {
  activeFilter: BookingFilterKey;
  searchQuery: string;
  onFilterChange: (filter: BookingFilterKey) => void;
  onSearchChange: (value: string) => void;
};

export default function BookingSearchFilters({
  activeFilter,
  searchQuery,
  onFilterChange,
  onSearchChange,
}: Props) {
  return (
    <View>
      <View style={styles.searchBox}>
        <Search size={18} color={colors.textMuted} strokeWidth={2.4} />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Sök bokning, biljett, kund eller referens..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCorrect={false}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {filters.map((filter) => {
          const active = activeFilter === filter.key;

          return (
            <Pressable
              key={filter.key}
              style={[styles.filterPill, active && styles.filterPillActive]}
              onPress={() => onFilterChange(filter.key)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable style={styles.listButton}>
          <ListFilter size={18} color={colors.text} strokeWidth={2.5} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  input: {
    flex: 1,
    marginLeft: 9,
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  filters: {
    gap: 8,
    paddingTop: 13,
    paddingBottom: 10,
  },
  filterPill: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  filterTextActive: {
    color: colors.white,
  },
  listButton: {
    width: 40,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});

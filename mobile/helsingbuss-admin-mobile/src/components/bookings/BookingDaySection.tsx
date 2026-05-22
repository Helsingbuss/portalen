import React from "react";
import { StyleSheet, Text, View } from "react-native";
import BookingCard from "./BookingCard";
import { colors } from "../../theme/colors";
import type { AdminBookingFeedItem } from "../../types/bookings";

type Props = {
  title: string;
  items: AdminBookingFeedItem[];
};

export default function BookingDaySection({ title, items }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {items.map((item) => (
        <BookingCard key={`${item.kind}-${item.id}`} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 9,
    marginTop: 4,
  },
});

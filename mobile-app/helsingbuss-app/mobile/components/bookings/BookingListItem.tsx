import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { Booking } from "@/mobile/types/dashboard";

export function BookingListItem({ booking, onPress }: { booking: Booking; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{booking.bookingNumber}</Text>
        <Text style={styles.meta}>{booking.customerName ?? ""}</Text>
        <Text style={styles.meta}>{booking.from}  {booking.to}</Text>
        <Text style={styles.meta}>
          {booking.date}{booking.time ? `  ${booking.time}` : ""}{booking.passengers ? `  ${booking.passengers} pax` : ""}
        </Text>
      </View>
      <Text style={styles.chev}></Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  title: { color: "white", fontWeight: "900" },
  meta: { color: "rgba(255,255,255,0.70)", marginTop: 2, fontSize: 12 },
  chev: { color: "rgba(255,255,255,0.55)", fontSize: 20, fontWeight: "900" },
});

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { Offer } from "@/mobile/types/offers";

const CARD = "rgba(255,255,255,0.06)";
const BORDER = "rgba(255,255,255,0.10)";
const ACCENT = "#1A545F";

export function OfferListItem({ offer, onPress }: { offer: Offer; onPress: () => void }) {
  const isNew = offer.status === "inkommen" || offer.status === "ny";

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.no}>{offer.offer_number}</Text>
        <Text style={styles.sub}>{offer.from}  {offer.to}</Text>
        <Text style={styles.meta}>
          {(offer.departure_date ?? "-")}  {(offer.departure_time ?? "--:--")}   {(offer.passengers ?? 0)} pax
        </Text>
      </View>

      {isNew ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>NY</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: "rgba(0,0,0,0.12)",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  no: { color: "white", fontSize: 18, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.80)", marginTop: 4 },
  meta: { color: "rgba(255,255,255,0.60)", marginTop: 2 },
  badge: { backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { color: "white", fontWeight: "900" },
});

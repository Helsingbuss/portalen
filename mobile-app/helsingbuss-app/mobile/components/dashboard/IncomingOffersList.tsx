import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { Offer } from "@/mobile/types/dashboard";
import { Card } from "@/mobile/components/ui/Card";

export function IncomingOffersList({
  offers,
  onPressOffer,
}: {
  offers: Offer[];
  onPressOffer?: (offer: Offer) => void;
}) {
  return (
    <Card>
      <Text style={styles.title}>Inkomna offerter</Text>

      {offers.length === 0 ? (
        <Text style={styles.empty}>Inga inkomna offerter </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {offers.map((o) => (
            <Pressable key={o.id} onPress={() => onPressOffer?.(o)} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerNo}>{o.offerNumber}</Text>
                <Text style={styles.meta}>{o.from}  {o.to}</Text>
                <Text style={styles.meta}>
                  {o.date}{o.time ? `  ${o.time}` : ""}{o.passengers ? `  ${o.passengers} pax` : ""}
                </Text>
              </View>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>NY</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { color: "white", fontWeight: "900", fontSize: 16, marginBottom: 10 },
  empty: { color: "rgba(255,255,255,0.65)" },
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  offerNo: { color: "white", fontWeight: "900" },
  meta: { color: "rgba(255,255,255,0.70)", marginTop: 2, fontSize: 12 },
  badge: { backgroundColor: "rgba(26,84,95,0.55)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: "white", fontWeight: "900", fontSize: 12 },
});

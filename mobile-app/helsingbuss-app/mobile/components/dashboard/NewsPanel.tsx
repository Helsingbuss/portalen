import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { NewsItem } from "@/mobile/types/dashboard";
import { Card } from "@/mobile/components/ui/Card";

export function NewsPanel({ name, news }: { name: string; news: NewsItem[] }) {
  return (
    <Card>
      <Text style={styles.title}>God dag, {name}!</Text>
      <Text style={styles.subtitle}>Här bjuder vi på lite nyheter och roligheter.</Text>

      <View style={{ gap: 10, marginTop: 10 }}>
        {news.slice(0, 4).map((n) => (
          <Pressable key={n.id} style={styles.item}>
            <Text style={styles.itemText}>{n.title}</Text>
            <Text style={styles.chev}></Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.more}>
        <Text style={styles.moreText}>Visa alla nyheter</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { color: "white", fontWeight: "900", fontSize: 16 },
  subtitle: { color: "rgba(255,255,255,0.70)", marginTop: 6 },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  itemText: { color: "rgba(255,255,255,0.85)", fontWeight: "700", flex: 1, paddingRight: 10 },
  chev: { color: "rgba(255,255,255,0.55)", fontSize: 18, fontWeight: "900" },
  more: { marginTop: 14, backgroundColor: "rgba(255,255,255,0.07)", paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  moreText: { color: "rgba(255,255,255,0.85)", fontWeight: "800" },
});

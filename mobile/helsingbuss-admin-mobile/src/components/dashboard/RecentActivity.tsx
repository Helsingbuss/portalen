import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CircleCheck, Clock3, FileText, TicketCheck } from "lucide-react-native";
import { colors } from "../../theme/colors";
import type { RecentActivityItem } from "../../types/dashboard";

type Props = {
  data: RecentActivityItem[];
};

function getIcon(type: string) {
  if (type === "booking") return CircleCheck;
  if (type === "offer") return FileText;
  if (type === "ticket") return TicketCheck;
  return Clock3;
}

export default function RecentActivity({ data }: Props) {
  const hasData = data.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Senaste händelser</Text>
        <Text style={styles.link}>Visa alla</Text>
      </View>

      {!hasData ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Inga händelser ännu</Text>
          <Text style={styles.emptyText}>
            När nya bokningar, offerter eller biljetter kommer in visas de här.
          </Text>
        </View>
      ) : (
        data.map((item, index) => {
          const Icon = getIcon(item.type);

          return (
            <View key={`${item.type}-${item.reference}-${index}`} style={styles.row}>
              <View style={styles.iconBox}>
                <Icon size={18} color={colors.primary} strokeWidth={2.3} />
              </View>

              <View style={styles.content}>
                <Text style={styles.itemTitle}>
                  {item.reference ? `${item.title} · ${item.reference}` : item.title}
                </Text>
                <Text style={styles.itemText} numberOfLines={2}>
                  {item.customer || item.description || "Ny händelse i portalen"}
                </Text>
              </View>

              <Text style={styles.time}>{item.time || ""}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  link: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F0ECE4",
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  itemText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  time: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 8,
  },
  emptyBox: {
    backgroundColor: colors.cardSoft,
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    marginTop: 4,
  },
});

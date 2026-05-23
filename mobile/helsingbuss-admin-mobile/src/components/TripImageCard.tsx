import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CalendarDays, Image as ImageIcon, MapPin, Route } from "lucide-react-native";

import { colors } from "../theme/colors";

type Props = {
  title: string;
  lineName?: string;
  dateTime?: string;
  routeText?: string;
  imageUrl?: string | null;
  selected?: boolean;
  badge?: string;
  onPress?: () => void;
};

export default function TripImageCard({
  title,
  lineName,
  dateTime,
  routeText,
  imageUrl,
  selected = false,
  badge,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={styles.textBox}>
        {!!badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}

        <Text numberOfLines={2} style={styles.title}>
          {title}
        </Text>

        {!!lineName ? (
          <View style={styles.metaRow}>
            <Route size={14} color={colors.primary} strokeWidth={2.5} />
            <Text numberOfLines={1} style={styles.metaText}>
              {lineName}
            </Text>
          </View>
        ) : null}

        {!!dateTime ? (
          <View style={styles.metaRow}>
            <CalendarDays size={14} color={colors.primary} strokeWidth={2.5} />
            <Text numberOfLines={1} style={styles.metaText}>
              {dateTime}
            </Text>
          </View>
        ) : null}

        {!!routeText ? (
          <View style={styles.routeRow}>
            <MapPin size={14} color={colors.textMuted} strokeWidth={2.4} />
            <Text numberOfLines={2} style={styles.routeText}>
              {routeText}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.imageBox}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <ImageIcon size={26} color={colors.primary} strokeWidth={2.2} />
            <Text style={styles.imageFallbackText}>Resebild</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    gap: 12,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  textBox: {
    flex: 1,
    minHeight: 102,
    justifyContent: "center",
  },
  imageBox: {
    width: 112,
    height: 102,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
  },
  imageFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  imageFallbackText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 5,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF0D5",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 7,
  },
  badgeText: {
    color: "#B76E00",
    fontSize: 10.5,
    fontWeight: "900",
  },
  title: {
    color: colors.text,
    fontSize: 15.5,
    lineHeight: 20,
    fontWeight: "900",
    marginBottom: 7,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  metaText: {
    flex: 1,
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 6,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
  },
  routeText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "700",
    marginLeft: 6,
  },
});

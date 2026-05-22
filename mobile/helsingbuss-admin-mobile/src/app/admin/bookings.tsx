import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import BookingsHeader from "../../components/bookings/BookingsHeader";
import BookingSearchFilters from "../../components/bookings/BookingSearchFilters";
import BookingDaySection from "../../components/bookings/BookingDaySection";
import { colors } from "../../theme/colors";
import { getAdminBookingFeed } from "../../services/bookingService";
import type {
  AdminBookingFeedItem,
  BookingFilterKey,
  BookingGroup,
} from "../../types/bookings";

const filterKeys: BookingFilterKey[] = [
  "all",
  "bookings",
  "offers",
  "shuttle",
  "trips",
  "tickets",
  "today",
  "waiting",
  "archive",
];

function normalizeFilter(value: unknown): BookingFilterKey {
  const text = Array.isArray(value) ? value[0] : value;

  if (typeof text === "string" && filterKeys.includes(text as BookingFilterKey)) {
    return text as BookingFilterKey;
  }

  return "all";
}

function getDateLabel(date: string) {
  if (!date) return "Datum saknas";

  const today = new Date();
  const parsed = new Date(`${date}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  const todayKey = today.toISOString().slice(0, 10);
  const parsedKey = parsed.toISOString().slice(0, 10);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowKey = tomorrow.toISOString().slice(0, 10);

  const weekday = new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
  }).format(parsed);

  const dayMonth = new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long",
  }).format(parsed);

  if (parsedKey === todayKey) return `Idag – ${weekday} ${dayMonth}`;
  if (parsedKey === tomorrowKey) return `Imorgon – ${weekday} ${dayMonth}`;

  return `${weekday} ${dayMonth}`;
}

function groupBookings(items: AdminBookingFeedItem[]): BookingGroup[] {
  const map = new Map<string, AdminBookingFeedItem[]>();

  items.forEach((item) => {
    const label = getDateLabel(item.date);
    const existing = map.get(label) || [];
    existing.push(item);
    map.set(label, existing);
  });

  return Array.from(map.entries()).map(([title, groupItems]) => ({
    title,
    items: groupItems,
  }));
}

export default function BookingsScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const [activeFilter, setActiveFilter] = useState<BookingFilterKey>(
    normalizeFilter(params.filter)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<AdminBookingFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState("");

  const groups = useMemo(() => groupBookings(items), [items]);

  useEffect(() => {
    setActiveFilter(normalizeFilter(params.filter));
  }, [params.filter]);

  const loadBookings = useCallback(
    async (refreshing = false) => {
      try {
        setErrorText("");

        if (refreshing) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const data = await getAdminBookingFeed(activeFilter, searchQuery);
        setItems(data);
      } catch (error) {
        console.log("Booking load error:", error);
        setErrorText("Kunde inte hämta bokningar, offerter, avgångar och biljetter just nu.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeFilter, searchQuery]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadBookings(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [loadBookings]);

  function handleCreate() {
    Alert.alert(
      "Ny bokning",
      "Här kopplar vi snart knapp för att skapa bokning/offert direkt i appen."
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadBookings(true)}
            tintColor={colors.primary}
          />
        }
      >
        <BookingsHeader onCreate={handleCreate} />

        <BookingSearchFilters
          activeFilter={activeFilter}
          searchQuery={searchQuery}
          onFilterChange={setActiveFilter}
          onSearchChange={setSearchQuery}
        />

        {errorText ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Kunde inte uppdatera listan</Text>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar ärenden...</Text>
          </View>
        ) : null}

        {!isLoading && groups.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Inget hittades</Text>
            <Text style={styles.emptyText}>
              Testa att byta filter eller söka på kund, referens, resa eller destination.
            </Text>
          </View>
        ) : null}

        {groups.map((group) => (
          <BookingDaySection
            key={group.title}
            title={group.title}
            items={group.items}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  loadingBox: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 10,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F4B8B1",
    padding: 14,
    marginTop: 8,
    marginBottom: 10,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "900",
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginTop: 12,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 5,
  },
});

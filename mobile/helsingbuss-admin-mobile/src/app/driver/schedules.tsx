import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  BusFront,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ClipboardList,
  MapPin,
  RefreshCw,
  Route,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  formatScheduleDate,
  getMyDriverSchedule,
  getScheduleTypeLabel,
  type DriverScheduleItem,
} from "../../services/driverScheduleService";

type RangeFilter = 1 | 7 | 30 | 60;

export default function DriverSchedulesScreen() {
  const [items, setItems] = useState<DriverScheduleItem[]>([]);
  const [range, setRange] = useState<RangeFilter>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSchedule = useCallback(
    async (refreshing = false) => {
      try {
        if (refreshing) setIsRefreshing(true);
        else setIsLoading(true);

        const result = await getMyDriverSchedule(range);
        setItems(result);
      } catch (error: any) {
        Alert.alert("Kunde inte hämta schema", error?.message || "Försök igen.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [range]
  );

  useEffect(() => {
    loadSchedule(false);
  }, [loadSchedule]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return {
      total: items.length,
      today: items.filter((item) => item.scheduleDate === today).length,
      driving: items.filter((item) =>
        ["driving", "sundra", "flygbuss"].includes(item.scheduleType)
      ).length,
    };
  }, [items]);

  const nextItem = useMemo(() => {
    return items[0] || null;
  }, [items]);

  const grouped = useMemo(() => {
    const map = new Map<string, DriverScheduleItem[]>();

    items.forEach((item) => {
      const key = item.scheduleDate || "okänt";
      const current = map.get(key) || [];
      current.push(item);
      map.set(key, current);
    });

    return Array.from(map.entries());
  }, [items]);

  function changeRange(nextRange: RangeFilter) {
    setRange(nextRange);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadSchedule(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>

          <Text style={styles.topTitle}>Mina scheman</Text>

          <Pressable style={styles.iconButton} onPress={() => loadSchedule(true)}>
            <RefreshCw size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <CalendarDays size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>FÖRARAPP</Text>
          <Text style={styles.heroTitle}>Mina scheman</Text>
          <Text style={styles.heroText}>
            Se dina kommande arbetspass, körningar och uppdrag.
          </Text>
        </View>

        <View style={styles.filterCard}>
          <RangeButton title="Idag" active={range === 1} onPress={() => changeRange(1)} />
          <RangeButton title="7 dagar" active={range === 7} onPress={() => changeRange(7)} />
          <RangeButton title="30 dagar" active={range === 30} onPress={() => changeRange(30)} />
          <RangeButton title="60 dagar" active={range === 60} onPress={() => changeRange(60)} />
        </View>

        <View style={styles.statsGrid}>
          <StatCard title="Totalt" value={String(stats.total)} />
          <StatCard title="Idag" value={String(stats.today)} />
          <StatCard title="Körningar" value={String(stats.driving)} />
        </View>

        {nextItem ? (
          <View style={styles.nextCard}>
            <View style={styles.nextIcon}>
              <Clock3 size={22} color={colors.primary} strokeWidth={2.5} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.nextKicker}>Nästa pass</Text>
              <Text style={styles.nextTitle} numberOfLines={2}>
                {nextItem.title}
              </Text>
              <Text style={styles.nextText}>
                {nextItem.scheduleDate} · {nextItem.startTime || "--:--"}
                {nextItem.endTime ? `–${nextItem.endTime}` : ""}
              </Text>
            </View>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar schema...</Text>
          </View>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <View style={styles.emptyCard}>
            <ClipboardList size={32} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.emptyTitle}>Inget schema hittades</Text>
            <Text style={styles.emptyText}>
              När trafikledningen schemalägger dig visas dina pass här.
            </Text>
          </View>
        ) : null}

        {grouped.map(([date, dayItems]) => (
          <View key={date} style={styles.dayBlock}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{formatScheduleDate(date)}</Text>
              <Text style={styles.dayCount}>{dayItems.length} pass</Text>
            </View>

            {dayItems.map((item) => (
              <ScheduleCard key={item.id} item={item} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function RangeButton({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.rangeButton, active && styles.rangeButtonActive]} onPress={onPress}>
      <Text style={[styles.rangeButtonText, active && styles.rangeButtonTextActive]}>
        {title}
      </Text>
    </Pressable>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

function ScheduleCard({ item }: { item: DriverScheduleItem }) {
  const typeLabel = getScheduleTypeLabel(item.scheduleType);
  const timeText =
    item.startTime || item.endTime
      ? `${item.startTime || "--:--"} – ${item.endTime || "--:--"}`
      : "Tid ej angiven";

  const isSundra = item.scheduleType === "sundra";
  const isFlygbuss = item.scheduleType === "flygbuss";
  const isCompleted = item.status === "completed";

  function openOrder() {
    if (!item.driverOrderId) return;

    router.push({
      pathname: "/driver/order-detail",
      params: { id: item.driverOrderId },
    } as any);
  }

  return (
    <Pressable
      style={styles.scheduleCard}
      onPress={item.canOpenOrder ? openOrder : undefined}
    >
      <View style={styles.cardTop}>
        <View
          style={[
            styles.typePill,
            isSundra && styles.typePillSundra,
            isFlygbuss && styles.typePillFlygbuss,
          ]}
        >
          <Text
            style={[
              styles.typePillText,
              isSundra && styles.typePillTextSundra,
              isFlygbuss && styles.typePillTextFlygbuss,
            ]}
          >
            {typeLabel}
          </Text>
        </View>

        <View style={styles.statusBox}>
          {isCompleted ? (
            <CheckCircle2 size={14} color="#1F7A4D" strokeWidth={2.5} />
          ) : null}
          <Text style={[styles.statusText, isCompleted && styles.statusTextDone]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.titleRow}>
        <View style={styles.mainIcon}>
          {isSundra || isFlygbuss ? (
            <Route size={22} color={colors.primary} strokeWidth={2.5} />
          ) : (
            <BusFront size={22} color={colors.primary} strokeWidth={2.5} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardSubTitle} numberOfLines={1}>
            {item.sourceType || item.scheduleType || "schema"}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Clock3 size={15} color={colors.primary} strokeWidth={2.5} />
        <Text style={styles.infoText}>{timeText}</Text>
      </View>

      {!!item.location ? (
        <View style={styles.infoRow}>
          <MapPin size={15} color={colors.primary} strokeWidth={2.5} />
          <Text style={styles.infoText} numberOfLines={2}>
            {item.location}
          </Text>
        </View>
      ) : null}

      {!!item.notes ? (
        <Text numberOfLines={3} style={styles.notesText}>
          {item.notes}
        </Text>
      ) : null}

      {item.canOpenOrder ? (
        <View style={styles.openRow}>
          <Text style={styles.openText}>Öppna körorder</Text>
          <ChevronRight size={18} color={colors.primary} strokeWidth={2.5} />
        </View>
      ) : null}
    </Pressable>
  );
}

function getStatusLabel(status: string) {
  if (status === "request") return "Förfrågan";
  if (status === "planned") return "Planerad";
  if (status === "confirmed") return "Bekräftad";
  if (status === "started") return "Påbörjad";
  if (status === "completed") return "Slutförd";
  if (status === "cancelled") return "Avbruten";

  return status || "Planerad";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
  },
  heroKicker: {
    color: colors.goldSoft,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 5,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "900",
  },
  heroText: {
    color: "#DDEBE8",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 7,
  },

  filterCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  rangeButton: {
    flex: 1,
    borderRadius: 16,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeButtonActive: {
    backgroundColor: colors.primary,
  },
  rangeButtonText: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: "900",
  },
  rangeButtonTextActive: {
    color: colors.white,
  },

  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
  },
  statValue: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: "900",
  },
  statTitle: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: "900",
    marginTop: 3,
  },

  nextCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  nextIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  nextKicker: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  nextTitle: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: "900",
    marginTop: 2,
  },
  nextText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },

  loadingCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 10,
  },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: "center",
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },

  dayBlock: { marginBottom: 14 },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dayTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  dayCount: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
  },

  scheduleCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  typePill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typePillSundra: {
    backgroundColor: "#FFF0D5",
  },
  typePillFlygbuss: {
    backgroundColor: "#E0F2FE",
  },
  typePillText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  typePillTextSundra: {
    color: "#B76E00",
  },
  typePillTextFlygbuss: {
    color: "#0369A1",
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 4,
  },
  statusTextDone: {
    color: "#1F7A4D",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },
  mainIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15.5,
    lineHeight: 20,
    fontWeight: "900",
  },
  cardSubTitle: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 2,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  infoText: {
    flex: 1,
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "800",
    marginLeft: 7,
  },
  notesText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 8,
  },
  openRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 12,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  openText: {
    color: colors.primary,
    fontSize: 12.5,
    fontWeight: "900",
    marginRight: 3,
  },
});

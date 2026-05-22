import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  MapPin,
  Save,
  ShoppingBag,
  Ticket,
  UsersRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import { createAndSendPaymentLink } from "../../services/storeService";
import {
  createAgentRealSundraBooking,
  formatSundraMoney,
  getAgentSundraDepartures,
  getAgentSundraPickupPlaces,
  getAgentSundraSeats,
  getAgentSundraTrips,
  type AgentSundraDeparture,
  type AgentSundraPickupPlace,
  type AgentSundraSeat,
  type AgentSundraTrip,
} from "../../services/agentSundraRealService";

export default function AgentSundraBookingScreen() {
  const [trips, setTrips] = useState<AgentSundraTrip[]>([]);
  const [departures, setDepartures] = useState<AgentSundraDeparture[]>([]);
  const [pickupPlaces, setPickupPlaces] = useState<AgentSundraPickupPlace[]>([]);
  const [seats, setSeats] = useState<AgentSundraSeat[]>([]);

  const [selectedTrip, setSelectedTrip] = useState<AgentSundraTrip | null>(null);
  const [selectedDeparture, setSelectedDeparture] = useState<AgentSundraDeparture | null>(null);
  const [selectedPickup, setSelectedPickup] = useState<AgentSundraPickupPlace | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengerCount, setPassengerCount] = useState("1");

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDepartures, setIsLoadingDepartures] = useState(false);
  const [isLoadingPickup, setIsLoadingPickup] = useState(false);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const passengerNumber = Math.max(1, Number(passengerCount || 1) || 1);

  const selectedSeatObjects = useMemo(() => {
    return seats.filter((seat) => selectedSeats.includes(seat.seatLabel));
  }, [seats, selectedSeats]);

  const ticketTotalPrice = useMemo(() => {
    return passengerNumber * Number(selectedDeparture?.price || 0);
  }, [passengerNumber, selectedDeparture?.price]);

  const seatSelectionPrice = useMemo(() => {
    return selectedSeatObjects.reduce((sum, seat) => sum + Number(seat.seatPrice || 0), 0);
  }, [selectedSeatObjects]);

  const totalPrice = useMemo(() => {
    return ticketTotalPrice + seatSelectionPrice;
  }, [ticketTotalPrice, seatSelectionPrice]);

  const loadTrips = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await getAgentSundraTrips();
      setTrips(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTrips(false);
  }, [loadTrips]);

  async function chooseTrip(trip: AgentSundraTrip) {
    setSelectedTrip(trip);
    setSelectedDeparture(null);
    setSelectedPickup(null);
    setSelectedSeats([]);
    setSeats([]);
    setPickupPlaces([]);
    setDepartures([]);

    try {
      setIsLoadingDepartures(true);
      const result = await getAgentSundraDepartures(trip.id);
      setDepartures(result);
    } finally {
      setIsLoadingDepartures(false);
    }
  }

  async function chooseDeparture(departure: AgentSundraDeparture) {
    setSelectedDeparture(departure);
    setSelectedPickup(null);
    setSelectedSeats([]);
    setSeats([]);
    setPickupPlaces([]);

    try {
      setIsLoadingPickup(true);
      setIsLoadingSeats(true);

      const [pickupResult, seatResult] = await Promise.all([
        getAgentSundraPickupPlaces(selectedTrip?.id || departure.tripId, departure.id),
        getAgentSundraSeats(departure.id),
      ]);

      if (pickupResult.length > 0) {
        setPickupPlaces(pickupResult);
        setSelectedPickup(pickupResult[0]);
      } else if (departure.departurePlace) {
        const fallbackPickup = {
          id: "fallback",
          label: departure.departurePlace,
          address: "",
          time: departure.departureTime,
          raw: {},
        };

        setPickupPlaces([fallbackPickup]);
        setSelectedPickup(fallbackPickup);
      }

      setSeats(seatResult.seats);
    } finally {
      setIsLoadingPickup(false);
      setIsLoadingSeats(false);
    }
  }

  function toggleSeat(seat: AgentSundraSeat) {
    if (seat.isOccupied) return;

    setSelectedSeats((current) => {
      if (current.includes(seat.seatLabel)) {
        return current.filter((item) => item !== seat.seatLabel);
      }

      if (current.length >= passengerNumber) {
        Alert.alert("För många platser", "Du kan inte välja fler platser än antal resenärer.");
        return current;
      }

      return [...current, seat.seatLabel];
    });
  }

  async function saveBooking() {
    if (!selectedTrip || !selectedDeparture) {
      Alert.alert("Saknar resa", "Välj resa och avgång först.");
      return;
    }

    if (!selectedPickup) {
      Alert.alert("Välj upphämtningsplats", "Välj var kunden ska kliva på.");
      return;
    }

    if (!customerName.trim()) {
      Alert.alert("Kund saknas", "Fyll i kundnamn.");
      return;
    }

    try {
      setIsSaving(true);

      const bookingResult = await createAgentRealSundraBooking({
        tripId: selectedTrip.id,
        departureId: selectedDeparture.id,
        tripTitle: selectedTrip.title,
        departurePlace: selectedPickup.label,
        pickupPlace: selectedPickup.label,
        travelDate: selectedDeparture.departureDate,
        travelTime: selectedPickup.time || selectedDeparture.departureTime,
        customerName,
        customerEmail,
        customerPhone,
        seatNumbers: selectedSeats,
        passengers: passengerNumber,
        pricePerPerson: Number(selectedDeparture.price || 0),
        ticketTotalPrice,
        seatSelectionPrice,
        totalPrice,
      });

      const paymentTitle = `Sundra resa - ${selectedTrip.title}`;
      const paymentMessage =
        `Hej ${customerName}! Här kommer din betalningslänk för ${selectedTrip.title}.\n\n` +
        `Upphämtning: ${selectedPickup.label}\n` +
        `Datum: ${selectedDeparture.departureDate}\n` +
        `Resenärer: ${passengerNumber}\n` +
        `Belopp: ${formatSundraMoney(totalPrice)}`;

      const paymentResult = await createAndSendPaymentLink({
        title: paymentTitle,
        productTitle: paymentTitle,
        customerName,
        customerEmail,
        customerPhone,
        amount: totalPrice,
        totalAmount: totalPrice,
        currency: "SEK",
        message: paymentMessage,
        sendEmail: Boolean(customerEmail),
        sendSms: Boolean(customerPhone),
        sourceType: "agent_sundra_booking",
        sourceId: bookingResult.bookingId,
        businessUnit: "sundra",
      } as any);

      Alert.alert(
        "Sundra bokad",
        `Bokningen är skapad och betalningslänk är framtagen.\n\nTotalpris: ${formatSundraMoney(totalPrice)}`,
        [
          {
            text: "Öppna betalning",
            onPress: () => {
              if (paymentResult?.paymentUrl) {
                Linking.openURL(paymentResult.paymentUrl);
              }
            },
          },
          {
            text: "Stäng",
            style: "cancel",
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Kunde inte boka", error?.message || "Försök igen.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadTrips(true)}
            tintColor={colors.primary}
          />
        }
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>

        <View style={styles.heroCard}>
          <ShoppingBag size={38} color={colors.goldSoft} />
          <Text style={styles.heroTitle}>Boka Sundra-resa</Text>
          <Text style={styles.heroText}>
            Välj resa, avgång, upphämtningsplats och platser.
          </Text>
        </View>

        {isLoading ? <LoadingCard text="Hämtar resor..." /> : null}

        <Section title="1. Välj resa">
          {trips.length === 0 ? (
            <Text style={styles.emptyText}>Inga Sundra-resor hittades i sundra_trips.</Text>
          ) : (
            trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                active={selectedTrip?.id === trip.id}
                onPress={() => chooseTrip(trip)}
              />
            ))
          )}
        </Section>

        {selectedTrip ? (
          <Section title="2. Välj avgång">
            {isLoadingDepartures ? (
              <LoadingCard text="Hämtar avgångar..." />
            ) : departures.length === 0 ? (
              <Text style={styles.emptyText}>Inga avgångar hittades för denna resa.</Text>
            ) : (
              departures.map((departure) => (
                <Pressable
                  key={departure.id}
                  style={[
                    styles.selectCard,
                    selectedDeparture?.id === departure.id && styles.selectCardActive,
                  ]}
                  onPress={() => chooseDeparture(departure)}
                >
                  <View style={styles.selectIcon}>
                    <CalendarDays size={20} color={colors.primary} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectTitle}>
                      {departure.departureDate || "Datum saknas"}
                      {departure.departureTime ? ` kl. ${departure.departureTime}` : ""}
                    </Text>
                    <Text style={styles.selectText}>
                      {departure.departurePlace || "Avreseplats saknas"} · {formatSundraMoney(departure.price)}
                    </Text>
                  </View>

                  {selectedDeparture?.id === departure.id ? <Check size={20} color={colors.primary} /> : null}
                </Pressable>
              ))
            )}
          </Section>
        ) : null}

        {selectedDeparture ? (
          <Section title="3. Välj upphämtningsplats">
            {isLoadingPickup ? (
              <LoadingCard text="Hämtar upphämtningsplatser..." />
            ) : pickupPlaces.length === 0 ? (
              <Text style={styles.emptyText}>Inga upphämtningsplatser hittades.</Text>
            ) : (
              pickupPlaces.map((pickup) => (
                <Pressable
                  key={pickup.id || pickup.label}
                  style={[
                    styles.pickupCard,
                    selectedPickup?.label === pickup.label && styles.pickupCardActive,
                  ]}
                  onPress={() => setSelectedPickup(pickup)}
                >
                  <View style={styles.pickupIcon}>
                    <MapPin size={20} color={colors.primary} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickupTitle}>{pickup.label}</Text>
                    <Text style={styles.pickupText}>
                      {[pickup.time, pickup.address].filter(Boolean).join(" · ") || "Upphämtningsplats"}
                    </Text>
                  </View>

                  {selectedPickup?.label === pickup.label ? <Check size={20} color={colors.primary} /> : null}
                </Pressable>
              ))
            )}
          </Section>
        ) : null}

        {selectedDeparture ? (
          <Section title="4. Antal resenärer & platstillval">
            {isLoadingSeats ? (
              <LoadingCard text="Hämtar platser..." />
            ) : (
              <>
                <View style={styles.seatSummary}>
                  <Text style={styles.seatSummaryTitle}>Antal resenärer</Text>
                  <TextInput
                    value={passengerCount}
                    onChangeText={(value) => {
                      setPassengerCount(value);
                      const nextCount = Math.max(1, Number(value || 1) || 1);
                      setSelectedSeats((current) => current.slice(0, nextCount));
                    }}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    style={styles.passengerInput}
                  />

                  <Text style={styles.seatSummaryTitle}>Platsval är tillval</Text>
                  <Text style={styles.seatSummaryText}>
                    Valda platser: {selectedSeats.join(", ") || "inga"} · Tillval: {formatSundraMoney(seatSelectionPrice)}
                  </Text>
                  <Text style={styles.seatSummaryText}>
                    Biljetter: {passengerNumber} × {formatSundraMoney(selectedDeparture.price)} = {formatSundraMoney(ticketTotalPrice)}
                  </Text>
                </View>

                <SeatMap
                  seats={seats}
                  selectedSeats={selectedSeats}
                  onToggleSeat={toggleSeat}
                />

                <View style={styles.legendRow}>
                  <Legend label="Ledig" color={colors.background} />
                  <Legend label="Vald" color={colors.primary} />
                  <Legend label="Upptagen" color="#FEE4E2" />
                </View>
              </>
            )}
          </Section>
        ) : null}

        {selectedDeparture && selectedPickup ? (
          <Section title="5. Kunduppgifter">
            <Field label="Kundnamn" value={customerName} onChangeText={setCustomerName} placeholder="Kundnamn" />
            <Field label="E-post" value={customerEmail} onChangeText={setCustomerEmail} placeholder="kund@mail.se" />
            <Field label="Telefon" value={customerPhone} onChangeText={setCustomerPhone} placeholder="070..." />

            <View style={styles.priceBox}>
              <Ticket size={22} color={colors.goldSoft} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.priceTitle}>Sammanfattning</Text>
                <Text style={styles.priceText}>
                  {selectedPickup?.label || "Upphämtning saknas"} · {passengerNumber} resenär(er)
                </Text>
                <Text style={styles.priceText}>{selectedSeats.length > 0 ? "Platstillval: " + selectedSeats.join(", ") : "Inget platsval valt"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.priceMini}>Biljetter {formatSundraMoney(ticketTotalPrice)}</Text>
                <Text style={styles.priceMini}>Platsval {formatSundraMoney(seatSelectionPrice)}</Text>
                <Text style={styles.priceValue}>{formatSundraMoney(totalPrice)}</Text>
              </View>
            </View>

            <Pressable
              style={[styles.primaryButton, isSaving && styles.disabled]}
              onPress={saveBooking}
              disabled={isSaving}
            >
              {isSaving ? <ActivityIndicator color={colors.white} /> : <Save size={20} color={colors.white} />}
              <Text style={styles.primaryButtonText}>Skapa bokning</Text>
            </Pressable>
          </Section>        ) : null}
      </ScrollView>
    </View>
  );
}

function TripCard({
  trip,
  active,
  onPress,
}: {
  trip: AgentSundraTrip;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tripCard, active && styles.tripCardActive]} onPress={onPress}>
      {trip.imageUrl ? (
        <Image source={{ uri: trip.imageUrl }} style={styles.tripImage} />
      ) : (
        <View style={styles.tripImageFallback}>
          <ShoppingBag size={28} color={colors.primary} />
        </View>
      )}

      <View style={styles.tripTextBox}>
        <Text style={styles.tripTitle} numberOfLines={1}>{trip.title}</Text>
        {trip.description ? (
          <Text style={styles.tripText} numberOfLines={2}>{trip.description}</Text>
        ) : (
          <Text style={styles.tripText} numberOfLines={1}>Tryck för att välja avgång</Text>
        )}
      </View>

      {active ? <Check size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}


function SeatMap({
  seats,
  selectedSeats,
  onToggleSeat,
}: {
  seats: AgentSundraSeat[];
  selectedSeats: string[];
  onToggleSeat: (seat: AgentSundraSeat) => void;
}) {
  const seatByLabel = useMemo(() => {
    const map = new Map<string, AgentSundraSeat>();

    for (const seat of seats) {
      map.set(seat.seatLabel, seat);
    }

    return map;
  }, [seats]);

  const topGroups = [
    [["D15"], ["D16"]],
    [["D14"], ["C14"]],
    [["D13"], ["C13"]],
    [["D12"], ["C12"]],
    [["D11"], ["C11"]],
    [["D10"], ["C10"]],
    [["D9"], ["C9"]],
    [["D8"], ["C8"]],
    [["D7"], ["C7"]],
    [["D6"], ["C6"]],
    [["D5"], ["C5"]],
    [["D4"], ["C4"]],
    [["D3"], ["C3"]],
    [["D2"], ["C2"]],
    [["D1"], ["C1"]],
  ];

  const lowerLeftGroups = [
    [["D17"], ["D18"]],
    [["B12"], ["A12"]],
    [["B11"], ["A11"]],
    [["B10"], ["A10"]],
    [["B9"], ["A9"]],
    [["B8"], ["A8"]],
    [["B7"], ["A7"]],
  ];

  const lowerRightGroups = [
    [["B6"], ["A6"]],
    [["B5"], ["A5"]],
    [["B4"], ["A4"]],
    [["B3"], ["A3"]],
    [["B2"], ["A2"]],
    [["B1"], ["A1"]],
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.portalBus}>
        <View style={styles.windowRow}>
          {[0, 1, 2, 3].map((item) => (
            <View key={item} style={styles.windowLine} />
          ))}
        </View>

        <View style={styles.portalTopRow}>
          {topGroups.map((group, index) => (
            <SeatStack
              key={"top-" + index}
              group={group}
              seatByLabel={seatByLabel}
              selectedSeats={selectedSeats}
              onToggleSeat={onToggleSeat}
            />
          ))}

          <View style={styles.frontArea}>
            <View style={styles.frontBox} />
            <View style={styles.steeringWheel}>
              <Text style={styles.steeringText}>○</Text>
            </View>
          </View>
        </View>

        <View style={styles.portalMiddleSpace} />

        <View style={styles.portalBottomRow}>
          <View style={styles.bottomGroup}>
            {lowerLeftGroups.map((group, index) => (
              <SeatStack
                key={"left-" + index}
                group={group}
                seatByLabel={seatByLabel}
                selectedSeats={selectedSeats}
                onToggleSeat={onToggleSeat}
              />
            ))}
          </View>

          <DoorBlock />

          <View style={styles.bottomGroup}>
            {lowerRightGroups.map((group, index) => (
              <SeatStack
                key={"right-" + index}
                group={group}
                seatByLabel={seatByLabel}
                selectedSeats={selectedSeats}
                onToggleSeat={onToggleSeat}
              />
            ))}
          </View>

          <DoorBlock />
        </View>

        <View style={styles.windowRowBottom}>
          {[0, 1, 2, 3].map((item) => (
            <View key={item} style={styles.windowLine} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function SeatStack({
  group,
  seatByLabel,
  selectedSeats,
  onToggleSeat,
}: {
  group: string[][];
  seatByLabel: Map<string, AgentSundraSeat>;
  selectedSeats: string[];
  onToggleSeat: (seat: AgentSundraSeat) => void;
}) {
  return (
    <View style={styles.seatStack}>
      {group.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.stackRow}>
          {row.map((label) => {
            const seat = seatByLabel.get(label);

            if (!seat) {
              return <View key={label} style={styles.portalSeatEmpty} />;
            }

            return (
              <SeatButton
                key={label}
                seat={seat}
                selectedSeats={selectedSeats}
                onToggleSeat={onToggleSeat}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function DoorBlock() {
  return (
    <View style={styles.doorBlock}>
      <View style={styles.doorLineBold} />
      <View>
        <View style={styles.doorLine} />
        <View style={styles.doorLine} />
        <View style={styles.doorLine} />
      </View>
    </View>
  );
}

function SeatButton({
  seat,
  selectedSeats,
  onToggleSeat,
}: {
  seat: AgentSundraSeat;
  selectedSeats: string[];
  onToggleSeat: (seat: AgentSundraSeat) => void;
}) {
  const selected = selectedSeats.includes(seat.seatLabel);

  return (
    <Pressable
      style={[
        styles.portalSeat,
        seat.isOccupied && styles.portalSeatOccupied,
        selected && styles.portalSeatSelected,
        seat.seatPrice >= 40 && !selected && !seat.isOccupied && styles.portalSeatPremium,
        seat.seatPrice >= 30 && seat.seatPrice < 40 && !selected && !seat.isOccupied && styles.portalSeatPlus,
      ]}
      onPress={() => onToggleSeat(seat)}
      disabled={seat.isOccupied}
    >
      {seat.seatPrice > 0 ? (
        <View style={[
          styles.portalSeatBadge,
          seat.seatPrice >= 40 && styles.portalSeatBadgePremium,
          seat.seatPrice >= 30 && seat.seatPrice < 40 && styles.portalSeatBadgePlus,
        ]}>
          <Text style={styles.portalSeatBadgeText}>+{seat.seatPrice}</Text>
        </View>
      ) : null}

      <Text
        style={[
          styles.portalSeatText,
          seat.isOccupied && styles.portalSeatTextOccupied,
          selected && styles.portalSeatTextSelected,
        ]}
      >
        {seat.seatLabel}
      </Text>
    </Pressable>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function LoadingCard({ text }: { text: string }) {
  return (
    <View style={styles.loadingCard}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.loadingText}>{text}</Text>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder }: any) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoCapitalize="none"
      />
    </>
  );
}

const styles = StyleSheet.create({

  portalBus: {
    minWidth: 1120,
    backgroundColor: "#FBFAF6",
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#6B7175",
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 24,
    overflow: "hidden",
  },
  windowRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 210,
    marginBottom: 12,
  },
  windowRowBottom: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 210,
    marginTop: 14,
  },
  windowLine: {
    width: 70,
    height: 8,
    borderRadius: 99,
    backgroundColor: "#9AA1AA",
  },
  portalTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  portalMiddleSpace: {
    height: 70,
  },
  portalBottomRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bottomGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  seatStack: {
    width: 64,
    alignItems: "center",
    marginRight: 6,
  },
  stackRow: {
    minHeight: 51,
    justifyContent: "center",
    alignItems: "center",
  },
  portalSeat: {
    width: 45,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.4,
    borderColor: "#F2A400",
    backgroundColor: "#FFF4C6",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginVertical: 3,
  },
  portalSeatPlus: {
    borderColor: "#F2A400",
    backgroundColor: "#FFF1BC",
  },
  portalSeatPremium: {
    borderColor: "#F0A100",
    backgroundColor: "#FFEFB3",
  },
  portalSeatSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  portalSeatOccupied: {
    backgroundColor: "#F3F4F6",
    borderColor: "#CDD3DA",
  },
  portalSeatEmpty: {
    width: 45,
    height: 42,
    marginVertical: 3,
  },
  portalSeatText: {
    color: "#0F172A",
    fontSize: 10.5,
    fontWeight: "900",
  },
  portalSeatTextSelected: {
    color: "#FFFFFF",
  },
  portalSeatTextOccupied: {
    color: "#8A94A3",
  },
  portalSeatBadge: {
    position: "absolute",
    top: -8,
    right: -7,
    backgroundColor: "#E63E58",
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 25,
    alignItems: "center",
  },
  portalSeatBadgePlus: {
    backgroundColor: "#E63E58",
  },
  portalSeatBadgePremium: {
    backgroundColor: "#D9324C",
  },
  portalSeatBadgeText: {
    color: "#FFFFFF",
    fontSize: 7.5,
    fontWeight: "900",
  },
  frontArea: {
    width: 110,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginLeft: 16,
    paddingTop: 28,
  },
  frontBox: {
    width: 38,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#F5F7FA",
    borderWidth: 1,
    borderColor: "#D8DEE6",
    marginRight: 16,
  },
  steeringWheel: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: "#69717C",
    alignItems: "center",
    justifyContent: "center",
  },
  steeringText: {
    color: "#69717C",
    fontSize: 22,
    fontWeight: "900",
  },
  doorBlock: {
    width: 78,
    height: 82,
    borderRadius: 8,
    backgroundColor: "#DADADA",
    marginHorizontal: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  doorLineBold: {
    width: 4,
    height: 52,
    backgroundColor: "#0B0F12",
    marginRight: 7,
  },
  doorLine: {
    width: 34,
    height: 2,
    backgroundColor: "#9AA4B2",
    marginVertical: 5,
  },

  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 20,
    marginBottom: 18,
  },
  heroTitle: { color: colors.white, fontSize: 25, fontWeight: "900", marginTop: 12 },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 6 },

  section: { marginBottom: 16 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
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
  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: "800", marginLeft: 10 },
  emptyText: { color: colors.textMuted, fontSize: 12, fontWeight: "800", lineHeight: 18 },

  tripCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  tripCardActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  tripImage: {
    width: 68,
    height: 58,
    borderRadius: 15,
    marginRight: 11,
    backgroundColor: colors.primarySoft,
  },
  tripImageFallback: {
    width: 68,
    height: 58,
    borderRadius: 15,
    marginRight: 11,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  tripTextBox: { flex: 1 },
  tripTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  tripText: { color: colors.textMuted, fontSize: 11.5, lineHeight: 16, fontWeight: "700", marginTop: 3 },

  selectCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },
  selectCardActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  selectIcon: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  selectTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  selectText: { color: colors.textMuted, fontSize: 11.5, fontWeight: "700", marginTop: 3 },

  pickupCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },
  pickupCardActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  pickupIcon: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  pickupTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  pickupText: { color: colors.textMuted, fontSize: 11.5, fontWeight: "700", marginTop: 3 },

  seatSummary: {
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  seatSummaryTitle: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  seatSummaryText: { color: colors.text, fontSize: 12, fontWeight: "800", marginTop: 3 },
  passengerInput: {
    minHeight: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 13,
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 12,
  },

  busMap: {
    backgroundColor: "#F7F5EF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  busFront: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  busFrontText: { color: colors.goldSoft, fontSize: 11, fontWeight: "900" },
  driverBox: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 7,
  },
  driverText: { color: colors.white, fontSize: 11, fontWeight: "900" },
  seatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  aisle: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  rowNumber: { color: colors.textMuted, fontSize: 10, fontWeight: "900" },
  seat: {
    width: 43,
    height: 37,
    borderRadius: 13,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 3,
  },
  seatEmpty: {
    width: 43,
    height: 37,
    marginHorizontal: 3,
  },
  seatSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  seatAddon: { borderColor: colors.goldSoft, borderWidth: 1.5 },
  seatOccupied: { backgroundColor: "#FEE4E2", borderColor: "#F3B4B4" },
  seatText: { color: colors.text, fontSize: 11, fontWeight: "900" },
  seatTextSelected: { color: colors.white },
  seatTextOccupied: { color: "#B42318" },
  seatPrice: { color: colors.primary, fontSize: 8.5, fontWeight: "900", marginTop: -2 },

  legendRow: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 5,
  },
  legendLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },

  label: { color: colors.text, fontSize: 12, fontWeight: "900", marginBottom: 7, marginTop: 6 },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 13,
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },

  priceBox: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  priceTitle: { color: colors.goldSoft, fontSize: 12, fontWeight: "900" },
  priceText: { color: "#DDEBE8", fontSize: 12, fontWeight: "700", marginTop: 2 },
  priceMini: { color: "#DDEBE8", fontSize: 10.5, fontWeight: "800" },
  priceValue: { color: colors.white, fontSize: 18, fontWeight: "900", marginTop: 2 },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900", marginLeft: 8 },
  disabled: { opacity: 0.65 },
});


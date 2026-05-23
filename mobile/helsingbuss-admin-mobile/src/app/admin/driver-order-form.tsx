import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
  CheckCircle2,
  ClipboardList,
  FileText,
  MapPin,
  Route,
  Save,
  Search,
  UserRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  createAdminDriverOrder,
  getAdminDriverOrderSources,
  getAdminDrivers,
  type AdminDriver,
  type AdminDriverOrderSource,
} from "../../services/adminDriverOrdersService";

type SourceFilter = "manual" | "offer" | "booking" | "sundra";

function normalizeDriverDate(value: string) {
  const clean = String(value || "").trim();
  if (!clean) return "";

  const match = clean.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : clean.split(" ")[0].split("T")[0];
}

function normalizeDriverTime(value: string) {
  const clean = String(value || "").trim();
  if (!clean) return "";

  const match = clean.match(/(\d{1,2}):(\d{2})/);
  if (!match) return "";

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function getFirstPickupStop(source: AdminDriverOrderSource | null) {
  if (!source) return "";

  if (source.pickupStops && source.pickupStops.length > 0) {
    return source.pickupStops[0];
  }

  return source.pickupPlace || "";
}

function getAllPickupStopsText(source: AdminDriverOrderSource | null) {
  if (!source) return "";

  if (source.pickupStops && source.pickupStops.length > 0) {
    return source.pickupStops.join("\n");
  }

  return source.pickupPlace || "";
}

export default function AdminDriverOrderFormScreen() {
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [sources, setSources] = useState<AdminDriverOrderSource[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<AdminDriver | null>(null);
  const [selectedSource, setSelectedSource] = useState<AdminDriverOrderSource | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("manual");

  const [title, setTitle] = useState("Beställningstrafik");
  const [customerName, setCustomerName] = useState("");
  const [vehicleLabel, setVehicleLabel] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [pickupPlace, setPickupPlace] = useState("");
  const [destination, setDestination] = useState("");
  const [passengerCount, setPassengerCount] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [pickupStops, setPickupStops] = useState("");
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [driversResult, sourcesResult] = await Promise.all([
        getAdminDrivers(),
        getAdminDriverOrderSources(),
      ]);

      setDrivers(driversResult);
      setSources(sourcesResult);

      if (driversResult.length === 1) {
        setSelectedDriver(driversResult[0]);
      }
    } catch (error: any) {
      Alert.alert("Kunde inte hämta data", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSources = useMemo(() => {
    return sources.filter((item) => item.sourceType === sourceFilter);
  }, [sources, sourceFilter]);

  function chooseManual() {
    setSourceFilter("manual");
    setSelectedSource(null);

    setTitle("Beställningstrafik");
    setCustomerName("");
    setTravelDate("");
    setStartTime("");
    setEndTime("");
    setPickupPlace("");
    setDestination("");
    setPassengerCount("");
    setContactName("");
    setContactPhone("");
    setPickupStops("");
    setInstructions("");
    setNotes("");
  }

  function applySource(source: AdminDriverOrderSource) {
    setSelectedSource(source);

    const finalPickupPlace = getFirstPickupStop(source);
    const finalPickupStopsText = getAllPickupStopsText(source);

    if (source.sourceType === "sundra") {
      Alert.alert(
        "Sundra vald",
        `Linje: ${source.lineName || "-"}\nDatum: ${source.departureDisplay || "-"}\nFörsta hållplats: ${finalPickupPlace || "-"}`
      );

      setTitle(source.title || "Sundra Resor");
      setCustomerName("Sundra Resor");
    } else if (source.sourceType === "offer") {
      setTitle("Körorder från offert");
      setCustomerName(source.customerName);
    } else {
      setTitle("Körorder från bokning");
      setCustomerName(source.customerName);
    }

    setTravelDate(normalizeDriverDate(source.travelDate || source.departureDisplay));
    setStartTime(normalizeDriverTime(source.startTime || source.departureDisplay));
    setEndTime(normalizeDriverTime(source.endTime));
    setPickupPlace(finalPickupPlace);
    setDestination(source.destination || source.title || "Sundra Resor");
    setPassengerCount(String(source.passengerCount || "0"));
    setContactName(source.contactName || "Trafikledning Helsingbuss");
    setContactPhone(source.contactPhone || "");
    setPickupStops(finalPickupStopsText);
    setInstructions(source.instructions || "");
    setNotes(source.notes || "");
  }

  async function saveOrder() {
    if (!selectedDriver) {
      Alert.alert("Välj förare", "Du behöver välja vilken förare som ska få körordern.");
      return;
    }

    const isSundra = selectedSource?.sourceType === "sundra";

    const finalTitle =
      title.trim() ||
      selectedSource?.title ||
      (isSundra ? "Sundra Resor" : "Körorder");

    const finalTravelDate = normalizeDriverDate(
      travelDate || selectedSource?.travelDate || selectedSource?.departureDisplay || ""
    );

    const finalStartTime = normalizeDriverTime(
      startTime || selectedSource?.startTime || selectedSource?.departureDisplay || ""
    );

    const finalEndTime = normalizeDriverTime(
      endTime || selectedSource?.endTime || ""
    );

    const finalPickupPlace =
      pickupPlace.trim() ||
      getFirstPickupStop(selectedSource) ||
      (isSundra ? "Se hållplatser" : "");

    const finalPickupStopsText =
      pickupStops.trim() ||
      getAllPickupStopsText(selectedSource);

    const finalPickupStopList = finalPickupStopsText
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    const finalDestination =
      destination.trim() ||
      selectedSource?.destination ||
      selectedSource?.title ||
      (isSundra ? "Sundra Resor" : "");

    const finalCustomerName =
      customerName.trim() ||
      selectedSource?.customerName ||
      (isSundra ? "Sundra Resor" : "");

    const finalPassengerCount = Number(
      passengerCount || selectedSource?.passengerCount || 0
    );

    const finalContactName =
      contactName.trim() ||
      selectedSource?.contactName ||
      "Trafikledning Helsingbuss";

    const finalContactPhone =
      contactPhone.trim() ||
      selectedSource?.contactPhone ||
      "";

    const finalInstructions =
      instructions.trim() ||
      selectedSource?.instructions ||
      "";

    const finalNotes =
      notes.trim() ||
      selectedSource?.notes ||
      "";

    if (!isSundra && (!finalTitle || !finalTravelDate || !finalStartTime || !finalPickupPlace || !finalDestination)) {
      Alert.alert(
        "Uppgifter saknas",
        "Fyll i titel, datum, starttid, upphämtningsplats och destination."
      );
      return;
    }

    if (isSundra && (!selectedSource?.sourceId || !finalTravelDate || !finalStartTime)) {
      Alert.alert(
        "Sundra-avgång saknas",
        "Välj Sundra-avgången igen. Systemet behöver avgång och linje för att skapa körordern."
      );
      return;
    }

    try {
      setIsSaving(true);

      await createAdminDriverOrder({
        driverUserId: selectedDriver.userId,
        driverEmail: selectedDriver.email,
        title: finalTitle,
        customerName: finalCustomerName,
        vehicleLabel: vehicleLabel.trim(),
        travelDate: finalTravelDate,
        startTime: finalStartTime,
        endTime: finalEndTime,
        pickupPlace: finalPickupPlace,
        destination: finalDestination,
        passengerCount: finalPassengerCount,
        contactName: finalContactName,
        contactPhone: finalContactPhone,
        pickupStops: finalPickupStopList,
        instructions: finalInstructions,
        notes: finalNotes,
        sourceType: selectedSource?.sourceType || "charter",
        sourceId: selectedSource?.sourceId || "",
      });

      Alert.alert(
        "Körorder skapad",
        isSundra
          ? "Sundra-körordern har skickats till föraren."
          : "Körordern har skickats till föraren som en förfrågan.",
        [
          {
            text: "Till listan",
            onPress: () => router.replace("/admin/driver-orders" as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Kunde inte skapa körorder", error?.message || "Försök igen.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>

          <Text style={styles.topTitle}>Skapa körorder</Text>

          <View style={styles.iconButtonPlaceholder} />
        </View>

        <View style={styles.heroCard}>
          <ClipboardList size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>KÖRORDER</Text>
          <Text style={styles.heroTitle}>Ny körorder</Text>
          <Text style={styles.heroText}>
            Välj offert, bokning eller Sundra-avgång så fylls körordern i automatiskt.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Hämtar förare, offerter, bokningar och Sundra...</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Koppla till</Text>

          <View style={styles.filterRow}>
            <SourceButton title="Manuell" active={sourceFilter === "manual"} onPress={chooseManual} />
            <SourceButton title="Offert" active={sourceFilter === "offer"} onPress={() => setSourceFilter("offer")} />
            <SourceButton title="Bokning" active={sourceFilter === "booking"} onPress={() => setSourceFilter("booking")} />
            <SourceButton title="Sundra" active={sourceFilter === "sundra"} onPress={() => setSourceFilter("sundra")} />
          </View>

          {sourceFilter === "manual" ? (
            <Text style={styles.helpText}>
              Skapa körordern manuellt utan koppling till offert, bokning eller Sundra-avgång.
            </Text>
          ) : null}

          {sourceFilter !== "manual" && filteredSources.length === 0 ? (
            <View style={styles.emptySource}>
              <Search size={24} color={colors.primary} />
              <Text style={styles.emptySourceTitle}>Inga poster hittades</Text>
              <Text style={styles.emptySourceText}>
                Kontrollera att det finns data i databasen för vald typ.
              </Text>
            </View>
          ) : null}

          {sourceFilter !== "manual"
            ? filteredSources.slice(0, 30).map((source) => {
                const active =
                  selectedSource?.sourceType === source.sourceType &&
                  selectedSource?.sourceId === source.sourceId;

                return (
                  <Pressable
                    key={`${source.sourceType}-${source.sourceId}`}
                    style={[styles.sourceCard, active && styles.sourceCardActive]}
                    onPress={() => applySource(source)}
                  >
                    <View style={styles.sourceIcon}>
                      {active ? (
                        <CheckCircle2 size={22} color={colors.primary} strokeWidth={2.5} />
                      ) : (
                        <FileText size={22} color={colors.primary} strokeWidth={2.5} />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.sourceTitle}>
                        {source.sourceLabel ||
                          (source.sourceType === "offer"
                            ? "Offert"
                            : source.sourceType === "sundra"
                              ? "Sundra"
                              : "Bokning")}
                      </Text>

                      {source.sourceType === "sundra" ? (
                        <>
                          <View style={styles.sourceMetaRow}>
                            <Route size={13} color={colors.primary} strokeWidth={2.5} />
                            <Text style={styles.sourceMetaText}>
                              Linje: {source.lineName || "-"}
                            </Text>
                          </View>

                          <View style={styles.sourceMetaRow}>
                            <CalendarDays size={13} color={colors.primary} strokeWidth={2.5} />
                            <Text style={styles.sourceMetaText}>
                              Datum/tid: {source.departureDisplay || "-"}
                            </Text>
                          </View>

                          {source.pickupStops.length > 0 ? (
                            <View style={styles.sourceMetaRow}>
                              <MapPin size={13} color={colors.primary} strokeWidth={2.5} />
                              <Text style={styles.sourceMetaText} numberOfLines={3}>
                                Hållplatser: {source.pickupStops.join(" → ")}
                              </Text>
                            </View>
                          ) : null}
                        </>
                      ) : null}

                      <Text style={styles.sourceText}>
                        {source.customerName || "Kund saknas"} · {source.pickupPlace || "-"} →{" "}
                        {source.destination || "-"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Välj förare</Text>

          {drivers.length === 0 ? (
            <Text style={styles.helpText}>
              Inga förare hittades. Lägg först till användare med rollen förare.
            </Text>
          ) : null}

          {drivers.map((driver) => {
            const active = selectedDriver?.userId === driver.userId;

            return (
              <Pressable
                key={driver.userId}
                style={[styles.driverCard, active && styles.driverCardActive]}
                onPress={() => setSelectedDriver(driver)}
              >
                <View style={styles.driverIcon}>
                  {active ? (
                    <CheckCircle2 size={22} color={colors.primary} strokeWidth={2.5} />
                  ) : (
                    <UserRound size={22} color={colors.primary} strokeWidth={2.5} />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{driver.displayName || driver.email}</Text>
                  <Text style={styles.driverEmail}>{driver.email}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Körning</Text>

          {selectedSource?.sourceType === "sundra" ? (
            <View style={styles.sundraInfoCard}>
              <Text style={styles.sundraInfoTitle}>Sundra-information</Text>
              <Text style={styles.sundraInfoText}>Linje: {selectedSource.lineName || "-"}</Text>
              <Text style={styles.sundraInfoText}>Datum/tid: {selectedSource.departureDisplay || "-"}</Text>
              <Text style={styles.sundraInfoText}>
                Hållplatser:{" "}
                {selectedSource.pickupStops.length > 0 ? selectedSource.pickupStops.join(" → ") : "-"}
              </Text>
            </View>
          ) : null}

          <Field label="Titel" value={title} onChangeText={setTitle} placeholder="Ex. Bröllop Sofiero" />
          <Field label="Kund" value={customerName} onChangeText={setCustomerName} placeholder="Ex. Privatkund / Företag" />
          <Field label="Fordon" value={vehicleLabel} onChangeText={setVehicleLabel} placeholder="Ex. Mercedes-Benz Tourismo" />
          <Field label="Datum" value={travelDate} onChangeText={setTravelDate} placeholder="YYYY-MM-DD" />
          <Field label="Starttid" value={startTime} onChangeText={setStartTime} placeholder="HH:MM" />
          <Field label="Sluttid / hemkomst" value={endTime} onChangeText={setEndTime} placeholder="HH:MM" />
          <Field label="Upphämtningsplats" value={pickupPlace} onChangeText={setPickupPlace} placeholder="Ex. Helsingborg C" />
          <Field label="Destination" value={destination} onChangeText={setDestination} placeholder="Ex. Sofiero Slott" />
          <Field label="Antal passagerare" value={passengerCount} onChangeText={setPassengerCount} placeholder="Ex. 50" keyboardType="numeric" />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Kontakt & instruktioner</Text>

          <Field label="Kontaktperson" value={contactName} onChangeText={setContactName} placeholder="Namn på plats" />
          <Field label="Telefon" value={contactPhone} onChangeText={setContactPhone} placeholder="070..." keyboardType="phone-pad" />

          <Text style={styles.label}>Hållplatser / påstigningsplatser</Text>
          <TextInput
            value={pickupStops}
            onChangeText={setPickupStops}
            placeholder="En per rad eller separera med kommatecken"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.textArea]}
            multiline
          />

          <Text style={styles.label}>Instruktioner</Text>
          <TextInput
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Ex. Var på plats 15 minuter innan avgång..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.textArea]}
            multiline
          />

          <Text style={styles.label}>Noteringar</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Interna noteringar till förare"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.textArea]}
            multiline
          />
        </View>

        <Pressable
          style={[styles.primaryButton, isSaving && styles.disabled]}
          onPress={saveOrder}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Save size={20} color={colors.white} strokeWidth={2.5} />
          )}
          <Text style={styles.primaryButtonText}>Skicka körorder</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SourceButton({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.sourceButton, active && styles.sourceButtonActive]} onPress={onPress}>
      <Text style={[styles.sourceButtonText, active && styles.sourceButtonTextActive]}>
        {title}
      </Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numeric" | "phone-pad";
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        keyboardType={keyboardType || "default"}
        autoCapitalize="none"
      />
    </>
  );
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
  iconButtonPlaceholder: { width: 42, height: 42 },
  topTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },

  heroCard: { backgroundColor: colors.primary, borderRadius: 28, padding: 20, marginBottom: 14 },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginTop: 12, marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 27, lineHeight: 33, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 7 },

  loadingCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: "800", marginLeft: 10 },

  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: 12 },

  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  sourceButton: {
    minWidth: "22%",
    flexGrow: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: 10,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  sourceButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sourceButtonText: { color: colors.textMuted, fontSize: 12, fontWeight: "900" },
  sourceButtonTextActive: { color: colors.white },

  sourceCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sourceCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  sourceIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  sourceTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  sourceText: { color: colors.textMuted, fontSize: 11.5, lineHeight: 16, fontWeight: "700", marginTop: 4 },
  sourceMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  sourceMetaText: { color: colors.primary, fontSize: 11.5, lineHeight: 16, fontWeight: "900", marginLeft: 5, flex: 1 },

  emptySource: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
  },
  emptySourceTitle: { color: colors.text, fontSize: 14, fontWeight: "900", marginTop: 8 },
  emptySourceText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 4 },

  helpText: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18, fontWeight: "700" },

  driverCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  driverCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  driverIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  driverName: { color: colors.text, fontSize: 14, fontWeight: "900" },
  driverEmail: { color: colors.textMuted, fontSize: 11.5, fontWeight: "700", marginTop: 2 },

  sundraInfoCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 13,
    marginBottom: 12,
  },
  sundraInfoTitle: { color: colors.primary, fontSize: 14, fontWeight: "900", marginBottom: 5 },
  sundraInfoText: { color: colors.text, fontSize: 12, lineHeight: 17, fontWeight: "800", marginTop: 2 },

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
  textArea: { minHeight: 92, paddingTop: 13, textAlignVertical: "top" },

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

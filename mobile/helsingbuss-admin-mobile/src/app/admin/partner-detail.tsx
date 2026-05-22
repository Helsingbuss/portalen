import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Bus,
  Edit3,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  StickyNote,
  UserRound,
  UsersRound,
  Wrench,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import {
  getPartnerDetail,
  getPartnerStatusLabel,
  getPartnerTypeLabel,
  getQualityLabel,
} from "../../services/partnersService";

export default function PartnerDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();

  const [partner, setPartner] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPartner = useCallback(async (refreshing = false) => {
    if (!params.id) return;

    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await getPartnerDetail(String(params.id));

      setPartner(data.partner);
      setContacts(data.contacts);
      setVehicles(data.vehicles);
      setDocuments(data.documents);
      setNotes(data.notes);
    } catch (error: any) {
      Alert.alert("Kunde inte hämta partner", error?.message || "Försök igen.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadPartner(false);
  }, [loadPartner]);

  function callPartner() {
    if (partner?.phone) Linking.openURL(`tel:${partner.phone}`);
  }

  function smsPartner() {
    if (partner?.phone) Linking.openURL(`sms:${partner.phone}`);
  }

  function emailPartner() {
    if (partner?.email) Linking.openURL(`mailto:${partner.email}`);
  }

  function openWebsite() {
    if (!partner?.website) return;

    const url = String(partner.website).startsWith("http")
      ? partner.website
      : `https://${partner.website}`;

    Linking.openURL(url);
  }

  if (isLoading && !partner) {
    return (
      <View style={styles.screen}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Hämtar operatör/partner...</Text>
        </View>
      </View>
    );
  }

  if (!partner) {
    return (
      <View style={styles.screen}>
        <View style={styles.loadingCenter}>
          <Text style={styles.emptyTitle}>Operatören hittades inte</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Gå tillbaka</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const name = partner.name || "Operatör/partner";

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadPartner(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>{name}</Text>
            <Text style={styles.subtitle}>{getPartnerTypeLabel(partner.partner_type)}</Text>
          </View>

          <Pressable
            style={styles.editIconButton}
            onPress={() =>
              router.push({
                pathname: "/admin/partner-form",
                params: {
                  id: partner.id,
                  partnerType: partner.partner_type || "operator",
                  name: partner.name || "",
                  orgNumber: partner.org_number || "",
                  contactPerson: partner.contact_person || "",
                  email: partner.email || "",
                  phone: partner.phone || "",
                  website: partner.website || "",
                  city: partner.city || "",
                  address: partner.address || "",
                  status: partner.status || "active",
                  qualityLevel: partner.quality_level || "normal",
                  notes: partner.notes || "",
                },
              } as any)
            }
          >
            <Edit3 size={20} color={colors.white} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <UsersRound size={42} color={colors.goldSoft} strokeWidth={2.4} />
          </View>

          <View style={styles.heroTextBox}>
            <Text style={styles.heroKicker}>OPERATÖR / PARTNER</Text>
            <Text style={styles.heroTitle}>{name}</Text>
            <Text style={styles.heroText}>
              {getPartnerTypeLabel(partner.partner_type)} · {getPartnerStatusLabel(partner.status)}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={styles.statusValue}>{getPartnerStatusLabel(partner.status)}</Text>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Kvalitet</Text>
            <Text style={styles.statusValue}>{getQualityLabel(partner.quality_level)}</Text>
          </View>
        </View>

        <View style={styles.actionGrid}>
          <Pressable style={[styles.actionButton, !partner.phone && styles.disabled]} onPress={callPartner} disabled={!partner.phone}>
            <Phone size={20} color={colors.primary} />
            <Text style={styles.actionText}>Ring</Text>
          </Pressable>

          <Pressable style={[styles.actionButton, !partner.phone && styles.disabled]} onPress={smsPartner} disabled={!partner.phone}>
            <MessageSquare size={20} color={colors.primary} />
            <Text style={styles.actionText}>SMS</Text>
          </Pressable>

          <Pressable style={[styles.actionButton, !partner.email && styles.disabled]} onPress={emailPartner} disabled={!partner.email}>
            <Mail size={20} color={colors.primary} />
            <Text style={styles.actionText}>E-post</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Kontaktuppgifter</Text>

        <View style={styles.card}>
          <InfoRow icon={<UserRound size={20} color={colors.primary} />} title="Kontaktperson" text={partner.contact_person || "Saknas"} />
          <InfoRow icon={<Mail size={20} color={colors.primary} />} title="E-post" text={partner.email || "Saknas"} />
          <InfoRow icon={<Phone size={20} color={colors.primary} />} title="Telefon" text={partner.phone || "Saknas"} />
          <InfoRow icon={<MapPin size={20} color={colors.primary} />} title="Ort" text={partner.city || "Saknas"} />
          <InfoRow icon={<ShieldCheck size={20} color={colors.primary} />} title="Org.nr" text={partner.org_number || "Saknas"} noBorder />
        </View>

        {partner.website ? (
          <Pressable style={styles.websiteButton} onPress={openWebsite}>
            <Text style={styles.websiteButtonText}>Öppna webbplats</Text>
          </Pressable>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fordon / kapacitet</Text>
          <Pressable
            style={styles.smallAddButton}
            onPress={() =>
              router.push({
                pathname: "/admin/partner-vehicle-form",
                params: {
                  partnerId: partner.id,
                  partnerName: partner.name || "",
                },
              } as any)
            }
          >
            <Text style={styles.smallAddButtonText}>+ Lägg till</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          {vehicles.length === 0 ? (
            <InfoRow
              icon={<Bus size={20} color={colors.primary} />}
              title="Inga fordon registrerade"
              text="När fordon kopplas till partnern visas kapacitet, platser och miljöklass här."
              noBorder
            />
          ) : (
            vehicles.map((vehicle, index) => (
              <Pressable
                key={vehicle.id}
                onPress={() =>
                  router.push({
                    pathname: "/admin/partner-vehicle-form",
                    params: {
                      id: vehicle.id,
                      partnerId: partner.id,
                      partnerName: partner.name || "",
                      vehicleName: vehicle.vehicle_name || "",
                      vehicleType: vehicle.vehicle_type || "",
                      seats: vehicle.seats ? String(vehicle.seats) : "",
                      registrationNumber: vehicle.registration_number || "",
                      euroClass: vehicle.euro_class || "",
                      status: vehicle.status || "available",
                      notes: vehicle.notes || "",
                    },
                  } as any)
                }
              >
                <InfoRow
                icon={<Bus size={20} color={colors.primary} />}
                title={vehicle.vehicle_name || "Fordon"}
                text={`${vehicle.vehicle_type || "Typ saknas"}${vehicle.seats ? ` · ${vehicle.seats} platser` : ""}${vehicle.euro_class ? ` · ${vehicle.euro_class}` : ""}`}
                noBorder={index === vehicles.length - 1}
                />
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Avtal & dokument</Text>
          <Pressable
            style={styles.smallAddButton}
            onPress={() =>
              router.push({
                pathname: "/admin/partner-document-form",
                params: {
                  partnerId: partner.id,
                  partnerName: partner.name || "",
                },
              } as any)
            }
          >
            <Text style={styles.smallAddButtonText}>+ Lägg till</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          {documents.length === 0 ? (
            <InfoRow
              icon={<FileText size={20} color={colors.primary} />}
              title="Inga dokument"
              text="Här visas avtal, tillstånd, försäkring och kvalitetsdokument."
              noBorder
            />
          ) : (
            documents.map((document, index) => (
              <Pressable
                key={document.id}
                onPress={() =>
                  router.push({
                    pathname: "/admin/partner-document-form",
                    params: {
                      id: document.id,
                      partnerId: partner.id,
                      partnerName: partner.name || "",
                      title: document.title || "",
                      documentType: document.document_type || "agreement",
                      status: document.status || "active",
                      dueDate: document.due_date || "",
                      fileUrl: document.file_url || "",
                      notes: document.notes || "",
                    },
                  } as any)
                }
              >
                <InfoRow
                icon={<FileText size={20} color={colors.primary} />}
                title={document.title || "Dokument"}
                text={`${document.document_type || "Dokument"} · ${document.status || "Okänd"}`}
                noBorder={index === documents.length - 1}
                />
              </Pressable>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Kvalitet & uppföljning</Text>

        <View style={styles.card}>
          <InfoRow
            icon={<Wrench size={20} color={colors.primary} />}
            title="Kvalitetsnivå"
            text={getQualityLabel(partner.quality_level)}
          />
          <InfoRow
            icon={<StickyNote size={20} color={colors.primary} />}
            title="Anteckningar"
            text={partner.notes || "Inga anteckningar"}
            noBorder
          />
        </View>

        <Text style={styles.sectionTitle}>Noteringar</Text>

        <View style={styles.card}>
          {notes.length === 0 ? (
            <InfoRow
              icon={<StickyNote size={20} color={colors.primary} />}
              title="Inga noteringar"
              text="Här visas interna noteringar och uppföljning."
              noBorder
            />
          ) : (
            notes.map((note, index) => (
              <InfoRow
                key={note.id}
                icon={<StickyNote size={20} color={colors.primary} />}
                title={note.title || "Notering"}
                text={note.message || ""}
                noBorder={index === notes.length - 1}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  title,
  text,
  noBorder,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  noBorder?: boolean;
}) {
  return (
    <View style={[styles.infoRow, noBorder && styles.noBorder]}>
      <View style={styles.infoIcon}>{icon}</View>

      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 110 },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: "800", marginTop: 10 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  editIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 23, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginTop: 2 },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  heroIcon: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  heroTextBox: { flex: 1 },
  heroKicker: { color: colors.goldSoft, fontSize: 11, fontWeight: "900", marginBottom: 5 },
  heroTitle: { color: colors.white, fontSize: 23, fontWeight: "900" },
  heroText: { color: "#DDEBE8", fontSize: 13, fontWeight: "800", marginTop: 4 },
  statusRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statusCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  statusLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  statusValue: { color: colors.text, fontSize: 17, fontWeight: "900", marginTop: 4 },
  actionGrid: { flexDirection: "row", gap: 10, marginBottom: 18 },
  actionButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 15,
    alignItems: "center",
  },
  disabled: { opacity: 0.45 },
  actionText: { color: colors.primary, fontSize: 12, fontWeight: "900", marginTop: 6 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAE2",
  },
  noBorder: { borderBottomWidth: 0 },
  infoIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  infoContent: { flex: 1 },
  infoTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  infoText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 3 },
  websiteButton: {
    backgroundColor: colors.gold,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 18,
  },
  websiteButtonText: { color: colors.primaryDeep, fontSize: 14, fontWeight: "900" },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 19,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "900", marginBottom: 10 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 10,
  },
  smallAddButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallAddButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },});



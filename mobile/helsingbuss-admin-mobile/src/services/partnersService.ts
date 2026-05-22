import { supabase } from "../lib/supabase";
import type { PartnersOverview } from "../types/partners";

const emptyPartners: PartnersOverview = {
  partners: [],
};

export async function getPartnersOverview(): Promise<PartnersOverview> {
  const { data, error } = await supabase.rpc("get_admin_partners_overview");

  if (error) {
    console.log("Partners overview error:", error);
    return emptyPartners;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    partners: Array.isArray(raw?.partners)
      ? raw.partners.map((item: any) => ({
          id: String(item.id || ""),
          partnerType: String(item.partnerType || "operator"),
          name: String(item.name || "Partner"),
          orgNumber: String(item.orgNumber || ""),
          contactPerson: String(item.contactPerson || ""),
          email: String(item.email || ""),
          phone: String(item.phone || ""),
          website: String(item.website || ""),
          city: String(item.city || ""),
          status: String(item.status || "active"),
          qualityLevel: String(item.qualityLevel || "normal"),
          notes: String(item.notes || ""),
          vehicleCount: Number(item.vehicleCount || 0),
          documentCount: Number(item.documentCount || 0),
          noteCount: Number(item.noteCount || 0),
          createdAt: String(item.createdAt || ""),
        }))
      : [],
  };
}

export async function getPartnerDetail(partnerId: string) {
  const { data: partner, error: partnerError } = await supabase
    .from("app_partners")
    .select("*")
    .eq("id", partnerId)
    .single();

  if (partnerError) throw new Error(partnerError.message);

  const { data: contacts, error: contactsError } = await supabase
    .from("app_partner_contacts")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (contactsError) throw new Error(contactsError.message);

  const { data: vehicles, error: vehiclesError } = await supabase
    .from("app_partner_vehicles")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (vehiclesError) throw new Error(vehiclesError.message);

  const { data: documents, error: documentsError } = await supabase
    .from("app_partner_documents")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (documentsError) throw new Error(documentsError.message);

  const { data: notes, error: notesError } = await supabase
    .from("app_partner_notes")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (notesError) throw new Error(notesError.message);

  return {
    partner,
    contacts: contacts || [],
    vehicles: vehicles || [],
    documents: documents || [],
    notes: notes || [],
  };
}

export async function savePartner(input: {
  id?: string;
  partnerType: string;
  name: string;
  orgNumber?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  address?: string;
  status?: string;
  qualityLevel?: string;
  notes?: string;
}) {
  const { data: userData } = await supabase.auth.getUser();

  const payload = {
    partner_type: input.partnerType || "operator",
    name: input.name.trim(),
    org_number: input.orgNumber?.trim() || null,
    contact_person: input.contactPerson?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    website: input.website?.trim() || null,
    city: input.city?.trim() || null,
    address: input.address?.trim() || null,
    status: input.status || "active",
    quality_level: input.qualityLevel || "normal",
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("app_partners")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from("app_partners")
    .insert({
      ...payload,
      created_by: userData.user?.id || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function addPartnerNote(input: {
  partnerId: string;
  title: string;
  message?: string;
  noteType?: string;
}) {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("app_partner_notes")
    .insert({
      partner_id: input.partnerId,
      title: input.title.trim(),
      message: input.message?.trim() || null,
      note_type: input.noteType || "note",
      created_by: userData.user?.id || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export function getPartnerTypeLabel(type: string) {
  if (type === "operator") return "Operatör";
  if (type === "hotel") return "Hotell/boende";
  if (type === "supplier") return "Leverantör";
  if (type === "restaurant") return "Restaurang";
  if (type === "ferry") return "Färja/kryssning";
  if (type === "activity") return "Aktivitet";
  return "Partner";
}

export function getPartnerStatusLabel(status: string) {
  if (status === "active") return "Aktiv";
  if (status === "pending") return "Pågående";
  if (status === "inactive") return "Inaktiv";
  return status || "Okänd";
}

export function getQualityLabel(value: string) {
  if (value === "high") return "Hög";
  if (value === "normal") return "Normal";
  if (value === "watch") return "Följ upp";
  return value || "Normal";
}

export function getFallbackPartnersOverview() {
  return emptyPartners;
}

export async function savePartnerVehicle(input: {
  id?: string;
  partnerId: string;
  vehicleName: string;
  vehicleType?: string;
  seats?: number;
  registrationNumber?: string;
  euroClass?: string;
  status?: string;
  notes?: string;
}) {
  const payload = {
    partner_id: input.partnerId,
    vehicle_name: input.vehicleName.trim(),
    vehicle_type: input.vehicleType?.trim() || null,
    seats: input.seats ? Number(input.seats) : null,
    registration_number: input.registrationNumber?.trim() || null,
    euro_class: input.euroClass?.trim() || null,
    status: input.status || "available",
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("app_partner_vehicles")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from("app_partner_vehicles")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function savePartnerDocument(input: {
  id?: string;
  partnerId: string;
  title: string;
  documentType?: string;
  status?: string;
  dueDate?: string;
  fileUrl?: string;
  notes?: string;
}) {
  const payload = {
    partner_id: input.partnerId,
    title: input.title.trim(),
    document_type: input.documentType || "agreement",
    status: input.status || "active",
    due_date: input.dueDate?.trim() || null,
    file_url: input.fileUrl?.trim() || null,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("app_partner_documents")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from("app_partner_documents")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

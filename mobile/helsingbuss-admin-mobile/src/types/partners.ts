export type PartnerType =
  | "operator"
  | "hotel"
  | "supplier"
  | "partner"
  | "restaurant"
  | "ferry"
  | "activity"
  | string;

export type PartnerItem = {
  id: string;
  partnerType: PartnerType;
  name: string;
  orgNumber?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  status: string;
  qualityLevel: string;
  notes?: string;
  vehicleCount: number;
  documentCount: number;
  noteCount: number;
  createdAt?: string;
};

export type PartnerVehicle = {
  id: string;
  partner_id: string;
  vehicle_name: string;
  vehicle_type?: string;
  seats?: number;
  registration_number?: string;
  euro_class?: string;
  notes?: string;
  status: string;
};

export type PartnerDocument = {
  id: string;
  partner_id: string;
  title: string;
  document_type: string;
  status: string;
  due_date?: string;
  file_url?: string;
  notes?: string;
};

export type PartnerNote = {
  id: string;
  partner_id: string;
  title: string;
  message?: string;
  note_type: string;
  created_at: string;
};

export type PartnersOverview = {
  partners: PartnerItem[];
};

import { supabase } from "../lib/supabase";
import type { CrmOverview } from "../types/crm";

const emptyCrm: CrmOverview = {
  customers: [],
};

export async function getCrmOverview(): Promise<CrmOverview> {
  const { data, error } = await supabase.rpc("get_admin_crm_overview");

  if (error) {
    console.log("CRM overview error:", error);
    return emptyCrm;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    customers: Array.isArray(raw?.customers)
      ? raw.customers.map((item: any) => ({
          id: String(item.id || ""),
          customerType: String(item.customerType || "private"),
          name: String(item.name || "Kund"),
          companyName: String(item.companyName || ""),
          orgNumber: String(item.orgNumber || ""),
          email: String(item.email || ""),
          phone: String(item.phone || ""),
          city: String(item.city || ""),
          status: String(item.status || "active"),
          notes: String(item.notes || ""),
          createdAt: String(item.createdAt || ""),
          logCount: Number(item.logCount || 0),
          paymentCount: Number(item.paymentCount || 0),
          pendingPayments: Number(item.pendingPayments || 0),
        }))
      : [],
  };
}

export async function getCustomerDetail(customerId: string) {
  const { data, error } = await supabase.rpc("get_admin_customer_detail", {
    p_customer_id: customerId,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.found) {
    throw new Error(raw?.error || "Kunden hittades inte.");
  }

  return {
    customer: raw.customer,
    logs: Array.isArray(raw.logs) ? raw.logs : [],
    payments: Array.isArray(raw.payments) ? raw.payments : [],
    offers: Array.isArray(raw.offers) ? raw.offers : [],
    bookings: Array.isArray(raw.bookings) ? raw.bookings : [],
  };
}

export async function saveCustomer(input: {
  id?: string;
  customerType: string;
  name: string;
  companyName?: string;
  orgNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
  status?: string;
}) {
  const { data: userData } = await supabase.auth.getUser();

  const payload = {
    customer_type: input.customerType || "private",
    name: input.name.trim(),
    company_name: input.companyName?.trim() || null,
    org_number: input.orgNumber?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    postal_code: input.postalCode?.trim() || null,
    notes: input.notes?.trim() || null,
    status: input.status || "active",
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("app_customers")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from("app_customers")
    .insert({
      ...payload,
      created_by: userData.user?.id || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function addCustomerLog(input: {
  customerId: string;
  title: string;
  message?: string;
  logType?: string;
}) {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("app_customer_logs")
    .insert({
      customer_id: input.customerId,
      log_type: input.logType || "note",
      title: input.title.trim(),
      message: input.message?.trim() || null,
      created_by: userData.user?.id || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export function getCustomerTypeLabel(type: string) {
  if (type === "company") return "Företag";
  if (type === "association") return "Förening";
  return "Privatkund";
}

export function formatCrmDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function formatCrmMoney(value?: string) {
  if (!value) return "";

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return value;

  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(numberValue);
}

export function getFallbackCrmOverview() {
  return emptyCrm;
}

import { Linking } from "react-native";
import type { DocumentPickerAsset } from "expo-document-picker";

import { supabase } from "../lib/supabase";
import type { DocumentsOverview } from "../types/documents";

const DOCUMENT_BUCKET = "admin-documents";

const emptyDocuments: DocumentsOverview = {
  summary: {
    totalCount: 0,
    agreementCount: 0,
    permitCount: 0,
    internalCount: 0,
    expiringCount: 0,
    expiredCount: 0,
  },
  documents: [],
};

function safeFileName(name: string) {
  return String(name || "dokument")
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getDocumentsOverview(): Promise<DocumentsOverview> {
  const { data, error } = await supabase.rpc("get_admin_documents_overview");

  if (error) {
    console.log("Documents overview error:", error);
    return emptyDocuments;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    summary: {
      totalCount: Number(raw?.summary?.totalCount || 0),
      agreementCount: Number(raw?.summary?.agreementCount || 0),
      permitCount: Number(raw?.summary?.permitCount || 0),
      internalCount: Number(raw?.summary?.internalCount || 0),
      expiringCount: Number(raw?.summary?.expiringCount || 0),
      expiredCount: Number(raw?.summary?.expiredCount || 0),
    },
    documents: Array.isArray(raw?.documents)
      ? raw.documents.map((item: any) => ({
          id: String(item.id || ""),
          title: String(item.title || ""),
          documentType: String(item.documentType || "internal"),
          category: String(item.category || ""),
          description: String(item.description || ""),
          status: String(item.status || "active"),
          linkedType: String(item.linkedType || ""),
          linkedId: String(item.linkedId || ""),
          validFrom: String(item.validFrom || ""),
          expiresAt: String(item.expiresAt || ""),
          fileName: String(item.fileName || ""),
          fileMimeType: String(item.fileMimeType || ""),
          fileSize: Number(item.fileSize || 0),
          storageBucket: String(item.storageBucket || DOCUMENT_BUCKET),
          storagePath: String(item.storagePath || ""),
          externalUrl: String(item.externalUrl || ""),
          isConfidential: Boolean(item.isConfidential),
          createdAt: String(item.createdAt || ""),
          updatedAt: String(item.updatedAt || ""),
        }))
      : [],
  };
}

export async function uploadAdminDocumentFile(asset: DocumentPickerAsset, folder = "general") {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id || "unknown-user";

  const fileName = safeFileName(asset.name || `dokument-${Date.now()}`);
  const storagePath = `${folder}/${userId}/${Date.now()}-${fileName}`;

  const response = await fetch(asset.uri);
  const blob = await response.blob();

  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, blob, {
      contentType: asset.mimeType || "application/octet-stream",
      upsert: false,
    });

  if (error) throw new Error(error.message);

  return {
    bucket: DOCUMENT_BUCKET,
    path: data.path,
    fileName: asset.name || fileName,
    fileMimeType: asset.mimeType || "",
    fileSize: Number(asset.size || 0),
  };
}

export async function saveDocument(input: {
  id?: string;
  title: string;
  documentType: string;
  category?: string;
  description?: string;
  status?: string;
  linkedType?: string;
  linkedId?: string;
  validFrom?: string;
  expiresAt?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSize?: number;
  storageBucket?: string;
  storagePath?: string;
  externalUrl?: string;
  isConfidential?: boolean;
}) {
  const { data: userData } = await supabase.auth.getUser();

  const payload = {
    title: input.title.trim(),
    document_type: input.documentType || "internal",
    category: input.category?.trim() || null,
    description: input.description?.trim() || null,
    status: input.status || "active",
    linked_type: input.linkedType?.trim() || null,
    linked_id: input.linkedId?.trim() || null,
    valid_from: input.validFrom?.trim() || null,
    expires_at: input.expiresAt?.trim() || null,
    file_name: input.fileName?.trim() || null,
    file_mime_type: input.fileMimeType?.trim() || null,
    file_size: Number(input.fileSize || 0),
    storage_bucket: input.storageBucket || DOCUMENT_BUCKET,
    storage_path: input.storagePath?.trim() || null,
    external_url: input.externalUrl?.trim() || null,
    is_confidential: Boolean(input.isConfidential),
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("app_documents")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from("app_documents")
    .insert({
      ...payload,
      created_by: userData.user?.id || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function openAdminDocument(input: {
  storageBucket?: string;
  storagePath?: string;
  externalUrl?: string;
}) {
  if (input.externalUrl) {
    await Linking.openURL(input.externalUrl);
    return;
  }

  if (!input.storagePath) {
    throw new Error("Dokumentet saknar fil.");
  }

  const { data, error } = await supabase.storage
    .from(input.storageBucket || DOCUMENT_BUCKET)
    .createSignedUrl(input.storagePath, 60 * 10);

  if (error) throw new Error(error.message);
  if (!data?.signedUrl) throw new Error("Kunde inte skapa länk till dokumentet.");

  await Linking.openURL(data.signedUrl);
}

export function getFallbackDocumentsOverview() {
  return emptyDocuments;
}

export function getDocumentTypeLabel(type: string) {
  const clean = String(type || "").toLowerCase();

  if (clean === "agreement") return "Avtal";
  if (clean === "permit") return "Tillstånd";
  if (clean === "internal") return "Internt underlag";
  if (clean === "vehicle") return "Fordonsdokument";
  if (clean === "operator") return "Operatörsdokument";
  if (clean === "staff") return "Personalunderlag";

  return "Övrigt";
}

export function getDocumentStatusLabel(status: string) {
  const clean = String(status || "").toLowerCase();

  if (clean === "active") return "Aktiv";
  if (clean === "draft") return "Utkast";
  if (clean === "expired") return "Utgången";
  if (clean === "archived") return "Arkiverad";

  return status || "Okänd";
}

export function formatDocumentDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

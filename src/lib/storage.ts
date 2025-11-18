// src/lib/storage.ts
import { supabase } from "@/lib/supabaseClient";

/** Ladda upp profilbild till drivers-bucket (privat). Returnerar filens path i bucketen. */
export async function uploadDriverAvatar(driverId: string, file: File) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `profiles/${driverId}/avatar.${ext}`;
  const { error } = await supabase
    .storage
    .from("drivers")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;
  return path; // spara i DB: drivers.profile_image_path
}

/** HÃ¤mta en signerad (tidsbegrÃ¤nsad) URL fÃ¶r privat bild */
export async function getDriverAvatarSignedUrl(path: string, expiresSec = 3600) {
  const { data, error } = await supabase
    .storage
    .from("drivers")
    .createSignedUrl(path, expiresSec);

  if (error) throw error;
  return data.signedUrl;
}

/** Ladda upp valfritt dokument fÃ¶r chauffÃ¶r */
export async function uploadDriverDocument(driverId: string, file: File) {
  const safeName = file.name.replace(/\s+/g, "_").toLowerCase();
  const path = `documents/${driverId}/${Date.now()}_${safeName}`;
  const { error } = await supabase
    .storage
    .from("drivers")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;
  return path; // valfritt: spara i en docs-tabell om du vill lista dem
}


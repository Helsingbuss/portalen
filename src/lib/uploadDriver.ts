// src/lib/uploadDriver.ts
import { supabase } from "@/lib/supabaseClient";

/** Enkel extension-plockare med fallback */
function getExt(file: File): string {
  const n = (file?.name || "").toLowerCase();
  const m = n.match(/\.(png|jpg|jpeg|webp|gif)$/i);
  if (m) return m[1].toLowerCase();
  if (file.type.includes("png")) return "png";
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("gif")) return "gif";
  return "jpg";
}

/**
 * Ladda upp/chansa-uppdatera chaufförs avatar till BUCKET "drivers".
 * Returnerar (path) som du patchar in i /api/drivers/[id] som avatar_url.
 */
export async function uploadDriverAvatar(driverId: string, file: File) {
  if (!driverId) throw new Error("Saknar driverId");
  if (!file) throw new Error("Ingen fil vald");

  const ext = getExt(file);
  // Fast och konsekvent plats: profiles/{driverId}/avatar.{ext}
  // Lägg till timestamp i filnamn för att undvika cache-strul vid upprepade uppladdningar.
  const fileName = `avatar_${Date.now()}.${ext}`;
  const path = `profiles/${driverId}/${fileName}`;

  // Ladda upp direkt från klienten (RLS-policy måste tillåta authenticated: INSERT)
  const { error } = await supabase
    .storage
    .from("drivers")
    .upload(path, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type || "image/jpeg",
    });

  if (error) throw error;
  return { path };
}

/** (Valfritt) Hämta en tidsbegränsad URL om du vill visa bilden från privat bucket. */
export async function getSignedAvatarUrl(path: string, seconds = 3600) {
  if (!path) return null;
  const { data, error } = await supabase
    .storage
    .from("drivers")
    .createSignedUrl(path, seconds);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

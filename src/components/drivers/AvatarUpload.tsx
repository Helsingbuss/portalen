// src/components/drivers/AvatarUpload.tsx
import { useRef, useState } from "react";
import { uploadDriverAvatar } from "@/lib/uploadDriver";

type Props = {
  driverId: string;
  className?: string;           // skicka dina befintliga button-klasser hit (så rör vi inte designen)
  disabled?: boolean;
  onUploaded?: (path: string) => void; // körs efter lyckad uppladdning
  patchAfterUpload?: boolean;   // true = PATCH:a /api/drivers/:id med avatar_url (default true)
};

export default function AvatarUpload({
  driverId,
  className,
  disabled,
  onUploaded,
  patchAfterUpload = true,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setBusy(true);
      const { path } = await uploadDriverAvatar(driverId, f);

      if (patchAfterUpload) {
        const res = await fetch(`/api/drivers/${driverId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_url: path }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `PATCH misslyckades (${res.status})`);
        }
      }

      onUploaded?.(path);
      // eslint-disable-next-line no-alert
      alert("Profilbilden är uppdaterad ✅");
    } catch (err: any) {
      // eslint-disable-next-line no-alert
      alert(err?.message || "Kunde inte ladda upp profilbild");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      {/* Dold filväljare */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onSelect}
      />
      {/* Din befintliga knapp – vi behåller text/utseende via className */}
      <button
        type="button"
        className={className}
        onClick={() => fileRef.current?.click()}
        disabled={disabled || busy}
        title={busy ? "Laddar upp…" : ""}
      >
        {busy ? "Laddar…" : "Byt profilbild"}
      </button>
    </>
  );
}

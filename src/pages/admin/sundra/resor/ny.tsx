import React, { useState } from "react";
import { useRouter } from "next/router";
import type { TripType } from "@/lib/sundra/trips/types";
import { tripRepo } from "@/lib/sundra/trips/repo.client";
import { Topbar } from "@/components/sundra/Topbar";

export default function NyResaPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<TripType>("DAY");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onCreate() {
    setErr(null);
    if (!title.trim()) {
      setErr("Skriv en titel.");
      return;
    }
    try {
      setLoading(true);
      const created = await tripRepo.createDraftTrip({ title: title.trim(), type });
      await router.push(`/admin/sundra/resor/${created.id}`);
    } catch (e: any) {
      setErr(e?.message ?? "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Topbar
        title="Ny resa"
        subtitle="Skapar ett utkast som du sen kan fylla på och publicera."
        backHref="/admin/sundra/resor"
      />

      <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <label className="block text-sm font-semibold text-gray-900">Titel</label>
          <input
            className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2"
            placeholder="T.ex. Gekås Ullared – Dagsresa"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="mt-5 block text-sm font-semibold text-gray-900">Typ</label>
          <select
            className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2"
            value={type}
            onChange={(e) => setType(e.target.value as TripType)}
          >
            <option value="DAY">Dagsresa</option>
            <option value="MULTI">Flerdagsresa</option>
            <option value="FUN">Nöjesresa</option>
          </select>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onCreate}
              disabled={loading}
              className="rounded-xl bg-[var(--hb-primary,#0B2A44)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Skapar..." : "Skapa utkast"}
            </button>

            <button
              onClick={() => router.back()}
              className="rounded-xl border bg-white px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Avbryt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



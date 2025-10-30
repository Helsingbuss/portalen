import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";

/**
 * Normaliserar (date, time) till "YYYY-MM-DD HH:mm:00+00" (UTC)
 */
const toTz = (dateIn?: any, timeIn?: any) => {
  const s = (v:any)=> typeof v==='string' ? v.trim() : '';
  let d = s(dateIn);
  let t = s(timeIn);

  // Stöd även ISO i date eller time
  const m =
    (d && d.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2}))/)) ||
    (t && t.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2}))/));

  if (m) {
    d = m[1];
    if (!t) t = `${m[2]}:${m[3]}`;
  }

  // H -> HH:00, H:mm -> HH:mm
  if (/^\d{1,2}$/.test(t)) t = t.padStart(2,'0') + ':00';
  if (/^\d{1,2}:\d{1,2}$/.test(t)) {
    const [hh,mm] = t.split(':');
    t = hh.padStart(2,'0') + ':' + mm.padStart(2,'0');
  }
  if (!t) t = '00:00';

  // Svenska punkter 08.00 -> 08:00
  t = t.replace('.', ':');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error('Bad date');
  if (!/^\d{2}:\d{2}$/.test(t)) throw new Error('Bad time');

  return `${d} ${t}:00+00`;
};

export default async function upsert(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method not allowed" });

  try {
    const {
      id, // valfritt (för uppdatering)
      start_date, start_time,
      end_date,   end_time,
      from_place, to_place,
      driver_id,  vehicle_id,
      status,     note,
    } = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) ?? {};

    // Basfält som alltid kan sparas
    const base: any = {
      from_place: from_place ?? null,
      to_place:   to_place   ?? null,
      driver_id:  driver_id  ?? null,
      vehicle_id: vehicle_id ?? null,
      status:     status     ?? "draft",
      note:       note       ?? null,
    };
    if (id) base.id = id;

    // Variant A: start_ts / end_ts om de finns i DB
    const A: any = {
      ...base,
      start_ts: toTz(start_date, start_time),
      end_ts:   toTz(end_date,   end_time),
    };

    let resp = await supabase.from("schedule").upsert(A).select("id").single();
    if (resp.error) {
      // Om kolumn saknas i schema-cachen -> gå över till variant B
      const msg = `${resp.error.message || ""}`.toLowerCase();
      const missingTsCols =
        resp.error.code === "PGRST204" ||
        msg.includes("'start_ts'") ||
        msg.includes("'end_ts'") ||
        msg.includes("schema cache");

      if (!missingTsCols) {
        // Annan typ av fel – bubbla upp
        throw resp.error;
      }

      // Variant B: splittrade datum/tid-kolumner
      const B: any = {
        ...base,
        start_date: start_date ?? null,
        start_time: start_time ?? null,
        end_date:   end_date   ?? null,
        end_time:   end_time   ?? null,
      };

      resp = await supabase.from("schedule").upsert(B).select("id").single();
      if (resp.error) throw resp.error;
    }

    return res.status(200).json({ ok: true, id: resp.data?.id ?? null });
  } catch (e:any) {
    return res.status(400).json({ ok:false, error: e?.message ?? String(e) });
  }
}



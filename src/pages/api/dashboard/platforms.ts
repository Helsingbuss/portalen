import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  try {
    const { data, error } = await supabase
      .from("platform_stats")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const latest: any = {};

    for (let row of data) {
      if (!latest[row.platform]) {
        latest[row.platform] = row;
      }
    }

    res.status(200).json(latest);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

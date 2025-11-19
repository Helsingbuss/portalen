// src/pages/api/bookings/by-number/[number].ts
import type { NextApiRequest, NextApiResponse } from "next";
import handler from "../by-number";

export const config = { runtime: "nodejs" };

export default function numberHandler(req: NextApiRequest, res: NextApiResponse) {
  // Hämta /api/bookings/by-number/:number och mappa om till ?no=number
  const raw = req.query.number;
  const n =
    typeof raw === "string" ? raw :
    Array.isArray(raw) ? raw[0] : "";

  // injicera som query-param till befintlig handler
  (req as any).query.no = n;

  // Återanvänd logiken i by-number.ts (GET/OPTIONS mm hanteras där)
  return (handler as any)(req, res);
}

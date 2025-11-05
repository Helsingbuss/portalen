// src/pages/api/public/trips.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

/* ---------- Typer ---------- */
type TripRow = {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  hero_image?: string | null;
  badge?: string | null;
  city?: string | null;
  country?: string | null;
  price_from?: number | null;
  ribbon?: string | null;
  start_date?: string | null; // kan saknas i just din DB
};

type PublicTrip = {
  id: string;
  title: string | null;
  subtitle:

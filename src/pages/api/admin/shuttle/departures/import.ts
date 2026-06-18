import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/supabaseAdmin";

const db = requireAdmin();

type ImportRow = {
  rowNumber: number;
  date: string;
  line: string;
  direction: string;
  price: number;
  capacity: number;
  stops: {
    name: string;
    time: string;
  }[];
};

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeTime(value: string) {
  const text = normalize(value);

  if (!text) return "";

  if (/^\d{1,2}:\d{2}/.test(text)) {
    const [hours, minutes] = text.split(":");
    return `${hours.padStart(2, "0")}:${minutes}`;
  }

  if (/^\d{4}$/.test(text)) {
    return `${text.slice(0, 2)}:${text.slice(2, 4)}`;
  }

  if (/^\d{3}$/.test(text)) {
    return `0${text.slice(0, 1)}:${text.slice(1, 3)}`;
  }

  return text;
}

function parseNumber(value: string, fallback: number) {
  const cleaned = normalize(value).replace(",", ".");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : fallback;
}

function splitLine(line: string) {
  return line
    .split(";")
    .map((part) => part.trim());
}

function parseImportText(text: string): ImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const header = splitLine(lines[0]);
  const dateIndex = header.findIndex((h) => h.toLowerCase() === "datum");
  const lineIndex = header.findIndex((h) => h.toLowerCase() === "linje");
  const directionIndex = header.findIndex((h) => h.toLowerCase() === "riktning");
  const priceIndex = header.findIndex((h) => h.toLowerCase() === "pris");
  const capacityIndex = header.findIndex((h) => h.toLowerCase() === "kapacitet");

  if (dateIndex === -1 || lineIndex === -1) {
    throw new Error("Rubrikerna Datum och Linje måste finnas med.");
  }

  const stopColumns = header
    .map((name, index) => ({ name, index }))
    .filter((column) => {
      const lower = column.name.toLowerCase();
      return !["datum", "linje", "riktning", "pris", "kapacitet"].includes(lower);
    });

  return lines.slice(1).map((line, index) => {
    const values = splitLine(line);

    const stops = stopColumns
      .map((column) => ({
        name: column.name,
        time: normalizeTime(values[column.index] || ""),
      }))
      .filter((stop) => stop.name && stop.time);

    return {
      rowNumber: index + 2,
      date: normalize(values[dateIndex]),
      line: normalize(values[lineIndex]),
      direction: normalize(values[directionIndex] || "outbound") || "outbound",
      price: parseNumber(values[priceIndex] || "", 0),
      capacity: parseNumber(values[capacityIndex] || "", 49),
      stops,
    };
  });
}

async function buildPreview(rows: ImportRow[]) {
  const lineCodes = Array.from(new Set(rows.map((row) => row.line).filter(Boolean)));
  const stopNames = Array.from(
    new Set(rows.flatMap((row) => row.stops.map((stop) => stop.name)).filter(Boolean))
  );

  const { data: lines, error: linesError } = await db
    .from("shuttle_lines")
    .select("id,name,code,route_id")
    .or(lineCodes.map((code) => `code.eq.${code},name.eq.${code}`).join(","));

  if (linesError) throw linesError;

  const { data: stops, error: stopsError } = await db
    .from("shuttle_stops")
    .select("id,name,city");

  if (stopsError) throw stopsError;

  const lineMap = new Map<string, any>();
  for (const line of lines || []) {
    if (line.code) lineMap.set(String(line.code), line);
    if (line.name) lineMap.set(String(line.name), line);
  }

  const stopMap = new Map<string, any>();
  for (const stop of stops || []) {
    stopMap.set(String(stop.name).toLowerCase(), stop);
  }

  const checkedRows = rows.map((row) => {
    const line = lineMap.get(row.line);
    const missingStops = row.stops
      .filter((stop) => !stopMap.get(stop.name.toLowerCase()))
      .map((stop) => stop.name);

    const errors: string[] = [];

    if (!row.date) errors.push("Datum saknas.");
    if (!row.line) errors.push("Linje saknas.");
    if (!line) errors.push(`Linjen ${row.line} hittades inte.`);
    if (row.stops.length < 2) errors.push("Minst två hållplatstider behövs.");
    if (missingStops.length > 0) {
      errors.push(`Hållplatser saknas: ${missingStops.join(", ")}`);
    }

    return {
      ...row,
      lineId: line?.id || null,
      routeId: line?.route_id || null,
      departureTime: row.stops[0]?.time || "",
      arrivalTime: row.stops[row.stops.length - 1]?.time || "",
      from: row.stops[0]?.name || "",
      to: row.stops[row.stops.length - 1]?.name || "",
      errors,
    };
  });

  return {
    rows: checkedRows,
    validCount: checkedRows.filter((row) => row.errors.length === 0).length,
    invalidCount: checkedRows.filter((row) => row.errors.length > 0).length,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const mode = normalize(req.body?.mode || "preview");
    const text = normalize(req.body?.text);

    if (!text) {
      return res.status(400).json({
        ok: false,
        message: "Ingen importtext skickades in.",
      });
    }

    const rows = parseImportText(text);
    const preview = await buildPreview(rows);

    if (mode === "preview") {
      return res.status(200).json({
        ok: true,
        mode,
        ...preview,
      });
    }

    const validRows = preview.rows.filter((row: any) => row.errors.length === 0);

    const imported: any[] = [];
    const skipped: any[] = [];

    for (const row of validRows as any[]) {
      const { data: existing, error: existingError } = await db
        .from("shuttle_departures")
        .select("id")
        .eq("line_id", row.lineId)
        .eq("departure_date", row.date)
        .eq("departure_time", row.departureTime)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing?.id) {
        skipped.push({
          rowNumber: row.rowNumber,
          reason: "Avgången finns redan.",
          date: row.date,
          line: row.line,
          departureTime: row.departureTime,
        });
        continue;
      }

      const { data: departure, error: departureError } = await db
        .from("shuttle_departures")
        .insert({
          route_id: row.routeId,
          line_id: row.lineId,
          departure_date: row.date,
          departure_time: row.departureTime,
          departure_location: row.from,
          destination_location: row.to,
          price: row.price,
          capacity: row.capacity,
          status: "open",
          direction: row.direction,
        })
        .select("id")
        .single();

      if (departureError) throw departureError;

      const { data: allStops, error: allStopsError } = await db
        .from("shuttle_stops")
        .select("id,name");

      if (allStopsError) throw allStopsError;

      const stopMap = new Map<string, any>();
      for (const stop of allStops || []) {
        stopMap.set(String(stop.name).toLowerCase(), stop);
      }

      const { data: lineStops, error: lineStopsError } = await db
        .from("shuttle_line_stops")
        .select("id,stop_id,stop_order")
        .eq("line_id", row.lineId);

      if (lineStopsError) throw lineStopsError;

      const lineStopMap = new Map<string, any>();
      for (const lineStop of lineStops || []) {
        lineStopMap.set(String(lineStop.stop_id), lineStop);
      }

      const departureStops = row.stops.map((stop: any, index: number) => {
        const foundStop = stopMap.get(stop.name.toLowerCase());
        const foundLineStop = foundStop ? lineStopMap.get(String(foundStop.id)) : null;

        return {
          departure_id: departure.id,
          stop_id: foundStop.id,
          line_stop_id: foundLineStop?.id || null,
          stop_order: index + 1,
          price: index === 0 ? row.price : 0,
          direction: row.direction,
          is_return: row.direction === "return",
        };
      });

      const { error: stopsInsertError } = await db
        .from("shuttle_departure_stops")
        .insert(departureStops);

      if (stopsInsertError) throw stopsInsertError;

      imported.push({
        rowNumber: row.rowNumber,
        departureId: departure.id,
        date: row.date,
        line: row.line,
        departureTime: row.departureTime,
        arrivalTime: row.arrivalTime,
      });
    }

    return res.status(200).json({
      ok: true,
      mode,
      importedCount: imported.length,
      skippedCount: skipped.length,
      invalidCount: preview.invalidCount,
      imported,
      skipped,
      invalidRows: preview.rows.filter((row: any) => row.errors.length > 0),
    });
  } catch (error: any) {
    console.error("Shuttle import error:", error);
    return res.status(500).json({
      ok: false,
      message: error?.message || "Kunde inte importera avgångar.",
    });
  }
}



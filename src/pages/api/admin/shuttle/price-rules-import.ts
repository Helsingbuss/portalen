import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, serviceRoleKey);

function clean(value: any) {
  return String(value || "").trim();
}

function normalizeKey(value: string) {
  return clean(value)
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(clean(value));
}

function passengerTypeKey(value: string) {
  const key = normalizeKey(value);

  if (key === "vuxen" || key === "adult") return "adult";
  if (key === "barn" || key === "child") return "child";
  if (key === "ungdom" || key === "youth") return "youth";
  if (key === "senior") return "senior";

  return key;
}

function ticketTypeKey(value: string) {
  const key = normalizeKey(value);

  if (key === "ekonomi" || key === "economy") return "economy";
  if (key === "plus") return "plus";

  return key;
}

function parsePrice(value: string) {
  const raw = clean(value);

  if (raw === "") return null;

  const numberText = raw
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");

  if (numberText === "") return null;

  const number = Number(numberText);

  return Number.isFinite(number) ? Math.round(number) : null;
}

function isHeaderRow(columns: string[]) {
  const fullLine = normalizeKey(columns.join(" "));

  return (
    fullLine.includes("giltig från") ||
    fullLine.includes("giltig fran") ||
    fullLine.includes("linje") ||
    fullLine.includes("från hållplats") ||
    fullLine.includes("fran hallplats") ||
    fullLine.includes("resenärstyp") ||
    fullLine.includes("resenarstyp") ||
    fullLine.includes("biljettyp")
  );
}

function isInfoOrSeparatorRow(line: string) {
  const value = normalizeKey(line);

  if (!value) return true;
  if (value.replace(/[-_;|.\s]/g, "") === "") return true;

  return false;
}

function parseRows(text: string) {
  const rawLines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim());

  const rows: any[] = [];
  const errors: string[] = [];
  let lastLineCode = "";

  rawLines.forEach((line, index) => {
    const rowNumber = index + 1;

    if (isInfoOrSeparatorRow(line)) return;

    let columns = line.split(";").map((column) => column.trim());

    if (isHeaderRow(columns)) return;

    let validFrom = "1900-01-01";
    let validTo = "2099-12-31";

    if (columns.length >= 8 && isDate(columns[0]) && isDate(columns[1])) {
      validFrom = clean(columns[0]);
      validTo = clean(columns[1]);
      columns = columns.slice(2);
    }

    if (columns.length >= 6) {
      if (clean(columns[0])) {
        lastLineCode = clean(columns[0]);
      } else if (lastLineCode) {
        columns[0] = lastLineCode;
      }
    }

    if (columns.length === 5 && lastLineCode) {
      columns = [lastLineCode, ...columns];
    }

    if (columns.length < 6) {
      errors.push(
        `Rad ${rowNumber}: För få kolumner. Använd: Giltig från; Giltig till; Linje; Från hållplats; Till hållplats; Resenärstyp; Biljettyp; Pris`
      );
      return;
    }

    const lineCode = clean(columns[0]);
    const fromStopName = clean(columns[1]);
    const toStopName = clean(columns[2]);
    const passengerKey = passengerTypeKey(columns[3]);
    const ticketKey = ticketTypeKey(columns[4]);
    const price = parsePrice(columns[5]);

    if (
      !validFrom ||
      !validTo ||
      !lineCode ||
      !fromStopName ||
      !toStopName ||
      !passengerKey ||
      !ticketKey ||
      price === null ||
      price < 0
    ) {
      errors.push(
        `Rad ${rowNumber}: Saknar datum, linje, hållplats, resenärstyp, biljettyp eller pris.`
      );
      return;
    }

    lastLineCode = lineCode;

    rows.push({
      valid_from: validFrom,
      valid_to: validTo,
      line_code: lineCode,
      from_stop_name: fromStopName,
      to_stop_name: toStopName,
      passenger_type_key: passengerKey,
      ticket_type_key: ticketKey,
      price_sek: price,
      is_active: true,
      updated_at: new Date().toISOString(),
      __rowNumber: rowNumber,
    });
  });

  return { rows, errors };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      ok: false,
      message: "Supabase env saknas.",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "Metoden stöds inte.",
    });
  }

  const mode = clean(req.body?.mode || "import");
  const text = String(req.body?.text || "");

  const { rows, errors } = parseRows(text);

  const previewRows = rows.map((row) => ({
    rowNumber: row.__rowNumber,
    valid_from: row.valid_from,
    valid_to: row.valid_to,
    line_code: row.line_code,
    from_stop_name: row.from_stop_name,
    to_stop_name: row.to_stop_name,
    passenger_type_key: row.passenger_type_key,
    ticket_type_key: row.ticket_type_key,
    price_sek: row.price_sek,
  }));

  if (mode === "preview") {
    return res.status(200).json({
      ok: errors.length === 0,
      mode,
      rows: previewRows,
      errors,
      count: previewRows.length,
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      ok: false,
      mode,
      rows: previewRows,
      errors,
      message: "Importen stoppades eftersom vissa rader behöver rättas.",
    });
  }

  if (rows.length === 0) {
    return res.status(400).json({
      ok: false,
      message: "Inga prisrader hittades.",
      errors: ["Klistra in minst en prisrad."],
    });
  }

  const upsertRows = rows.map(({ __rowNumber, ...row }) => row);

  const { data, error } = await supabase
    .from("shuttle_price_rules")
    .upsert(upsertRows, {
      onConflict:
        "valid_from,valid_to,line_code,from_stop_name,to_stop_name,passenger_type_key,ticket_type_key",
    })
    .select("id,valid_from,valid_to,line_code,from_stop_name,to_stop_name,passenger_type_key,ticket_type_key,price_sek,is_active,updated_at");

  if (error) {
    return res.status(500).json({
      ok: false,
      message: error.message,
    });
  }

  return res.status(200).json({
    ok: true,
    mode,
    message: `${data?.length || 0} prisrader importerades eller uppdaterades.`,
    count: data?.length || 0,
    rows: data || [],
    errors: [],
  });
}

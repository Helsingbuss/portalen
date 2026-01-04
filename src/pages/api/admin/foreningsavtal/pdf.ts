// src/pages/api/admin/foreningsavtal/pdf.ts
import type { NextApiRequest, NextApiResponse } from "next";
import PDFDocument from "pdfkit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type FöreningsavtalRow = {
  id: string;
  agreement_number?: string | null;

  club_name?: string | null;
  org_number?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;

  status?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;

  min_trips_per_year?: number | null;
  discount_type?: string | null;
  discount_value?: number | null;
  kickback_percent?: number | null;

  booking_rules?: string | null;
  cancellation_rules?: string | null;
  included?: string | null;

  marketing_support?: string | null;
  internal_notes?: string | null;
};

// Om du streamar PDF är det bättre att låta Next skippa bodyParser
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = req.query.id;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Saknar avtals-ID i query ?id=" });
  }

  // Hämta avtalet från Supabase
  const { data, error } = await supabaseAdmin
    .from("association_agreements") // BYT TABELLNAMN här om den heter något annat
    .select("*")
    .eq("id", id as string)
    .single<FöreningsavtalRow>();

  if (error || !data) {
    console.error("[foreningsavtal/pdf] Supabase error:", error);
    return res.status(404).json({ error: "Hittade inte föreningsavtal" });
  }

  const filename =
    data.agreement_number && data.agreement_number.trim().length > 0
      ? `foreningsavtal-${data.agreement_number}.pdf`
      : `foreningsavtal-${data.id}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // Streama direkt till svaret
  doc.pipe(res);

  // ====== PDF-INNEHÅLL (kan finjusteras senare) ======
  doc.fontSize(18).text("Föreningsavtal", { align: "left" });
  doc.moveDown(0.5);
  doc
    .fontSize(11)
    .fillColor("#555555")
    .text(
      "Detta är en översikt av avtalet mellan Helsingbuss och föreningen. " +
        "Originalet lagras digitalt i Helsingbuss portal.",
      { align: "left" }
    );
  doc.moveDown();

  doc.fontSize(12).fillColor("#000000").text("1. Grunduppgifter", {
    underline: true,
  });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Förening / klubb: ${data.club_name ?? ""}`);
  doc.text(`Organisationsnummer: ${data.org_number ?? ""}`);
  doc.text(`Kontaktperson: ${data.contact_person ?? ""}`);
  doc.text(`Telefon: ${data.phone ?? ""}`);
  doc.text(`E-post: ${data.email ?? ""}`);
  doc.text(`Avtalsnummer: ${data.agreement_number ?? data.id}`);
  doc.text(`Status: ${data.status ?? ""}`);
  doc.text(`Giltigt från: ${data.valid_from ?? ""}`);
  doc.text(`Giltigt till: ${data.valid_to ?? ""}`);
  doc.moveDown();

  doc.fontSize(12).text("2. Rabatter & volymkrav", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(
    `Minsta antal resor per år: ${
      data.min_trips_per_year != null ? data.min_trips_per_year : ""
    }`
  );
  doc.text(`Rabatt-typ: ${data.discount_type ?? ""}`);
  doc.text(
    `Rabattvärde: ${
      data.discount_value != null ? `${data.discount_value} %` : ""
    }`
  );
  doc.text(
    `Kickback på biljetter: ${
      data.kickback_percent != null ? `${data.kickback_percent} %` : ""
    }`
  );
  doc.moveDown();

  doc.fontSize(12).text("3. Villkor, uppsägning & tillägg", {
    underline: true,
  });
  doc.moveDown(0.5);
  doc.fontSize(11);
  if (data.booking_rules) {
    doc.text("Bokningsregler:", { continued: false, underline: false });
    doc.text(data.booking_rules);
    doc.moveDown(0.5);
  }
  if (data.cancellation_rules) {
    doc.text("Avbokning / uppsägning:");
    doc.text(data.cancellation_rules);
    doc.moveDown(0.5);
  }
  if (data.included) {
    doc.text("Vad ingår i avtalet?");
    doc.text(data.included);
    doc.moveDown(0.5);
  }

  doc.fontSize(12).text("4. Marknadsstöd & interna anteckningar", {
    underline: true,
  });
  doc.moveDown(0.5);
  doc.fontSize(11);
  if (data.marketing_support) {
    doc.text("Marknadsföring & samarbete:");
    doc.text(data.marketing_support);
    doc.moveDown(0.5);
  }
  if (data.internal_notes) {
    doc.text("Interna anteckningar (endast för Helsingbuss):");
    doc.text(data.internal_notes);
    doc.moveDown(0.5);
  }

  doc.moveDown(2);
  doc
    .fontSize(10)
    .fillColor("#666666")
    .text(
      "Detta dokument är genererat automatiskt från Helsingbuss portal. " +
        "Vid frågor, kontakta Helsingbuss.",
      { align: "left" }
    );

  doc.end();
}

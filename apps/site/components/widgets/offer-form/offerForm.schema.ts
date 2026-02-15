import { z } from "zod";

const phoneLike = z
  .string()
  .trim()
  .min(6, "Telefon är för kort")
  .max(30, "Telefon är för långt");

export const offerFormFacilitiesSchema = z.object({
  wc: z.boolean(),
  eluttag_usb: z.boolean(),
  film_presentation: z.boolean(),
  tillganglighet: z.boolean(),
  bagage_extra: z.boolean(),
});

export const offerFormStateSchema = z.object({
  fromAddress: z.string().trim().min(2, "Avresa krävs"),
  toAddress: z.string().trim().min(2, "Destination krävs"),
  date: z.string().trim().min(4, "Datum krävs"),
  time: z.string().trim().min(1, "Tid krävs"),
  passengers: z.union([z.number().int().min(1).max(999), z.literal("")]).refine((v) => v !== "", "Antal resenärer krävs"),
  tripType: z.enum(["oneway", "roundtrip"]),
  useBusOnSite: z.boolean(),

  returnSwapRoute: z.boolean(),
  returnFromAddress: z.string().trim().optional().default(""),
  returnToAddress: z.string().trim().optional().default(""),

  customerType: z.enum(["privat", "foretag", "forening"]),
  name: z.string().trim().min(2, "Namn krävs"),
  phone: phoneLike,
  email: z.string().trim().email("Ogiltig e-post"),
  onboardContact: z.string().trim().optional().default(""),

  orgName: z.string().trim().optional().default(""),
  orgNr: z.string().trim().optional().default(""),

  resPlan: z.string().trim().optional().default(""),

  facilities: offerFormFacilitiesSchema,
  accessibilityNotes: z.string().trim().optional().default(""),

  heardFrom: z.enum(["", "google", "facebook", "instagram", "tiktok", "rekommendation", "tidigare_kund", "annan"]).default(""),
  newsletter: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.tripType === "roundtrip" && !data.returnSwapRoute) {
    if (!data.returnFromAddress || data.returnFromAddress.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["returnFromAddress"], message: "Retur avresa krävs" });
    }
    if (!data.returnToAddress || data.returnToAddress.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["returnToAddress"], message: "Retur destination krävs" });
    }
  }
  if ((data.customerType === "foretag" || data.customerType === "forening")) {
    if (!data.orgName || data.orgName.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["orgName"], message: "Företags-/föreningsnamn krävs" });
    }
    if (!data.orgNr || data.orgNr.trim().length < 6) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["orgNr"], message: "Org.nr krävs" });
    }
  }
});

export const offerSubmitPayloadSchema = z.object({
  source: z.literal("site_widget"),
  state: offerFormStateSchema,
  meta: z.object({
    userAgent: z.string().optional(),
    timezone: z.string().optional(),
    url: z.string().optional(),
  }),
});

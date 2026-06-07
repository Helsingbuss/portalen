export const PAYSLIP_BUCKET =
  process.env.PAYSLIP_STORAGE_BUCKET || "payroll-payslips";

export async function ensurePayslipBucket(supabase: any) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) throw listError;

  const exists = (buckets || []).some((bucket: any) => bucket.name === PAYSLIP_BUCKET);

  if (exists) return;

  const { error: createError } = await supabase.storage.createBucket(PAYSLIP_BUCKET, {
    public: false,
    fileSizeLimit: 1024 * 1024 * 5,
    allowedMimeTypes: ["application/pdf"],
  });

  if (createError && !String(createError.message || "").toLowerCase().includes("already exists")) {
    throw createError;
  }
}

export async function uploadPayslipPdf(supabase: any, path: string, pdfBytes: Uint8Array) {
  await ensurePayslipBucket(supabase);

  const buffer = Buffer.from(pdfBytes);

  const { error } = await supabase.storage
    .from(PAYSLIP_BUCKET)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) throw error;
}

export async function createPayslipSignedUrl(supabase: any, path: string) {
  await ensurePayslipBucket(supabase);

  const { data, error } = await supabase.storage
    .from(PAYSLIP_BUCKET)
    .createSignedUrl(path, 60 * 10);

  if (error) throw error;

  return data?.signedUrl || "";
}

export function payrollStatusLabel(status?: string | null) {
  switch (status) {
    case "draft":
      return "Utkast";
    case "approved":
      return "Godkänd";
    case "exported":
      return "Exporterad";
    case "bank_sent":
      return "Skickad till bank";
    case "paid":
      return "Betald";
    case "cancelled":
      return "Avbruten";
    default:
      return status || "Status saknas";
  }
}

export function isPayrollRunLocked(run: any) {
  const status = String(run?.status || "").trim();

  return (
    status === "exported" ||
    status === "bank_sent" ||
    status === "paid" ||
    status === "cancelled" ||
    Boolean(run?.archived_at)
  );
}

export function payrollRunLockedMessage(run: any) {
  const status = payrollStatusLabel(run?.status);

  if (run?.archived_at) {
    return "Lönekörningen är arkiverad och kan inte ändras.";
  }

  return "Lönekörningen har status " + status + " och är spärrad för ändringar.";
}

export function canCreateSwedbankFile(run: any) {
  return String(run?.status || "").trim() === "approved";
}

export function swedbankBlockedMessage(run: any) {
  const status = payrollStatusLabel(run?.status);

  return (
    "Swedbank/ISO 20022-bankfil kan bara skapas när lönekörningen har status Godkänd. " +
    "Nuvarande status är " + status + "."
  );
}

export function shouldWarnBeforeResync(run: any) {
  return Boolean(run?.payroll_underlag_synced_at);
}

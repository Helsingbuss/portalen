import type { NextApiRequest, NextApiResponse } from "next";

function cookieValue(req: NextApiRequest, name: string) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = cookieHeader.split(";").map((part) => part.trim());

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");

    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return "";
}

function bearerToken(req: NextApiRequest) {
  const authorization = String(req.headers.authorization || "");

  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return "";
}

export function isPayrollAccessEnforced() {
  return String(process.env.PAYROLL_ACCESS_ENFORCED || "").toLowerCase() === "true";
}

export function expectedPayrollAccessToken() {
  return String(process.env.PAYROLL_ACCESS_TOKEN || "").trim();
}

export function hasPayrollAccess(req: NextApiRequest) {
  if (!isPayrollAccessEnforced()) {
    return true;
  }

  const expected = expectedPayrollAccessToken();

  if (!expected) {
    return false;
  }

  const headerToken = String(req.headers["x-payroll-access-token"] || "").trim();
  const authToken = bearerToken(req);
  const cookieToken = cookieValue(req, "payroll_access_token");

  return headerToken === expected || authToken === expected || cookieToken === expected;
}

export function requirePayrollAccess(req: NextApiRequest, res: NextApiResponse) {
  if (hasPayrollAccess(req)) {
    return true;
  }

  if (isPayrollAccessEnforced() && !expectedPayrollAccessToken()) {
    res.status(500).json({
      ok: false,
      accessDenied: true,
      error: "PAYROLL_ACCESS_TOKEN saknas i miljövariablerna.",
    });

    return false;
  }

  res.status(403).json({
    ok: false,
    accessDenied: true,
    error: "Du saknar behörighet till Lön.",
  });

  return false;
}

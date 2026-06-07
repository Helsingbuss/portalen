import crypto from "crypto";
import type { NextApiRequest } from "next";

type PersonalTokenPayload = {
  employee_id: string;
  email?: string | null;
  exp: number;
};

function getSecret() {
  return (
    process.env.PERSONAL_AUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    "dev-personal-secret-change-this"
  );
}

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function sign(value: string) {
  return base64url(
    crypto
      .createHmac("sha256", getSecret())
      .update(value)
      .digest()
  );
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);

  if (ab.length !== bb.length) return false;

  return crypto.timingSafeEqual(ab, bb);
}

export function createLoginCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashLoginCode(email: string, code: string) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(email.toLowerCase().trim() + ":" + code.trim())
    .digest("hex");
}

export function createPersonalToken(employeeId: string, email?: string | null) {
  const payload: PersonalTokenPayload = {
    employee_id: employeeId,
    email: email || null,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
  };

  const data = base64url(JSON.stringify(payload));
  const signature = sign(data);

  return data + "." + signature;
}

export function verifyPersonalToken(token: string) {
  const [data, signature] = String(token || "").split(".");

  if (!data || !signature) return null;

  const expected = sign(data);

  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(fromBase64url(data)) as PersonalTokenPayload;

    if (!payload.employee_id) return null;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function getBearerToken(req: NextApiRequest) {
  const auth = String(req.headers.authorization || "");

  if (!auth.toLowerCase().startsWith("bearer ")) return "";

  return auth.slice(7).trim();
}

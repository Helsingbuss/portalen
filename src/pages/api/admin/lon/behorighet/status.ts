import type { NextApiRequest, NextApiResponse } from "next";
import {
  expectedPayrollAccessToken,
  hasPayrollAccess,
  isPayrollAccessEnforced,
} from "@/lib/payrollAccess";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({
    ok: true,
    enforced: isPayrollAccessEnforced(),
    configured: Boolean(expectedPayrollAccessToken()),
    granted: hasPayrollAccess(req),
  });
}
